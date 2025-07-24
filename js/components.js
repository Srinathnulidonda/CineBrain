

// Reusable Components for CineScope
class ComponentManager {
    constructor() {
        this.components = new Map();
        this.init();
    }

    init() {
        this.registerComponents();
        this.setupEventListeners();
    }

    registerComponents() {
        // Register all available components
        this.components.set('contentCard', this.createContentCard);
        this.components.set('searchResult', this.createSearchResult);
        this.components.set('loadingSpinner', this.createLoadingSpinner);
        this.components.set('errorMessage', this.createErrorMessage);
        this.components.set('notification', this.createNotification);
        this.components.set('modal', this.createModal);
        this.components.set('carousel', this.createCarousel);
        this.components.set('pagination', this.createPagination);
    }

    setupEventListeners() {
        // Global component event handling
        document.addEventListener('click', this.handleComponentClick.bind(this));
        document.addEventListener('change', this.handleComponentChange.bind(this));
    }

    handleComponentClick(event) {
        const target = event.target;
        
        // Handle dropdown toggles
        if (target.classList.contains('dropdown-toggle')) {
            event.preventDefault();
            this.toggleDropdown(target);
        }

        // Handle modal triggers
        if (target.hasAttribute('data-modal-target')) {
            event.preventDefault();
            this.showModal(target.getAttribute('data-modal-target'));
        }

        // Handle tooltip triggers
        if (target.hasAttribute('data-tooltip')) {
            this.showTooltip(target);
        }
    }

    handleComponentChange(event) {
        const target = event.target;
        
        // Handle rating inputs
        if (target.classList.contains('rating-input')) {
            this.updateRating(target);
        }
    }

