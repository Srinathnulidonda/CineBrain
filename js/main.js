// js/main.js

// API Configuration
const API_BASE = 'https://backend-app-970m.onrender.com/api';

// Global state management
const AppState = {
  user: null,
  token: null,
  currentPage: 'home',
  searchResults: [],
  recommendations: {},
  watchlist: [],
  favorites: [],
  loading: false,
  cache: new Map(),
  authInitialized: false // Add this flag
};

// Token management (using sessionStorage for persistence)
const TokenManager = {
  set(token) {
    AppState.token = token;
    // Also store in sessionStorage for persistence
    if (token) {
      sessionStorage.setItem('cinescope_token', token);
    }
  },
  get() {
    // Try to get from memory first, then sessionStorage
    if (!AppState.token) {
      AppState.token = sessionStorage.getItem('cinescope_token');
    }
    return AppState.token;
  },
  remove() {
    AppState.token = null;
    sessionStorage.removeItem('cinescope_token');
    sessionStorage.removeItem('cinescope_user');
  },
  getHeaders() {
    const token = this.get();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};

// Restore authentication state from sessionStorage
function initializeAuth() {
  if (AppState.authInitialized) return true;
  
  const token = sessionStorage.getItem('cinescope_token');
  const userStr = sessionStorage.getItem('cinescope_user');
  
  if (token && userStr) {
    try {
      AppState.token = token;
      AppState.user = JSON.parse(userStr);
      AppState.authInitialized = true;
      updateAuthUI();
      return true;
    } catch (error) {
      console.error('Failed to restore auth state:', error);
      TokenManager.remove();
      return false;
    }
  }
  
  AppState.authInitialized = true;
  return false;
}

// Check if user is authenticated
function isAuthenticated() {
  return !!AppState.user && !!TokenManager.get();
}

// Check if user is admin
function isAdmin() {
  return isAuthenticated() && AppState.user?.is_admin === true;
}

// API Service
const ApiService = {
  async request(endpoint, options = {}) {
    try {
      AppState.loading = true;
      updateLoadingState(true);
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...TokenManager.getHeaders(),
          ...options.headers,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      showToast(error.message, 'error');
      throw error;
    } finally {
      AppState.loading = false;
      updateLoadingState(false);
    }
  },
  
  // Auth endpoints
  async login(username, password) {
    const data = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (data.token) {
      // Store auth state
      TokenManager.set(data.token);
      AppState.user = data.user;
      sessionStorage.setItem('cinescope_user', JSON.stringify(data.user));
      AppState.authInitialized = true;
    }
    
    return data;
  },
  
  async register(userData) {
    const data = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (data.token) {
      // Store auth state
      TokenManager.set(data.token);
      AppState.user = data.user;
      sessionStorage.setItem('cinescope_user', JSON.stringify(data.user));
      AppState.authInitialized = true;
    }
    
    return data;
  },
  
  // Content endpoints
  async search(query, type = 'multi', page = 1) {
    return this.request(`/search?query=${encodeURIComponent(query)}&type=${type}&page=${page}`);
  },
  
  async getContentDetails(contentId) {
    // Check cache first
    const cacheKey = `content_${contentId}`;
    if (AppState.cache.has(cacheKey)) {
      return AppState.cache.get(cacheKey);
    }
    
    const data = await this.request(`/content/${contentId}`);
    
    // Cache the result
    AppState.cache.set(cacheKey, data);
    
    return data;
  },
  
  // Recommendation endpoints
  async getTrending(type = 'all', limit = 20) {
    return this.request(`/recommendations/trending?type=${type}&limit=${limit}`);
  },
  
  async getNewReleases(language = null, type = 'movie', limit = 20) {
    let url = `/recommendations/new-releases?type=${type}&limit=${limit}`;
    if (language) url += `&language=${language}`;
    return this.request(url);
  },
  
  async getCriticsChoice(type = 'movie', limit = 20) {
    return this.request(`/recommendations/critics-choice?type=${type}&limit=${limit}`);
  },
  
  async getGenreRecommendations(genre, type = 'movie', limit = 20) {
    return this.request(`/recommendations/genre/${genre}?type=${type}&limit=${limit}`);
  },
  
  async getRegionalContent(language, type = 'movie', limit = 20) {
    return this.request(`/recommendations/regional/${language}?type=${type}&limit=${limit}`);
  },
  
  async getAnimeRecommendations(genre = null, limit = 20) {
    let url = `/recommendations/anime?limit=${limit}`;
    if (genre) url += `&genre=${genre}`;
    return this.request(url);
  },
  
  async getSimilarContent(contentId, limit = 20) {
    return this.request(`/recommendations/similar/${contentId}?limit=${limit}`);
  },
  
  async getPersonalizedRecommendations() {
    if (!AppState.user) {
      return this.request('/recommendations/anonymous');
    }
    return this.request('/recommendations/personalized');
  },
  
  // User interaction endpoints
  async addToWatchlist(contentId) {
    return this.request('/interactions', {
      method: 'POST',
      body: JSON.stringify({
        content_id: contentId,
        interaction_type: 'watchlist'
      })
    });
  },
  
  async addToFavorites(contentId) {
    return this.request('/interactions', {
      method: 'POST',
      body: JSON.stringify({
        content_id: contentId,
        interaction_type: 'favorite'
      })
    });
  },
  
  async rateContent(contentId, rating) {
    return this.request('/interactions', {
      method: 'POST',
      body: JSON.stringify({
        content_id: contentId,
        interaction_type: 'rating',
        rating: rating
      })
    });
  },
  
  async getWatchlist() {
    const data = await this.request('/user/watchlist');
    AppState.watchlist = data.watchlist || [];
    return data;
  },
  
  async getFavorites() {
    const data = await this.request('/user/favorites');
    AppState.favorites = data.favorites || [];
    return data;
  }
};

// UI Helper Functions
function updateLoadingState(isLoading) {
  const loadingOverlay = document.querySelector('.loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = isLoading ? 'flex' : 'none';
  }
}

function showToast(message, type = 'info') {
  const toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} fade-in`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Navigation Functions with clean URLs
function navigateToDetails(contentId) {
  window.location.href = `/details?id=${contentId}`;
}

function navigateToCategory(category) {
  window.location.href = `/categories/${category}`;
}

function navigateToLanguage(language) {
  window.location.href = `/languages/${language}`;
}

function navigateToSearch(query) {
  window.location.href = `/search?q=${encodeURIComponent(query)}`;
}

// Content Card Component
function createContentCard(content) {
  const card = document.createElement('div');
  card.className = 'content-card card';
  card.onclick = () => navigateToDetails(content.id);
  
  const posterUrl = content.poster_path || '/assets/images/no-poster.jpg';
  const rating = content.rating ? content.rating.toFixed(1) : 'N/A';
  
  card.innerHTML = `
    <div class="card-media">
      <img src="${posterUrl}" alt="${content.title}" loading="lazy">
      ${content.is_trending ? '<div class="card-badge">Trending</div>' : ''}
      ${content.is_new_release ? '<div class="card-badge">New</div>' : ''}
      ${content.is_critics_choice ? '<div class="card-badge">Critics Choice</div>' : ''}
    </div>
    <div class="card-content">
      <h3 class="card-title">${content.title}</h3>
      <div class="flex-between">
        <span class="text-sm text-secondary">${content.content_type}</span>
        <div class="rating">
          <i class="fas fa-star text-yellow"></i>
          <span class="text-sm">${rating}</span>
        </div>
      </div>
    </div>
    <div class="content-card-overlay">
      <p class="text-sm mb-sm">${content.overview || 'No description available.'}</p>
      <div class="content-card-actions">
        <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); addToWatchlist(${content.id})">
          <i class="fas fa-plus"></i>
        </button>
        <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); playTrailer('${content.youtube_trailer}')">
          <i class="fas fa-play"></i>
        </button>
      </div>
    </div>
  `;
  
  return card;
}

// Content Grid Renderer
function renderContentGrid(container, contents, title = null) {
  container.innerHTML = '';
  
  if (title) {
    const header = document.createElement('h2');
    header.className = 'mb-lg';
    header.textContent = title;
    container.appendChild(header);
  }
  
  if (!contents || contents.length === 0) {
    container.innerHTML += `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-film"></i>
        </div>
        <h3 class="empty-state-title">No content found</h3>
        <p class="empty-state-description">Try adjusting your filters or search criteria</p>
      </div>
    `;
    return;
  }
  
  const grid = document.createElement('div');
  grid.className = 'grid';
  
  contents.forEach(content => {
    grid.appendChild(createContentCard(content));
  });
  
  container.appendChild(grid);
}

// Carousel Component
function createCarousel(contents, title) {
  const section = document.createElement('section');
  section.className = 'carousel mb-2xl';
  
  section.innerHTML = `
    <div class="flex-between mb-md">
      <h2>${title}</h2>
      <button class="btn btn-ghost btn-sm">See All</button>
    </div>
    <div class="carousel-container" id="carousel-${title.replace(/\s+/g, '-')}">
      ${contents.map(content => `
        <div class="carousel-item">
          ${createContentCard(content).outerHTML}
        </div>
      `).join('')}
    </div>
    <button class="carousel-nav prev" onclick="scrollCarousel('carousel-${title.replace(/\s+/g, '-')}', -1)">
      <i class="fas fa-chevron-left"></i>
    </button>
    <button class="carousel-nav next" onclick="scrollCarousel('carousel-${title.replace(/\s+/g, '-')}', 1)">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;
  
  return section;
}

