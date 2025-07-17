// Reusable UI Components

class MovieCard {
    constructor(movie, options = {}) {
        this.movie = movie;
        this.options = {
            showRating: true,
            showGenres: true,
            showYear: true,
            size: 'medium', // small, medium, large
            showOverlay: true,
            ...options
        };
    }

    render() {
        const posterUrl = this.getPosterUrl();
        const rating = this.movie.rating || this.movie.vote_average || 0;
        const year = this.getYear();
        const genres = this.getGenres();

        return `
            <div class="movie-card ${this.options.size}" data-movie-id="${this.movie.id}" onclick="openContentDetail(${this.movie.id})">
                <div class="movie-poster">
                    <img src="${posterUrl}" alt="${this.movie.title}" loading="lazy" onerror="this.src='assets/images/placeholders/poster-placeholder.jpg'">
                    ${this.options.showOverlay ? this.renderOverlay() : ''}
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">${this.movie.title}</h3>
                    ${this.renderMetadata(rating, year, genres)}
                </div>
            </div>
        `;
    }

    renderOverlay() {
        return `
            <div class="movie-overlay">
                <button class="play-btn btn" onclick="event.stopPropagation(); playContent(${this.movie.id})" title="Play">
                    <i class="fas fa-play"></i>
                </button>
                <button class="wishlist-btn btn" onclick="event.stopPropagation(); toggleWishlist(${this.movie.id})" title="Add to Wishlist">
                    <i class="far fa-heart"></i>
                </button>
            </div>
        `;
    }

    renderMetadata(rating, year, genres) {
        let metadata = '';
        
        if (this.options.showRating && rating > 0) {
            metadata += `
                <div class="movie-meta">
                    <span class="movie-rating">
                        <i class="fas fa-star"></i>
                        ${rating.toFixed(1)}
                    </span>
                    ${this.options.showYear && year ? `<span class="movie-year">${year}</span>` : ''}
                </div>
            `;
        }
        
        if (this.options.showGenres && genres.length > 0) {
            metadata += `
                <div class="movie-genres">
                    ${genres.slice(0, 3).map(genre => `<span class="genre-badge">${genre}</span>`).join('')}
                </div>
            `;
        }
        
        return metadata;
    }

    getPosterUrl() {
        if (this.movie.poster_path) {
            if (this.movie.poster_path.startsWith('http')) {
                return this.movie.poster_path;
            }
            return `https://image.tmdb.org/t/p/w500${this.movie.poster_path}`;
        }
        return 'assets/images/placeholders/poster-placeholder.jpg';
    }

    getYear() {
        const date = this.movie.release_date || this.movie.first_air_date;
        return date ? new Date(date).getFullYear() : null;
    }

    getGenres() {
        if (this.movie.genre_names) {
            return this.movie.genre_names;
        }
        if (this.movie.genres) {
            return this.movie.genres.map(genre => 
                typeof genre === 'object' ? genre.name : genre
            );
        }
        return [];
    }
}

class Carousel {
    constructor(containerId, items, itemRenderer, options = {}) {
        this.container = document.getElementById(containerId);
        this.items = items;
        this.itemRenderer = itemRenderer;
        this.currentIndex = 0;
        this.options = {
            itemsPerView: 6,
            gap: 16,
            autoPlay: false,
            autoPlayInterval: 5000,
            showNavigation: true,
            responsive: {
                768: { itemsPerView: 4 },
                576: { itemsPerView: 2 }
            },
            ...options
        };
        
        this.autoPlayTimer = null;
        this.isPlaying = false;
    }

