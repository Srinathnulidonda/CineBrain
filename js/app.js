// CineScope Main Application - Router, Controllers, Components
class CineScopeApp {
  constructor() {
    this.currentPage = null;
    this.components = new Map();
    this.virtualScrollInstances = new Map();
    this.carousels = new Map();
    this.searchDebounce = null;
    this.init();
  }

  async init() {
    // Mark performance
    performance.mark('app-init-start');
    
    // Initialize router
    this.initRouter();
    
    // Load components
    await this.loadComponents();
    
    // Initialize UI
    this.initializeUI();
    
    // Register service worker
    this.registerServiceWorker();
    
    // Mark performance
    performance.mark('app-init-end');
    performance.measure('app-init', 'app-init-start', 'app-init-end');
    
    // Preload critical resources
    this.preloadCriticalResources();
  }

  initRouter() {
    // Handle navigation
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        this.navigate(link.href);
      }
    });

    // Handle back/forward
    window.addEventListener('popstate', () => {
      this.loadPage();
    });

    // Initial page load
    this.loadPage();
  }

  navigate(url) {
    window.history.pushState(null, '', url);
    this.loadPage();
  }

  async loadPage() {
    const path = window.location.pathname;
    const page = this.getPageFromPath(path);
    
    if (page !== this.currentPage) {
      // Clean up previous page
      this.cleanup();
      
      // Load new page
      this.currentPage = page;
      await this.loadPageContent(page);
    }
  }

  getPageFromPath(path) {
    // Route mapping
    if (path === '/' || path === '/index.html') return 'home';
    if (path.startsWith('/auth/')) return path.substring(6).replace('.html', '');
    if (path.startsWith('/content/')) return path.substring(9).replace('.html', '');
    if (path.startsWith('/admin/')) return path.substring(7).replace('.html', '');
    
    // User routes
    const userMatch = path.match(/^\/([^\/]+)\/(profile|watchlist|favorites|activity|settings)/);
    if (userMatch) {
      return `user-${userMatch[2]}`;
    }
    
    return 'home';
  }

  async loadPageContent(page) {
    const contentArea = document.getElementById('app-content');
    if (!contentArea) return;

    // Show loading
    this.showLoading();

    try {
      switch (page) {
        case 'home':
          await this.loadHomePage();
          break;
        case 'login':
        case 'register':
          await this.loadAuthPage(page);
          break;
        case 'search':
          await this.loadSearchPage();
          break;
        case 'details':
          await this.loadDetailsPage();
          break;
        case 'trending':
          await this.loadTrendingPage();
          break;
        case 'genre':
          await this.loadGenrePage();
          break;
        case 'regional':
          await this.loadRegionalPage();
          break;
        case 'anime':
          await this.loadAnimePage();
          break;
        case 'user-profile':
        case 'user-watchlist':
        case 'user-favorites':
        case 'user-activity':
        case 'user-settings':
          await this.loadUserPage(page.replace('user-', ''));
          break;
        case 'admin':
        case 'content':
        case 'users':
        case 'analytics':
          await this.loadAdminPage(page);
          break;
        default:
          await this.load404Page();
      }
    } catch (error) {
      console.error('Page load error:', error);
      this.showError('Failed to load page');
    } finally {
      this.hideLoading();
    }
  }

  // Page Controllers
  async loadHomePage() {
    const isAuthenticated = Auth.isAuthenticated();
    const content = document.getElementById('app-content');
    
    if (isAuthenticated) {
      // Personalized homepage
      const [recommendations, watchlist, trending] = await Promise.all([
        API.getPersonalizedRecommendations(20),
        API.getWatchlist(),
        API.getTrending('all', 10)
      ]);

      content.innerHTML = this.renderPersonalizedHomepage({
        recommendations: recommendations.recommendations || [],
        watchlist: watchlist.watchlist || [],
        trending: trending.recommendations || []
      });
    } else {
      // Public homepage
      const [trending, newReleases, criticsChoice, regionalHindi, regionalTelugu, anime] = await Promise.all([
        API.getTrending('all', 20),
        API.getNewReleases(null, 'movie', 20),
        API.getCriticsChoice('movie', 20),
        API.getRegionalContent('hindi', 'movie', 10),
        API.getRegionalContent('telugu', 'movie', 10),
        API.getAnimeContent(null, 10)
      ]);

      content.innerHTML = this.renderPublicHomepage({
        trending: trending.recommendations || [],
        newReleases: newReleases.recommendations || [],
        criticsChoice: criticsChoice.recommendations || [],
        regional: {
          hindi: regionalHindi.recommendations || [],
          telugu: regionalTelugu.recommendations || []
        },
        anime: anime.recommendations || []
      });
    }

    // Initialize carousels
    this.initializeCarousels();
    
    // Initialize lazy loading
    this.initializeLazyLoading();
  }

  async loadSearchPage() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    const type = params.get('type') || 'multi';
    const page = parseInt(params.get('page')) || 1;

    const content = document.getElementById('app-content');
    
    if (query) {
      const results = await API.searchContent(query, type, page);
      content.innerHTML = this.renderSearchResults(query, results);
    } else {
      content.innerHTML = this.renderSearchPage();
    }

    // Initialize search functionality
    this.initializeSearch();
  }

  async loadDetailsPage() {
    const params = new URLSearchParams(window.location.search);
    const contentId = params.get('id');
    
    if (!contentId) {
      this.navigate('/');
      return;
    }

    const content = document.getElementById('app-content');
    
    const [details, similar] = await Promise.all([
      API.getContentDetails(contentId),
      API.getSimilarContent(contentId, 10)
    ]);

    content.innerHTML = this.renderDetailsPage(details, similar.recommendations || []);
    
    // Initialize video player
    this.initializeVideoPlayer();
    
    // Initialize interactions
    this.initializeInteractions(contentId);
  }

  // Component Loading
  async loadComponents() {
    // Load reusable components
    const componentPaths = [
      '/components/layout/topbar.html',
      '/components/layout/mobile-nav.html',
      '/components/cards/content-card.html',
      '/components/ui/rating-badge.html'
    ];

    const loadPromises = componentPaths.map(async (path) => {
      try {
        const response = await fetch(path);
        const html = await response.text();
        const name = path.split('/').pop().replace('.html', '');
        this.components.set(name, html);
      } catch (error) {
        console.error(`Failed to load component ${path}:`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  // UI Initialization
  initializeUI() {
    // Initialize theme
    this.initializeTheme();
    
    // Initialize navigation
    this.initializeNavigation();
    
    // Initialize global search
    this.initializeGlobalSearch();
    
    // Initialize scroll behavior
    this.initializeScrollBehavior();
    
    // Initialize touch gestures
    this.initializeTouchGestures();
  }

  initializeTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }

  initializeNavigation() {
    // Fixed topbar
    const topbar = document.createElement('div');
    topbar.id = 'topbar';
    topbar.className = 'topbar';
    topbar.innerHTML = this.components.get('topbar') || this.renderTopbar();
    document.body.insertBefore(topbar, document.body.firstChild);

    // Mobile bottom navigation
    if (window.innerWidth <= APP_CONFIG.BREAKPOINTS.tablet) {
      const mobileNav = document.createElement('div');
      mobileNav.id = 'mobile-nav';
      mobileNav.className = 'mobile-nav';
      mobileNav.innerHTML = this.components.get('mobile-nav') || this.renderMobileNav();
      document.body.appendChild(mobileNav);
    }

    // Update active states
    this.updateNavigationStates();
  }

  initializeGlobalSearch() {
    const searchInput = document.getElementById('global-search');
    if (!searchInput) return;

    let autocompleteContainer = document.getElementById('search-autocomplete');
    if (!autocompleteContainer) {
      autocompleteContainer = document.createElement('div');
      autocompleteContainer.id = 'search-autocomplete';
      autocompleteContainer.className = 'search-autocomplete';
      searchInput.parentElement.appendChild(autocompleteContainer);
    }

    searchInput.addEventListener('input', (e) => {
      clearTimeout(this.searchDebounce);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        autocompleteContainer.style.display = 'none';
        return;
      }

      this.searchDebounce = setTimeout(async () => {
        const results = await API.searchContent(query, 'multi', 1);
        if (results.results && results.results.length > 0) {
          autocompleteContainer.innerHTML = this.renderAutocomplete(results.results.slice(0, 5));
          autocompleteContainer.style.display = 'block';
        } else {
          autocompleteContainer.style.display = 'none';
        }
      }, 300);
    });

    // Close autocomplete on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        autocompleteContainer.style.display = 'none';
      }
    });
  }

  // Carousel Management
  initializeCarousels() {
    const carousels = document.querySelectorAll('.content-carousel');
    carousels.forEach((carousel, index) => {
      const instance = new ContentCarousel(carousel);
      this.carousels.set(`carousel-${index}`, instance);
    });
  }

  // Virtual Scrolling for Performance
  initializeVirtualScroll(container, items, renderItem) {
    const instance = new VirtualScroll(container, items, renderItem);
    this.virtualScrollInstances.set(container.id, instance);
    return instance;
  }

  // Lazy Loading
  initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  // Touch Gestures
  initializeTouchGestures() {
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe();
    });

    this.handleSwipe = () => {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swipe left
          this.handleSwipeLeft();
        } else {
          // Swipe right
          this.handleSwipeRight();
        }
      }
    };
  }

  // Performance Optimization
  async preloadCriticalResources() {
    // Preload critical API data
    const preloadUrls = [
      API_ENDPOINTS.TRENDING,
      API_ENDPOINTS.NEW_RELEASES
    ];

    await API.prefetchContent(preloadUrls);

    // Preload critical images
    const criticalImages = [
      '/images/logo.png',
      '/images/placeholder.jpg'
    ];

    await API.preloadImages(criticalImages);
  }

  // Service Worker
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Toast Notifications
  showToast(message, type = 'info', duration = 3000) {
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
    }, duration);
  }

  // Loading States
  showLoading() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.style.display = 'flex';
  }

  hideLoading() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.style.display = 'none';
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  // Cleanup
  cleanup() {
    // Clear carousels
    this.carousels.forEach(carousel => carousel.destroy());
    this.carousels.clear();
    
    // Clear virtual scroll instances
    this.virtualScrollInstances.forEach(instance => instance.destroy());
    this.virtualScrollInstances.clear();
    
    // Clear event listeners
    clearTimeout(this.searchDebounce);
  }

  // Render Methods
  renderTopbar() {
    const user = Auth.getUser();
    return `
      <div class="topbar-content">
        <a href="/" class="logo">
          <span class="logo-text">CineScope</span>
        </a>
        
        <div class="search-container">
          <input type="text" id="global-search" placeholder="Search movies, shows, anime..." />
          <i class="icon-search"></i>
        </div>
        
        <div class="topbar-actions">
          ${user ? `
            <a href="${Auth.getUserRoute('/profile')}" class="user-avatar">
              <img src="https://ui-avatars.com/api/?name=${user.username}&background=3b82f6&color=fff" alt="${user.username}" />
            </a>
          ` : `
            <a href="/auth/login.html" class="btn btn-primary">Sign In</a>
          `}
        </div>
      </div>
    `;
  }

  renderMobileNav() {
    return `
      <nav class="mobile-nav-content">
        <a href="/" class="nav-item ${this.currentPage === 'home' ? 'active' : ''}">
          <i class="icon-home"></i>
          <span>Home</span>
        </a>
        <a href="/content/search.html" class="nav-item ${this.currentPage === 'search' ? 'active' : ''}">
          <i class="icon-search"></i>
          <span>Search</span>
        </a>
        <a href="${Auth.getUserRoute('/watchlist')}" class="nav-item ${this.currentPage === 'user-watchlist' ? 'active' : ''}">
          <i class="icon-bookmark"></i>
          <span>Watchlist</span>
        </a>
        <a href="${Auth.getUserRoute('/favorites')}" class="nav-item ${this.currentPage === 'user-favorites' ? 'active' : ''}">
          <i class="icon-heart"></i>
          <span>Favorites</span>
        </a>
        <a href="${Auth.getUserRoute('/profile')}" class="nav-item ${this.currentPage === 'user-profile' ? 'active' : ''}">
          <i class="icon-user"></i>
          <span>Profile</span>
        </a>
      </nav>
    `;
  }

  renderPublicHomepage(data) {
    return `
      <div class="homepage">
        ${this.renderHeroSection(data.trending[0])}
        
        <section class="content-section">
          <h2 class="section-title">What's Hot</h2>
          <div class="content-carousel">
            ${data.trending.map(item => this.renderContentCard(item)).join('')}
          </div>
        </section>
        
        <section class="content-section">
          <h2 class="section-title">New Releases</h2>
          <div class="content-carousel">
            ${data.newReleases.map(item => this.renderContentCard(item)).join('')}
          </div>
        </section>
        
        <section class="content-section">
          <h2 class="section-title">Critics' Choice</h2>
          <div class="content-carousel">
            ${data.criticsChoice.map(item => this.renderContentCard(item)).join('')}
          </div>
        </section>
        
        <section class="content-section">
          <h2 class="section-title">Regional Cinema</h2>
          <div class="tabs">
            <button class="tab active" data-tab="hindi">Hindi</button>
            <button class="tab" data-tab="telugu">Telugu</button>
          </div>
          <div class="tab-content">
            <div class="tab-pane active" id="hindi">
              <div class="content-carousel">
                ${data.regional.hindi.map(item => this.renderContentCard(item)).join('')}
              </div>
            </div>
            <div class="tab-pane" id="telugu">
              <div class="content-carousel">
                ${data.regional.telugu.map(item => this.renderContentCard(item)).join('')}
              </div>
            </div>
          </div>
        </section>
        
        <section class="content-section">
          <h2 class="section-title">Anime Collection</h2>
          <div class="content-carousel">
            ${data.anime.map(item => this.renderContentCard(item)).join('')}
          </div>
        </section>
      </div>
    `;
  }

  renderHeroSection(content) {
    if (!content) return '';
    
    const backdropUrl = content.backdrop_path 
      ? `https://image.tmdb.org/t/p/w1280${content.backdrop_path}`
      : content.poster_path;
      
    return `
      <section class="hero-section" style="background-image: url('${backdropUrl}')">
        <div class="hero-gradient">
          <div class="hero-content">
            <h1 class="hero-title">${content.title}</h1>
            <div class="hero-meta">
              ${content.rating ? `<span class="rating">⭐ ${content.rating.toFixed(1)}</span>` : ''}
              ${content.genres ? `<span class="genres">${content.genres.slice(0, 3).join(', ')}</span>` : ''}
            </div>
            <p class="hero-overview">${content.overview || ''}</p>
            <div class="hero-actions">
              <button class="btn btn-primary" onclick="app.playTrailer('${content.youtube_trailer}')">
                <i class="icon-play"></i> Play Trailer
              </button>
              <a href="/content/details.html?id=${content.id}" class="btn btn-secondary">
                <i class="icon-info"></i> More Info
              </a>
              ${Auth.isAuthenticated() ? `
                <button class="btn btn-icon" onclick="app.addToWatchlist(${content.id})">
                  <i class="icon-bookmark"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderContentCard(content) {
    const posterUrl = content.poster_path 
      ? (content.poster_path.startsWith('http') 
          ? content.poster_path 
          : `https://image.tmdb.org/t/p/w300${content.poster_path}`)
      : '/images/placeholder.jpg';
      
    return `
      <div class="content-card">
        <a href="/content/details.html?id=${content.id}">
          <div class="card-poster">
            <img data-src="${posterUrl}" alt="${content.title}" class="lazy" />
            ${content.rating ? `
              <div class="card-rating">
                <span>⭐ ${content.rating.toFixed(1)}</span>
              </div>
            ` : ''}
          </div>
          <div class="card-info">
            <h3 class="card-title">${content.title}</h3>
            <p class="card-meta">${content.content_type} • ${content.genres ? content.genres.slice(0, 2).join(', ') : ''}</p>
          </div>
        </a>
      </div>
    `;
  }

  renderAutocomplete(results) {
    return results.map(item => `
      <a href="/content/details.html?id=${item.id}" class="autocomplete-item">
        <img src="${item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : '/images/placeholder.jpg'}" alt="${item.title}" />
        <div class="autocomplete-info">
          <div class="autocomplete-title">${item.title}</div>
          <div class="autocomplete-meta">${item.content_type} • ${item.rating ? `⭐ ${item.rating.toFixed(1)}` : 'N/A'}</div>
        </div>
      </a>
    `).join('');
  }

  // Public methods for inline handlers
  playTrailer(trailerUrl) {
    if (!trailerUrl) {
      this.showToast('Trailer not available', 'error');
      return;
    }
    
    // Open trailer in modal
    const modal = document.createElement('div');
    modal.className = 'trailer-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
        <iframe src="${trailerUrl.replace('watch?v=', 'embed/')}" frameborder="0" allowfullscreen></iframe>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async addToWatchlist(contentId) {
    if (!Auth.isAuthenticated()) {
      this.navigate('/auth/login.html');
      return;
    }
    
    try {
      await API.addInteraction(contentId, 'watchlist');
      this.showToast('Added to watchlist', 'success');
    } catch (error) {
      this.showToast('Failed to add to watchlist', 'error');
    }
  }

  async addToFavorites(contentId) {
    if (!Auth.isAuthenticated()) {
      this.navigate('/auth/login.html');
      return;
    }
    
    try {
      await API.addInteraction(contentId, 'favorite');
      this.showToast('Added to favorites', 'success');
    } catch (error) {
      this.showToast('Failed to add to favorites', 'error');
    }
  }

  updateNavigationStates() {
    // Update topbar
    const topbarLinks = document.querySelectorAll('.topbar a');
    topbarLinks.forEach(link => {
      if (link.href === window.location.href) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update mobile nav
    const mobileNavItems = document.querySelectorAll('.mobile-nav .nav-item');
    mobileNavItems.forEach(item => {
      if (item.href === window.location.href) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  handleSwipeLeft() {
    // Navigate to next item in carousel if focused
    const activeCarousel = document.querySelector('.content-carousel:hover');
    if (activeCarousel) {
      const carouselId = Array.from(this.carousels.keys()).find(key => 
        this.carousels.get(key).container === activeCarousel
      );
      if (carouselId) {
        this.carousels.get(carouselId).next();
      }
    }
  }

  handleSwipeRight() {
    // Navigate to previous item in carousel if focused
    const activeCarousel = document.querySelector('.content-carousel:hover');
    if (activeCarousel) {
      const carouselId = Array.from(this.carousels.keys()).find(key => 
        this.carousels.get(key).container === activeCarousel
      );
      if (carouselId) {
        this.carousels.get(carouselId).prev();
      }
    }
  }
}

// Content Carousel Class
class ContentCarousel {
  constructor(container) {
    this.container = container;
    this.items = container.querySelectorAll('.content-card');
    this.currentIndex = 0;
    this.itemsPerPage = this.calculateItemsPerPage();
    this.init();
  }

  init() {
    // Add navigation buttons
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'carousel-nav carousel-prev';
    this.prevBtn.innerHTML = '‹';
    this.prevBtn.onclick = () => this.prev();
    
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'carousel-nav carousel-next';
    this.nextBtn.innerHTML = '›';
    this.nextBtn.onclick = () => this.next();
    
    this.container.appendChild(this.prevBtn);
    this.container.appendChild(this.nextBtn);
    
    // Setup touch support
    this.setupTouch();
    
    // Update on resize
    window.addEventListener('resize', () => {
      this.itemsPerPage = this.calculateItemsPerPage();
      this.updatePosition();
    });
  }

  calculateItemsPerPage() {
    const containerWidth = this.container.offsetWidth;
    const itemWidth = 200; // Base item width
    return Math.floor(containerWidth / itemWidth);
  }

  prev() {
    this.currentIndex = Math.max(0, this.currentIndex - this.itemsPerPage);
    this.updatePosition();
  }

  next() {
    const maxIndex = Math.max(0, this.items.length - this.itemsPerPage);
    this.currentIndex = Math.min(maxIndex, this.currentIndex + this.itemsPerPage);
    this.updatePosition();
  }

  updatePosition() {
    const offset = this.currentIndex * (100 / this.itemsPerPage);
    this.container.style.transform = `translateX(-${offset}%)`;
    
    // Update button states
    this.prevBtn.disabled = this.currentIndex === 0;
    this.nextBtn.disabled = this.currentIndex >= this.items.length - this.itemsPerPage;
  }

  setupTouch() {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    this.container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
    });

    this.container.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const diff = startX - currentX;
      this.container.style.transform = `translateX(calc(-${this.currentIndex * (100 / this.itemsPerPage)}% - ${diff}px))`;
    });

    this.container.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const diff = startX - currentX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          this.next();
        } else {
          this.prev();
        }
      } else {
        this.updatePosition();
      }
    });
  }

  destroy() {
    // Cleanup
    this.prevBtn.remove();
    this.nextBtn.remove();
  }
}

