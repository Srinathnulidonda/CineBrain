// CineScope Application Controller
class CineScopeApp {
  constructor() {
    this.currentUser = null;
    this.currentRoute = null;
    this.components = new Map();
    this.routeHandlers = new Map();
    this.authGuards = new Set();
    this.adminGuards = new Set();
    this.pageCache = new Map();

    this.init();
  }

  async init() {
    try {
      // Initialize core systems
      await this.initializeCore();

      // Load user authentication state
      await this.loadAuthState();

      // Initialize routing
      this.initRouting();

      // Load page-specific functionality
      await this.loadPageFunctionality();

      // Initialize global features
      this.initGlobalFeatures();

      // Mark app as ready
      document.body.classList.add('app-ready');
      this.dispatchEvent('app-ready');

    } catch (error) {
      console.error('Failed to initialize CineScope app:', error);
      this.handleInitializationError(error);
    }
  }

  // Initialize core application systems
  async initializeCore() {
    // Set up global error handling
    this.setupErrorHandling();

    // Initialize performance monitoring
    this.initPerformanceMonitoring();

    // Load critical CSS
    await this.loadCriticalResources();

    // Initialize service worker
    if (CONFIG.FEATURES.PWA_ENABLED) {
      await this.initServiceWorker();
    }
  }

