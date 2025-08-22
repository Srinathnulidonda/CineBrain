// CineBrain Application Core
class CineBrainApp {
    constructor() {
        this.router = null;
        this.components = new Map();
        this.isInitialized = false;
        this.performanceMarks = new Map();
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        this.markPerformance('app_init_start');
        
        try {
            await this.loadComponents();
            this.setupRouter();
            this.setupGlobalEventListeners();
            this.setupTheme();
            this.setupMobileOptimizations();
            this.setupPerformanceOptimizations();
            
            this.isInitialized = true;
            this.markPerformance('app_init_end');
            
            console.log('CineBrain App initialized successfully');
            this.reportPerformance();
        } catch (error) {
            console.error('App initialization failed:', error);
        }
    }

    markPerformance(name) {
        this.performanceMarks.set(name, performance.now());
        if (performance.mark) {
            performance.mark(name);
        }
    }

    reportPerformance() {
        const initTime = this.performanceMarks.get('app_init_end') - this.performanceMarks.get('app_init_start');
        console.log(`App initialization took ${initTime.toFixed(2)}ms`);
        
        // Report to analytics if available
        if (typeof gtag === 'function') {
            gtag('event', 'timing_complete', {
                name: 'app_init',
                value: Math.round(initTime)
            });
        }
    }

