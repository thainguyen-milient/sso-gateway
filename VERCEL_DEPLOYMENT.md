# SSO Gateway - Vercel Deployment Guide

This guide will walk you through deploying the SSO Gateway to Vercel as a serverless application.

## Prerequisites

- Vercel account (free tier available)
- Auth0 account and application configured
- Node.js 18+ installed locally
- Git repository (GitHub, GitLab, or Bitbucket)

## Project Structure for Vercel

The project has been restructured for Vercel deployment:

```
SSO-Gateway/
├── api/
│   └── index.js              # Main serverless function
├── src/                      # Shared utilities and routes
├── vercel.json              # Vercel configuration
├── package.json             # Updated for Vercel
└── .env.vercel              # Environment variables template
```

## Step 1: Prepare Your Repository

1. **Push to Git Repository**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import your Git repository
4. Vercel will automatically detect the configuration
5. Click **"Deploy"**

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

## Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings** → **Environment Variables** and add:

### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `AUTH0_DOMAIN` | `your-tenant.auth0.com` | Your Auth0 domain |
| `AUTH0_CLIENT_ID` | `your-client-id` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | `your-client-secret` | Auth0 application client secret |
| `AUTH0_AUDIENCE` | `https://sso-gateway.api` | Auth0 API identifier |
| `BASE_URL` | `https://your-project.vercel.app` | Your Vercel deployment URL |
| `SESSION_SECRET` | `generated-secret` | Session encryption key |
| `JWT_SECRET` | `generated-secret` | JWT signing key |

### Optional Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `ALLOWED_ORIGINS` | `https://your-project.vercel.app,https://product1.vercel.app` | CORS allowed origins |
| `LOG_LEVEL` | `info` | Logging level |
| `RATE_LIMIT_MAX_REQUESTS` | `200` | Rate limit per window |
| `REDIS_URL` | `redis://username:password@host:port` | Redis connection URL for session storage |
| `PRODUCT1_URL` | `https://product1.vercel.app` | Product 1 URL |
| `PRODUCT2_URL` | `https://product2.vercel.app` | Product 2 URL |
| `PRODUCT3_URL` | `https://product3.vercel.app` | Product 3 URL |
| `PLURIELL_URL` | `https://pluriell.receipt-flow.io.vn` | Pluriell URL |
| `RECEIPT_URL` | `https://receipt-flow.io.vn` | Receipt Flow URL |

### Generate Secrets

Use this command to generate secure secrets:

```bash
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

## Step 4: Update Auth0 Configuration

Update your Auth0 application settings with your Vercel URLs:

### Application Settings

**Allowed Callback URLs:**
```
https://your-project.vercel.app/callback
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

## Step 6: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Update Auth0 settings with your custom domain
4. Update environment variables:
   - `BASE_URL=https://sso.yourdomain.com`
   - `ALLOWED_ORIGINS=https://sso.yourdomain.com,https://app1.yourdomain.com`

## Vercel-Specific Considerations

### 1. Serverless Function Limits

- **Execution Time**: 30 seconds max (configurable in vercel.json)
- **Memory**: 1024MB default
- **Payload Size**: 4.5MB max

### 2. Cold Starts

- First request after inactivity may be slower
- Keep functions warm with health checks if needed

### 3. Logging

- Use `console.log()` for logging
- Logs are available in Vercel dashboard
- Consider external logging service for production

### 4. Session Storage

- No persistent file system
- Sessions stored in memory (lost on cold start) - this will cause warnings
- **Recommended: Use Redis for session storage**

#### Setting up Redis for Session Storage

