/**
 * Example Product Integration with SSO Gateway
 * 
 * This example shows how to integrate a product application with the SSO Gateway
 */

const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());
app.use(express.json());

// Configuration
const SSO_GATEWAY_URL = process.env.SSO_GATEWAY_URL || 'http://localhost:3000';
const PRODUCT_ID = process.env.PRODUCT_ID || 'product1';
const PORT = process.env.PORT || 3001;

/**
 * SSO Client Class
 */
class SSOClient {
  constructor(gatewayUrl, productId) {
    this.gatewayUrl = gatewayUrl;
    this.productId = productId;
  }

  /**
   * Generate login URL
   */
  getLoginUrl(returnTo) {
    const params = new URLSearchParams({
      productId: this.productId,
      returnTo: returnTo || `http://localhost:${PORT}/dashboard`
    });
    return `${this.gatewayUrl}/auth/login?${params}`;
  }

  /**
   * Generate logout URL
   */
  getLogoutUrl(returnTo) {
    const params = new URLSearchParams({
      returnTo: returnTo || `http://localhost:${PORT}`
    });
    return `${this.gatewayUrl}/auth/logout?${params}`;
  }

  /**
   * Validate token with SSO Gateway
   */
  async validateToken(token) {
    try {
      const response = await axios.post(`${this.gatewayUrl}/api/validate-token`, {
        token: token
      });
      return response.data;
    } catch (error) {
      throw new Error('Token validation failed');
    }
  }

  /**
   * Check product access
   */
  async checkProductAccess(token) {
    try {
      const response = await axios.get(
        `${this.gatewayUrl}/api/products/${this.productId}/access`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Access check failed');
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(token) {
    try {
      const response = await axios.get(`${this.gatewayUrl}/api/user-info`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to get user info');
    }
  }
}

// Initialize SSO client
const ssoClient = new SSOClient(SSO_GATEWAY_URL, PRODUCT_ID);

/**
 * Authentication middleware
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies.access_token || 
                  req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.redirect(ssoClient.getLoginUrl(req.originalUrl));
    }

    // Validate token
    const validation = await ssoClient.validateToken(token);
    
    if (!validation.valid) {
      return res.redirect(ssoClient.getLoginUrl(req.originalUrl));
    }

    // Check product access
    const access = await ssoClient.checkProductAccess(token);
    
    if (!access.hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this product'
      });
    }

    // Add user to request
    req.user = validation.user;
    req.userPermissions = access.permissions;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.redirect(ssoClient.getLoginUrl(req.originalUrl));
  }
};

/**
 * Permission middleware
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.userPermissions || !req.userPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        current: req.userPermissions
      });
    }
    next();
  };
};

// Routes

/**
 * Home page
 */
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Product ${PRODUCT_ID.toUpperCase()}</title></head>
      <body>
        <h1>Welcome to Product ${PRODUCT_ID.toUpperCase()}</h1>
        <p>This is an example product integration with SSO Gateway.</p>
        <a href="/login">Login</a> | 
        <a href="/dashboard">Dashboard</a>
      </body>
    </html>
  `);
});

/**
 * Login page
 */
app.get('/login', (req, res) => {
  const loginUrl = ssoClient.getLoginUrl(req.query.returnTo);
  res.redirect(loginUrl);
});

/**
 * SSO callback handler
 */
app.get('/auth/sso-callback', (req, res) => {
  const { token } = req.query;
  
  if (token) {
    // Store token in HTTP-only cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours,
      domain: '.receipt-flow.io.vn'
    });
    
    // Redirect to dashboard or return URL
    const returnTo = req.query.returnTo || '/dashboard';
    res.redirect(returnTo);
  } else {
    res.status(400).send(`
      <html>
        <head><title>Login Failed</title></head>
        <body>
          <h1>Login Failed</h1>
          <p>SSO authentication failed. Please try again.</p>
          <a href="/login">Try Again</a>
        </body>
      </html>
    `);
  }
});

/**
 * Logout
 */
app.get('/logout', (req, res) => {
  res.clearCookie('access_token');
  const logoutUrl = ssoClient.getLogoutUrl();
  res.redirect(logoutUrl);
});

/**
 * Protected dashboard
 */
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const token = req.cookies.access_token;
    const userInfo = await ssoClient.getUserInfo(token);
    
    res.send(`
      <html>
        <head><title>Dashboard - Product ${PRODUCT_ID.toUpperCase()}</title></head>
        <body>
          <h1>Dashboard - Product ${PRODUCT_ID.toUpperCase()}</h1>
          <h2>Welcome, ${userInfo.user.name}!</h2>
          
          <h3>User Information:</h3>
          <ul>
            <li><strong>Email:</strong> ${userInfo.user.email}</li>
            <li><strong>ID:</strong> ${userInfo.user.id}</li>
            <li><strong>Roles:</strong> ${userInfo.user.roles.join(', ') || 'None'}</li>
            <li><strong>Permissions:</strong> ${userInfo.user.permissions.join(', ') || 'None'}</li>
          </ul>
          
          <h3>Actions:</h3>
          <ul>
            <li><a href="/api/data">View Data (requires read permission)</a></li>
            <li><a href="/api/admin">Admin Panel (requires admin permission)</a></li>
            <li><a href="/profile">Profile</a></li>
            <li><a href="/logout">Logout</a></li>
          </ul>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading dashboard');
  }
});

/**
 * User profile
 */
app.get('/profile', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    permissions: req.userPermissions
  });
});

/**
 * Protected API endpoint - requires read permission
 */
app.get('/api/data', requireAuth, requirePermission(`${PRODUCT_ID}:read`), (req, res) => {
  res.json({
    success: true,
    message: 'This is protected data',
    data: [
      { id: 1, name: 'Sample Data 1' },
      { id: 2, name: 'Sample Data 2' },
      { id: 3, name: 'Sample Data 3' }
    ],
    user: req.user.name,
    timestamp: new Date().toISOString()
  });
});

/**
 * Admin endpoint - requires write permission
 */
app.get('/api/admin', requireAuth, requirePermission(`${PRODUCT_ID}:write`), (req, res) => {
  res.json({
    success: true,
    message: 'Admin panel data',
    stats: {
      totalUsers: 150,
      activeUsers: 45,
      lastLogin: new Date().toISOString()
    },
    user: req.user.name
  });
});

/**
 * API endpoint to create data - requires write permission
 */
app.post('/api/data', requireAuth, requirePermission(`${PRODUCT_ID}:write`), (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Name is required'
    });
  }
  
  res.json({
    success: true,
    message: 'Data created successfully',
    data: {
      id: Date.now(),
      name: name,
      createdBy: req.user.name,
      createdAt: new Date().toISOString()
    }
  });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    product: PRODUCT_ID,
    timestamp: new Date().toISOString(),
    ssoGateway: SSO_GATEWAY_URL
  });
});

/**
 * Error handler
 */
app.use((error, req, res, next) => {
  console.error('Application error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Product ${PRODUCT_ID.toUpperCase()} running on port ${PORT}`);
  console.log(`📡 SSO Gateway: ${SSO_GATEWAY_URL}`);
  console.log(`🌐 Access: http://localhost:${PORT}`);
});

module.exports = app;
