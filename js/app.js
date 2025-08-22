import apiClient from './api.js';
import authManager from './auth.js';
import { APP_CONFIG, GENRES, REGIONAL_LANGUAGES } from './config.js';

class CineScopeApp {
  constructor() {
    this.router = null;
    this.currentPage = null;
    this.loadingStates = new Map();
    this.searchDebounce = null;
    this.carousels = new Map();
    this.modals = new Map();
    this.toasts = [];
    this.theme = localStorage.getItem('cinescope_theme') || 'dark';
    this.init();
  }

  async init() {
    this.initRouter();
    this.initServiceWorker();
    this.applyTheme();
    this.initEventListeners();
    this.initComponents();
    
    // Preload critical data
    await this.preloadCriticalData();
    
    // Initialize current page
    this.router.navigate(window.location.pathname);
    
    // Mark app as ready
    this.markAppReady();
  }

  initRouter() {
    this.router = new Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Public routes
    this.router.addRoute('/', () => this.loadPage('home'));
    this.router.addRoute('/auth/login.html', () => this.loadPage('login'));
    this.router.addRoute('/auth/register.html', () => this.loadPage('register'));
    this.router.addRoute('/auth/forgot-password.html', () => this.loadPage('forgot-password'));
    
    // Content routes
    this.router.addRoute('/content/search.html', () => this.loadPage('search'));
    this.router.addRoute('/content/details.html', () => this.loadPage('details'));
    this.router.addRoute('/content/anime.html', () => this.loadPage('anime'));
    this.router.addRoute('/content/genre.html', () => this.loadPage('genre'));
    this.router.addRoute('/content/regional.html', () => this.loadPage('regional'));
    this.router.addRoute('/content/trending.html', () => this.loadPage('trending'));
    
    // User routes (protected)
    this.router.addRoute('/:username/profile', (params) => this.loadUserPage('profile', params));
    this.router.addRoute('/user/watchlist.html', () => this.loadUserPage('watchlist'));
    this.router.addRoute('/user/favorites.html', () => this.loadUserPage('favorites'));
    this.router.addRoute('/user/activity.html', () => this.loadUserPage('activity'));
    this.router.addRoute('/user/settings.html', () => this.loadUserPage('settings'));
    
    // Admin routes (protected)
    this.router.addRoute('/admin/index.html', () => this.loadAdminPage('dashboard'));
    this.router.addRoute('/admin/content.html', () => this.loadAdminPage('content'));
    this.router.addRoute('/admin/users.html', () => this.loadAdminPage('users'));
    this.router.addRoute('/admin/analytics.html', () => this.loadAdminPage('analytics'));
  }

  async loadPage(page) {
    if (this.currentPage === page) return;
    
    this.showPageLoader();
    
    try {
      this.currentPage = page;
      
      switch (page) {
        case 'home':
          await this.loadHomePage();
          break;
        case 'login':
          await this.loadLoginPage();
          break;
        case 'register':
          await this.loadRegisterPage();
          break;
        case 'search':
          await this.loadSearchPage();
          break;
        case 'details':
          await this.loadDetailsPage();
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
        default:
          this.show404();
      }
    } catch (error) {
      console.error('Page load error:', error);
      this.showError('Failed to load page');
    } finally {
      this.hidePageLoader();
    }
  }

  async loadUserPage(page, params = {}) {
    if (!authManager.protectRoute()) return;
    
    this.showPageLoader();
    
    try {
      switch (page) {
        case 'profile':
          await this.loadProfilePage(params);
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
      }
    } catch (error) {
      console.error('User page load error:', error);
      this.showError('Failed to load page');
    } finally {
      this.hidePageLoader();
    }
  }

  async loadAdminPage(page) {
    if (!authManager.requireAdmin()) return;
    
    this.showPageLoader();
    
    try {
      switch (page) {
        case 'dashboard':
          await this.loadAdminDashboard();
          break;
        case 'content':
          await this.loadAdminContent();
          break;
        case 'users':
          await this.loadAdminUsers();
          break;
        case 'analytics':
          await this.loadAdminAnalytics();
          break;
      }
    } catch (error) {
      console.error('Admin page load error:', error);
      this.showError('Failed to load admin page');
    } finally {
      this.hidePageLoader();
    }
  }