function scrollCarousel(carouselId, direction) {
  const carousel = document.getElementById(carouselId);
  const scrollAmount = carousel.offsetWidth * 0.8;
  carousel.scrollBy({
    left: scrollAmount * direction,
    behavior: 'smooth'
  });
}

// Authentication UI
function updateAuthUI() {
  const authButtons = document.querySelector('.auth-buttons');
  const userMenu = document.querySelector('.user-menu');
  
  if (!authButtons || !userMenu) return;
  
  if (AppState.user) {
    authButtons.style.display = 'none';
    userMenu.style.display = 'flex';
    userMenu.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-ghost flex gap-sm">
          <i class="fas fa-user-circle"></i>
          <span>${AppState.user.username}</span>
        </button>
        <div class="dropdown-menu">
          <a href="/profile" class="dropdown-item">Profile</a>
          <a href="/user/watchlist" class="dropdown-item">Watchlist</a>
          <a href="/user/favorites" class="dropdown-item">Favorites</a>
          ${AppState.user.is_admin ? '<a href="/admin/dashboard" class="dropdown-item">Admin Dashboard</a>' : ''}
          <hr class="dropdown-divider">
          <button onclick="logout()" class="dropdown-item">Logout</button>
        </div>
      </div>
    `;
  } else {
    authButtons.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

function logout() {
  TokenManager.remove();
  AppState.user = null;
  AppState.watchlist = [];
  AppState.favorites = [];
  AppState.authInitialized = false;
  updateAuthUI();
  showToast('Logged out successfully', 'success');
  
  // Redirect to home if on protected page (clean URLs)
  if (window.location.pathname.includes('/user/') || window.location.pathname.includes('/admin/')) {
    window.location.href = '/';
  }
}

// User Interaction Functions
async function addToWatchlist(contentId) {
  if (!isAuthenticated()) {
    showToast('Please login to add to watchlist', 'info');
    window.location.href = '/login';
    return;
  }
  
  try {
    await ApiService.addToWatchlist(contentId);
    showToast('Added to watchlist', 'success');
  } catch (error) {
    showToast('Failed to add to watchlist', 'error');
  }
}

async function addToFavorites(contentId) {
  if (!isAuthenticated()) {
    showToast('Please login to add to favorites', 'info');
    window.location.href = '/login';
    return;
  }
  
  try {
    await ApiService.addToFavorites(contentId);
    showToast('Added to favorites', 'success');
  } catch (error) {
    showToast('Failed to add to favorites', 'error');
  }
}

function playTrailer(trailerUrl) {
  if (!trailerUrl) {
    showToast('No trailer available', 'info');
    return;
  }
  
  // Open trailer in modal
  const modal = document.getElementById('trailer-modal');
  const iframe = modal.querySelector('iframe');
  iframe.src = trailerUrl.replace('watch?v=', 'embed/');
  modal.classList.add('active');
}

// Search Functionality
let searchTimeout;
async function handleSearch(query) {
  if (!query || query.length < 2) {
    clearSearchSuggestions();
    return;
  }
  
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const results = await ApiService.search(query);
      displaySearchSuggestions(results.results);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, 300);
}

function displaySearchSuggestions(results) {
  const suggestionsContainer = document.querySelector('.search-suggestions');
  if (!suggestionsContainer) return;
  
  if (!results || results.length === 0) {
    suggestionsContainer.style.display = 'none';
    return;
  }
  
  suggestionsContainer.innerHTML = results.slice(0, 5).map(item => `
    <div class="search-suggestion-item" onclick="navigateToDetails(${item.id})">
      <img src="${item.poster_path || '/assets/images/no-poster.jpg'}" alt="${item.title}">
      <div class="search-suggestion-info">
        <h4>${item.title}</h4>
        <p>${item.content_type} • ${item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}</p>
      </div>
    </div>
  `).join('');
  
  suggestionsContainer.style.display = 'block';
}

function clearSearchSuggestions() {
  const suggestionsContainer = document.querySelector('.search-suggestions');
  if (suggestionsContainer) {
    suggestionsContainer.style.display = 'none';
  }
}

// Setup search forms
function setupSearchForm() {
  const searchInputs = document.querySelectorAll('.search-input');
  
  searchInputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) {
          navigateToSearch(query);
        }
      }
    });
    
    input.addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });
  });
}

// Mobile Menu Toggle
function toggleMobileMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
  
  if (mobileMenu && mobileMenuOverlay) {
    mobileMenu.classList.toggle('active');
    mobileMenuOverlay.classList.toggle('active');
  }
}

// Lazy Loading for Images
function setupLazyLoading() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('skeleton');
        observer.unobserve(img);
      }
    });
  });
  
  const lazyImages = document.querySelectorAll('img[data-src]');
  lazyImages.forEach(img => imageObserver.observe(img));
}

// Homepage Initialization
async function initHomepage() {
  try {
    // Fetch all recommendations in parallel
    const [trending, newReleases, criticsChoice, personalized] = await Promise.all([
      ApiService.getTrending(),
      ApiService.getNewReleases(),
      ApiService.getCriticsChoice(),
      ApiService.getPersonalizedRecommendations()
    ]);
    
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // Clear loading state
    mainContent.innerHTML = '';
    
    // Add hero section
    if (trending.recommendations && trending.recommendations.length > 0) {
      const hero = createHeroSection(trending.recommendations[0]);
      mainContent.appendChild(hero);
    }
    
    // Add recommendation carousels
    if (personalized.recommendations) {
      mainContent.appendChild(createCarousel(personalized.recommendations, 'Recommended For You'));
    }
    
    if (trending.recommendations) {
      mainContent.appendChild(createCarousel(trending.recommendations, 'Trending Now'));
    }
    
    if (newReleases.recommendations) {
      mainContent.appendChild(createCarousel(newReleases.recommendations, 'New Releases'));
    }
    
    if (criticsChoice.recommendations) {
      mainContent.appendChild(createCarousel(criticsChoice.recommendations, 'Critics Choice'));
    }
    
    // Add genre sections
    const genres = ['action', 'drama', 'comedy', 'thriller'];
    for (const genre of genres) {
      const genreContent = await ApiService.getGenreRecommendations(genre);
      if (genreContent.recommendations) {
        mainContent.appendChild(createCarousel(genreContent.recommendations, `Top ${genre.charAt(0).toUpperCase() + genre.slice(1)}`));
      }
    }
    
    setupLazyLoading();
    
  } catch (error) {
    console.error('Homepage initialization error:', error);
    document.getElementById('main-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 class="empty-state-title">Something went wrong</h3>
        <p class="empty-state-description">Please try refreshing the page</p>
        <button class="btn btn-primary" onclick="location.reload()">Refresh</button>
      </div>
    `;
  }
}