    async loadComponents() {
        const componentFiles = [
            '/components/cards/content-card.html',
            '/components/cards/card-mini.html',
            '/components/ui/rating-badge.html',
            '/components/ui/type-badge.html',
            '/components/ui/genre-chips.html',
            '/components/ui/search-bar.html',
            '/components/layout/topbar.html',
            '/components/layout/mobile-nav.html',
            '/components/modals/trailer-modal.html',
            '/components/modals/filter-modal.html'
        ];

        const loadPromises = componentFiles.map(async (file) => {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    const html = await response.text();
                    const componentName = file.split('/').pop().replace('.html', '');
                    this.components.set(componentName, html);
                }
            } catch (error) {
                console.warn(`Failed to load component ${file}:`, error);
            }
        });

        await Promise.all(loadPromises);
    }

    setupRouter() {
        this.router = new CineBrainRouter();
    }

    setupGlobalEventListeners() {
        // Click delegation for dynamic content
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        
        // Search handling
        document.addEventListener('input', this.handleGlobalInput.bind(this));
        
        // Form submissions
        document.addEventListener('submit', this.handleGlobalSubmit.bind(this));
        
        // Intersection Observer for lazy loading
        if (CONFIG.FEATURES.INTERSECTION_OBSERVER) {
            this.setupLazyLoading();
        }
        
        // Online/Offline handling
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        // Visibility change for performance optimization
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    handleGlobalClick(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const contentId = target.dataset.contentId;
        const type = target.dataset.type;

        switch (action) {
            case 'view-content':
                if (contentId) {
                    this.viewContent(contentId);
                    api.recordInteraction(contentId, 'view').catch(console.error);
                }
                break;
                
            case 'add-watchlist':
                if (contentId) {
                    this.addToWatchlist(contentId, target);
                }
                break;
                
            case 'add-favorite':
                if (contentId) {
                    this.addToFavorites(contentId, target);
                }
                break;
                
            case 'play-trailer':
                if (contentId) {
                    this.playTrailer(contentId, target);
                }
                break;
                
            case 'filter-genre':
                const genre = target.dataset.genre;
                if (genre) {
                    this.filterByGenre(genre);
                }
                break;
                
            case 'navigate':
                const url = target.dataset.url || target.href;
                if (url) {
                    event.preventDefault();
                    this.router.navigate(url);
                }
                break;
        }
    }

    handleGlobalInput(event) {
        if (event.target.matches('.search-input')) {
            this.debounceSearch(event.target.value, event.target);
        }
    }

    handleGlobalSubmit(event) {
        const form = event.target;
        
        if (form.matches('.auth-form')) {
            event.preventDefault();
            this.handleAuthForm(form);
        } else if (form.matches('.search-form')) {
            event.preventDefault();
            this.handleSearchForm(form);
        }
    }

    setupLazyLoading() {
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        this.imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });

        // Observe existing images
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.imageObserver.observe(img);
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('cinebrain_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Theme toggle handler
        document.addEventListener('click', (event) => {
            if (event.target.matches('.theme-toggle')) {
                this.toggleTheme();
            }
        });
    }

    setupMobileOptimizations() {
        if (CONFIG.ENV.IS_MOBILE) {
            document.body.classList.add('mobile-device');
            
            // Touch-friendly interactions
            document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
            
            // Prevent zoom on input focus
            document.addEventListener('touchstart', () => {
                const viewportMeta = document.querySelector('meta[name=viewport]');
                if (viewportMeta) {
                    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
                }
            });
        }
    }

    setupPerformanceOptimizations() {
        // Preload critical resources
        this.preloadCriticalResources();
        
        // Virtual scrolling for large lists
        this.setupVirtualScrolling();
        
        // Image optimization
        this.optimizeImages();
    }

    preloadCriticalResources() {
        const criticalImages = [
            '/images/hero-bg.jpg',
            '/images/logo.png'
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }

    setupVirtualScrolling() {
        // Implement virtual scrolling for large content lists
        const scrollContainers = document.querySelectorAll('.virtual-scroll');
        scrollContainers.forEach(container => {
            this.initializeVirtualScroll(container);
        });
    }

    optimizeImages() {
        // Convert images to WebP if supported
        if (CONFIG.FEATURES.WEB_P) {
            document.querySelectorAll('img').forEach(img => {
                if (img.src && !img.src.includes('.webp')) {
                    const webpSrc = img.src.replace(/\.(jpg|jpeg|png)$/, '.webp');
                    img.src = webpSrc;
                }
            });
        }
    }

    // Content interaction methods
    async viewContent(contentId) {
        try {
            this.showLoader();
            const content = await api.getContentDetails(contentId);
            
            if (content) {
                this.router.navigate(`/content/details.html?id=${contentId}`);
            } else {
                this.showToast('Content not found', 'error');
            }
        } catch (error) {
            console.error('Error viewing content:', error);
            this.showToast('Failed to load content', 'error');
        } finally {
            this.hideLoader();
        }
    }

    async addToWatchlist(contentId, button) {
        if (!Auth.isAuthenticated()) {
            this.showToast('Please login to add to watchlist', 'warning');
            return;
        }

        try {
            button.disabled = true;
            await api.recordInteraction(contentId, 'watchlist');
            
            button.classList.add('added');
            button.innerHTML = '<i class="bi bi-check-circle"></i> Added';
            
            this.showToast('Added to watchlist', 'success');
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            this.showToast('Failed to add to watchlist', 'error');
        } finally {
            button.disabled = false;
        }
    }

    async addToFavorites(contentId, button) {
        if (!Auth.isAuthenticated()) {
            this.showToast('Please login to add to favorites', 'warning');
            return;
        }

        try {
            button.disabled = true;
            await api.recordInteraction(contentId, 'favorite');
            
            button.classList.add('added');
            button.innerHTML = '<i class="bi bi-heart-fill"></i> Favorited';
            
            this.showToast('Added to favorites', 'success');
        } catch (error) {
            console.error('Error adding to favorites:', error);
            this.showToast('Failed to add to favorites', 'error');
        } finally {
            button.disabled = false;
        }
    }

    async playTrailer(contentId, button) {
        try {
            const content = await api.getContentDetails(contentId);
            
            if (content && content.youtube_trailer) {
                this.showTrailerModal(content.youtube_trailer, content.title);
                api.recordInteraction(contentId, 'view').catch(console.error);
            } else {
                this.showToast('Trailer not available', 'info');
            }
        } catch (error) {
            console.error('Error playing trailer:', error);
            this.showToast('Failed to load trailer', 'error');
        }
    }

    // Search functionality
    debounceSearch(query, input) {
        clearTimeout(this.searchTimeout);
        
        this.searchTimeout = setTimeout(async () => {
            if (query.length >= 2) {
                await this.performSearch(query, input);
            } else {
                this.clearSearchResults(input);
            }
        }, CONFIG.UI.SEARCH_DEBOUNCE);
    }

    async performSearch(query, input) {
        try {
            const results = await api.searchContent(query);
            this.displaySearchResults(results, input);
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Search failed', 'error');
        }
    }

    displaySearchResults(results, input) {
        const container = input.parentElement.querySelector('.search-results') || 
                         this.createSearchResultsContainer(input);
        
        if (results.results && results.results.length > 0) {
            const html = results.results.slice(0, 8).map(item => `
                <div class="search-result-item" data-action="view-content" data-content-id="${item.id}">
                    <img src="${api.buildPosterURL(item.poster_path, 'SMALL')}" alt="${item.title}" class="search-result-poster">
                    <div class="search-result-info">
                        <h6 class="search-result-title">${item.title}</h6>
                        <p class="search-result-meta">${item.content_type} • ${item.rating || 'NR'}</p>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = html;
            container.classList.add('show');
        } else {
            container.innerHTML = '<div class="search-no-results">No results found</div>';
            container.classList.add('show');
        }
    }

    createSearchResultsContainer(input) {
        const container = document.createElement('div');
        container.className = 'search-results dropdown-menu';
        input.parentElement.appendChild(container);
        return container;
    }

    clearSearchResults(input) {
        const container = input.parentElement.querySelector('.search-results');
        if (container) {
            container.classList.remove('show');
            container.innerHTML = '';
        }
    }

    // Authentication forms
    async handleAuthForm(form) {
        const formData = new FormData(form);
        const isLogin = form.classList.contains('login-form');
        
        try {
            this.showLoader();
            
            if (isLogin) {
                const result = await Auth.login(
                    formData.get('username'),
                    formData.get('password')
                );
                
                if (!result.success) {
                    this.showToast(result.error, 'error');
                }
            } else {
                const preferences = {
                    languages: Array.from(form.querySelectorAll('input[name="languages"]:checked')).map(el => el.value),
                    genres: Array.from(form.querySelectorAll('input[name="genres"]:checked')).map(el => el.value)
                };
                
                const result = await Auth.register(
                    formData.get('username'),
                    formData.get('email'),
                    formData.get('password'),
                    preferences
                );
                
                if (!result.success) {
                    this.showToast(result.error, 'error');
                }
            }
        } catch (error) {
            console.error('Auth form error:', error);
            this.showToast('Authentication failed', 'error');
        } finally {
            this.hideLoader();
        }
    }

    // UI utilities
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="bi bi-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="bi bi-x"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    showLoader() {
        let loader = document.querySelector('.global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'global-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="loader-spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.classList.add('show');
    }

    hideLoader() {
        const loader = document.querySelector('.global-loader');
        if (loader) {
            loader.classList.remove('show');
        }
    }

    showTrailerModal(youtubeUrl, title) {
        const modal = document.createElement('div');
        modal.className = 'trailer-modal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title} - Trailer</h5>
                    <button class="modal-close" onclick="this.closest('.trailer-modal').remove()">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="video-container">
                        <iframe src="${youtubeUrl.replace('watch?v=', 'embed/')}" 
                                frameborder="0" allowfullscreen></iframe>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('cinebrain_theme', newTheme);
        
        this.showToast(`Switched to ${newTheme} theme`, 'info');
    }

    // Event handlers
    handleOnline() {
        this.showToast('Connection restored', 'success');
        document.body.classList.remove('offline');
    }

    handleOffline() {
        this.showToast('You are offline', 'warning');
        document.body.classList.add('offline');
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause any animations or videos
            document.querySelectorAll('video').forEach(video => video.pause());
        } else {
            // Page is visible, resume if needed
            this.checkForUpdates();
        }
    }

    handleTouchStart(event) {
        // Add touch feedback
        const target = event.target.closest('[data-action]');
        if (target) {
            target.classList.add('touch-active');
        }
    }

    handleTouchEnd(event) {
        // Remove touch feedback
        const target = event.target.closest('[data-action]');
        if (target) {
            setTimeout(() => target.classList.remove('touch-active'), 150);
        }
    }

    // Utility methods
    async checkForUpdates() {
        // Check if there are new recommendations or content updates
        try {
            const health = await api.get(CONFIG.API_ENDPOINTS.HEALTH);
            if (health.status === 'healthy') {
                // App is up to date
                return;
            }
        } catch (error) {
            console.warn('Health check failed:', error);
        }
    }

    filterByGenre(genre) {
        const currentPage = window.location.pathname;
        const genreUrl = `/content/genre.html?genre=${encodeURIComponent(genre)}`;
        this.router.navigate(genreUrl);
    }

    initializeVirtualScroll(container) {
        // Basic virtual scrolling implementation for performance
        const itemHeight = 300; // Approximate height of content cards
        const visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        
        // This would be expanded for full virtual scrolling
        console.log(`Virtual scroll initialized for container with ${visibleItems} visible items`);
    }

    // Component rendering
    renderComponent(name, data = {}) {
        const template = this.components.get(name);
        if (!template) {
            console.warn(`Component ${name} not found`);
            return '';
        }
        
        // Simple template replacement (could be expanded)
        let html = template;
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, data[key]);
        });
        
        return html;
    }

    // Carousel functionality
    initializeCarousels() {
        document.querySelectorAll('.content-carousel').forEach(carousel => {
            this.setupCarousel(carousel);
        });
    }

    setupCarousel(carousel) {
        const track = carousel.querySelector('.carousel-track');
        const items = track.querySelectorAll('.content-card');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');
        
        let currentIndex = 0;
        const itemsToShow = this.getItemsToShow();
        const maxIndex = Math.max(0, items.length - itemsToShow);
        
        const updateCarousel = () => {
            const translateX = -(currentIndex * (100 / itemsToShow));
            track.style.transform = `translateX(${translateX}%)`;
            
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex >= maxIndex;
        };
        
        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });
        
        nextBtn.addEventListener('click', () => {
            if (currentIndex < maxIndex) {
                currentIndex++;
                updateCarousel();
            }
        });
        
        updateCarousel();
    }

    getItemsToShow() {
        const width = window.innerWidth;
        if (width < CONFIG.UI.MOBILE_BREAKPOINT) return CONFIG.UI.CARDS_PER_ROW_MOBILE;
        if (width < CONFIG.UI.TABLET_BREAKPOINT) return CONFIG.UI.CARDS_PER_ROW_TABLET;
        return CONFIG.UI.CARDS_PER_ROW_DESKTOP;
    }
}

// Router Class
class CineBrainRouter {
    constructor() {
        this.routes = new Map();
        this.currentPath = '';
        this.init();
    }

    init() {
        this.setupRoutes();
        this.setupEventListeners();
        this.handleInitialRoute();
    }

    setupRoutes() {
        this.routes.set('/', () => this.loadPage('/index.html'));
        this.routes.set('/auth/login.html', () => this.loadPage('/auth/login.html'));
        this.routes.set('/auth/register.html', () => this.loadPage('/auth/register.html'));
        this.routes.set('/content/search.html', () => this.loadPage('/content/search.html'));
        this.routes.set('/content/details.html', () => this.loadPage('/content/details.html'));
        this.routes.set('/content/anime.html', () => this.loadPage('/content/anime.html'));
        this.routes.set('/content/genre.html', () => this.loadPage('/content/genre.html'));
        this.routes.set('/user/watchlist.html', () => this.loadPage('/user/watchlist.html'));
        this.routes.set('/user/favorites.html', () => this.loadPage('/user/favorites.html'));
        this.routes.set('/admin/', () => this.loadPage('/admin/index.html'));
    }

    setupEventListeners() {
        window.addEventListener('popstate', () => {
            this.handleRoute(window.location.pathname);
        });
        
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[data-route]');
            if (link) {
                event.preventDefault();
                this.navigate(link.getAttribute('href') || link.dataset.route);
            }
        });
    }

    handleInitialRoute() {
        this.handleRoute(window.location.pathname);
    }

    navigate(path) {
        if (path === this.currentPath) return;
        
        window.history.pushState({}, '', path);
        this.handleRoute(path);
    }

    async handleRoute(path) {
        this.currentPath = path;
        
        // Check authentication requirements
        if (this.requiresAuth(path) && !Auth.isAuthenticated()) {
            this.navigate('/auth/login.html');
            return;
        }
        
        if (this.requiresAdmin(path) && !Auth.isAdmin()) {
            App.showToast('Admin access required', 'error');
            this.navigate('/');
            return;
        }
        
        const route = this.routes.get(path) || (() => this.handle404());
        await route();
    }

    async loadPage(pagePath) {
        try {
            App.showLoader();
            
            const response = await fetch(pagePath);
            if (!response.ok) throw new Error(`Failed to load ${pagePath}`);
            
            const html = await response.text();
            document.querySelector('main').innerHTML = html;
            
            // Initialize page-specific functionality
            this.initializePage(pagePath);
            
        } catch (error) {
            console.error('Page load error:', error);
            this.handle404();
        } finally {
            App.hideLoader();
        }
    }

    initializePage(pagePath) {
        // Page-specific initialization
        if (pagePath.includes('index.html')) {
            this.initializeHomePage();
        } else if (pagePath.includes('search.html')) {
            this.initializeSearchPage();
        } else if (pagePath.includes('details.html')) {
            this.initializeDetailsPage();
        }
        
        // Global initializations
        App.initializeCarousels();
        App.setupLazyLoading();
    }

    requiresAuth(path) {
        const authRequired = ['/user/', '/admin/'];
        return authRequired.some(prefix => path.startsWith(prefix));
    }

    requiresAdmin(path) {
        return path.startsWith('/admin/');
    }

    handle404() {
        document.querySelector('main').innerHTML = `
            <div class="error-page">
                <h1>404 - Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
                <a href="/" class="btn btn-primary" data-route="/">Go Home</a>
            </div>
        `;
    }

    // Page initializers
    async initializeHomePage() {
        const isAuthenticated = Auth.isAuthenticated();
        
        if (isAuthenticated) {
            await this.loadPersonalizedHomePage();
        } else {
            await this.loadPublicHomePage();
        }
    }

    async loadPersonalizedHomePage() {
        try {
            const [trending, personalized, watchlist] = await Promise.all([
                api.getTrending('all', 10),
                api.getPersonalizedRecommendations(10),
                api.getWatchlist()
            ]);
            
            // Render personalized sections
            this.renderHomeSection('trending', trending.recommendations);
            this.renderHomeSection('personalized', personalized.recommendations);
            this.renderHomeSection('continue-watching', watchlist.watchlist.slice(0, 6));
            
        } catch (error) {
            console.error('Error loading personalized home:', error);
            this.loadPublicHomePage();
        }
    }

    async loadPublicHomePage() {
        try {
            const [trending, newReleases, criticsChoice, hindi, anime] = await Promise.all([
                api.getTrending('all', 10),
                api.getNewReleases(null, 'movie', 10),
                api.getCriticsChoice('movie', 10),
                api.getRegionalRecommendations('hindi', 'movie', 10),
                api.getAnimeRecommendations(10)
            ]);
            
            // Render public sections
            this.renderHomeSection('trending', trending.recommendations);
            this.renderHomeSection('new-releases', newReleases.recommendations);
            this.renderHomeSection('critics-choice', criticsChoice.recommendations);
            this.renderHomeSection('regional-hindi', hindi.recommendations);
            this.renderHomeSection('anime-popular', anime.recommendations);
            
        } catch (error) {
            console.error('Error loading public home:', error);
        }
    }

    renderHomeSection(sectionId, items) {
        const container = document.querySelector(`#${sectionId} .content-carousel`);
        if (!container || !items) return;
        
        const html = items.map(item => this.renderContentCard(item)).join('');
        container.innerHTML = html;
    }

    renderContentCard(item) {
        return `
            <div class="content-card" data-action="view-content" data-content-id="${item.id}">
                <div class="card-poster">
                    <img src="${api.buildPosterURL(item.poster_path, 'MEDIUM')}" 
                         alt="${item.title}" loading="lazy">
                    <div class="card-overlay">
                        <button class="btn btn-play" data-action="play-trailer" data-content-id="${item.id}">
                            <i class="bi bi-play-fill"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <h6 class="card-title">${item.title}</h6>
                    <div class="card-meta">
                        <span class="rating">${item.rating || 'NR'}</span>
                        <span class="type">${item.content_type}</span>
                    </div>
                </div>
            </div>
        `;
    }

    async initializeSearchPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        
        if (query) {
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.value = query;
                App.performSearch(query, searchInput);
            }
        }
    }

    async initializeDetailsPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const contentId = urlParams.get('id');
        
        if (contentId) {
            await this.loadContentDetails(contentId);
        }
    }

    async loadContentDetails(contentId) {
        try {
            const content = await api.getContentDetails(contentId);
            this.renderContentDetails(content);
        } catch (error) {
            console.error('Error loading content details:', error);
            App.showToast('Failed to load content details', 'error');
        }
    }

    renderContentDetails(content) {
        const container = document.querySelector('.content-details');
        if (!container) return;
        
        container.innerHTML = `
            <div class="hero-section">
                <div class="hero-backdrop" style="background-image: url(${api.buildBackdropURL(content.backdrop_path, 'LARGE')})"></div>
                <div class="hero-content">
                    <h1 class="hero-title">${content.title}</h1>
                    <div class="hero-meta">
                        <span class="rating">${content.rating}/10</span>
                        <span class="year">${content.release_date ? new Date(content.release_date).getFullYear() : 'TBA'}</span>
                        <span class="type">${content.content_type.toUpperCase()}</span>
                    </div>
                    <p class="hero-overview">${content.overview}</p>
                    <div class="hero-actions">
                        <button class="btn btn-primary" data-action="play-trailer" data-content-id="${content.id}">
                            <i class="bi bi-play-fill"></i> Play Trailer
                        </button>
                        <button class="btn btn-outline-light" data-action="add-watchlist" data-content-id="${content.id}">
                            <i class="bi bi-plus"></i> Watchlist
                        </button>
                        <button class="btn btn-outline-light" data-action="add-favorite" data-content-id="${content.id}">
                            <i class="bi bi-heart"></i> Favorite
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="details-content">
                <div class="row">
                    <div class="col-md-8">
                        <div class="cast-crew">
                            <h3>Cast & Crew</h3>
                            <div class="cast-list">
                                ${content.cast ? content.cast.slice(0, 6).map(person => `
                                    <div class="cast-item">
                                        <div class="cast-name">${person.name || person.character}</div>
                                        <div class="cast-role">${person.character || person.job}</div>
                                    </div>
                                `).join('') : ''}
                            </div>
                        </div>
                        
                        <div class="similar-content">
                            <h3>More Like This</h3>
                            <div class="content-grid">
                                ${content.similar_content ? content.similar_content.map(item => this.renderContentCard(item)).join('') : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="content-sidebar">
                            <div class="genres">
                                <h4>Genres</h4>
                                <div class="genre-tags">
                                    ${content.genres ? content.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('') : ''}
                                </div>
                            </div>
                            
                            <div class="content-info">
                                <h4>Information</h4>
                                <dl>
                                    ${content.runtime ? `<dt>Runtime</dt><dd>${content.runtime} minutes</dd>` : ''}
                                    ${content.languages ? `<dt>Languages</dt><dd>${content.languages.join(', ')}</dd>` : ''}
                                    ${content.vote_count ? `<dt>Votes</dt><dd>${content.vote_count.toLocaleString()}</dd>` : ''}
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize App
const App = new CineBrainApp();

// Global Router instance
const Router = App.router;

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered successfully');
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    });
}

// Performance monitoring
window.addEventListener('load', () => {
    if (performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
            const entry = navigationEntries[0];
            console.log(`Page load performance:
                DNS: ${entry.domainLookupEnd - entry.domainLookupStart}ms
                Connect: ${entry.connectEnd - entry.connectStart}ms
                Request: ${entry.responseStart - entry.requestStart}ms
                Response: ${entry.responseEnd - entry.responseStart}ms
                DOM: ${entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart}ms
                Load: ${entry.loadEventEnd - entry.loadEventStart}ms
                Total: ${entry.loadEventEnd - entry.navigationStart}ms
            `);
        }
    }
});