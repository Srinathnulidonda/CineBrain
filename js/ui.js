// CineScope UI Components and Utilities
window.CineScope.UI = {
  // Loading states
  loading: {
    show(element, text = 'Loading...') {
      if (typeof element === 'string') {
        element = document.querySelector(element);
      }

      if (!element) return;

      element.innerHTML = `
        <div class="d-flex justify-content-center align-items-center p-5">
          <div class="text-center">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted">${text}</p>
          </div>
        </div>
      `;
    },

    hide(element) {
      if (typeof element === 'string') {
        element = document.querySelector(element);
      }

      if (!element) return;
      element.innerHTML = '';
    },

    skeleton(element, count = 5) {
      if (typeof element === 'string') {
        element = document.querySelector(element);
      }

      if (!element) return;

      const skeletons = Array.from({ length: count }, () => `
        <div class="col-6 col-md-4 col-lg-3 col-xl-2 mb-4">
          <div class="card bg-dark border-0 h-100">
            <div class="skeleton-box" style="height: 300px;"></div>
            <div class="card-body">
              <div class="skeleton-line mb-2"></div>
              <div class="skeleton-line w-75 mb-2"></div>
              <div class="skeleton-line w-50"></div>
            </div>
          </div>
        </div>
      `).join('');

      element.innerHTML = `<div class="row">${skeletons}</div>`;
    }
  },

  // Toast notifications
  toast: {
    show(message, type = 'info', duration = 5000) {
      const toastId = 'toast-' + Date.now();
      const iconMap = {
        success: 'bi-check-circle',
        error: 'bi-exclamation-triangle',
        warning: 'bi-exclamation-circle',
        info: 'bi-info-circle'
      };

      const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert">
          <div class="d-flex">
            <div class="toast-body">
              <i class="bi ${iconMap[type]} me-2"></i>
              ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
          </div>
        </div>
      `;

      // Create toast container if it doesn't exist
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
      }

      container.insertAdjacentHTML('beforeend', toastHTML);

      const toastElement = document.getElementById(toastId);
      const toast = new bootstrap.Toast(toastElement, { delay: duration });
      toast.show();

      // Remove toast element after it's hidden
      toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
      });
    },

    success(message, duration) {
      this.show(message, 'success', duration);
    },

    error(message, duration) {
      this.show(message, 'danger', duration);
    },

    warning(message, duration) {
      this.show(message, 'warning', duration);
    },

    info(message, duration) {
      this.show(message, 'info', duration);
    }
  },

  // Modal utilities
  modal: {
    show(modalId, options = {}) {
      const modal = document.getElementById(modalId);
      if (modal) {
        const bsModal = new bootstrap.Modal(modal, options);
        bsModal.show();
        return bsModal;
      }
    },

    hide(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
          bsModal.hide();
        }
      }
    },

    create(id, title, body, footer = '', size = '') {
      const sizeClass = size ? `modal-${size}` : '';
      const modalHTML = `
        <div class="modal fade" id="${id}" tabindex="-1">
          <div class="modal-dialog ${sizeClass} modal-dialog-centered">
            <div class="modal-content bg-dark border-secondary">
              <div class="modal-header border-secondary">
                <h5 class="modal-title text-white">${title}</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body text-white">
                ${body}
              </div>
              ${footer ? `<div class="modal-footer border-secondary">${footer}</div>` : ''}
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);
      return document.getElementById(id);
    }
  },

  // Content card generation
  cards: {
    movie(content, options = {}) {
      const {
        showTrailer = true,
        showRating = true,
        showGenres = true,
        cardSize = 'default',
        onClick = null
      } = options;

      const cardId = CineScope.utils.generateCardId(content);
      const posterUrl = content.poster_path || '/assets/placeholder-poster.jpg';
      const rating = CineScope.utils.formatRating(content.rating);
      const genres = Array.isArray(content.genres) ? content.genres.slice(0, 2).join(', ') : '';

      const cardClass = cardSize === 'small' ? 'content-card-small' : 'content-card';

      return `
        <div class="col-6 col-md-4 col-lg-3 col-xl-2 mb-4">
          <div id="${cardId}" class="card ${cardClass} bg-dark border-0 h-100 position-relative" 
               ${onClick ? `onclick="${onClick}"` : ''} 
               style="cursor: pointer;">
            
            <div class="card-img-wrapper position-relative overflow-hidden">
              <img src="${posterUrl}" 
                   class="card-img-top" 
                   alt="${content.title}"
                   loading="lazy"
                   onerror="this.src='/assets/placeholder-poster.jpg'">
              
              ${showTrailer && content.youtube_trailer ? `
                <div class="card-overlay position-absolute w-100 h-100 d-flex align-items-center justify-content-center">
                  <button class="btn btn-primary btn-sm rounded-circle p-2" 
                          onclick="event.stopPropagation(); CineScope.UI.playTrailer('${content.youtube_trailer}')">
                    <i class="bi bi-play-fill"></i>
                  </button>
                </div>
              ` : ''}
              
              ${showRating && content.rating ? `
                <div class="position-absolute top-0 end-0 m-2">
                  <span class="badge bg-primary rounded-pill">
                    <i class="bi bi-star-fill me-1"></i>${rating}
                  </span>
                </div>
              ` : ''}
            </div>
            
            <div class="card-body p-3">
              <h6 class="card-title text-white mb-2 text-truncate" title="${content.title}">
                ${content.title}
              </h6>
              
              ${showGenres && genres ? `
                <p class="card-text text-muted small mb-2">${genres}</p>
              ` : ''}
              
              <div class="d-flex justify-content-between align-items-center">
                <span class="badge bg-secondary">${content.content_type?.toUpperCase() || 'MOVIE'}</span>
                
                <div class="btn-group" role="group">
                  <button class="btn btn-outline-light btn-sm" 
                          onclick="event.stopPropagation(); CineScope.UI.toggleWatchlist(${content.id})"
                          title="Add to Watchlist">
                    <i class="bi bi-bookmark"></i>
                  </button>
                  <button class="btn btn-outline-light btn-sm" 
                          onclick="event.stopPropagation(); CineScope.UI.toggleFavorite(${content.id})"
                          title="Add to Favorites">
                    <i class="bi bi-heart"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    anime(content, options = {}) {
      const animeOptions = {
        ...options,
        showGenres: true
      };

      // Add anime-specific styling or content
      let card = this.movie(content, animeOptions);

      // Replace content type badge
      if (content.anime_genres && content.anime_genres.length > 0) {
        const animeGenre = content.anime_genres[0].toUpperCase();
        card = card.replace('ANIME', animeGenre);
      }

      return card;
    },

    grid(contents, options = {}) {
      if (!contents || contents.length === 0) {
        return `
          <div class="text-center py-5">
            <i class="bi bi-film display-1 text-muted mb-3"></i>
            <h5 class="text-muted">No content found</h5>
            <p class="text-muted">Try adjusting your search or filters</p>
          </div>
        `;
      }

      const cards = contents.map(content => {
        if (content.content_type === 'anime') {
          return this.anime(content, options);
        }
        return this.movie(content, options);
      }).join('');

      return `<div class="row">${cards}</div>`;
    }
  },

  // Search functionality
  search: {
    init(inputSelector, resultsSelector, options = {}) {
      const input = document.querySelector(inputSelector);
      const results = document.querySelector(resultsSelector);

      if (!input || !results) return;

      const {
        minLength = 2,
        debounceDelay = 300,
        showHistory = true,
        onSelect = null
      } = options;

      const debouncedSearch = CineScope.utils.debounce(async (query) => {
        if (query.length < minLength) {
          results.innerHTML = '';
          return;
        }

        try {
          CineScope.UI.loading.show(results, 'Searching...');
          const response = await CineScope.HTTP.content.search(query);

          if (response.results && response.results.length > 0) {
            results.innerHTML = CineScope.UI.cards.grid(response.results, {
              onClick: onSelect ? `${onSelect}(this)` : null
            });
          } else {
            results.innerHTML = `
              <div class="text-center py-5">
                <i class="bi bi-search display-1 text-muted mb-3"></i>
                <h5 class="text-muted">No results found</h5>
                <p class="text-muted">Try different keywords</p>
              </div>
            `;
          }
        } catch (error) {
          CineScope.UI.toast.error('Search failed: ' + error.message);
          results.innerHTML = `
            <div class="text-center py-5">
              <i class="bi bi-exclamation-triangle display-1 text-danger mb-3"></i>
              <h5 class="text-danger">Search Error</h5>
              <p class="text-muted">${error.message}</p>
            </div>
          `;
        }
      }, debounceDelay);

      input.addEventListener('input', (e) => {
        debouncedSearch(e.target.value.trim());
      });

      // Show search history on focus
      if (showHistory) {
        input.addEventListener('focus', () => {
          if (!input.value.trim()) {
            const history = CineScope.Storage.searchHistory.get();
            if (history.length > 0) {
              const historyHTML = history.map(query => `
                <div class="search-history-item p-2 border-bottom border-secondary" 
                     onclick="document.querySelector('${inputSelector}').value='${query}'; document.querySelector('${inputSelector}').dispatchEvent(new Event('input'))">
                  <i class="bi bi-clock-history me-2 text-muted"></i>
                  ${query}
                </div>
              `).join('');

              results.innerHTML = `
                <div class="search-history">
                  <h6 class="text-muted mb-3">Recent Searches</h6>
                  ${historyHTML}
                </div>
              `;
            }
          }
        });
      }
    }
  },

  // Interactive elements
  toggleWatchlist(contentId) {
    // This will be implemented based on user authentication status
    if (!CineScope.Storage.user.isLoggedIn()) {
      CineScope.UI.toast.warning('Please login to add to watchlist');
      return;
    }

    CineScope.HTTP.user.recordInteraction(contentId, 'watchlist')
      .then(() => {
        CineScope.UI.toast.success('Added to watchlist');
      })
      .catch(error => {
        CineScope.UI.toast.error('Failed to add to watchlist: ' + error.message);
      });
  },

  toggleFavorite(contentId) {
    if (!CineScope.Storage.user.isLoggedIn()) {
      CineScope.UI.toast.warning('Please login to add to favorites');
      return;
    }

    CineScope.HTTP.user.recordInteraction(contentId, 'favorite')
      .then(() => {
        CineScope.UI.toast.success('Added to favorites');
      })
      .catch(error => {
        CineScope.UI.toast.error('Failed to add to favorites: ' + error.message);
      });
  },

  playTrailer(youtubeUrl) {
    if (!youtubeUrl) return;

    const videoId = youtubeUrl.includes('v=') ? youtubeUrl.split('v=')[1].split('&')[0] : youtubeUrl.split('/').pop();
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

    const modal = CineScope.UI.modal.create(
      'trailerModal',
      'Trailer',
      `<div class="ratio ratio-16x9">
        <iframe src="${embedUrl}" allowfullscreen></iframe>
      </div>`,
      '',
      'lg'
    );

    CineScope.UI.modal.show('trailerModal');

    // Clean up modal after hiding
    modal.addEventListener('hidden.bs.modal', () => {
      modal.remove();
    });
  },

  // Utility functions
  formatGenres(genres, maxCount = 3) {
    if (!Array.isArray(genres)) return '';
    return genres.slice(0, maxCount).join(', ');
  },

  updatePageTitle(title) {
    document.title = title ? `${title} - CineScope` : 'CineScope - Premium Movie & TV Discovery';
  },

  // Responsive image loading
  lazyLoadImages() {
    const images = document.querySelectorAll('img[loading="lazy"]');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }
};