# Vercel Deployment Checklist

Use this checklist to ensure a successful deployment of the SSO Gateway to Vercel.

## Pre-Deployment Checks

- [ ] Code is committed to your Git repository
- [ ] All environment variables are documented (see VERCEL_ENV_SETUP.md)
- [ ] Auth0 application is properly configured
- [ ] vercel.json is properly configured
- [ ] api/index.js is set up for serverless functions
- [ ] Session handling is configured for serverless environment
- [ ] Static assets are properly configured in vercel.json

## Deployment Steps

### 1. Prepare Your Repository

- [ ] Commit all changes to your Git repository
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Deploy via Vercel Dashboard

- [ ] Go to [vercel.com](https://vercel.com) and sign in
- [ ] Click **"New Project"**
- [ ] Import your Git repository
- [ ] Configure project settings:
  - [ ] Set the Framework Preset to "Other"
  - [ ] Set the Root Directory to the project root
  - [ ] Set the Build Command to `npm run build`
  - [ ] Set the Output Directory to `public`
- [ ] Click **"Deploy"**

### 3. Configure Environment Variables

- [ ] In your Vercel project dashboard, go to **Settings** → **Environment Variables**
- [ ] Add all required environment variables from VERCEL_ENV_SETUP.md
- [ ] Save the changes

### 4. Update Auth0 Configuration

- [ ] Update Auth0 application settings with your Vercel URLs
  - [ ] Allowed Callback URLs: `https://your-project.vercel.app/auth/callback`
  - [ ] Allowed Logout URLs: `https://your-project.vercel.app`
  - [ ] Allowed Web Origins: `https://your-project.vercel.app`
  - [ ] Allowed Origins (CORS): `https://your-project.vercel.app`

### 5. Test Your Deployment

- [ ] Check the health endpoint: `https://your-project.vercel.app/health`
- [ ] Test the authentication flow:
  - [ ] Visit the login page: `https://your-project.vercel.app/auth/login`
  - [ ] Complete the Auth0 authentication
  - [ ] Verify the callback works
- [ ] Test API endpoints:
  - [ ] Check auth status: `https://your-project.vercel.app/auth/status`
  - [ ] Test API health: `https://your-project.vercel.app/api/health`

## Post-Deployment Tasks

- [ ] Set up monitoring for your application
- [ ] Configure custom domain (if needed)
- [ ] Set up CI/CD pipeline for automated deployments
- [ ] Document the deployment process for your team

## Troubleshooting Common Issues

### 1. Environment Variables Not Loading

- Check variable names in Vercel dashboard
- Ensure no typos in variable names
- Redeploy after adding variables

### 2. Auth0 Callback Errors

- Verify callback URLs in Auth0
- Check BASE_URL environment variable
- Ensure HTTPS is used

### 3. CORS Issues

- Update ALLOWED_ORIGINS
- Check Auth0 CORS settings
- Verify request headers

### 4. Function Execution Timeout

- Optimize function performance
- Consider increasing maxDuration in vercel.json
- Split complex operations into multiple functions

### 5. Static Assets Not Loading

- Check routes in vercel.json
- Verify static file paths
- Ensure public directory is properly configured
