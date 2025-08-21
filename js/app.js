// CineScope Main Application - Router, Controllers & UI Components
class CineScopeApp {
    constructor() {
        this.currentController = null;
        this.components = new Map();
        this.toastContainer = null;
        this.setupApp();
        performance.mark(window.CineScope.PERF_MARKS.APP_START);
    }

    async setupApp() {
        this.createToastContainer();
        this.setupGlobalEventListeners();
        this.setupPerformanceMonitoring();
        this.initializeComponents();
        await this.loadInitialContent();
        performance.mark(window.CineScope.PERF_MARKS.INTERACTIVE);
    }

    setupGlobalEventListeners() {
        // Route changes
        window.addEventListener('route:changed', (e) => {
            this.handleRouteChange(e.detail.path);
        });

        // Auth state changes
        window.addEventListener('auth:stateChanged', (e) => {
            this.handleAuthChange(e.detail);
        });

        // Search handling
        document.addEventListener('input', (e) => {
            if (e.target.matches('.search-input')) {
                this.debounce(() => this.handleSearch(e.target.value), 300)();
            }
        });

        // Infinite scroll
        window.addEventListener('scroll', this.throttle(() => {
            this.handleInfiniteScroll();
        }, 100));

        // Image lazy loading
        if ('IntersectionObserver' in window) {
            this.setupLazyLoading();
        }

        // Mobile navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.mobile-nav-item')) {
                this.handleMobileNavigation(e.target);
            }
        });
    }

    setupPerformanceMonitoring() {
        // Monitor Core Web Vitals
        if ('web-vital' in window) {
            window.webVitals.getCLS(console.log);
            window.webVitals.getFID(console.log);
            window.webVitals.getFCP(console.log);
            window.webVitals.getLCP(console.log);
            window.webVitals.getTTFB(console.log);
        }

        // Monitor custom metrics
        performance.mark('app-ready');
        performance.measure('app-initialization', 
            window.CineScope.PERF_MARKS.APP_START, 'app-ready');
    }

    // Component System
    initializeComponents() {
        this.components.set('ContentCard', ContentCard);
        this.components.set('Carousel', Carousel);
        this.components.set('VirtualScroll', VirtualScroll);
        this.components.set('SearchBar', SearchBar);
        this.components.set('Modal', Modal);
    }

    createComponent(type, container, options = {}) {
        const ComponentClass = this.components.get(type);
        if (!ComponentClass) {
            console.error(`Component ${type} not found`);
            return null;
        }
        return new ComponentClass(container, options);
    }

    // Router
    async handleRouteChange(path) {
        const segments = path.split('/').filter(Boolean);
        
        // Clean up current controller
        if (this.currentController?.destroy) {
            this.currentController.destroy();
        }

        // Route to appropriate controller
        try {
            if (path === '/' || path === '/index.html') {
                this.currentController = new HomeController();
            } else if (path.startsWith('/auth/')) {
                this.currentController = new AuthController(segments[1]);
            } else if (path.startsWith('/content/')) {
                this.currentController = new ContentController(segments[1]);
            } else if (segments.length >= 2 && segments[1] === 'profile') {
                this.currentController = new ProfileController(segments[0]);
            } else if (segments.length >= 2 && segments[1] === 'watchlist') {
                this.currentController = new WatchlistController(segments[0]);
            } else if (segments.length >= 2 && segments[1] === 'favorites') {
                this.currentController = new FavoritesController(segments[0]);
            } else if (path.startsWith('/admin/')) {
                this.currentController = new AdminController(segments[1] || 'index');
            } else {
                this.currentController = new NotFoundController();
            }

            await this.currentController.init();
        } catch (error) {
            console.error('Route handling error:', error);
            this.showToast('Page loading failed', 'error');
        }
    }

    async loadInitialContent() {
        // Pre-load critical content
        try {
            const trending = await window.api.getTrending({ limit: 10 });
            this.setCachedData('initial-trending', trending);
            performance.mark(window.CineScope.PERF_MARKS.FIRST_CONTENT);
        } catch (error) {
            console.warn('Failed to preload content:', error);
        }
    }

    // Controllers
}

