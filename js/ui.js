// UI utilities and components
const UI = {
    // Toast notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container') || this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} animate-slide-in`;
        toast.innerHTML = `
      <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    },

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },

    // Loading states
    showLoading(element) {
        element.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    },

    showSkeletonGrid(element, count = 8) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += this.getSkeletonCard();
        }
        element.innerHTML = `<div class="row g-4">${html}</div>`;
    },

    getSkeletonCard() {
        return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="skeleton-card">
          <div class="skeleton-img"></div>
          <div class="skeleton-body">
            <div class="skeleton-title"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
      </div>
    `;
    },

    // Content cards
    createContentCard(content) {
        const posterUrl = content.poster_path || '/assets/no-poster.jpg';
        const rating = content.rating ? content.rating.toFixed(1) : 'N/A';
        const year = content.release_date ? new Date(content.release_date).getFullYear() : '';

        return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="content-card" onclick="window.location.href='/content/details?id=${content.id}'">
          <div class="content-poster">
            <img src="${posterUrl}" alt="${content.title}" loading="lazy">
            <div class="content-overlay">
              <button class="btn-play" onclick="event.stopPropagation(); UI.playTrailer('${content.youtube_trailer || ''}', '${content.title}')">
                <i class="bi bi-play-circle-fill"></i>
              </button>
            </div>
          </div>
          <div class="content-info">
            <h6 class="content-title">${content.title}</h6>
            <div class="content-meta">
              <span class="badge-rating">
                <i class="bi bi-star-fill"></i> ${rating}
              </span>
              ${year ? `<span class="text-muted">${year}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    },

    createContentGrid(contents) {
        return contents.map(content => this.createContentCard(content)).join('');
    },

    // Trailer modal
    playTrailer(youtubeUrl, title) {
        if (!youtubeUrl) {
            this.showToast('No trailer available', 'error');
            return;
        }

        const videoId = youtubeUrl.includes('youtube.com') ?
            youtubeUrl.split('v=')[1]?.split('&')[0] : '';

        if (!videoId) {
            this.showToast('Invalid trailer URL', 'error');
            return;
        }

        const modal = document.getElementById('trailerModal') || this.createTrailerModal();
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');

        modalTitle.textContent = title;
        modalBody.innerHTML = `
      <div class="ratio ratio-16x9">
        <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                frameborder="0" 
                allowfullscreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
        </iframe>
      </div>
    `;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Clear iframe on hide
        modal.addEventListener('hidden.bs.modal', () => {
            modalBody.innerHTML = '';
        }, { once: true });
    },

    createTrailerModal() {
        const modal = document.createElement('div');
        modal.id = 'trailerModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content bg-dark">
          <div class="modal-header border-0">
            <h5 class="modal-title"></h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-0"></div>
        </div>
      </div>
    `;
        document.body.appendChild(modal);
        return modal;
    },

    // Pagination
    createPagination(currentPage, totalPages, onPageChange) {
        if (totalPages <= 1) return '';

        let html = '<nav><ul class="pagination justify-content-center">';

        // Previous
        html += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">
          <i class="bi bi-chevron-left"></i>
        </a>
      </li>
    `;

        // Page numbers
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        if (start > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (start > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = start; i <= end; i++) {
            html += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
        }

        if (end < totalPages) {
            if (end < totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        // Next
        html += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">
          <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    `;

        html += '</ul></nav>';

        // Add event listeners after rendering
        setTimeout(() => {
            document.querySelectorAll('.pagination .page-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = parseInt(e.target.closest('[data-page]').dataset.page);
                    if (page && page !== currentPage && onPageChange) {
                        onPageChange(page);
                    }
                });
            });
        }, 0);

        return html;
    },

    // Filters
    createGenreChips(genres, selectedGenre, onSelect) {
        return genres.map(genre => `
      <button class="chip ${selectedGenre === genre ? 'active' : ''}" 
              onclick="${onSelect}('${genre}')">
        ${genre}
      </button>
    `).join('');
    },

    // Debounce utility
    debounce(func, delay = CONFIG.DEBOUNCE_DELAY) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    // Form validation
    validateForm(formElement) {
        const inputs = formElement.querySelectorAll('[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('is-invalid');
                isValid = false;
            } else {
                input.classList.remove('is-invalid');
            }
        });

        return isValid;
    },

    // Mobile detection
    isMobile() {
        return window.innerWidth < 992;
    }
};