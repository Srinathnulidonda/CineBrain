// ========================================
// GLOBAL CONFIGURATION
// ========================================
const API_BASE = 'https://backend-app-970m.onrender.com/api';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// ========================================
// GLOBAL STATE MANAGEMENT
// ========================================
class AppState {
  constructor() {
    this.user = null;
    this.token = null;
    this.loading = false;
    this.currentPage = 'home';
    this.searchCache = new Map();
    this.requestQueue = [];
    this.isOnline = navigator.onLine;
    
    this.init();
  }
  
  init() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.initServiceWorker();
  }
  
  loadFromStorage() {
    // Note: Using variables only as per requirements
    const userData = window.appUserData;
    const token = window.appToken;
    
    if (userData && token) {
      this.user = userData;
      this.token = token;
    }
  }
  
  saveToStorage() {
    window.appUserData = this.user;
    window.appToken = this.token;
  }
  
  clearStorage() {
    window.appUserData = null;
    window.appToken = null;
    this.user = null;
    this.token = null;
  }
  
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processRequestQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    // Handle back/forward navigation
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.navigateTo(e.state.page, false);
      }
    });
  }
  
  async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }
  
  navigateTo(page, addToHistory = true) {
    this.currentPage = page;
    if (addToHistory) {
      history.pushState({ page }, '', `/${page}`);
    }
    this.updatePageContent();
  }
  
  updatePageContent() {
    // This will be implemented by specific page handlers
    const event = new CustomEvent('pagechange', { detail: { page: this.currentPage } });
    window.dispatchEvent(event);
  }
  
  setLoading(loading) {
    this.loading = loading;
    this.updateLoadingState();
  }
  
  updateLoadingState() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = this.loading ? 'flex' : 'none';
    }
  }
  
  addToRequestQueue(request) {
    this.requestQueue.push(request);
  }
  
  async processRequestQueue() {
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      try {
        await request();
      } catch (error) {
        console.error('Queued request failed:', error);
      }
    }
  }
}

// ========================================
// API SERVICE
// ========================================
class ApiService {
  constructor() {
    this.baseURL = API_BASE;
    this.cache = new Map();
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }
  
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }
  
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
    
    // Check cache for GET requests
    if (options.method !== 'POST' && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes
        return cached.data;
      }
    }
    
    // Default options
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Add auth token if available
    if (appState.token) {
      defaultOptions.headers.Authorization = `Bearer ${appState.token}`;
    }
    
    const requestOptions = { ...defaultOptions, ...options };
    
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      requestOptions = await interceptor(requestOptions);
    }
    
    try {
      const response = await fetch(url, requestOptions);
      
      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        await interceptor(response);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache successful GET requests
      if (options.method !== 'POST') {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      return data;
    } catch (error) {
      // Handle offline scenario
      if (!navigator.onLine) {
        appState.addToRequestQueue(() => this.request(endpoint, options));
        throw new Error('You are offline. Request will be retried when connection is restored.');
      }
      throw error;
    }
  }
  
  // Authentication
  async login(credentials) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }
  
  async register(userData) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
  
  // Content Discovery
  async search(query, type = 'multi', page = 1) {
    return this.request(`/search?query=${encodeURIComponent(query)}&type=${type}&page=${page}`);
  }
  
  async getContentDetails(contentId) {
    return this.request(`/content/${contentId}`);
  }
  
  // Recommendations
  async getTrending(type = 'all', limit = 20) {
    return this.request(`/recommendations/trending?type=${type}&limit=${limit}`);
  }
  
  async getNewReleases(language = null, type = 'movie', limit = 20) {
    const params = new URLSearchParams({ type, limit });
    if (language) params.append('language', language);
    return this.request(`/recommendations/new-releases?${params}`);
  }
  
  async getCriticsChoice(type = 'movie', limit = 20) {
    return this.request(`/recommendations/critics-choice?type=${type}&limit=${limit}`);
  }
  
  async getGenreRecommendations(genre, type = 'movie', limit = 20) {
    return this.request(`/recommendations/genre/${genre}?type=${type}&limit=${limit}`);
  }
  
  async getRegionalContent(language, type = 'movie', limit = 20) {
    return this.request(`/recommendations/regional/${language}?type=${type}&limit=${limit}`);
  }
  
  async getAnimeRecommendations(genre = null, limit = 20) {
    const params = new URLSearchParams({ limit });
    if (genre) params.append('genre', genre);
    return this.request(`/recommendations/anime?${params}`);
  }
  
  async getPersonalizedRecommendations(limit = 20) {
    return this.request(`/recommendations/personalized?limit=${limit}`);
  }
  
  async getAnonymousRecommendations(limit = 20) {
    return this.request(`/recommendations/anonymous?limit=${limit}`);
  }
  
  async getSimilarContent(contentId, limit = 20) {
    return this.request(`/recommendations/similar/${contentId}?limit=${limit}`);
  }
  
  // User Interactions
  async recordInteraction(contentId, interactionType, rating = null) {
    return this.request('/interactions', {
      method: 'POST',
      body: JSON.stringify({
        content_id: contentId,
        interaction_type: interactionType,
        rating
      })
    });
  }
  
  async getWatchlist() {
    return this.request('/user/watchlist');
  }
  
  async getFavorites() {
    return this.request('/user/favorites');
  }
}

