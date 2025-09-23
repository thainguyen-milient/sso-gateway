#!/usr/bin/env node

/**
 * This script helps generate secure secrets for Vercel deployment
 * and outputs environment variables in a format that can be copied
 * directly to the Vercel dashboard.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Generate a secure random string
function generateSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Main function
async function main() {
  console.log('\n=== Vercel Environment Variables Setup ===\n');
  
  // Generate secrets
  const sessionSecret = generateSecret();
  const jwtSecret = generateSecret();
  
  // Ask for Auth0 and application details
  console.log('Please provide your Auth0 and application details:');
  
  const auth0Domain = await question('Auth0 Domain (e.g., your-tenant.auth0.com): ');
  const auth0ClientId = await question('Auth0 Client ID: ');
  const auth0ClientSecret = await question('Auth0 Client Secret: ');
  const auth0Audience = await question('Auth0 API Identifier (default: https://sso-gateway.api): ') || 'https://sso-gateway.api';
  const baseUrl = await question('Vercel Deployment URL (e.g., https://your-project.vercel.app): ');
  const allowedOrigins = await question('Allowed Origins (comma-separated, default: Vercel URL): ') || baseUrl;
  
  // Create environment variables object
  const envVars = {
    // Required variables
    AUTH0_DOMAIN: auth0Domain,
    AUTH0_CLIENT_ID: auth0ClientId,
    AUTH0_CLIENT_SECRET: auth0ClientSecret,
    AUTH0_AUDIENCE: auth0Audience,
    BASE_URL: baseUrl,
    SESSION_SECRET: sessionSecret,
    JWT_SECRET: jwtSecret,
    NODE_ENV: 'development', // or 'production'
    
    // Optional variables
    ALLOWED_ORIGINS: allowedOrigins,
    LOG_LEVEL: 'info',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '200',
    JWT_EXPIRES_IN: '24h'
  };
  
  // Ask for product URLs
  const includeProducts = await question('Do you want to add product URLs? (y/n): ');
  
  if (includeProducts.toLowerCase() === 'y') {
    envVars.PRODUCT1_URL = await question('Product 1 URL: ');
    envVars.PRODUCT2_URL = await question('Product 2 URL: ');
    envVars.PRODUCT3_URL = await question('Product 3 URL: ');
  }
  
  // Output results
  console.log('\n=== Environment Variables for Vercel ===\n');
  
  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      console.log(`${key}=${value}`);
    }
  }
  
  // Save to file
  const saveToFile = await question('\nDo you want to save these variables to a file? (y/n): ');
  
  if (saveToFile.toLowerCase() === 'y') {
    const filePath = path.join(process.cwd(), '.env.vercel.production');
    let fileContent = '';
    
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        fileContent += `${key}=${value}\n`;
      }
    }
    
    fs.writeFileSync(filePath, fileContent);
    console.log(`\nEnvironment variables saved to ${filePath}`);
    console.log('NOTE: This file contains secrets and should not be committed to your repository.');
  }
  
  console.log('\n=== Auth0 Configuration Updates ===\n');
  console.log('Update your Auth0 application with these settings:');
  console.log(`\nAllowed Callback URLs:\n${baseUrl}/auth/callback`);
  console.log(`\nAllowed Logout URLs:\n${baseUrl}`);
  console.log(`\nAllowed Web Origins:\n${baseUrl}`);
  console.log(`\nAllowed Origins (CORS):\n${baseUrl}`);
  
  rl.close();
}

// Helper function to prompt for input
function question(query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