// Virtual Scroll Class for Performance
class VirtualScroll {
  constructor(container, items, renderItem) {
    this.container = container;
    this.items = items;
    this.renderItem = renderItem;
    this.itemHeight = 300; // Estimated height
    this.visibleItems = [];
    this.init();
  }

  init() {
    this.container.style.position = 'relative';
    this.container.style.height = `${this.items.length * this.itemHeight}px`;
    
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-scroll-viewport';
    this.container.appendChild(this.viewport);
    
    this.container.addEventListener('scroll', () => this.handleScroll());
    this.render();
  }

  handleScroll() {
    cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = requestAnimationFrame(() => this.render());
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;
    
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.ceil((scrollTop + containerHeight) / this.itemHeight);
    
    // Clear previous items
    this.visibleItems.forEach(item => item.remove());
    this.visibleItems = [];
    
    // Render visible items
    for (let i = startIndex; i < endIndex && i < this.items.length; i++) {
      const itemEl = this.renderItem(this.items[i], i);
      itemEl.style.position = 'absolute';
      itemEl.style.top = `${i * this.itemHeight}px`;
      this.viewport.appendChild(itemEl);
      this.visibleItems.push(itemEl);
    }
  }

  destroy() {
    this.container.removeEventListener('scroll', this.handleScroll);
    this.viewport.remove();
  }
}

// Initialize app
const app = new CineScopeApp();

// Export for global access
window.app = app;