// CineScope Main Application - Real-Time Data Integration
import API, { ContentAPI } from './api.js';
import Auth from './auth.js';
import CONFIG, { UI_CONFIG, PERFORMANCE_CONFIG } from './config.js';

class CineScopeApp {
  constructor() {
    this.isInitialized = false;
    this.performanceMetrics = new Map();
    this.components = new Map();
    this.toastQueue = [];
    this.currentTheme = 'dark';
    
    // Initialize app
    this.init();
  }

  async init() {
    try {
      // Performance mark - start
      performance.mark('app-init-start');
      
      // Initialize core systems
      await this.initializeCore();
      
      // Initialize components
      this.initializeComponents();
      
      // Initialize routing
      this.initializeRouting();
      
      // Initialize event listeners
      this.initializeEventListeners();
      
      // Performance mark - end
      performance.mark('app-init-end');
      performance.measure('app-initialization', 'app-init-start', 'app-init-end');
      
      this.isInitialized = true;
      console.log('🚀 CineScope initialized successfully');
      
      // Dispatch ready event
      window.dispatchEvent(new CustomEvent('appReady'));
      
    } catch (error) {
      console.error('App initialization failed:', error);
      this.showToast('Application failed to load', 'error');
    }
  }

  async initializeCore() {
    // Wait for critical data to be preloaded
    await this.waitForPreload();
    
    // Initialize theme
    this.initializeTheme();
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();
    
    // Initialize UI components
    this.initializeUIComponents();
  }

