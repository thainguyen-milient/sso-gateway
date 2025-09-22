#!/usr/bin/env node

const http = require('http');

/**
 * Health check script for monitoring and deployment
 */
function healthCheck() {
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || 'localhost';
  
  const options = {
    hostname: host,
    port: port,
    path: '/health',
    method: 'GET',
    timeout: 5000,
  };

  console.log(`🏥 Checking health of SSO Gateway at ${host}:${port}...`);

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (res.statusCode === 200 && response.status === 'healthy') {
          console.log('✅ SSO Gateway is healthy');
          console.log(`   Status: ${response.status}`);
          console.log(`   Uptime: ${Math.floor(response.uptime)}s`);
          console.log(`   Environment: ${response.environment}`);
          process.exit(0);
        } else {
          console.error('❌ SSO Gateway is unhealthy');
          console.error(`   Status Code: ${res.statusCode}`);
          console.error(`   Response: ${data}`);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Invalid health check response');
        console.error(`   Error: ${error.message}`);
        console.error(`   Response: ${data}`);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Health check failed');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Health check timed out');
    req.destroy();
    process.exit(1);
  });

  req.end();
}

if (require.main === module) {
  healthCheck();
}

module.exports = { healthCheck };
