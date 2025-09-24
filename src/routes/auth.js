const express = require('express');
const jwt = require('jsonwebtoken');
const { requiresAuth } = require('@auth0/express-openid-connect');
const logger = require('../utils/logger');
const crypto = require('crypto');
const axios = require('axios');
const { generateToken } = require('../middleware/auth');

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
    
    // Set token as HTTP-only cookie with enhanced cross-subdomain sharing
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    };
    
    // Set domain for cross-subdomain sharing in production
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.domain = '.receipt-flow.io.vn';
    }
    
    res.cookie('access_token', accessToken, cookieOptions);

    // Store user data in session for cross-subdomain sharing
    if (req.session) {
      req.session.user = tokenPayload;
      req.session.accessToken = accessToken;
      req.session.authenticated = true;
      req.session.loginTime = new Date().toISOString();
      
      // Clear temporary session data
      delete req.session.productId;
      delete req.session.returnTo;
    }

    // Implement back-channel handoff for sub-products
    if (productId) {
      try {
        const handoffResult = await performBackChannelHandoff(productId, tokenPayload, returnTo);
        if (handoffResult.success) {
          // Redirect to sub-product with one-time code
          return res.redirect(handoffResult.redirectUrl);
        } else {
          logger.error('Back-channel handoff failed:', handoffResult.error);
          return res.redirect(`${returnTo}?error=handoff_failed`);
        }
      } catch (error) {
        logger.error('Back-channel handoff error:', error);
        return res.redirect(`${returnTo}?error=handoff_error`);
      }
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
    secure: true,
    sameSite: 'None',
    domain: '.receipt-flow.io.vn'
  };
  // Clear access token cookie
  res.clearCookie('access_token', clearCookieOptions);
  
  // Clear other possible cookies
  res.clearCookie('sso_token', clearCookieOptions);
  
  // Clear Auth0 session cookies (without domain for Auth0)
  const auth0CookieOptions = {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    domain: '.receipt-flow.io.vn'
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
        secure: true,
        sameSite: 'None',
        domain: '.receipt-flow.io.vn'
      };
      
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
 * GET /auth/session
 * Get current user session data for cross-subdomain sharing
 */
router.get('/session', (req, res) => {
  try {
    // Check if user is authenticated via Auth0 session
    if (req.oidc.isAuthenticated()) {
      const user = req.oidc.user;
      
      // Generate or retrieve token
      let accessToken = req.session?.accessToken;
      if (!accessToken) {
        const tokenPayload = {
          sub: user.sub,
          email: user.email,
          name: user.name,
          picture: user.picture,
          roles: user['https://sso-gateway.com/roles'] || [],
          permissions: user['https://sso-gateway.com/permissions'] || [],
        };
        accessToken = generateToken(tokenPayload);
        
        if (req.session) {
          req.session.accessToken = accessToken;
          req.session.user = tokenPayload;
        }
      }
      
      return res.json({
        success: true,
        authenticated: true,
        user: req.session?.user || {
          sub: user.sub,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
        accessToken,
        sessionId: req.sessionID,
        loginTime: req.session?.loginTime,
      });
    }
    
    // Check if user has session data but no Auth0 session
    if (req.session && req.session.authenticated && req.session.user) {
      return res.json({
        success: true,
        authenticated: true,
        user: req.session.user,
        accessToken: req.session.accessToken,
        sessionId: req.sessionID,
        loginTime: req.session.loginTime,
      });
    }
    
    res.json({
      success: true,
      authenticated: false,
      user: null,
    });
  } catch (error) {
    logger.error('Session retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Session retrieval failed',
    });
  }
});

/**
 * GET /auth/token-from-session
 * Get access token from session for sub-products
 */