  async loadHomePage() {
    const isLoggedIn = authManager.isLoggedIn();
    let content = '';
    
    if (isLoggedIn) {
      content = await this.loadPersonalizedHome();
    } else {
      content = await this.loadPublicHome();
    }
    
    this.updateMainContent(content);
  }

  async loadPublicHome() {
    const [trending, adminChoice, newReleases, criticsChoice] = await Promise.all([
      apiClient.getTrending({ limit: 20 }),
      apiClient.getAdminChoice({ limit: 10 }),
      apiClient.getNewReleases({ limit: 15, type: 'movie' }),
      apiClient.getCriticsChoice({ limit: 15, type: 'movie' })
    ]);

    const heroItem = trending?.recommendations?.[0];
    
    return `
      ${heroItem ? this.createHeroSection(heroItem) : ''}
      
      <section class="content-section">
        <h2>What's Hot</h2>
        ${this.createCarousel('trending', trending?.recommendations || [], { infinite: true, autoplay: true })}
      </section>
      
      <section class="content-section">
        <h2>Admin's Choice</h2>
        ${this.createCarousel('admin-choice', adminChoice?.recommendations || [])}
      </section>
      
      <section class="content-section">
        <h2>New Releases</h2>
        ${this.createCarousel('new-releases', newReleases?.recommendations || [])}
      </section>
      
      <section class="content-section">
        <h2>Critics' Choice</h2>
        ${this.createCarousel('critics-choice', criticsChoice?.recommendations || [])}
      </section>
      
      ${this.createGenreSections()}
      ${this.createRegionalSections()}
    `;
  }

  async loadPersonalizedHome() {
    const token = authManager.getToken();
    const [personalized, trending, watchlist, favorites] = await Promise.all([
      apiClient.getPersonalizedRecommendations(token, { limit: 20 }),
      apiClient.getTrending({ limit: 15 }),
      apiClient.getWatchlist(token),
      apiClient.getFavorites(token)
    ]);

    const heroItem = personalized?.recommendations?.[0] || trending?.recommendations?.[0];
    
    return `
      ${heroItem ? this.createHeroSection(heroItem) : ''}
      
      <section class="content-section">
        <h2>Recommended for You</h2>
        ${this.createCarousel('personalized', personalized?.recommendations || [])}
      </section>
      
      ${watchlist?.watchlist?.length ? `
        <section class="content-section">
          <h2>Continue Watching</h2>
          ${this.createCarousel('continue-watching', watchlist.watchlist.slice(0, 10))}
        </section>
      ` : ''}
      
      <section class="content-section">
        <h2>Trending Now</h2>
        ${this.createCarousel('trending', trending?.recommendations || [])}
      </section>
      
      ${favorites?.favorites?.length ? `
        <section class="content-section">
          <h2>From Your Favorites</h2>
          ${this.createCarousel('from-favorites', favorites.favorites.slice(0, 10))}
        </section>
      ` : ''}
    `;
  }

  createHeroSection(item) {
    const backdropUrl = item.backdrop_path || item.poster_path;
    const trailerUrl = item.youtube_trailer;
    
    return `
      <section class="hero-section" style="background-image: url('${backdropUrl}')">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <h1 class="hero-title">${item.title}</h1>
          <div class="hero-meta">
            <span class="rating">★ ${item.rating || 'N/A'}</span>
            <span class="type">${item.content_type?.toUpperCase()}</span>
            ${item.genres ? `<span class="genres">${item.genres.slice(0, 3).join(', ')}</span>` : ''}
          </div>
          <p class="hero-overview">${item.overview || ''}</p>
          <div class="hero-actions">
            ${trailerUrl ? `<button class="btn btn-primary" onclick="app.playTrailer('${trailerUrl}')">
              <i class="icon-play"></i> Play Trailer
            </button>` : ''}
            <button class="btn btn-secondary" onclick="app.showContentDetails(${item.id})">
              <i class="icon-info"></i> More Info
            </button>
            <button class="btn btn-outline" onclick="app.addToWatchlist(${item.id})">
              <i class="icon-plus"></i> Watchlist
            </button>
          </div>
        </div>
      </section>
    `;
  }

