const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

/**
 * Validation rules for user profile update
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .trim(),
  body('picture')
    .optional()
    .isURL()
    .withMessage('Picture must be a valid URL'),
  handleValidationErrors,
];

/**
 * Validation rules for token request
 */
const validateTokenRequest = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isJWT()
    .withMessage('Token must be a valid JWT'),
  handleValidationErrors,
];

/**
 * Validation rules for product ID
 */
const validateProductId = [
  param('productId')
    .isIn(['product1', 'product2', 'product3'])
    .withMessage('Invalid product ID'),
  handleValidationErrors,
];

/**
 * Validation rules for login request
 */
const validateLoginRequest = [
  query('productId')
    .optional()
    .isIn(['product1', 'product2', 'product3'])
    .withMessage('Invalid product ID'),
  query('returnTo')
    .optional()
    .isURL({ require_protocol: true })
    .withMessage('Return URL must be a valid URL'),
  handleValidationErrors,
];

/**
 * Validation rules for webhook
 */
const validateWebhook = [
  body('event')
    .notEmpty()
    .withMessage('Event type is required')
    .isIn(['user.created', 'user.updated', 'user.deleted', 'login.success', 'login.failed'])
    .withMessage('Invalid event type'),
  body('user')
    .notEmpty()
    .withMessage('User data is required')
    .isObject()
    .withMessage('User must be an object'),
  body('user.user_id')
    .notEmpty()
    .withMessage('User ID is required'),
  handleValidationErrors,
];

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate JWT token format (basic check)
 */
const isValidJWT = (token) => {
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  return jwtRegex.test(token);
};

/**
 * Validate product access permissions
 */
const validateProductAccess = (userRoles, userPermissions, productId) => {
  const requiredRole = `${productId}_user`;
  const requiredPermission = `${productId}:read`;
  const adminRoles = ['admin', 'super_admin'];
  
  // Check if user has admin role
  if (adminRoles.some(role => userRoles.includes(role))) {
    return true;
  }
  
  // Check if user has product-specific role
  if (userRoles.includes(requiredRole)) {
    return true;
  }
  
  // Check if user has product-specific permission
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  return false;
};

/**
 * Rate limiting key generator
 */
const generateRateLimitKey = (req) => {
  // Use IP address and user ID if available
  const ip = req.ip || req.connection.remoteAddress;
  const userId = req.user?.sub || req.oidc?.user?.sub;
  
  return userId ? `${ip}:${userId}` : ip;
};

module.exports = {
  handleValidationErrors,
  validateProfileUpdate,
  validateTokenRequest,
  validateProductId,
  validateLoginRequest,
  validateWebhook,
  sanitizeInput,
  isValidEmail,
  isValidUrl,
  isValidJWT,
  validateProductAccess,
  generateRateLimitKey,
};
