#!/usr/bin/env node

const crypto = require('crypto');

/**
 * Generate secure random secrets for the SSO Gateway
 */
function generateSecrets() {
  console.log('🔐 Generating secure secrets for SSO Gateway...\n');

  const sessionSecret = crypto.randomBytes(64).toString('hex');
  const jwtSecret = crypto.randomBytes(64).toString('hex');

  console.log('Copy these values to your .env file:\n');
  console.log('SESSION_SECRET=' + sessionSecret);
  console.log('JWT_SECRET=' + jwtSecret);
  console.log('\n⚠️  Keep these secrets secure and never commit them to version control!');
  console.log('💡 Use different secrets for development, staging, and production environments.');
}

if (require.main === module) {
  generateSecrets();
}

module.exports = { generateSecrets };
