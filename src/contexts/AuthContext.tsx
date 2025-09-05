import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, authHelpers, OAuthProvider, onAuthStateChange } from "@/lib/supabase";
import type { Profile } from "@/lib/database.types";

export interface AuthUser extends User {
  profile?: Profile;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Authentication methods
  signInWithOAuth: (provider: OAuthProvider, redirectTo?: string) => Promise<{ error: AuthError | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: AuthError | null }>;
  
  // Legacy methods for compatibility (will be deprecated)
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  redirectAfterAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// For backward compatibility with existing components
export const useUser = useAuth;

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user profile from database with timeout
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('AuthContext: Starting database query for profile:', userId);
      
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );
      
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: profile, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      console.log('AuthContext: Database query completed', { profile, error });

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('AuthContext: Error loading user profile:', error);
        return null;
      }

      if (error && error.code === 'PGRST116') {
        console.log('AuthContext: No existing profile found (PGRST116)');
        return null;
      }

      console.log('AuthContext: Profile loaded successfully:', profile?.email);
      return profile;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user profile';
      console.error('Error loading user profile:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create or update user profile with timeout
  const upsertUserProfile = useCallback(async (user: User) => {
    try {
      console.log('AuthContext: Starting profile upsert for user:', user.id);
      console.log('AuthContext: User metadata:', {
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        email: user.email
      });

      const profileData: Partial<Profile> = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        updated_at: new Date().toISOString(),
      };

      console.log('AuthContext: Profile data to upsert:', profileData);

      // Add timeout to upsert as well
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile upsert timeout')), 5000)
      );
      
      const upsertPromise = supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      const { data, error } = await Promise.race([upsertPromise, timeoutPromise]) as {
        data: Profile | null;
        error: { code: string; message: string } | null;
      };

      if (error) {
        console.error('AuthContext: Error upserting user profile:', error);
        return null;
      }

      console.log('AuthContext: Profile upserted successfully:', data);
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upsert user profile';
      console.error('Error upserting user profile:', err);
      setError(errorMessage);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { session } = await authHelpers.getSession();
        
        if (session?.user) {
          const profile = await loadUserProfile(session.user.id);
          const userWithProfile = { ...session.user, profile };
          setUser(userWithProfile);
          setSession(session);
        }
      } catch (err: unknown) {
        // Don't set error state for Supabase connection issues - just log and continue
        console.warn('Supabase connection issue, continuing without auth:', err);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Smart auth listener that prevents unnecessary re-renders
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('🔍 Auth state changed:', event, session?.user?.id, 'Current user:', user?.id);
      
      // Only update state for significant auth events that actually change the user
      const shouldUpdate = 
        event === 'SIGNED_IN' || 
        event === 'SIGNED_OUT' || 
        (event === 'TOKEN_REFRESHED' && session?.user?.id !== user?.id);
      
      if (shouldUpdate) {
        try {
          setIsLoading(true);
          setError(null);

          if (session?.user) {
            // User signed in - create profile from OAuth data immediately
            console.log('AuthContext: User signed in, creating profile from OAuth data');
            
            // Create profile from OAuth data (no database needed)
            const profile = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
              avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
              provider: session.user.app_metadata?.provider || 'email',
              metadata: session.user.user_metadata || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const userWithProfile = { ...session.user, profile };
            console.log('AuthContext: Setting user with profile:', userWithProfile.email);
            setUser(userWithProfile);
            setSession(session);
            
            // Try to save to database in background (don't wait for it)
            console.log('AuthContext: Attempting background database save...');
            upsertUserProfile(session.user).then(savedProfile => {
              if (savedProfile) {
                console.log('AuthContext: Background database save successful');
                setUser(prev => prev ? { ...prev, profile: savedProfile } : null);
              }
            }).catch(err => {
              console.log('AuthContext: Background database save failed (non-critical):', err);
            });
            
          } else {
            // User signed out
            setUser(null);
            setSession(null);
          }
          
          setIsLoading(false);
        } catch (err) {
          console.warn('Auth state change handler error, continuing without update:', err);
          setIsLoading(false);
        }
      } else {
        // Ignore events that don't actually change the user to prevent unnecessary re-renders
        console.log('AuthContext: Ignoring non-significant auth event:', event);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile, upsertUserProfile]);

  // Authentication methods
  const signInWithOAuth = useCallback(async (provider: OAuthProvider, redirectTo?: string) => {
    setIsLoading(true);
    setError(null);
    
    const { error } = await authHelpers.signInWithOAuth(provider, redirectTo);
    
    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
    
    return { error };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    const { error } = await authHelpers.signInWithEmail(email, password);
    
    if (error) {
      setError(error.message);
    }
    
    setIsLoading(false);
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    setError(null);
    
    const { error } = await authHelpers.signUpWithEmail(email, password, { name });
    
    if (error) {
      setError(error.message);
    }
    
    setIsLoading(false);
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const { error } = await authHelpers.signOut();
    
    if (error) {
      setError(error.message);
    }
    
    setIsLoading(false);
    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    const { error } = await authHelpers.resetPassword(email);
    
    if (error) {
      setError(error.message);
    }
    
    return { error };
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') as AuthError };
    
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        return { error: error as AuthError };
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, profile: data } : null);
      
      return { error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      return { error: err as AuthError };
    }
  }, [user]);

  // Legacy methods for backward compatibility
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { error } = await signInWithEmail(email, password);
    return !error;
  }, [signInWithEmail]);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    const { error } = await signUp(email, password, name);
    return !error;
  }, [signUp]);

  const logout = useCallback(() => {
    signOut();
  }, [signOut]);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    if (updates.profile) {
      updateProfile(updates.profile);
    }
  }, [updateProfile]);

  const redirectAfterAuth = useCallback(() => {
    const redirectPath = localStorage.getItem('redirect_after_auth');
    if (redirectPath) {
      localStorage.removeItem('redirect_after_auth');
      window.location.href = redirectPath;
    } else {
      window.location.href = '/dashboard';
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!session?.user,
    isLoading,
    error,
    
    // New authentication methods
    signInWithOAuth,
    signInWithEmail,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    
    // Legacy methods (backward compatibility)
    login,
    signup,
    logout,
    updateUser,
    redirectAfterAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