  async waitForPreload() {
    return new Promise((resolve) => {
      if (window.API && window.API.preloadCache.size > 0) {
        resolve();
      } else {
        window.addEventListener('dataPreloaded', resolve, { once: true });
        // Timeout fallback
        setTimeout(resolve, 2000);
      }
    });
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update theme toggle buttons
    const themeToggles = document.querySelectorAll('.theme-toggle');
    themeToggles.forEach(toggle => {
      toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  setupPerformanceMonitoring() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.performanceMetrics.set('LCP', entry.startTime);
            }
            if (entry.entryType === 'first-input') {
              this.performanceMetrics.set('FID', entry.processingStart - entry.startTime);
            }
            if (entry.entryType === 'layout-shift') {
              this.performanceMetrics.set('CLS', entry.value);
            }
          }
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (e) {
        console.warn('Performance monitoring not supported');
      }
    }
  }

  initializeUIComponents() {
    // Initialize carousel system
    this.initializeCarousels();
    
    // Initialize infinite scroll
    this.initializeInfiniteScroll();
    
    // Initialize modals
    this.initializeModals();
    
    // Initialize toast system
    this.initializeToastSystem();
  }

  initializeCarousels() {
    const carousels = document.querySelectorAll('.content-carousel');
    
    carousels.forEach(carousel => {
      const carouselInstance = new ContentCarousel(carousel);
      this.components.set(carousel.id || 'carousel-' + Date.now(), carouselInstance);
    });
  }

  initializeInfiniteScroll() {
    const scrollContainers = document.querySelectorAll('[data-infinite-scroll]');
    
    scrollContainers.forEach(container => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const endpoint = container.getAttribute('data-endpoint');
            const currentPage = parseInt(container.getAttribute('data-page') || '1');
            
            this.loadMoreContent(container, endpoint, currentPage + 1);
          }
        });
      }, { threshold: 0.1 });
      
      const sentinel = container.querySelector('.scroll-sentinel');
      if (sentinel) {
        observer.observe(sentinel);
      }
    });
  }

  async loadMoreContent(container, endpoint, page) {
    try {
      container.setAttribute('data-loading', 'true');
      
      const response = await API.get(endpoint, { page, limit: 20 });
      const content = response.results || response.recommendations || [];
      
      if (content.length > 0) {
        this.appendContentToContainer(container, content);
        container.setAttribute('data-page', page);
      } else {
        // No more content
        const sentinel = container.querySelector('.scroll-sentinel');
        if (sentinel) sentinel.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Load more content error:', error);
    } finally {
      container.setAttribute('data-loading', 'false');
    }
  }

  appendContentToContainer(container, content) {
    const grid = container.querySelector('.content-grid');
    if (!grid) return;
    
    content.forEach(item => {
      const card = this.createContentCard(item);
      grid.appendChild(card);
    });
  }

  createContentCard(contentData) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.setAttribute('data-content-id', contentData.id);
    
    const posterUrl = contentData.poster_path || '/images/placeholder-poster.jpg';
    const rating = contentData.rating ? contentData.rating.toFixed(1) : 'N/A';
    const genres = contentData.genres ? contentData.genres.slice(0, 2).join(', ') : '';
    
    card.innerHTML = `
      <div class="card-poster-wrapper">
        <img class="card-poster" src="${posterUrl}" alt="${contentData.title}" loading="lazy">
        <div class="card-overlay">
          <div class="card-actions">
            <button class="action-btn play-btn" onclick="app.playTrailer(${contentData.id})">▶️</button>
            <button class="action-btn wishlist-btn" onclick="app.toggleWishlist(${contentData.id})">📋</button>
            <button class="action-btn favorite-btn" onclick="app.toggleFavorite(${contentData.id})">❤️</button>
          </div>
          <div class="card-info">
            <h3>${contentData.title}</h3>
            <div class="card-meta">
              <span>⭐ ${rating}</span>
              <span>${contentData.content_type.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="card-details">
        <h4>${contentData.title}</h4>
        <p class="card-genres">${genres}</p>
      </div>
    `;
    
    // Add click handler
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.action-btn')) {
        this.navigateToDetails(contentData.id);
      }
    });
    
    return card;
  }

  initializeModals() {
    // Trailer modal
    this.trailerModal = new TrailerModal();
    
    // Filter modal  
    this.filterModal = new FilterModal();
  }

  initializeToastSystem() {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
    this.toastContainer = toastContainer;
  }

  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = {
      success: '✅',
      error: '❌', 
      warning: '⚠️',
      info: 'ℹ️'
    }[type] || 'ℹ️';
    
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    this.toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, duration);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });
  }

  initializeRouting() {
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });
    
    // Handle initial route
    this.handleRouteChange();
  }

  handleRouteChange() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    // Update page-specific logic based on route
    if (path.includes('/profile')) {
      this.initializeProfilePage();
    } else if (path.includes('/search')) {
      this.initializeSearchPage(params.get('query'));
    } else if (path.includes('/details')) {
      this.initializeDetailsPage(params.get('id'));
    }
  }

  initializeEventListeners() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.focusSearch();
      }
      
      if (e.key === 'Escape') {
        this.closeModals();
      }
    });
    
    // Theme toggle
    document.addEventListener('click', (e) => {
      if (e.target.matches('.theme-toggle')) {
        this.toggleTheme();
      }
    });
    
    // Auth state changes
    window.addEventListener('userLoggedIn', () => {
      this.onUserLogin();
    });
    
    window.addEventListener('userLoggedOut', () => {
      this.onUserLogout();
    });
  }

  focusSearch() {
    const searchInput = document.getElementById('topbar-search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  closeModals() {
    // Close all open modals
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => {
      modal.classList.remove('show');
    });
  }

  onUserLogin() {
    // Refresh personalized content
    this.refreshPersonalizedContent();
    
    // Update navigation
    this.updateNavigation();
  }

  onUserLogout() {
    // Clear personalized caches
    API.clearCache();
    
    // Refresh with anonymous content
    this.refreshAnonymousContent();
  }

  async refreshPersonalizedContent() {
    try {
      const recommendations = await Auth.getPersonalizedRecommendations();
      this.updateRecommendationsSections(recommendations);
    } catch (error) {
      console.error('Failed to refresh personalized content:', error);
    }
  }

  async refreshAnonymousContent() {
    try {
      const recommendations = await ContentAPI.getAnonymous();
      this.updateRecommendationsSections(recommendations);
    } catch (error) {
      console.error('Failed to refresh anonymous content:', error);
    }
  }

  updateRecommendationsSections(recommendations) {
    const sections = document.querySelectorAll('[data-recommendations]');
    sections.forEach(section => {
      const type = section.getAttribute('data-recommendations');
      const content = recommendations.recommendations || recommendations;
      
      if (content && content.length > 0) {
        this.renderContentGrid(section, content);
      }
    });
  }

  renderContentGrid(container, content) {
    const grid = container.querySelector('.content-grid') || container;
    grid.innerHTML = '';
    
    content.forEach(item => {
      const card = this.createContentCard(item);
      grid.appendChild(card);
    });
  }

  // Content interaction methods
  async playTrailer(contentId) {
    try {
      const content = await ContentAPI.getDetails(contentId);
      
      if (content.youtube_trailer) {
        this.trailerModal.show(content.youtube_trailer, content.title);
        
        // Record interaction
        if (Auth.isAuthenticated()) {
          Auth.recordInteraction(contentId, 'view');
        }
      } else {
        this.showToast('Trailer not available', 'warning');
      }
    } catch (error) {
      console.error('Play trailer error:', error);
      this.showToast('Failed to load trailer', 'error');
    }
  }

  async toggleWishlist(contentId) {
    if (!Auth.isAuthenticated()) {
      this.showToast('Please log in to add to watchlist', 'warning');
      return;
    }
    
    try {
      await Auth.recordInteraction(contentId, 'watchlist');
      this.showToast('Added to watchlist', 'success');
    } catch (error) {
      console.error('Watchlist error:', error);
      this.showToast('Failed to update watchlist', 'error');
    }
  }

  async toggleFavorite(contentId) {
    if (!Auth.isAuthenticated()) {
      this.showToast('Please log in to add to favorites', 'warning');
      return;
    }
    
    try {
      await Auth.recordInteraction(contentId, 'favorite');
      this.showToast('Added to favorites', 'success');
    } catch (error) {
      console.error('Favorites error:', error);
      this.showToast('Failed to update favorites', 'error');
    }
  }

  navigateToDetails(contentId) {
    window.location.href = `/content/details.html?id=${contentId}`;
  }

  // Page-specific initialization
  async initializeProfilePage() {
    if (!Auth.requireAuth()) return;
    
    // Load user-specific data
    const [watchlist, favorites, recommendations] = await Promise.all([
      Auth.getUserWatchlist(),
      Auth.getUserFavorites(), 
      Auth.getMLRecommendations()
    ]);
    
    this.renderUserContent('watchlist', watchlist);
    this.renderUserContent('favorites', favorites);
    this.renderUserContent('recommendations', recommendations.recommendations || []);
  }

  async initializeSearchPage(query) {
    if (query) {
      const results = await ContentAPI.search(query);
      this.renderSearchResults(results.results || []);
    }
  }

  async initializeDetailsPage(contentId) {
    if (!contentId) return;
    
    try {
      const content = await ContentAPI.getDetails(contentId);
      this.renderContentDetails(content);
      
      const similar = await ContentAPI.getSimilar(contentId);
      this.renderSimilarContent(similar.recommendations || []);
      
      // Record view interaction
      if (Auth.isAuthenticated()) {
        Auth.recordInteraction(contentId, 'view');
      }
    } catch (error) {
      console.error('Details page error:', error);
      this.showToast('Failed to load content details', 'error');
    }
  }

  renderUserContent(type, content) {
    const container = document.querySelector(`[data-user-${type}]`);
    if (container && content.length > 0) {
      this.renderContentGrid(container, content);
    }
  }

  renderSearchResults(results) {
    const container = document.querySelector('.search-results');
    if (container) {
      this.renderContentGrid(container, results);
    }
  }

  renderContentDetails(content) {
    // Update page elements with content data
    const titleElements = document.querySelectorAll('[data-content-title]');
    titleElements.forEach(el => el.textContent = content.title);
    
    const overviewElements = document.querySelectorAll('[data-content-overview]');
    overviewElements.forEach(el => el.textContent = content.overview);
    
    const posterElements = document.querySelectorAll('[data-content-poster]');
    posterElements.forEach(el => el.src = content.poster_path);
    
    const backdropElements = document.querySelectorAll('[data-content-backdrop]');
    backdropElements.forEach(el => el.src = content.backdrop_path);
  }

  renderSimilarContent(similar) {
    const container = document.querySelector('[data-similar-content]');
    if (container && similar.length > 0) {
      this.renderContentGrid(container, similar);
    }
  }

  // Utility methods
  updateNavigation() {
    // Update navigation based on auth state
    const navItems = document.querySelectorAll('[data-nav-auth]');
    navItems.forEach(item => {
      const requiredAuth = item.getAttribute('data-nav-auth') === 'true';
      item.style.display = (Auth.isAuthenticated() === requiredAuth) ? '' : 'none';
    });
  }

  // Performance utilities
  getPerformanceMetrics() {
    return Object.fromEntries(this.performanceMetrics);
  }

  logPerformance() {
    const metrics = this.getPerformanceMetrics();
    console.table(metrics);
  }
}

