// CineBrain Main Application Controller
class CineBrainApp {
    constructor() {
        this.currentPage = null;
        this.router = null;
        this.isInitialized = false;

        // Performance monitoring
        this.performanceObserver = null;
        this.loadStartTime = performance.now();

        this.initialize();
    }

    // Initialize application
    async initialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            console.log('🎬 CineBrain initializing...');

            // Initialize theme
            this.initializeTheme();

            // Initialize router
            this.initializeRouter();

            // Initialize UI components
            this.initializeUI();

            // Initialize navigation
            this.initializeNavigation();

            // Initialize search
            this.initializeSearch();

            // Initialize performance monitoring
            this.initializePerformanceMonitoring();

            // Check authentication and redirect if needed
            this.handleAuthentication();

            // Load page-specific content
            await this.loadPageContent();

            // Prefetch critical data
            if (CONFIG.PERFORMANCE.PREFETCH_ENABLED) {
                await api.prefetchCriticalData();
            }

            this.isInitialized = true;

            const loadTime = performance.now() - this.loadStartTime;
            console.log(`🚀 CineBrain loaded in ${loadTime.toFixed(2)}ms`);

            // Dispatch app ready event
            window.dispatchEvent(new CustomEvent('app-ready'));

        } catch (error) {
            console.error('Failed to initialize CineBrain:', error);
            this.showErrorMessage('Failed to initialize application. Please refresh the page.');
        }
    }

    // Initialize theme system
    initializeTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = savedTheme || (THEME_CONFIG.AUTO_DETECT ? systemTheme : THEME_CONFIG.DEFAULT);

        document.documentElement.setAttribute('data-theme', theme);

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (THEME_CONFIG.AUTO_DETECT && !localStorage.getItem(STORAGE_KEYS.THEME)) {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
            }
        });
    }

    // Initialize router
    initializeRouter() {
        this.router = {
            routes: {
                '/': 'home',
                '/search': 'search',
                '/content/details': 'content-details',
                '/content/anime': 'anime',
                '/content/genre': 'genre',
                '/content/regional': 'regional',
                '/content/trending': 'trending',
                '/user/profile': 'profile',
                '/user/watchlist': 'watchlist',
                '/user/favorites': 'favorites',
                '/user/activity': 'activity',
                '/user/settings': 'settings',
                '/admin': 'admin-dashboard',
                '/admin/content': 'admin-content',
                '/admin/users': 'admin-users',
                '/admin/analytics': 'admin-analytics'
            },

            getCurrentPage() {
                const path = window.location.pathname;
                const page = document.body.dataset.page;
                return page || this.routes[path] || 'unknown';
            }
        };

        this.currentPage = this.router.getCurrentPage();
    }

    // Initialize UI components
    initializeUI() {
        // Initialize Bootstrap components
        if (typeof bootstrap !== 'undefined') {
            // Initialize tooltips
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });

            // Initialize popovers
            const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
            popoverTriggerList.map(function (popoverTriggerEl) {
                return new bootstrap.Popover(popoverTriggerEl);
            });
        }

        // Initialize lazy loading for images
        this.initializeLazyLoading();

        // Initialize infinite scroll where applicable
        this.initializeInfiniteScroll();

        // Initialize theme toggle
        this.initializeThemeToggle();

        // Initialize modal handlers
        this.initializeModals();
    }

    // Initialize navigation
    initializeNavigation() {
        // Mobile navigation toggle
        const mobileToggle = document.querySelector('.mobile-nav-toggle');
        const mobileNav = document.querySelector('.mobile-nav');

        if (mobileToggle && mobileNav) {
            mobileToggle.addEventListener('click', () => {
                mobileNav.classList.toggle('active');
            });
        }

        // User dropdown toggle
        const userDropdown = document.querySelector('.user-dropdown-toggle');
        const userDropdownMenu = document.querySelector('.user-dropdown-menu');

        if (userDropdown && userDropdownMenu) {
            userDropdown.addEventListener('click', (e) => {
                e.preventDefault();
                userDropdownMenu.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userDropdown.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                    userDropdownMenu.classList.remove('show');
                }
            });
        }

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Handle back button
        window.addEventListener('popstate', () => {
            this.loadPageContent();
        });
    }

    // Initialize search functionality
    initializeSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchResults = document.querySelector('.search-results');
        const searchToggle = document.querySelector('.search-toggle');
        const searchContainer = document.querySelector('.search-container');

        if (!searchInput) return;

        // Mobile search toggle
        if (searchToggle && searchContainer) {
            searchToggle.addEventListener('click', () => {
                searchContainer.classList.toggle('expanded');
                if (searchContainer.classList.contains('expanded')) {
                    searchInput.focus();
                }
            });
        }

        // Debounced search
        const debouncedSearch = UTILS.debounce(async (query) => {
            if (query.length < 2) {
                this.hideSearchResults();
                return;
            }

            try {
                this.showSearchLoading();
                const results = await api.search(query);
                this.displaySearchResults(results.results || []);
            } catch (error) {
                console.error('Search error:', error);
                this.hideSearchResults();
            }
        }, CONFIG.UI.DEBOUNCE_DELAY);

        // Search input handler
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            debouncedSearch(query);
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchContainer?.contains(e.target)) {
                this.hideSearchResults();
            }
        });

        // Handle search result clicks
        if (searchResults) {
            searchResults.addEventListener('click', (e) => {
                const resultItem = e.target.closest('.search-result-item');
                if (resultItem) {
                    const contentId = resultItem.dataset.contentId;
                    if (contentId) {
                        window.location.href = `/content/details.html?id=${contentId}`;
                    }
                }
            });
        }
    }

    // Initialize performance monitoring
    initializePerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.entryType === 'largest-contentful-paint') {
                        console.log(`LCP: ${entry.startTime.toFixed(2)}ms`);
                    }
                    if (entry.entryType === 'first-input') {
                        console.log(`FID: ${entry.processingStart - entry.startTime}ms`);
                    }
                });
            });

            this.performanceObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
        }
    }

    // Handle authentication
    handleAuthentication() {
        // Check if authentication is required for current page
        if (auth.redirectIfNotAuthenticated()) {
            return;
        }

        // Check if admin access is required
        if (auth.redirectIfNotAdmin()) {
            return;
        }

        // Update UI based on auth state
        if (auth.isAuthenticated()) {
            updateUIForAuthenticatedUser(auth.getCurrentUser());
        } else {
            updateUIForAnonymousUser();
        }
    }

    // Load page-specific content
    async loadPageContent() {
        const page = this.router.getCurrentPage();

        try {
            switch (page) {
                case 'home':
                    await this.loadHomePage();
                    break;
                case 'search':
                    await this.loadSearchPage();
                    break;
                case 'content-details':
                    await this.loadContentDetailsPage();
                    break;
                case 'anime':
                    await this.loadAnimePage();
                    break;
                case 'genre':
                    await this.loadGenrePage();
                    break;
                case 'regional':
                    await this.loadRegionalPage();
                    break;
                case 'trending':
                    await this.loadTrendingPage();
                    break;
                case 'profile':
                    await this.loadProfilePage();
                    break;
                case 'watchlist':
                    await this.loadWatchlistPage();
                    break;
                case 'favorites':
                    await this.loadFavoritesPage();
                    break;
                case 'activity':
                    await this.loadActivityPage();
                    break;
                case 'settings':
                    await this.loadSettingsPage();
                    break;
                case 'admin-dashboard':
                    await this.loadAdminDashboard();
                    break;
                case 'admin-content':
                    await this.loadAdminContent();
                    break;
                case 'admin-users':
                    await this.loadAdminUsers();
                    break;
                case 'admin-analytics':
                    await this.loadAdminAnalytics();
                    break;
                default:
                    console.warn(`Unknown page: ${page}`);
            }
        } catch (error) {
            console.error(`Error loading page content for ${page}:`, error);
            this.showErrorMessage('Failed to load page content. Please try again.');
        }
    }

    // Page loaders (will be implemented in individual pages)
    async loadHomePage() {
        // Implementation depends on specific page
        console.log('Loading home page...');
    }

    async loadSearchPage() {
        console.log('Loading search page...');
    }

    async loadContentDetailsPage() {
        console.log('Loading content details page...');
    }

    async loadAnimePage() {
        console.log('Loading anime page...');
    }

    async loadGenrePage() {
        console.log('Loading genre page...');
    }

    async loadRegionalPage() {
        console.log('Loading regional page...');
    }

    async loadTrendingPage() {
        console.log('Loading trending page...');
    }

    async loadProfilePage() {
        console.log('Loading profile page...');
    }

    async loadWatchlistPage() {
        console.log('Loading watchlist page...');
    }

    async loadFavoritesPage() {
        console.log('Loading favorites page...');
    }

    async loadActivityPage() {
        console.log('Loading activity page...');
    }

    async loadSettingsPage() {
        console.log('Loading settings page...');
    }

    async loadAdminDashboard() {
        console.log('Loading admin dashboard...');
    }

    async loadAdminContent() {
        console.log('Loading admin content...');
    }

    async loadAdminUsers() {
        console.log('Loading admin users...');
    }

    async loadAdminAnalytics() {
        console.log('Loading admin analytics...');
    }

    // Search functionality
    showSearchLoading() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.innerHTML = '<div class="p-4 text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div></div>';
            searchResults.classList.remove('d-none', 'hidden');
        }
    }

    displaySearchResults(results) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="p-4 text-center text-muted">No results found</div>';
        } else {
            const resultsHTML = results.map(item => `
        <div class="search-result-item" data-content-id="${item.id}">
          <img src="${item.poster_path || IMAGE_CONFIG.PLACEHOLDER}" 
               alt="${item.title}" 
               class="w-12 h-16 object-cover rounded me-3" 
               loading="lazy">
          <div class="flex-1">
            <h6 class="mb-1 text-white">${item.title}</h6>
            <p class="mb-1 text-sm text-gray-400">${item.content_type.toUpperCase()}</p>
            <div class="text-xs text-yellow-500">
              ${item.rating ? `⭐ ${UTILS.formatRating(item.rating)}` : 'No rating'}
            </div>
          </div>
        </div>
      `).join('');

            searchResults.innerHTML = resultsHTML;
        }

        searchResults.classList.remove('d-none', 'hidden');
    }

    hideSearchResults() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.classList.add('d-none', 'hidden');
        }
    }

    // Initialize lazy loading
    initializeLazyLoading() {
        if ('IntersectionObserver' in window && CONFIG.PERFORMANCE.IMAGE_LAZY_LOAD) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    // Initialize infinite scroll
    initializeInfiniteScroll() {
        const infiniteScrollContainers = document.querySelectorAll('.infinite-scroll');

        infiniteScrollContainers.forEach(container => {
            let page = 1;
            let loading = false;

            const observer = new IntersectionObserver(async (entries) => {
                const [entry] = entries;

                if (entry.isIntersecting && !loading) {
                    loading = true;
                    page++;

                    try {
                        // Load more content based on container type
                        const contentType = container.dataset.contentType;
                        await this.loadMoreContent(container, contentType, page);
                    } catch (error) {
                        console.error('Error loading more content:', error);
                    } finally {
                        loading = false;
                    }
                }
            });

            const sentinel = container.querySelector('.scroll-sentinel');
            if (sentinel) {
                observer.observe(sentinel);
            }
        });
    }

    // Initialize theme toggle
    initializeThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
            });
        }
    }

    // Initialize modals
    initializeModals() {
        // Trailer modal functionality
        document.addEventListener('click', (e) => {
            if (e.target.matches('.play-trailer') || e.target.closest('.play-trailer')) {
                e.preventDefault();
                const button = e.target.closest('.play-trailer');
                const videoId = button.dataset.videoId;
                const title = button.dataset.title;

                if (videoId) {
                    this.showTrailerModal(videoId, title);
                }
            }
        });

        // Close modals on background click
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal')) {
                const modal = e.target;
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });
    }

    // Show trailer modal
    showTrailerModal(videoId, title) {
        const modal = document.getElementById('trailerModal');
        const iframe = modal?.querySelector('.trailer-iframe');
        const modalTitle = modal?.querySelector('.modal-title');

        if (modal && iframe) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            if (modalTitle) modalTitle.textContent = title;

            modal.style.display = 'block';
            document.body.classList.add('modal-open');
        }
    }

    // Load more content for infinite scroll
    async loadMoreContent(container, contentType, page) {
        // Implementation depends on container type
        console.log(`Loading more ${contentType} content, page ${page}`);
    }

    // Utility functions
    showErrorMessage(message) {
        const errorContainer = document.querySelector('.error-container') || document.body;
        const errorHTML = `
      <div class="alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 9999;">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
        errorContainer.insertAdjacentHTML('afterbegin', errorHTML);

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            const alert = errorContainer.querySelector('.alert');
            if (alert) alert.remove();
        }, 5000);
    }

    showSuccessMessage(message) {
        const successContainer = document.querySelector('.success-container') || document.body;
        const successHTML = `
      <div class="alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 9999;">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
        successContainer.insertAdjacentHTML('afterbegin', successHTML);

        // Auto dismiss after 3 seconds
        setTimeout(() => {
            const alert = successContainer.querySelector('.alert');
            if (alert) alert.remove();
        }, 3000);
    }

    // Get performance metrics
    getPerformanceMetrics() {
        return {
            ...api.getPerformanceMetrics(),
            loadTime: performance.now() - this.loadStartTime,
            currentPage: this.currentPage
        };
    }
}

// Initialize app when DOM is ready
const app = new CineBrainApp();

// Export for global use
window.CineBrainApp = app;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CineBrainApp, app };
}