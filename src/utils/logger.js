const winston = require('winston');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance optimized for serverless
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'sso-gateway',
    platform: 'vercel'
  },
  transports: [
    // Console transport for Vercel (logs are captured by platform)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// In serverless environments, we primarily use console logging
// Vercel captures console output for monitoring

module.exports = logger;