// ========================================
// UI UTILITIES
// ========================================
class UIUtils {
  static showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    // Add toast styles if not already present
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--bg-card);
          border: 1px solid var(--bg-hover);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          box-shadow: var(--shadow-large);
          z-index: 10000;
          max-width: 350px;
          word-wrap: break-word;
        }
        .toast-success { border-left: 4px solid #10b981; }
        .toast-error { border-left: 4px solid #ef4444; }
        .toast-warning { border-left: 4px solid #f59e0b; }
        .toast-info { border-left: 4px solid var(--blue-500); }
        .toast-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-sm);
        }
        .toast-message { color: var(--text-primary); flex: 1; }
        .toast-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1.25rem;
          padding: 0;
          line-height: 1;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  static showModal(content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${options.title || ''}</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    return modal;
  }
  
  static createLoadingSpinner() {
    return `
      <div class="loading-spinner-container" style="display: flex; justify-content: center; padding: 2rem;">
        <div class="loading-spinner"></div>
      </div>
    `;
  }
  
  static createSkeletonCard() {
    return `
      <div class="movie-card">
        <div class="skeleton skeleton-image"></div>
        <div class="movie-card-overlay" style="opacity: 1; background: var(--bg-card); padding: 1rem;">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text" style="width: 80%;"></div>
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
        </div>
      </div>
    `;
  }
  
  static formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  static formatRating(rating) {
    if (!rating) return 'N/A';
    return `${rating.toFixed(1)}/10`;
  }
  
  static createStarRating(rating, maxStars = 5) {
    const stars = Math.round((rating / 10) * maxStars);
    let html = '';
    for (let i = 0; i < maxStars; i++) {
      html += i < stars ? '★' : '☆';
    }
    return html;
  }
  
  static debounce(func, wait) {
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
  
  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }
  
  static lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
}

// ========================================
// COMPONENT FACTORIES
// ========================================
class ComponentFactory {
  static createMovieCard(movie, options = {}) {
    const {
      showOverlay = true,
      showBadges = true,
      size = 'normal'
    } = options;
    
    const badgeHTML = showBadges ? this.createBadges(movie) : '';
    const overlayHTML = showOverlay ? this.createOverlay(movie) : '';
    const sizeClass = size === 'small' ? 'movie-card-small' : '';
    
    return `
      <div class="movie-card ${sizeClass}" data-movie-id="${movie.id}" onclick="navigateToDetails(${movie.id})">
        ${badgeHTML}
        <img 
          class="movie-card-image" 
          data-src="${this.getImageUrl(movie.poster_path)}"
          alt="${movie.title}"
          loading="lazy"
        />
        ${overlayHTML}
      </div>
    `;
  }
  