router.get('/token-from-session', (req, res) => {
  try {
    // Check if user has active session with access token
    if (req.session && req.session.authenticated && req.session.accessToken) {
      return res.json({
        success: true,
        accessToken: req.session.accessToken,
        user: req.session.user,
        sessionId: req.sessionID,
        loginTime: req.session.loginTime,
      });
    }
    
    // Check if user is authenticated via Auth0 but no session token
    if (req.oidc.isAuthenticated()) {
      const user = req.oidc.user;
      
      // Generate new token and store in session
      const tokenPayload = {
        sub: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        roles: user['https://sso-gateway.com/roles'] || [],
        permissions: user['https://sso-gateway.com/permissions'] || [],
      };
      
      const accessToken = generateToken(tokenPayload);
      
      // Store in session
      if (req.session) {
        req.session.user = tokenPayload;
        req.session.accessToken = accessToken;
        req.session.authenticated = true;
        req.session.loginTime = new Date().toISOString();
      }
      
      // Also set as cookie for direct access
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      };
      
      if (process.env.NODE_ENV === 'production') {
        cookieOptions.domain = '.receipt-flow.io.vn';
      }
      
      res.cookie('access_token', accessToken, cookieOptions);
      
      return res.json({
        success: true,
        accessToken,
        user: tokenPayload,
        sessionId: req.sessionID,
        loginTime: req.session.loginTime,
      });
    }
    
    res.status(401).json({
      success: false,
      error: 'No active session or authentication',
    });
  } catch (error) {
    logger.error('Token from session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve token from session',
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

/**
 * Back-channel handoff implementation
 * Securely transfers authentication to sub-products without exposing tokens to browser
 */
async function performBackChannelHandoff(productId, userPayload, returnTo) {
  try {
    // Get product configuration
    const productConfig = getProductConfig(productId);
    if (!productConfig) {
      throw new Error(`Unknown product: ${productId}`);
    }

    // Generate a short-lived, product-specific token
    const productToken = generateProductToken(userPayload, productConfig);
    
    // Generate one-time code for browser redirect
    const oneTimeCode = crypto.randomBytes(32).toString('hex');
    
    // Create JWS (JSON Web Signature) for server-to-server communication
    const jws = createJWS({
      token: productToken,
      user: userPayload,
      code: oneTimeCode,
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      iss: 'sso-gateway',
      aud: productConfig.audience
    });

    // Make server-to-server call to product's session endpoint
    const sessionResponse = await axios.post(`${productConfig.baseUrl}/api/sessions`, {
      jws: jws,
      user: userPayload,
      code: oneTimeCode
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SSO_GATEWAY_SECRET}`,
        'X-SSO-Gateway': 'true'
      },
      timeout: 5000 // 5 second timeout
    });

    if (sessionResponse.status === 200 && sessionResponse.data.success) {
      // Success - redirect browser to product with one-time code
      const redirectUrl = `${productConfig.baseUrl}/auth/callback?code=${oneTimeCode}`;
      
      logger.info('Back-channel handoff successful', {
        productId,
        userId: userPayload.sub,
        redirectUrl
      });

      return {
        success: true,
        redirectUrl
      };
    } else {
      throw new Error(`Product session creation failed: ${sessionResponse.status}`);
    }

  } catch (error) {
    logger.error('Back-channel handoff failed', {
      productId,
      userId: userPayload.sub,
      error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get product configuration for back-channel handoff
 */
function getProductConfig(productId) {
  const configs = {
    'pluriell': {
      baseUrl: process.env.NODE_ENV === 'production' 
        ? 'https://pluriell.receipt-flow.io.vn' 
        : 'http://localhost:3002',
      audience: 'pluriell-api'
    },
    'receipt': {
      baseUrl: process.env.NODE_ENV === 'production' 
        ? 'https://receipt.receipt-flow.io.vn' 
        : 'http://localhost:3001',
      audience: 'receipt-api'
    }
  };

  return configs[productId];
}

/**
 * Generate product-specific JWT token
 */
function generateProductToken(userPayload, productConfig) {
  return jwt.sign({
    ...userPayload,
    aud: productConfig.audience,
    iss: 'sso-gateway'
  }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
}

/**
 * Create JWS (JSON Web Signature) for secure server-to-server communication
 */
function createJWS(payload) {
  return jwt.sign(payload, process.env.SSO_GATEWAY_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
}

module.exports = router;
