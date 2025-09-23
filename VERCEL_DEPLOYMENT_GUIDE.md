# SSO Gateway - Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the SSO Gateway application to Vercel.

## Prerequisites

- [Vercel account](https://vercel.com/signup) (free tier available)
- [Git repository](https://github.com/new) with your SSO Gateway code
- [Auth0 account](https://auth0.com/signup) with a configured application

## Step 1: Prepare Your Code

Before deploying to Vercel, make sure your code is properly configured for serverless deployment:

1. **Verify vercel.json Configuration**

   The `vercel.json` file should be properly configured for routing and builds:

   ```json
   {
     "version": 2,
     "name": "sso-gateway",
     "builds": [
       {
         "src": "api/index.js",
         "use": "@vercel/node"
       },
       {
         "src": "public/**",
         "use": "@vercel/static"
       }
     ],
     "routes": [
       {
         "src": "/health",
         "dest": "/api/index.js"
       },
       {
         "src": "/auth/(.*)",
         "dest": "/api/index.js"
       },
       {
         "src": "/user/(.*)",
         "dest": "/api/index.js"
       },
       {
         "src": "/api/(.*)",
         "dest": "/api/index.js"
       },
       {
         "src": "/static/(.*)",
         "dest": "/public/static/$1"
       },
       {
         "src": "/css/(.*)",
         "dest": "/public/css/$1"
       },
       {
         "src": "/js/(.*)",
         "dest": "/public/js/$1"
       },
       {
         "src": "/images/(.*)",
         "dest": "/public/images/$1"
       },
       {
         "src": "/(.*)",
         "dest": "/api/index.js"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     },
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "X-Content-Type-Options",
             "value": "nosniff"
           },
           {
             "key": "X-Frame-Options",
             "value": "DENY"
           },
           {
             "key": "X-XSS-Protection",
             "value": "1; mode=block"
           },
           {
             "key": "Referrer-Policy",
             "value": "strict-origin-when-cross-origin"
           }
         ]
       }
     ]
   }
   ```

2. **Check api/index.js Configuration**

   Make sure your `api/index.js` file is set up for serverless functions:

   ```javascript
   // At the end of the file:
   // For Vercel serverless functions, export the Express app
   module.exports = app;

   // Export the handler function that Vercel expects
   module.exports.default = app;
   ```

3. **Ensure Session Handling is Configured**

   Make sure your `api/index.js` includes session middleware:

   ```javascript
   // Session middleware for serverless environment
   const session = require('express-session');
   app.use(session({
     secret: process.env.SESSION_SECRET || 'your-secret-key',
     resave: false,
     saveUninitialized: true,
     cookie: { 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 24 * 60 * 60 * 1000 // 24 hours
     }
   }));
   ```

4. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

## Step 2: Set Up Environment Variables

1. **Generate Secure Secrets**

   Use the provided script to generate environment variables:

   ```bash
   npm run vercel:env
   ```

   This will:
   - Generate secure secrets for SESSION_SECRET and JWT_SECRET
   - Prompt for Auth0 configuration details
   - Create a formatted list of environment variables
   - Optionally save them to a file

2. **Alternatively, Generate Secrets Manually**

   ```bash
   # Generate SESSION_SECRET
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

   # Generate JWT_SECRET
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Required Environment Variables**

   Prepare the following environment variables:

   | Variable | Description | Example |
   |----------|-------------|---------|
   | `AUTH0_DOMAIN` | Your Auth0 domain | `your-tenant.auth0.com` |
   | `AUTH0_CLIENT_ID` | Auth0 application client ID | `abcdefg123456789` |
   | `AUTH0_CLIENT_SECRET` | Auth0 application client secret | `your-client-secret` |
   | `AUTH0_AUDIENCE` | Auth0 API identifier | `https://sso-gateway.api` |
   | `BASE_URL` | Your Vercel deployment URL | `https://your-project.vercel.app` |
   | `SESSION_SECRET` | Session encryption key | Generated secret |
   | `JWT_SECRET` | JWT signing key | Generated secret |
   | `NODE_ENV` | Environment name | `production` |

   See `VERCEL_ENV_SETUP.md` for a complete list of environment variables.

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import your Git repository
4. Configure project settings:
   - Set the Framework Preset to "Other"
   - Set the Root Directory to the project root
   - Set the Build Command to `npm run build`
   - Set the Output Directory to `public`
5. Add environment variables from Step 2
6. Click **"Deploy"**

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```
   
   Follow the prompts to configure your project and add environment variables.

## Step 4: Update Auth0 Configuration

After deploying to Vercel, update your Auth0 application settings:

1. Go to the [Auth0 Dashboard](https://manage.auth0.com/)
2. Select your application
3. Update the following settings:

   **Allowed Callback URLs:**
   ```
   https://your-project.vercel.app/auth/callback
   ```

   **Allowed Logout URLs:**
   ```
   https://your-project.vercel.app
   ```

   **Allowed Web Origins:**
   ```
   https://your-project.vercel.app
   ```

   **Allowed Origins (CORS):**
   ```
   https://your-project.vercel.app
   ```

## Step 5: Test Your Deployment

1. **Health Check**
   ```bash
   curl https://your-project.vercel.app/health
   ```

2. **Authentication Flow**
   - Visit `https://your-project.vercel.app`
   - Click login or visit `/auth/login`
   - Complete Auth0 authentication
   - Verify callback works

3. **API Endpoints**
   ```bash
   # Check auth status
   curl https://your-project.vercel.app/auth/status
   
   # Test API health
   curl https://your-project.vercel.app/api/health
   ```

## Troubleshooting Common Issues

### 1. "Function Invocation Failed" Error

This error occurs when your serverless function fails to execute. Common causes:

- **Missing Environment Variables**: Check that all required environment variables are set in Vercel.
- **Incorrect Auth0 Configuration**: Verify Auth0 settings match your Vercel deployment.
- **Session Handling Issues**: Ensure session middleware is properly configured.

### 2. "Invalid State Parameter" Error

This error occurs during Auth0 authentication:

- **Incorrect BASE_URL**: Make sure the BASE_URL environment variable matches your Vercel deployment URL.
- **Callback URL Mismatch**: Verify the callback URL in Auth0 matches your Vercel deployment.

### 3. CORS Errors

If you're seeing CORS errors:

- **Update ALLOWED_ORIGINS**: Add your frontend domains to the ALLOWED_ORIGINS environment variable.
- **Check Auth0 CORS Settings**: Ensure your domain is added to Auth0's allowed origins.

### 4. Static Assets Not Loading

If static assets (CSS, JS, images) aren't loading:

- **Check Routes in vercel.json**: Verify the routes for static assets are correctly configured.
- **Verify File Paths**: Ensure file paths in your HTML/CSS are correct.

## Next Steps

1. **Set Up Custom Domain**
   - In Vercel dashboard, go to **Settings** → **Domains**
   - Add your custom domain
   - Update Auth0 settings with your custom domain
   - Update environment variables with your custom domain

2. **Set Up Monitoring**
   - Configure health check monitoring
   - Set up error tracking (e.g., Sentry)
   - Implement logging solution

3. **Implement CI/CD**
   - Set up GitHub Actions or other CI/CD pipeline
   - Automate testing and deployment

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Auth0 Documentation](https://auth0.com/docs)
- [Express.js on Vercel](https://vercel.com/guides/using-express-with-vercel)
- [Serverless Functions on Vercel](https://vercel.com/docs/serverless-functions/introduction)
