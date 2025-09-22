const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const logger = require('../utils/logger');

// JWKS client for Auth0
const jwksClient = new jwksRsa.JwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  requestHeaders: {}, // Optional
  timeout: 30000, // Defaults to 30s
});

// Function to get the signing key
const getSigningKey = (kid) => {
  return new Promise((resolve, reject) => {
    jwksClient.getSigningKey(kid, (err, key) => {
      if (err) {
        logger.error('Error getting signing key:', err);
        return reject(err);
      }
      const signingKey = key.getPublicKey() || key.rsaPublicKey;
      resolve(signingKey);
    });
  });
};

/**
 * Middleware to verify JWT tokens from Auth0
 */
const verifyAuth0Token = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required',
      });
    }

    // Decode token to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    // Get signing key
    const signingKey = await getSigningKey(decoded.header.kid);

    // Verify token
    const payload = jwt.verify(token, signingKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
    });

    req.user = payload;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Token verification failed',
    });
  }
};

/**
 * Middleware to verify custom JWT tokens (for internal use)
 */
const verifyCustomToken = (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required',
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add product-specific validation
    if (payload.productId === 'pluriell') {
      // Validate that the token has the required Pluriell fields
      if (!payload.sub || !payload.email) {
        logger.error('Invalid Pluriell token structure');
        return res.status(401).json({
          success: false,
          error: 'Invalid token structure for Pluriell',
        });
      }
    }
    
    req.user = payload;
    next();
  } catch (error) {
    logger.error('Custom token verification failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};

/**
 * Middleware to check if user is authenticated via session or token
 */
const requireAuth = (req, res, next) => {
  // Check if user is authenticated via Auth0 session
  if (req.oidc && req.oidc.isAuthenticated()) {
    return next();
  }

  // Check for JWT token
  const token = extractToken(req);
  if (token) {
    return verifyAuth0Token(req, res, next);
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required',
  });
};

// Note: Role and permission checks have been removed for simplicity
// In a production environment, you would want to implement proper authorization

/**
 * Extract token from request headers or query parameters
 */
function extractToken(req) {
  let token = null;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }
  // Check query parameter
  else if (req.query && req.query.token) {
    token = req.query.token;
  }
  // Check cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  return token;
}

/**
 * Generate custom JWT token
 */
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    issuer: 'sso-gateway',
  });
};

module.exports = {
  verifyAuth0Token,
  verifyCustomToken,
  requireAuth,
  generateToken,
  extractToken,
};
