#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

/**
 * Deployment script for SSO Gateway
 */
function deploy() {
  console.log('🚀 Starting SSO Gateway deployment...\n');

  // Check if vercel.json exists
  if (!fs.existsSync('vercel.json')) {
    console.error('❌ vercel.json not found. Make sure you\'re in the project root.');
    process.exit(1);
  }

  // Check if Vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('📦 Installing Vercel CLI...');
    try {
      execSync('npm install -g vercel', { stdio: 'inherit' });
    } catch (installError) {
      console.error('❌ Failed to install Vercel CLI');
      process.exit(1);
    }
  }

  // Check if user is logged in
  try {
    execSync('vercel whoami', { stdio: 'ignore' });
  } catch (error) {
    console.log('🔐 Please login to Vercel...');
    try {
      execSync('vercel login', { stdio: 'inherit' });
    } catch (loginError) {
      console.error('❌ Failed to login to Vercel');
      process.exit(1);
    }
  }

  // Deploy to production
  console.log('🌐 Deploying to Vercel...');
  try {
    execSync('vercel --prod', { stdio: 'inherit' });
    console.log('\n✅ Deployment successful!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure environment variables in Vercel dashboard');
    console.log('2. Update Auth0 callback URLs with your Vercel domain');
    console.log('3. Test your deployment');
  } catch (deployError) {
    console.error('❌ Deployment failed');
    process.exit(1);
  }
}

if (require.main === module) {
  deploy();
}

module.exports = { deploy };
