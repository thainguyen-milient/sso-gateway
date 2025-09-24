# Package Name Correction Fix

## Issue
The npm install was failing with:
```
npm error 404 Not Found - GET https://registry.npmjs.org/@auth0%2fexpress-openid-connect - Not found
npm error 404 '@auth0/express-openid-connect@^2.17.1' is not in this registry.
```

## Root Cause
The package name was incorrect. The Auth0 Express OpenID Connect package is called `express-openid-connect`, not `@auth0/express-openid-connect`.

## Fix Applied

### 1. Updated package.json
**Before:**
```json
"@auth0/express-openid-connect": "^2.17.1"
```

**After:**
```json
"express-openid-connect": "^2.17.1"
```

### 2. Updated import statement in auth.js
**Before:**
```javascript
const { requiresAuth } = require('@auth0/express-openid-connect');
```

**After:**
```javascript
const { requiresAuth } = require('express-openid-connect');
```

### 3. Updated documentation
- Fixed install-dependencies.md to reference correct package name
- Updated all examples and commands

## Verification
Now you can successfully run:
```bash
cd SSO-Gateway
npm install
```

## Package Information
- **Correct Package Name**: `express-openid-connect`
- **Version**: ^2.17.1
- **NPM Registry**: https://www.npmjs.com/package/express-openid-connect
- **GitHub**: https://github.com/auth0/express-openid-connect

## Note
This is the official Auth0 package for Express.js OpenID Connect integration. The confusion may have arisen from other Auth0 packages that do use the `@auth0/` namespace, but this particular package does not.