  createCarousel(id, items, options = {}) {
    if (!items || items.length === 0) {
      return '<div class="carousel-empty">No content available</div>';
    }

    const carouselHtml = `
      <div class="carousel" id="carousel-${id}" data-options='${JSON.stringify(options)}'>
        <button class="carousel-btn carousel-prev" onclick="app.carouselPrev('${id}')">
          <i class="icon-chevron-left"></i>
        </button>
        <div class="carousel-track-container">
          <div class="carousel-track">
            ${items.map(item => this.createContentCard(item)).join('')}
          </div>
        </div>
        <button class="carousel-btn carousel-next" onclick="app.carouselNext('${id}')">
          <i class="icon-chevron-right"></i>
        </button>
      </div>
    `;

    // Initialize carousel after DOM update
    setTimeout(() => this.initCarousel(id, options), 0);
    
    return carouselHtml;
  }

  createContentCard(item) {
    const posterUrl = item.poster_path || APP_CONFIG.DEFAULT_POSTER;
    const rating = item.rating ? `★ ${item.rating.toFixed(1)}` : '';
    const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
    
    return `
      <div class="content-card" data-id="${item.id}" onclick="app.showContentDetails(${item.id})">
        <div class="card-image">
          <img src="${posterUrl}" alt="${item.title}" loading="lazy" />
          <div class="card-overlay">
            <div class="card-actions">
              ${item.youtube_trailer ? `
                <button class="card-action" onclick="event.stopPropagation(); app.playTrailer('${item.youtube_trailer}')">
                  <i class="icon-play"></i>
                </button>
              ` : ''}
              <button class="card-action" onclick="event.stopPropagation(); app.addToWatchlist(${item.id})">
                <i class="icon-plus"></i>
              </button>
              <button class="card-action" onclick="event.stopPropagation(); app.addToFavorites(${item.id})">
                <i class="icon-heart"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${item.title}</h3>
          <div class="card-meta">
            ${rating ? `<span class="card-rating">${rating}</span>` : ''}
            ${year ? `<span class="card-year">${year}</span>` : ''}
            <span class="card-type">${item.content_type?.toUpperCase() || 'MOVIE'}</span>
          </div>
          ${item.genres ? `<div class="card-genres">${item.genres.slice(0, 2).join(', ')}</div>` : ''}
        </div>
      </div>
    `;
  }

  async createGenreSections() {
    const genrePromises = [
      apiClient.getGenreContent('action', { limit: 10 }),
      apiClient.getGenreContent('comedy', { limit: 10 }),
      apiClient.getGenreContent('drama', { limit: 10 }),
      apiClient.getGenreContent('thriller', { limit: 10 })
    ];

    const [action, comedy, drama, thriller] = await Promise.allSettled(genrePromises);

    return `
      ${action.status === 'fulfilled' && action.value?.recommendations ? `
        <section class="content-section">
          <h2>Action Movies</h2>
          ${this.createCarousel('action', action.value.recommendations)}
        </section>
      ` : ''}
      
      ${comedy.status === 'fulfilled' && comedy.value?.recommendations ? `
        <section class="content-section">
          <h2>Comedy</h2>
          ${this.createCarousel('comedy', comedy.value.recommendations)}
        </section>
      ` : ''}
      
      ${drama.status === 'fulfilled' && drama.value?.recommendations ? `
        <section class="content-section">
          <h2>Drama</h2>
          ${this.createCarousel('drama', drama.value.recommendations)}
        </section>
      ` : ''}
      
      ${thriller.status === 'fulfilled' && thriller.value?.recommendations ? `
        <section class="content-section">
          <h2>Thriller</h2>
          ${this.createCarousel('thriller', thriller.value.recommendations)}
        </section>
      ` : ''}
    `;
  }

