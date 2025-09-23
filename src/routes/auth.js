const express = require('express');
const { requiresAuth } = require('express-openid-connect');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

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
    
    logger.info('User authenticated successfullyy', {
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
    
    // Set token as HTTP-only cookie with domain configuration for cross-subdomain sharing
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: '.receipt-flow.io.vn',
    };
    
    res.cookie('access_token', accessToken, cookieOptions);

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
    logger.error('Auth callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication callback failed',
    });
  }
});

/**
 * GET /auth/logout
 * Logout user and clear session
 */
router.get('/logout', (req, res) => {
  const returnTo = req.query.returnTo || process.env.BASE_URL;
  
  // Clear all possible cookies with proper domain configuration
  const clearCookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };
  
  if (process.env.NODE_ENV === 'production') {
    clearCookieOptions.domain = '.receipt-flow.io.vn';
  }
  
  // Clear access token cookie
  res.clearCookie('access_token', clearCookieOptions);
  
  // Clear other possible cookies
  res.clearCookie('sso_token', clearCookieOptions);
  
  // Clear Auth0 session cookies (without domain for Auth0)
  const auth0CookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };
  
  res.clearCookie('appSession', auth0CookieOptions);
  res.clearCookie('appSession.0', auth0CookieOptions);
  res.clearCookie('appSession.1', auth0CookieOptions);
  
  // Clear session if it exists
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error:', err);
      }
    });
  }
  
  // Log user out
  logger.info('User logged out', {
    userId: req.oidc.user?.sub,
    email: req.oidc.user?.email,
  });

  // Use Auth0 logout
  res.oidc.logout({
    returnTo,
  });
});

/**
 * GET /auth/global-logout
 * Global logout that clears all cookies and sessions across all subdomains
 */
router.get('/global-logout', (req, res) => {
  const returnTo = req.query.returnTo || process.env.BASE_URL;
  
  // Clear all cookies for all possible domains
  const domains = ['.receipt-flow.io.vn', 'localhost'];
  const cookieNames = ['access_token', 'sso_token', 'appSession', 'appSession.0', 'appSession.1'];
  
  domains.forEach(domain => {
    cookieNames.forEach(cookieName => {
      const clearOptions = {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      };
      
      if (domain !== 'localhost') {
        clearOptions.domain = domain;
      }
      
      res.clearCookie(cookieName, clearOptions);
    });
  });
  
  // Clear session
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error:', err);
      }
    });
  }
  
  logger.info('Global logout performed', {
    userId: req.oidc.user?.sub,
    email: req.oidc.user?.email,
  });

  // Redirect to Auth0 logout
  if (req.oidc.isAuthenticated()) {
    res.oidc.logout({
      returnTo,
    });
  } else {
    res.redirect(returnTo);
  }
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
    logger.error('Token generation error:', error);
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