    render() {
        if (!this.container || !this.items.length) return;

        const carouselHTML = `
            <div class="carousel-container">
                ${this.options.showNavigation ? `
                    <button class="carousel-nav prev" onclick="this.carousel.prev()" ${this.currentIndex === 0 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                ` : ''}
                <div class="carousel-track" style="gap: ${this.options.gap}px;">
                    ${this.items.map((item, index) => `
                        <div class="carousel-item" data-index="${index}">
                            ${this.itemRenderer(item)}
                        </div>
                    `).join('')}
                </div>
                ${this.options.showNavigation ? `
                    <button class="carousel-nav next" onclick="this.carousel.next()" ${this.currentIndex >= this.getMaxIndex() ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        this.container.innerHTML = carouselHTML;
        this.attachEventListeners();
        this.updateResponsiveSettings();
        
        if (this.options.autoPlay) {
            this.startAutoPlay();
        }
        
        // Store reference for navigation buttons
        const navButtons = this.container.querySelectorAll('.carousel-nav');
        navButtons.forEach(btn => btn.carousel = this);
    }

    attachEventListeners() {
        const track = this.container.querySelector('.carousel-track');
        if (!track) return;

        // Touch/swipe support
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            this.pauseAutoPlay();
        });

        track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            e.preventDefault();
        });

        track.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            const diff = startX - currentX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            }
            
            if (this.options.autoPlay) {
                this.startAutoPlay();
            }
        });

        // Mouse wheel support
        track.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY > 0) {
                this.next();
            } else {
                this.prev();
            }
        });

        // Keyboard support
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prev();
            } else if (e.key === 'ArrowRight') {
                this.next();
            }
        });

        // Pause autoplay on hover
        if (this.options.autoPlay) {
            this.container.addEventListener('mouseenter', () => this.pauseAutoPlay());
            this.container.addEventListener('mouseleave', () => this.startAutoPlay());
        }

        // Responsive handling
        window.addEventListener('resize', () => this.updateResponsiveSettings());
    }

    updateResponsiveSettings() {
        const width = window.innerWidth;
        let itemsPerView = this.options.itemsPerView;

        for (const [breakpoint, settings] of Object.entries(this.options.responsive)) {
            if (width <= parseInt(breakpoint)) {
                itemsPerView = settings.itemsPerView;
                break;
            }
        }

        this.currentItemsPerView = itemsPerView;
        this.updateNavigation();
    }

    next() {
        const maxIndex = this.getMaxIndex();
        if (this.currentIndex < maxIndex) {
            this.currentIndex++;
            this.updatePosition();
            this.updateNavigation();
        }
    }

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updatePosition();
            this.updateNavigation();
        }
    }

    goTo(index) {
        const maxIndex = this.getMaxIndex();
        this.currentIndex = Math.max(0, Math.min(index, maxIndex));
        this.updatePosition();
        this.updateNavigation();
    }

    updatePosition() {
        const track = this.container.querySelector('.carousel-track');
        if (!track) return;

        const itemWidth = track.children[0]?.offsetWidth || 200;
        const translateX = -(this.currentIndex * (itemWidth + this.options.gap));
        track.style.transform = `translateX(${translateX}px)`;
    }

    updateNavigation() {
        const prevBtn = this.container.querySelector('.carousel-nav.prev');
        const nextBtn = this.container.querySelector('.carousel-nav.next');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentIndex === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentIndex >= this.getMaxIndex();
        }
    }

    getMaxIndex() {
        return Math.max(0, this.items.length - this.currentItemsPerView);
    }

    startAutoPlay() {
        if (!this.options.autoPlay || this.isPlaying) return;
        
        this.isPlaying = true;
        this.autoPlayTimer = setInterval(() => {
            if (this.currentIndex >= this.getMaxIndex()) {
                this.goTo(0);
            } else {
                this.next();
            }
        }, this.options.autoPlayInterval);
    }

    pauseAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
                        this.autoPlayTimer = null;
            this.isPlaying = false;
        }
    }

    destroy() {
        this.pauseAutoPlay();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

class Modal {
    constructor(options = {}) {
        this.options = {
            title: '',
            content: '',
            size: 'medium', // small, medium, large, xl
            closeOnBackdrop: true,
            showCloseButton: true,
            buttons: [],
            className: '',
            ...options
        };
        this.isOpen = false;
        this.element = null;
    }

    show() {
        if (this.isOpen) return;

        this.element = this.createElement();
        document.body.appendChild(this.element);
        document.body.classList.add('modal-open');
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.element.classList.add('show');
        });
        
        this.attachEventListeners();
        this.isOpen = true;
        
        // Focus management
        this.element.focus();
        
        // Trigger custom event
        this.element.dispatchEvent(new CustomEvent('modal:show'));
    }

    hide() {
        if (!this.isOpen || !this.element) return;

        this.element.classList.remove('show');
        
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            document.body.classList.remove('modal-open');
            this.isOpen = false;
            
            // Trigger custom event
            document.dispatchEvent(new CustomEvent('modal:hide'));
        }, 300);
    }

    createElement() {
        const modal = document.createElement('div');
        modal.className = `modal fade ${this.options.className}`;
        modal.tabIndex = -1;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        
        if (this.options.title) {
            modal.setAttribute('aria-labelledby', 'modalTitle');
        }

        modal.innerHTML = `
            <div class="modal-dialog modal-${this.options.size}">
                <div class="modal-content bg-dark-secondary border-0">
                    ${this.options.title || this.options.showCloseButton ? `
                        <div class="modal-header border-0">
                            ${this.options.title ? `<h5 class="modal-title text-white" id="modalTitle">${this.options.title}</h5>` : ''}
                            ${this.options.showCloseButton ? `
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            ` : ''}
                        </div>
                    ` : ''}
                    <div class="modal-body">
                        ${this.options.content}
                    </div>
                    ${this.options.buttons.length > 0 ? `
                        <div class="modal-footer border-0">
                            ${this.options.buttons.map(btn => `
                                <button type="button" class="btn ${btn.className || 'btn-outline-light'}" data-action="${btn.action || ''}">
                                    ${btn.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        return modal;
    }

    attachEventListeners() {
        if (!this.element) return;

        // Close button
        const closeBtn = this.element.querySelector('[data-bs-dismiss="modal"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Backdrop click
        if (this.options.closeOnBackdrop) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) {
                    this.hide();
                }
            });
        }

        // Action buttons
        const actionButtons = this.element.querySelectorAll('[data-action]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                if (action && this.options.onAction) {
                    this.options.onAction(action, this);
                }
            });
        });

        // Escape key
        document.addEventListener('keydown', this.handleEscape.bind(this));
    }

    handleEscape(e) {
        if (e.key === 'Escape' && this.isOpen) {
            this.hide();
        }
    }

    updateContent(content) {
        if (this.element) {
            const body = this.element.querySelector('.modal-body');
            if (body) {
                body.innerHTML = content;
            }
        }
    }

    updateTitle(title) {
        if (this.element) {
            const titleElement = this.element.querySelector('.modal-title');
            if (titleElement) {
                titleElement.textContent = title;
            }
        }
    }
}

class LoadingSkeleton {
    static movieCard() {
        return `
            <div class="skeleton-card">
                <div class="skeleton-poster"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-meta"></div>
                </div>
            </div>
        `;
    }

    static hero() {
        return `
            <div class="skeleton-hero">
                <div class="skeleton-hero-content">
                    <div class="skeleton-hero-title"></div>
                    <div class="skeleton-hero-description"></div>
                    <div class="skeleton-hero-buttons"></div>
                </div>
            </div>
        `;
    }

    static carousel(count = 6) {
        return `
            <div class="carousel-track d-flex gap-3">
                ${Array(count).fill(0).map(() => this.movieCard()).join('')}
            </div>
        `;
    }

    static contentGrid(count = 12) {
        return `
            <div class="content-grid row g-3">
                ${Array(count).fill(0).map(() => `
                    <div class="col-6 col-md-4 col-lg-3 col-xl-2">
                        ${this.movieCard()}
                    </div>
                `).join('')}
            </div>
        `;
    }
}

class Toast {
    constructor(message, type = 'info', options = {}) {
        this.message = message;
        this.type = type; // success, error, warning, info
        this.options = {
            duration: 5000,
            position: 'bottom-end',
            showProgress: true,
            closable: true,
            ...options
        };
        this.element = null;
        this.timer = null;
    }

    show() {
        this.element = this.createElement();
        const container = this.getContainer();
        container.appendChild(this.element);

        // Trigger animation
        requestAnimationFrame(() => {
            this.element.classList.add('show');
        });

        // Auto hide
        if (this.options.duration > 0) {
            this.timer = setTimeout(() => {
                this.hide();
            }, this.options.duration);
        }

        // Progress bar animation
        if (this.options.showProgress && this.options.duration > 0) {
            const progressBar = this.element.querySelector('.toast-progress');
            if (progressBar) {
                progressBar.style.animationDuration = `${this.options.duration}ms`;
            }
        }

        this.attachEventListeners();
    }

    hide() {
        if (!this.element) return;

        this.element.classList.remove('show');
        
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 300);

        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    createElement() {
        const toast = document.createElement('div');
        toast.className = `toast toast-${this.type} align-items-center`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        const icon = this.getIcon();
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center">
                    ${icon ? `<i class="${icon} me-2"></i>` : ''}
                    ${this.message}
                </div>
                ${this.options.closable ? `
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
                ` : ''}
            </div>
            ${this.options.showProgress && this.options.duration > 0 ? `
                <div class="toast-progress"></div>
            ` : ''}
        `;

        return toast;
    }

    getIcon() {
        const icons = {
            success: 'fas fa-check-circle text-success',
            error: 'fas fa-exclamation-circle text-danger',
            warning: 'fas fa-exclamation-triangle text-warning',
            info: 'fas fa-info-circle text-info'
        };
        return icons[this.type] || '';
    }

    getContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = `toast-container position-fixed ${this.options.position} p-3`;
            document.body.appendChild(container);
        }
        return container;
    }

    attachEventListeners() {
        if (!this.element) return;

        const closeBtn = this.element.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Pause on hover
        this.element.addEventListener('mouseenter', () => {
            if (this.timer) {
                clearTimeout(this.timer);
            }
        });

        this.element.addEventListener('mouseleave', () => {
            if (this.options.duration > 0) {
                this.timer = setTimeout(() => {
                    this.hide();
                }, 1000); // Reduced time after hover
            }
        });
    }

    static success(message, options = {}) {
        return new Toast(message, 'success', options).show();
    }

    static error(message, options = {}) {
        return new Toast(message, 'error', options).show();
    }

    static warning(message, options = {}) {
        return new Toast(message, 'warning', options).show();
    }

    static info(message, options = {}) {
        return new Toast(message, 'info', options).show();
    }
}