// Hero Section Component
function createHeroSection(content) {
  const section = document.createElement('section');
  section.className = 'hero mb-2xl';
  
  const backdropUrl = content.backdrop_path || content.poster_path || '/assets/images/hero-bg.jpg';
  
  section.innerHTML = `
    <div class="hero-background">
      <img src="${backdropUrl}" alt="${content.title}">
      <div class="hero-gradient"></div>
    </div>
    <div class="hero-content container">
      <h1 class="hero-title gradient-text">${content.title}</h1>
      <p class="hero-description">${content.overview || 'Discover the latest movies, TV shows, and anime.'}</p>
      <div class="flex gap-md">
        <button class="btn btn-primary btn-lg" onclick="navigateToDetails(${content.id})">
          <i class="fas fa-play mr-sm"></i> Play Now
        </button>
        <button class="btn btn-secondary btn-lg" onclick="addToWatchlist(${content.id})">
          <i class="fas fa-plus mr-sm"></i> Add to List
        </button>
      </div>
    </div>
  `;
  
  return section;
}

// Page-specific initializers
async function initDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const contentId = urlParams.get('id');
  
  if (!contentId) {
    window.location.href = '/';
    return;
  }
  
  try {
    const content = await ApiService.getContentDetails(contentId);
    renderDetailsPage(content);
  } catch (error) {
    console.error('Details page error:', error);
  }
}

