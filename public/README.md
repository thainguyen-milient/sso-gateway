# SSO Gateway Landing Page

This directory contains the landing page for the SSO Gateway. The landing page displays a login button initially, and after authentication via Auth0, it shows all products the logged-in user has access to.

## Structure

- `index.html` - The main HTML file for the landing page
- `css/styles.css` - Styling for the landing page
- `js/app.js` - JavaScript code for handling authentication and product display
- `images/` - Directory for product images

## Product Images

You should add the following images to the `images/` directory:

- `receipt-flow.png` - Image for the Receipt Flow product
- `knowledge-portal.png` - Image for the Knowledge Portal product
- `hub-planner.png` - Image for the Hub Planner product
- `default-product.png` - Default image for products without a specific image

## How It Works

1. The landing page checks if the user is authenticated by calling the `/auth/status` endpoint
2. If the user is not authenticated, it displays a login button
3. When the user clicks the login button, they are redirected to Auth0 for authentication
4. After successful authentication, the user is redirected back to the landing page
5. The landing page then fetches the user's products from the `/user/products` endpoint
6. The products are displayed as cards with images, names, descriptions, and login buttons

## Customization

You can customize the landing page by:

1. Modifying the CSS in `css/styles.css`
2. Adding or changing product images in the `images/` directory
3. Updating the product names and descriptions in `js/app.js`
