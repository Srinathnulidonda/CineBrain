// CineScope UI Components and Interactions
class UIManager {
  constructor() {
    this.components = new Map();
    this.observers = new Map();
    this.eventListeners = new Map();
    this.modals = new Map();
    this.toasts = [];
    this.loadingStates = new Set();

    this.init();
  }

  init() {
    this.initIntersectionObserver();
    this.initToastContainer();
    this.initGlobalEventListeners();
    this.initKeyboardShortcuts();
  }

  // Initialize Intersection Observer for lazy loading
  initIntersectionObserver() {
    if (!CONFIG.BROWSER_SUPPORT.intersection_observer) {
      return;
    }

    this.lazyLoadObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.handleLazyLoad(entry.target);
          this.lazyLoadObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: CONFIG.PERFORMANCE.INTERSECTION_THRESHOLD,
      rootMargin: `${CONFIG.PERFORMANCE.LAZY_LOAD_THRESHOLD}px`
    });
  }

  // Initialize toast container
  initToastContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'position-fixed top-0 end-0 p-3';
      container.style.zIndex = '1080';
      document.body.appendChild(container);
    }
  }

  // Initialize global event listeners
  initGlobalEventListeners() {
    // Handle authentication state changes
    window.addEventListener('user-logout', () => {
      this.handleUserLogout();
    });

    window.addEventListener('token-update', (event) => {
      this.handleTokenUpdate(event.detail.token);
    });

    // Handle network state changes
    window.addEventListener('online', () => {
      this.showToast('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
      this.showToast('You are offline. Some features may be limited.', 'warning', 5000);
    });

    // Handle visibility changes for performance
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAnimations();
      } else {
        this.resumeAnimations();
      }
    });

    // Handle resize for responsive updates
    window.addEventListener('resize', this.debounce(() => {
      this.handleResize();
    }, 250));
  }

  // Initialize keyboard shortcuts
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Escape key to close modals
      if (event.key === 'Escape') {
        this.closeAllModals();
      }

      // Ctrl/Cmd + K for search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        this.focusSearch();
      }

      // Ctrl/Cmd + / for help
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        this.showKeyboardShortcuts();
      }
    });
  }

  // Handle lazy loading
  handleLazyLoad(element) {
    if (element.dataset.src) {
      const img = element.tagName === 'IMG' ? element : element.querySelector('img');
      if (img) {
        img.src = element.dataset.src;
        img.onload = () => {
          element.classList.add('loaded');
          img.classList.remove('loading-skeleton');
        };
        img.onerror = () => {
          img.src = CONFIG.PLACEHOLDER_IMAGE;
          element.classList.add('error');
        };
      }
    }

    if (element.dataset.component) {
      this.loadComponent(element.dataset.component, element);
    }
  }

  // Component factory
  createComponent(type, data = {}, options = {}) {
    switch (type) {
      case 'content-card':
        return this.createContentCard(data, options);
      case 'content-card-anime':
        return this.createAnimeCard(data, options);
      case 'rating-badge':
        return this.createRatingBadge(data.rating);
      case 'trailer-modal':
        return this.createTrailerModal(data);
      case 'loading-skeleton':
        return this.createLoadingSkeleton(options);
      case 'error-message':
        return this.createErrorMessage(data.message, options);
      case 'search-bar':
        return this.createSearchBar(options);
      case 'genre-filter':
        return this.createGenreFilter(data.genres, options);
      case 'user-menu':
        return this.createUserMenu(data.user);
      case 'recommendation-section':
        return this.createRecommendationSection(data, options);
      default:
        console.warn(`Unknown component type: ${type}`);
        return null;
    }
  }

  // Create content card
  createContentCard(content, options = {}) {
    const {
      showGenres = true,
      showRating = true,
      showOverview = false,
      clickHandler = null,
      size = 'default'
    } = options;

    const cardElement = document.createElement('div');
    cardElement.className = `content-card ${size === 'small' ? 'content-card-sm' : ''} tw-cursor-pointer tw-group`;
    cardElement.dataset.contentId = content.id;

    const imageUrl = this.getOptimizedImageUrl(content.poster_path, 'w300');
    const rating = parseFloat(content.rating) || 0;

    cardElement.innerHTML = `
      <div class="content-card-image tw-relative tw-overflow-hidden">
        <img 
          class="content-card-img tw-w-full tw-h-full tw-object-cover tw-transition-transform tw-duration-300 loading-skeleton" 
          data-src="${imageUrl}"
          alt="${this.escapeHtml(content.title)}"
          loading="lazy"
        >
        <div class="content-card-overlay tw-absolute tw-inset-0 tw-bg-gradient-to-t tw-from-black/80 tw-to-transparent tw-opacity-0 tw-transition-opacity tw-duration-300 group-hover:tw-opacity-100 tw-flex tw-items-center tw-justify-center">
          <button class="btn btn-primary btn-sm play-btn tw-gap-2" aria-label="Play trailer">
            <svg class="tw-w-4 tw-h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.841z"/>
            </svg>
            Play
          </button>
        </div>
        ${showRating && rating > 0 ? `
          <div class="tw-absolute tw-top-2 tw-right-2">
            ${this.createRatingBadge(rating)}
          </div>
        ` : ''}
      </div>
      <div class="content-card-info">
        <h3 class="content-card-title tw-text-sm tw-font-semibold tw-mb-1 tw-line-clamp-2" title="${this.escapeHtml(content.title)}">
          ${this.escapeHtml(content.title)}
        </h3>
        <div class="content-card-meta tw-flex tw-items-center tw-gap-2 tw-text-xs tw-text-gray-400 tw-mb-2">
          <span class="tw-capitalize">${content.content_type}</span>
          ${content.release_date ? `<span>•</span><span>${new Date(content.release_date).getFullYear()}</span>` : ''}
        </div>
        ${showGenres && content.genres && content.genres.length > 0 ? `
          <div class="content-card-genre tw-text-xs tw-text-blue-400">
            ${content.genres.slice(0, 2).join(', ')}
          </div>
        ` : ''}
        ${showOverview && content.overview ? `
          <p class="tw-text-xs tw-text-gray-500 tw-mt-2 tw-line-clamp-3">
            ${this.escapeHtml(content.overview)}
          </p>
        ` : ''}
      </div>
    `;

    // Add event listeners
    cardElement.addEventListener('click', (event) => {
      if (event.target.closest('.play-btn')) {
        event.stopPropagation();
        this.playTrailer(content);
      } else if (clickHandler) {
        clickHandler(content);
      } else {
        this.navigateToContent(content.id);
      }
    });

    // Add to lazy loading observer
    if (this.lazyLoadObserver) {
      this.lazyLoadObserver.observe(cardElement);
    }

    return cardElement;
  }

  // Create anime card (specialized version)
  createAnimeCard(anime, options = {}) {
    const animeCard = this.createContentCard(anime, {
      ...options,
      showGenres: true
    });

    // Add anime-specific styling
    animeCard.classList.add('anime-card');

    // Add anime genres if available
    if (anime.anime_genres && anime.anime_genres.length > 0) {
      const genreElement = animeCard.querySelector('.content-card-genre');
      if (genreElement) {
        genreElement.innerHTML = `
          <span class="tw-text-purple-400">${anime.anime_genres[0]}</span>
          ${anime.genres ? `<span class="tw-text-blue-400 tw-ml-2">${anime.genres.slice(0, 1).join('')}</span>` : ''}
        `;
      }
    }

    return animeCard;
  }

  // Create rating badge
  createRatingBadge(rating) {
    if (!rating || rating === 0) {
      return '<span class="rating-badge">N/A</span>';
    }

    const numRating = parseFloat(rating);
    let badgeClass = 'rating-badge';

    if (numRating >= CONFIG.RATING_RANGES.HIGH.min) {
      badgeClass += ' high';
    } else if (numRating >= CONFIG.RATING_RANGES.MEDIUM.min) {
      badgeClass += ' medium';
    } else {
      badgeClass += ' low';
    }

    return `
      <span class="${badgeClass}">
        <svg class="tw-w-3 tw-h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
        ${numRating.toFixed(1)}
      </span>
    `;
  }

  // Create trailer modal
  createTrailerModal(content) {
    const modalId = `trailer-modal-${content.id}`;

    if (this.modals.has(modalId)) {
      return this.modals.get(modalId);
    }

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = modalId;
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', `${modalId}-title`);
    modal.setAttribute('aria-hidden', 'true');

    const youtubeUrl = content.youtube_trailer ?
      `${CONFIG.YOUTUBE_EMBED_BASE}${content.youtube_trailer.replace(CONFIG.YOUTUBE_BASE, '')}?autoplay=1&rel=0` :
      null;

    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content bg-dark border-secondary">
          <div class="modal-header border-secondary">
            <h5 class="modal-title text-white" id="${modalId}-title">
              ${this.escapeHtml(content.title)} - Trailer
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0">
            ${youtubeUrl ? `
              <div class="ratio ratio-16x9">
                <iframe 
                  src="${youtubeUrl}" 
                  title="${this.escapeHtml(content.title)} Trailer"
                  allowfullscreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              </div>
            ` : `
              <div class="tw-p-8 tw-text-center">
                <div class="tw-text-gray-400 tw-mb-4">
                  <svg class="tw-w-16 tw-h-16 tw-mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </div>
                <p class="text-muted">Trailer not available for this content.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(modal);

    // Initialize Bootstrap modal
    const bsModal = new bootstrap.Modal(modal);
    this.modals.set(modalId, { element: modal, bootstrap: bsModal });

    // Clean up when modal is hidden
    modal.addEventListener('hidden.bs.modal', () => {
      const iframe = modal.querySelector('iframe');
      if (iframe) {
        iframe.src = iframe.src; // Reset iframe to stop video
      }
    });

    return { element: modal, bootstrap: bsModal };
  }

  // Create loading skeleton
  createLoadingSkeleton(options = {}) {
    const { type = 'card', count = 1 } = options;
    const container = document.createElement('div');

    if (type === 'card') {
      container.className = 'tw-grid tw-grid-cols-2 md:tw-grid-cols-4 lg:tw-grid-cols-5 tw-gap-4';

      for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'tw-space-y-3';
        skeleton.innerHTML = `
          <div class="skeleton-card loading-skeleton"></div>
          <div class="skeleton-title loading-skeleton"></div>
          <div class="skeleton-text loading-skeleton tw-w-3/4"></div>
        `;
        container.appendChild(skeleton);
      }
    } else if (type === 'list') {
      container.className = 'tw-space-y-4';

      for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'tw-flex tw-gap-4';
        skeleton.innerHTML = `
          <div class="tw-w-16 tw-h-24 loading-skeleton tw-rounded"></div>
          <div class="tw-flex-1 tw-space-y-2">
            <div class="skeleton-title loading-skeleton"></div>
            <div class="skeleton-text loading-skeleton"></div>
            <div class="skeleton-text loading-skeleton tw-w-2/3"></div>
          </div>
        `;
        container.appendChild(skeleton);
      }
    }

    return container;
  }

  // Create error message
  createErrorMessage(message, options = {}) {
    const { showRetry = true, retryHandler = null } = options;

    const errorElement = document.createElement('div');
    errorElement.className = 'error-message tw-text-center tw-py-8';

    errorElement.innerHTML = `
      <div class="error-icon tw-mb-4">
        <svg class="tw-w-12 tw-h-12 tw-mx-auto tw-text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <p class="tw-text-red-400 tw-mb-4">${this.escapeHtml(message)}</p>
      ${showRetry ? `
        <button class="btn btn-outline-primary retry-btn">
          <svg class="tw-w-4 tw-h-4 tw-mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Try Again
        </button>
      ` : ''}
    `;

    if (showRetry && retryHandler) {
      const retryBtn = errorElement.querySelector('.retry-btn');
      retryBtn.addEventListener('click', retryHandler);
    }

    return errorElement;
  }

  // Create search bar
  createSearchBar(options = {}) {
    const {
      placeholder = 'Search movies, TV shows, anime...',
      showFilters = true,
      onSearch = null
    } = options;

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container tw-mb-6';

    searchContainer.innerHTML = `
      <div class="tw-relative">
        <div class="tw-absolute tw-inset-y-0 tw-left-0 tw-pl-3 tw-flex tw-items-center tw-pointer-events-none">
          <svg class="tw-w-5 tw-h-5 tw-text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input 
          type="text" 
          class="form-control tw-pl-10 tw-pr-4 tw-py-3 tw-text-lg" 
          placeholder="${placeholder}"
          id="search-input"
          autocomplete="off"
        >
        <div class="tw-absolute tw-inset-y-0 tw-right-0 tw-pr-3 tw-flex tw-items-center">
          <kbd class="tw-px-2 tw-py-1 tw-text-xs tw-font-semibold tw-text-gray-400 tw-bg-gray-800 tw-border tw-border-gray-600 tw-rounded">
            ⌘K
          </kbd>
        </div>
      </div>
      ${showFilters ? `
        <div class="search-filters tw-mt-4 tw-flex tw-flex-wrap tw-gap-3">
          <select class="form-select tw-w-auto" id="content-type-filter">
            <option value="">All Types</option>
            <option value="movie">Movies</option>
            <option value="tv">TV Shows</option>
            <option value="anime">Anime</option>
          </select>
          <select class="form-select tw-w-auto" id="genre-filter">
            <option value="">All Genres</option>
            ${CONFIG.MOVIE_GENRES.map(genre => `<option value="${genre.toLowerCase()}">${genre}</option>`).join('')}
          </select>
          <select class="form-select tw-w-auto" id="language-filter">
            <option value="">All Languages</option>
            ${CONFIG.REGIONAL_LANGUAGES.map(lang => `<option value="${lang.code}">${lang.flag} ${lang.name}</option>`).join('')}
          </select>
        </div>
      ` : ''}
      <div class="search-suggestions tw-hidden tw-absolute tw-w-full tw-bg-gray-800 tw-border tw-border-gray-600 tw-rounded-lg tw-mt-1 tw-shadow-lg tw-z-50" id="search-suggestions"></div>
    `;

    const searchInput = searchContainer.querySelector('#search-input');
    const suggestionsContainer = searchContainer.querySelector('#search-suggestions');

    // Add search functionality
    let searchTimeout;
    searchInput.addEventListener('input', (event) => {
      clearTimeout(searchTimeout);
      const query = event.target.value.trim();

      if (query.length >= 2) {
        searchTimeout = setTimeout(() => {
          this.showSearchSuggestions(query, suggestionsContainer);
        }, CONFIG.PERFORMANCE.DEBOUNCE_DELAY);
      } else {
        this.hideSearchSuggestions(suggestionsContainer);
      }
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const query = event.target.value.trim();
        if (query.length >= 2) {
          this.performSearch(query, onSearch);
        }
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (event) => {
      if (!searchContainer.contains(event.target)) {
        this.hideSearchSuggestions(suggestionsContainer);
      }
    });

    return searchContainer;
  }

  // Create recommendation section
  createRecommendationSection(data, options = {}) {
    const { title, type, showHeader = true, showViewAll = true } = options;

    const section = document.createElement('section');
    section.className = 'recommendation-section tw-mb-8';
    section.dataset.type = type;

    if (showHeader) {
      const header = document.createElement('div');
      header.className = 'tw-flex tw-items-center tw-justify-between tw-mb-4';
      header.innerHTML = `
        <h2 class="tw-text-2xl tw-font-bold tw-text-white">${title}</h2>
        ${showViewAll ? `
          <button class="btn btn-ghost btn-sm view-all-btn" data-type="${type}">
            View All
            <svg class="tw-w-4 tw-h-4 tw-ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        ` : ''}
      `;
      section.appendChild(header);
    }

    const contentContainer = document.createElement('div');
    contentContainer.className = 'content-grid tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 md:tw-grid-cols-4 lg:tw-grid-cols-5 xl:tw-grid-cols-6 tw-gap-4';

    if (data.recommendations && data.recommendations.length > 0) {
      data.recommendations.forEach(content => {
        const cardType = content.content_type === 'anime' ? 'content-card-anime' : 'content-card';
        const card = this.createComponent(cardType, content);
        contentContainer.appendChild(card);
      });
    } else {
      contentContainer.appendChild(this.createLoadingSkeleton({ type: 'card', count: 6 }));
    }

    section.appendChild(contentContainer);

    // Add view all functionality
    if (showViewAll) {
      const viewAllBtn = section.querySelector('.view-all-btn');
      viewAllBtn?.addEventListener('click', () => {
        this.navigateToSection(type);
      });
    }

    return section;
  }

  // Toast notifications
  showToast(message, type = 'info', duration = 3000) {
    const toastId = `toast-${Date.now()}`;
    const iconMap = {
      success: 'M5 13l4 4L19 7',
      error: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };

    const colorMap = {
      success: 'text-bg-success',
      error: 'text-bg-danger',
      warning: 'text-bg-warning',
      info: 'text-bg-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${colorMap[type]} border-0 tw-mb-2`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center">
          <svg class="tw-w-5 tw-h-5 tw-mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconMap[type]}"/>
          </svg>
          ${this.escapeHtml(message)}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, {
      autohide: duration > 0,
      delay: duration
    });

    bsToast.show();

    // Clean up after toast is hidden
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
      this.toasts = this.toasts.filter(t => t.id !== toastId);
    });

    this.toasts.push({ id: toastId, element: toast, bootstrap: bsToast });

    return bsToast;
  }

  // Modal management
  showModal(modalId, options = {}) {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.bootstrap.show();
      return modal.bootstrap;
    }
    return null;
  }

  hideModal(modalId) {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.bootstrap.hide();
    }
  }

  closeAllModals() {
    this.modals.forEach(modal => {
      modal.bootstrap.hide();
    });
  }

  // Loading states
  showLoading(element, message = 'Loading...') {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }

    if (!element) return;

    element.classList.add('content-loading');
    this.loadingStates.add(element);

    // Add loading overlay
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay tw-absolute tw-inset-0 tw-bg-black/50 tw-flex tw-items-center tw-justify-center tw-z-10';
    overlay.innerHTML = `
      <div class="tw-text-center">
        <div class="loading-spinner loading-spinner-lg tw-mx-auto tw-mb-2"></div>
        <div class="tw-text-sm tw-text-gray-300">${this.escapeHtml(message)}</div>
      </div>
    `;

    element.style.position = 'relative';
    element.appendChild(overlay);
  }

  hideLoading(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }

    if (!element) return;

    element.classList.remove('content-loading');
    this.loadingStates.delete(element);

    const overlay = element.querySelector('.loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Navigation helpers
  navigateToContent(contentId) {
    window.location.href = `/content/details.html?id=${contentId}`;
  }

  navigateToSection(type) {
    const routeMap = {
      trending: '/index.html#trending',
      'new-releases': '/index.html#new-releases',
      'critics-choice': '/index.html#critics-choice',
      anime: '/content/anime.html',
      genre: '/content/genre.html',
      regional: '/content/regional.html'
    };

    window.location.href = routeMap[type] || '/index.html';
  }

  // Search functionality
  async showSearchSuggestions(query, container) {
    try {
      // Get search history first
      const history = Storage.getSearchHistory();
      const historyMatches = history
        .filter(item => item.query.includes(query.toLowerCase()))
        .slice(0, 3);

      // Get live suggestions from API
      const response = await API.searchContent(query, { page: 1, limit: 5 });
      const suggestions = response.results || [];

      let suggestionsHTML = '';

      // Add history matches
      if (historyMatches.length > 0) {
        suggestionsHTML += `
          <div class="tw-p-2 tw-border-b tw-border-gray-600">
            <div class="tw-text-xs tw-text-gray-400 tw-mb-2">Recent searches</div>
            ${historyMatches.map(item => `
              <button class="suggestion-item tw-w-full tw-text-left tw-p-2 tw-rounded hover:tw-bg-gray-700 tw-flex tw-items-center" data-query="${item.query}">
                <svg class="tw-w-4 tw-h-4 tw-mr-2 tw-text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                ${this.escapeHtml(item.query)}
              </button>
            `).join('')}
          </div>
        `;
      }

      // Add live suggestions
      if (suggestions.length > 0) {
        suggestionsHTML += `
          <div class="tw-p-2">
            <div class="tw-text-xs tw-text-gray-400 tw-mb-2">Suggestions</div>
            ${suggestions.map(item => `
              <button class="suggestion-item tw-w-full tw-text-left tw-p-2 tw-rounded hover:tw-bg-gray-700 tw-flex tw-items-center" data-content-id="${item.id}">
                <img src="${this.getOptimizedImageUrl(item.poster_path, 'w92')}" alt="" class="tw-w-8 tw-h-12 tw-object-cover tw-rounded tw-mr-3">
                <div class="tw-flex-1">
                  <div class="tw-text-sm tw-font-medium">${this.escapeHtml(item.title)}</div>
                  <div class="tw-text-xs tw-text-gray-400">${item.content_type} • ${item.rating ? item.rating.toFixed(1) : 'N/A'}</div>
                </div>
              </button>
            `).join('')}
          </div>
        `;
      }

      if (suggestionsHTML) {
        container.innerHTML = suggestionsHTML;
        container.classList.remove('tw-hidden');

        // Add click handlers
        container.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', (event) => {
            const query = event.currentTarget.dataset.query;
            const contentId = event.currentTarget.dataset.contentId;

            if (query) {
              this.performSearch(query);
            } else if (contentId) {
              this.navigateToContent(contentId);
            }

            this.hideSearchSuggestions(container);
          });
        });
      } else {
        this.hideSearchSuggestions(container);
      }
    } catch (error) {
      console.warn('Failed to load search suggestions:', error);
      this.hideSearchSuggestions(container);
    }
  }

  hideSearchSuggestions(container) {
    container.classList.add('tw-hidden');
    container.innerHTML = '';
  }

  performSearch(query, callback = null) {
    Storage.addToSearchHistory(query);

    if (callback) {
      callback(query);
    } else {
      window.location.href = `/content/search.html?q=${encodeURIComponent(query)}`;
    }
  }

  focusSearch() {
    const searchInput = document.querySelector('#search-input, .search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  // Trailer functionality
  playTrailer(content) {
    if (content.youtube_trailer) {
      const modal = this.createTrailerModal(content);
      modal.bootstrap.show();
    } else {
      this.showToast('Trailer not available for this content', 'warning');
    }
  }

  // Utility functions
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getOptimizedImageUrl(path, size = 'w500') {
    if (!path) return CONFIG.PLACEHOLDER_IMAGE;
    if (path.startsWith('http')) return path;
    return `${CONFIG.TMDB_IMAGE_BASE}${size}${path}`;
  }

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
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Event handling
  handleUserLogout() {
    this.showToast('You have been logged out', 'info');
    setTimeout(() => {
      window.location.href = '/auth/login.html';
    }, 1000);
  }

  handleTokenUpdate(token) {
    // Silently update authentication state
    console.log('Token updated');
  }

  handleResize() {
    // Update responsive components
    this.updateResponsiveComponents();
  }

  updateResponsiveComponents() {
    // Recalculate layouts for responsive components
    const currentBreakpoint = this.getCurrentBreakpoint();
    document.documentElement.dataset.breakpoint = currentBreakpoint;
  }

  getCurrentBreakpoint() {
    const width = window.innerWidth;
    if (width >= CONFIG.BREAKPOINTS.XXL) return 'xxl';
    if (width >= CONFIG.BREAKPOINTS.XL) return 'xl';
    if (width >= CONFIG.BREAKPOINTS.LG) return 'lg';
    if (width >= CONFIG.BREAKPOINTS.MD) return 'md';
    if (width >= CONFIG.BREAKPOINTS.SM) return 'sm';
    return 'xs';
  }

  pauseAnimations() {
    document.body.classList.add('animations-paused');
  }

  resumeAnimations() {
    document.body.classList.remove('animations-paused');
  }

  showKeyboardShortcuts() {
    // Show keyboard shortcuts modal
    this.showToast('Press Ctrl+K to search, Escape to close modals', 'info', 5000);
  }

  // Component cleanup
  cleanup() {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Clean up event listeners
    this.eventListeners.forEach((cleanup, element) => cleanup());
    this.eventListeners.clear();

    // Clean up modals
    this.modals.forEach(modal => modal.bootstrap.dispose());
    this.modals.clear();

    // Clean up toasts
    this.toasts.forEach(toast => toast.bootstrap.dispose());
    this.toasts = [];

    // Clean up loading states
    this.loadingStates.forEach(element => this.hideLoading(element));
    this.loadingStates.clear();
  }
}

// Create global UI instance
const UI = new UIManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI;
}

// Global access
window.UI = UI;