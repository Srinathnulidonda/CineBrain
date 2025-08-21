// Main Application Controller with Router, Components, and Performance
class CineScope {
  constructor() {
    this.currentPage = null;
    this.components = new Map();
    this.observers = new Map();
    this.performanceMarks = new Map();
    this.init();
  }

  // Initialize application
  async init() {
    this.markPerformance('app-init-start');

    // Register service worker
    await this.registerServiceWorker();

    // Initialize router
    this.initRouter();

    // Initialize global components
    this.initGlobalComponents();

    // Load current page
    await this.loadPage();

    // Setup global event listeners
    this.setupEventListeners();

    // Prefetch critical data
    this.prefetchData();

    this.markPerformance('app-init-end');
    this.logPerformance();
  }

  // Performance marking
  markPerformance(name) {
    if (window.performance && window.performance.mark) {
      window.performance.mark(name);
      this.performanceMarks.set(name, performance.now());
    }
  }

  // Log performance metrics
  logPerformance() {
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure('app-init', 'app-init-start', 'app-init-end');
        const measure = window.performance.getEntriesByName('app-init')[0];
        console.log(`App initialization: ${measure.duration.toFixed(2)}ms`);
      } catch (e) {
        // Ignore errors
      }
    }
  }

  // Service Worker Registration
  async registerServiceWorker() {
    if ('serviceWorker' in navigator && CONFIG.FEATURES.SERVICE_WORKER) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  // Router initialization
  initRouter() {
    this.router = {
      routes: {
        '/': 'HomePage',
        '/auth/login.html': 'LoginPage',
        '/auth/register.html': 'RegisterPage',
        '/auth/forgot-password.html': 'ForgotPasswordPage',
        '/content/search.html': 'SearchPage',
        '/content/details.html': 'DetailsPage',
        '/content/anime.html': 'AnimePage',
        '/content/genre.html': 'GenrePage',
        '/content/regional.html': 'RegionalPage',
        '/content/trending.html': 'TrendingPage',
        '/user/profile.html': 'ProfilePage',
        '/user/watchlist.html': 'WatchlistPage',
        '/user/favorites.html': 'FavoritesPage',
        '/user/activity.html': 'ActivityPage',
        '/user/settings.html': 'SettingsPage',
        '/admin/index.html': 'AdminDashboard',
        '/admin/content.html': 'AdminContent',
        '/admin/users.html': 'AdminUsers',
        '/admin/analytics.html': 'AdminAnalytics'
      },

      getCurrentRoute() {
        const path = window.location.pathname;
        // Handle username-based routes
        const userRouteMatch = path.match(/^\/([^\/]+)\/(profile|watchlist|favorites|activity|settings)$/);
        if (userRouteMatch) {
          return `/user/${userRouteMatch[2]}.html`;
        }
        return path;
      }
    };
  }

  // Load current page
  async loadPage() {
    const route = this.router.getCurrentRoute();
    const pageClass = this.router.routes[route];

    if (pageClass && this[`init${pageClass}`]) {
      this.currentPage = pageClass;
      await this[`init${pageClass}`]();
    }
  }

  // Initialize global components
  initGlobalComponents() {
    // Initialize navigation
    this.initNavigation();

    // Initialize theme manager
    this.initThemeManager();

    // Initialize lazy loading
    this.initLazyLoading();

    // Initialize infinite scroll
    this.initInfiniteScroll();

    // Initialize toast notifications
    this.initToastNotifications();
  }

  // Navigation initialization
  initNavigation() {
    // Desktop navigation
    const topbar = document.getElementById('topbar');
    if (topbar) {
      this.components.set('topbar', new TopbarComponent(topbar));
    }

    // Mobile navigation
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
      this.components.set('mobileNav', new MobileNavComponent(mobileNav));
    }
  }

  // Theme manager
  initThemeManager() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // Theme toggle handler
    document.querySelectorAll('[data-theme-toggle]').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
      });
    });
  }

  // Lazy loading with Intersection Observer
  initLazyLoading() {
    const lazyImages = document.querySelectorAll('[data-lazy]');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.lazy;
            img.removeAttribute('data-lazy');
            imageObserver.unobserve(img);
          }
        });
      }, {
        rootMargin: `${CONFIG.LAZY_LOAD_OFFSET}px`
      });

      lazyImages.forEach(img => imageObserver.observe(img));
      this.observers.set('lazyImages', imageObserver);
    }
  }

  // Infinite scroll
  initInfiniteScroll() {
    const scrollContainers = document.querySelectorAll('[data-infinite-scroll]');

    scrollContainers.forEach(container => {
      const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const loadMore = container.dataset.infiniteScroll;
            if (this[loadMore]) {
              this[loadMore]();
            }
          }
        });
      }, {
        rootMargin: `${CONFIG.INFINITE_SCROLL_THRESHOLD}px`
      });

      const sentinel = document.createElement('div');
      sentinel.className = 'infinite-scroll-sentinel';
      container.appendChild(sentinel);
      scrollObserver.observe(sentinel);

      this.observers.set(`infiniteScroll-${container.id}`, scrollObserver);
    });
  }

  // Toast notifications
  initToastNotifications() {
    if (!document.getElementById('toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }

  // Show toast notification
  showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), CONFIG.ANIMATION_DURATION);
    }, duration);
  }

  // Setup global event listeners
  setupEventListeners() {
    // Search functionality
    this.setupSearch();

    // Haptic feedback for mobile
    if (CONFIG.FEATURES.HAPTIC_FEEDBACK && 'vibrate' in navigator) {
      document.querySelectorAll('button, a, [data-haptic]').forEach(element => {
        element.addEventListener('touchstart', () => {
          navigator.vibrate(10);
        });
      });
    }

    // Pull to refresh
    this.setupPullToRefresh();

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  // Search setup
  setupSearch() {
    const searchInputs = document.querySelectorAll('[data-search-input]');
    const searchResults = document.querySelector('[data-search-results]');

    searchInputs.forEach(input => {
      let debounceTimer;

      input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const query = e.target.value.trim();
          if (query.length >= 2) {
            await this.performSearch(query, searchResults);
          } else if (searchResults) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
          }
        }, CONFIG.DEBOUNCE_DELAY);
      });
    });
  }

  // Perform search with real API
  async performSearch(query, resultsContainer) {
    try {
      const results = await apiClient.get(CONFIG.API_ENDPOINTS.SEARCH, {
        query,
        limit: 5
      });

      if (resultsContainer && results.results) {
        this.renderSearchResults(results.results, resultsContainer);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  // Render search results
  renderSearchResults(results, container) {
    container.innerHTML = results.map(item => `
      <a href="/content/details.html?id=${item.id}" class="search-result-item">
        <img src="${item.poster_path || '/images/placeholder.jpg'}" 
             alt="${item.title}" 
             loading="lazy">
        <div class="search-result-info">
          <h4>${item.title}</h4>
          <p>${item.content_type} • ${item.rating ? `⭐ ${item.rating}` : 'Not rated'}</p>
        </div>
      </a>
    `).join('');

    container.classList.add('active');
  }

  // Pull to refresh
  setupPullToRefresh() {
    if (!('ontouchstart' in window)) return;

    let startY = 0;
    let currentY = 0;
    let pulling = false;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        pulling = true;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;

      currentY = e.touches[0].pageY;
      const pullDistance = currentY - startY;

      if (pullDistance > 0 && pullDistance < 150) {
        e.preventDefault();
        document.body.style.transform = `translateY(${pullDistance}px)`;
      }
    });

    document.addEventListener('touchend', async () => {
      if (!pulling) return;

      const pullDistance = currentY - startY;
      pulling = false;

      if (pullDistance > 100) {
        document.body.style.transform = 'translateY(50px)';
        await this.refreshCurrentPage();
      }

      document.body.style.transform = '';
    });
  }

  // Refresh current page
  async refreshCurrentPage() {
    apiClient.clearCache();
    await this.loadPage();
    this.showToast('Content refreshed', 'success');
  }

  // Keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('[data-search-input]');
        if (searchInput) searchInput.focus();
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  // Close all modals
  closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  // Prefetch critical data
  async prefetchData() {
    if (auth.isAuthenticated()) {
      apiClient.prefetch([
        CONFIG.API_ENDPOINTS.RECOMMENDATIONS,
        CONFIG.API_ENDPOINTS.WATCHLIST,
        CONFIG.API_ENDPOINTS.FAVORITES
      ]);
    } else {
      apiClient.prefetch([
        CONFIG.API_ENDPOINTS.TRENDING,
        CONFIG.API_ENDPOINTS.POPULAR
      ]);
    }
  }

  // Page initializers
  async initHomePage() {
    const isAuthenticated = auth.isAuthenticated();

    if (isAuthenticated) {
      await this.loadPersonalizedHome();
    } else {
      await this.loadPublicHome();
    }
  }

  async loadPublicHome() {
    // Load hero section
    const hero = new HeroCarousel(document.getElementById('hero-carousel'));
    await hero.load();

    // Load content sections
    const sections = [
      { id: 'trending', endpoint: CONFIG.API_ENDPOINTS.TRENDING, title: "What's Hot 🔥" },
      { id: 'new-releases', endpoint: CONFIG.API_ENDPOINTS.NEW_RELEASES, title: 'New Releases' },
      { id: 'critics-choice', endpoint: CONFIG.API_ENDPOINTS.CRITICS_CHOICE, title: "Critics' Choice" },
      { id: 'admin-choice', endpoint: CONFIG.API_ENDPOINTS.ADMIN_CHOICE, title: "Admin's Picks" }
    ];

    for (const section of sections) {
      const container = document.getElementById(section.id);
      if (container) {
        const carousel = new ContentCarousel(container, {
          endpoint: section.endpoint,
          title: section.title
        });
        await carousel.load();
        this.components.set(section.id, carousel);
      }
    }

    // Load genre sections
    const genres = ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Sci-Fi'];
    for (const genre of genres) {
      const container = document.getElementById(`genre-${genre.toLowerCase()}`);
      if (container) {
        const carousel = new ContentCarousel(container, {
          endpoint: `${CONFIG.API_ENDPOINTS.GENRES}/${genre.toLowerCase()}`,
          title: genre
        });
        await carousel.load();
      }
    }

    // Load regional content
    const regions = ['Telugu', 'Hindi', 'Tamil', 'Kannada'];
    for (const region of regions) {
      const container = document.getElementById(`regional-${region.toLowerCase()}`);
      if (container) {
        const carousel = new ContentCarousel(container, {
          endpoint: `${CONFIG.API_ENDPOINTS.REGIONAL}/${region.toLowerCase()}`,
          title: `${region} Cinema`
        });
        await carousel.load();
      }
    }
  }

  async loadPersonalizedHome() {
    const user = auth.getUser();

    // Update welcome message
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
      welcomeMessage.textContent = `Welcome back, ${user.username}!`;
    }

    // Load personalized hero
    const hero = new HeroCarousel(document.getElementById('hero-carousel'), {
      personalized: true
    });
    await hero.load();

    // Load personalized sections
    const sections = [
      { id: 'recommended', endpoint: CONFIG.API_ENDPOINTS.ML_RECOMMENDATIONS, title: 'Recommended for You' },
      { id: 'continue-watching', endpoint: CONFIG.API_ENDPOINTS.WATCH_HISTORY, title: 'Continue Watching' },
      { id: 'watchlist-preview', endpoint: CONFIG.API_ENDPOINTS.WATCHLIST, title: 'From Your Watchlist' },
      { id: 'trending-genres', endpoint: CONFIG.API_ENDPOINTS.TRENDING, title: 'Trending in Your Genres' }
    ];

    for (const section of sections) {
      const container = document.getElementById(section.id);
      if (container) {
        const carousel = new ContentCarousel(container, {
          endpoint: section.endpoint,
          title: section.title,
          personalized: true
        });
        await carousel.load();
        this.components.set(section.id, carousel);
      }
    }

    // Load "Because you liked" sections
    await this.loadSimilarRecommendations();
  }

  async loadSimilarRecommendations() {
    try {
      const favorites = await apiClient.get(CONFIG.API_ENDPOINTS.FAVORITES, { limit: 3 });

      if (favorites.favorites && favorites.favorites.length > 0) {
        const container = document.getElementById('similar-recommendations');

        for (const favorite of favorites.favorites) {
          const section = document.createElement('section');
          section.className = 'content-section';
          section.innerHTML = `<h2>Because you liked ${favorite.title}</h2>`;

          const carousel = document.createElement('div');
          carousel.className = 'content-carousel';
          section.appendChild(carousel);
          container.appendChild(section);

          const similarCarousel = new ContentCarousel(carousel, {
            endpoint: `${CONFIG.API_ENDPOINTS.SIMILAR}/${favorite.id}`,
            title: ''
          });
          await similarCarousel.load();
        }
      }
    } catch (error) {
      console.error('Failed to load similar recommendations:', error);
    }
  }

  // Component Classes
}