  async createRegionalSections() {
    const regionalPromises = [
      apiClient.getRegionalContent('hindi', { limit: 10 }),
      apiClient.getRegionalContent('telugu', { limit: 10 }),
      apiClient.getRegionalContent('tamil', { limit: 10 })
    ];

    const [hindi, telugu, tamil] = await Promise.allSettled(regionalPromises);

    return `
      ${hindi.status === 'fulfilled' && hindi.value?.recommendations ? `
        <section class="content-section">
          <h2>Hindi Movies</h2>
          ${this.createCarousel('hindi', hindi.value.recommendations)}
        </section>
      ` : ''}
      
      ${telugu.status === 'fulfilled' && telugu.value?.recommendations ? `
        <section class="content-section">
          <h2>Telugu Movies</h2>
          ${this.createCarousel('telugu', telugu.value.recommendations)}
        </section>
      ` : ''}
      
      ${tamil.status === 'fulfilled' && tamil.value?.recommendations ? `
        <section class="content-section">
          <h2>Tamil Movies</h2>
          ${this.createCarousel('tamil', tamil.value.recommendations)}
        </section>
      ` : ''}
    `;
  }

  // Carousel methods
  initCarousel(id, options = {}) {
    const carousel = document.getElementById(`carousel-${id}`);
    if (!carousel) return;

    const track = carousel.querySelector('.carousel-track');
    const cards = track.querySelectorAll('.content-card');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');

    let currentIndex = 0;
    const cardWidth = cards[0]?.offsetWidth + 16 || 200; // including gap
    const visibleCards = Math.floor(carousel.offsetWidth / cardWidth);
    const maxIndex = Math.max(0, cards.length - visibleCards);

    const updateCarousel = () => {
      const translateX = currentIndex * cardWidth;
      track.style.transform = `translateX(-${translateX}px)`;
      
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex >= maxIndex;
    };

    this.carousels.set(id, {
      currentIndex,
      maxIndex,
      cardWidth,
      updateCarousel,
      next: () => {
        if (currentIndex < maxIndex) {
          currentIndex++;
          updateCarousel();
        }
      },
      prev: () => {
        if (currentIndex > 0) {
          currentIndex--;
          updateCarousel();
        }
      }
    });

    updateCarousel();

    // Auto-play if enabled
    if (options.autoplay) {
      setInterval(() => {
        const carouselInstance = this.carousels.get(id);
        if (carouselInstance) {
          if (carouselInstance.currentIndex >= carouselInstance.maxIndex) {
            carouselInstance.currentIndex = 0;
          } else {
            carouselInstance.next();
          }
        }
      }, 5000);
    }
  }

  carouselNext(id) {
    const carousel = this.carousels.get(id);
    if (carousel) carousel.next();
  }

  carouselPrev(id) {
    const carousel = this.carousels.get(id);
    if (carousel) carousel.prev();
  }

  // Content interaction methods
  async showContentDetails(id) {
    this.showModal('content-details', await this.loadContentDetails(id));
  }

