const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { auth } = require('express-openid-connect');
require('dotenv').config();

const logger = require('./src/utils/logger');
const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');
const userRoutes = require('./src/routes/user');
const { errorHandler } = require('./src/middleware/errorHandler');
const { requestLogger } = require('./src/middleware/requestLogger');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.auth0.com"],
    },
  },
}));

// Compression middleware
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const defaultOrigins = process.env.NODE_ENV === 'production' 
      ? ['https://sso.receipt-flow.io.vn', 'https://pluriell.receipt-flow.io.vn', 'https://receipt.receipt-flow.io.vn']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || defaultOrigins;
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session middleware
const session = require('express-session');
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// In production, set domain for cross-subdomain session sharing
if (process.env.NODE_ENV === 'production') {
  sessionConfig.cookie.domain = '.receipt-flow.io.vn';
}

app.use(session(sessionConfig));

// Serve static files from the public directory
app.use(express.static('public'));

// Request logging
app.use(requestLogger);

// Auth0 configuration - simplified
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SESSION_SECRET || 'a-long-random-string',
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email',
  },
  session: {
    rollingDuration: 24 * 60 * 60, // 24 hours
  },
};

// Auth0 middleware
app.use(auth(config));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    platform: 'express',
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/user', userRoutes);

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'SSO Gateway API - Express Server',
    version: '1.0.0',
    platform: 'express',
    authenticated: req.oidc.isAuthenticated(),
    user: req.oidc.isAuthenticated() ? req.oidc.user : null,
  });
});

// Root endpoint serves the landing page
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found on this server.',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`SSO Gateway server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Base URL: ${process.env.BASE_URL}`);
  logger.info(`Platform: Express (Traditional Server)`);
});

module.exports = app;
