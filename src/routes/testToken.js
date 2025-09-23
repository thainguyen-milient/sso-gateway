/**
 * Test Token Route
 * This route provides test tokens for debugging JWT verification issues
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Test token endpoint - for debugging only
router.get('/test-token', (req, res) => {
  // Generate a test token
  const token = jwt.sign(
    { 
      sub: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      productId: 'pluriell'
    }, 
    process.env.JWT_SECRET,
    { 
      expiresIn: '1h',
      issuer: 'sso-gateway-test'
    }
  );
  
  res.json({ 
    token,
    message: 'This is a test token for debugging purposes',
    jwt_secret_preview: process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 5) + '...' : 'not set',
    node_env: process.env.NODE_ENV || 'not set'
  });
});

// Test token verification endpoint
router.post('/verify-token', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'No token provided'
    });
  }
  
  try {
    // Decode without verification
    const decoded = jwt.decode(token, { complete: true });
    
    // Try to verify
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      
      res.json({
        success: true,
        message: 'Token is valid',
        decoded: {
          header: decoded.header,
          payload: {
            sub: verified.sub,
            email: verified.email,
            name: verified.name,
            iss: verified.iss,
            iat: new Date(verified.iat * 1000).toISOString(),
            exp: new Date(verified.exp * 1000).toISOString(),
            productId: verified.productId
          }
        }
      });
    } catch (verifyError) {
      res.status(401).json({
        success: false,
        message: 'Token verification failed',
        error: verifyError.message,
        decoded: decoded ? {
          header: decoded.header,
          payload: {
            sub: decoded.payload.sub,
            email: decoded.payload.email,
            iss: decoded.payload.iss,
            iat: decoded.payload.iat ? new Date(decoded.payload.iat * 1000).toISOString() : null,
            exp: decoded.payload.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null
          }
        } : null
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid token format',
      error: error.message
    });
  }
});

module.exports = router;
