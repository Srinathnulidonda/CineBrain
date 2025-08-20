// UI Components and Utilities
class UIManager {
  constructor() {
    this.toastContainer = null;
    this.trailerModal = null;
    this.loadingOverlay = null;
  }

  // Initialize UI components
  init() {
    this.createToastContainer();
    this.createTrailerModal();
    this.createLoadingOverlay();
  }

  // Toast Notifications
  createToastContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    this.toastContainer = document.getElementById('toast-container');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;

    const icon = {
      success: '<i class="bi bi-check-circle-fill text-success"></i>',
      error: '<i class="bi bi-x-circle-fill text-danger"></i>',
      warning: '<i class="bi bi-exclamation-triangle-fill text-warning"></i>',
      info: '<i class="bi bi-info-circle-fill text-info"></i>'
    }[type] || '';

    toast.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        ${icon}
        <span>${message}</span>
      </div>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, CONFIG.TOAST_DURATION);
  }

  // Loading States
  createLoadingOverlay() {
    if (!document.getElementById('loading-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-none';
      overlay.style.background = 'rgba(0, 0, 0, 0.8)';
      overlay.style.zIndex = '9999';
      overlay.innerHTML = `
        <div class="d-flex justify-content-center align-items-center h-100">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    this.loadingOverlay = document.getElementById('loading-overlay');
  }

  showLoading() {
    this.loadingOverlay?.classList.remove('d-none');
  }

  hideLoading() {
    this.loadingOverlay?.classList.add('d-none');
  }

  // Trailer Modal
  createTrailerModal() {
    if (!document.getElementById('trailer-modal')) {
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div class="modal fade" id="trailer-modal" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content bg-dark">
              <div class="modal-header border-0">
                <h5 class="modal-title">Trailer</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body p-0">
                <div class="ratio ratio-16x9">
                  <iframe id="trailer-iframe" src="" allowfullscreen></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    this.trailerModal = new bootstrap.Modal(document.getElementById('trailer-modal'));
  }

  showTrailer(youtubeId) {
    const iframe = document.getElementById('trailer-iframe');
    iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
    this.trailerModal.show();

    // Clean up on close
    document.getElementById('trailer-modal').addEventListener('hidden.bs.modal', () => {
      iframe.src = '';
    }, { once: true });
  }

  // Content Cards
  createContentCard(content) {
    const card = document.createElement('div');
    card.className = 'content-card hover-lift cursor-pointer';
    card.onclick = () => window.location.href = `/content/details?id=${content.id}`;

    const posterUrl = content.poster_path ?
      (content.poster_path.startsWith('http') ? content.poster_path :
        `${CONFIG.TMDB_IMAGE_BASE}/w300${content.poster_path}`) :
      '/assets/no-poster.jpg';

    card.innerHTML = `
      <div class="position-relative">
        <img src="${posterUrl}" alt="${content.title}" class="poster w-100" loading="lazy">
        ${content.rating ? `<span class="rating"><i class="bi bi-star-fill"></i> ${content.rating.toFixed(1)}</span>` : ''}
        ${content.youtube_trailer ? `
          <button class="btn btn-sm btn-primary position-absolute bottom-0 start-0 m-2" 
                  onclick="event.stopPropagation(); ui.showTrailer('${content.youtube_trailer.split('v=')[1]}')">
            <i class="bi bi-play-fill"></i>
          </button>
        ` : ''}
      </div>
      <div class="p-2">
        <h6 class="mb-1 text-truncate">${content.title}</h6>
        <div class="d-flex gap-2 flex-wrap">
          ${content.content_type ? `<span class="badge badge-blue">${content.content_type.toUpperCase()}</span>` : ''}
          ${content.release_date ? `<small class="text-muted">${new Date(content.release_date).getFullYear()}</small>` : ''}
        </div>
      </div>
    `;

    return card;
  }

  createContentGrid(contents, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    container.className = 'content-grid tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 md:tw-grid-cols-4 lg:tw-grid-cols-5 tw-gap-4';

    contents.forEach((content, index) => {
      const card = this.createContentCard(content);
      card.classList.add('stagger-item');
      card.style.animationDelay = `${index * 0.05}s`;
      container.appendChild(card);
    });
  }

  // Skeleton Loaders
  createSkeletonCard() {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton tw-aspect-poster tw-rounded-lg mb-2"></div>
      <div class="skeleton h-4 tw-rounded mb-2"></div>
      <div class="skeleton h-3 w-75 tw-rounded"></div>
    `;
    return skeleton;
  }

  showSkeletonGrid(containerId, count = 12) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    container.className = 'content-grid tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 md:tw-grid-cols-4 lg:tw-grid-cols-5 tw-gap-4';

    for (let i = 0; i < count; i++) {
      container.appendChild(this.createSkeletonCard());
    }
  }

  // Pagination
  createPagination(currentPage, totalPages, onPageChange) {
    const nav = document.createElement('nav');
    nav.className = 'mt-4';

    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>`;
    ul.appendChild(prevLi);

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${i === currentPage ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
      ul.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>`;
    ul.appendChild(nextLi);

    nav.appendChild(ul);

    // Add click handlers
    nav.addEventListener('click', (e) => {
      e.preventDefault();
      if (e.target.classList.contains('page-link')) {
        const page = parseInt(e.target.dataset.page);
        if (page && page !== currentPage && page >= 1 && page <= totalPages) {
          onPageChange(page);
        }
      }
    });

    return nav;
  }

  // Search Bar
  createSearchBar(placeholder = 'Search movies, TV shows, anime...', onSearch) {
    const searchBar = document.createElement('div');
    searchBar.className = 'search-bar position-relative';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control';
    input.placeholder = placeholder;

    const searchIcon = document.createElement('i');
    searchIcon.className = 'bi bi-search position-absolute top-50 end-0 translate-middle-y me-3';
    searchIcon.style.cursor = 'pointer';

    searchBar.appendChild(input);
    searchBar.appendChild(searchIcon);

    // Debounced search
    let debounceTimer;
    const performSearch = () => {
      const query = input.value.trim();
      if (query && onSearch) {
        onSearch(query);
      }
    };

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(performSearch, CONFIG.DEBOUNCE_DELAY);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        performSearch();
      }
    });

    searchIcon.addEventListener('click', performSearch);

    return searchBar;
  }

  // Genre Chips
  createGenreChips(genres, selectedGenre, onGenreSelect) {
    const container = document.createElement('div');
    container.className = 'd-flex gap-2 flex-wrap mb-4';

    genres.forEach(genre => {
      const chip = document.createElement('button');
      chip.className = `btn btn-sm ${selectedGenre === genre ? 'btn-primary' : 'btn-outline-primary'}`;
      chip.textContent = genre;
      chip.onclick = () => onGenreSelect(genre);
      container.appendChild(chip);
    });

    return container;
  }

  // Rating Badge
  createRatingBadge(rating) {
    const badge = document.createElement('span');
    badge.className = 'badge badge-blue';
    badge.innerHTML = `<i class="bi bi-star-fill"></i> ${rating.toFixed(1)}`;
    return badge;
  }

  // Type Badge
  createTypeBadge(type) {
    const badge = document.createElement('span');
    badge.className = `badge ${type === 'movie' ? 'badge-blue' : 'badge-purple'}`;
    badge.textContent = type.toUpperCase();
    return badge;
  }

  // Empty State
  createEmptyState(message = 'No content found', icon = 'bi-film') {
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-5';
    emptyState.innerHTML = `
      <i class="bi ${icon} display-1 text-muted mb-3"></i>
      <p class="text-muted">${message}</p>
    `;
    return emptyState;
  }

  // Error State
  createErrorState(message = 'Something went wrong', onRetry) {
    const errorState = document.createElement('div');
    errorState.className = 'text-center py-5';
    errorState.innerHTML = `
      <i class="bi bi-exclamation-circle display-1 text-danger mb-3"></i>
      <p class="text-muted">${message}</p>
      ${onRetry ? '<button class="btn btn-primary" id="retry-btn">Try Again</button>' : ''}
    `;

    if (onRetry) {
      setTimeout(() => {
        document.getElementById('retry-btn')?.addEventListener('click', onRetry);
      }, 0);
    }

    return errorState;
  }

  // Utilities
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatRuntime(minutes) {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  truncateText(text, maxLength = 150) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

// Create global instance
window.ui = new UIManager();