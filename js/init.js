// Application Initialization
(function() {
    'use strict';
    
    // Check browser compatibility
    function checkBrowserSupport() {
        const requiredFeatures = [
            'fetch',
            'Promise',
            'localStorage',
            'addEventListener'
        ];
        
        const unsupported = requiredFeatures.filter(feature => !(feature in window));
        
        if (unsupported.length > 0) {
            document.body.innerHTML = `
                <div style="padding: 2rem; text-align: center; background: #000; color: #fff; font-family: Arial, sans-serif;">
                    <h1>Browser Not Supported</h1>
                    <p>Your browser doesn't support some required features: ${unsupported.join(', ')}</p>
                    <p>Please update your browser or use a modern browser like Chrome, Firefox, or Safari.</p>
                </div>
            `;
            return false;
        }
        
        return true;
    }
    
    // Initialize application
    function initializeApp() {
        console.log('Initializing MovieRec application...');
        
        // Set up global error handling
        if (window.debugManager) {
            console.log('Debug manager initialized');
        }
        
        // Initialize API with token if available
        const token = localStorage.getItem('token');
        if (token) {
            api.setToken(token);
            console.log('API token restored from storage');
        }
        
        // Initialize auth manager
        if (window.auth) {
            console.log('Auth manager initialized');
        }
        
        // Initialize UI components
        if (window.ui) {
            console.log('UI components initialized');
        }
        
        // Set up service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered successfully');
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
        
        // Set up PWA install prompt
        setupPWAInstall();
        
        // Initialize page-specific functionality
        initializePageSpecific();
        
        console.log('MovieRec application initialized successfully');
    }
    
    function setupPWAInstall() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button
            const installButton = document.getElementById('installButton');
            if (installButton) {
                installButton.style.display = 'block';
                installButton.addEventListener('click', () => {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                        }
                        deferredPrompt = null;
                    });
                });
            }
        });
    }
    
    function initializePageSpecific() {
        const path = window.location.pathname;
        
        if (path.includes('dashboard.html')) {
            // Dashboard-specific initialization
            if (window.DashboardManager) {
                console.log('Dashboard page detected');
            }
        } else if (path.includes('movie-detail.html')) {
            // Movie detail-specific initialization
            if (window.MovieDetailManager) {
                console.log('Movie detail page detected');
            }
        } else if (path.includes('login.html')) {
            // Login page-specific initialization
            console.log('Login page detected');
            
            // Auto-focus first input
            const firstInput = document.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }
    
    // Performance monitoring
    function setupPerformanceMonitoring() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    const loadTime = perfData.loadEventEnd - perfData.fetchStart;
                    
                    console.log(`Page load time: ${loadTime}ms`);
                    
                    if (loadTime > 3000) {
                        console.warn('Slow page load detected');
                    }
                    
                    // Track Core Web Vitals
                    if ('web-vitals' in window) {
                        // This would require the web-vitals library
                        // getCLS(console.log);
                        // getFID(console.log);
                        // getLCP(console.log);
                    }
                }, 0);
            });
        }
    }
    
    // Network status monitoring
    function setupNetworkMonitoring() {
        function updateNetworkStatus() {
            const isOnline = navigator.onLine;
            document.body.classList.toggle('offline', !isOnline);
            
            if (!isOnline && window.showToast) {
                showToast('You are offline. Some features may be limited.', 'warning');
            }
        }
        
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        
        // Initial check
        updateNetworkStatus();
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (checkBrowserSupport()) {
                initializeApp();
                setupPerformanceMonitoring();
                setupNetworkMonitoring();
            }
        });
    } else {
        if (checkBrowserSupport()) {
            initializeApp();
            setupPerformanceMonitoring();
            setupNetworkMonitoring();
        }
    }
    
})();