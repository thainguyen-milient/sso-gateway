# Vercel Environment Variables Setup

This document provides a comprehensive list of all environment variables needed for deploying the SSO Gateway to Vercel.

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH0_DOMAIN` | Your Auth0 domain | `your-tenant.auth0.com` |
| `AUTH0_CLIENT_ID` | Auth0 application client ID | `abcdefg123456789` |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret | `your-client-secret` |
| `AUTH0_AUDIENCE` | Auth0 API identifier | `https://sso-gateway.api` |
| `BASE_URL` | Your Vercel deployment URL | `https://your-project.vercel.app` |
| `SESSION_SECRET` | Session encryption key | Generated secret (see below) |
| `JWT_SECRET` | JWT signing key | Generated secret (see below) |
| `NODE_ENV` | Environment name | `production` |

## Optional Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://your-project.vercel.app` | `https://your-project.vercel.app,https://product1.vercel.app` |
| `LOG_LEVEL` | Logging level | `info` | `debug`, `info`, `warn`, `error` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `900000` (15 minutes) | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `200` | `200` |
| `PRODUCT1_URL` | Product 1 URL | - | `https://product1.vercel.app` |
| `PRODUCT2_URL` | Product 2 URL | - | `https://product2.vercel.app` |
| `PRODUCT3_URL` | Product 3 URL | - | `https://product3.vercel.app` |
| `JWT_EXPIRES_IN` | JWT expiration time | `24h` | `24h`, `7d` |

## Generating Secure Secrets

Use these commands to generate secure secrets for your production environment:

```bash
# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Setting Up Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each environment variable and its value
5. Make sure to select the appropriate environments (Production, Preview, Development)
6. Click **Save** to apply the changes

## Auth0 Configuration for Vercel

After deploying to Vercel, update your Auth0 application settings:

### Application Settings

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

## Troubleshooting

If you encounter issues with environment variables:

1. Check for typos in variable names
2. Ensure all required variables are set
3. Verify that Auth0 configuration matches your Vercel deployment
4. Redeploy after making changes to environment variables
