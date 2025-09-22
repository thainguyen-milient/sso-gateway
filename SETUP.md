# SSO Gateway Setup Guide

This guide will walk you through setting up the SSO Gateway with Auth0 step by step.

## Prerequisites

- Node.js 16 or higher
- Auth0 account (free tier available)
- Basic understanding of OAuth 2.0 and JWT

## Step 1: Auth0 Setup

### 1.1 Create Auth0 Account
1. Go to [auth0.com](https://auth0.com) and sign up for a free account
2. Create a new tenant (e.g., `your-company-dev`)

### 1.2 Create Application
1. In Auth0 Dashboard, go to **Applications** → **Applications**
2. Click **Create Application**
3. Choose **Regular Web Applications**
4. Name it "SSO Gateway"

### 1.3 Configure Application Settings
In your application settings, configure:

**Basic Information:**
- Name: SSO Gateway
- Domain: `your-tenant.auth0.com`
- Client ID: (copy this)
- Client Secret: (copy this)

**Application URIs:**
- Allowed Callback URLs: `http://localhost:3000/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

**Advanced Settings:**
- Grant Types: Authorization Code, Refresh Token
- Token Endpoint Authentication Method: POST

### 1.4 Create API
1. Go to **Applications** → **APIs**
2. Click **Create API**
3. Name: "SSO Gateway API"
4. Identifier: `https://sso-gateway.api` (use this as AUTH0_AUDIENCE)
5. Signing Algorithm: RS256

**API Settings:**
- Enable RBAC: Yes
- Add Permissions in Access Token: Yes

### 1.5 Create Roles and Permissions
1. Go to **User Management** → **Roles**
2. Create the following roles:
   - `admin`: Full system access
   - `product1_user`: Access to Product 1
   - `product2_user`: Access to Product 2
   - `product3_user`: Access to Product 3

3. Go to **Applications** → **APIs** → Your API → **Permissions**
4. Add the following permissions:
   - `admin:read`: Read admin data
   - `admin:write`: Write admin data
   - `product1:read`: Read Product 1 data
   - `product1:write`: Write Product 1 data
   - `product2:read`: Read Product 2 data
   - `product2:write`: Write Product 2 data
   - `product3:read`: Read Product 3 data
   - `product3:write`: Write Product 3 data

### 1.6 Assign Permissions to Roles
1. Go to **User Management** → **Roles**
2. For each role, click **Permissions** tab and assign relevant permissions:
   - `admin`: All permissions
   - `product1_user`: `product1:read`, `product1:write`
   - `product2_user`: `product2:read`, `product2:write`
   - `product3_user`: `product3:read`, `product3:write`

### 1.7 Create Action for Custom Claims
1. Go to **Actions** → **Flows** → **Login**
2. Click **Custom** tab → **Create Action**
3. Name: "Add Custom Claims"
4. Code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://sso-gateway.com/';
  
  if (event.authorization) {
    // Add roles to tokens
    api.idToken.setCustomClaim(`${namespace}roles`, event.authorization.roles);
    api.accessToken.setCustomClaim(`${namespace}roles`, event.authorization.roles);
    
    // Add permissions to tokens
    api.idToken.setCustomClaim(`${namespace}permissions`, event.authorization.permissions);
    api.accessToken.setCustomClaim(`${namespace}permissions`, event.authorization.permissions);
  }
};
```

5. Deploy the action and add it to the Login flow

## Step 2: Application Setup

### 2.1 Clone and Install
```bash
git clone <your-repo>
cd SSO-Gateway
npm install
```

### 2.2 Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your Auth0 values:
```env
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id-from-auth0
AUTH0_CLIENT_SECRET=your-client-secret-from-auth0
AUTH0_AUDIENCE=https://sso-gateway.api

# Application Configuration
BASE_URL=http://localhost:3000
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080
```

### 2.3 Generate Secrets
Generate secure secrets for production:

```bash
# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 3: Testing the Setup

### 3.1 Start the Server
```bash
npm run dev
```

### 3.2 Test Authentication Flow
1. Open browser to `http://localhost:3000`
2. Click login or go to `http://localhost:3000/auth/login`
3. You should be redirected to Auth0 login
4. After login, you should be redirected back with user info

