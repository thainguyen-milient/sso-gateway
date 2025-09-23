const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /user/products
 * Get products accessible to the current user
 */
router.get('/products', requireAuth, asyncHandler(async (req, res) => {
  try {
    const user = req.oidc?.user || req.user;
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Hardcoded product access - all authenticated users get access to all products
    // In a real implementation, this would come from a database or user-specific permissions
    const accessibleProducts = ['product1', 'product2', 'product3', 'pluriell'];
    if (user.email === 'nhuthailtk1@gmail.com') {
      // If email is nhuthailtk1@gmail.com, restrict access to pluriell only
      accessibleProducts.splice(0, accessibleProducts.length, 'pluriell');
    }
    
    // Map products to their details
    const productDetails = accessibleProducts.map(productId => {
      const productUrls = {
        'receipt': process.env.RECEIPT_URL || 'https://receipt-flow.io.vn/auth/login',
        'product2': process.env.PRODUCT2_URL || 'http://localhost:3004',
        'product3': process.env.PRODUCT3_URL || 'http://localhost:3003',
        'pluriell': process.env.PLURIELL_URL || 'http://localhost:3002/auth/login',
      };
      
      const productNames = {
        'product1': 'Receipt Flow',
        'product2': 'Knowledge Portal',
        'product3': 'Hub Planner',
        'pluriell': 'Pluriell',
      };
      
      return {
        id: productId,
        name: productNames[productId] || productId,
        url: productUrls[productId] || '#',
        description: `Access ${productNames[productId] || productId} with your current credentials.`,
      };
    });
    
    res.json({
      success: true,
      products: productDetails,
    });
  } catch (error) {
    logger.error('Error fetching user products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
    });
  }
}));

/**
 * GET /user/profile
 * Get user profile information
 */
router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
  const user = req.oidc?.user || req.user;
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

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
      lastLogin: user.updated_at,
      createdAt: user.created_at,
    },
  });
}));

/**
 * PUT /user/profile
 * Update user profile information
 */
router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
  const user = req.oidc?.user || req.user;
  const { name, picture } = req.body;

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  // In a real implementation, you would update the user in Auth0
  // For now, we'll just return the updated information
  logger.info('User profile update requested', {
    userId: user.sub,
    updates: { name, picture },
  });

  res.json({
    success: true,
    message: 'Profile update requested',
    user: {
      id: user.sub,
      email: user.email,
      name: name || user.name,
      picture: picture || user.picture,
      emailVerified: user.email_verified,
      roles: user['https://sso-gateway.com/roles'] || user.roles || [],
      permissions: user['https://sso-gateway.com/permissions'] || user.permissions || [],
    },
  });
}));

/**
 * GET /user/permissions
 * Get user permissions
 */
router.get('/permissions', requireAuth, asyncHandler(async (req, res) => {
  const user = req.oidc?.user || req.user;
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  const permissions = user['https://sso-gateway.com/permissions'] || user.permissions || [];
  const roles = user['https://sso-gateway.com/roles'] || user.roles || [];

  res.json({
    success: true,
    permissions,
    roles,
  });
}));


/**
 * GET /user/sessions
 * Get user active sessions
 */
router.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
  const user = req.oidc?.user || req.user;
  
  // In a real implementation, you would fetch sessions from a database or session store
  // For now, we'll return mock data
  const sessions = [
    {
      id: 'session_1',
      userId: user.sub,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      active: true,
    },
  ];

  res.json({
    success: true,
    sessions,
    totalCount: sessions.length,
  });
}));

/**
 * DELETE /user/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', requireAuth, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  logger.info('Session revocation requested', {
    sessionId,
    requestedBy: req.user?.sub || req.oidc?.user?.sub,
  });

  // In a real implementation, you would revoke the session
  res.json({
    success: true,
    message: 'Session revoked successfully',
    sessionId,
  });
}));

module.exports = router;
