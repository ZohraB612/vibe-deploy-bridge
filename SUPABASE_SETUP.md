# 🚀 Supabase Authentication Setup Guide

## 📋 Overview

Your DeployHub application now includes **real authentication** with Supabase! This guide will help you set up your Supabase project and configure OAuth providers.

## 🏗️ Step 1: Create Supabase Project

### 1.1 Sign up for Supabase
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email

### 1.2 Create a New Project
1. Click "New Project"
2. Choose your organization
3. Fill in project details:
   - **Name**: `deployhub` or your preferred name
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait 2-3 minutes for project setup

### 1.3 Get Your Project Credentials
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## ⚙️ Step 2: Configure Environment Variables

### 2.1 Create Environment File
```bash
# Copy the example file
cp env.example .env

# Edit with your values
nano .env  # or use your preferred editor
```

### 2.2 Add Supabase Configuration
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 🗄️ Step 3: Set Up Database Schema

### 3.1 Run SQL Commands
Go to **SQL Editor** in your Supabase dashboard and run these commands:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT,
  metadata JSONB
);

-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL,
  status TEXT CHECK (status IN ('deployed', 'deploying', 'failed', 'building', 'stopped')) DEFAULT 'deploying',
  framework TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  build_time TEXT,
  size TEXT,
  deployment_count INTEGER DEFAULT 1,
  last_deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aws_bucket TEXT,
  aws_region TEXT,
  metadata JSONB
);

-- Create deployments table
CREATE TABLE deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'building', 'deploying', 'success', 'failed')) DEFAULT 'pending',
  commit_hash TEXT,
  branch TEXT DEFAULT 'main',
  build_logs TEXT,
  deploy_url TEXT,
  build_time INTEGER,
  metadata JSONB
);

-- Create AWS connections table
CREATE TABLE aws_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  role_arn TEXT NOT NULL,
  external_id TEXT NOT NULL,
  region TEXT DEFAULT 'us-east-1',
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Row Level Security Policies
-- Profiles: Users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects: Users can only see and manage their own projects
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Deployments: Users can only see and manage their own deployments
CREATE POLICY "Users can view own deployments" ON deployments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deployments" ON deployments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deployments" ON deployments FOR UPDATE USING (auth.uid() = user_id);

-- AWS Connections: Users can only manage their own AWS connection
CREATE POLICY "Users can view own aws connection" ON aws_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own aws connection" ON aws_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own aws connection" ON aws_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own aws connection" ON aws_connections FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE aws_connections ENABLE ROW LEVEL SECURITY;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, avatar_url, provider, metadata)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.app_metadata->>'provider', 'email'),
    NEW.raw_user_meta_data
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aws_connections_updated_at BEFORE UPDATE ON aws_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔐 Step 4: Configure OAuth Providers

### 4.1 Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen first if needed
6. Set **Authorized redirect URIs**:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
7. Copy **Client ID** and **Client Secret**

**In Supabase:**
1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Enter your **Client ID** and **Client Secret**
4. Click **Save**

### 4.2 GitHub OAuth
1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: DeployHub
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `https://your-project-id.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Copy **Client ID** and generate **Client Secret**

**In Supabase:**
1. Go to **Authentication** → **Providers**
2. Enable **GitHub**
3. Enter your **Client ID** and **Client Secret**
4. Click **Save**

### 4.3 Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: DeployHub
   - **Redirect URI**: `https://your-project-id.supabase.co/auth/v1/callback`
5. Copy **Application (client) ID**
6. Go to **Certificates & secrets** → **New client secret**
7. Copy the secret value

**In Supabase:**
1. Go to **Authentication** → **Providers**
2. Enable **Azure (Microsoft)**
3. Enter your **Client ID** and **Client Secret**
4. Click **Save**

## 🚀 Step 5: Test Your Setup

### 5.1 Start Development Server
```bash
npm run dev
```

### 5.2 Test Authentication
1. Go to `http://localhost:8080`
2. Click **Sign In / Sign Up**
3. Test OAuth providers (Google, GitHub, Microsoft)
4. Test email/password registration

### 5.3 Verify Database
1. Check **Authentication** → **Users** in Supabase
2. Check **Table Editor** → **profiles** for user data
3. Test creating projects and deployments

## 🔧 Step 6: Production Configuration

### 6.1 Update Redirect URLs
For production, update OAuth redirect URLs to:
```
https://your-domain.com/auth/callback
```

### 6.2 Environment Variables
Set production environment variables:
```env
NODE_ENV=production
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

### 6.3 Docker Production
```bash
# Build and run production container
npm run start:docker
```

## 🛡️ Security Features Included

### ✅ **Implemented Security**
- ✅ **Row Level Security (RLS)** - Users can only access their own data
- ✅ **JWT Tokens** - Automatic token management by Supabase
- ✅ **Password Validation** - Client-side strength checking
- ✅ **OAuth Integration** - Secure third-party authentication
- ✅ **Session Management** - Automatic session refresh
- ✅ **Secure Headers** - XSS, CSRF protection

### 🔐 **Authentication Features**
- ✅ **Multi-provider OAuth** (Google, GitHub, Microsoft)
- ✅ **Email/Password** registration with validation
- ✅ **Password Reset** via email
- ✅ **Email Verification** for new accounts
- ✅ **Profile Management** with avatar support
- ✅ **Automatic profile creation** on first sign-in

## 🐛 Troubleshooting

### Common Issues:

1. **"Invalid API key"**
   - Check your `.env` file has correct Supabase URL and key
   - Make sure `.env` is not in `.gitignore`

2. **OAuth redirect error**
   - Verify redirect URLs match exactly in OAuth provider settings
   - Check for trailing slashes or protocol mismatches

3. **Database permission errors**
   - Ensure RLS policies are correctly set up
   - Check that auth.uid() is properly used in policies

4. **Profile not created automatically**
   - Verify the trigger function `handle_new_user()` is installed
   - Check Supabase logs for trigger execution errors

## 🎉 Success!

Your DeployHub application now has **enterprise-grade authentication**! Users can:

- ✅ Sign in with Google, GitHub, or Microsoft
- ✅ Register with email and password
- ✅ Reset forgotten passwords
- ✅ Manage their profiles
- ✅ Access only their own projects and data

## 🔮 Next Steps

With authentication complete, you can now:
1. **Real Project Management** - Projects are saved to database
2. **Team Collaboration** - Share projects with team members
3. **Usage Analytics** - Track user deployments and usage
4. **Premium Features** - Implement paid tiers and limits

Your DeployHub application is now **production-ready** with real authentication! 🚀
