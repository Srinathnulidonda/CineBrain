// Main Application JavaScript
class CineScopeApp {
    constructor() {
        this.API_BASE = 'https://backend-app-970m.onrender.com/api';
        this.currentUser = null;
        this.authToken = null;
        this.currentPage = '';
        this.isLoading = false;
        this.isMobile = window.innerWidth <= 768;
        
        // Initialize app
        this.init();
    }

    async init() {
        try {
            // Show preloader
            this.showPreloader();
            
            // Load includes
            await this.loadIncludes();
            
            // Initialize components
            this.initEventListeners();
            this.initMobileNavigation();
            this.initSearch();
            this.initCarousels();
            this.initLazyLoading();
            this.initTouchGestures();
            
            // Check authentication
            await this.checkAuthentication();
            
            // Route to current page
            await this.routePage();
            
            // Hide preloader
            this.hidePreloader();
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.hidePreloader();
        }
    }

    // Preloader Management
    showPreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.remove('hidden');
        }
    }

    hidePreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            setTimeout(() => {
                preloader.classList.add('hidden');
            }, 500);
        }
    }

    showPageLoader() {
        const pageLoader = document.getElementById('page-loader');
        const progressBar = document.getElementById('page-loader-bar');
        
        if (pageLoader && progressBar) {
            pageLoader.style.display = 'block';
            progressBar.style.width = '0%';
            
            // Animate progress
            setTimeout(() => progressBar.style.width = '30%', 100);
            setTimeout(() => progressBar.style.width = '60%', 300);
            setTimeout(() => progressBar.style.width = '90%', 500);
        }
    }

    hidePageLoader() {
        const pageLoader = document.getElementById('page-loader');
        const progressBar = document.getElementById('page-loader-bar');
        
        if (pageLoader && progressBar) {
            progressBar.style.width = '100%';
            setTimeout(() => {
                pageLoader.style.display = 'none';
                progressBar.style.width = '0%';
            }, 200);
        }
    }

    // Include Management
    async loadIncludes() {
        const headerContainer = document.getElementById('header-container');
        const footerContainer = document.getElementById('footer-container');

        try {
            if (headerContainer) {
                const headerResponse = await fetch('/includes/header.html');
                headerContainer.innerHTML = await headerResponse.text();
            }

            if (footerContainer) {
                const footerResponse = await fetch('/includes/footer.html');
                footerContainer.innerHTML = await footerResponse.text();
            }
        } catch (error) {
            console.error('Error loading includes:', error);
        }
    }

    // Event Listeners
    initEventListeners() {
        // Window events
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('popstate', this.handlePopState.bind(this));
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));

        // Form submissions
        document.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        // Click events
        document.addEventListener('click', this.handleClick.bind(this));
        
        // Touch events for mobile
        if (this.isMobile) {
            document.addEventListener('touchstart', this.handleTouchStart.bind(this));
            document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            this.reinitializeComponents();
        }
    }

    handleScroll() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        // Lazy load images
        this.lazyLoadImages();
    }

    handlePopState() {
        this.routePage();
    }

    handleOnline() {
        this.showNotification('Connection restored', 'success');
    }

    handleOffline() {
        this.showNotification('Connection lost', 'warning');
    }

    // Click Handler
    async handleClick(event) {
        const target = event.target;
        
        // Handle navigation links
        if (target.matches('[data-navigate]')) {
            event.preventDefault();
            const path = target.getAttribute('data-navigate');
            await this.navigate(path);
            return;
        }

        // Handle auth actions
        if (target.matches('[data-auth-action]')) {
            event.preventDefault();
            const action = target.getAttribute('data-auth-action');
            await this.handleAuthAction(action);
            return;
        }

        // Handle content actions
        if (target.matches('[data-content-action]')) {
            event.preventDefault();
            const action = target.getAttribute('data-content-action');
            const contentId = target.getAttribute('data-content-id');
            await this.handleContentAction(action, contentId);
            return;
        }

        // Handle movie card clicks
        if (target.closest('.movie-card')) {
            const movieCard = target.closest('.movie-card');
            const contentId = movieCard.getAttribute('data-content-id');
            if (contentId) {
                await this.navigate(`/details?id=${contentId}`);
            }
            return;
        }

        // Handle button ripple effect
        if (target.matches('.btn')) {
            this.addRippleEffect(target);
        }

        // Handle mobile menu toggle
        if (target.matches('.hamburger') || target.closest('.hamburger')) {
            this.toggleMobileMenu();
            return;
        }

        // Close mobile menu on overlay click
        if (target.matches('.mobile-menu-overlay')) {
            this.closeMobileMenu();
            return;
        }

        // Close modals on overlay click
        if (target.matches('.modal')) {
            this.closeModal(target.id);
            return;
        }
    }

    // Touch Gestures
    initTouchGestures() {
        if (!this.isMobile) return;

        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        document.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', () => {
            const diffX = currentX - startX;
            const diffY = currentY - startY;

            // Horizontal swipe
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    this.handleSwipeRight();
                } else {
                    this.handleSwipeLeft();
                }
            }

            // Vertical swipe
            if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 50) {
                if (diffY > 0) {
                    this.handleSwipeDown();
                } else {
                    this.handleSwipeUp();
                }
            }
        });
    }

    handleTouchStart(event) {
        // Add touch feedback
        const target = event.target.closest('.btn, .movie-card, .nav-item');
        if (target) {
            target.style.transform = 'scale(0.98)';
        }
    }

    handleTouchEnd(event) {
        // Remove touch feedback
        const target = event.target.closest('.btn, .movie-card, .nav-item');
        if (target) {
            setTimeout(() => {
                target.style.transform = '';
            }, 150);
        }
    }

    handleSwipeLeft() {
        // Navigate carousels
        const activeCarousel = document.querySelector('.carousel:hover, .carousel.active');
        if (activeCarousel) {
            this.nextSlide(activeCarousel);
        }
    }

    handleSwipeRight() {
        // Navigate carousels
        const activeCarousel = document.querySelector('.carousel:hover, .carousel.active');
        if (activeCarousel) {
            this.prevSlide(activeCarousel);
        }
    }

    handleSwipeDown() {
        // Pull to refresh (if at top of page)
        if (window.scrollY === 0) {
            this.refresh();
        }
    }

    handleSwipeUp() {
        // Hide mobile navigation briefly
        const mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav) {
            mobileNav.style.transform = 'translateY(100%)';
            setTimeout(() => {
                mobileNav.style.transform = '';
            }, 2000);
        }
    }

    // Ripple Effect
    addRippleEffect(button) {
        button.classList.add('ripple');
        setTimeout(() => {
            button.classList.remove('ripple');
        }, 300);
    }

    // Mobile Navigation
    initMobileNavigation() {
        this.updateMobileNavigation();
    }

    toggleMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const mobileMenu = document.querySelector('.mobile-menu');
        const overlay = document.querySelector('.mobile-menu-overlay');

        if (hamburger && mobileMenu && overlay) {
            const isActive = hamburger.classList.contains('active');
            
            if (isActive) {
                this.closeMobileMenu();
            } else {
                hamburger.classList.add('active');
                mobileMenu.classList.add('active');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }

    closeMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const mobileMenu = document.querySelector('.mobile-menu');
        const overlay = document.querySelector('.mobile-menu-overlay');

        if (hamburger && mobileMenu && overlay) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    updateMobileNavigation() {
        const path = window.location.pathname;
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        
        mobileNavItems.forEach(item => {
            const itemPath = item.getAttribute('data-navigate');
            if (itemPath === path) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Search Functionality
    initSearch() {
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        let searchTimeout;

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();

                if (query.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 300);
                } else {
                    this.hideSearchResults();
                }
            });

            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim().length >= 2) {
                    this.showSearchResults();
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    this.hideSearchResults();
                }
            });
        }
    }

    async performSearch(query) {
        try {
            this.showSearchLoading();
            
            const response = await this.apiCall('GET', `/search?query=${encodeURIComponent(query)}`);
            
            if (response.results) {
                this.displaySearchResults(response.results);
            } else {
                this.showSearchError('No results found');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError('Search failed');
        }
    }

    showSearchLoading() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
                    <div class="skeleton" style="height: 16px; width: 60%;"></div>
                </div>
            `.repeat(3);
            searchResults.style.display = 'block';
        }
    }

    displaySearchResults(results) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <p>No results found</p>
                </div>
            `;
        } else {
            searchResults.innerHTML = results.map(item => `
                <div class="search-result-item" data-content-id="${item.id}">
                    <div class="search-result-poster">
                        <img src="${item.poster_path || '/assets/images/placeholder.jpg'}" 
                             alt="${item.title}" loading="lazy">
                    </div>
                    <div class="search-result-info">
                        <h4>${item.title}</h4>
                        <p>${item.content_type} • ${item.rating || 'N/A'}/10</p>
                        <p class="search-result-overview">${this.truncateText(item.overview, 100)}</p>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const contentId = item.getAttribute('data-content-id');
                    this.navigate(`/details?id=${contentId}`);
                    this.hideSearchResults();
                    document.getElementById('search-input').value = '';
                });
            });
        }

        searchResults.style.display = 'block';
    }

    showSearchError(message) {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.innerHTML = `
                <div class="search-error">
                    <p>${message}</p>
                </div>
            `;
            searchResults.style.display = 'block';
        }
    }

    showSearchResults() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.style.display = 'block';
        }
    }

    hideSearchResults() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }

    // Carousel Management
    initCarousels() {
        const carousels = document.querySelectorAll('.carousel');
        
        carousels.forEach(carousel => {
            this.setupCarousel(carousel);
        });
    }

    setupCarousel(carousel) {
        const container = carousel.querySelector('.carousel-container');
        const slides = carousel.querySelectorAll('.carousel-slide');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');
        
        if (!container || slides.length === 0) return;

        let currentIndex = 0;
        const slideWidth = slides[0].offsetWidth + 16; // Including margin
        const visibleSlides = Math.floor(carousel.offsetWidth / slideWidth);
        const maxIndex = Math.max(0, slides.length - visibleSlides);

        // Initialize position
        this.updateCarouselPosition(container, currentIndex, slideWidth);

        // Event listeners
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentIndex = Math.max(0, currentIndex - 1);
                this.updateCarouselPosition(container, currentIndex, slideWidth);
                this.updateCarouselControls(carousel, currentIndex, maxIndex);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentIndex = Math.min(maxIndex, currentIndex + 1);
                this.updateCarouselPosition(container, currentIndex, slideWidth);
                this.updateCarouselControls(carousel, currentIndex, maxIndex);
            });
        }

        // Touch/scroll support for mobile
        if (this.isMobile) {
            container.style.overflowX = 'auto';
            container.style.scrollSnapType = 'x mandatory';
            slides.forEach(slide => {
                slide.style.scrollSnapAlign = 'start';
            });
        }

        // Update control visibility
        this.updateCarouselControls(carousel, currentIndex, maxIndex);
    }

    updateCarouselPosition(container, index, slideWidth) {
        container.style.transform = `translateX(-${index * slideWidth}px)`;
    }

    updateCarouselControls(carousel, currentIndex, maxIndex) {
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');

        if (prevBtn) {
            prevBtn.style.opacity = currentIndex > 0 ? '1' : '0.5';
            prevBtn.disabled = currentIndex === 0;
        }

        if (nextBtn) {
            nextBtn.style.opacity = currentIndex < maxIndex ? '1' : '0.5';
            nextBtn.disabled = currentIndex === maxIndex;
        }
    }

    nextSlide(carousel) {
        const nextBtn = carousel.querySelector('.carousel-next');
        if (nextBtn && !nextBtn.disabled) {
            nextBtn.click();
        }
    }

    prevSlide(carousel) {
        const prevBtn = carousel.querySelector('.carousel-prev');
        if (prevBtn && !prevBtn.disabled) {
            prevBtn.click();
        }
    }

    // Lazy Loading
    initLazyLoading() {
        this.lazyLoadImages();
    }

    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        images.forEach(img => {
            if (this.isElementInViewport(img)) {
                this.loadImage(img);
            }
        });
    }

    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) + 200 &&
            rect.bottom >= -200
        );
    }

    loadImage(img) {
        if (img.dataset.src) {
            // Show loading state
            img.style.filter = 'blur(5px)';
            
            const tempImg = new Image();
            tempImg.onload = () => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.style.filter = '';
                img.classList.add('fade-in');
            };
            tempImg.onerror = () => {
                img.src = '/assets/images/placeholder.jpg';
                img.removeAttribute('data-src');
                img.style.filter = '';
            };
            tempImg.src = img.dataset.src;
        }
    }

    // Form Handling
    handleFormSubmit(event) {
        const form = event.target;
        
        if (form.matches('#login-form')) {
            event.preventDefault();
            this.handleLogin(form);
        } else if (form.matches('#register-form')) {
            event.preventDefault();
            this.handleRegister(form);
        }
    }

    async handleLogin(form) {
        try {
            this.setFormLoading(form, true);
            
            const formData = new FormData(form);
            const data = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            const response = await this.apiCall('POST', '/login', data);
            
            if (response.token) {
                this.setAuthToken(response.token);
                this.currentUser = response.user;
                this.showNotification('Login successful!', 'success');
                await this.navigate('/dashboard');
            } else {
                this.showFormError(form, 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showFormError(form, error.message || 'Login failed');
        } finally {
            this.setFormLoading(form, false);
        }
    }

    async handleRegister(form) {
        try {
            this.setFormLoading(form, true);
            
            const formData = new FormData(form);
            const data = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                preferred_languages: this.getSelectedValues(form, 'languages'),
                preferred_genres: this.getSelectedValues(form, 'genres')
            };

            // Validate password confirmation
            const confirmPassword = formData.get('confirm-password');
            if (data.password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            const response = await this.apiCall('POST', '/register', data);
            
            if (response.token) {
                this.setAuthToken(response.token);
                this.currentUser = response.user;
                this.showNotification('Registration successful!', 'success');
                await this.navigate('/dashboard');
            } else {
                this.showFormError(form, 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showFormError(form, error.message || 'Registration failed');
        } finally {
            this.setFormLoading(form, false);
        }
    }

    getSelectedValues(form, name) {
        const checkboxes = form.querySelectorAll(`input[name="${name}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    setFormLoading(form, loading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorDiv = form.querySelector('.form-error');
        
        if (submitBtn) {
            submitBtn.disabled = loading;
            submitBtn.textContent = loading ? 'Loading...' : submitBtn.dataset.originalText || 'Submit';
            
            if (!submitBtn.dataset.originalText) {
                submitBtn.dataset.originalText = submitBtn.textContent;
            }
        }
        
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    showFormError(form, message) {
        let errorDiv = form.querySelector('.form-error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            form.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // Authentication
    async checkAuthentication() {
        const token = localStorage.getItem('authToken');
        
        if (token) {
            this.authToken = token;
            // Optionally verify token with backend
            try {
                const response = await this.apiCall('GET', '/user/profile');
                this.currentUser = response.user;
            } catch (error) {
                console.error('Token verification failed:', error);
                this.logout();
            }
        }
    }

    setAuthToken(token) {
        this.authToken = token;
        localStorage.setItem('authToken', token);
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        this.showNotification('Logged out successfully', 'info');
        this.navigate('/');
    }

    isAuthenticated() {
        return !!this.authToken;
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            this.showNotification('Please log in to access this page', 'warning');
            this.navigate('/login');
            return false;
        }
        return true;
    }

    // Content Actions
    async handleContentAction(action, contentId) {
        if (!this.requireAuth()) return;

        try {
            const response = await this.apiCall('POST', '/interactions', {
                content_id: parseInt(contentId),
                interaction_type: action
            });

            if (response.message) {
                this.showNotification(`Added to ${action}`, 'success');
                this.updateContentActionButton(action, contentId, true);
            }
        } catch (error) {
            console.error('Content action error:', error);
            this.showNotification('Action failed', 'error');
        }
    }

    updateContentActionButton(action, contentId, added) {
        const button = document.querySelector(`[data-content-action="${action}"][data-content-id="${contentId}"]`);
        if (button) {
            button.classList.toggle('active', added);
            button.textContent = added ? `Remove from ${action}` : `Add to ${action}`;
        }
    }

    // API Calls
    async apiCall(method, endpoint, data = null) {
        const url = `${this.API_BASE}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    // Navigation
    async navigate(path) {
        if (this.currentPage === path) return;
        
        this.showPageLoader();
        
        try {
            // Close mobile menu if open
            this.closeMobileMenu();
            
            // Update URL
            if (window.location.pathname !== path) {
                history.pushState({}, '', path);
            }
            
            // Route to page
            await this.routePage();
            
            // Update mobile navigation
            this.updateMobileNavigation();
            
        } catch (error) {
            console.error('Navigation error:', error);
            this.showNotification('Navigation failed', 'error');
        } finally {
            this.hidePageLoader();
        }
    }

    async routePage() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        
        this.currentPage = path;

        // Route to appropriate page handler
        switch (path) {
            case '/':
                await this.loadHomePage();
                break;
            case '/login':
                await this.loadLoginPage();
                break;
            case '/dashboard':
                if (this.requireAuth()) {
                    await this.loadDashboardPage();
                }
                break;
            case '/details':
                const contentId = params.get('id');
                if (contentId) {
                    await this.loadDetailsPage(contentId);
                } else {
                    this.navigate('/');
                }
                break;
            case '/profile':
                if (this.requireAuth()) {
                    await this.loadProfilePage();
                }
                break;
            case '/search':
                await this.loadSearchPage(params.get('q'));
                break;
            default:
                // Handle category and language pages
                if (path.startsWith('/categories/')) {
                    await this.loadCategoryPage(path.split('/')[2]);
                } else if (path.startsWith('/languages/')) {
                    await this.loadLanguagePage(path.split('/')[2]);
                } else if (path.startsWith('/user/')) {
                    if (this.requireAuth()) {
                        await this.loadUserPage(path.split('/')[2]);
                    }
                } else {
                    await this.load404Page();
                }
        }
    }

    // Page Loaders
    async loadHomePage() {
        try {
            const content = document.getElementById('main-content');
            content.innerHTML = await this.getHomePageHTML();
            
            // Load recommendations
            await this.loadHomeRecommendations();
            
            // Initialize page components
            this.initCarousels();
            this.initLazyLoading();
            
        } catch (error) {
            console.error('Error loading home page:', error);
            this.showNotification('Failed to load page', 'error');
        }
    }

    async loadHomeRecommendations() {
        try {
            // Load trending
            const trending = await this.apiCall('GET', '/recommendations/trending?limit=20');
            this.renderMovieCarousel('trending-carousel', trending.recommendations, 'Trending Now');

            // Load new releases
            const newReleases = await this.apiCall('GET', '/recommendations/new-releases?limit=20');
            this.renderMovieCarousel('new-releases-carousel', newReleases.recommendations, 'New Releases');

            // Load critics choice
            const criticsChoice = await this.apiCall('GET', '/recommendations/critics-choice?limit=20');
            this.renderMovieCarousel('critics-choice-carousel', criticsChoice.recommendations, 'Critics Choice');

            // Load popular movies
            const popularMovies = await this.apiCall('GET', '/recommendations/genre/action?type=movie&limit=20');
            this.renderMovieCarousel('popular-movies-carousel', popularMovies.recommendations, 'Popular Movies');

            // Load anime
            const anime = await this.apiCall('GET', '/recommendations/anime?limit=20');
            this.renderMovieCarousel('anime-carousel', anime.recommendations, 'Popular Anime');

        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    async loadLoginPage() {
        const content = document.getElementById('main-content');
        content.innerHTML = await this.getLoginPageHTML();
    }

    async loadDashboardPage() {
        try {
            const content = document.getElementById('main-content');
            content.innerHTML = await this.getDashboardPageHTML();
            
            // Load personalized recommendations
            await this.loadPersonalizedRecommendations();
            
            this.initCarousels();
            this.initLazyLoading();
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showNotification('Failed to load dashboard', 'error');
        }
    }

    async loadPersonalizedRecommendations() {
        try {
            // Load personalized recommendations
            const personalized = await this.apiCall('GET', '/recommendations/personalized');
            this.renderMovieCarousel('personalized-carousel', personalized.recommendations, 'Recommended For You');

            // Load continue watching (if available)
            const watchlist = await this.apiCall('GET', '/user/watchlist');
            if (watchlist.watchlist.length > 0) {
                this.renderMovieCarousel('continue-watching-carousel', watchlist.watchlist.slice(0, 10), 'Continue Watching');
            }

            // Load based on preferences
            if (this.currentUser.preferred_genres && this.currentUser.preferred_genres.length > 0) {
                const genre = this.currentUser.preferred_genres[0];
                const genreRecs = await this.apiCall('GET', `/recommendations/genre/${genre}?limit=20`);
                this.renderMovieCarousel('genre-recs-carousel', genreRecs.recommendations, `More ${genre} Movies`);
            }

        } catch (error) {
            console.error('Error loading personalized recommendations:', error);
        }
    }

    async loadDetailsPage(contentId) {
        try {
            const content = document.getElementById('main-content');
            content.innerHTML = this.getDetailsPageSkeletonHTML();
            
            // Load content details
            const details = await this.apiCall('GET', `/content/${contentId}`);
            content.innerHTML = await this.getDetailsPageHTML(details);
            
            // Load similar content
            const similar = await this.apiCall('GET', `/recommendations/similar/${contentId}`);
            this.renderMovieCarousel('similar-carousel', similar.recommendations, 'You Might Also Like');
            
            this.initCarousels();
            this.initLazyLoading();
            
        } catch (error) {
            console.error('Error loading details page:', error);
            this.showNotification('Failed to load content details', 'error');
            this.navigate('/');
        }
    }

    // Movie Carousel Renderer
    renderMovieCarousel(containerId, movies, title) {
        const container = document.getElementById(containerId);
        if (!container || !movies || movies.length === 0) return;

        const carousel = document.createElement('div');
        carousel.className = 'carousel-section mb-8';
        carousel.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold text-white">${title}</h2>
                <button class="btn-ghost text-sm">View All</button>
            </div>
            <div class="carousel relative">
                <div class="carousel-container flex">
                    ${movies.map(movie => this.getMovieCardHTML(movie)).join('')}
                </div>
                <button class="carousel-controls carousel-prev">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M12.5 15l-5-5 5-5v10z"/>
                    </svg>
                </button>
                <button class="carousel-controls carousel-next">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7.5 5l5 5-5 5V5z"/>
                    </svg>
                </button>
            </div>
        `;

        container.innerHTML = '';
        container.appendChild(carousel);
        
        // Initialize carousel
        this.setupCarousel(carousel.querySelector('.carousel'));
    }

    getMovieCardHTML(movie) {
        const posterUrl = movie.poster_path || '/assets/images/placeholder.jpg';
        const rating = movie.rating ? `⭐ ${movie.rating}/10` : 'Not Rated';
        
        return `
            <div class="carousel-slide movie-card" data-content-id="${movie.id}">
                <div class="movie-card-poster relative">
                    <img data-src="${posterUrl}" 
                         alt="${movie.title}" 
                         class="w-full h-auto aspect-[2/3] object-cover rounded-lg"
                         loading="lazy">
                    <div class="movie-card-overlay">
                        <h3 class="font-semibold text-white mb-2">${this.truncateText(movie.title, 30)}</h3>
                        <p class="text-gray-300 text-sm mb-2">${rating}</p>
                        <p class="text-gray-400 text-xs">${movie.content_type.toUpperCase()}</p>
                        ${movie.youtube_trailer ? `
                            <button class="btn-primary mt-2 text-xs py-1 px-2" 
                                    onclick="window.open('${movie.youtube_trailer}', '_blank')">
                                Watch Trailer
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // HTML Template Getters
    async getHomePageHTML() {
        return `
            <div class="hero relative">
                <div class="hero-background" style="background-image: url('/assets/images/hero-bg.jpg')"></div>
                <div class="hero-content">
                    <h1 class="title-primary text-6xl mb-6 text-shadow">
                        Welcome to <span class="text-gradient">CineScope</span>
                    </h1>
                    <p class="text-xl text-gray-300 mb-8 text-shadow">
                        Discover your next favorite movie, TV show, or anime with AI-powered recommendations
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <button class="btn btn-primary" data-navigate="/dashboard">
                            Get Started
                        </button>
                        <button class="btn btn-secondary" data-navigate="/categories/trending">
                            Browse Trending
                        </button>
                    </div>
                </div>
            </div>

            <div class="container mx-auto px-4 py-12">
                <div id="trending-carousel" class="mb-12"></div>
                <div id="new-releases-carousel" class="mb-12"></div>
                <div id="critics-choice-carousel" class="mb-12"></div>
                <div id="popular-movies-carousel" class="mb-12"></div>
                <div id="anime-carousel" class="mb-12"></div>
            </div>
        `;
    }

    async getLoginPageHTML() {
        return `
            <div class="min-h-screen flex items-center justify-center py-12 px-4">
                <div class="max-w-md w-full">
                    <div class="card">
                        <div class="text-center mb-8">
                            <h1 class="title-primary text-3xl mb-2">Welcome Back</h1>
                            <p class="text-gray-400">Sign in to your account</p>
                        </div>

                        <form id="login-form" class="space-y-6">
                            <div class="form-group">
                                <label class="form-label">Username</label>
                                <input type="text" name="username" class="form-input" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Password</label>
                                <input type="password" name="password" class="form-input" required>
                            </div>

                            <button type="submit" class="btn btn-primary w-full">
                                Sign In
                            </button>
                        </form>

                        <div class="text-center mt-6">
                            <p class="text-gray-400">
                                Don't have an account? 
                                <button class="text-blue-400 hover:text-blue-300" data-navigate="/register">
                                    Sign up
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async getDashboardPageHTML() {
        const userName = this.currentUser ? this.currentUser.username : 'User';
        
        return `
            <div class="container mx-auto px-4 py-8">
                <div class="hero-section mb-12">
                    <h1 class="title-primary text-4xl mb-4">
                        Welcome back, <span class="text-gradient">${userName}</span>!
                    </h1>
                    <p class="text-gray-300 text-lg">
                        Here are your personalized recommendations
                    </p>
                </div>

                <div id="continue-watching-carousel" class="mb-12"></div>
                <div id="personalized-carousel" class="mb-12"></div>
                <div id="genre-recs-carousel" class="mb-12"></div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div class="card text-center">
                        <h3 class="text-lg font-semibold mb-2">Your Watchlist</h3>
                        <button class="btn btn-secondary w-full" data-navigate="/user/watchlist">
                            View Watchlist
                        </button>
                    </div>
                    
                    <div class="card text-center">
                        <h3 class="text-lg font-semibold mb-2">Favorites</h3>
                        <button class="btn btn-secondary w-full" data-navigate="/user/favorites">
                            View Favorites
                        </button>
                    </div>
                    
                    <div class="card text-center">
                        <h3 class="text-lg font-semibold mb-2">Trending</h3>
                        <button class="btn btn-secondary w-full" data-navigate="/categories/trending">
                            Browse Trending
                        </button>
                    </div>
                    
                    <div class="card text-center">
                        <h3 class="text-lg font-semibold mb-2">Profile</h3>
                        <button class="btn btn-secondary w-full" data-navigate="/profile">
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getDetailsPageSkeletonHTML() {
        return `
            <div class="container mx-auto px-4 py-8">
                <div class="flex flex-col lg:flex-row gap-8">
                    <div class="lg:w-1/3">
                        <div class="skeleton aspect-[2/3] rounded-lg"></div>
                    </div>
                    <div class="lg:w-2/3">
                        <div class="skeleton h-8 mb-4"></div>
                        <div class="skeleton h-4 mb-2 w-1/2"></div>
                        <div class="skeleton h-4 mb-4 w-1/3"></div>
                        <div class="skeleton h-20 mb-4"></div>
                        <div class="flex gap-4 mb-4">
                            <div class="skeleton h-10 w-24"></div>
                            <div class="skeleton h-10 w-24"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async getDetailsPageHTML(content) {
        const posterUrl = content.poster_path || '/assets/images/placeholder.jpg';
        const backdropUrl = content.backdrop_path || content.poster_path || '/assets/images/placeholder.jpg';
        const rating = content.rating ? `${content.rating}/10` : 'Not Rated';
        const releaseYear = content.release_date ? new Date(content.release_date).getFullYear() : 'Unknown';
        const genres = content.genres ? content.genres.join(', ') : 'Unknown';
        
        return `
            <div class="relative">
                <div class="hero-background" style="background-image: url('${backdropUrl}')"></div>
                <div class="container mx-auto px-4 py-8 relative z-10">
                    <div class="flex flex-col lg:flex-row gap-8">
                        <div class="lg:w-1/3">
                            <img src="${posterUrl}" 
                                 alt="${content.title}" 
                                 class="w-full rounded-lg shadow-2xl">
                        </div>
                        
                        <div class="lg:w-2/3 text-white">
                            <h1 class="title-primary text-4xl mb-4 text-shadow">${content.title}</h1>
                            
                            <div class="flex flex-wrap gap-4 mb-4 text-gray-300">
                                <span>⭐ ${rating}</span>
                                <span>${releaseYear}</span>
                                <span>${content.content_type.toUpperCase()}</span>
                                ${content.runtime ? `<span>${content.runtime} min</span>` : ''}
                            </div>
                            
                            <div class="mb-4">
                                <h3 class="text-lg font-semibold mb-2">Genres</h3>
                                <p class="text-gray-300">${genres}</p>
                            </div>
                            
                            <div class="mb-6">
                                <h3 class="text-lg font-semibold mb-2">Overview</h3>
                                <p class="text-gray-300 leading-relaxed">${content.overview || 'No overview available.'}</p>
                            </div>
                            
                            <div class="flex flex-wrap gap-4 mb-6">
                                ${content.youtube_trailer ? `
                                    <button class="btn btn-primary" onclick="window.open('${content.youtube_trailer}', '_blank')">
                                        ▶ Watch Trailer
                                    </button>
                                ` : ''}
                                
                                ${this.isAuthenticated() ? `
                                    <button class="btn btn-secondary" 
                                            data-content-action="watchlist" 
                                            data-content-id="${content.id}">
                                        Add to Watchlist
                                    </button>
                                    
                                    <button class="btn btn-secondary" 
                                            data-content-action="favorite" 
                                            data-content-id="${content.id}">
                                        Add to Favorites
                                    </button>
                                ` : ''}
                            </div>
                            
                            ${content.cast && content.cast.length > 0 ? `
                                <div class="mb-6">
                                    <h3 class="text-lg font-semibold mb-2">Cast</h3>
                                    <div class="flex flex-wrap gap-2">
                                        ${content.cast.slice(0, 5).map(actor => `
                                            <span class="bg-gray-800 px-3 py-1 rounded-full text-sm">
                                                ${actor.name}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="mt-12">
                        <div id="similar-carousel"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Utility Functions
    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300`;
        
        const colors = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            warning: 'bg-yellow-600',
            info: 'bg-blue-600'
        };
        
        notification.classList.add(colors[type] || colors.info);
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="text-white">${message}</span>
                <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    ×
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    showModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    refresh() {
        this.showNotification('Refreshing...', 'info');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    reinitializeComponents() {
        this.initCarousels();
        this.initLazyLoading();
        this.updateMobileNavigation();
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        this.showNotification(`An error occurred${context ? ` in ${context}` : ''}`, 'error');
    }

    // Auth actions
    async handleAuthAction(action) {
        switch (action) {
            case 'logout':
                this.logout();
                break;
            case 'login':
                await this.navigate('/login');
                break;
            case 'register':
                await this.navigate('/register');
                break;
        }
    }

    // Initialize app when DOM is loaded
    static init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.app = new CineScopeApp();
            });
        } else {
            window.app = new CineScopeApp();
        }
    }
}

// Initialize the app
CineScopeApp.init();

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for global access
window.CineScopeApp = CineScopeApp;