    // Content Card Component
    createContentCard(data, options = {}) {
        const {
            size = 'default',
            showOverlay = true,
            showActions = true,
            clickable = true
        } = options;

        const cardClass = `content-card ${size === 'large' ? 'content-card-large' : ''}`;
        const posterUrl = data.poster_path || '/assets/images/placeholder-poster.jpg';
        const rating = data.rating ? data.rating.toFixed(1) : 'N/A';
        const year = data.release_date ? new Date(data.release_date).getFullYear() : '';
        const genres = Array.isArray(data.genres) ? data.genres.slice(0, 2) : [];

        return `
            <div class="${cardClass}" ${clickable ? `onclick="openContentDetails(${data.id})"` : ''} 
                 data-content-id="${data.id}">
                <div class="content-card-poster">
                    <img src="${posterUrl}" alt="${data.title}" class="content-card-image" loading="lazy">
                    ${showOverlay ? `
                        <div class="content-card-overlay">
                            ${showActions ? `
                                <div class="content-card-actions">
                                    <button class="card-action-btn" onclick="event.stopPropagation(); playTrailer(${data.id})" title="Play Trailer">
                                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
                                    </button>
                                    <button class="card-action-btn" onclick="event.stopPropagation(); addToWatchlist(${data.id})" title="Add to Watchlist">
                                        <svg viewBox="0 0 24 24"><path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1z" fill="currentColor"/></svg>
                                    </button>
                                    <button class="card-action-btn" onclick="event.stopPropagation(); addToFavorites(${data.id})" title="Add to Favorites">
                                        <svg viewBox="0 0 24 24"><path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    <div class="content-card-rating">${rating}</div>
                    <div class="content-card-type">${data.content_type || 'movie'}</div>
                </div>
                <div class="content-card-info">
                    <h3 class="content-card-title">${data.title}</h3>
                    <div class="content-card-meta">
                        ${year ? `<span class="content-card-year">${year}</span>` : ''}
                        ${rating !== 'N/A' ? `<span>⭐ ${rating}</span>` : ''}
                    </div>
                    <div class="content-card-genres">
                        ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Search Result Component
    createSearchResult(data) {
        const posterUrl = data.poster_path || '/assets/images/placeholder-poster.jpg';
        const year = data.release_date ? new Date(data.release_date).getFullYear() : '';
        const rating = data.rating ? data.rating.toFixed(1) : 'N/A';

        return `
            <div class="search-result-card" onclick="openContentDetails(${data.id})">
                <img src="${posterUrl}" alt="${data.title}" class="search-result-poster" loading="lazy">
                <div class="search-result-info">
                    <h3 class="search-result-title">${data.title}</h3>
                    <div class="search-result-meta">
                        <span class="search-result-type">${data.content_type || 'movie'}</span>
                        ${year ? `<span>${year}</span>` : ''}
                        ${rating !== 'N/A' ? `<span>⭐ ${rating}</span>` : ''}
                    </div>
                    <p class="search-result-description">
                        ${data.overview ? (data.overview.length > 150 ? data.overview.substring(0, 150) + '...' : data.overview) : 'No description available.'}
                    </p>
                </div>
            </div>
        `;
    }

    // Loading Spinner Component
    createLoadingSpinner(text = 'Loading...', size = 'default') {
        const sizeClass = size === 'large' ? 'loading-large' : size === 'small' ? 'loading-small' : '';
        
        return `
            <div class="loading-container ${sizeClass}">
                <div class="loading-spinner"></div>
                <p class="loading-text">${text}</p>
            </div>
        `;
    }

    // Error Message Component
    createErrorMessage(message, showRetry = false, retryCallback = null) {
        return `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h3 class="error-title">Something went wrong</h3>
                <p class="error-message">${message}</p>
                ${showRetry ? `
                    <button class="retry-btn" onclick="${retryCallback || 'location.reload()'}">
                        Try Again
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Notification Component
    createNotification(message, type = 'info', duration = 5000) {
        const notificationId = `notification-${Date.now()}`;
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            min-width: 300px;
            max-width: 500px;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, duration);
        }

        return notificationId;
    }

    getNotificationColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    // Modal Component
    createModal(options = {}) {
        const {
            id = `modal-${Date.now()}`,
            title = 'Modal',
            content = '',
            size = 'default',
            showClose = true,
            backdrop = true
        } = options;

        const sizeClass = size === 'large' ? 'modal-lg' : size === 'small' ? 'modal-sm' : '';

        const modalHTML = `
            <div class="modal fade" id="${id}" tabindex="-1" ${backdrop ? 'data-bs-backdrop="true"' : 'data-bs-backdrop="static"'}>
                <div class="modal-dialog modal-dialog-centered ${sizeClass}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            ${showClose ? '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' : ''}
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        return id;
    }

    // Carousel Component
    createCarousel(items, options = {}) {
        const {
            id = `carousel-${Date.now()}`,
            showControls = true,
            showIndicators = false,
            autoPlay = false,
            interval = 5000
        } = options;

        const carouselHTML = `
            <div id="${id}" class="carousel slide" ${autoPlay ? `data-bs-ride="carousel" data-bs-interval="${interval}"` : ''}>
                ${showIndicators ? `
                    <div class="carousel-indicators">
                        ${items.map((_, index) => `
                            <button type="button" data-bs-target="#${id}" data-bs-slide-to="${index}" 
                                    ${index === 0 ? 'class="active"' : ''}></button>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="carousel-inner">
                    ${items.map((item, index) => `
                        <div class="carousel-item ${index === 0 ? 'active' : ''}">
                            ${item}
                        </div>
                    `).join('')}
                </div>
                ${showControls ? `
                    <button class="carousel-control-prev" type="button" data-bs-target="#${id}" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon"></span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#${id}" data-bs-slide="next">
                        <span class="carousel-control-next-icon"></span>
                    </button>
                ` : ''}
            </div>
        `;

        return carouselHTML;
    }

    // Pagination Component
    createPagination(currentPage, totalPages, baseUrl = '') {
        if (totalPages <= 1) return '';

        const maxVisible = 5;
        const half = Math.floor(maxVisible / 2);
        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        const pages = [];
        
        // Previous button
        if (currentPage > 1) {
            pages.push(`
                <li class="page-item">
                    <a class="page-link" href="${baseUrl}?page=${currentPage - 1}">Previous</a>
                </li>
            `);
        }

        // First page + ellipsis
        if (start > 1) {
            pages.push(`
                <li class="page-item">
                    <a class="page-link" href="${baseUrl}?page=1">1</a>
                </li>
            `);
            if (start > 2) {
                pages.push('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
        }

        // Page numbers
        for (let i = start; i <= end; i++) {
            pages.push(`
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="${baseUrl}?page=${i}">${i}</a>
                </li>
            `);
        }

        // Last page + ellipsis
        if (end < totalPages) {
            if (end < totalPages - 1) {
                pages.push('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
            pages.push(`
                <li class="page-item">
                    <a class="page-link" href="${baseUrl}?page=${totalPages}">${totalPages}</a>
                </li>
            `);
        }

        // Next button
        if (currentPage < totalPages) {
            pages.push(`
                <li class="page-item">
                    <a class="page-link" href="${baseUrl}?page=${currentPage + 1}">Next</a>
                </li>
            `);
        }

        return `
            <nav aria-label="Page navigation">
                <ul class="pagination justify-content-center">
                    ${pages.join('')}
                </ul>
            </nav>
        `;
    }

    // Utility Methods
    toggleDropdown(trigger) {
        const dropdown = trigger.nextElementSibling;
        if (dropdown && dropdown.classList.contains('dropdown-menu')) {
            dropdown.classList.toggle('show');
            
            // Close on click outside
            if (dropdown.classList.contains('show')) {
                const closeDropdown = (e) => {
                    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
                        dropdown.classList.remove('show');
                        document.removeEventListener('click', closeDropdown);
                    }
                };
                setTimeout(() => document.addEventListener('click', closeDropdown), 0);
            }
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal && typeof bootstrap !== 'undefined') {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    }

    showTooltip(element) {
        const tooltipText = element.getAttribute('data-tooltip');
        if (!tooltipText) return;

        // Remove existing tooltip
        const existingTooltip = document.querySelector('.custom-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = tooltipText;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            z-index: 10000;
            pointer-events: none;
            white-space: nowrap;
        `;

        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        tooltip.style.left = `${rect.left + (rect.width - tooltipRect.width) / 2}px`;
        tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;

        // Remove on mouse leave
        const removeTooltip = () => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
            element.removeEventListener('mouseleave', removeTooltip);
        };
        element.addEventListener('mouseleave', removeTooltip);
    }

    updateRating(input) {
        const rating = parseFloat(input.value);
        const stars = input.parentNode.querySelectorAll('.star');
        
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
    }
}

// Global components instance
window.Components = new ComponentManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentManager;
}