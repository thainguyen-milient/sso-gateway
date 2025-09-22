// Test setup file
require('dotenv').config({ path: '.env.test' });

// Mock Auth0 for testing
jest.mock('express-openid-connect', () => ({
  auth: () => (req, res, next) => {
    req.oidc = {
      isAuthenticated: () => false,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
    };
    next();
  },
  requiresAuth: () => (req, res, next) => {
    if (!req.oidc.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  },
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  })),
}));

// Mock Winston logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH0_DOMAIN = 'test.auth0.com';
process.env.AUTH0_CLIENT_ID = 'test-client-id';
process.env.AUTH0_CLIENT_SECRET = 'test-client-secret';
process.env.AUTH0_AUDIENCE = 'test-audience';
process.env.BASE_URL = 'http://localhost:3000';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3001';

// Global test timeout
jest.setTimeout(10000);