  static createBadges(movie) {
    let badges = '';
    
    if (movie.is_trending) {
      badges += '<div class="movie-card-badge trending">Trending</div>';
    } else if (movie.is_new_release) {
      badges += '<div class="movie-card-badge new">New</div>';
    } else if (movie.is_critics_choice) {
      badges += '<div class="movie-card-badge critics">Critics\' Choice</div>';
    }
    
    return badges;
  }
  
  static createOverlay(movie) {
    return `
      <div class="movie-card-overlay">
        <h4 class="movie-card-title">${movie.title}</h4>
        <div class="movie-card-meta">
          <span class="movie-card-rating">
            ★ ${UIUtils.formatRating(movie.rating)}
          </span>
          <span>${movie.content_type.toUpperCase()}</span>
        </div>
        <div class="movie-card-actions">
          <button class="movie-card-btn movie-card-btn-primary" onclick="event.stopPropagation(); addToWatchlist(${movie.id})">
            + Watchlist
          </button>
          <button class="movie-card-btn movie-card-btn-secondary" onclick="event.stopPropagation(); toggleFavorite(${movie.id})">
            ♡
          </button>
        </div>
      </div>
    `;
  }
  
  static getImageUrl(posterPath) {
    if (!posterPath) return '/assets/images/placeholder-poster.jpg';
    if (posterPath.startsWith('http')) return posterPath;
    return `${TMDB_IMAGE_BASE}${posterPath}`;
  }
  
  static createCarousel(title, movies, options = {}) {
    const {
      showControls = true,
      enableTouch = true,
      itemsPerView = 6
    } = options;
    
    const carouselId = `carousel-${Date.now()}`;
    const controlsHTML = showControls ? `
      <div class="carousel-controls">
        <button class="carousel-btn carousel-prev" data-carousel="${carouselId}">‹</button>
        <button class="carousel-btn carousel-next" data-carousel="${carouselId}">›</button>
      </div>
    ` : '';
    
    const touchClass = enableTouch ? 'touch-scroll' : '';
    
    return `
      <section class="carousel" id="${carouselId}">
        <div class="carousel-header">
          <h2 class="carousel-title">${title}</h2>
          ${controlsHTML}
        </div>
        <div class="carousel-container ${touchClass}">
          <div class="carousel-track">
            ${movies.map(movie => this.createMovieCard(movie)).join('')}
          </div>
        </div>
      </section>
    `;
  }
  
  static createHeroSection(movie) {
    return `
      <section class="hero" style="background-image: url('${this.getImageUrl(movie.backdrop_path)}')">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <h1 class="hero-title">${movie.title}</h1>
          <p class="hero-description">${movie.overview}</p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" onclick="playTrailer('${movie.youtube_trailer}')">
              ▶ Watch Trailer
            </button>
            <button class="btn btn-outline btn-lg" onclick="navigateToDetails(${movie.id})">
              More Info
            </button>
          </div>
        </div>
      </section>
    `;
  }
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================
class SearchManager {
  constructor() {
    this.searchInput = null;
    this.searchResults = null;
    this.searchTimeout = null;
    this.currentQuery = '';
    this.isSearching = false;
    
    this.init();
  }
  
  init() {
    this.searchInput = document.querySelector('.navbar-search-input');
    this.searchResults = document.querySelector('.search-results');
    
    if (this.searchInput) {
      this.setupEventListeners();
    }
  }
  