  // Setup global error handling
  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, 'javascript');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason, 'promise');
    });
  }

  // Handle global errors
  handleGlobalError(error, type) {
    console.error(`Global ${type} error:`, error);

    // Don't show user-facing errors for minor issues
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      // Handle chunk load errors (typically from code splitting)
      this.handleChunkLoadError();
      return;
    }

    // Show user-friendly error for serious issues
    if (error.code === 'NETWORK_ERROR' || error.code === 'SERVER_ERROR') {
      UI.showToast('Connection issue. Please check your network.', 'error');
    } else if (!CONFIG.IS_PRODUCTION) {
      UI.showToast(`Development error: ${error.message}`, 'error');
    }
  }

  // Handle chunk load errors
  handleChunkLoadError() {
    if (confirm('The application needs to reload to load new updates. Reload now?')) {
      window.location.reload();
    }
  }

  // Initialize performance monitoring
  initPerformanceMonitoring() {
    if (!CONFIG.DEV.SHOW_PERFORMANCE) return;

    // Monitor Core Web Vitals
    this.monitorWebVitals();

    // Monitor resource loading
    this.monitorResourceLoading();
  }

  // Monitor Core Web Vitals
  monitorWebVitals() {
    // LCP (Largest Contentful Paint)
    this.observePerformance('largest-contentful-paint', (entry) => {
      console.log('LCP:', entry.startTime);
    });

    // FID (First Input Delay)
    this.observePerformance('first-input', (entry) => {
      console.log('FID:', entry.processingStart - entry.startTime);
    });

    // CLS (Cumulative Layout Shift)
    this.observePerformance('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        console.log('CLS:', entry.value);
      }
    });
  }

  // Observe performance entries
  observePerformance(type, callback) {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      observer.observe({ type: type, buffered: true });
    } catch (e) {
      console.warn(`Failed to observe ${type}:`, e);
    }
  }

  // Monitor resource loading
  monitorResourceLoading() {
    this.observePerformance('resource', (entry) => {
      if (entry.duration > 1000) {
        console.warn('Slow resource:', entry.name, entry.duration);
      }
    });
  }

  // Load critical resources
  async loadCriticalResources() {
    // Preload critical images
    this.preloadCriticalImages();

    // Prefetch important pages
    this.prefetchImportantPages();
  }

  // Preload critical images
  preloadCriticalImages() {
    const criticalImages = [
      '/assets/logo.svg',
      CONFIG.PLACEHOLDER_IMAGE
    ];

    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }

  // Prefetch important pages
  prefetchImportantPages() {
    const importantPages = [
      '/content/search.html',
      '/auth/login.html'
    ];

    importantPages.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  // Initialize service worker
  async initServiceWorker() {
    if (!CONFIG.BROWSER_SUPPORT.service_worker) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateAvailable();
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  // Show update available notification
  showUpdateAvailable() {
    const toast = UI.showToast(
      CONFIG.PWA.UPDATE_AVAILABLE_MESSAGE,
      'info',
      0
    );

    // Add update button to toast
    const updateBtn = document.createElement('button');
    updateBtn.className = 'btn btn-sm btn-light ms-2';
    updateBtn.textContent = 'Update';
    updateBtn.onclick = () => {
      window.location.reload();
    };

    toast._element.querySelector('.toast-body').appendChild(updateBtn);
  }

  // Load authentication state
  async loadAuthState() {
    const token = Storage.getAuthToken();
    const userData = Storage.getUserData();

    if (token && userData) {
      this.currentUser = userData;
      this.updateAuthUI(true);
    } else {
      this.updateAuthUI(false);
    }
  }

  // Update authentication UI
  updateAuthUI(isAuthenticated) {
    const authElements = document.querySelectorAll('[data-auth]');
    const guestElements = document.querySelectorAll('[data-guest]');
    const adminElements = document.querySelectorAll('[data-admin]');

    authElements.forEach(el => {
      el.style.display = isAuthenticated ? '' : 'none';
    });

    guestElements.forEach(el => {
      el.style.display = isAuthenticated ? 'none' : '';
    });

    adminElements.forEach(el => {
      el.style.display = (isAuthenticated && this.currentUser?.is_admin) ? '' : 'none';
    });

    // Update user menu
    this.updateUserMenu();
  }

  // Update user menu
  updateUserMenu() {
    const userMenus = document.querySelectorAll('.user-menu');

    userMenus.forEach(menu => {
      if (this.currentUser) {
        menu.innerHTML = `
          <div class="dropdown">
            <button class="btn btn-ghost dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown">
              <div class="tw-w-8 tw-h-8 tw-bg-gradient-to-r tw-from-blue-500 tw-to-purple-500 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-white tw-font-semibold tw-mr-2">
                ${this.currentUser.username.charAt(0).toUpperCase()}
              </div>
              <span class="d-none d-md-inline">${this.currentUser.username}</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><h6 class="dropdown-header">${this.currentUser.username}</h6></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item" href="/user/profile.html">Profile</a></li>
              <li><a class="dropdown-item" href="/user/watchlist.html">Watchlist</a></li>
              <li><a class="dropdown-item" href="/user/favorites.html">Favorites</a></li>
              <li><a class="dropdown-item" href="/user/settings.html">Settings</a></li>
              ${this.currentUser.is_admin ? '<li><hr class="dropdown-divider"></li><li><a class="dropdown-item" href="/admin/index.html">Admin Panel</a></li>' : ''}
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item text-danger" onclick="App.logout()">Logout</button></li>
            </ul>
          </div>
        `;
      } else {
        menu.innerHTML = `
          <div class="tw-flex tw-gap-2">
            <a href="/auth/login.html" class="btn btn-ghost btn-sm">Login</a>
            <a href="/auth/register.html" class="btn btn-primary btn-sm">Sign Up</a>
          </div>
        `;
      }
    });
  }

  // Initialize routing
  initRouting() {
    // Define route handlers
    this.routeHandlers.set('/', () => this.loadHomePage());
    this.routeHandlers.set('/index.html', () => this.loadHomePage());
    this.routeHandlers.set('/auth/login.html', () => this.loadLoginPage());
    this.routeHandlers.set('/auth/register.html', () => this.loadRegisterPage());
    this.routeHandlers.set('/content/search.html', () => this.loadSearchPage());
    this.routeHandlers.set('/content/details.html', () => this.loadDetailsPage());
    this.routeHandlers.set('/content/anime.html', () => this.loadAnimePage());
    this.routeHandlers.set('/content/genre.html', () => this.loadGenrePage());
    this.routeHandlers.set('/content/regional.html', () => this.loadRegionalPage());
    this.routeHandlers.set('/user/profile.html', () => this.loadProfilePage());
    this.routeHandlers.set('/user/watchlist.html', () => this.loadWatchlistPage());
    this.routeHandlers.set('/user/favorites.html', () => this.loadFavoritesPage());
    this.routeHandlers.set('/user/settings.html', () => this.loadSettingsPage());
    this.routeHandlers.set('/user/activity.html', () => this.loadActivityPage());
    this.routeHandlers.set('/admin/index.html', () => this.loadAdminDashboard());
    this.routeHandlers.set('/admin/analytics.html', () => this.loadAdminAnalytics());
    this.routeHandlers.set('/admin/recommendations.html', () => this.loadAdminRecommendations());
    this.routeHandlers.set('/admin/ml.html', () => this.loadAdminML());

    // Define authentication guards
    this.authGuards.add('/user/profile.html');
    this.authGuards.add('/user/watchlist.html');
    this.authGuards.add('/user/favorites.html');
    this.authGuards.add('/user/settings.html');
    this.authGuards.add('/user/activity.html');

    // Define admin guards
    this.adminGuards.add('/admin/index.html');
    this.adminGuards.add('/admin/analytics.html');
    this.adminGuards.add('/admin/recommendations.html');
    this.adminGuards.add('/admin/ml.html');

    // Get current route
    this.currentRoute = window.location.pathname;

    // Check route guards
    this.checkRouteAccess();
  }

  // Check route access
  checkRouteAccess() {
    const currentPath = window.location.pathname;

    // Check authentication guard
    if (this.authGuards.has(currentPath) && !this.currentUser) {
      this.redirectToLogin();
      return;
    }

    // Check admin guard
    if (this.adminGuards.has(currentPath) && (!this.currentUser || !this.currentUser.is_admin)) {
      this.redirectToHome();
      return;
    }
  }

  // Redirect to login
  redirectToLogin() {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `/auth/login.html?returnUrl=${returnUrl}`;
  }

  // Redirect to home
  redirectToHome() {
    window.location.href = '/index.html';
  }

  // Load page-specific functionality
  async loadPageFunctionality() {
    const currentPath = window.location.pathname;
    const handler = this.routeHandlers.get(currentPath);

    if (handler) {
      try {
        await handler();
      } catch (error) {
        console.error(`Failed to load page functionality for ${currentPath}:`, error);
        this.showPageError(error);
      }
    }
  }

  // Initialize global features
  initGlobalFeatures() {
    // Initialize search functionality
    this.initGlobalSearch();

    // Initialize navigation
    this.initNavigation();

    // Initialize infinite scroll
    this.initInfiniteScroll();

    // Initialize keyboard shortcuts
    this.initKeyboardShortcuts();

    // Initialize analytics
    if (CONFIG.FEATURES.ANALYTICS) {
      this.initAnalytics();
    }
  }

  // Initialize global search
  initGlobalSearch() {
    const searchInputs = document.querySelectorAll('.global-search-input');

    searchInputs.forEach(input => {
      let searchTimeout;

      input.addEventListener('input', (event) => {
        clearTimeout(searchTimeout);
        const query = event.target.value.trim();

        if (query.length >= 2) {
          searchTimeout = setTimeout(() => {
            this.performGlobalSearch(query);
          }, CONFIG.PERFORMANCE.DEBOUNCE_DELAY);
        }
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const query = event.target.value.trim();
          if (query.length >= 2) {
            this.navigateToSearch(query);
          }
        }
      });
    });
  }

  // Initialize navigation
  initNavigation() {
    // Update active navigation links
    this.updateActiveNavigation();

    // Handle mobile navigation
    this.initMobileNavigation();
  }

  // Update active navigation
  updateActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (href === '/index.html' && currentPath === '/')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Initialize mobile navigation
  initMobileNavigation() {
    // Handle safe area for iOS
    if (CONFIG.IS_IOS) {
      document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    }
  }

  // Initialize infinite scroll
  initInfiniteScroll() {
    const infiniteScrollContainers = document.querySelectorAll('[data-infinite-scroll]');

    infiniteScrollContainers.forEach(container => {
      this.setupInfiniteScroll(container);
    });
  }

  // Setup infinite scroll for container
  setupInfiniteScroll(container) {
    const loadMore = container.dataset.loadMore;
    if (!loadMore || typeof window[loadMore] !== 'function') {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          window[loadMore]();
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '100px'
    });

    // Create sentinel element
    const sentinel = document.createElement('div');
    sentinel.className = 'infinite-scroll-sentinel';
    container.appendChild(sentinel);

    observer.observe(sentinel);
  }

  // Initialize keyboard shortcuts
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Global shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            this.focusGlobalSearch();
            break;
          case 'h':
            event.preventDefault();
            window.location.href = '/index.html';
            break;
        }
      }
    });
  }

  // Initialize analytics
  initAnalytics() {
    // Track page views
    this.trackPageView();

    // Track user interactions
    this.trackUserInteractions();
  }

  // Page loading methods
  async loadHomePage() {
    await this.loadRecommendations();
    this.initHeroSection();
  }

  async loadLoginPage() {
    this.initLoginForm();
  }

  async loadRegisterPage() {
    this.initRegisterForm();
  }

  async loadSearchPage() {
    this.initSearchPage();
  }

  async loadDetailsPage() {
    await this.loadContentDetails();
  }

  async loadAnimePage() {
    await this.loadAnimeContent();
  }

  async loadGenrePage() {
    this.initGenreFilters();
    await this.loadGenreContent();
  }

  async loadRegionalPage() {
    this.initRegionalFilters();
    await this.loadRegionalContent();
  }

  async loadProfilePage() {
    await this.loadUserProfile();
  }

  async loadWatchlistPage() {
    await this.loadUserWatchlist();
  }

  async loadFavoritesPage() {
    await this.loadUserFavorites();
  }

  async loadSettingsPage() {
    this.initSettingsForm();
  }

  async loadActivityPage() {
    await this.loadUserActivity();
  }

  async loadAdminDashboard() {
    await this.loadAdminDashboardData();
  }

  async loadAdminAnalytics() {
    await this.loadAnalyticsData();
  }

  async loadAdminRecommendations() {
    await this.loadAdminRecommendationsData();
    this.initAdminRecommendationForm();
  }

  async loadAdminML() {
    await this.loadMLServiceData();
    this.initMLServiceControls();
  }

  // Recommendations loading
  async loadRecommendations() {
    const sections = [
      { type: 'trending', title: 'Trending Now', endpoint: 'getTrending' },
      { type: 'new-releases', title: 'New Releases', endpoint: 'getNewReleases' },
      { type: 'critics-choice', title: "Critics' Choice", endpoint: 'getCriticsChoice' },
      { type: 'admin-choice', title: "Admin's Choice", endpoint: 'getAdminChoiceRecommendations' }
    ];

    if (this.currentUser) {
      sections.unshift({
        type: 'personalized',
        title: 'Recommended for You',
        endpoint: 'getPersonalizedRecommendations'
      });
    }

    const mainContent = document.querySelector('.main-content, #main-content');
    if (!mainContent) return;

    for (const section of sections) {
      try {
        const container = document.createElement('div');
        container.id = `${section.type}-section`;

        // Add loading skeleton
        const skeletonSection = UI.createComponent('recommendation-section', {
          recommendations: []
        }, {
          title: section.title,
          type: section.type,
          showHeader: true,
          showViewAll: true
        });

        container.appendChild(skeletonSection);
        mainContent.appendChild(container);

        // Load actual data
        const data = await API[section.endpoint]({ limit: 20 });

        // Replace with real content
        const realSection = UI.createComponent('recommendation-section', data, {
          title: section.title,
          type: section.type,
          showHeader: true,
          showViewAll: true
        });

        container.replaceChild(realSection, skeletonSection);

        // Add staggered animation
        this.animateSection(realSection, sections.indexOf(section));

      } catch (error) {
        console.error(`Failed to load ${section.type}:`, error);

        // Show error state
        const errorSection = UI.createErrorMessage(
          `Failed to load ${section.title.toLowerCase()}`,
          {
            showRetry: true,
            retryHandler: () => this.loadRecommendations()
          }
        );

        const container = document.getElementById(`${section.type}-section`);
        if (container) {
          container.innerHTML = '';
          container.appendChild(errorSection);
        }
      }
    }
  }

  // Initialize hero section
  initHeroSection() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;

    // Add dynamic background
    this.initHeroBackground();

    // Add search functionality
    const searchBar = UI.createSearchBar({
      placeholder: 'Search thousands of movies, TV shows, and anime...',
      showFilters: true,
      onSearch: (query) => this.navigateToSearch(query)
    });

    const searchContainer = heroSection.querySelector('.hero-search');
    if (searchContainer) {
      searchContainer.appendChild(searchBar);
    }
  }

  // Initialize hero background
  async initHeroBackground() {
    try {
      const trendingData = await API.getTrending({ limit: 5 });
      const content = trendingData.recommendations[0];

      if (content && content.backdrop_path) {
        const heroSection = document.querySelector('.hero-section');
        const backgroundUrl = UI.getOptimizedImageUrl(content.backdrop_path, 'w1280');

        heroSection.style.backgroundImage = `
          linear-gradient(rgba(13, 13, 15, 0.7), rgba(13, 13, 15, 0.8)),
          url(${backgroundUrl})
        `;
        heroSection.style.backgroundSize = 'cover';
        heroSection.style.backgroundPosition = 'center';
      }
    } catch (error) {
      console.warn('Failed to load hero background:', error);
    }
  }

  // Authentication methods
  async login(credentials) {
    try {
      UI.showLoading('.login-form', 'Signing in...');

      const response = await API.login(credentials);
      this.currentUser = response.user;

      UI.hideLoading('.login-form');
      UI.showToast(CONFIG.SUCCESS_MESSAGES.LOGIN_SUCCESS, 'success');

      this.updateAuthUI(true);

      // Redirect to return URL or home
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get('returnUrl');

      setTimeout(() => {
        window.location.href = returnUrl || '/index.html';
      }, 1000);

    } catch (error) {
      UI.hideLoading('.login-form');
      UI.showToast(error.message, 'error');
    }
  }

  async register(userData) {
    try {
      UI.showLoading('.register-form', 'Creating account...');

      const response = await API.register(userData);
      this.currentUser = response.user;

      UI.hideLoading('.register-form');
      UI.showToast(CONFIG.SUCCESS_MESSAGES.REGISTER_SUCCESS, 'success');

      this.updateAuthUI(true);

      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);

    } catch (error) {
      UI.hideLoading('.register-form');
      UI.showToast(error.message, 'error');
    }
  }

  async logout() {
    try {
      await API.logout();
      this.currentUser = null;
      this.updateAuthUI(false);
      UI.showToast(CONFIG.SUCCESS_MESSAGES.LOGOUT_SUCCESS, 'success');

      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);

    } catch (error) {
      console.warn('Logout error:', error);
      // Force logout even if API call fails
      this.currentUser = null;
      Storage.handleLogout();
      window.location.href = '/index.html';
    }
  }

  // Content interaction methods
  async addToWatchlist(contentId) {
    if (!this.currentUser) {
      UI.showToast(CONFIG.ERROR_MESSAGES.AUTH_REQUIRED, 'warning');
      return;
    }

    try {
      await API.recordInteraction({
        content_id: contentId,
        interaction_type: CONFIG.INTERACTION_TYPES.WATCHLIST
      });

      UI.showToast(CONFIG.SUCCESS_MESSAGES.ADDED_TO_WATCHLIST, 'success');
    } catch (error) {
      UI.showToast(error.message, 'error');
    }
  }

  async addToFavorites(contentId) {
    if (!this.currentUser) {
      UI.showToast(CONFIG.ERROR_MESSAGES.AUTH_REQUIRED, 'warning');
      return;
    }

    try {
      await API.recordInteraction({
        content_id: contentId,
        interaction_type: CONFIG.INTERACTION_TYPES.FAVORITE
      });

      UI.showToast(CONFIG.SUCCESS_MESSAGES.ADDED_TO_FAVORITES, 'success');
    } catch (error) {
      UI.showToast(error.message, 'error');
    }
  }

  // Utility methods
  navigateToSearch(query) {
    window.location.href = `/content/search.html?q=${encodeURIComponent(query)}`;
  }

  focusGlobalSearch() {
    const searchInput = document.querySelector('.global-search-input, #search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  animateSection(section, delay = 0) {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';

    setTimeout(() => {
      section.style.transition = 'all 0.6s ease-out';
      section.style.opacity = '1';
      section.style.transform = 'translateY(0)';
    }, delay * CONFIG.ANIMATION.STAGGER_DELAY);
  }

  // Error handling
  handleInitializationError(error) {
    document.body.innerHTML = `
      <div class="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-gray-900">
        <div class="tw-text-center tw-p-8">
          <div class="tw-text-6xl tw-mb-4">⚠️</div>
          <h1 class="tw-text-2xl tw-font-bold tw-text-white tw-mb-4">Failed to Load CineScope</h1>
          <p class="tw-text-gray-400 tw-mb-6">We're having trouble starting the application.</p>
          <button onclick="window.location.reload()" class="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    `;
  }

  showPageError(error) {
    const mainContent = document.querySelector('.main-content, #main-content');
    if (mainContent) {
      const errorElement = UI.createErrorMessage(
        'Failed to load page content',
        {
          showRetry: true,
          retryHandler: () => window.location.reload()
        }
      );
      mainContent.innerHTML = '';
      mainContent.appendChild(errorElement);
    }
  }

  // Event system
  dispatchEvent(eventName, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  addEventListener(eventName, handler) {
    window.addEventListener(eventName, handler);
  }

  // Cleanup
  destroy() {
    // Cancel any pending requests
    API.cancelAllRequests();

    // Clean up UI components
    UI.cleanup();

    // Clear caches
    Storage.clearCache();

    // Remove event listeners
    // (handled by UI.cleanup())
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.App = new CineScopeApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (window.App) {
    window.App.destroy();
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CineScopeApp;
}