// Home Page Controller
class HomeController {
    constructor() {
        this.carousels = [];
        this.sections = [];
    }

    async init() {
        await this.loadContent();
        this.render();
        this.setupInteractions();
    }

    async loadContent() {
        const isAuthenticated = window.auth.isAuthenticated();
        
        try {
            // Load sections in parallel
            const promises = [];
            
            if (isAuthenticated) {
                promises.push(
                    window.api.getPersonalizedRecommendations({ limit: 15 }),
                    window.api.getWatchlist(),
                    window.api.getFavorites()
                );
            }
            
            promises.push(
                window.api.getTrending({ limit: 20 }),
                window.api.getNewReleases({ limit: 15 }),
                window.api.getCriticsChoice({ limit: 12 }),
                window.api.getAdminChoice({ limit: 8 }),
                window.api.getRegionalContent('hindi', { limit: 10 }),
                window.api.getGenreRecommendations('action', { limit: 10 })
            );

            const results = await Promise.allSettled(promises);
            this.processResults(results, isAuthenticated);
            
        } catch (error) {
            console.error('Content loading error:', error);
            this.showFallbackContent();
        }
    }

    processResults(results, isAuthenticated) {
        let index = 0;
        
        if (isAuthenticated) {
            this.personalizedRecs = results[index++]?.value?.recommendations || [];
            this.watchlist = results[index++]?.value?.watchlist || [];
            this.favorites = results[index++]?.value?.favorites || [];
        }
        
        this.trending = results[index++]?.value?.recommendations || [];
        this.newReleases = results[index++]?.value?.recommendations || [];
        this.criticsChoice = results[index++]?.value?.recommendations || [];
        this.adminChoice = results[index++]?.value?.recommendations || [];
        this.regional = results[index++]?.value?.recommendations || [];
        this.genre = results[index++]?.value?.recommendations || [];
    }

    render() {
        const main = document.querySelector('main');
        const isAuthenticated = window.auth.isAuthenticated();
        
        main.innerHTML = `
            <div class="home-container">
                ${this.renderHeroSection()}
                ${isAuthenticated ? this.renderPersonalizedSections() : ''}
                ${this.renderPublicSections()}
            </div>
        `;
        
        this.initializeCarousels();
    }

