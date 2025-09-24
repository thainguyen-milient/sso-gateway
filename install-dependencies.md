# Install Missing Dependencies

The SSO Gateway is missing the `express-openid-connect` package and some other dependencies for the back-channel handoff implementation.

## Run this command to install all dependencies:

```bash
cd SSO-Gateway
npm install
```

## If you need to install specific missing packages:

```bash
npm install express-openid-connect@^2.17.1
npm install connect-mongo@^5.1.0
```

## Verify installation:

```bash
npm list express-openid-connect
npm list connect-mongo
```

## For Vercel deployment:

Make sure to run `npm install` before deploying to ensure all dependencies are included in the deployment package.

## Alternative: Manual package.json update

If npm install doesn't work, you can manually verify that your `package.json` includes:

```json
{
  "dependencies": {
    "express-openid-connect": "^2.17.1",
    "connect-mongo": "^5.1.0",
    // ... other dependencies
  }
}
```

Then run `npm install` to install the new dependencies.