// Hero Carousel Component
class HeroCarousel {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.currentIndex = 0;
    this.items = [];
    this.autoPlayInterval = null;
  }

  async load() {
    try {
      const endpoint = this.options.personalized
        ? CONFIG.API_ENDPOINTS.ML_RECOMMENDATIONS
        : CONFIG.API_ENDPOINTS.TRENDING;

      const data = await apiClient.get(endpoint, { limit: 5, content_type: 'movie' });
      this.items = data.recommendations || data.results || [];

      if (this.items.length > 0) {
        this.render();
        this.startAutoPlay();
      }
    } catch (error) {
      console.error('Failed to load hero carousel:', error);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="hero-slides">
        ${this.items.map((item, index) => `
          <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
            <div class="hero-backdrop" style="background-image: url('${item.backdrop_path || item.poster_path}')"></div>
            <div class="hero-content">
              <h1 class="hero-title">${item.title}</h1>
              <div class="hero-meta">
                <span class="hero-rating">⭐ ${item.rating || 'N/A'}</span>
                <span class="hero-type">${item.content_type}</span>
                ${item.genres ? `<span class="hero-genres">${item.genres.slice(0, 3).join(', ')}</span>` : ''}
              </div>
              <p class="hero-overview">${item.overview || ''}</p>
              <div class="hero-actions">
                <button class="btn btn-primary" onclick="app.playTrailer(${item.id})">
                  <i class="icon-play"></i> Play Trailer
                </button>
                <button class="btn btn-secondary" onclick="app.showDetails(${item.id})">
                  <i class="icon-info"></i> More Info
                </button>
                <button class="btn btn-icon" onclick="app.addToWatchlist(${item.id})" data-haptic>
                  <i class="icon-plus"></i>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="hero-indicators">
        ${this.items.map((_, index) => `
          <button class="hero-indicator ${index === 0 ? 'active' : ''}" 
                  onclick="app.components.get('hero').goToSlide(${index})"
                  data-index="${index}"></button>
        `).join('')}
      </div>
    `;
  }

  startAutoPlay() {
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  nextSlide() {
    this.goToSlide((this.currentIndex + 1) % this.items.length);
  }

  goToSlide(index) {
    const slides = this.container.querySelectorAll('.hero-slide');
    const indicators = this.container.querySelectorAll('.hero-indicator');

    slides[this.currentIndex].classList.remove('active');
    indicators[this.currentIndex].classList.remove('active');

    this.currentIndex = index;

    slides[this.currentIndex].classList.add('active');
    indicators[this.currentIndex].classList.add('active');
  }
}

// Content Carousel Component
class ContentCarousel {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.items = [];
    this.currentPage = 1;
    this.loading = false;
  }

  async load() {
    if (this.loading) return;

    this.loading = true;
    this.showLoading();

    try {
      const params = {
        page: this.currentPage,
        limit: 20
      };

      if (this.options.personalized) {
        params.personalized = true;
      }

      const data = await apiClient.get(this.options.endpoint, params);
      this.items = data.recommendations || data.results || data.watchlist || data.favorites || [];

      this.render();
    } catch (error) {
      console.error('Failed to load carousel:', error);
      this.showError();
    } finally {
      this.loading = false;
    }
  }

  render() {
    this.container.innerHTML = `
      ${this.options.title ? `<h2 class="section-title">${this.options.title}</h2>` : ''}
      <div class="carousel-wrapper">
        <button class="carousel-nav carousel-nav-prev" onclick="this.parentElement.scrollBy(-300, 0)">
          <i class="icon-chevron-left"></i>
        </button>
        <div class="carousel-track">
          ${this.items.map(item => this.renderCard(item)).join('')}
        </div>
        <button class="carousel-nav carousel-nav-next" onclick="this.parentElement.scrollBy(300, 0)">
          <i class="icon-chevron-right"></i>
        </button>
      </div>
    `;

    // Setup horizontal scroll with mouse wheel
    const track = this.container.querySelector('.carousel-track');
    track.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        track.scrollBy(e.deltaY, 0);
      }
    });
  }

  renderCard(item) {
    return `
      <div class="content-card" data-id="${item.id}">
        <a href="/content/details.html?id=${item.id}" class="content-card-link">
          <div class="content-card-image">
            <img src="${item.poster_path || '/images/placeholder.jpg'}" 
                 alt="${item.title}"
                 loading="lazy">
            ${item.youtube_trailer ? `
              <button class="content-card-play" onclick="event.preventDefault(); app.playTrailer(${item.id})">
                <i class="icon-play"></i>
              </button>
            ` : ''}
          </div>
          <div class="content-card-info">
            <h3 class="content-card-title">${item.title}</h3>
            <div class="content-card-meta">
              ${item.rating ? `<span class="rating-badge">⭐ ${item.rating}</span>` : ''}
              <span class="type-badge">${item.content_type}</span>
            </div>
          </div>
        </a>
        <div class="content-card-actions">
          <button class="btn-icon" onclick="app.toggleWatchlist(${item.id})" title="Add to Watchlist" data-haptic>
            <i class="icon-bookmark"></i>
          </button>
          <button class="btn-icon" onclick="app.toggleFavorite(${item.id})" title="Add to Favorites" data-haptic>
            <i class="icon-heart"></i>
          </button>
        </div>
      </div>
    `;
  }

  showLoading() {
    this.container.innerHTML = `
      <div class="carousel-loading">
        ${Array(5).fill(0).map(() => `
          <div class="skeleton-card">
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-meta"></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  showError() {
    this.container.innerHTML = `
      <div class="error-message">
        <p>Failed to load content. Please try again.</p>
        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Navigation Components
class TopbarComponent {
  constructor(element) {
    this.element = element;
    this.init();
  }

  init() {
    this.render();
    this.setupSearch();
    this.updateUserAvatar();
  }

  render() {
    const user = auth.getUser();

    this.element.innerHTML = `
      <div class="topbar-container">
        <a href="/" class="topbar-logo">
          <img src="/images/logo.svg" alt="CineScope">
        </a>
        
        <div class="topbar-search">
          <input type="text" 
                 class="search-input" 
                 placeholder="Search movies, shows, anime..."
                 data-search-input>
          <i class="icon-search"></i>
        </div>
        
        <div class="topbar-actions">
          ${user ? `
            <a href="${auth.getProfileUrl()}" class="topbar-avatar">
              <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=3b82f6&color=fff" 
                   alt="${user.username}">
            </a>
          ` : `
            <a href="/auth/login.html" class="btn btn-primary">Sign In</a>
          `}
          <button class="btn-icon" data-theme-toggle>
            <i class="icon-moon"></i>
          </button>
        </div>
      </div>
      <div class="search-results" data-search-results></div>
    `;
  }

  setupSearch() {
    const searchInput = this.element.querySelector('[data-search-input]');
    const searchResults = this.element.querySelector('[data-search-results]');

    if (searchInput) {
      searchInput.addEventListener('focus', () => {
        this.element.classList.add('search-active');
      });

      document.addEventListener('click', (e) => {
        if (!this.element.contains(e.target)) {
          this.element.classList.remove('search-active');
        }
      });
    }
  }

  updateUserAvatar() {
    const user = auth.getUser();
    if (user) {
      const avatar = this.element.querySelector('.topbar-avatar img');
      if (avatar) {
        avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=3b82f6&color=fff&cache=${Date.now()}`;
      }
    }
  }
}