  setupEventListeners() {
    this.searchInput.addEventListener('input', UIUtils.debounce((e) => {
      this.handleSearch(e.target.value);
    }, 300));
    
    this.searchInput.addEventListener('focus', () => {
      if (this.currentQuery) {
        this.showResults();
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.navbar-search')) {
        this.hideResults();
      }
    });
    
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideResults();
        this.searchInput.blur();
      }
    });
  }
  
  async handleSearch(query) {
    this.currentQuery = query.trim();
    
    if (this.currentQuery.length < 2) {
      this.hideResults();
      return;
    }
    
    this.isSearching = true;
    this.showLoadingResults();
    
    try {
      const results = await apiService.search(this.currentQuery);
      this.displayResults(results.results);
    } catch (error) {
      console.error('Search error:', error);
      this.showErrorResults();
    } finally {
      this.isSearching = false;
    }
  }
  
  showLoadingResults() {
    if (!this.searchResults) {
      this.createResultsContainer();
    }
    
    this.searchResults.innerHTML = `
      <div class="search-result-item">
        <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
        <span style="margin-left: 1rem; color: var(--text-muted);">Searching...</span>
      </div>
    `;
    this.showResults();
  }
  
  showErrorResults() {
    this.searchResults.innerHTML = `
      <div class="search-result-item">
        <span style="color: var(--text-muted);">Search failed. Please try again.</span>
      </div>
    `;
  }
  
  displayResults(results) {
    if (!results || results.length === 0) {
      this.searchResults.innerHTML = `
        <div class="search-result-item">
          <span style="color: var(--text-muted);">No results found for "${this.currentQuery}"</span>
        </div>
      `;
      return;
    }
    
    this.searchResults.innerHTML = results.slice(0, 8).map(item => `
      <a href="/details?id=${item.id}" class="search-result-item" onclick="event.preventDefault(); navigateToDetails(${item.id})">
        <img 
          class="search-result-image" 
          src="${ComponentFactory.getImageUrl(item.poster_path)}"
          alt="${item.title}"
          loading="lazy"
        />
        <div class="search-result-content">
          <div class="search-result-title">${item.title}</div>
          <div class="search-result-meta">
            <span>${item.content_type.toUpperCase()}</span>
            ${item.rating ? `<span>★ ${UIUtils.formatRating(item.rating)}</span>` : ''}
            ${item.release_date ? `<span>${new Date(item.release_date).getFullYear()}</span>` : ''}
          </div>
        </div>
      </a>
    `).join('');
  }
  
  createResultsContainer() {
    this.searchResults = document.createElement('div');
    this.searchResults.className = 'search-results';
    this.searchInput.parentElement.appendChild(this.searchResults);
  }
  
  showResults() {
    if (this.searchResults) {
      this.searchResults.classList.add('active');
    }
  }
  
  hideResults() {
    if (this.searchResults) {
      this.searchResults.classList.remove('active');
    }
  }
}