class SearchComponent {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            minLength: 2,
            debounceTime: 300,
            maxResults: 10,
            placeholder: 'Search movies, TV shows, anime...',
            onSelect: null,
            onSearch: null,
            ...options
        };
        
        this.debounceTimer = null;
        this.resultsContainer = null;
        this.isOpen = false;
        this.selectedIndex = -1;
        this.results = [];
        
        this.init();
    }

    init() {
        this.input.placeholder = this.options.placeholder;
        this.createResultsContainer();
        this.attachEventListeners();
    }

    createResultsContainer() {
        this.resultsContainer = document.createElement('div');
        this.resultsContainer.className = 'search-results d-none';
        this.input.parentNode.appendChild(this.resultsContainer);
    }

    attachEventListeners() {
        // Input events
        this.input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });

        this.input.addEventListener('focus', () => {
            if (this.results.length > 0) {
                this.showResults();
            }
        });

        this.input.addEventListener('blur', () => {
            // Delay hiding to allow for result clicks
            setTimeout(() => this.hideResults(), 150);
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.resultsContainer.contains(e.target)) {
                this.hideResults();
            }
        });
    }

    handleInput(value) {
        clearTimeout(this.debounceTimer);
        
        if (value.length < this.options.minLength) {
            this.hideResults();
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.search(value);
        }, this.options.debounceTime);
    }

    async search(query) {
        try {
            if (this.options.onSearch) {
                this.results = await this.options.onSearch(query);
            } else {
                const response = await api.searchContent(query);
                this.results = [
                    ...response.database_results.slice(0, 5),
                    ...response.tmdb_results.slice(0, 5)
                ].slice(0, this.options.maxResults);
            }
            
            this.renderResults();
            this.showResults();
        } catch (error) {
            console.error('Search error:', error);
            this.hideResults();
        }
    }

    renderResults() {
        if (this.results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="search-result-item text-center py-3">
                    <p class="text-gray-400 mb-0">No results found</p>
                </div>
            `;
            return;
        }

        this.resultsContainer.innerHTML = this.results.map((item, index) => `
            <div class="search-result-item" data-index="${index}" onclick="searchComponent.selectResult(${index})">
                <img src="${this.getPosterUrl(item)}" alt="${item.title}" class="search-result-poster" 
                     onerror="this.src='assets/images/placeholders/poster-placeholder.jpg'">
                <div class="search-result-info">
                    <h6>${item.title}</h6>
                    <p>${this.getYear(item)} • ${this.getType(item)}</p>
                </div>
            </div>
        `).join('');
    }

    getPosterUrl(item) {
        if (item.poster_path) {
            if (item.poster_path.startsWith('http')) {
                return item.poster_path;
            }
            return `https://image.tmdb.org/t/p/w92${item.poster_path}`;
        }
        return 'assets/images/placeholders/poster-placeholder.jpg';
    }

    getYear(item) {
        const date = item.release_date || item.first_air_date;
        return date ? new Date(date).getFullYear() : 'N/A';
    }

    getType(item) {
        return item.content_type || (item.title ? 'Movie' : 'TV Show');
    }

    handleKeydown(e) {
        if (!this.isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
                this.updateSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection();
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectResult(this.selectedIndex);
                }
                break;
            case 'Escape':
                this.hideResults();
                this.input.blur();
                break;
        }
    }

    updateSelection() {
        const items = this.resultsContainer.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    selectResult(index) {
        if (index >= 0 && index < this.results.length) {
            const result = this.results[index];
            this.input.value = result.title;
            this.hideResults();
            
            if (this.options.onSelect) {
                this.options.onSelect(result);
            } else {
                // Default action: navigate to content detail
                window.location.href = `movie-detail.html?id=${result.id}`;
            }
        }
    }

    showResults() {
        this.resultsContainer.classList.remove('d-none');
        this.isOpen = true;
        this.selectedIndex = -1;
    }

    hideResults() {
        this.resultsContainer.classList.add('d-none');
        this.isOpen = false;
        this.selectedIndex = -1;
    }

    clear() {
        this.input.value = '';
        this.hideResults();
        this.results = [];
    }
}

