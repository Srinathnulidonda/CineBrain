import { CONFIG } from './config.js';
import { api } from './api.js';
import { auth } from './auth.js';

// Main Application Controller
class CineBrainApp {
  constructor() {
    this.currentPage = null;
    this.components = new Map();
    this.router = new Router();
    this.init();
  }

  async init() {
    // Mark performance start
    performance.mark('app-init-start');
    
    // Initialize components
    this.initializeComponents();
    
    // Setup router
    this.router.init();
    
    // Load common UI elements
    await this.loadCommonUI();
    
    // Initialize page
    this.initializePage();
    
    // Mark performance end
    performance.mark('app-init-end');
    performance.measure('app-init', 'app-init-start', 'app-init-end');
  }

  initializeComponents() {
    // Register component classes
    this.components.set('ContentCarousel', ContentCarousel);
    this.components.set('VirtualScroller', VirtualScroller);
    this.components.set('Toast', Toast);
    this.components.set('LazyImage', LazyImage);
  }

  async loadCommonUI() {
    // Load topbar and mobile nav
    const topbarContainer = document.getElementById('topbar-container');
    const mobileNavContainer = document.getElementById('mobile-nav-container');
    
    if (topbarContainer) {
      try {
        const response = await fetch('/components/layout/topbar.html');
        topbarContainer.innerHTML = await response.text();
      } catch (error) {
        console.error('Failed to load topbar:', error);
      }
    }
    
    if (mobileNavContainer && window.innerWidth <= 768) {
      try {
        const response = await fetch('/components/layout/mobile-nav.html');
        mobileNavContainer.innerHTML = await response.text();
      } catch (error) {
        console.error('Failed to load mobile nav:', error);
      }
    }
  }

  initializePage() {
    const pageType = document.body.getAttribute('data-page');
    if (pageType && pageControllers[pageType]) {
      this.currentPage = new pageControllers[pageType]();
    }
  }
}

// Router for client-side navigation
class Router {
  constructor() {
    this.routes = new Map();
  }

  init() {
    // Handle browser navigation
    window.addEventListener('popstate', () => this.handleRoute());
    
    // Intercept link clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && link.origin === window.location.origin) {
        const shouldIntercept = !link.hasAttribute('data-native') && 
                               !link.href.includes('#') &&
                               !link.href.includes('admin');
        
        if (shouldIntercept) {
          e.preventDefault();
          this.navigate(link.href);
        }
      }
    });
  }

  navigate(url) {
    window.history.pushState(null, '', url);
    this.handleRoute();
  }

  handleRoute() {
    // For now, just reload the page for navigation
    // In a more complex SPA, we'd handle route changes here
    window.location.reload();
  }
}