class MobileNavComponent {
  constructor(element) {
    this.element = element;
    this.init();
  }

  init() {
    this.render();
    this.updateActiveTab();
  }

  render() {
    const user = auth.getUser();

    this.element.innerHTML = `
      <nav class="mobile-nav-container">
        <a href="/" class="mobile-nav-item" data-nav="home">
          <i class="icon-home"></i>
          <span>Home</span>
        </a>
        <a href="/content/search.html" class="mobile-nav-item" data-nav="search">
          <i class="icon-search"></i>
          <span>Search</span>
        </a>
        <a href="${user ? '/user/watchlist.html' : '/auth/login.html'}" class="mobile-nav-item" data-nav="watchlist">
          <i class="icon-bookmark"></i>
          <span>Watchlist</span>
        </a>
        <a href="${user ? '/user/favorites.html' : '/auth/login.html'}" class="mobile-nav-item" data-nav="favorites">
          <i class="icon-heart"></i>
          <span>Favorites</span>
        </a>
        <a href="${user ? auth.getProfileUrl() : '/auth/login.html'}" class="mobile-nav-item" data-nav="profile">
          <i class="icon-user"></i>
          <span>Profile</span>
        </a>
      </nav>
    `;
  }

  updateActiveTab() {
    const currentPath = window.location.pathname;
    const items = this.element.querySelectorAll('.mobile-nav-item');

    items.forEach(item => {
      item.classList.remove('active');
      const href = item.getAttribute('href');
      if (href === currentPath || (currentPath === '/' && item.dataset.nav === 'home')) {
        item.classList.add('active');
      }
    });
  }
}