class StarRating {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            maxRating: 5,
            currentRating: 0,
            readonly: false,
            size: 'medium', // small, medium, large
            onChange: null,
            ...options
        };
        
        this.rating = this.options.currentRating;
        this.hoveredRating = 0;
        
        this.render();
        this.attachEventListeners();
    }

    render() {
        const sizeClass = `star-rating-${this.options.size}`;
        const readonlyClass = this.options.readonly ? 'readonly' : '';
        
        this.container.className = `star-rating ${sizeClass} ${readonlyClass}`;
        this.container.innerHTML = '';
        
        for (let i = 1; i <= this.options.maxRating; i++) {
            const star = document.createElement('i');
            star.className = 'fas fa-star';
            star.dataset.rating = i;
            this.container.appendChild(star);
        }
        
        this.updateDisplay();
    }

    attachEventListeners() {
        if (this.options.readonly) return;

        const stars = this.container.querySelectorAll('i');
        
        stars.forEach(star => {
            star.addEventListener('mouseenter', () => {
                this.hoveredRating = parseInt(star.dataset.rating);
                this.updateDisplay();
            });
            
            star.addEventListener('click', () => {
                this.setRating(parseInt(star.dataset.rating));
            });
        });

        this.container.addEventListener('mouseleave', () => {
            this.hoveredRating = 0;
            this.updateDisplay();
        });
    }

    setRating(rating) {
        this.rating = Math.max(0, Math.min(rating, this.options.maxRating));
        this.updateDisplay();
        
        if (this.options.onChange) {
            this.options.onChange(this.rating);
        }
    }

    updateDisplay() {
        const stars = this.container.querySelectorAll('i');
        const displayRating = this.hoveredRating || this.rating;
        
        stars.forEach((star, index) => {
            const starRating = index + 1;
            star.classList.toggle('active', starRating <= displayRating);
        });
    }

    getRating() {
        return this.rating;
    }
}

