document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const welcomeSection = document.getElementById('welcomeSection');
    const productsContainer = document.getElementById('productsContainer');
    const userInfo = document.getElementById('userInfo');

    // Base URL for API calls
    const API_BASE_URL = window.location.origin;

    // Check if user is already authenticated
    checkAuthStatus();

    // Login button event listener
    loginBtn.addEventListener('click', () => {
        window.location.href = `${API_BASE_URL}/auth/login?returnTo=${encodeURIComponent(window.location.href)}`;
    });

    // Function to check authentication status
    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/status`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.authenticated) {
                // User is authenticated
                showUserInfo(data.user);
                fetchUserProducts();
            } else {
                // User is not authenticated
                showLoginView();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            showLoginView();
        }
    }

    // Function to show user info
    function showUserInfo(user) {
        userInfo.innerHTML = `
            <div class="user-details">
                ${user.picture ? `<img src="${user.picture}" alt="${user.name}" class="user-avatar">` : ''}
                <span>Welcome, ${user.name || user.email}</span>
            </div>
            <button id="logoutBtn" class="btn btn-outline">Log Out</button>
        `;

        // Add logout button event listener
        document.getElementById('logoutBtn').addEventListener('click', () => {
            // Use global logout for better cross-domain logout
            window.location.href = `${API_BASE_URL}/auth/global-logout?returnTo=${encodeURIComponent(window.location.href)}`;
        });
    }

    // Function to show login view
    function showLoginView() {
        welcomeSection.style.display = 'block';
        productsContainer.style.display = 'none';
        userInfo.innerHTML = '';
    }

    // Function to fetch user products
    async function fetchUserProducts() {
        try {
            // Show loading spinner
            productsContainer.innerHTML = '<div class="spinner"></div>';
            productsContainer.style.display = 'block';
            welcomeSection.style.display = 'none';

            const response = await fetch(`${API_BASE_URL}/user/products`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success && data.products && data.products.length > 0) {
                displayProducts(data.products);
            } else {
                productsContainer.innerHTML = `
                    <div class="no-products">
                        <h3>No products available</h3>
                        <p>You don't have access to any products yet.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error fetching user products:', error);
            productsContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error loading products</h3>
                    <p>There was an error loading your products. Please try again later.</p>
                </div>
            `;
        }
    }

    // Function to display products
    function displayProducts(products) {
        productsContainer.innerHTML = '';
        
        // Product images (placeholders)
        const productImages = {
            'product1': 'https://www.milientsoftware.com/hs-fs/hubfs/Images/Pictures%20of%20the%20systems/Moment%20system/resurs_planering_moment.png?width=800&height=430&name=resurs_planering_moment.png',
            'product2': 'https://www.milientsoftware.com/hs-fs/hubfs/Flo10/Product%20Images/Flo10%20Homepage.png?width=800&height=430&name=Flo10%20Homepage.png',
            'product3': 'https://www.milientsoftware.com/hs-fs/hubfs/Product%20images/Millnet%20systems/timereporting_tfs_en-small.png?width=800&height=430&name=timereporting_tfs_en-small.png',
            'default': 'https://www.milientsoftware.com/hs-fs/hubfs/Pluriell/Pluriell_system-1.png?width=495&height=300&name=Pluriell_system-1.png',
            'receipt': 'https://www.milientsoftware.com/hs-fs/hubfs/Pluriell/Pluriell_system-1.png?width=495&height=300&name=Pluriell_system-1.png'
        };

        // Product names (prettier display names)
        const productNames = {
            'product1': 'Receipt Flow',
            'product2': 'Knowledge Portal',
            'product3': 'Hub Planner',
            'pluriell': 'Pluriell',
            'receipt': 'Receipt Flow',
        };

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            const imageSrc = productImages[product.id] || productImages.default;
            const displayName = productNames[product.id] || product.name;
            
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${imageSrc}" alt="${displayName}">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${displayName}</h3>
                    <p class="product-description">${product.description || 'Access this product with your current credentials.'}</p>
                    <div class="product-actions">
                        <a href="${product.url}" class="btn btn-primary">Log in to ${displayName}</a>
                    </div>
                </div>
            `;
            
            productsContainer.appendChild(productCard);
        });
        
        // Show the products container
        productsContainer.style.display = 'grid';
    }
});
