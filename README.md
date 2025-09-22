# SSO Gateway

A Single Sign-On (SSO) Gateway with Auth0 integration for multiple products.

## 🚀 Quick Start - Simplified Setup

### 1. Set up Auth0

1. **Create an Auth0 Account** at [auth0.com](https://auth0.com)
2. **Create a New Application**:
   - Go to Applications → Create Application
   - Name: `SSO Gateway`
   - Type: Regular Web Application
3. **Configure Application Settings**:
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`
4. **Note your credentials**:
   - Domain
   - Client ID
   - Client Secret

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit with your Auth0 credentials
nano .env  # or use your preferred editor
```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start the server
npm run dev
```

### 4. Access the Portal

Open your browser to [http://localhost:3000](http://localhost:3000)

## Features

- 🔐 **Auth0 Integration**: Seamless integration with Auth0 for authentication
- 🎫 **JWT Token Management**: Custom JWT tokens for API access
- 🛡️ **Security First**: Built-in security middleware, rate limiting, and CORS protection
- 🔄 **Multi-Product Support**: Support for multiple products with role-based access
- 📊 **Comprehensive Logging**: Winston-based logging with multiple transports
- 🚀 **Production Ready**: Helmet security, compression, and error handling
- 📈 **Monitoring**: Health checks and metrics endpoints
- 🔧 **Flexible Configuration**: Environment-based configuration

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Product 1    │    │    Product 2    │    │    Product 3    │
│  (Port 3001)    │    │  (Port 3002)    │    │  (Port 3003)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      SSO Gateway         │
                    │     (Port 3000)          │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │        Auth0             │
                    │   Identity Provider      │
                    └──────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 16+ 
- Auth0 account and application
- Redis (optional, for session storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SSO-Gateway
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Auth0 credentials:
   ```env
   AUTH0_DOMAIN=your-auth0-domain.auth0.com
   AUTH0_CLIENT_ID=your-auth0-client-id
   AUTH0_CLIENT_SECRET=your-auth0-client-secret
   AUTH0_AUDIENCE=your-auth0-api-identifier
   BASE_URL=http://localhost:3000
   SESSION_SECRET=your-super-secret-session-key
   JWT_SECRET=your-jwt-secret-key
   ```

4. **Start the server**
   ```bash
   # Local development
   npm run dev
   
   # Deploy to Vercel
   npm run deploy
   
   # Traditional server
   npm start
   ```

## Auth0 Configuration

### 1. Create Auth0 Application

1. Go to Auth0 Dashboard → Applications
2. Create a new "Regular Web Application"
3. Configure the following settings:

**Allowed Callback URLs:**
```
http://localhost:3000/callback,
https://your-domain.com/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000,
https://your-domain.com
```

**Allowed Web Origins:**
```
http://localhost:3000,
https://your-domain.com
```

### 2. Create Auth0 API

1. Go to Auth0 Dashboard → APIs
2. Create a new API with identifier (use this as `AUTH0_AUDIENCE`)
3. Enable RBAC and add permissions in token

### 3. Configure Rules/Actions

Create an Auth0 Action to add custom claims:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://sso-gateway.com/';
  
  if (event.authorization) {
    // Add roles to token
    api.idToken.setCustomClaim(`${namespace}roles`, event.authorization.roles);
    api.accessToken.setCustomClaim(`${namespace}roles`, event.authorization.roles);
    
    // Add permissions to token
    api.idToken.setCustomClaim(`${namespace}permissions`, event.authorization.permissions);
    api.accessToken.setCustomClaim(`${namespace}permissions`, event.authorization.permissions);
  }
};
```

## API Endpoints

### Authentication Routes (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login` | Initiate Auth0 login |
| GET | `/auth/callback` | Auth0 callback handler |
| GET | `/auth/logout` | Logout user |
| GET | `/auth/profile` | Get user profile |
| POST | `/auth/token` | Exchange session for JWT |
| GET | `/auth/status` | Check auth status |

### User Routes (`/user`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/profile` | Get user profile |
| PUT | `/user/profile` | Update user profile |
| GET | `/user/permissions` | Get user permissions |
| GET | `/user/products` | Get accessible products |
| GET | `/user/sessions` | Get active sessions (admin) |
| DELETE | `/user/sessions/:id` | Revoke session (admin) |

### API Routes (`/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/validate-token` | Validate JWT token |
| POST | `/api/validate-token` | Validate token from body |
| GET | `/api/user-info` | Get user information |
| GET | `/api/products/:id/access` | Check product access |
| POST | `/api/products/:id/login` | Generate login URL |
| GET | `/api/products/:id/users` | Get product users (admin) |
| POST | `/api/webhook/auth0` | Auth0 webhook handler |
| GET | `/api/health` | Health check |
| GET | `/api/metrics` | System metrics (admin) |

## Integration Guide

### For Product Applications

#### 1. Login Integration

Redirect users to the SSO Gateway for authentication:

```javascript
// Redirect to SSO Gateway
window.location.href = 'http://localhost:3000/auth/login?productId=product1&returnTo=' + 
  encodeURIComponent(window.location.href);
```

#### 2. Handle SSO Callback

Create an endpoint in your product to handle the SSO callback:

```javascript
// Express.js example
app.get('/auth/sso-callback', (req, res) => {
  const { token } = req.query;
  
  if (token) {
    // Store token securely (HTTP-only cookie recommended)
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Redirect to application
    res.redirect('/dashboard');
  } else {
    res.redirect('/login?error=sso_failed');
  }
});
```

#### 3. Validate Tokens

Validate tokens on each request:

```javascript
const axios = require('axios');

async function validateToken(token) {
  try {
    const response = await axios.post('http://localhost:3000/api/validate-token', {
      token: token
    });
    
    return response.data.user;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Middleware example
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.access_token || 
                req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.redirect('http://localhost:3000/auth/login?productId=product1');
  }
  
  try {
    const user = await validateToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.redirect('http://localhost:3000/auth/login?productId=product1');
  }
};
```

### Frontend Integration

#### JavaScript/React Example

```javascript
class SSOClient {
  constructor(gatewayUrl, productId) {
    this.gatewayUrl = gatewayUrl;
    this.productId = productId;
  }
  
  login(returnTo = window.location.href) {
    const loginUrl = `${this.gatewayUrl}/auth/login?productId=${this.productId}&returnTo=${encodeURIComponent(returnTo)}`;
    window.location.href = loginUrl;
  }
  
  logout() {
    const logoutUrl = `${this.gatewayUrl}/auth/logout?returnTo=${encodeURIComponent(window.location.origin)}`;
    window.location.href = logoutUrl;
  }
  
  async getUser() {
    const response = await fetch(`${this.gatewayUrl}/api/user-info`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    
    throw new Error('Not authenticated');
  }
  
  async checkAccess() {
    const response = await fetch(`${this.gatewayUrl}/api/products/${this.productId}/access`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.hasAccess;
    }
    
    return false;
  }
}

// Usage
const sso = new SSOClient('http://localhost:3000', 'product1');

// Login
document.getElementById('login-btn').addEventListener('click', () => {
  sso.login();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  sso.logout();
});

// Get user info
sso.getUser().then(user => {
  console.log('Current user:', user);
}).catch(() => {
  console.log('User not authenticated');
});
```

## Security Considerations

### 1. Token Security
- Use HTTP-only cookies for token storage
- Implement proper CSRF protection
- Set secure cookie flags in production
- Use short token expiration times

### 2. CORS Configuration
- Configure specific allowed origins
- Avoid using wildcards in production
- Enable credentials for cross-origin requests

### 3. Rate Limiting
- Implement rate limiting on authentication endpoints
- Monitor for brute force attacks
- Use progressive delays for failed attempts

### 4. Logging and Monitoring
- Log all authentication events
- Monitor for suspicious activities
- Set up alerts for failed login attempts

## Deployment

### Vercel Deployment (Recommended)

The SSO Gateway is optimized for Vercel serverless deployment:

1. **Quick Deploy**
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

2. **Configure Environment Variables**
   - Set Auth0 credentials in Vercel dashboard
   - Update BASE_URL to your Vercel domain
   - Generate secure SESSION_SECRET and JWT_SECRET

3. **Update Auth0 Settings**
   - Add Vercel URLs to Auth0 callback URLs
   - Update CORS settings

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

### Docker Deployment (Alternative)

For traditional server deployment:

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  sso-gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AUTH0_DOMAIN=${AUTH0_DOMAIN}
      - AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}
      - AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET}
      - AUTH0_AUDIENCE=${AUTH0_AUDIENCE}
      - BASE_URL=${BASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH0_DOMAIN` | Auth0 domain | Yes |
| `AUTH0_CLIENT_ID` | Auth0 client ID | Yes |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret | Yes |
| `AUTH0_AUDIENCE` | Auth0 API audience | Yes |
| `BASE_URL` | Gateway base URL | Yes |
| `SESSION_SECRET` | Session encryption key | Yes |
| `JWT_SECRET` | JWT signing key | Yes |
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment | No (default: development) |
| `REDIS_URL` | Redis connection URL | No |
| `LOG_LEVEL` | Logging level | No (default: info) |

## Troubleshooting

### Common Issues

1. **Auth0 Callback Error**
   - Check callback URLs in Auth0 dashboard
   - Verify BASE_URL environment variable
   - Ensure Auth0 credentials are correct

2. **Token Validation Failed**
   - Check Auth0 audience configuration
   - Verify JWT_SECRET is set
   - Ensure token hasn't expired

3. **CORS Issues**
   - Add product URLs to ALLOWED_ORIGINS
   - Check credentials flag in CORS config
   - Verify request headers

4. **Session Issues**
   - Check SESSION_SECRET is set
   - Verify Redis connection if using Redis sessions
   - Check cookie settings for cross-domain

### Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

Check logs:

```bash
tail -f logs/combined.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review Auth0 documentation