class InfiniteScroll {
    constructor(container, loadMore, options = {}) {
        this.container = container;
        this.loadMore = loadMore;
        this.options = {
            threshold: 200, // pixels from bottom
            debounceTime: 100,
            ...options
        };
        
        this.isLoading = false;
        this.hasMore = true;
        this.debounceTimer = null;
        
        this.init();
    }

    init() {
        this.attachEventListeners();
    }

    attachEventListeners() {
        window.addEventListener('scroll', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.checkScroll();
            }, this.options.debounceTime);
        });
    }

    checkScroll() {
        if (this.isLoading || !this.hasMore) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
        
        if (distanceFromBottom <= this.options.threshold) {
            this.load();
        }
    }

    async load() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingIndicator();
        
        try {
            const hasMore = await this.loadMore();
            this.hasMore = hasMore !== false;
        } catch (error) {
            console.error('Infinite scroll load error:', error);
            Toast.error('Failed to load more content');
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    showLoadingIndicator() {
        let indicator = document.getElementById('infiniteScrollLoader');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'infiniteScrollLoader';
            indicator.className = 'text-center py-4';
            indicator.innerHTML = `
                <div class="spinner-border text-netflix-red" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-gray-400 mt-2">Loading more content...</p>
            `;
            this.container.appendChild(indicator);
        }
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('infiniteScrollLoader');
        if (indicator) {
            indicator.remove();
        }
    }

    reset() {
        this.hasMore = true;
        this.isLoading = false;
        this.hideLoadingIndicator();
    }

    destroy() {
        window.removeEventListener('scroll', this.checkScroll);
        this.hideLoadingIndicator();
    }
}

