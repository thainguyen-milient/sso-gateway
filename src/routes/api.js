const express = require('express');
const { verifyAuth0Token, verifyCustomToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/validate-token
 * Validate JWT token and return user information
 */
router.get('/validate-token', verifyAuth0Token, asyncHandler(async (req, res) => {
  const user = req.user;
  
  res.json({
    success: true,
    valid: true,
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      roles: user['https://sso-gateway.com/roles'] || user.roles || [],
      permissions: user['https://sso-gateway.com/permissions'] || user.permissions || [],
      productId: user.productId,
    },
    tokenInfo: {
      issuer: user.iss,
      audience: user.aud,
      issuedAt: new Date(user.iat * 1000).toISOString(),
      expiresAt: new Date(user.exp * 1000).toISOString(),
    },
  });
}));

/**
 * POST /api/validate-token
 * Validate JWT token from request body
 */
router.post('/validate-token', asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required',
    });
  }

  // Temporarily set token in header for middleware
  req.headers.authorization = `Bearer ${token}`;
  
  verifyAuth0Token(req, res, () => {
    const user = req.user;
    
    res.json({
      success: true,
      valid: true,
      user: {
        id: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        roles: user['https://sso-gateway.com/roles'] || user.roles || [],
        permissions: user['https://sso-gateway.com/permissions'] || user.permissions || [],
        productId: user.productId,
      },
      tokenInfo: {
        issuer: user.iss,
        audience: user.aud,
        issuedAt: new Date(user.iat * 1000).toISOString(),
        expiresAt: new Date(user.exp * 1000).toISOString(),
      },
    });
  });
}));

/**
 * GET /api/user-info
 * Get user information for authenticated requests
 */
router.get('/user-info', verifyAuth0Token, asyncHandler(async (req, res) => {
  const user = req.user;
  
  res.json({
    success: true,
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      emailVerified: user.email_verified,
      roles: user['https://sso-gateway.com/roles'] || user.roles || [],
      permissions: user['https://sso-gateway.com/permissions'] || user.permissions || [],
      productId: user.productId,
    },
  });
}));

/**
 * GET /api/products/:productId/access
 * Check if user has access to a specific product
 */
router.get('/products/:productId/access', verifyAuth0Token, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const user = req.user;
  
  // Simplified: All authenticated users have access to all products
  const hasAccess = true;
  
  // Simplified permissions (hardcoded)
  const productPermissions = [`${productId}:read`, `${productId}:write`];
  
  res.json({
    success: true,
    productId,
    hasAccess,
    permissions: productPermissions,
  });
}));

/**
 * POST /api/products/:productId/login
 * Generate product-specific login URL
 */
router.post('/products/:productId/login', asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { returnTo } = req.body;
  
  // Validate product ID
  const validProducts = ['product1', 'product2', 'product3', 'pluriell', 'receipt'];
  if (!validProducts.includes(productId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid product ID',
    });
  }
  
  const loginUrl = `${process.env.BASE_URL}/auth/login?productId=${productId}&returnTo=${encodeURIComponent(returnTo || '/')}`;
  
  res.json({
    success: true,
    loginUrl,
    productId,
  });
}));

/**
 * GET /api/products/:productId/users
 * Get users with access to a specific product
 */
router.get('/products/:productId/users', verifyAuth0Token, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  
  // In a real implementation, you would fetch users from Auth0 Management API
  // For now, we'll return mock data
  const users = [
    {
      id: 'user_1',
      email: 'user1@example.com',
      name: 'User One',
      roles: [`${productId}_user`],
      permissions: [`${productId}:read`],
      lastLogin: new Date().toISOString(),
    },
    {
      id: 'user_2',
      email: 'user2@example.com',
      name: 'User Two',
      roles: [`${productId}_admin`],
      permissions: [`${productId}:read`, `${productId}:write`],
      lastLogin: new Date().toISOString(),
    },
  ];
  
  res.json({
    success: true,
    productId,
    users,
    totalCount: users.length,
  });
}));

/**
 * POST /api/webhook/auth0
 * Handle Auth0 webhooks for user events
 */
router.post('/webhook/auth0', asyncHandler(async (req, res) => {
  const { event, user } = req.body;
  
  logger.info('Auth0 webhook received', {
    event,
    userId: user?.user_id,
    email: user?.email,
  });
  
  // Handle different webhook events
  switch (event) {
    case 'user.created':
      logger.info('New user created', { userId: user.user_id, email: user.email });
      break;
    case 'user.updated':
      logger.info('User updated', { userId: user.user_id, email: user.email });
      break;
    case 'user.deleted':
      logger.info('User deleted', { userId: user.user_id });
      break;
    case 'login.success':
      logger.info('User login successful', { userId: user.user_id, email: user.email });
      break;
    case 'login.failed':
      logger.warn('User login failed', { userId: user.user_id, email: user.email });
      break;
    default:
      logger.info('Unknown webhook event', { event });
  }
  
  res.status(200).json({
    success: true,
    message: 'Webhook processed successfully',
  });
}));

/**
 * GET /api/health
 * Health check endpoint for load balancers
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

/**
 * GET /api/metrics
 * Basic metrics endpoint
 */
router.get('/metrics', verifyAuth0Token, asyncHandler(async (req, res) => {
  // In a real implementation, you would collect actual metrics
  const metrics = {
    totalUsers: 150,
    activeUsers: 45,
    totalSessions: 67,
    activeSessions: 23,
    loginAttempts: {
      successful: 234,
      failed: 12,
    },
    productAccess: {
      product1: 89,
      product2: 67,
      product3: 45,
      pluriell: 78,
      receipt: 56,
    },
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
  
  res.json({
    success: true,
    metrics,
    timestamp: new Date().toISOString(),
  });
}));

/**
 * GET /api/pluriell/auth
 * Specific endpoint for Pluriell authentication
 */
router.get('/pluriell/auth', verifyCustomToken, asyncHandler(async (req, res) => {
  const user = req.user;
  
  // Check if this is a Pluriell token
  if (user.productId !== 'pluriell') {
    return res.status(403).json({
      success: false,
      error: 'This token is not authorized for Pluriell',
    });
  }
  
  res.json({
    success: true,
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      roles: user.roles || [],
      permissions: user.permissions || [],
      source: 'sso-gateway',
    },
    productAccess: {
      productId: 'pluriell',
      hasAccess: true,
      permissions: ['pluriell:read', 'pluriell:write'],
    },
  });
}));

/**
 * GET /api/receipt/auth
 * Specific endpoint for Receipt authentication
 */
router.get('/receipt/auth', verifyCustomToken, asyncHandler(async (req, res) => {
  const user = req.user;

  // Check if this is a Receipt token
  if (user.productId !== 'receipt') {
    return res.status(403).json({
      success: false,
      error: 'This token is not authorized for Receipt',
    });
  }
  
  res.json({
    success: true,
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      roles: user.roles || [],
      permissions: user.permissions || [],
      source: 'sso-gateway',
    },
    productAccess: {
      productId: 'receipt',
      hasAccess: true,
      permissions: ['receipt:read', 'receipt:write'],
    },
  });
}));

module.exports = router;
