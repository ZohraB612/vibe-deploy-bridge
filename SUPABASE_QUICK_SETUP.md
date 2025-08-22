# 🚀 **Real Supabase Setup - Quick Guide**

## Step 1: Create Supabase Project (5 minutes)

### **🔗 Go to Supabase:**
1. Visit [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email

### **📋 Create New Project:**
1. Click **"New Project"**
2. Choose your organization
3. Fill in project details:
   - **Name**: `deployhub` (or any name you prefer)
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to your location
4. Click **"Create new project"**
5. ⏳ Wait 2-3 minutes for setup to complete

---

## Step 2: Get Project Credentials (2 minutes)

### **🔑 Copy Your Credentials:**
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## Step 3: Configure Environment Variables (1 minute)

### **📝 Update Your .env File:**
Open your `.env` file and update these lines:

```env
# Replace these with your actual Supabase credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5...
```

---

## Step 4: Set Up Database Schema (3 minutes)

### **🗄️ Run SQL Commands:**
1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste this SQL (run each block separately):

### **Block 1: Basic Schema**
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
```

### **Block 2: Analytics Tables**
```sql
-- Analytics Data Storage
CREATE TABLE project_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value DECIMAL NOT NULL,
  unit TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB
);

-- Deployment Logs Storage
CREATE TABLE deployment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deployment_id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_level TEXT CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'success')) NOT NULL,
  message TEXT NOT NULL,
  source TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Environment Variables Management
CREATE TABLE project_environment_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_name TEXT NOT NULL,
  value_encrypted TEXT NOT NULL,
  environment TEXT CHECK (environment IN ('development', 'staging', 'production')) DEFAULT 'production',
  is_secret BOOLEAN DEFAULT false
);
```

### **Block 3: Row Level Security Policies**
```sql
-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON project_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics" ON project_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Logs policies
CREATE POLICY "Users can view own logs" ON deployment_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON deployment_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Environment variables policies
CREATE POLICY "Users can view own env vars" ON project_environment_variables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own env vars" ON project_environment_variables FOR ALL USING (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_environment_variables ENABLE ROW LEVEL SECURITY;
```

### **Block 4: Automatic Profile Creation**
```sql
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
```

---

## Step 5: Configure OAuth Providers (Optional - 5 minutes)

### **🔗 Set Up OAuth (For Real Social Login):**

1. **In Supabase Dashboard** → **Authentication** → **Providers**

2. **Enable providers you want:**
   - **Google**: Add your Google OAuth client ID/secret
   - **GitHub**: Add your GitHub OAuth app credentials  
   - **Microsoft**: Add your Microsoft app credentials

3. **For quick testing**, you can skip this and use **email/password** authentication

---

## Step 6: Test Real Functionality! 🚀

### **🔄 Restart Your Dev Server:**
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### **✅ Now Test:**

1. **🔐 Real Authentication:**
   - Sign up with email/password
   - Watch real user creation in Supabase Auth table

2. **📊 Real Projects:**
   - Create a project
   - Check `projects` table in Supabase - you'll see it there!
   - Open another browser tab - projects sync in real-time!

3. **📈 Real Analytics:**
   - Go to Performance tab
   - Click "Start Monitoring"
   - Check `project_analytics` table - real metrics being stored!

4. **📝 Real Deployment Logs:**
   - Start a deployment
   - Watch logs stream in real-time
   - Check `deployment_logs` table - all logs persisted!

5. **⚙️ Real Environment Variables:**
   - Add environment variables
   - Check `project_environment_variables` table - securely stored!

---

## 🎯 **You'll Know It's Working When:**

- ✅ **No more Supabase warnings** in console
- ✅ **Data persists** after browser refresh
- ✅ **Real-time updates** across multiple browser tabs
- ✅ **Database tables** populated with your data
- ✅ **User isolation** - different users see different data

---

## 🚨 **Quick Troubleshooting:**

- **Still getting Supabase errors?** Double-check your `.env` file credentials
- **Can't sign up?** Check if RLS policies are applied correctly
- **No real-time updates?** Ensure WebSocket connections are working
- **Data not persisting?** Verify database schema was created successfully

---

## 🎉 **Ready!**

Once you complete this setup (about 10-15 minutes total), you'll have:
- ✅ **Real database persistence**
- ✅ **Real-time synchronization**
- ✅ **User authentication and isolation**
- ✅ **Live analytics collection**
- ✅ **Real deployment logs**
- ✅ **Secure environment variables**

**Let's set this up and experience the full real functionality!** 🚀
