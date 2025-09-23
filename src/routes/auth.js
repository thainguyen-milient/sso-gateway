const express = require('express');
const { requiresAuth } = require('express-openid-connect');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Import auth middleware if available
try {
  const { generateToken } = require('../middleware/auth');
} catch (error) {
  console.error('Error importing auth middleware:', error);
}

/**
 * Generate JWT token for SSO Gateway
 */
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'default-secret-key', {
    expiresIn,
    issuer: 'sso-gateway',
  });
};

/**
 * GET /auth/login
 * Initiate Auth0 login
 */
router.get('/login', (req, res) => {
  const returnTo = req.query.returnTo || '/';
  const productId = req.query.productId;
  
  // Initialize session if it doesn't exist
  if (!req.session) {
    req.session = {};
  }
  
  // Store product ID in session for post-login redirect
  if (productId) {
    req.session.productId = productId;
  }
  
  // Store return URL in session
  req.session.returnTo = returnTo;
  console.log('Redirect URI for Auth0:', `${process.env.BASE_URL}/auth/callback`);
  res.oidc.login({
    returnTo: '/', // Redirect to the root of the app AFTER successful login and callback processing.
    authorizationParams: {
      redirect_uri: `${process.env.BASE_URL}/auth/callback`, // This MUST match the URL in Auth0 dashboard.
      scope: 'openid profile email',
      audience: process.env.AUTH0_AUDIENCE,
    },
  });
});

/**
 * GET /auth/callback
 * Auth0 callback handler - this will be handled by Auth0 middleware first
 * This route acts as a post-callback processor
 */
router.get('/callback', requiresAuth(), async (req, res) => {
  // The Auth0 middleware will handle the authentication
  // and make the user available via req.oidc.user
  try {
    const user = req.oidc.user;
    // Safely access session properties
    const productId = req.session?.productId;
    const returnTo = req.session?.returnTo || '/';
    
    console.log('User authenticated successfully', {
      userId: user.sub,
      email: user.email,
      productId,
    });

    // Generate custom JWT token for API access
    const tokenPayload = {
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      roles: user['https://sso-gateway.com/roles'] || [],
      permissions: user['https://sso-gateway.com/permissions'] || [],
      productId,
    };

    const accessToken = generateToken(tokenPayload);
    
    // Set token as HTTP-only cookie with cross-domain support
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Use 'none' in production for cross-domain
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Clear session data if session exists
    if (req.session) {
      delete req.session.productId;
      delete req.session.returnTo;
    }

    // Redirect based on product or return URL
    if (productId) {
      const productRedirectUrl = getProductRedirectUrl(productId, accessToken);
      return res.redirect(productRedirectUrl);
    }

    res.redirect(returnTo);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication callback failed',
    });
  }
});

/**
 * GET /auth/logout
 * Logout user and clear session
 * Supports global logout across all connected applications
 */
router.get('/logout', (req, res) => {
  const returnTo = req.query.returnTo || process.env.BASE_URL;
  const isGlobalLogout = req.query.global === 'true';
  
  // Clear all possible token cookies
  res.clearCookie('access_token');
  res.clearCookie('sso_token');
  res.clearCookie('id_token');
  res.clearCookie('auth_token');
  
  // Log user out
  console.log(`User logged out (${isGlobalLogout ? 'global' : 'local'} logout)`, {
    userId: req.oidc.user?.sub,
    email: req.oidc.user?.email,
    returnTo
  });

  // If this is a global logout, we need to handle logout for all connected applications
  if (isGlobalLogout) {
    // Get all connected product URLs
    const connectedProducts = [
      process.env.PLURIELL_URL || 'https://pluriell.receipt-flow.io.vn',
      process.env.RECEIPT_URL || 'https://receipt-flow.io.vn',
      // Add other products as needed
    ];
    
    console.log('Global logout initiated - will clear sessions across all products');
    
    // For global logout, we'll use Auth0's federated logout feature
    // This will clear the Auth0 session and all connected applications
    return res.oidc.logout({
      returnTo,
      // The federated parameter tells Auth0 to perform a federated logout
      // This will clear the session with the identity provider (Auth0)
      federated: true
    });
  }
  
  // For regular logout, just clear the local session
  res.oidc.logout({
    returnTo,
  });
});

/**
 * GET /auth/profile
 * Get current user profile
 */
router.get('/profile', requiresAuth(), (req, res) => {
  const user = req.oidc.user;
  
  res.json({
    success: true,
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      emailVerified: user.email_verified,
      roles: user['https://sso-gateway.com/roles'] || [],
      permissions: user['https://sso-gateway.com/permissions'] || [],
      lastLogin: user.updated_at,
    },
  });
});

/**
 * POST /auth/token
 * Exchange Auth0 session for JWT token
 */
router.post('/token', requiresAuth(), (req, res) => {
  try {
    const user = req.oidc.user;
    const { productId } = req.body;

    const tokenPayload = {
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      roles: user['https://sso-gateway.com/roles'] || [],
      permissions: user['https://sso-gateway.com/permissions'] || [],
      productId,
    };

    const accessToken = generateToken(tokenPayload);
    
    res.json({
      success: true,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '24h',
      user: tokenPayload,
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Token generation failed',
    });
  }
});

/**
 * GET /auth/status
 * Check authentication status
 */
router.get('/status', (req, res) => {
  const isAuthenticated = req.oidc.isAuthenticated();
  
  res.json({
    success: true,
    authenticated: isAuthenticated,
    user: isAuthenticated ? {
      id: req.oidc.user.sub,
      email: req.oidc.user.email,
      name: req.oidc.user.name,
      picture: req.oidc.user.picture,
    } : null,
  });
});

/**
 * Helper function to get product-specific redirect URL
 */
function getProductRedirectUrl(productId, accessToken) {
  const productUrls = {
    'product1': process.env.PRODUCT1_URL || 'http://localhost:3001',
    'product2': process.env.PRODUCT2_URL || 'http://localhost:3002',
    'product3': process.env.PRODUCT3_URL || 'http://localhost:3003',
    'pluriell': process.env.PLURIELL_URL || 'https://pluriell.receipt-flow.io.vn',
    'receipt': process.env.RECEIPT_URL || 'https://receipt-flow.io.vn',
  };

  const baseUrl = productUrls[productId] || process.env.BASE_URL;
  return `${baseUrl}/auth/sso-callback?token=${accessToken}`;
}

module.exports = router;