// Application methods for global actions
CineScope.prototype.playTrailer = async function (contentId) {
  try {
    const details = await apiClient.get(`${CONFIG.API_ENDPOINTS.CONTENT_DETAILS}/${contentId}`);

    if (details.youtube_trailer) {
      this.showTrailerModal(details);
    } else {
      this.showToast('Trailer not available', 'warning');
    }
  } catch (error) {
    this.showToast('Failed to load trailer', 'error');
  }
};

CineScope.prototype.showTrailerModal = function (content) {
  const modal = document.createElement('div');
  modal.className = 'modal trailer-modal active';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="app.closeModal(this.parentElement)"></div>
    <div class="modal-content">
      <button class="modal-close" onclick="app.closeModal(this.closest('.modal'))">
        <i class="icon-x"></i>
      </button>
      <div class="video-wrapper">
        <iframe src="https://www.youtube.com/embed/${content.youtube_trailer.split('v=')[1]}?autoplay=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen></iframe>
      </div>
      <div class="modal-info">
        <h2>${content.title}</h2>
        <p>${content.overview}</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
};

CineScope.prototype.closeModal = function (modal) {
  modal.classList.remove('active');
  setTimeout(() => modal.remove(), CONFIG.ANIMATION_DURATION);
  document.body.style.overflow = '';
};

