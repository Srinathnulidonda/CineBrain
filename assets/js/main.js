/**
 * Main Application Entry Point
 * Initializes the app, handles global events, and coordinates components
 */

class MovieFlixApp {
    constructor() {
        this.isInitialized = false;
        this.serviceWorker = null;
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    async init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
            } else {
                await this.initialize();
            }
        } catch (error) {
            console.error('App initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    async initialize() {
        console.log('🎬 MovieFlix App Initializing...');
        
        // Initialize core services
        await this.initializeServices();
        
        // Setup global event listeners
        this.setupGlobalEventListeners();
        
        // Initialize PWA features
        await this.initializePWA();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Initialize page-specific functionality
        await this.initializePageSpecific();
        
        // Setup offline functionality
        this.setupOfflineHandling();
        
        // Complete initialization
        this.completeInitialization();
        
        console.log('✅ MovieFlix App Initialized Successfully');
    }

    async initializeServices() {
        // Services are already initialized as singletons
        // Just ensure they're ready
        if (window.apiService) {
            console.log('✅ API Service Ready');
        }
        
        if (window.authService) {
            console.log('✅ Auth Service Ready');
        }
        
        if (window.storageService) {
            console.log('✅ Storage Service Ready');
        }
    }

    setupGlobalEventListeners() {
        // Handle navigation state changes
        window.addEventListener('popstate', (e) => {
            this.handleNavigationChange();
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            this.handleOnlineStatus(true);
        });

        window.addEventListener('offline', () => {
            this.handleOnlineStatus(false);
        });

        // Handle visibility changes (tab switching)
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Handle global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboard(e);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.reportError(e.reason);
        });

        // Handle JavaScript errors
        window.addEventListener('error', (e) => {
            console.error('JavaScript error:', e.error);
            this.reportError(e.error);
        });

        // Handle auth state changes
        document.addEventListener('authStateChanged', () => {
            this.handleAuthStateChange();
        });
    }

    async initializePWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                this.serviceWorker = registration;
                console.log('✅ Service Worker Registered');
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    this.handleServiceWorkerUpdate(registration);
                });
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }

        // Setup install prompt
        this.setupInstallPrompt();

        // Setup push notifications
        await this.setupPushNotifications();
    }

    setupInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPrompt(deferredPrompt);
        });

        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA Installed');
            this.hideInstallPrompt();
            this.trackEvent('pwa_installed');
        });
    }

    showInstallPrompt(deferredPrompt) {
        // Create install prompt UI
        const installBanner = document.createElement('div');
        installBanner.id = 'installPrompt';
        installBanner.className = 'alert alert-info m-3 d-flex align-items-center justify-content-between';
        installBanner.innerHTML = `
            <div>
                <i class="fas fa-download me-2"></i>
                <strong>Install MovieFlix</strong> for a better experience!
            </div>
            <div>
                <button class="btn btn-primary btn-sm me-2" id="installBtn">Install</button>
                <button class="btn btn-outline-secondary btn-sm" id="dismissInstall">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.insertBefore(installBanner, document.body.firstChild);

        document.getElementById('installBtn').addEventListener('click', async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            
            this.hideInstallPrompt();
        });

        document.getElementById('dismissInstall').addEventListener('click', () => {
            this.hideInstallPrompt();
        });
    }

    hideInstallPrompt() {
        const prompt = document.getElementById('installPrompt');
        if (prompt) {
            prompt.remove();
        }
    }

    async setupPushNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            // Request permission for notifications
            if (Notification.permission === 'default') {
                // Don't auto-request, let user opt-in
                this.createNotificationOptIn();
            }
        }
    }

    createNotificationOptIn() {
        // This would be shown in settings or profile page
        // Implementation depends on UX design
    }

    setupPerformanceMonitoring() {
        // Monitor Core Web Vitals
        if ('PerformanceObserver' in window) {
            try {
                // Largest Contentful Paint
                new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        console.log('LCP:', entry.startTime);
                        this.trackPerformance('lcp', entry.startTime);
                    }
                }).observe({ entryTypes: ['largest-contentful-paint'] });

                // First Input Delay
                new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        console.log('FID:', entry.processingStart - entry.startTime);
                        this.trackPerformance('fid', entry.processingStart - entry.startTime);
                    }
                }).observe({ entryTypes: ['first-input'] });

                // Cumulative Layout Shift
                new PerformanceObserver((entryList) => {
                    let cls = 0;
                    for (const entry of entryList.getEntries()) {
                        if (!entry.hadRecentInput) {
                            cls += entry.value;
                        }
                    }
                    console.log('CLS:', cls);
                    this.trackPerformance('cls', cls);
                }).observe({ entryTypes: ['layout-shift'] });
            } catch (error) {
                console.warn('Performance monitoring setup failed:', error);
            }
        }
    }

    async initializePageSpecific() {
        switch (this.currentPage) {
            case 'home':
                // Home page is initialized by home.js
                break;
            case 'search':
                await this.initializeSearchPage();
                break;
            case 'profile':
                await this.initializeProfilePage();
                break;
            case 'favorites':
                await this.initializeFavoritesPage();
                break;
            case 'login':
                await this.initializeLoginPage();
                break;
            case 'register':
                await this.initializeRegisterPage();
                break;
        }
    }

    async initializeSearchPage() {
        if (window.searchPage) {
            await window.searchPage.init();
        }
    }

    async initializeProfilePage() {
        if (window.profilePage) {
            await window.profilePage.init();
        }
    }

    async initializeFavoritesPage() {
        if (window.favoritesPage) {
            await window.favoritesPage.init();
        }
    }

    async initializeLoginPage() {
        // Login page initialization
        this.setupAuthForms();
    }

    async initializeRegisterPage() {
        // Register page initialization
        this.setupAuthForms();
    }

    setupAuthForms() {
        // Common form handling for auth pages
        const forms = document.querySelectorAll('form[data-auth-form]');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                this.handleAuthFormSubmit(e);
            });
        });
    }

    async handleAuthFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formType = form.dataset.authForm;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            let result;
            if (formType === 'login') {
                result = await authService.login(data);
            } else if (formType === 'register') {
                result = await authService.register(data);
            }

            if (result.success) {
                // Redirect to home page
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Auth form submission failed:', error);
        }
    }

    setupOfflineHandling() {
        // Cache important pages for offline use
        if (this.serviceWorker) {
            this.cacheImportantResources();
        }

        // Setup offline indicator
        this.createOfflineIndicator();
    }

    createOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offlineIndicator';
        indicator.className = 'alert alert-warning position-fixed top-0 start-50 translate-middle-x';
        indicator.style.cssText = `
            z-index: 9999;
            display: none;
            margin-top: 10px;
        `;
        indicator.innerHTML = `
            <i class="fas fa-wifi-slash me-2"></i>
            You're offline. Some features may not be available.
        `;
        
        document.body.appendChild(indicator);
    }

    handleOnlineStatus(isOnline) {
        const indicator = document.getElementById('offlineIndicator');
        if (!indicator) return;

        if (isOnline) {
            indicator.style.display = 'none';
            // Sync any pending data
            this.syncOfflineData();
        } else {
            indicator.style.display = 'block';
        }
    }

    async syncOfflineData() {
        // Sync any data that was stored while offline
        try {
            const pendingData = storageService.get('pending_sync');
            if (pendingData && Array.isArray(pendingData)) {
                for (const item of pendingData) {
                    await this.syncDataItem(item);
                }
                storageService.remove('pending_sync');
            }
        } catch (error) {
            console.error('Offline data sync failed:', error);
        }
    }

    async syncDataItem(item) {
        // Sync individual data items
        switch (item.type) {
            case 'interaction':
                await apiService.recordInteraction(item.contentId, item.interactionType, item.rating);
                break;
            // Add other sync types as needed
        }
    }

    handleNavigationChange() {
        this.currentPage = this.getCurrentPage();
        // Update active navigation states
        if (window.HeaderComponent) {
            window.HeaderComponent.setActiveNav();
        }
        if (window.BottomNavComponent) {
            window.BottomNavComponent.setActivePage();
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Page became hidden
            this.trackEvent('page_hidden');
        } else {
            // Page became visible
            this.trackEvent('page_visible');
        }
    }

    handleGlobalKeyboard(e) {
        // Global keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'k':
                    e.preventDefault();
                    this.focusSearch();
                    break;
                case '/':
                    e.preventDefault();
                    this.focusSearch();
                    break;
            }
        }

        // Escape key handling
        if (e.key === 'Escape') {
            this.handleEscapeKey();
        }
    }

    focusSearch() {
        const searchInput = document.getElementById('headerSearch');
        if (searchInput) {
            searchInput.focus();
        }
    }

    handleEscapeKey() {
        // Close any open modals or dropdowns
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }

    handleAuthStateChange() {
        // Update UI components
        if (window.HeaderComponent) {
            window.HeaderComponent.updateAuthState();
        }
        if (window.BottomNavComponent) {
            window.BottomNavComponent.updateAuthState();
        }

        // Reload personalized content if on home page
        if (this.currentPage === 'home' && window.homePage) {
            window.homePage.loadPersonalizedContent();
        }
    }

    handleServiceWorkerUpdate(registration) {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'alert alert-info m-3 d-flex align-items-center justify-content-between';
        updateBanner.innerHTML = `
            <div>
                <i class="fas fa-sync me-2"></i>
                A new version is available!
            </div>
            <button class="btn btn-primary btn-sm" onclick="location.reload()">
                Update Now
            </button>
        `;
        
        document.body.insertBefore(updateBanner, document.body.firstChild);
    }

    completeInitialization() {
        this.isInitialized = true;
        
        // Remove loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 1000);
        }

        // Dispatch initialization complete event
        document.dispatchEvent(new CustomEvent('appInitialized'));
        
        // Track initialization
        this.trackEvent('app_initialized');
    }

    handleInitializationError(error) {
        console.error('Initialization error:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger m-3';
        errorDiv.innerHTML = `
            <h5><i class="fas fa-exclamation-triangle me-2"></i>Something went wrong</h5>
            <p>The app failed to initialize properly. Please refresh the page or try again later.</p>
            <button class="btn btn-danger" onclick="location.reload()">
                <i class="fas fa-refresh me-1"></i>Refresh Page
            </button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Report error
        this.reportError(error);
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return 'home';
        if (path.includes('search')) return 'search';
        if (path.includes('profile')) return 'profile';
        if (path.includes('favorites')) return 'favorites';
        if (path.includes('login')) return 'login';
        if (path.includes('register')) return 'register';
        return 'unknown';
    }

    // Analytics and tracking
    trackEvent(eventName, properties = {}) {
        // Implementation would integrate with analytics service
        console.log('Event:', eventName, properties);
        
        // Store locally for offline tracking
        const events = storageService.get('analytics_events') || [];
        events.push({
            event: eventName,
            properties,
            timestamp: Date.now()
        });
        
        // Keep only last 100 events
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        storageService.set('analytics_events', events);
    }

    trackPerformance(metric, value) {
        // Track performance metrics
        console.log('Performance:', metric, value);
        
        const metrics = storageService.get('performance_metrics') || {};
        metrics[metric] = value;
        storageService.set('performance_metrics', metrics);
    }

    reportError(error) {
        // Error reporting implementation
        console.error('Reported error:', error);
        
        const errorReport = {
            message: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now()
        };
        
        // Store for offline reporting
        const errors = storageService.get('error_reports') || [];
        errors.push(errorReport);
        
        // Keep only last 50 errors
        if (errors.length > 50) {
            errors.splice(0, errors.length - 50);
        }
        
        storageService.set('error_reports', errors);
    }

    // Public API methods
    navigateTo(path) {
        window.location.href = path;
    }

    showToast(message, type = 'info') {
        if (authService.showToast) {
            authService.showToast(message, type);
        }
    }

    async refreshData() {
        if (this.currentPage === 'home' && window.homePage) {
            await window.homePage.refresh();
        }
    }

    getAppInfo() {
        return {
            version: '1.0.0',
            isInitialized: this.isInitialized,
            currentPage: this.currentPage,
            isOnline: navigator.onLine,
            isAuthenticated: authService.isAuthenticated()
        };
    }
}

// Initialize the application
window.movieFlixApp = new MovieFlixApp();

// Export for global access
window.app = window.movieFlixApp;