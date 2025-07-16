// Main Application Entry Point
class App {
    constructor() {
        this.currentPage = null;
        this.routes = {
            '/': HomePage,
            '/content/:id': DetailPage,
            '/search': SearchPage,
            '/profile': ProfilePage,
            '/admin': AdminDashboard,
            '/favorites': FavoritesPage
        };
    }

    init() {
        // Initialize service worker for PWA
        this.initServiceWorker();

        // Initialize components
        HeaderInstance.init();
        new Footer().init();

        // Handle routing
        this.handleRoute();

        // Setup event listeners
        this.setupEventListeners();

        // Build recommendation matrix periodically
        if (AuthService.isAuthenticated()) {
            this.startBackgroundTasks();
        }
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => console.log('SW registered:', registration))
                .catch(error => console.log('SW registration failed:', error));
        }
    }

    handleRoute() {
        const path = window.location.pathname;
        const contentMatch = path.match(/^\/content\/(\d+)$/);

        if (contentMatch) {
            this.currentPage = new DetailPage(contentMatch[1]);
        } else if (this.routes[path]) {
            this.currentPage = new this.routes[path]();
        } else {
            this.currentPage = new HomePage();
        }

        if (this.currentPage && typeof this.currentPage.init === 'function') {
            this.currentPage.init();
        }
    }

    setupEventListeners() {
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });

        // Handle theme toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-theme-toggle]')) {
                this.toggleTheme();
            }
        });

        // Handle infinite scroll
        if (Utils.isMobile()) {
            this.setupInfiniteScroll();
        }

        // Handle offline/online status
        window.addEventListener('online', () => {
            new Toast('Back online!', 'success').show();
        });

        window.addEventListener('offline', () => {
            new Toast('You are offline', 'warning').show();
        });
    }

    setupInfiniteScroll() {
        const options = {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Load more content
                    if (this.currentPage && typeof this.currentPage.loadMore === 'function') {
                        this.currentPage.loadMore();
                    }
                }
            });
        }, options);

        // Observe sentinel element
        const sentinel = document.querySelector('.infinite-scroll-sentinel');
        if (sentinel) {
            observer.observe(sentinel);
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        Utils.storage.set('theme', newTheme);
    }

    startBackgroundTasks() {
        // Update recommendations every 30 minutes
        setInterval(() => {
            if (AuthService.isAuthenticated()) {
                API.getPersonalizedRecommendations().catch(console.error);
            }
        }, 30 * 60 * 1000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});

// Handle navigation
function navigateTo(path) {
    history.pushState(null, null, path);
    window.app.handleRoute();
}