  async loadContentDetails(id) {
    try {
      const content = await apiClient.getContentDetails(id);
      const similar = await apiClient.getSimilarContent(id, { limit: 10 });

      return `
        <div class="content-details-modal">
          <div class="modal-hero" style="background-image: url('${content.backdrop_path || content.poster_path}')">
            <div class="modal-hero-overlay"></div>
            <button class="modal-close" onclick="app.closeModal('content-details')">&times;</button>
            <div class="modal-hero-content">
              <h1>${content.title}</h1>
              <div class="content-meta">
                <span class="rating">★ ${content.rating || 'N/A'}</span>
                <span class="year">${content.release_date ? new Date(content.release_date).getFullYear() : ''}</span>
                <span class="type">${content.content_type?.toUpperCase()}</span>
              </div>
              <p class="content-overview">${content.overview || ''}</p>
              <div class="content-actions">
                ${content.youtube_trailer ? `
                  <button class="btn btn-primary" onclick="app.playTrailer('${content.youtube_trailer}')">
                    <i class="icon-play"></i> Play Trailer
                  </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="app.addToWatchlist(${content.id})">
                  <i class="icon-plus"></i> Watchlist
                </button>
                <button class="btn btn-outline" onclick="app.addToFavorites(${content.id})">
                  <i class="icon-heart"></i> Favorite
                </button>
              </div>
            </div>
          </div>
          
          <div class="modal-content">
            ${content.cast?.length ? `
              <section class="cast-section">
                <h3>Cast</h3>
                <div class="cast-grid">
                  ${content.cast.slice(0, 6).map(actor => `
                    <div class="cast-member">
                      <img src="${actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : '/assets/default-avatar.jpg'}" alt="${actor.name}" />
                      <div class="cast-info">
                        <div class="cast-name">${actor.name}</div>
                        <div class="cast-character">${actor.character || actor.job || ''}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </section>
            ` : ''}
            
            ${similar?.recommendations?.length ? `
              <section class="similar-section">
                <h3>More Like This</h3>
                <div class="similar-grid">
                  ${similar.recommendations.slice(0, 8).map(item => this.createContentCard(item)).join('')}
                </div>
              </section>
            ` : ''}
          </div>
        </div>
      `;
    } catch (error) {
      return `<div class="error">Failed to load content details</div>`;
    }
  }

  playTrailer(url) {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      const embedUrl = `${APP_CONFIG.YOUTUBE_EMBED_BASE}${videoId}?autoplay=1&rel=0`;
      
      this.showModal('trailer', `
        <div class="trailer-modal">
          <button class="modal-close" onclick="app.closeModal('trailer')">&times;</button>
          <div class="trailer-container">
            <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
          </div>
        </div>
      `);
    }
  }

  async addToWatchlist(contentId) {
    if (!authManager.requireAuth()) return;
    
    try {
      await apiClient.recordInteraction(authManager.getToken(), {
        content_id: contentId,
        interaction_type: 'watchlist'
      });
      this.showToast('Added to watchlist', 'success');
    } catch (error) {
      this.showToast('Failed to add to watchlist', 'error');
    }
  }

  async addToFavorites(contentId) {
    if (!authManager.requireAuth()) return;
    
    try {
      await apiClient.recordInteraction(authManager.getToken(), {
        content_id: contentId,
        interaction_type: 'favorite'
      });
      this.showToast('Added to favorites', 'success');
    } catch (error) {
      this.showToast('Failed to add to favorites', 'error');
    }
  }