// ========================================
// CAROUSEL MANAGER
// ========================================
class CarouselManager {
  constructor() {
    this.carousels = new Map();
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.initializeCarousels();
  }
  
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('carousel-prev')) {
        const carouselId = e.target.dataset.carousel;
        this.scrollCarousel(carouselId, 'prev');
      } else if (e.target.classList.contains('carousel-next')) {
        const carouselId = e.target.dataset.carousel;
        this.scrollCarousel(carouselId, 'next');
      }
    });
    
    // Touch support for mobile
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
  }
  
  initializeCarousels() {
    const carouselElements = document.querySelectorAll('.carousel');
    carouselElements.forEach(carousel => {
      const id = carousel.id;
      const track = carousel.querySelector('.carousel-track');
      const container = carousel.querySelector('.carousel-container');
      
      if (track && container) {
        this.carousels.set(id, {
          element: carousel,
          track,
          container,
          currentIndex: 0,
          itemWidth: 220, // 200px + 20px gap
          itemsPerView: this.calculateItemsPerView(container)
        });
      }
    });
  }
  
  calculateItemsPerView(container) {
    const containerWidth = container.offsetWidth;
    return Math.floor(containerWidth / 220);
  }
  
  scrollCarousel(carouselId, direction) {
    const carousel = this.carousels.get(carouselId);
    if (!carousel) return;
    
    const { track, currentIndex, itemWidth, itemsPerView } = carousel;
    const totalItems = track.children.length;
    const maxIndex = Math.max(0, totalItems - itemsPerView);
    
    let newIndex = currentIndex;
    if (direction === 'next') {
      newIndex = Math.min(currentIndex + itemsPerView, maxIndex);
    } else {
      newIndex = Math.max(currentIndex - itemsPerView, 0);
    }
    
    carousel.currentIndex = newIndex;
    const translateX = -(newIndex * itemWidth);
    track.style.transform = `translateX(${translateX}px)`;
    
    this.updateCarouselButtons(carouselId);
  }
  
  updateCarouselButtons(carouselId) {
    const carousel = this.carousels.get(carouselId);
    if (!carousel) return;
    
    const { element, currentIndex, itemsPerView } = carousel;
    const totalItems = element.querySelector('.carousel-track').children.length;
    const maxIndex = Math.max(0, totalItems - itemsPerView);
    
    const prevBtn = element.querySelector('.carousel-prev');
    const nextBtn = element.querySelector('.carousel-next');
    
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
  }
  
  // Touch handling
  handleTouchStart(e) {
    const carousel = e.target.closest('.carousel-container.touch-scroll');
    if (!carousel) return;
    
    this.touchStartX = e.touches[0].clientX;
    this.touchStartTime = Date.now();
  }
  
  handleTouchMove(e) {
    if (!this.touchStartX) return;
    
    this.touchCurrentX = e.touches[0].clientX;
  }
  
  handleTouchEnd(e) {
    if (!this.touchStartX || !this.touchCurrentX) return;
    
    const diffX = this.touchStartX - this.touchCurrentX;
    const diffTime = Date.now() - this.touchStartTime;
    
    // Swipe detection
    if (Math.abs(diffX) > 50 && diffTime < 300) {
      const carousel = e.target.closest('.carousel');
      if (carousel) {
        const direction = diffX > 0 ? 'next' : 'prev';
        this.scrollCarousel(carousel.id, direction);
      }
    }
    
    this.touchStartX = null;
    this.touchCurrentX = null;
    this.touchStartTime = null;
  }
}

// ========================================
// GLOBAL FUNCTIONS
// ========================================
async function navigateToDetails(contentId) {
  appState.navigateTo(`details?id=${contentId}`);
}

async function addToWatchlist(contentId) {
  if (!appState.user) {
    UIUtils.showToast('Please login to add to watchlist', 'warning');
    return;
  }
  
  try {
    await apiService.recordInteraction(contentId, 'watchlist');
    UIUtils.showToast('Added to watchlist', 'success');
  } catch (error) {
    UIUtils.showToast('Failed to add to watchlist', 'error');
  }
}

async function toggleFavorite(contentId) {
  if (!appState.user) {
    UIUtils.showToast('Please login to add favorites', 'warning');
    return;
  }
  
  try {
    await apiService.recordInteraction(contentId, 'favorite');
    UIUtils.showToast('Added to favorites', 'success');
  } catch (error) {
    UIUtils.showToast('Failed to add to favorites', 'error');
  }
}

function playTrailer(youtubeUrl) {
  if (!youtubeUrl) {
    UIUtils.showToast('Trailer not available', 'warning');
    return;
  }
  window.open(youtubeUrl, '_blank');
}