// Carousel Component
class ContentCarousel {
  constructor(element) {
    this.element = element;
    this.container = element.querySelector('.carousel-container');
    this.track = element.querySelector('.carousel-track');
    this.items = [];
    this.currentIndex = 0;
    this.isAnimating = false;
    
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupTouchHandling();
    this.setupKeyboardHandling();
    this.updateItems();
  }

  setupNavigation() {
    const prevBtn = this.element.querySelector('.carousel-prev');
    const nextBtn = this.element.querySelector('.carousel-next');
    
    if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
    if (nextBtn) nextBtn.addEventListener('click', () => this.next());
  }

  setupTouchHandling() {
    let startX = 0;
    let startY = 0;
    
    this.track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });
    
    this.track.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = startX - endX;
      const deltaY = startY - endY;
      
      // Only handle horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          this.next();
        } else {
          this.prev();
        }
      }
    });
  }

  setupKeyboardHandling() {
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });
  }

  updateItems() {
    this.items = Array.from(this.track.children);
  }

  next() {
    if (this.isAnimating || this.items.length === 0) return;
    
    this.isAnimating = true;
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.updatePosition();
  }

  prev() {
    if (this.isAnimating || this.items.length === 0) return;
    
    this.isAnimating = true;
    this.currentIndex = this.currentIndex === 0 ? this.items.length - 1 : this.currentIndex - 1;
    this.updatePosition();
  }

  updatePosition() {
    const itemWidth = this.items[0]?.offsetWidth || 200;
    const gap = 16; // CSS gap value
    const offset = -(this.currentIndex * (itemWidth + gap));
    
    this.track.style.transform = `translateX(${offset}px)`;
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }

  addItems(newItems) {
    newItems.forEach(item => {
      const card = window.app.createContentCard(item);
      this.track.appendChild(card);
    });
    
    this.updateItems();
  }
}