### 3.3 Test API Endpoints
```bash
# Check health
curl http://localhost:3000/health

# Check auth status (should show not authenticated)
curl http://localhost:3000/auth/status

# After login, test user info
curl -b cookies.txt http://localhost:3000/user/profile
```

## Step 4: Create Test Users

### 4.1 Create Users in Auth0
1. Go to **User Management** → **Users**
2. Click **Create User**
3. Create test users:
   - admin@example.com (assign `admin` role)
   - user1@example.com (assign `product1_user` role)
   - user2@example.com (assign `product2_user` role)

### 4.2 Test Different User Access
Login with different users and test:
- Admin should have access to all products
- Product users should only have access to their specific product

## Step 5: Product Integration

### 5.1 Create Test Product Application
Create a simple Express app to test integration:

```javascript
// test-product/server.js
const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());

const SSO_GATEWAY_URL = 'http://localhost:3000';
const PRODUCT_ID = 'product1';

// Middleware to check authentication
const requireAuth = async (req, res, next) => {
  const token = req.cookies.access_token;
  
  if (!token) {
    return res.redirect(`${SSO_GATEWAY_URL}/auth/login?productId=${PRODUCT_ID}&returnTo=${encodeURIComponent(req.originalUrl)}`);
  }
  
  try {
    const response = await axios.post(`${SSO_GATEWAY_URL}/api/validate-token`, {
      token: token
    });
    
    req.user = response.data.user;
    next();
  } catch (error) {
    return res.redirect(`${SSO_GATEWAY_URL}/auth/login?productId=${PRODUCT_ID}`);
  }
};

// SSO callback handler
app.get('/auth/sso-callback', (req, res) => {
  const { token } = req.query;
  
  if (token) {
    res.cookie('access_token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    });
    res.redirect('/dashboard');
  } else {
    res.redirect('/login?error=sso_failed');
  }
});

// Protected route
app.get('/dashboard', requireAuth, (req, res) => {
  res.json({
    message: 'Welcome to Product 1 Dashboard',
    user: req.user
  });
});

// Login page
app.get('/login', (req, res) => {
  res.send(`
    <h1>Product 1 Login</h1>
    <a href="${SSO_GATEWAY_URL}/auth/login?productId=${PRODUCT_ID}&returnTo=${encodeURIComponent('http://localhost:3001/dashboard')}">
      Login with SSO
    </a>
  `);
});

app.listen(3001, () => {
  console.log('Test Product 1 running on port 3001');
});
```

### 5.2 Test Product Integration
1. Start test product: `node test-product/server.js`
2. Go to `http://localhost:3001/login`
3. Click "Login with SSO"
4. Should redirect to Auth0, then back to product dashboard

## Step 6: Production Deployment

### 6.1 Update Auth0 Settings
For production, update Auth0 application settings:
- Allowed Callback URLs: `https://your-domain.com/callback`
- Allowed Logout URLs: `https://your-domain.com`
- Allowed Web Origins: `https://your-domain.com`

### 6.2 Environment Variables
Update production environment variables:
```env
NODE_ENV=production
BASE_URL=https://your-domain.com
AUTH0_DOMAIN=your-tenant.auth0.com
# ... other production values
```

### 6.3 Security Checklist
- [ ] Use HTTPS in production
- [ ] Generate new secrets for production
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy (nginx/Apache)

## Troubleshooting

### Common Issues

**1. "Invalid state parameter" error**
- Check that BASE_URL matches your actual domain
- Ensure callback URLs are correctly configured in Auth0

**2. "Access denied" error**
- Check user has proper roles assigned
- Verify permissions are correctly configured
- Check custom claims action is deployed

**3. CORS errors**
- Add your product domains to ALLOWED_ORIGINS
- Ensure credentials: true in CORS config

**4. Token validation fails**
- Check AUTH0_AUDIENCE matches API identifier
- Verify JWT_SECRET is set correctly
- Check token hasn't expired

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Check Logs
```bash
tail -f logs/combined.log
```

## Next Steps

1. **Customize User Interface**: Create custom login/logout pages
2. **Add More Products**: Configure additional product integrations
3. **Implement User Management**: Add user administration features
4. **Set Up Monitoring**: Configure application monitoring and alerts
5. **Add Tests**: Implement comprehensive test suite
6. **Documentation**: Create product-specific integration guides

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review Auth0 logs in the dashboard
3. Check application logs
4. Verify environment configuration
5. Test with curl commands to isolate issues