function renderDetailsPage(content) {
  const container = document.getElementById('details-container');
  if (!container) return;
  
  const backdropUrl = content.backdrop_path || content.poster_path || '';
  const posterUrl = content.poster_path || '/assets/images/no-poster.jpg';
  
  container.innerHTML = `
    <div class="details-hero" style="background-image: url('${backdropUrl}')">
      <div class="details-hero-gradient"></div>
    </div>
    
    <div class="container details-layout mt-xl">
      <div class="details-poster">
        <img src="${posterUrl}" alt="${content.title}" class="rounded-lg shadow-lg">
        <div class="details-actions mt-lg">
          <button class="btn btn-primary btn-full mb-sm" onclick="playTrailer('${content.youtube_trailer}')">
            <i class="fas fa-play mr-sm"></i> Watch Trailer
          </button>
          <button class="btn btn-secondary btn-full mb-sm" onclick="addToWatchlist(${content.id})">
            <i class="fas fa-plus mr-sm"></i> Add to Watchlist
          </button>
          <button class="btn btn-ghost btn-full" onclick="addToFavorites(${content.id})">
            <i class="fas fa-heart mr-sm"></i> Add to Favorites
          </button>
        </div>
      </div>
      
      <div class="details-info">
        <h1 class="mb-md">${content.title}</h1>
        ${content.original_title && content.original_title !== content.title ? `<p class="text-secondary mb-md">${content.original_title}</p>` : ''}
        
        <div class="flex gap-md mb-lg">
          <div class="rating">
            <i class="fas fa-star text-yellow"></i>
            <span class="rating-value">${content.rating ? content.rating.toFixed(1) : 'N/A'}</span>
          </div>
          <span class="text-secondary">•</span>
          <span class="text-secondary">${content.release_date ? new Date(content.release_date).getFullYear() : 'N/A'}</span>
          <span class="text-secondary">•</span>
          <span class="text-secondary">${content.runtime ? `${content.runtime} min` : content.content_type}</span>
        </div>
        
        <div class="flex gap-sm flex-wrap mb-lg">
          ${content.genres.map(genre => `<span class="tag">${genre}</span>`).join('')}
        </div>
        
        <h3 class="mb-sm">Overview</h3>
        <p class="text-secondary mb-lg">${content.overview || 'No overview available.'}</p>
        
        ${content.cast && content.cast.length > 0 ? `
          <h3 class="mb-sm">Cast</h3>
          <div class="cast-list mb-lg">
            ${content.cast.slice(0, 6).map(actor => `
              <div class="cast-item">
                <div class="cast-name">${actor.name}</div>
                <div class="cast-character text-secondary">${actor.character || ''}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${content.similar_content && content.similar_content.length > 0 ? `
          <h3 class="mb-md">Similar Content</h3>
          <div class="grid">
            ${content.similar_content.slice(0, 6).map(item => createContentCard(item).outerHTML).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  setupLazyLoading();
}

// Protected Page Check Function
function checkProtectedPage(requiredAuth = 'user') {
  // Initialize auth first
  initializeAuth();
  
  // Check authentication
  if (!isAuthenticated()) {
    console.log('Not authenticated, redirecting to login');
    window.location.href = '/login';
    return false;
  }
  
  // Check admin requirement
  if (requiredAuth === 'admin' && !isAdmin()) {
    console.log('Not an admin, redirecting to home');
    window.location.href = '/';
    return false;
  }
  
  return true;
}

async function initDashboard() {
  if (!checkProtectedPage('user')) return;
  
  // Dashboard-specific initialization handled in dashboard.html
  console.log('Dashboard initialized for user:', AppState.user);
}

async function initCategoryPage() {
  const category = window.location.pathname.split('/').pop();
  const container = document.getElementById('category-content');
  
  if (!container) return;
  
  try {
    let data;
    switch (category) {
      case 'trending':
        data = await ApiService.getTrending('all', 50);
        break;
      case 'new-releases':
        data = await ApiService.getNewReleases(null, 'all', 50);
        break;
      case 'critics-choice':
        data = await ApiService.getCriticsChoice('all', 50);
        break;
      case 'movies':
        data = await ApiService.getTrending('movie', 50);
        break;
      case 'tv-shows':
        data = await ApiService.getTrending('tv', 50);
        break;
      case 'anime':
        data = await ApiService.getAnimeRecommendations(null, 50);
        break;
      default:
        data = await ApiService.getTrending();
    }
    
    renderContentGrid(container, data.recommendations, category.replace('-', ' ').toUpperCase());
  } catch (error) {
    console.error('Category page error:', error);
  }
}

async function initLanguagePage() {
  const language = window.location.pathname.split('/').pop();
  const container = document.getElementById('language-content');
  
  if (!container) return;
  
  try {
    const data = await ApiService.getRegionalContent(language, 'all', 50);
    renderContentGrid(container, data.recommendations, `${language.toUpperCase()} Content`);
  } catch (error) {
    console.error('Language page error:', error);
  }
}

async function initWatchlistPage() {
  if (!checkProtectedPage('user')) return;
  
  const container = document.getElementById('watchlist-content');
  if (!container) return;
  
  try {
    const data = await ApiService.getWatchlist();
    renderContentGrid(container, data.watchlist, 'My Watchlist');
  } catch (error) {
    console.error('Watchlist error:', error);
  }
}

async function initFavoritesPage() {
  if (!checkProtectedPage('user')) return;
  
  const container = document.getElementById('favorites-content');
  if (!container) return;
  
  try {
    const data = await ApiService.getFavorites();
    renderContentGrid(container, data.favorites, 'My Favorites');
  } catch (error) {
    console.error('Favorites error:', error);
  }
}

async function initProfilePage() {
  if (!checkProtectedPage('user')) return;
  
  // Profile page specific initialization handled in profile.html
  console.log('Profile initialized for user:', AppState.user);
}

async function initLoginPage() {
  // Initialize auth to check if already logged in
  initializeAuth();
  
  if (isAuthenticated()) {
    // Already logged in, redirect
    if (isAdmin()) {
      window.location.href = '/admin/dashboard';
    } else {
      window.location.href = '/dashboard';
    }
  }
}

async function initAdminDashboard() {
  if (!checkProtectedPage('admin')) return;
  
  // Admin dashboard specific initialization handled in admin pages
  console.log('Admin dashboard initialized for admin:', AppState.user);
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize authentication FIRST
  initializeAuth();
  
  // Update auth UI
  updateAuthUI();
  
  // Setup search forms
  setupSearchForm();
  
  // Setup global event listeners
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', toggleMobileMenu);
  }
  
  const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', toggleMobileMenu);
  }
  
  // Close search suggestions on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      clearSearchSuggestions();
    }
  });
  
  // Route-specific initialization based on clean URLs
  const currentPath = window.location.pathname;
  
  if (currentPath === '/' || currentPath === '/index') {
    initHomepage();
  } else if (currentPath === '/details') {
    initDetailsPage();
  } else if (currentPath === '/login') {
    initLoginPage();
  } else if (currentPath === '/dashboard') {
    initDashboard();
  } else if (currentPath === '/profile') {
    initProfilePage();
  } else if (currentPath.includes('/categories/')) {
    initCategoryPage();
  } else if (currentPath.includes('/languages/')) {
    initLanguagePage();
  } else if (currentPath === '/user/watchlist') {
    initWatchlistPage();
  } else if (currentPath === '/user/favorites') {
    initFavoritesPage();
  } else if (currentPath === '/admin/dashboard') {
    initAdminDashboard();
  } else if (currentPath.includes('/admin/')) {
    checkProtectedPage('admin');
  }
});

// Export for use in other scripts
window.ApiService = ApiService;
window.AppState = AppState;
window.TokenManager = TokenManager;
window.showToast = showToast;
window.navigateToDetails = navigateToDetails;
window.navigateToCategory = navigateToCategory;
window.navigateToLanguage = navigateToLanguage;
window.navigateToSearch = navigateToSearch;
window.addToWatchlist = addToWatchlist;
window.addToFavorites = addToFavorites;
window.playTrailer = playTrailer;
window.scrollCarousel = scrollCarousel;
window.handleSearch = handleSearch;
window.toggleMobileMenu = toggleMobileMenu;
window.logout = logout;
window.updateAuthUI = updateAuthUI;
window.createContentCard = createContentCard;
window.renderContentGrid = renderContentGrid;
window.setupLazyLoading = setupLazyLoading;
window.initializeAuth = initializeAuth;
window.isAuthenticated = isAuthenticated;
window.isAdmin = isAdmin;
window.checkProtectedPage = checkProtectedPage;