// Trailer Modal Component
class TrailerModal {
  constructor() {
    this.createModal();
  }

  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'modal trailer-modal';
    this.modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.closest('.modal').classList.remove('show')"></div>
      <div class="modal-content">
        <button class="modal-close" onclick="this.closest('.modal').classList.remove('show')">×</button>
        <div class="trailer-container">
          <iframe src="" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
  }

  show(trailerUrl, title) {
    const iframe = this.modal.querySelector('iframe');
    
    // Convert YouTube URL to embed format
    if (trailerUrl.includes('youtube.com/watch')) {
      const videoId = trailerUrl.split('v=')[1]?.split('&')[0];
      trailerUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    
    iframe.src = trailerUrl;
    this.modal.classList.add('show');
    
    // Pause other videos
    const otherVideos = document.querySelectorAll('video, iframe[src*="youtube"]');
    otherVideos.forEach(video => {
      if (video !== iframe) {
        video.pause?.();
        if (video.tagName === 'IFRAME') {
          video.src = video.src; // Reload to stop
        }
      }
    });
  }

  hide() {
    this.modal.classList.remove('show');
    const iframe = this.modal.querySelector('iframe');
    iframe.src = '';
  }
}

// Filter Modal Component  
class FilterModal {
  constructor() {
    this.createModal();
    this.filters = {};
  }

  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'modal filter-modal';
    this.modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.closest('.modal').classList.remove('show')"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Filter Content</h3>
          <button class="modal-close" onclick="this.closest('.modal').classList.remove('show')">×</button>
        </div>
        <div class="modal-body">
          <div class="filter-section">
            <h4>Content Type</h4>
            <div class="filter-options">
              <label><input type="checkbox" value="movie"> Movies</label>
              <label><input type="checkbox" value="tv"> TV Shows</label>
              <label><input type="checkbox" value="anime"> Anime</label>
            </div>
          </div>
          <div class="filter-section">
            <h4>Genres</h4>
            <div class="filter-options" id="genre-filters">
              <!-- Populated dynamically -->
            </div>
          </div>
          <div class="filter-section">
            <h4>Rating</h4>
            <div class="rating-slider">
              <input type="range" min="0" max="10" step="0.1" value="0" id="rating-min">
              <span id="rating-display">0.0+</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.filter-modal-instance').clearFilters()">Clear</button>
          <button class="btn btn-primary" onclick="this.closest('.modal').querySelector('.filter-modal-instance').applyFilters()">Apply</button>
        </div>
      </div>
    `;
    
    this.modal.querySelector('.modal-content').filterModalInstance = this;
    document.body.appendChild(this.modal);
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    const ratingSlider = this.modal.querySelector('#rating-min');
    const ratingDisplay = this.modal.querySelector('#rating-display');
    
    ratingSlider.addEventListener('input', (e) => {
      ratingDisplay.textContent = parseFloat(e.target.value).toFixed(1) + '+';
    });
  }

  show() {
    this.modal.classList.add('show');
    this.populateGenres();
  }

  async populateGenres() {
    const genreContainer = this.modal.querySelector('#genre-filters');
    const commonGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'];
    
    genreContainer.innerHTML = commonGenres.map(genre => 
      `<label><input type="checkbox" value="${genre}"> ${genre}</label>`
    ).join('');
  }

  clearFilters() {
    const checkboxes = this.modal.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    const ratingSlider = this.modal.querySelector('#rating-min');
    ratingSlider.value = 0;
    
    this.filters = {};
  }

  applyFilters() {
    const types = Array.from(this.modal.querySelectorAll('input[value="movie"], input[value="tv"], input[value="anime"]'))
      .filter(input => input.checked)
      .map(input => input.value);
    
    const genres = Array.from(this.modal.querySelectorAll('#genre-filters input:checked'))
      .map(input => input.value);
    
    const minRating = parseFloat(this.modal.querySelector('#rating-min').value);
    
    this.filters = {
      types: types.length > 0 ? types : null,
      genres: genres.length > 0 ? genres : null,
      minRating: minRating > 0 ? minRating : null
    };
    
    // Dispatch filter event
    window.dispatchEvent(new CustomEvent('filtersApplied', {
      detail: this.filters
    }));
    
    this.modal.classList.remove('show');
  }
}

// Initialize application
const app = new CineScopeApp();

// Global exports
window.app = app;
window.showToast = app.showToast.bind(app);
window.TrailerModal = TrailerModal;
window.ContentCarousel = ContentCarousel;

export default app;