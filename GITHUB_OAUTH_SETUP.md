# 🔐 GitHub OAuth Setup for DeployHub

## 🎯 **What This Enables**

With GitHub OAuth properly configured, users can:
- **Connect their GitHub account** separately from their main login
- **Access only specific repositories** they choose to authorize
- **Deploy directly from GitHub** without manual file uploads
- **Maintain security** with granular permissions

## 🚀 **Setup Steps**

### **1. Create GitHub OAuth App**

1. **Go to GitHub Settings**
   - Navigate to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
   - Click "New OAuth App"

2. **Configure OAuth App**
   ```
   Application name: DeployHub
   Homepage URL: https://your-domain.com (or http://localhost:3000 for dev)
   Application description: DeployHub - Cloud Deployment Platform
   Authorization callback URL: https://your-supabase-project.supabase.co/auth/v1/callback
   ```

3. **Get OAuth Credentials**
   - Copy the **Client ID**
   - Copy the **Client Secret**

### **2. Configure Supabase GitHub Provider**

1. **Go to Supabase Dashboard**
   - Open your project
   - Navigate to **Authentication → Providers**

2. **Enable GitHub Provider**
   - Toggle **GitHub** to enabled
   - Enter your **Client ID** and **Client Secret**
   - Set **Redirect URL** to: `https://your-domain.com/auth/callback`

3. **Configure Scopes**
   - **Default scope**: `repo` (for repository access)
   - **Optional scopes**: `read:user`, `user:email`

### **3. Update Environment Variables**

```bash
# Add to your .env file
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🔒 **Security Features**

### **Granular Permissions**
- **Repository Access**: Users can choose which repos to authorize
- **Read-Only**: OAuth only grants read access to repositories
- **No Admin Access**: Cannot modify user accounts or billing
- **Scope Limited**: Only requested permissions are granted

### **User Control**
- **Selective Authorization**: Users choose specific repositories
- **Revoke Access**: Users can disconnect GitHub anytime
- **Permission Review**: Clear display of what access is granted

## 🧪 **Testing the Integration**

### **1. Test OAuth Flow**
1. Go to `/deploy` page
2. Select "Deploy from GitHub"
3. Click "Connect GitHub"
4. Authorize on GitHub
5. Return to DeployHub

### **2. Test Repository Access**
1. After GitHub connection
2. Click "Load My Repositories"
3. Browse available repositories
4. Select one for deployment

### **3. Test Deployment**
1. Repository details auto-fill
2. Configure deployment settings
3. Deploy using existing AWS infrastructure

## 🔍 **Troubleshooting**

### **Common Issues**

**"GitHub access required"**
- Ensure GitHub OAuth is enabled in Supabase
- Check OAuth app configuration
- Verify callback URLs match exactly

**"Authorization failed"**
- Check GitHub OAuth app settings
- Verify Client ID and Secret
- Ensure redirect URLs are correct

**"No repositories found"**
- Check OAuth scopes include `repo`
- Verify user has repositories on GitHub
- Check GitHub API rate limits

### **Debug Steps**

1. **Check Supabase Logs**
   - Go to Authentication → Logs
   - Look for GitHub OAuth errors

2. **Verify OAuth App**
   - Check GitHub OAuth app settings
   - Ensure callback URLs match

3. **Test OAuth Flow**
   - Try connecting GitHub again
   - Check browser console for errors

## 📋 **OAuth Scopes Explained**

### **Required Scopes**
- **`repo`**: Access to private and public repositories
- **`read:user`**: Read user profile information
- **`user:email`**: Access to user email addresses

### **Optional Scopes**
- **`workflow`**: Access to GitHub Actions workflows
- **`write:packages`**: Upload packages to GitHub Package Registry

## 🎉 **What Users Experience**

### **Before OAuth Setup**
- ❌ "GitHub access required" error
- ❌ Cannot load repositories
- ❌ Limited to file upload only

### **After OAuth Setup**
- ✅ "Connect GitHub" button appears
- ✅ One-click GitHub authorization
- ✅ Repository browsing and selection
- ✅ Seamless deployment from GitHub

## 🚀 **Next Steps**

Once GitHub OAuth is working:

1. **Repository Selection**: Users can browse and select repos
2. **Auto-fill**: Project details populate from repository
3. **Deployment**: Use existing AWS infrastructure
4. **Future**: Add webhooks for automatic deployments

---

**Need help?** Check the Supabase documentation or GitHub OAuth guides for detailed setup instructions.
