class MovieApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'home';
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoading();
            
            // Initialize core components
            await this.initializeComponents();
            
            // Initialize authentication
            await this.initializeAuth();
            
            // Initialize router
            this.initializeRouter();
            
            // Initialize navbar
            this.initializeNavbar();
            
            // Load initial page
            await this.loadPage(this.getInitialPage());
            
            // Initialize PWA features
            this.initializePWA();
            
            // Hide loading screen
            this.hideLoading();
            
            this.isInitialized = true;
            
            // Dispatch app ready event
            window.dispatchEvent(new CustomEvent('appReady'));
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application');
        }
    }

    async initializeComponents() {
        // Initialize notification system
        window.notification = new NotificationManager();
        
        // Initialize modal system
        window.modal = new ModalManager();
        
        // Initialize loader
        window.loader = new LoaderManager();
        
        // Initialize API client
        window.api = new APIClient();
    }

    async initializeAuth() {
        const token = StorageManager.get('token');
        const user = StorageManager.get('user');
        
        if (token && user) {
            try {
                // Verify token is still valid
                const response = await api.get('/api/user/profile');
                this.setCurrentUser(user);
            } catch (error) {
                // Token is invalid, clear storage
                this.logout();
            }
        }
    }

    initializeRouter() {
        // Handle browser navigation
        window.addEventListener('popstate', (event) => {
            const page = this.getPageFromURL();
            this.loadPage(page, false);
        });
        
        // Handle navigation links
        document.addEventListener('click', (event) => {
            const link = event.target.closest('[data-page]');
            if (link) {
                event.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            }
        });
    }

    initializeNavbar() {
        const navbar = new NavbarManager(this);
        window.navbar = navbar;
    }

    initializePWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
        
        // Handle install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallBanner();
        });
    }

    getInitialPage() {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(window.location.search);
        
        if (hash) return hash;
        if (params.get('page')) return params.get('page');
        return 'home';
    }

    getPageFromURL() {
        return window.location.hash.slice(1) || 'home';
    }

    async navigateTo(page, addToHistory = true) {
        if (page === this.currentPage) return;
        
        try {
            await this.loadPage(page, addToHistory);
        } catch (error) {
            console.error('Navigation failed:', error);
            notification.show('error', 'Navigation Error', 'Failed to load page');
        }
    }

    async loadPage(page, addToHistory = true) {
        try {
            // Check if page requires authentication
            if (this.requiresAuth(page) && !this.isAuthenticated()) {
                this.showAuthModal();
                return;
            }
            
            // Show loading
            loader.show();
            
            // Load page content
            const content = await this.getPageContent(page);
            
            // Update main content
            const mainContent = document.getElementById('main-content');
            mainContent.innerHTML = content;
            
            // Initialize page-specific functionality
            await this.initializePage(page);
            
            // Update current page
            this.currentPage = page;
            
            // Update URL
            if (addToHistory) {
                const url = page === 'home' ? '/' : `/#${page}`;
                window.history.pushState({ page }, '', url);
            }
            
            // Update navbar active state
            this.updateNavbarState();
            
            // Update document title
            this.updateDocumentTitle(page);
            
            // Hide loading
            loader.hide();
            
        } catch (error) {
            loader.hide();
            throw error;
        }
    }

    async getPageContent(page) {
        const pageMap = {
            'home': () => this.loadHomePage(),
            'search': () => this.loadSearchPage(),
            'movie-detail': () => this.loadMovieDetailPage(),
            'watchlist': () => this.loadWatchlistPage(),
            'favorites': () => this.loadFavoritesPage(),
            'profile': () => this.loadProfilePage(),
            'admin-dashboard': () => this.loadAdminDashboard(),
            'admin-content': () => this.loadAdminContentPage(),
            'admin-analytics': () => this.loadAdminAnalyticsPage(),
            'login': () => this.loadLoginPage(),
            'register': () => this.loadRegisterPage()
        };
        
        const loadFunction = pageMap[page];
        if (!loadFunction) {
            throw new Error(`Page '${page}' not found`);
        }
        
        return await loadFunction();
    }

    async initializePage(page) {
        const initMap = {
            'home': () => this.initializeHomePage(),
            'search': () => this.initializeSearchPage(),
            'movie-detail': () => this.initializeMovieDetailPage(),
            'watchlist': () => this.initializeWatchlistPage(),
            'favorites': () => this.initializeFavoritesPage(),
            'profile': () => this.initializeProfilePage(),
            'admin-dashboard': () => this.initializeAdminDashboard(),
            'admin-content': () => this.initializeAdminContentPage(),
            'admin-analytics': () => this.initializeAdminAnalyticsPage(),
            'login': () => this.initializeLoginPage(),
            'register': () => this.initializeRegisterPage()
        };
        
        const initFunction = initMap[page];
        if (initFunction) {
            await initFunction();
        }
    }

    requiresAuth(page) {
        const authPages = ['watchlist', 'favorites', 'profile', 'admin-dashboard', 'admin-content', 'admin-analytics'];
        return authPages.includes(page);
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    setCurrentUser(user) {
        this.currentUser = user;
        StorageManager.set('user', user);
        this.updateAuthState();
    }

    logout() {
        this.currentUser = null;
        StorageManager.remove('token');
        StorageManager.remove('user');
        this.updateAuthState();
        this.navigateTo('home');
        notification.show('success', 'Logged Out', 'You have been logged out successfully');
    }

    updateAuthState() {
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const adminLink = document.getElementById('admin-link');
        
        if (this.isAuthenticated()) {
            authButtons.style.display = 'none';
            userMenu.style.display = 'block';
            
            // Update user name
            const userName = document.getElementById('user-name');
            if (userName) {
                userName.textContent = this.currentUser.username;
            }
            
            // Show admin link if user is admin
            if (adminLink) {
                adminLink.style.display = this.isAdmin() ? 'block' : 'none';
            }
        } else {
            authButtons.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }

    updateNavbarState() {
        // Update active nav link
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        navLinks.forEach(link => {
            const page = link.dataset.page;
            if (page === this.currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    updateDocumentTitle(page) {
        const titleMap = {
            'home': 'MovieRec - Discover Your Next Favorite',
            'search': 'Search - MovieRec',
            'watchlist': 'My Watchlist - MovieRec',
            'favorites': 'My Favorites - MovieRec',
            'profile': 'Profile - MovieRec',
            'admin-dashboard': 'Admin Dashboard - MovieRec',
            'admin-content': 'Content Management - MovieRec',
            'admin-analytics': 'Analytics - MovieRec',
            'login': 'Login - MovieRec',
            'register': 'Sign Up - MovieRec'
        };
        
        document.title = titleMap[page] || 'MovieRec';
    }

    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
        }
    }

    showError(message) {
        notification.show('error', 'Error', message);
    }

    showAuthModal() {
        // Implementation for auth modal
        this.navigateTo('login');
    }

    showInstallBanner() {
        // Implementation for PWA install banner
        const banner = document.createElement('div');
        banner.className = 'install-banner';
        banner.innerHTML = `
            <div class="install-content">
                <span>Install MovieRec for the best experience</span>
                <button id="install-btn" class="btn btn-primary btn-sm">Install</button>
                <button id="dismiss-install" class="btn btn-ghost btn-sm">Maybe later</button>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        document.getElementById('install-btn').addEventListener('click', () => {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                this.deferredPrompt.userChoice.then((choiceResult) => {
                    this.deferredPrompt = null;
                    banner.remove();
                });
            }
        });
        
        document.getElementById('dismiss-install').addEventListener('click', () => {
            banner.remove();
        });
    }

    // Page loading methods
    async loadHomePage() {
        const response = await fetch('/pages/home.html');
        return await response.text();
    }

    async loadSearchPage() {
        const response = await fetch('/pages/search.html');
        return await response.text();
    }

    async loadMovieDetailPage() {
        const response = await fetch('/pages/movie-detail.html');
        return await response.text();
    }

    async loadWatchlistPage() {
        const response = await fetch('/pages/watchlist.html');
        return await response.text();
    }

    async loadFavoritesPage() {
        const response = await fetch('/pages/favorites.html');
        return await response.text();
    }

    async loadProfilePage() {
        const response = await fetch('/pages/profile.html');
        return await response.text();
    }

    async loadAdminDashboard() {
        const response = await fetch('/pages/admin/dashboard.html');
        return await response.text();
    }

    async loadAdminContentPage() {
        const response = await fetch('/pages/admin/content-management.html');
        return await response.text();
    }

    async loadAdminAnalyticsPage() {
        const response = await fetch('/pages/admin/analytics.html');
        return await response.text();
    }

    async loadLoginPage() {
        const response = await fetch('/pages/login.html');
        return await response.text();
    }

    async loadRegisterPage() {
        const response = await fetch('/pages/register.html');
        return await response.text();
    }

    // Page initialization methods
    async initializeHomePage() {
        const homePageScript = await import('/assets/js/pages/homepage.js');
        new homePageScript.HomePage();
    }

    async initializeSearchPage() {
        const searchPageScript = await import('/assets/js/pages/search.js');
        new searchPageScript.SearchPage();
    }

    async initializeMovieDetailPage() {
        const movieDetailScript = await import('/assets/js/pages/movieDetail.js');
        new movieDetailScript.MovieDetailPage();
    }

    async initializeWatchlistPage() {
        const watchlistScript = await import('/assets/js/pages/watchlist.js');
        new watchlistScript.WatchlistPage();
    }

    async initializeFavoritesPage() {
        const favoritesScript = await import('/assets/js/pages/favorites.js');
        new favoritesScript.FavoritesPage();
    }

    async initializeProfilePage() {
        const profileScript = await import('/assets/js/pages/profile.js');
        new profileScript.ProfilePage();
    }

    async initializeAdminDashboard() {
        const adminScript = await import('/assets/js/pages/admin/dashboard.js');
        new adminScript.AdminDashboard();
    }

    async initializeAdminContentPage() {
        const adminContentScript = await import('/assets/js/pages/admin/contentManagement.js');
        new adminContentScript.AdminContentManagement();
    }

    async initializeAdminAnalyticsPage() {
        const adminAnalyticsScript = await import('/assets/js/pages/admin/analytics.js');
        new adminAnalyticsScript.AdminAnalytics();
    }

    async initializeLoginPage() {
        const authScript = await import('/assets/js/core/auth.js');
        authScript.initializeLoginForm();
    }

    async initializeRegisterPage() {
        const authScript = await import('/assets/js/core/auth.js');
        authScript.initializeRegisterForm();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MovieApp();
});

// Handle unhandled errors
window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
    if (window.notification) {
        notification.show('error', 'Error', 'An unexpected error occurred');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.notification) {
        notification.show('error', 'Error', 'An unexpected error occurred');
    }
});