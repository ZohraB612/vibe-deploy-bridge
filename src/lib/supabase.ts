import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// Create Supabase client with type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // More secure for SPAs
  },
  global: {
    headers: {
      'X-Client-Info': 'deployhub-web@1.0.0'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// OAuth provider configurations
export const oauthProviders = {
  google: {
    name: 'Google',
    icon: '🔍',
    scopes: 'openid email profile'
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    scopes: 'user:email'
  },
  microsoft: {
    name: 'Microsoft',
    icon: '🏢',
    scopes: 'openid email profile'
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    scopes: 'identify email'
  }
} as const

export type OAuthProvider = keyof typeof oauthProviders

// Helper functions for authentication
export const authHelpers = {
  // Sign in with OAuth provider
  async signInWithOAuth(provider: OAuthProvider, redirectTo?: string) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        scopes: oauthProviders[provider].scopes,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    return { data, error }
  },

  // Sign in with email/password
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Sign up with email/password
  async signUpWithEmail(email: string, password: string, metadata?: { name?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    return { session: data.session, error }
  },

  // Get current user
  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    return { user: data.user, error }
  },

  // Update user metadata
  async updateUser(updates: { email?: string; password?: string; data?: object }) {
    const { data, error } = await supabase.auth.updateUser(updates)
    return { data, error }
  },

  // Reset password
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { data, error }
  },

  // Verify OTP (for email verification, password reset, etc.)
  async verifyOtp(email: string, token: string, type: 'signup' | 'recovery' | 'email_change') {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    })
    return { data, error }
  }
}

// Auth state change listener
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

// Check if we're in development mode
export const isDevelopment = import.meta.env.DEV

// Development warning
if (isDevelopment && (supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key'))) {
  console.warn('⚠️ Supabase configuration needed! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file')
}

// Connection health check
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('_health_check').select('*').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Safe Supabase query wrapper
export const safeSupabaseQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  fallback: T | null = null
): Promise<{ data: T | null; error: any }> => {
  try {
    return await queryFn();
  } catch (error) {
    console.warn('Supabase query failed, using fallback:', error);
    return { data: fallback, error: null };
  }
}