  // Search functionality
  initSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => {
          this.performSearch(e.target.value);
        }, APP_CONFIG.PERFORMANCE.DEBOUNCE_DELAY);
      });
    }
  }

  async performSearch(query) {
    if (!query.trim()) {
      this.clearSearchResults();
      return;
    }

    try {
      const results = await apiClient.search({ query, limit: 20 });
      this.displaySearchResults(results.results || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  displaySearchResults(results) {
    const searchResults = document.querySelector('.search-results');
    if (!searchResults) return;

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }

    searchResults.innerHTML = `
      <div class="search-grid">
        ${results.map(item => this.createContentCard(item)).join('')}
      </div>
    `;
  }

  clearSearchResults() {
    const searchResults = document.querySelector('.search-results');
    if (searchResults) {
      searchResults.innerHTML = '';
    }
  }

  // Modal system
  showModal(id, content) {
    const existingModal = document.getElementById(`modal-${id}`);
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = `modal-${id}`;
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="app.closeModal('${id}')"></div>
      <div class="modal-dialog">
        ${content}
      </div>
    `;

    document.body.appendChild(modal);
    this.modals.set(id, modal);

    // Add animation
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  closeModal(id) {
    const modal = this.modals.get(id);
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
        this.modals.delete(id);
        
        // Restore body scroll if no modals
        if (this.modals.size === 0) {
          document.body.style.overflow = '';
        }
      }, APP_CONFIG.PERFORMANCE.ANIMATION_DURATION);
    }
  }

  // Toast system
  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
    `;

    const toastContainer = document.querySelector('.toast-container') || this.createToastContainer();
    toastContainer.appendChild(toast);

    // Add animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto remove
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), APP_CONFIG.PERFORMANCE.ANIMATION_DURATION);
      }
    }, duration);
  }

  createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  // Theme management
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    localStorage.setItem('cinescope_theme', this.theme);
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  // Utility methods
  updateMainContent(content) {
    const main = document.querySelector('main') || document.querySelector('.main-content');
    if (main) {
      main.innerHTML = content;
    }
  }

  showPageLoader() {
    const loader = document.querySelector('.page-loader');
    if (loader) {
      loader.style.display = 'flex';
    }
  }

  hidePageLoader() {
    const loader = document.querySelector('.page-loader');
    if (loader) {
      loader.style.display = 'none';
    }
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  show404() {
    this.updateMainContent(`
      <div class="error-page">
        <h1>404</h1>
        <p>Page not found</p>
        <button class="btn btn-primary" onclick="app.router.navigate('/')">Go Home</button>
      </div>
    `);
  }

  markAppReady() {
    document.body.classList.add('app-ready');
    
    // Performance mark
    if (performance.mark) {
      performance.mark('app-ready');
    }
  }

  async preloadCriticalData() {
    await apiClient.preloadCriticalData();
  }

  initServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        console.warn('Service Worker registration failed');
      });
    }
  }

  initEventListeners() {
    // Theme toggle
    document.addEventListener('click', (e) => {
      if (e.target.matches('.theme-toggle')) {
        this.toggleTheme();
      }
    });

    // Auth events
    authManager.onLogin(() => {
      this.showToast('Login successful', 'success');
      if (this.currentPage === 'home') {
        this.loadHomePage(); // Reload with personalized content
      }
    });

    authManager.onLogout(() => {
      this.showToast('Logged out successfully', 'info');
      if (this.currentPage === 'home') {
        this.loadHomePage(); // Reload with public content
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.router.navigate(window.location.pathname);
    });

    // Handle mobile navigation
    this.initMobileNav();
  }

  initMobileNav() {
    const mobileNavLinks = document.querySelectorAll('.mobile-nav a');
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.router.navigate(link.getAttribute('href'));
      });
    });
  }

  initComponents() {
    this.initSearch();
    this.initLazyLoading();
    this.initInfiniteScroll();
  }

  initLazyLoading() {
    if ('IntersectionObserver' in window) {
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

  initInfiniteScroll() {
    // Implementation would depend on specific page requirements
  }

  // Additional page loading methods would go here...
  async loadLoginPage() {
    // Login page implementation
  }

  async loadRegisterPage() {
    // Register page implementation
  }

  async loadSearchPage() {
    // Search page implementation
  }

  async loadDetailsPage() {
    // Details page implementation
  }

  async loadAnimePage() {
    // Anime page implementation
  }

  async loadGenrePage() {
    // Genre page implementation
  }

  async loadRegionalPage() {
    // Regional page implementation
  }

  async loadTrendingPage() {
    // Trending page implementation
  }

  async loadProfilePage(params) {
    // Profile page implementation
  }

  async loadWatchlistPage() {
    // Watchlist page implementation
  }

  async loadFavoritesPage() {
    // Favorites page implementation
  }

  async loadActivityPage() {
    // Activity page implementation
  }

  async loadSettingsPage() {
    // Settings page implementation
  }

  async loadAdminDashboard() {
    // Admin dashboard implementation
  }

  async loadAdminContent() {
    // Admin content management implementation
  }

  async loadAdminUsers() {
    // Admin user management implementation
  }

  async loadAdminAnalytics() {
    // Admin analytics implementation
  }
}

// Simple Router Class
class Router {
  constructor() {
    this.routes = new Map();
  }

  addRoute(path, handler) {
    this.routes.set(path, handler);
  }

  navigate(path) {
    // Handle parameterized routes
    for (const [route, handler] of this.routes) {
      const match = this.matchRoute(route, path);
      if (match) {
        handler(match.params);
        return;
      }
    }

    // Exact match
    const handler = this.routes.get(path);
    if (handler) {
      handler();
    } else {
      // 404
      if (window.app) {
        window.app.show404();
      }
    }
  }

  matchRoute(route, path) {
    const routeParts = route.split('/');
    const pathParts = path.split('/');

    if (routeParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        return null;
      }
    }

    return { params };
  }
}

// Initialize app
const app = new CineScopeApp();

// Export for global access
window.app = app;
export default app;