// Content Carousel Component
class ContentCarousel {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      itemsPerView: 5,
      gap: 16,
      autoplay: false,
      ...options
    };
    this.currentIndex = 0;
    this.items = [];
    this.init();
  }

  init() {
    this.setupStructure();
    this.loadContent();
    this.setupControls();
    this.handleResize();
  }

  setupStructure() {
    this.element.innerHTML = `
      <div class="carousel-header">
        <h2 class="carousel-title">${this.options.title || ''}</h2>
        <div class="carousel-controls">
          <button class="carousel-prev" aria-label="Previous">‹</button>
          <button class="carousel-next" aria-label="Next">›</button>
        </div>
      </div>
      <div class="carousel-container">
        <div class="carousel-track"></div>
      </div>
    `;
    
    this.track = this.element.querySelector('.carousel-track');
    this.prevBtn = this.element.querySelector('.carousel-prev');
    this.nextBtn = this.element.querySelector('.carousel-next');
  }

  async loadContent() {
    const endpoint = this.element.getAttribute('data-endpoint');
    const params = JSON.parse(this.element.getAttribute('data-params') || '{}');
    
    try {
      const data = await api.get(endpoint, params);
      this.items = data.recommendations || data.results || [];
      this.renderItems();
    } catch (error) {
      console.error('Failed to load carousel content:', error);
      this.showError();
    }
  }

  renderItems() {
    this.track.innerHTML = this.items.map(item => `
      <div class="carousel-item" data-id="${item.id}">
        <div class="content-card" data-init='${JSON.stringify(item)}'>
          <div class="card-poster">
            <img src="${item.poster_path}" alt="${item.title}" loading="lazy">
            <div class="card-overlay">
              <button class="play-trailer" title="Play Trailer">▶</button>
            </div>
          </div>
          <div class="card-info">
            <h3 class="card-title">${item.title}</h3>
            <div class="card-meta">
              <span class="card-rating">⭐ ${item.rating?.toFixed(1) || 'N/A'}</span>
              <span class="card-type">${item.content_type?.toUpperCase() || 'MOVIE'}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    
    // Initialize content cards
    this.track.querySelectorAll('.content-card').forEach(card => {
      const data = JSON.parse(card.getAttribute('data-init'));
      if (window.ContentCard) {
        new window.ContentCard(card, data);
      }
    });
    
    this.updateControls();
  }

  setupControls() {
    this.prevBtn.addEventListener('click', () => this.slide(-1));
    this.nextBtn.addEventListener('click', () => this.slide(1));
    
    // Touch support
    let touchStartX = 0;
    this.track.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });
    
    this.track.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        this.slide(diff > 0 ? 1 : -1);
      }
    });
  }

  slide(direction) {
    const itemWidth = this.track.firstElementChild?.offsetWidth || 200;
    const containerWidth = this.track.parentElement.offsetWidth;
    const itemsVisible = Math.floor(containerWidth / (itemWidth + this.options.gap));
    const maxIndex = Math.max(0, this.items.length - itemsVisible);
    
    this.currentIndex = Math.max(0, Math.min(maxIndex, this.currentIndex + direction));
    
    const translateX = -(this.currentIndex * (itemWidth + this.options.gap));
    this.track.style.transform = `translateX(${translateX}px)`;
    
    this.updateControls();
  }

  updateControls() {
    this.prevBtn.disabled = this.currentIndex === 0;
    this.nextBtn.disabled = this.currentIndex >= this.items.length - this.getItemsPerView();
  }

  getItemsPerView() {
    const width = window.innerWidth;
    if (width < 576) return 2;
    if (width < 768) return 3;
    if (width < 992) return 4;
    if (width < 1400) return 5;
    return 6;
  }

  handleResize() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.currentIndex = 0;
        this.slide(0);
      }, 250);
    });
  }

  showError() {
    this.track.innerHTML = '<div class="carousel-error">Failed to load content</div>';
  }
}

// Virtual Scroller for infinite lists
class VirtualScroller {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      itemHeight: 150,
      buffer: 5,
      endpoint: null,
      ...options
    };
    this.items = [];
    this.page = 1;
    this.loading = false;
    this.hasMore = true;
    this.init();
  }

  init() {
    this.setupStructure();
    this.loadInitialData();
    this.setupScrollListener();
  }

  setupStructure() {
    this.element.innerHTML = `
      <div class="virtual-scroller-content"></div>
      <div class="virtual-scroller-loader">Loading...</div>
    `;
    
    this.content = this.element.querySelector('.virtual-scroller-content');
    this.loader = this.element.querySelector('.virtual-scroller-loader');
  }

  async loadInitialData() {
    await this.loadMore();
  }

  async loadMore() {
    if (this.loading || !this.hasMore) return;
    
    this.loading = true;
    this.loader.style.display = 'block';
    
    try {
      const data = await api.get(this.options.endpoint, { 
        page: this.page,
        limit: 20 
      });
      
      const newItems = data.recommendations || data.results || [];
      this.items.push(...newItems);
      this.renderNewItems(newItems);
      
      this.page++;
      this.hasMore = newItems.length === 20;
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      this.loading = false;
      this.loader.style.display = 'none';
    }
  }

  renderNewItems(items) {
    const fragment = document.createDocumentFragment();
    
    items.forEach(item => {
      const element = document.createElement('div');
      element.className = 'scroller-item';
      element.innerHTML = this.options.renderItem(item);
      fragment.appendChild(element);
    });
    
    this.content.appendChild(fragment);
  }

  setupScrollListener() {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMore();
      }
    }, { threshold: 0.1 });
    
    observer.observe(this.loader);
  }
}

// Toast Notifications
class Toast {
  static show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, duration);
  }
}

// Lazy Image Loading
class LazyImage {
  static init() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      // Fallback for older browsers
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
      });
    }
  }
}

// Page Controllers
const pageControllers = {
  home: class HomePage {
    constructor() {
      this.init();
    }
    
    async init() {
      // Initialize carousels
      document.querySelectorAll('[data-component="carousel"]').forEach(el => {
        new ContentCarousel(el);
      });
      
      // Initialize hero section
      this.initHero();
      
      // Setup lazy loading
      LazyImage.init();
    }
    
    async initHero() {
      const hero = document.querySelector('.hero-section');
      if (!hero) return;
      
      try {
        const data = await api.get('TRENDING', { limit: 5 });
        const items = data.recommendations || [];
        
        if (items.length > 0) {
          this.setupHeroRotation(hero, items);
        }
      } catch (error) {
        console.error('Failed to load hero content:', error);
      }
    }
    
    setupHeroRotation(hero, items) {
      let currentIndex = 0;
      
      const updateHero = () => {
        const item = items[currentIndex];
        hero.style.backgroundImage = `url(${item.backdrop_path || item.poster_path})`;
        hero.querySelector('.hero-title').textContent = item.title;
        hero.querySelector('.hero-overview').textContent = item.overview || '';
        hero.querySelector('.hero-play').onclick = () => {
          window.location.href = `/content/details.html?id=${item.id}`;
        };
        
        currentIndex = (currentIndex + 1) % items.length;
      };
      
      updateHero();
      setInterval(updateHero, 5000);
    }
  },
  
  search: class SearchPage {
    constructor() {
      this.init();
    }
    
    init() {
      this.searchInput = document.getElementById('main-search');
      this.resultsContainer = document.getElementById('search-results');
      this.filtersContainer = document.getElementById('search-filters');
      
      this.setupSearch();
      this.setupFilters();
    }
    
    setupSearch() {
      let debounceTimer;
      
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
          this.resultsContainer.innerHTML = '';
          return;
        }
        
        debounceTimer = setTimeout(() => this.performSearch(query), 300);
      });
      
      // Check for initial query
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q');
      if (query) {
        this.searchInput.value = query;
        this.performSearch(query);
      }
    }
    
    async performSearch(query) {
      this.showLoader();
      
      try {
        const filters = this.getActiveFilters();
        const data = await api.get('SEARCH', {
          query,
          type: filters.type || 'multi',
          page: 1
        });
        
        this.renderResults(data.results || []);
      } catch (error) {
        console.error('Search failed:', error);
        this.showError();
      }
    }
    
    renderResults(results) {
      if (results.length === 0) {
        this.resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
        return;
      }
      
      this.resultsContainer.innerHTML = results.map(item => `
        <div class="search-result-card" onclick="window.location.href='/content/details.html?id=${item.id}'">
          <img src="${item.poster_path}" alt="${item.title}" loading="lazy">
          <div class="result-info">
            <h3>${item.title}</h3>
            <div class="result-meta">
              <span class="type">${item.content_type}</span>
              <span class="rating">⭐ ${item.rating?.toFixed(1) || 'N/A'}</span>
            </div>
            <p class="overview">${item.overview || ''}</p>
          </div>
        </div>
      `).join('');
    }
    
    setupFilters() {
      // Filter implementation
    }
    
    getActiveFilters() {
      // Get active filter values
      return {};
    }
    
    showLoader() {
      this.resultsContainer.innerHTML = '<div class="loader">Searching...</div>';
    }
    
    showError() {
      this.resultsContainer.innerHTML = '<div class="error">Search failed. Please try again.</div>';
    }
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CineBrainApp());
} else {
  new CineBrainApp();
}

// Export for global access
window.CineBrainApp = CineBrainApp;
window.Toast = Toast;
window.api = api;
window.auth = auth;