// CineBrain Application Controller - Router, Bootstrap, Performance Optimization
class CineBrainApp {
  constructor() {
    this.currentPage = null;
    this.pageControllers = new Map();
    this.intersectionObserver = null;
    this.performanceMetrics = {
      startTime: Date.now(),
      loadTime: null,
      apiCalls: 0,
      cacheHits: 0
    };
    
    this.init();
  }

  // Initialize application
  async init() {
    this.setupPerformanceMonitoring();
    this.initializeBootstrap();
    this.setupIntersectionObserver();
    this.setupGlobalEventListeners();
    this.initializeTheme();
    this.setupRouting();
    this.optimizeImages();
    
    // Wait for authentication to initialize
    await this.waitForAuth();
    
    // Initialize current page
    this.initCurrentPage();
    
    // Mark app as loaded
    this.markAppLoaded();
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Setup performance observer
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.performanceMetrics.loadTime = entry.loadEventEnd - entry.loadEventStart;
            }
          });
        });
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  // Observe Core Web Vitals
  observeWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // First Input Delay (FID)
    this.observeFID();
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS();
  }

  observeLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('LCP:', lastEntry.startTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observation failed:', error);
      }
    }
  }

  observeFID() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          entryList.getEntries().forEach((entry) => {
            console.log('FID:', entry.processingStart - entry.startTime);
          });
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID observation failed:', error);
      }
    }
  }

  observeCLS() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((entryList) => {
          entryList.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          console.log('CLS:', clsValue);
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS observation failed:', error);
      }
    }
  }

  // Initialize Bootstrap components
  initializeBootstrap() {
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

    // Setup Bootstrap modal enhancements
    this.enhanceBootstrapModals();
  }

  // Enhance Bootstrap modals
  enhanceBootstrapModals() {
    document.addEventListener('show.bs.modal', (event) => {
      // Pause any playing videos when modal opens
      this.pauseAllVideos();
    });

    document.addEventListener('hidden.bs.modal', (event) => {
      // Clean up modal content
      this.cleanupModalContent(event.target);
    });
  }

  // Setup Intersection Observer for lazy loading
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.handleIntersection(entry.target);
          }
        });
      }, {
        threshold: PERFORMANCE_CONFIG.INTERSECTION_THRESHOLD,
        rootMargin: PERFORMANCE_CONFIG.IMAGE_LAZY_THRESHOLD
      });

      // Observe all lazy-loadable elements
      this.observeLazyElements();
    }
  }

  // Observe lazy-loadable elements
  observeLazyElements() {
    const lazyElements = document.querySelectorAll('[data-lazy], .lazy-load');
    lazyElements.forEach(element => {
      this.intersectionObserver.observe(element);
    });
  }

  // Handle intersection for lazy loading
  handleIntersection(element) {
    if (element.dataset.lazy) {
      // Lazy load image
      if (element.tagName === 'IMG') {
        element.src = element.dataset.lazy;
        element.classList.add('fade-in');
        element.removeAttribute('data-lazy');
      }
      
      // Lazy load content section
      if (element.classList.contains('lazy-section')) {
        this.loadLazySection(element);
      }
    }

    // Stop observing once loaded
    this.intersectionObserver.unobserve(element);
  }

  // Load lazy section content
  async loadLazySection(element) {
    const sectionType = element.dataset.section;
    const sectionLimit = element.dataset.limit || 20;

    try {
      element.innerHTML = this.getLoadingHTML();
      
      let content = [];
      switch (sectionType) {
        case 'trending':
          content = await window.api.getRecommendations('trending', { limit: sectionLimit });
          break;
        case 'new_releases':
          content = await window.api.getRecommendations('new_releases', { limit: sectionLimit });
          break;
        case 'critics_choice':
          content = await window.api.getRecommendations('critics_choice', { limit: sectionLimit });
          break;
        case 'anime':
          content = await window.api.getRecommendations('anime', { limit: sectionLimit });
          break;
      }

      if (content.length > 0) {
        element.innerHTML = this.renderContentGrid(content);
        this.initializeContentCards(element);
      } else {
        element.innerHTML = this.getEmptyStateHTML(sectionType);
      }
    } catch (error) {
      console.error(`Failed to load ${sectionType} section:`, error);
      element.innerHTML = this.getErrorStateHTML(sectionType);
    }
  }

  // Setup global event listeners
  setupGlobalEventListeners() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAllVideos();
      }
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
      this.handleOnlineStatus(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatus(false);
    });

    // Handle resize for responsive updates
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 250);
    });

    // Handle scroll for performance optimization
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.handleScroll();
      }, 100);
    }, { passive: true });
  }

  // Initialize theme system
  initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_CONFIG.STORAGE_KEY) || THEME_CONFIG.DEFAULT_THEME;
    this.setTheme(savedTheme);
  }

  // Set theme
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_CONFIG.STORAGE_KEY, theme);
    
    // Update theme toggle buttons
    const themeToggles = document.querySelectorAll('.theme-toggle');
    themeToggles.forEach(toggle => {
      toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
      toggle.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    });
  }

  // Setup routing
  setupRouting() {
    // Handle back/forward navigation
    window.addEventListener('popstate', (event) => {
      this.handleRouteChange();
    });

    // Handle internal link clicks
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (link && this.isInternalLink(link)) {
        this.handleLinkClick(event, link);
      }
    });
  }

  // Optimize images
  optimizeImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Add loading="lazy" for performance
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // Add error handling
      img.addEventListener('error', () => {
        img.src = '/assets/no-poster.jpg';
        img.alt = 'Image not available';
      });

      // Add load event for fade-in effect
      img.addEventListener('load', () => {
        img.classList.add('image-loaded');
      });
    });
  }

  // Wait for authentication to initialize
  async waitForAuth() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    while (!window.auth && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.auth) {
      console.error('Authentication system failed to initialize');
    }
  }

  // Initialize current page
  initCurrentPage() {
    const path = window.location.pathname;
    this.currentPage = this.getPageFromPath(path);
    
    // Initialize page-specific functionality
    switch (this.currentPage.type) {
      case 'home':
        this.initHomePage();
        break;
      case 'content':
        this.initContentPage();
        break;
      case 'auth':
        this.initAuthPage();
        break;
      case 'user':
        this.initUserPage();
        break;
      case 'admin':
        this.initAdminPage();
        break;
    }
  }

  // Get page info from path
  getPageFromPath(path) {
    if (path === '/' || path === '/index.html') {
      return { type: 'home', name: 'home' };
    }
    
    if (path.startsWith('/auth/')) {
      return { type: 'auth', name: path.split('/')[2]?.replace('.html', '') || 'login' };
    }
    
    if (path.startsWith('/content/')) {
      return { type: 'content', name: path.split('/')[2]?.replace('.html', '') || 'search' };
    }
    
    if (path.startsWith('/user/')) {
      return { type: 'user', name: path.split('/')[2]?.replace('.html', '') || 'profile' };
    }
    
    if (path.startsWith('/admin/')) {
      return { type: 'admin', name: path.split('/')[2]?.replace('.html', '') || 'index' };
    }
    
    // Username-based profile routes
    const usernameMatch = path.match(/^\/([^\/]+)\/profile$/);
    if (usernameMatch) {
      return { type: 'user', name: 'profile', username: usernameMatch[1] };
    }
    
    return { type: 'unknown', name: 'unknown' };
  }

  // Initialize home page
  initHomePage() {
    console.log('Initializing home page');
    
    // Load components if not already loaded
    this.loadComponentsIfNeeded();
    
    // Initialize hero carousel
    this.initHeroCarousel();
    
    // Setup lazy loading sections
    this.setupLazySections();
  }

  // Initialize content pages
  initContentPage() {
    console.log('Initializing content page:', this.currentPage.name);
    
    switch (this.currentPage.name) {
      case 'search':
        this.initSearchPage();
        break;
      case 'details':
        this.initDetailsPage();
        break;
      case 'anime':
        this.initAnimePage();
        break;
    }
  }

  // Initialize auth pages
  initAuthPage() {
    console.log('Initializing auth page:', this.currentPage.name);
    
    // Redirect if already authenticated
    if (window.auth && window.auth.isAuthenticated()) {
      window.location.href = window.auth.getDefaultRedirectPath();
      return;
    }
  }

  // Initialize user pages
  initUserPage() {
    console.log('Initializing user page:', this.currentPage.name);
    
    // Require authentication for user pages
    if (!window.auth || !window.auth.requireAuth()) {
      return;
    }
  }

  // Initialize admin pages
  initAdminPage() {
    console.log('Initializing admin page:', this.currentPage.name);
    
    // Require admin authentication
    if (!window.auth || !window.auth.requireAdmin()) {
      return;
    }
  }

  // Mark app as loaded
  markAppLoaded() {
    this.performanceMetrics.loadTime = Date.now() - this.performanceMetrics.startTime;
    
    document.body.classList.add('app-loaded');
    
    console.log('CineBrain loaded in', this.performanceMetrics.loadTime, 'ms');
    
    // Dispatch loaded event
    document.dispatchEvent(new CustomEvent('cinebrainLoaded', {
      detail: this.performanceMetrics
    }));
  }

  // Utility methods
  pauseAllVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video.paused) {
        video.pause();
      }
    });
  }

  cleanupModalContent(modal) {
    // Stop any videos in the modal
    const videos = modal.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
      video.src = '';
    });
  }

  handleOnlineStatus(isOnline) {
    if (isOnline) {
      console.log('Back online');
      // Retry failed requests
    } else {
      console.log('Gone offline');
      // Show offline message
    }
  }

  handleResize() {
    // Update mobile navigation visibility
    this.updateMobileNavigation();
    
    // Recalculate grid layouts
    this.updateGridLayouts();
  }

  handleScroll() {
    // Update scroll-based animations
    this.updateScrollAnimations();
  }

  // Helper HTML generators
  getLoadingHTML() {
    return `
      <div class="d-flex justify-content-center p-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
  }

  getEmptyStateHTML(sectionType) {
    return `
      <div class="text-center p-4">
        <i class="fas fa-film text-muted mb-2" style="font-size: 3rem;"></i>
        <h5 class="text-muted">No ${sectionType.replace('_', ' ')} available</h5>
        <p class="text-muted">Check back later for more content</p>
      </div>
    `;
  }

  getErrorStateHTML(sectionType) {
    return `
      <div class="text-center p-4">
        <i class="fas fa-exclamation-triangle text-warning mb-2" style="font-size: 3rem;"></i>
        <h5 class="text-muted">Failed to load ${sectionType.replace('_', ' ')}</h5>
        <button class="btn btn-outline-primary btn-sm" onclick="location.reload()">
          <i class="fas fa-refresh me-1"></i>Try Again
        </button>
      </div>
    `;
  }

  renderContentGrid(content) {
    return content.map(item => `
      <div class="col-6 col-md-4 col-lg-3 col-xl-2 mb-4">
        <div class="content-card" data-content-id="${item.id}">
          <!-- Content card HTML -->
        </div>
      </div>
    `).join('');
  }

  initializeContentCards(container) {
    const cards = container.querySelectorAll('.content-card');
    cards.forEach(card => {
      // Initialize card with real data
      // This would use the component we created earlier
    });
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CineBrainApp();
});

// Global utility functions
window.toggleTheme = function() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  window.app.setTheme(newTheme);
};

window.showToast = function(message, type = 'info') {
  // Create toast notification
  const toastContainer = document.querySelector('.toast-container') || createToastContainer();
  const toast = createToast(message, type);
  toastContainer.appendChild(toast);
  
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  
  // Remove after hidden
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
};

function createToastContainer() {
  const container = document.createElement('div');
  container.className = 'toast-container position-fixed top-0 end-0 p-3';
  document.body.appendChild(container);
  return container;
}

function createToast(message, type) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-body bg-${type === 'error' ? 'danger' : type} text-white">
      ${message}
    </div>
  `;
  return toast;
}