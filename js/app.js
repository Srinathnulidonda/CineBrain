class CineBrainApp {
  constructor() {
    this.isInitialized = false;
    this.currentPage = this.getCurrentPage();
    this.components = new Map();
    this.eventListeners = new Map();
    this.intersectionObserver = null;
    this.touchHandler = new TouchHandler();
    
    this.init();
  }
  
  async init() {
    if (this.isInitialized) return;
    
    try {
      await this.registerServiceWorker();
      await this.loadComponents();
      this.setupEventListeners();
      this.setupIntersectionObserver();
      this.setupTheme();
      this.setupPerformanceOptimizations();
      
      // Page-specific initialization
      await this.initializePage();
      
      this.isInitialized = true;
      console.log('CineBrain App initialized successfully');
    } catch (error) {
      console.error('App initialization failed:', error);
    }
  }
  
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }
  
  getCurrentPage() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'home';
    if (path.includes('/auth/')) return 'auth';
    if (path.includes('/admin/')) return 'admin';
    if (path.includes('/user/')) return 'user';
    if (path.includes('/content/')) return 'content';
    return 'unknown';
  }
  
  async loadComponents() {
    const componentPromises = [
      this.loadComponent('topbar', '/components/layout/topbar.html'),
      this.loadComponent('mobile-nav', '/components/layout/mobile-nav.html')
    ];
    
    await Promise.allSettled(componentPromises);
  }
  
  async loadComponent(name, url) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const html = await response.text();
        this.components.set(name, html);
      }
    } catch (error) {
      console.warn(`Failed to load component ${name}:`, error);
    }
  }
  
  setupEventListeners() {
    // Auth events
    window.addEventListener('auth:login', this.handleAuthChange.bind(this));
    window.addEventListener('auth:logout', this.handleAuthChange.bind(this));
    window.addEventListener('auth:register', this.handleAuthChange.bind(this));
    
    // Window events
    window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));
    window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 16));
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));
    
    // Document events
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    
    // Touch events for mobile
    if (CineBrain.IS_MOBILE) {
      document.addEventListener('touchstart', this.touchHandler.handleTouchStart.bind(this.touchHandler));
      document.addEventListener('touchmove', this.touchHandler.handleTouchMove.bind(this.touchHandler));
      document.addEventListener('touchend', this.touchHandler.handleTouchEnd.bind(this.touchHandler));
    }
  }
  
  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        root: null,
        rootMargin: CineBrain.PERFORMANCE.IMAGE_LAZY_THRESHOLD,
        threshold: 0.1
      }
    );
    
    // Observe lazy-load elements
    document.querySelectorAll('[data-lazy]').forEach(el => {
      this.intersectionObserver.observe(el);
    });
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        if (element.hasAttribute('data-lazy')) {
          this.loadLazyContent(element);
          this.intersectionObserver.unobserve(element);
        }
      }
    });
  }
  
  async loadLazyContent(element) {
    const type = element.getAttribute('data-lazy');
    const src = element.getAttribute('data-src');
    
    try {
      if (type === 'image') {
        const img = new Image();
        img.onload = () => {
          element.src = src;
          element.classList.add('loaded');
        };
        img.onerror = () => {
          element.classList.add('error');
        };
        img.src = src;
      } else if (type === 'content') {
        const contentId = element.getAttribute('data-content-id');
        await this.loadContentCard(element, contentId);
      }
    } catch (error) {
      console.warn('Lazy loading failed:', error);
      element.classList.add('error');
    }
  }
  
  async loadContentCard(element, contentId) {
    try {
      const result = await API.getContentDetails(contentId);
      if (result.success) {
        element.innerHTML = this.generateContentCard(result.data);
        element.classList.add('loaded');
      }
    } catch (error) {
      console.error('Content card loading failed:', error);
    }
  }
  
  setupTheme() {
    const savedTheme = localStorage.getItem('cinebrain_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update theme toggle if present
    const themeToggle = document.querySelector('[data-theme-toggle]');
    if (themeToggle) {
      themeToggle.checked = savedTheme === 'light';
      themeToggle.addEventListener('change', this.toggleTheme.bind(this));
    }
  }
  
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('cinebrain_theme', newTheme);
    
    this.animateThemeTransition();
  }
  
  animateThemeTransition() {
    document.documentElement.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      document.documentElement.style.transition = '';
    }, 300);
  }
  
  setupPerformanceOptimizations() {
    // Preload critical resources
    this.preloadCriticalImages();
    
    // Setup image error handling
    document.addEventListener('error', this.handleImageError.bind(this), true);
    
    // Setup connection quality detection
    if ('connection' in navigator) {
      this.adaptToConnection();
    }
  }
  
  preloadCriticalImages() {
    const criticalImages = document.querySelectorAll('[data-preload]');
    criticalImages.forEach(img => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = img.src || img.getAttribute('data-src');
      document.head.appendChild(link);
    });
  }
  
  handleImageError(event) {
    if (event.target.tagName === 'IMG') {
      event.target.classList.add('error');
      event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTUwIiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZm9udC1mYW1pbHk9InN5c3RlbS11aSIgZm9udC1zaXplPSIxNCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
    }
  }
  
  adaptToConnection() {
    const connection = navigator.connection;
    
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      document.documentElement.classList.add('slow-connection');
      CineBrain.PERFORMANCE.IMAGE_LAZY_THRESHOLD = '200px';
    }
    
    connection.addEventListener('change', () => {
      this.adaptToConnection();
    });
  }
  
  async initializePage() {
    switch (this.currentPage) {
      case 'home':
        await this.initializeHomePage();
        break;
      case 'auth':
        this.initializeAuthPage();
        break;
      case 'admin':
        if (!Auth.requireAdmin()) return;
        await this.initializeAdminPage();
        break;
      case 'user':
        if (!Auth.requireAuth()) return;
        await this.initializeUserPage();
        break;
      case 'content':
        await this.initializeContentPage();
        break;
    }
    
    // Initialize common components
    this.initializeTopbar();
    this.initializeMobileNav();
    this.initializeSearch();
  }
  
  async initializeHomePage() {
    console.log('Initializing home page...');
    
    try {
      // Load hero content
      await this.loadHeroContent();
      
      // Load recommendation sections
      await Promise.allSettled([
        this.loadTrendingSection(),
        this.loadNewReleasesSection(),
        this.loadCriticsChoiceSection(),
        this.loadGenreSections(),
        this.loadRegionalSections()
      ]);
      
      // Setup infinite scroll for sections
      this.setupInfiniteScroll();
      
    } catch (error) {
      console.error('Home page initialization failed:', error);
    }
  }
  
  async loadHeroContent() {
    const heroContainer = document.querySelector('[data-hero-content]');
    if (!heroContainer) return;
    
    try {
      const result = await API.getTrending('all', 5);
      if (result.success && result.data.recommendations.length > 0) {
        this.displayHeroContent(heroContainer, result.data.recommendations);
        this.startHeroRotation(result.data.recommendations);
      }
    } catch (error) {
      console.error('Hero content loading failed:', error);
    }
  }
  
  displayHeroContent(container, content) {
    const heroItem = content[0];
    container.innerHTML = `
      <div class="hero-background">
        <img src="${heroItem.poster_path || ''}" alt="${heroItem.title}" class="hero-backdrop" />
        <div class="hero-overlay"></div>
      </div>
      <div class="hero-content">
        <div class="hero-info">
          <h1 class="hero-title">${heroItem.title}</h1>
          <div class="hero-meta">
            <span class="rating">⭐ ${heroItem.rating || 'N/A'}</span>
            <span class="type">${heroItem.content_type.toUpperCase()}</span>
            <span class="genres">${heroItem.genres.slice(0, 3).join(' • ')}</span>
          </div>
          <p class="hero-overview">${heroItem.overview || ''}</p>
          <div class="hero-actions">
            <button class="btn btn-primary" onclick="App.playTrailer('${heroItem.youtube_trailer || ''}')">
              <i class="fas fa-play"></i> Watch Trailer
            </button>
            <button class="btn btn-outline" onclick="App.addToWatchlist(${heroItem.id})">
              <i class="fas fa-plus"></i> Watchlist
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  startHeroRotation(content) {
    let currentIndex = 0;
    
    setInterval(() => {
      currentIndex = (currentIndex + 1) % content.length;
      const heroContainer = document.querySelector('[data-hero-content]');
      if (heroContainer) {
        this.displayHeroContent(heroContainer, [content[currentIndex]]);
      }
    }, 5000);
  }
  
  // Event handlers
  handleAuthChange(event) {
    console.log('Auth state changed:', event.type);
    
    // Update UI based on auth state
    this.updateAuthUI();
    
    // Reload personalized content if on home page
    if (this.currentPage === 'home') {
      this.loadPersonalizedSections();
    }
  }
  
  updateAuthUI() {
    const loginButtons = document.querySelectorAll('[data-login-required]');
    const logoutButtons = document.querySelectorAll('[data-logout-action]');
    const userAvatars = document.querySelectorAll('[data-user-avatar]');
    
    loginButtons.forEach(btn => {
      btn.style.display = Auth.isAuthenticated ? 'none' : 'block';
    });
    
    logoutButtons.forEach(btn => {
      btn.style.display = Auth.isAuthenticated ? 'block' : 'none';
    });
    
    userAvatars.forEach(avatar => {
      if (Auth.isAuthenticated) {
        avatar.src = Auth.getUserAvatarUrl();
        avatar.style.display = 'block';
      } else {
        avatar.style.display = 'none';
      }
    });
  }
  
  handleResize() {
    // Update mobile/desktop layout
    CineBrain.IS_MOBILE = window.innerWidth <= 768;
    CineBrain.IS_TABLET = window.innerWidth > 768 && window.innerWidth <= 1024;
    CineBrain.IS_DESKTOP = window.innerWidth > 1024;
    
    // Update layout classes
    document.documentElement.classList.toggle('mobile', CineBrain.IS_MOBILE);
    document.documentElement.classList.toggle('tablet', CineBrain.IS_TABLET);
    document.documentElement.classList.toggle('desktop', CineBrain.IS_DESKTOP);
  }
  
  handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Update topbar transparency
    const topbar = document.querySelector('.topbar');
    if (topbar) {
      topbar.classList.toggle('scrolled', scrollTop > 50);
    }
    
    // Trigger infinite scroll
    if (window.innerHeight + scrollTop >= document.documentElement.offsetHeight - 1000) {
      this.triggerInfiniteScroll();
    }
  }
  
  handleConnectionChange(online) {
    document.documentElement.classList.toggle('offline', !online);
    
    if (online) {
      // Sync data when back online
      API.prefetchCriticalData();
    }
  }
  
  handleGlobalClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.getAttribute('data-action');
    const contentId = target.getAttribute('data-content-id');
    
    this.executeAction(action, { contentId, target, event });
  }
  
  handleGlobalKeydown(event) {
    // Global keyboard shortcuts
    if (event.key === 'Escape') {
      this.closeAllModals();
    } else if (event.key === '/' && !event.target.matches('input, textarea')) {
      event.preventDefault();
      this.focusSearch();
    }
  }
  
  executeAction(action, context) {
    switch (action) {
      case 'play-trailer':
        this.playTrailer(context.target.getAttribute('data-trailer-id'));
        break;
      case 'add-watchlist':
        this.addToWatchlist(context.contentId);
        break;
      case 'add-favorite':
        this.addToFavorites(context.contentId);
        break;
      case 'view-details':
        this.viewContentDetails(context.contentId);
        break;
      case 'login':
        window.location.href = '/auth/login.html';
        break;
      case 'logout':
        Auth.logout();
        break;
      case 'search':
        this.performSearch(context.target.closest('form'));
        break;
    }
  }
  
  // Utility methods
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  generateContentCard(content) {
    return `
      <div class="content-card" data-content-id="${content.id}">
        <div class="card-image">
          <img src="${content.poster_path || ''}" alt="${content.title}" loading="lazy" />
          <div class="card-overlay">
            <button class="btn-icon" data-action="play-trailer" data-trailer-id="${content.youtube_trailer || ''}">
              <i class="fas fa-play"></i>
            </button>
          </div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${content.title}</h3>
          <div class="card-meta">
            <span class="rating">⭐ ${content.rating || 'N/A'}</span>
            <span class="type">${content.content_type}</span>
          </div>
        </div>
      </div>
    `;
  }
}

// Touch handler for mobile gestures
class TouchHandler {
  constructor() {
    this.startX = 0;
    this.startY = 0;
    this.threshold = CineBrain.UI.TOUCH_THRESHOLD;
  }
  
  handleTouchStart(event) {
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
  }
  
  handleTouchMove(event) {
    // Handle pull-to-refresh
    if (window.scrollY === 0) {
      const deltaY = event.touches[0].clientY - this.startY;
      if (deltaY > 100) {
        this.triggerPullToRefresh();
      }
    }
  }
  
  handleTouchEnd(event) {
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    
    const deltaX = endX - this.startX;
    const deltaY = endY - this.startY;
    
    // Swipe detection
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.threshold) {
      if (deltaX > 0) {
        this.handleSwipeRight();
      } else {
        this.handleSwipeLeft();
      }
    }
  }
  
  handleSwipeRight() {
    // Navigate back or show sidebar
    console.log('Swipe right detected');
  }
  
  handleSwipeLeft() {
    // Navigate forward or hide sidebar
    console.log('Swipe left detected');
  }
  
  triggerPullToRefresh() {
    console.log('Pull to refresh triggered');
    // Reload current page data
    window.location.reload();
  }
}

// Initialize app
window.App = new CineBrainApp();

// Export for global use
window.CineBrainApp = CineBrainApp;