CineScope.prototype.showDetails = function (contentId) {
  window.location.href = `/content/details.html?id=${contentId}`;
};

CineScope.prototype.toggleWatchlist = async function (contentId) {
  if (!auth.requireAuth()) return;

  try {
    await apiClient.post(CONFIG.API_ENDPOINTS.INTERACTIONS, {
      content_id: contentId,
      interaction_type: 'watchlist'
    });

    this.showToast('Added to watchlist', 'success');
    this.updateCardState(contentId, 'watchlist', true);
  } catch (error) {
    this.showToast('Failed to update watchlist', 'error');
  }
};

CineScope.prototype.toggleFavorite = async function (contentId) {
  if (!auth.requireAuth()) return;

  try {
    await apiClient.post(CONFIG.API_ENDPOINTS.INTERACTIONS, {
      content_id: contentId,
      interaction_type: 'favorite'
    });

    this.showToast('Added to favorites', 'success');
    this.updateCardState(contentId, 'favorite', true);
  } catch (error) {
    this.showToast('Failed to update favorites', 'error');
  }
};

CineScope.prototype.updateCardState = function (contentId, type, state) {
  const card = document.querySelector(`[data-id="${contentId}"]`);
  if (card) {
    const button = card.querySelector(type === 'watchlist' ? '.icon-bookmark' : '.icon-heart');
    if (button) {
      button.parentElement.classList.toggle('active', state);
    }
  }
};

// Initialize app on DOM ready
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new CineScope();
  window.app = app; // Make available globally
});

// Handle navigation for SPAs
window.addEventListener('popstate', () => {
  app.loadPage();
});