// Global component instances
let searchComponent;
let currentModal;

// Initialize global components
document.addEventListener('DOMContentLoaded', function() {
    // Initialize global search
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        searchComponent = new SearchComponent(globalSearch, {
            onSelect: (result) => {
                window.location.href = `movie-detail.html?id=${result.id}`;
            }
        });
    }
});

// Global component functions
function showModal(options) {
    if (currentModal) {
        currentModal.hide();
    }
    currentModal = new Modal(options);
    currentModal.show();
    return currentModal;
}

function hideModal() {
    if (currentModal) {
        currentModal.hide();
        currentModal = null;
    }
}

function showToast(message, type = 'info', options = {}) {
    return new Toast(message, type, options).show();
}

function createMovieCard(movie, options = {}) {
    return new MovieCard(movie, options).render();
}

function createCarousel(containerId, items, itemRenderer, options = {}) {
    return new Carousel(containerId, items, itemRenderer, options);
}

function createStarRating(container, options = {}) {
    return new StarRating(container, options);
}

function createInfiniteScroll(container, loadMore, options = {}) {
    return new InfiniteScroll(container, loadMore, options);
}

// Utility functions for components
function formatRuntime(minutes) {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function formatCurrency(amount) {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function truncateText(text, maxLength = 150) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function debounce(func, wait) {
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

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MovieCard,
        Carousel,
        Modal,
        LoadingSkeleton,
        Toast,
        SearchComponent,
        StarRating,
        InfiniteScroll
    };
}