function showLoginModal() {
  const loginHTML = `
    <form id="loginForm" class="space-y-4">
      <div class="form-group">
        <label class="form-label">Username</label>
        <input type="text" name="username" class="form-input" required>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" name="password" class="form-input" required>
      </div>
      <button type="submit" class="btn btn-primary w-full">Login</button>
      <p class="text-center text-muted">
        Don't have an account? 
        <a href="#" onclick="showRegisterModal()" class="text-blue">Register here</a>
      </p>
    </form>
  `;
  
  const modal = UIUtils.showModal(loginHTML, { title: 'Login' });
  
  const form = modal.querySelector('#loginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const credentials = {
      username: formData.get('username'),
      password: formData.get('password')
    };
    
    try {
      const response = await apiService.login(credentials);
      appState.user = response.user;
      appState.token = response.token;
      appState.saveToStorage();
      
      modal.remove();
      UIUtils.showToast('Login successful!', 'success');
      updateAuthUI();
    } catch (error) {
      UIUtils.showToast('Login failed: ' + error.message, 'error');
    }
  });
}

function showRegisterModal() {
  const registerHTML = `
    <form id="registerForm" class="space-y-4">
      <div class="form-group">
        <label class="form-label">Username</label>
        <input type="text" name="username" class="form-input" required>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" name="email" class="form-input" required>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" name="password" class="form-input" required>
      </div>
      <button type="submit" class="btn btn-primary w-full">Register</button>
      <p class="text-center text-muted">
        Already have an account? 
        <a href="#" onclick="showLoginModal()" class="text-blue">Login here</a>
      </p>
    </form>
  `;
  
  const modal = UIUtils.showModal(registerHTML, { title: 'Register' });
  
  const form = modal.querySelector('#registerForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const userData = {
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password')
    };
    
    try {
      const response = await apiService.register(userData);
      appState.user = response.user;
      appState.token = response.token;
      appState.saveToStorage();
      
      modal.remove();
      UIUtils.showToast('Registration successful!', 'success');
      updateAuthUI();
    } catch (error) {
      UIUtils.showToast('Registration failed: ' + error.message, 'error');
    }
  });
}

function logout() {
  appState.clearStorage();
  updateAuthUI();
  UIUtils.showToast('Logged out successfully', 'info');
  appState.navigateTo('');
}

function updateAuthUI() {
  const authButtons = document.querySelector('.navbar-actions');
  if (!authButtons) return;
  
  if (appState.user) {
    authButtons.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-ghost">${appState.user.username} ▼</button>
        <div class="dropdown-menu">
          <a href="#" class="dropdown-item" onclick="appState.navigateTo('dashboard')">Dashboard</a>
          <a href="#" class="dropdown-item" onclick="appState.navigateTo('profile')">Profile</a>
          <a href="#" class="dropdown-item" onclick="appState.navigateTo('user/watchlist')">Watchlist</a>
          <a href="#" class="dropdown-item" onclick="appState.navigateTo('user/favorites')">Favorites</a>
          ${appState.user.is_admin ? '<a href="#" class="dropdown-item" onclick="appState.navigateTo(\'admin/dashboard\')">Admin</a>' : ''}
          <a href="#" class="dropdown-item" onclick="logout()">Logout</a>
        </div>
      </div>
    `;
  } else {
    authButtons.innerHTML = `
      <button class="btn btn-outline" onclick="showLoginModal()">Login</button>
      <button class="btn btn-primary" onclick="showRegisterModal()">Register</button>
    `;
  }
}

// ========================================
// INITIALIZATION
// ========================================
let appState, apiService, searchManager, carouselManager;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize core services
  appState = new AppState();
  apiService = new ApiService();
  searchManager = new SearchManager();
  carouselManager = new CarouselManager();
  
  // Update auth UI
  updateAuthUI();
  
  // Initialize lazy loading
  UIUtils.lazyLoadImages();
  
  // Add global loading overlay
  if (!document.querySelector('.loading-overlay')) {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-spinner"></div>
    `;
    document.body.appendChild(loadingOverlay);
  }
  
  console.log('CineScope app initialized successfully');
});

// Add resize handler for responsive carousels
window.addEventListener('resize', UIUtils.throttle(() => {
  if (carouselManager) {
    carouselManager.initializeCarousels();
  }
}, 250));