1. **Create a Redis instance**
   - Sign up for [Upstash Redis](https://upstash.com/) (serverless Redis, works well with Vercel)
   - Or use any Redis provider (Redis Labs, AWS ElastiCache, etc.)

2. **Get your Redis connection URL**
   - Format: `redis://username:password@host:port`

3. **Add to Vercel environment variables**
   - Add `REDIS_URL` with your Redis connection string

4. **Redeploy your application**
   - The app will automatically use Redis for session storage when `REDIS_URL` is present
   - You'll no longer see the MemoryStore warnings

## Environment-Specific Configuration

### Development

```bash
# Local development
npm run dev
# or
vercel dev
```

### Production

Environment variables are automatically loaded from Vercel project settings.

## Monitoring and Debugging

### 1. Vercel Dashboard

- View function logs
- Monitor performance
- Check error rates

### 2. Health Checks

Set up monitoring for:
- `https://your-project.vercel.app/health`
- `https://your-project.vercel.app/api/health`

### 3. Error Tracking

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- DataDog for comprehensive monitoring

## Scaling Considerations

### 1. Rate Limiting

Adjusted for serverless environment:
- Higher limits due to distributed nature
- Consider external rate limiting service

### 2. Database Connections

- No persistent connections
- Use connection pooling
- Consider serverless databases

### 3. Caching

- Implement response caching
- Use CDN for static assets
- Cache JWT validation results

## Troubleshooting

### Common Issues

**1. Environment Variables Not Loading**
- Check variable names in Vercel dashboard
- Ensure no typos in variable names
- Redeploy after adding variables

**2. Auth0 Callback Errors**
- Verify callback URLs in Auth0
- Check BASE_URL environment variable
- Ensure HTTPS is used

**3. CORS Issues**
- Update ALLOWED_ORIGINS
- Check Auth0 CORS settings
- Verify request headers

**4. Cold Start Issues**
- Implement health check warming
- Optimize function size
- Use lighter dependencies

**5. MemoryStore Warning**
- Error message: `Warning: connect.session() MemoryStore is not designed for a production environment`
- Solution: Configure Redis by adding `REDIS_URL` environment variable
- Temporary workaround: Ignore the warning (it won't break functionality)
- This warning appears because the default session store is not persistent across serverless function invocations

**6. Global Logout Issues**
- Symptom: User remains logged in to some applications after global logout
- Check that all applications are using the same cookie domain settings
- Verify that federated logout is enabled in Auth0 settings
- Ensure all applications are redirecting to `/auth/logout?global=true`
- Check browser console for cookie-related errors
- Inspect cookies in browser developer tools to ensure they're being cleared
- Test global logout flow from each connected application

### Debug Commands

```bash
# Check deployment logs
vercel logs your-project.vercel.app

# Test locally
vercel dev

# Check environment variables
vercel env ls
```

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to Git
   - Use Vercel's encrypted environment variables
   - Rotate secrets regularly

2. **HTTPS Only**
   - Vercel provides HTTPS by default
   - Ensure Auth0 callbacks use HTTPS
   - Set secure cookie flags

3. **CORS Configuration**
   - Specify exact origins
   - Avoid wildcards in production
   - Regularly review allowed origins

4. **Cookie Settings for Cross-Domain Authentication**
   - Use `sameSite: 'none'` for cross-domain cookies
   - Set `secure: true` for all cookies in production
   - Use `domain: '.receipt-flow.io.vn'` (with leading dot) to share cookies across subdomains
   - Set `path: '/'` to ensure cookies are available across the entire site
   - Use `httpOnly: true` for sensitive cookies to prevent JavaScript access
   - For client-accessible cookies, set `httpOnly: false`
   - Clear cookies with the same options they were set with
   - Example cookie settings:
   ```javascript
   res.cookie('access_token', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
     domain: process.env.NODE_ENV === 'production' ? '.receipt-flow.io.vn' : undefined,
     path: '/',
     maxAge: 24 * 60 * 60 * 1000 // 24 hours
   });
   ```

## Performance Optimization

1. **Function Size**
   - Minimize dependencies
   - Use tree shaking
   - Consider function splitting

2. **Response Caching**
   - Cache static responses
   - Use appropriate cache headers
   - Implement CDN caching

3. **Database Optimization**
   - Use connection pooling
   - Implement query caching
   - Consider read replicas

## Next Steps

1. **Set up monitoring and alerting**
2. **Implement comprehensive logging**
3. **Add automated testing pipeline**
4. **Configure backup and disaster recovery**
5. **Set up staging environment**

## Support

For deployment issues:
- Check Vercel documentation
- Review function logs in dashboard
- Test locally with `vercel dev`
- Check Auth0 logs and configuration