    renderHeroSection() {
        const heroContent = this.trending[0] || this.newReleases[0];
        if (!heroContent) return '';

        return `
            <section class="hero-section">
                <div class="hero-backdrop" style="background-image: url('${heroContent.backdrop_path || heroContent.poster_path}')">
                    <div class="hero-overlay"></div>
                    <div class="hero-content">
                        <h1 class="hero-title">${heroContent.title}</h1>
                        <p class="hero-description">${heroContent.overview}</p>
                        <div class="hero-metadata">
                            <span class="rating">★ ${heroContent.rating || 'N/A'}</span>
                            <span class="type">${heroContent.content_type.toUpperCase()}</span>
                            <span class="genres">${heroContent.genres?.slice(0, 3).join(', ') || ''}</span>
                        </div>
                        <div class="hero-actions">
                            <button class="btn btn-primary" onclick="window.app.playTrailer(${heroContent.id})">
                                ▶ Play Trailer
                            </button>
                            <button class="btn btn-secondary" onclick="window.app.showDetails(${heroContent.id})">
                                ⓘ More Info
                            </button>
                            <button class="btn btn-outline" onclick="window.app.addToWatchlist(${heroContent.id})">
                                + My List
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderPersonalizedSections() {
        return `
            ${this.renderCarouselSection('For You', this.personalizedRecs, 'personalized')}
            ${this.renderCarouselSection('Continue Watching', this.watchlist?.slice(0, 8), 'continue')}
            ${this.renderCarouselSection('From Your List', this.favorites?.slice(0, 8), 'favorites')}
        `;
    }

    renderPublicSections() {
        return `
            ${this.renderCarouselSection('Trending Now', this.trending, 'trending')}
            ${this.renderCarouselSection('New Releases', this.newReleases, 'new-releases')}
            ${this.renderCarouselSection('Critics Choice', this.criticsChoice, 'critics')}
            ${this.renderCarouselSection('Admin Picks', this.adminChoice, 'admin')}
            ${this.renderCarouselSection('Popular in India', this.regional, 'regional')}
            ${this.renderCarouselSection('Action Movies', this.genre, 'action')}
        `;
    }

    renderCarouselSection(title, items, id) {
        if (!items || items.length === 0) return '';

        return `
            <section class="content-section" data-section="${id}">
                <div class="section-header">
                    <h2 class="section-title">${title}</h2>
                    <button class="section-more" onclick="window.app.showMore('${id}')">See All</button>
                </div>
                <div class="carousel-container" data-carousel="${id}">
                    <div class="carousel-track">
                        ${items.map(item => this.renderContentCard(item)).join('')}
                    </div>
                    <button class="carousel-btn carousel-prev" data-direction="prev">‹</button>
                    <button class="carousel-btn carousel-next" data-direction="next">›</button>
                </div>
            </section>
        `;
    }

    renderContentCard(item) {
        return `
            <div class="content-card" data-id="${item.id}" onclick="window.app.showDetails(${item.id})">
                <div class="card-image">
                    <img src="${item.poster_path}" alt="${item.title}" loading="lazy" />
                    <div class="card-overlay">
                        <button class="play-btn" onclick="event.stopPropagation(); window.app.playTrailer(${item.id})">▶</button>
                    </div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${item.title}</h3>
                    <div class="card-metadata">
                        <span class="rating">★ ${item.rating || 'N/A'}</span>
                        <span class="type">${item.content_type}</span>
                    </div>
                </div>
            </div>
        `;
    }

    initializeCarousels() {
        document.querySelectorAll('.carousel-container').forEach(container => {
            const carousel = new Carousel(container, {
                itemsPerView: {
                    mobile: 2,
                    tablet: 3,
                    desktop: 5,
                    ultrawide: 7
                },
                autoplay: false,
                loop: false
            });
            this.carousels.push(carousel);
        });
    }

    setupInteractions() {
        // Record homepage view
        if (window.auth.isAuthenticated()) {
            window.api.recordInteraction({
                content_id: null,
                interaction_type: 'homepage_view'
            }).catch(console.warn);
        }
    }

    destroy() {
        this.carousels.forEach(carousel => carousel.destroy());
        this.carousels = [];
    }
}

// Content Card Component
class ContentCard {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.init();
    }

    init() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('mouseenter', this.handleHover.bind(this));
        this.setupLazyLoading();
    }

    handleClick() {
        const id = this.container.dataset.id;
        if (id) {
            window.app.showDetails(id);
        }
    }

    handleHover() {
        // Preload content details on hover
        const id = this.container.dataset.id;
        if (id && !this.preloaded) {
            this.preloaded = true;
            window.api.getContentDetails(id).catch(() => {});
        }
    }

    setupLazyLoading() {
        const img = this.container.querySelector('img');
        if (img && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const src = entry.target.dataset.src || entry.target.src;
                        entry.target.src = src;
                        observer.unobserve(entry.target);
                    }
                });
            });
            observer.observe(img);
        }
    }
}

// Carousel Component
class Carousel {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemsPerView: { mobile: 2, tablet: 3, desktop: 5, ultrawide: 7 },
            autoplay: false,
            loop: false,
            ...options
        };
        this.currentIndex = 0;
        this.init();
    }

    init() {
        this.track = this.container.querySelector('.carousel-track');
        this.items = this.track.querySelectorAll('.content-card');
        this.prevBtn = this.container.querySelector('.carousel-prev');
        this.nextBtn = this.container.querySelector('.carousel-next');

        this.setupEventListeners();
        this.updateView();
        this.setupTouchGestures();
    }

    setupEventListeners() {
        this.prevBtn?.addEventListener('click', () => this.prev());
        this.nextBtn?.addEventListener('click', () => this.next());
        
        window.addEventListener('resize', this.throttle(() => {
            this.updateView();
        }, 100));
    }

    setupTouchGestures() {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        this.track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });

        this.track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            e.preventDefault();
        });

        this.track.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaX = startX - currentX;
            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            }
        });
    }

    prev() {
        const itemsPerView = this.getItemsPerView();
        this.currentIndex = Math.max(0, this.currentIndex - itemsPerView);
        this.updateView();
    }

    next() {
        const itemsPerView = this.getItemsPerView();
        const maxIndex = Math.max(0, this.items.length - itemsPerView);
        this.currentIndex = Math.min(maxIndex, this.currentIndex + itemsPerView);
        this.updateView();
    }

    updateView() {
        const itemsPerView = this.getItemsPerView();
        const itemWidth = 100 / itemsPerView;
        const translateX = -(this.currentIndex * itemWidth);
        
        this.track.style.transform = `translateX(${translateX}%)`;
        
        // Update button states
        this.prevBtn.style.display = this.currentIndex === 0 ? 'none' : 'block';
        this.nextBtn.style.display = this.currentIndex >= this.items.length - itemsPerView ? 'none' : 'block';
    }

    getItemsPerView() {
        const width = window.innerWidth;
        if (width >= 1400) return this.options.itemsPerView.ultrawide;
        if (width >= 992) return this.options.itemsPerView.desktop;
        if (width >= 768) return this.options.itemsPerView.tablet;
        return this.options.itemsPerView.mobile;
    }

    throttle(func, limit) {
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

    destroy() {
        // Clean up event listeners
    }
}

// Global App Methods
window.app = {
    // Show content details
    async showDetails(contentId) {
        try {
            const content = await window.api.getContentDetails(contentId);
            
            // Record view interaction
            if (window.auth.isAuthenticated()) {
                window.api.recordInteraction({
                    content_id: contentId,
                    interaction_type: 'view'
                }).catch(console.warn);
            }
            
            // Navigate to details page
            window.location.href = `/content/details.html?id=${contentId}`;
        } catch (error) {
            console.error('Failed to load content details:', error);
            this.showToast('Failed to load content details', 'error');
        }
    },

    // Play trailer
    async playTrailer(contentId) {
        try {
            const content = await window.api.getContentDetails(contentId);
            
            if (content.youtube_trailer) {
                const modal = new Modal(document.body, {
                    title: `${content.title} - Trailer`,
                    content: `
                        <div class="trailer-player">
                            <iframe 
                                src="https://www.youtube.com/embed/${content.youtube_trailer_id}?autoplay=1"
                                frameborder="0" 
                                allowfullscreen
                                width="100%" 
                                height="400">
                            </iframe>
                        </div>
                    `,
                    size: 'large'
                });
                
                modal.show();
                
                // Record trailer view
                if (window.auth.isAuthenticated()) {
                    window.api.recordInteraction({
                        content_id: contentId,
                        interaction_type: 'trailer_view'
                    }).catch(console.warn);
                }
            } else {
                this.showToast('Trailer not available', 'warning');
            }
        } catch (error) {
            console.error('Failed to play trailer:', error);
            this.showToast('Failed to load trailer', 'error');
        }
    },

    // Add to watchlist
    async addToWatchlist(contentId) {
        if (!window.auth.isAuthenticated()) {
            window.auth.redirectToLogin(window.location.pathname);
            return;
        }

        try {
            await window.api.recordInteraction({
                content_id: contentId,
                interaction_type: 'watchlist'
            });
            
            this.showToast('Added to watchlist', 'success');
        } catch (error) {
            console.error('Failed to add to watchlist:', error);
            this.showToast('Failed to add to watchlist', 'error');
        }
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    },

    // Utility functions
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
    },

    throttle(func, limit) {
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
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cinescope = new CineScopeApp();
    });
} else {
    window.cinescope = new CineScopeApp();
}