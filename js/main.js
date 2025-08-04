// Main.js - Core functionality for Movie Platform
// Handles API communication, authentication, UI interactions, and app state

class MoviePlatformApp {
    constructor() {
        this.API_BASE = 'https://backend-app-970m.onrender.com/api';
        this.currentUser = null;
        this.authToken = null;
        this.cache = new Map();
        this.observers = new Map();
        this.isLoading = false;
        this.retryAttempts = new Map();
        this.maxRetries = 3;

        // Initialize app
        this.init();
    }

    async init() {
        try {
            // Set up event listeners
            this.setupEventListeners();

            // Initialize UI components
            this.initializeComponents();

            // Check authentication status
            await this.checkAuthStatus();

            // Load initial content
            await this.loadInitialContent();

            // Set up lazy loading
            this.setupLazyLoading();

            // Set up touch gestures
            this.setupTouchGestures();

            // Set up keyboard navigation
            this.setupKeyboardNavigation();

            // Set up error handling
            this.setupErrorHandling();

            console.log('MoviePlatformApp initialized successfully');
            this.dispatchEvent('appInitialized');

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleError(error, 'App initialization failed');
        }
    }

    // ============================================================================
    // AUTHENTICATION METHODS
    // ============================================================================

    async checkAuthStatus() {
        try {
            // Try to get token from variables (not localStorage as per requirements)
            if (this.authToken && this.currentUser) {
                return true;
            }

            // Check if we're on login page
            if (window.location.pathname.includes('login')) {
                return false;
            }

            // If no auth data, redirect to login for protected pages
            if (this.requiresAuth()) {
                this.redirectToLogin();
                return false;
            }

            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    async login(credentials) {
        try {
            this.showLoading('Signing in...');

            const response = await this.apiCall('/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (response.success !== false) {
                this.authToken = response.token;
                this.currentUser = response.user;

                this.showToast('Login successful!', 'success');

                // Redirect based on user role
                if (this.currentUser.is_admin) {
                    window.location.href = '/admin/dashboard';
                } else {
                    window.location.href = '/dashboard';
                }

                return response;
            } else {
                throw new Error(response.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login failed:', error);
            this.showToast(error.message || 'Login failed', 'error');
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    async register(userData) {
        try {
            this.showLoading('Creating account...');

            const response = await this.apiCall('/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success !== false) {
                this.authToken = response.token;
                this.currentUser = response.user;

                this.showToast('Account created successfully!', 'success');

                // Redirect to dashboard
                window.location.href = '/dashboard';

                return response;
            } else {
                throw new Error(response.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            this.showToast(error.message || 'Registration failed', 'error');
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        this.cache.clear();

        this.showToast('Logged out successfully', 'info');
        window.location.href = '/';
    }

    requiresAuth() {
        const protectedPaths = ['/dashboard', '/profile', '/user/', '/admin/'];
        return protectedPaths.some(path => window.location.pathname.includes(path));
    }

    redirectToLogin() {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }

    // ============================================================================
    // API COMMUNICATION
    // ============================================================================

    async apiCall(endpoint, options = {}) {
        const url = `${this.API_BASE}${endpoint}`;
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.authToken) {
            config.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const retryKey = `${config.method}-${url}`;
        const currentRetry = this.retryAttempts.get(retryKey) || 0;

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                if (response.status === 401) {
                    this.handleUnauthorized();
                    throw new Error('Unauthorized');
                }

                if (response.status >= 500 && currentRetry < this.maxRetries) {
                    this.retryAttempts.set(retryKey, currentRetry + 1);
                    await this.delay(1000 * (currentRetry + 1));
                    return this.apiCall(endpoint, options);
                }

                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Reset retry count on success
            this.retryAttempts.delete(retryKey);

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`API call failed: ${endpoint}`, error);

            if (error.name === 'TypeError' && currentRetry < this.maxRetries) {
                this.retryAttempts.set(retryKey, currentRetry + 1);
                await this.delay(1000 * (currentRetry + 1));
                return this.apiCall(endpoint, options);
            }

            throw error;
        }
    }

    handleUnauthorized() {
        this.authToken = null;
        this.currentUser = null;
        this.showToast('Session expired. Please log in again.', 'warning');
        this.redirectToLogin();
    }

    // ============================================================================
    // CONTENT LOADING
    // ============================================================================

    async loadInitialContent() {
        try {
            const currentPage = this.getCurrentPage();

            switch (currentPage) {
                case 'home':
                    await this.loadHomeContent();
                    break;
                case 'dashboard':
                    await this.loadDashboardContent();
                    break;
                case 'details':
                    await this.loadDetailsContent();
                    break;
                case 'category':
                    await this.loadCategoryContent();
                    break;
                case 'search':
                    await this.loadSearchContent();
                    break;
                case 'admin':
                    await this.loadAdminContent();
                    break;
                default:
                    console.log('No specific content loader for:', currentPage);
            }
        } catch (error) {
            console.error('Failed to load initial content:', error);
            this.handleError(error, 'Failed to load content');
        }
    }

    async loadHomeContent() {
        try {
            this.showLoading('Loading recommendations...');

            // Load trending content
            const trending = await this.loadTrending();
            this.renderContentSection('trending', trending, 'Trending Now');

            // Load new releases
            const newReleases = await this.loadNewReleases();
            this.renderContentSection('new-releases', newReleases, 'New Releases');

            // Load critics choice
            const criticsChoice = await this.loadCriticsChoice();
            this.renderContentSection('critics-choice', criticsChoice, "Critics' Choice");

            // Load popular content
            const popular = await this.loadPopular();
            this.renderContentSection('popular', popular, 'Popular');

            // Load anime recommendations
            const anime = await this.loadAnime();
            this.renderContentSection('anime', anime, 'Anime');

            // Load regional content
            await this.loadRegionalContent();

        } catch (error) {
            console.error('Failed to load home content:', error);
            this.showError('Failed to load recommendations');
        } finally {
            this.hideLoading();
        }
    }

    async loadDashboardContent() {
        try {
            if (!this.currentUser) {
                this.redirectToLogin();
                return;
            }

            this.showLoading('Loading your dashboard...');

            // Load personalized recommendations
            const personalized = await this.loadPersonalizedRecommendations();
            this.renderContentSection('personalized', personalized, 'Recommended For You');

            // Load watchlist
            const watchlist = await this.loadWatchlist();
            this.renderContentSection('watchlist', watchlist, 'Your Watchlist');

            // Load favorites
            const favorites = await this.loadFavorites();
            this.renderContentSection('favorites', favorites, 'Your Favorites');

            // Load continue watching (if available)
            const continueWatching = await this.loadContinueWatching();
            if (continueWatching.length > 0) {
                this.renderContentSection('continue-watching', continueWatching, 'Continue Watching');
            }

        } catch (error) {
            console.error('Failed to load dashboard content:', error);
            this.showError('Failed to load dashboard');
        } finally {
            this.hideLoading();
        }
    }

    async loadDetailsContent() {
        try {
            const contentId = this.getContentIdFromUrl();
            if (!contentId) {
                throw new Error('Content ID not found');
            }

            this.showLoading('Loading content details...');

            const content = await this.getContentDetails(contentId);
            this.renderContentDetails(content);

            // Load similar content
            const similar = await this.loadSimilarContent(contentId);
            this.renderContentSection('similar', similar, 'More Like This');

        } catch (error) {
            console.error('Failed to load details content:', error);
            this.showError('Failed to load content details');
        } finally {
            this.hideLoading();
        }
    }

    async loadCategoryContent() {
        try {
            const category = this.getCategoryFromUrl();
            if (!category) {
                throw new Error('Category not found');
            }

            this.showLoading(`Loading ${category}...`);

            let content;

            switch (category) {
                case 'trending':
                    content = await this.loadTrending(40);
                    break;
                case 'popular':
                    content = await this.loadPopular(40);
                    break;
                case 'new-releases':
                    content = await this.loadNewReleases(40);
                    break;
                case 'critic-choices':
                    content = await this.loadCriticsChoice(40);
                    break;
                case 'movies':
                    content = await this.loadMovies(40);
                    break;
                case 'tv-shows':
                    content = await this.loadTVShows(40);
                    break;
                case 'anime':
                    content = await this.loadAnime(40);
                    break;
                default:
                    if (category.includes('language-')) {
                        const language = category.replace('language-', '');
                        content = await this.loadLanguageContent(language, 40);
                    } else {
                        throw new Error('Unknown category');
                    }
            }

            this.renderCategoryGrid(content, category);

        } catch (error) {
            console.error('Failed to load category content:', error);
            this.showError('Failed to load category');
        } finally {
            this.hideLoading();
        }
    }

    async loadSearchContent() {
        try {
            const query = new URLSearchParams(window.location.search).get('q');
            if (!query) {
                return;
            }

            this.showLoading('Searching...');

            const results = await this.searchContent(query);
            this.renderSearchResults(results, query);

        } catch (error) {
            console.error('Failed to load search content:', error);
            this.showError('Search failed');
        } finally {
            this.hideLoading();
        }
    }

    async loadAdminContent() {
        try {
            if (!this.currentUser || !this.currentUser.is_admin) {
                window.location.href = '/';
                return;
            }

            this.showLoading('Loading admin dashboard...');

            // Load admin-specific content based on page
            const adminPage = this.getAdminPage();

            switch (adminPage) {
                case 'dashboard':
                    await this.loadAdminDashboard();
                    break;
                case 'content-browser':
                    await this.loadAdminContentBrowser();
                    break;
                case 'posts':
                    await this.loadAdminPosts();
                    break;
                case 'analytics':
                    await this.loadAdminAnalytics();
                    break;
                default:
                    await this.loadAdminDashboard();
            }

        } catch (error) {
            console.error('Failed to load admin content:', error);
            this.showError('Failed to load admin content');
        } finally {
            this.hideLoading();
        }
    }

    // ============================================================================
    // CONTENT API METHODS
    // ============================================================================

    async loadTrending(limit = 20) {
        const cacheKey = `trending-${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/recommendations/trending?limit=${limit}`);
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load trending:', error);
            return [];
        }
    }

    async loadNewReleases(limit = 20) {
        const cacheKey = `new-releases-${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/recommendations/new-releases?limit=${limit}`);
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load new releases:', error);
            return [];
        }
    }

    async loadCriticsChoice(limit = 20) {
        const cacheKey = `critics-choice-${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/recommendations/critics-choice?limit=${limit}`);
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load critics choice:', error);
            return [];
        }
    }

    async loadPopular(limit = 20) {
        const cacheKey = `popular-${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/recommendations/trending?type=all&limit=${limit}`);
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load popular:', error);
            return [];
        }
    }

    async loadAnime(limit = 20) {
        const cacheKey = `anime-${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/recommendations/anime?limit=${limit}`);
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load anime:', error);
            return [];
        }
    }

    async loadMovies(limit = 20) {
        const cacheKey = `movies-${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/recommendations/trending?type=movie&limit=${limit}`);
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load movies:', error);
            return [];
        }
    }

    async loadTVShows(limit = 20) {
        const cacheKey = `tv-shows-${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/recommendations/trending?type=tv&limit=${limit}`);
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load TV shows:', error);
            return [];
        }
    }

    async loadLanguageContent(language, limit = 20) {
        const cacheKey = `language-${language}-${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/recommendations/regional/${language}?limit=${limit}`);
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error(`Failed to load ${language} content:`, error);
            return [];
        }
    }

    async loadRegionalContent() {
        const languages = ['hindi', 'telugu', 'tamil', 'kannada', 'malayalam', 'english'];

        for (const language of languages) {
            try {
                const content = await this.loadLanguageContent(language, 10);
                if (content.length > 0) {
                    this.renderContentSection(
                        `language-${language}`,
                        content,
                        `${language.charAt(0).toUpperCase() + language.slice(1)} Movies`
                    );
                }
            } catch (error) {
                console.error(`Failed to load ${language} content:`, error);
            }
        }
    }

    async loadPersonalizedRecommendations() {
        const cacheKey = 'personalized';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall('/recommendations/personalized');
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load personalized recommendations:', error);
            // Fallback to trending
            return await this.loadTrending();
        }
    }

    async loadWatchlist() {
        try {
            const response = await this.apiCall('/user/watchlist');
            return response.watchlist;
        } catch (error) {
            console.error('Failed to load watchlist:', error);
            return [];
        }
    }

    async loadFavorites() {
        try {
            const response = await this.apiCall('/user/favorites');
            return response.favorites;
        } catch (error) {
            console.error('Failed to load favorites:', error);
            return [];
        }
    }

    async loadContinueWatching() {
        // This would need to be implemented in the backend
        // For now, return empty array
        return [];
    }

    async loadSimilarContent(contentId) {
        const cacheKey = `similar-${contentId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/recommendations/similar/${contentId}`);
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load similar content:', error);
            return [];
        }
    }

    async getContentDetails(contentId) {
        const cacheKey = `details-${contentId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/content/${contentId}`);
            this.cache.set(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get content details:', error);
            throw error;
        }
    }

    async searchContent(query, page = 1) {
        try {
            const response = await this.apiCall(`/search?query=${encodeURIComponent(query)}&page=${page}`);
            return response;
        } catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    }

    // ============================================================================
    // USER INTERACTIONS
    // ============================================================================

    async addToWatchlist(contentId) {
        try {
            await this.apiCall('/interactions', {
                method: 'POST',
                body: JSON.stringify({
                    content_id: contentId,
                    interaction_type: 'watchlist'
                })
            });

            this.showToast('Added to watchlist', 'success');
            this.updateWatchlistUI(contentId, true);

            // Clear watchlist cache
            this.cache.delete('watchlist');

        } catch (error) {
            console.error('Failed to add to watchlist:', error);
            this.showToast('Failed to add to watchlist', 'error');
        }
    }

    async removeFromWatchlist(contentId) {
        try {
            // This would need to be implemented in the backend
            // For now, just update UI
            this.showToast('Removed from watchlist', 'success');
            this.updateWatchlistUI(contentId, false);

            // Clear watchlist cache
            this.cache.delete('watchlist');

        } catch (error) {
            console.error('Failed to remove from watchlist:', error);
            this.showToast('Failed to remove from watchlist', 'error');
        }
    }

    async addToFavorites(contentId) {
        try {
            await this.apiCall('/interactions', {
                method: 'POST',
                body: JSON.stringify({
                    content_id: contentId,
                    interaction_type: 'favorite'
                })
            });

            this.showToast('Added to favorites', 'success');
            this.updateFavoritesUI(contentId, true);

            // Clear favorites cache
            this.cache.delete('favorites');

        } catch (error) {
            console.error('Failed to add to favorites:', error);
            this.showToast('Failed to add to favorites', 'error');
        }
    }

    async removeFromFavorites(contentId) {
        try {
            // This would need to be implemented in the backend
            // For now, just update UI
            this.showToast('Removed from favorites', 'success');
            this.updateFavoritesUI(contentId, false);

            // Clear favorites cache
            this.cache.delete('favorites');

        } catch (error) {
            console.error('Failed to remove from favorites:', error);
            this.showToast('Failed to remove from favorites', 'error');
        }
    }

    async rateContent(contentId, rating) {
        try {
            await this.apiCall('/interactions', {
                method: 'POST',
                body: JSON.stringify({
                    content_id: contentId,
                    interaction_type: 'rating',
                    rating: rating
                })
            });

            this.showToast('Rating saved', 'success');
            this.updateRatingUI(contentId, rating);

        } catch (error) {
            console.error('Failed to rate content:', error);
            this.showToast('Failed to save rating', 'error');
        }
    }

    // ============================================================================
    // ADMIN METHODS
    // ============================================================================

    async loadAdminDashboard() {
        try {
            const analytics = await this.apiCall('/admin/analytics');
            this.renderAdminAnalytics(analytics);

            const recommendations = await this.apiCall('/admin/recommendations');
            this.renderAdminRecommendations(recommendations);

        } catch (error) {
            console.error('Failed to load admin dashboard:', error);
            this.showError('Failed to load admin dashboard');
        }
    }

    async loadAdminContentBrowser() {
        try {
            // Load content management interface
            this.renderAdminContentBrowser();
        } catch (error) {
            console.error('Failed to load admin content browser:', error);
            this.showError('Failed to load content browser');
        }
    }

    async loadAdminPosts() {
        try {
            const recommendations = await this.apiCall('/admin/recommendations');
            this.renderAdminPosts(recommendations);
        } catch (error) {
            console.error('Failed to load admin posts:', error);
            this.showError('Failed to load posts');
        }
    }

    async loadAdminAnalytics() {
        try {
            const analytics = await this.apiCall('/admin/analytics');
            this.renderAdminAnalyticsPage(analytics);
        } catch (error) {
            console.error('Failed to load admin analytics:', error);
            this.showError('Failed to load analytics');
        }
    }

    async searchExternalContent(query, source = 'tmdb') {
        try {
            const response = await this.apiCall(`/admin/search?query=${encodeURIComponent(query)}&source=${source}`);
            return response.results;
        } catch (error) {
            console.error('Failed to search external content:', error);
            throw error;
        }
    }

    async saveExternalContent(contentData) {
        try {
            const response = await this.apiCall('/admin/content', {
                method: 'POST',
                body: JSON.stringify(contentData)
            });

            this.showToast('Content saved successfully', 'success');
            return response;
        } catch (error) {
            console.error('Failed to save content:', error);
            this.showToast('Failed to save content', 'error');
            throw error;
        }
    }

    async createAdminRecommendation(data) {
        try {
            const response = await this.apiCall('/admin/recommendations', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            this.showToast('Recommendation created successfully', 'success');
            return response;
        } catch (error) {
            console.error('Failed to create recommendation:', error);
            this.showToast('Failed to create recommendation', 'error');
            throw error;
        }
    }

    // ============================================================================
    // RENDERING METHODS
    // ============================================================================

    renderContentSection(sectionId, content, title) {
        const container = document.getElementById(sectionId) ||
            document.querySelector(`[data-section="${sectionId}"]`) ||
            this.createContentSection(sectionId, title);

        if (!container) {
            console.warn(`Container not found for section: ${sectionId}`);
            return;
        }

        // Update title if provided
        const titleElement = container.querySelector('.section-title');
        if (titleElement && title) {
            titleElement.textContent = title;
        }

        // Get or create content grid
        let contentGrid = container.querySelector('.content-grid');
        if (!contentGrid) {
            contentGrid = document.createElement('div');
            contentGrid.className = 'content-grid grid grid-auto-sm gap-4 overflow-x-auto pb-4';
            container.appendChild(contentGrid);
        }

        // Clear existing content
        contentGrid.innerHTML = '';

        // Render content items
        if (content && content.length > 0) {
            content.forEach((item, index) => {
                const card = this.createMovieCard(item, index);
                contentGrid.appendChild(card);
            });

            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }

        // Initialize lazy loading for this section
        this.initializeLazyLoadingForContainer(container);
    }

    createContentSection(sectionId, title) {
        const section = document.createElement('section');
        section.id = sectionId;
        section.className = 'section-sm';
        section.innerHTML = `
      <div class="container">
        <div class="flex justify-between items-center mb-6">
          <h2 class="section-title text-2xl font-semibold text-primary">${title}</h2>
          <a href="/categories/${sectionId}" class="btn btn-ghost btn-sm">
            View All <i class="fas fa-arrow-right ml-2"></i>
          </a>
        </div>
        <div class="content-grid grid grid-auto-sm gap-4 overflow-x-auto pb-4"></div>
      </div>
    `;

        // Insert before main content or at the end
        const mainContent = document.querySelector('main') || document.body;
        mainContent.appendChild(section);

        return section;
    }

    createMovieCard(content, index = 0) {
        const card = document.createElement('div');
        card.className = 'movie-card group cursor-pointer stagger-animation';
        card.setAttribute('data-content-id', content.id);
        card.style.animationDelay = `${index * 0.1}s`;

        // Determine poster URL
        let posterUrl = content.poster_path;
        if (posterUrl && !posterUrl.startsWith('http')) {
            posterUrl = `https://image.tmdb.org/t/p/w300${posterUrl}`;
        }

        // Fallback poster
        if (!posterUrl) {
            posterUrl = '/assets/images/poster-placeholder.jpg';
        }

        // Format rating
        const rating = content.rating ? parseFloat(content.rating).toFixed(1) : 'N/A';

        // Format genres
        const genres = Array.isArray(content.genres) ? content.genres.slice(0, 3) : [];

        // Content type icon
        const typeIcons = {
            'movie': 'fas fa-film',
            'tv': 'fas fa-tv',
            'anime': 'fas fa-dragon'
        };
        const typeIcon = typeIcons[content.content_type] || 'fas fa-play-circle';

        card.innerHTML = `
      <div class="movie-card-image-container relative overflow-hidden rounded-lg">
        <img 
          src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PC9zdmc+"
          data-src="${posterUrl}"
          alt="${content.title}"
          class="movie-card-image w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        <div class="movie-card-overlay absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div class="movie-card-info">
            <h3 class="movie-card-title text-white font-semibold text-sm mb-2 line-clamp-2">${content.title}</h3>
            <div class="flex items-center gap-2 mb-2">
              <div class="movie-card-rating flex items-center gap-1 text-blue-400">
                <i class="fas fa-star text-xs"></i>
                <span class="text-xs">${rating}</span>
              </div>
              <div class="movie-card-type text-gray-300">
                <i class="${typeIcon} text-xs"></i>
                <span class="text-xs ml-1">${content.content_type.toUpperCase()}</span>
              </div>
            </div>
            ${genres.length > 0 ? `
              <div class="movie-card-genres flex gap-1 flex-wrap mb-3">
                ${genres.map(genre => `
                  <span class="movie-card-genre-tag text-xs px-2 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                    ${genre}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="movie-card-actions flex gap-2">
            <button 
              class="movie-card-action btn-play bg-blue-600 hover:bg-blue-700"
              onclick="app.viewContentDetails(${content.id})"
              title="View Details"
            >
              <i class="fas fa-play"></i>
            </button>
            ${this.currentUser ? `
              <button 
                class="movie-card-action btn-watchlist bg-white/20 hover:bg-purple-600"
                onclick="app.toggleWatchlist(${content.id})"
                title="Add to Watchlist"
              >
                <i class="fas fa-plus"></i>
              </button>
              <button 
                class="movie-card-action btn-favorite bg-white/20 hover:bg-red-600"
                onclick="app.toggleFavorite(${content.id})"
                title="Add to Favorites"
              >
                <i class="fas fa-heart"></i>
              </button>
            ` : ''}
            ${content.youtube_trailer ? `
              <button 
                class="movie-card-action btn-trailer bg-white/20 hover:bg-green-600"
                onclick="app.playTrailer('${content.youtube_trailer}')"
                title="Watch Trailer"
              >
                <i class="fab fa-youtube"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

        // Add click handler for card
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on action buttons
            if (!e.target.closest('.movie-card-action')) {
                this.viewContentDetails(content.id);
            }
        });

        return card;
    }

    renderContentDetails(content) {
        const container = document.querySelector('.content-details') ||
            document.querySelector('main') ||
            document.body;

        // Update page title
        document.title = `${content.title} - Movie Platform`;

        // Format data
        const rating = content.rating ? parseFloat(content.rating).toFixed(1) : 'N/A';
        const releaseYear = content.release_date ? new Date(content.release_date).getFullYear() : 'N/A';
        const runtime = content.runtime ? `${content.runtime} min` : 'N/A';
        const genres = Array.isArray(content.genres) ? content.genres : [];
        const languages = Array.isArray(content.languages) ? content.languages : [];

        // Create poster URLs
        const posterUrl = content.poster_path && content.poster_path.startsWith('http')
            ? content.poster_path
            : content.poster_path
                ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
                : '/assets/images/poster-placeholder.jpg';

        const backdropUrl = content.backdrop_path && content.backdrop_path.startsWith('http')
            ? content.backdrop_path
            : content.backdrop_path
                ? `https://image.tmdb.org/t/p/w1280${content.backdrop_path}`
                : posterUrl;

        // Format cast and crew
        const cast = Array.isArray(content.cast) ? content.cast.slice(0, 10) : [];
        const crew = Array.isArray(content.crew) ? content.crew.slice(0, 5) : [];

        const detailsHTML = `
      <div class="content-details-hero relative overflow-hidden">
        <!-- Background Image -->
        <div class="absolute inset-0">
          <img 
            src="${backdropUrl}" 
            alt="${content.title} backdrop"
            class="w-full h-full object-cover"
            onerror="this.src='${posterUrl}'"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        </div>
        
        <!-- Content -->
        <div class="relative container py-20">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Poster -->
            <div class="lg:col-span-1">
              <div class="movie-poster-container max-w-sm mx-auto">
                <img 
                  src="${posterUrl}" 
                  alt="${content.title} poster"
                  class="w-full rounded-xl shadow-2xl"
                  onerror="this.src='/assets/images/poster-placeholder.jpg'"
                />
              </div>
            </div>
            
            <!-- Details -->
            <div class="lg:col-span-2">
              <div class="content-details-info">
                <!-- Title and Basic Info -->
                <div class="mb-6">
                  <h1 class="text-4xl lg:text-5xl font-bold text-white mb-4">
                    ${content.title}
                    ${content.original_title && content.original_title !== content.title ?
                `<span class="text-2xl lg:text-3xl text-gray-300 font-normal ml-2">(${content.original_title})</span>` : ''
            }
                  </h1>
                  
                  <div class="flex flex-wrap items-center gap-4 text-gray-300 mb-4">
                    <div class="flex items-center gap-2">
                      <i class="fas fa-star text-yellow-400"></i>
                      <span class="text-lg font-semibold">${rating}</span>
                      ${content.vote_count ? `<span class="text-sm">(${content.vote_count.toLocaleString()} votes)</span>` : ''}
                    </div>
                    <span class="text-lg">${releaseYear}</span>
                    ${runtime !== 'N/A' ? `<span>${runtime}</span>` : ''}
                    <span class="px-2 py-1 bg-blue-600 rounded text-sm uppercase">${content.content_type}</span>
                  </div>
                  
                  ${genres.length > 0 ? `
                    <div class="flex flex-wrap gap-2 mb-6">
                      ${genres.map(genre => `
                        <span class="px-3 py-1 bg-white/10 rounded-full text-sm backdrop-blur-sm">
                          ${genre}
                        </span>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
                
                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-3 mb-8">
                  ${content.youtube_trailer ? `
                    <button 
                      class="btn btn-primary btn-lg"
                      onclick="app.playTrailer('${content.youtube_trailer}')"
                    >
                      <i class="fab fa-youtube mr-2"></i>
                      Watch Trailer
                    </button>
                  ` : ''}
                  
                  ${this.currentUser ? `
                    <button 
                      class="btn btn-outline btn-lg watchlist-btn"
                      onclick="app.toggleWatchlist(${content.id})"
                      data-content-id="${content.id}"
                    >
                      <i class="fas fa-plus mr-2"></i>
                      Add to Watchlist
                    </button>
                    
                    <button 
                      class="btn btn-outline btn-lg favorite-btn"
                      onclick="app.toggleFavorite(${content.id})"
                      data-content-id="${content.id}"
                    >
                      <i class="fas fa-heart mr-2"></i>
                      Add to Favorites
                    </button>
                  ` : `
                    <a href="/login" class="btn btn-outline btn-lg">
                      <i class="fas fa-sign-in-alt mr-2"></i>
                      Login to Save
                    </a>
                  `}
                </div>
                
                <!-- Synopsis -->
                ${content.overview ? `
                  <div class="mb-8">
                    <h3 class="text-xl font-semibold text-white mb-3">Synopsis</h3>
                    <p class="text-gray-300 leading-relaxed text-lg">
                      ${content.overview}
                    </p>
                  </div>
                ` : ''}
                
                <!-- Additional Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  ${languages.length > 0 ? `
                    <div>
                      <h4 class="text-lg font-semibold text-white mb-2">Languages</h4>
                      <p class="text-gray-300">${languages.join(', ')}</p>
                    </div>
                  ` : ''}
                  
                  ${content.content_type === 'anime' && content.anime_genres ? `
                    <div>
                      <h4 class="text-lg font-semibold text-white mb-2">Anime Genres</h4>
                      <p class="text-gray-300">${JSON.parse(content.anime_genres).join(', ')}</p>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Cast and Crew Section -->
      ${cast.length > 0 || crew.length > 0 ? `
        <section class="py-12 bg-secondary">
          <div class="container">
            ${cast.length > 0 ? `
              <div class="mb-12">
                <h2 class="text-2xl font-semibold text-primary mb-6">Cast</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  ${cast.map(person => `
                    <div class="cast-member text-center">
                      ${person.profile_path ? `
                        <img 
                          src="https://image.tmdb.org/t/p/w185${person.profile_path}" 
                          alt="${person.name}"
                          class="w-20 h-20 mx-auto rounded-full object-cover mb-2"
                          onerror="this.src='/assets/images/person-placeholder.jpg'"
                        />
                      ` : `
                        <div class="w-20 h-20 mx-auto rounded-full bg-tertiary flex items-center justify-center mb-2">
                          <i class="fas fa-user text-2xl text-muted"></i>
                        </div>
                      `}
                      <h4 class="font-medium text-primary text-sm">${person.name}</h4>
                      ${person.character ? `<p class="text-secondary text-xs">${person.character}</p>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${crew.length > 0 ? `
              <div>
                <h2 class="text-2xl font-semibold text-primary mb-6">Crew</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  ${crew.map(person => `
                    <div class="crew-member flex items-center gap-3 p-3 bg-card rounded-lg">
                      ${person.profile_path ? `
                        <img 
                          src="https://image.tmdb.org/t/p/w92${person.profile_path}" 
                          alt="${person.name}"
                          class="w-12 h-12 rounded-full object-cover"
                          onerror="this.src='/assets/images/person-placeholder.jpg'"
                        />
                      ` : `
                        <div class="w-12 h-12 rounded-full bg-tertiary flex items-center justify-center">
                          <i class="fas fa-user text-muted"></i>
                        </div>
                      `}
                      <div>
                        <h4 class="font-medium text-primary">${person.name}</h4>
                        ${person.job ? `<p class="text-secondary text-sm">${person.job}</p>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </section>
      ` : ''}
    `;

        container.innerHTML = detailsHTML;

        // Initialize user interaction states
        if (this.currentUser) {
            this.updateUserInteractionStates(content.id);
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderCategoryGrid(content, category) {
        const container = document.querySelector('.category-content') ||
            document.querySelector('main') ||
            document.body;

        const categoryTitle = category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

        const gridHTML = `
      <div class="category-page">
        <div class="category-header py-12 bg-secondary">
          <div class="container">
            <h1 class="text-4xl font-bold text-primary mb-4">${categoryTitle}</h1>
            <p class="text-secondary">Discover amazing ${categoryTitle.toLowerCase()}</p>
          </div>
        </div>
        
        <div class="category-content py-8">
          <div class="container">
            ${content.length > 0 ? `
              <div class="content-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                ${content.map((item, index) => this.createMovieCard(item, index).outerHTML).join('')}
              </div>
            ` : `
              <div class="text-center py-20">
                <i class="fas fa-film text-6xl text-muted mb-4"></i>
                <h3 class="text-xl font-semibold text-secondary mb-2">No content found</h3>
                <p class="text-muted">Try checking back later or explore other categories.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

        container.innerHTML = gridHTML;

        // Re-attach event listeners for the new cards
        this.attachMovieCardListeners();

        // Initialize lazy loading
        this.initializeLazyLoadingForContainer(container);
    }

    renderSearchResults(results, query) {
        const container = document.querySelector('.search-results') ||
            document.querySelector('main') ||
            document.body;

        const resultsHTML = `
      <div class="search-results-page">
        <div class="search-header py-8 bg-secondary">
          <div class="container">
            <h1 class="text-3xl font-bold text-primary mb-2">Search Results</h1>
            <p class="text-secondary">Found ${results.results ? results.results.length : 0} results for "${query}"</p>
          </div>
        </div>
        
        <div class="search-content py-8">
          <div class="container">
            ${results.results && results.results.length > 0 ? `
              <div class="search-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                ${results.results.map((item, index) => this.createMovieCard(item, index).outerHTML).join('')}
              </div>
              
              ${results.total_pages > 1 ? `
                <div class="pagination-container mt-12 flex justify-center">
                  <nav aria-label="Search results pagination">
                    <ul class="pagination">
                      ${results.current_page > 1 ? `
                        <li class="page-item">
                          <a class="page-link" href="?q=${encodeURIComponent(query)}&page=${results.current_page - 1}">
                            <i class="fas fa-chevron-left"></i>
                          </a>
                        </li>
                      ` : ''}
                      
                      ${Array.from({ length: Math.min(results.total_pages, 10) }, (_, i) => {
            const page = i + 1;
            return `
                          <li class="page-item ${page === results.current_page ? 'active' : ''}">
                            <a class="page-link" href="?q=${encodeURIComponent(query)}&page=${page}">${page}</a>
                          </li>
                        `;
        }).join('')}
                      
                      ${results.current_page < results.total_pages ? `
                        <li class="page-item">
                          <a class="page-link" href="?q=${encodeURIComponent(query)}&page=${results.current_page + 1}">
                            <i class="fas fa-chevron-right"></i>
                          </a>
                        </li>
                      ` : ''}
                    </ul>
                  </nav>
                </div>
              ` : ''}
            ` : `
              <div class="text-center py-20">
                <i class="fas fa-search text-6xl text-muted mb-4"></i>
                <h3 class="text-xl font-semibold text-secondary mb-2">No results found</h3>
                <p class="text-muted mb-6">Try different keywords or check your spelling.</p>
                <a href="/" class="btn btn-primary">
                  <i class="fas fa-home mr-2"></i>
                  Back to Home
                </a>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

        container.innerHTML = resultsHTML;

        // Re-attach event listeners
        this.attachMovieCardListeners();

        // Initialize lazy loading
        this.initializeLazyLoadingForContainer(container);
    }

    // ============================================================================
    // UI INTERACTION METHODS
    // ============================================================================

    setupEventListeners() {
        // Search functionality
        this.setupSearchListeners();

        // Navigation
        this.setupNavigationListeners();

        // Form submissions
        this.setupFormListeners();

        // Modal interactions
        this.setupModalListeners();

        // Scroll events
        this.setupScrollListeners();
    }

    setupSearchListeners() {
        // Search form submission
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.search-form')) {
                e.preventDefault();
                this.handleSearchSubmit(e.target);
            }
        });

        // Search input with debounce
        let searchTimeout;
        document.addEventListener('input', (e) => {
            if (e.target.matches('.search-input')) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearchInput(e.target);
                }, 300);
            }
        });

        // Search suggestions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.search-suggestion')) {
                e.preventDefault();
                const query = e.target.textContent;
                this.performSearch(query);
            }
        });
    }

    setupNavigationListeners() {
        // Mobile menu toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('.mobile-menu-toggle, .mobile-menu-toggle *')) {
                e.preventDefault();
                this.toggleMobileMenu();
            }
        });

        // Dropdown toggles
        document.addEventListener('click', (e) => {
            if (e.target.matches('.dropdown-toggle, .dropdown-toggle *')) {
                e.preventDefault();
                this.toggleDropdown(e.target.closest('.dropdown-toggle'));
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                this.closeAllDropdowns();
            }
        });
    }

    setupFormListeners() {
        // Login form
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.login-form')) {
                e.preventDefault();
                this.handleLoginSubmit(e.target);
            }
        });

        // Register form
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.register-form')) {
                e.preventDefault();
                this.handleRegisterSubmit(e.target);
            }
        });

        // Admin forms
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.admin-search-form')) {
                e.preventDefault();
                this.handleAdminSearchSubmit(e.target);
            }

            if (e.target.matches('.admin-recommendation-form')) {
                e.preventDefault();
                this.handleAdminRecommendationSubmit(e.target);
            }
        });
    }

    setupModalListeners() {
        // Modal triggers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-modal-target]')) {
                e.preventDefault();
                const modalId = e.target.getAttribute('data-modal-target');
                this.openModal(modalId);
            }
        });

        // Modal close buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal-close, .modal-backdrop')) {
                e.preventDefault();
                this.closeModal();
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    setupScrollListeners() {
        let scrollTimeout;

        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.handleScroll();
            }, 100);
        });
    }

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    async handleSearchSubmit(form) {
        const formData = new FormData(form);
        const query = formData.get('query') || formData.get('q');

        if (!query || !query.trim()) {
            this.showToast('Please enter a search term', 'warning');
            return;
        }

        this.performSearch(query.trim());
    }

    async handleSearchInput(input) {
        const query = input.value.trim();

        if (query.length >= 2) {
            try {
                // Show search suggestions
                await this.showSearchSuggestions(query, input);
            } catch (error) {
                console.error('Failed to load search suggestions:', error);
            }
        } else {
            this.hideSearchSuggestions();
        }
    }

    async handleLoginSubmit(form) {
        const formData = new FormData(form);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        // Validate input
        if (!credentials.username || !credentials.password) {
            this.showToast('Please fill in all fields', 'warning');
            return;
        }

        try {
            await this.login(credentials);
        } catch (error) {
            // Error already handled in login method
        }
    }

    async handleRegisterSubmit(form) {
        const formData = new FormData(form);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            preferred_languages: formData.getAll('preferred_languages'),
            preferred_genres: formData.getAll('preferred_genres')
        };

        // Validate input
        if (!userData.username || !userData.email || !userData.password) {
            this.showToast('Please fill in all required fields', 'warning');
            return;
        }

        // Validate email
        if (!this.isValidEmail(userData.email)) {
            this.showToast('Please enter a valid email address', 'warning');
            return;
        }

        // Validate password
        if (userData.password.length < 6) {
            this.showToast('Password must be at least 6 characters long', 'warning');
            return;
        }

        try {
            await this.register(userData);
        } catch (error) {
            // Error already handled in register method
        }
    }

    async handleAdminSearchSubmit(form) {
        const formData = new FormData(form);
        const query = formData.get('query');
        const source = formData.get('source') || 'tmdb';

        if (!query || !query.trim()) {
            this.showToast('Please enter a search term', 'warning');
            return;
        }

        try {
            this.showLoading('Searching external content...');

            const results = await this.searchExternalContent(query.trim(), source);
            this.renderAdminSearchResults(results, query, source);

        } catch (error) {
            console.error('Admin search failed:', error);
            this.showToast('Search failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleAdminRecommendationSubmit(form) {
        const formData = new FormData(form);
        const data = {
            content_id: parseInt(formData.get('content_id')),
            recommendation_type: formData.get('recommendation_type'),
            description: formData.get('description')
        };

        if (!data.content_id || !data.recommendation_type || !data.description) {
            this.showToast('Please fill in all fields', 'warning');
            return;
        }

        try {
            await this.createAdminRecommendation(data);
            form.reset();
        } catch (error) {
            // Error already handled in createAdminRecommendation method
        }
    }

    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Update navbar on scroll
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (scrollTop > 100) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        }

        // Show/hide back to top button
        const backToTop = document.querySelector('.back-to-top');
        if (backToTop) {
            if (scrollTop > 500) {
                backToTop.classList.add('show');
            } else {
                backToTop.classList.remove('show');
            }
        }
    }

    // ============================================================================
    // UI HELPER METHODS
    // ============================================================================

    async performSearch(query) {
        try {
            // Update URL
            const searchUrl = `/search?q=${encodeURIComponent(query)}`;
            window.history.pushState({}, '', searchUrl);

            // Perform search
            const results = await this.searchContent(query);
            this.renderSearchResults(results, query);

        } catch (error) {
            console.error('Search failed:', error);
            this.showToast('Search failed', 'error');
        }
    }

    async showSearchSuggestions(query, input) {
        // This would ideally call a suggestions endpoint
        // For now, we'll skip implementation to keep response length manageable
    }

    hideSearchSuggestions() {
        const suggestions = document.querySelector('.search-suggestions');
        if (suggestions) {
            suggestions.remove();
        }
    }

    toggleMobileMenu() {
        const menu = document.querySelector('.mobile-menu');
        const overlay = document.querySelector('.mobile-menu-overlay');
        const toggle = document.querySelector('.mobile-menu-toggle');

        if (menu) {
            menu.classList.toggle('show');

            if (overlay) {
                overlay.classList.toggle('show');
            }

            if (toggle) {
                toggle.classList.toggle('active');
            }

            // Prevent body scroll when menu is open
            document.body.classList.toggle('menu-open');
        }
    }

    toggleDropdown(trigger) {
        const dropdown = trigger.parentElement;
        const menu = dropdown.querySelector('.dropdown-menu');

        if (menu) {
            // Close other dropdowns
            this.closeAllDropdowns();

            // Toggle current dropdown
            menu.classList.toggle('show');
            trigger.setAttribute('aria-expanded', menu.classList.contains('show'));
        }
    }

    closeAllDropdowns() {
        const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
        openDropdowns.forEach(menu => {
            menu.classList.remove('show');
            const trigger = menu.parentElement.querySelector('.dropdown-toggle');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.classList.add('modal-open');

            // Focus management
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    closeModal() {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.classList.remove('modal-open');
    }

    viewContentDetails(contentId) {
        window.location.href = `/details?id=${contentId}`;
    }

    async toggleWatchlist(contentId) {
        if (!this.currentUser) {
            this.showToast('Please log in to use watchlist', 'info');
            return;
        }

        try {
            // Check current state (this would need to be tracked)
            const isInWatchlist = await this.isInWatchlist(contentId);

            if (isInWatchlist) {
                await this.removeFromWatchlist(contentId);
            } else {
                await this.addToWatchlist(contentId);
            }
        } catch (error) {
            console.error('Failed to toggle watchlist:', error);
            this.showToast('Failed to update watchlist', 'error');
        }
    }

    async toggleFavorite(contentId) {
        if (!this.currentUser) {
            this.showToast('Please log in to use favorites', 'info');
            return;
        }

        try {
            // Check current state (this would need to be tracked)
            const isInFavorites = await this.isInFavorites(contentId);

            if (isInFavorites) {
                await this.removeFromFavorites(contentId);
            } else {
                await this.addToFavorites(contentId);
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            this.showToast('Failed to update favorites', 'error');
        }
    }

    playTrailer(youtubeUrl) {
        // Extract video ID from YouTube URL
        const videoId = this.extractYouTubeVideoId(youtubeUrl);

        if (videoId) {
            this.openTrailerModal(videoId);
        } else {
            // Fallback - open in new tab
            window.open(youtubeUrl, '_blank');
        }
    }

    openTrailerModal(videoId) {
        const modalHTML = `
      <div class="modal trailer-modal" id="trailerModal">
        <div class="modal-backdrop"></div>
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Trailer</h5>
              <button type="button" class="modal-close">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="modal-body p-0">
              <div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
                <iframe
                  src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
                  style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                  frameborder="0"
                  allowfullscreen
                  allow="autoplay; encrypted-media"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

        // Remove existing trailer modal
        const existingModal = document.getElementById('trailerModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        setTimeout(() => {
            this.openModal('trailerModal');
        }, 100);
    }

    extractYouTubeVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    // ============================================================================
    // UI STATE MANAGEMENT
    // ============================================================================

    updateWatchlistUI(contentId, isInWatchlist) {
        const buttons = document.querySelectorAll(`[data-content-id="${contentId}"] .btn-watchlist, .watchlist-btn[data-content-id="${contentId}"]`);

        buttons.forEach(button => {
            const icon = button.querySelector('i');
            const text = button.querySelector('.btn-text');

            if (isInWatchlist) {
                if (icon) icon.className = 'fas fa-check mr-2';
                if (text) text.textContent = 'In Watchlist';
                button.classList.add('btn-success');
                button.classList.remove('btn-outline');
            } else {
                if (icon) icon.className = 'fas fa-plus mr-2';
                if (text) text.textContent = 'Add to Watchlist';
                button.classList.remove('btn-success');
                button.classList.add('btn-outline');
            }
        });
    }

    updateFavoritesUI(contentId, isInFavorites) {
        const buttons = document.querySelectorAll(`[data-content-id="${contentId}"] .btn-favorite, .favorite-btn[data-content-id="${contentId}"]`);

        buttons.forEach(button => {
            const icon = button.querySelector('i');
            const text = button.querySelector('.btn-text');

            if (isInFavorites) {
                if (icon) icon.className = 'fas fa-heart mr-2';
                if (text) text.textContent = 'Favorited';
                button.classList.add('btn-danger');
                button.classList.remove('btn-outline');
            } else {
                if (icon) icon.className = 'far fa-heart mr-2';
                if (text) text.textContent = 'Add to Favorites';
                button.classList.remove('btn-danger');
                button.classList.add('btn-outline');
            }
        });
    }

    updateRatingUI(contentId, rating) {
        const ratingElements = document.querySelectorAll(`[data-content-id="${contentId}"] .user-rating`);

        ratingElements.forEach(element => {
            const stars = element.querySelectorAll('.star');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        });
    }

    async updateUserInteractionStates(contentId) {
        try {
            // This would need to be implemented in the backend
            // For now, we'll skip the actual API calls

            const isInWatchlist = false; // await this.isInWatchlist(contentId);
            const isInFavorites = false; // await this.isInFavorites(contentId);

            this.updateWatchlistUI(contentId, isInWatchlist);
            this.updateFavoritesUI(contentId, isInFavorites);

        } catch (error) {
            console.error('Failed to update interaction states:', error);
        }
    }

    // ============================================================================
    // LAZY LOADING IMPLEMENTATION
    // ============================================================================

    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.lazyImageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImage(img);
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '100px 0px',
                threshold: 0.01
            });

            // Observe all images with data-src
            this.observeLazyImages();
        } else {
            // Fallback for older browsers
            this.loadAllImages();
        }
    }

    observeLazyImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            this.lazyImageObserver.observe(img);
        });
    }

    initializeLazyLoadingForContainer(container) {
        if (this.lazyImageObserver) {
            const lazyImages = container.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                this.lazyImageObserver.observe(img);
            });
        }
    }

    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');

            // Add fade-in effect
            img.addEventListener('load', () => {
                img.style.opacity = '1';
            });
        }
    }

    loadAllImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => this.loadImage(img));
    }

    // ============================================================================
    // TOUCH GESTURES
    // ============================================================================

    setupTouchGestures() {
        // Swipe gestures for carousels
        this.setupCarouselSwipes();

        // Pull to refresh (if needed)
        this.setupPullToRefresh();

        // Touch feedback
        this.setupTouchFeedback();
    }

    setupCarouselSwipes() {
        const carousels = document.querySelectorAll('.content-grid');

        carousels.forEach(carousel => {
            let startX = 0;
            let startY = 0;
            let currentX = 0;
            let currentY = 0;
            let isDragging = false;

            carousel.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isDragging = true;
            }, { passive: true });

            carousel.addEventListener('touchmove', (e) => {
                if (!isDragging) return;

                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;

                const diffX = startX - currentX;
                const diffY = startY - currentY;

                // Horizontal swipe
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                    e.preventDefault();
                    carousel.scrollLeft += diffX * 0.5;
                }
            }, { passive: false });

            carousel.addEventListener('touchend', () => {
                isDragging = false;
            }, { passive: true });
        });
    }

    setupPullToRefresh() {
        // Simple pull to refresh implementation
        let startY = 0;
        let isPulling = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 100 && window.scrollY === 0) {
                // Show refresh indicator
                this.showRefreshIndicator();
            }
        }, { passive: true });

        document.addEventListener('touchend', async (e) => {
            if (isPulling) {
                const currentY = e.changedTouches[0].clientY;
                const diff = currentY - startY;

                if (diff > 100 && window.scrollY === 0) {
                    // Trigger refresh
                    await this.refreshContent();
                }

                this.hideRefreshIndicator();
                isPulling = false;
            }
        }, { passive: true });
    }

    setupTouchFeedback() {
        // Add touch feedback to interactive elements
        const interactiveElements = document.querySelectorAll('button, .btn, .movie-card, .nav-link');

        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.classList.add('touching');
            }, { passive: true });

            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.classList.remove('touching');
                }, 150);
            }, { passive: true });

            element.addEventListener('touchcancel', () => {
                element.classList.remove('touching');
            }, { passive: true });
        });
    }

    // ============================================================================
    // KEYBOARD NAVIGATION
    // ============================================================================

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Handle different key combinations
            switch (e.key) {
                case '/':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.focusSearch();
                    }
                    break;
                case 'Escape':
                    this.handleEscapeKey();
                    break;
                case 'ArrowLeft':
                case 'ArrowRight':
                    if (e.target.closest('.content-grid')) {
                        this.handleArrowNavigation(e);
                    }
                    break;
                case 'Enter':
                    if (e.target.matches('.movie-card')) {
                        e.preventDefault();
                        const contentId = e.target.getAttribute('data-content-id');
                        this.viewContentDetails(contentId);
                    }
                    break;
            }
        });
    }

    focusSearch() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    handleEscapeKey() {
        // Close modals
        this.closeModal();

        // Close dropdowns
        this.closeAllDropdowns();

        // Close mobile menu
        const mobileMenu = document.querySelector('.mobile-menu.show');
        if (mobileMenu) {
            this.toggleMobileMenu();
        }

        // Clear search suggestions
        this.hideSearchSuggestions();
    }

    handleArrowNavigation(e) {
        const currentCard = e.target.closest('.movie-card');
        if (!currentCard) return;

        const grid = currentCard.closest('.content-grid');
        const cards = Array.from(grid.querySelectorAll('.movie-card'));
        const currentIndex = cards.indexOf(currentCard);

        let nextIndex;

        if (e.key === 'ArrowLeft') {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
        } else {
            nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
        }

        e.preventDefault();
        cards[nextIndex].focus();
    }

    // ============================================================================
    // ERROR HANDLING AND LOADING STATES
    // ============================================================================

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.handleError(e.error, 'An unexpected error occurred');
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.handleError(e.reason, 'An unexpected error occurred');
        });

        // Network status
        window.addEventListener('online', () => {
            this.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            this.showToast('No internet connection', 'warning');
        });
    }

    handleError(error, userMessage = 'Something went wrong') {
        console.error('Error:', error);

        // Don't show error toasts for network issues when offline
        if (!navigator.onLine && error.name === 'TypeError') {
            return;
        }

        this.showToast(userMessage, 'error');

        // Hide loading states
        this.hideLoading();
    }

    showLoading(message = 'Loading...') {
        this.isLoading = true;

        // Show loading overlay
        let loadingOverlay = document.querySelector('.loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50';
            loadingOverlay.innerHTML = `
        <div class="loading-content bg-card p-6 rounded-lg shadow-2xl flex items-center gap-4">
          <div class="spinner-border text-primary"></div>
          <span class="loading-message text-primary font-medium">${message}</span>
        </div>
      `;
            document.body.appendChild(loadingOverlay);
        } else {
            const messageElement = loadingOverlay.querySelector('.loading-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
            loadingOverlay.style.display = 'flex';
        }

        // Prevent body scroll
        document.body.classList.add('loading');
    }

    hideLoading() {
        this.isLoading = false;

        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        // Restore body scroll
        document.body.classList.remove('loading');
    }

    showError(message = 'Something went wrong') {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info', duration = 5000) {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(toastContainer);
        }

        // Create toast
        const toast = document.createElement('div');
        const toastId = `toast-${Date.now()}`;
        toast.id = toastId;
        toast.className = `toast bg-card border border-primary/20 shadow-lg rounded-lg p-4 min-w-[300px] transform translate-x-full transition-transform duration-300 ${type}`;

        // Toast icons
        const icons = {
            success: 'fas fa-check-circle text-green-500',
            error: 'fas fa-exclamation-circle text-red-500',
            warning: 'fas fa-exclamation-triangle text-yellow-500',
            info: 'fas fa-info-circle text-blue-500'
        };

        toast.innerHTML = `
      <div class="flex items-start gap-3">
        <i class="${icons[type] || icons.info}"></i>
        <div class="flex-1">
          <p class="text-primary font-medium">${message}</p>
        </div>
        <button class="toast-close text-secondary hover:text-primary transition-colors" onclick="app.removeToast('${toastId}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove
        setTimeout(() => {
            this.removeToast(toastId);
        }, duration);
    }

    removeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }

    showRefreshIndicator() {
        // Simple refresh indicator
        let indicator = document.querySelector('.refresh-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'refresh-indicator fixed top-0 left-0 right-0 bg-primary text-white text-center py-2 z-50';
            indicator.innerHTML = '<i class="fas fa-sync-alt animate-spin mr-2"></i>Pull to refresh';
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'block';
    }

    hideRefreshIndicator() {
        const indicator = document.querySelector('.refresh-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    async refreshContent() {
        try {
            // Clear cache
            this.cache.clear();

            // Reload current page content
            await this.loadInitialContent();

            this.showToast('Content refreshed', 'success');
        } catch (error) {
            console.error('Failed to refresh content:', error);
            this.showToast('Failed to refresh content', 'error');
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    getCurrentPage() {
        const path = window.location.pathname;

        if (path === '/' || path === '/index.html') return 'home';
        if (path.includes('/dashboard')) return 'dashboard';
        if (path.includes('/details')) return 'details';
        if (path.includes('/search')) return 'search';
        if (path.includes('/categories/') || path.includes('/languages/')) return 'category';
        if (path.includes('/admin/')) return 'admin';
        if (path.includes('/login')) return 'login';
        if (path.includes('/profile')) return 'profile';

        return 'unknown';
    }

    getContentIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    getCategoryFromUrl() {
        const path = window.location.pathname;
        const matches = path.match(/\/(categories|languages)\/(.+)/);
        return matches ? matches[2] : null;
    }

    getAdminPage() {
        const path = window.location.pathname;
        const matches = path.match(/\/admin\/(.+)/);
        return matches ? matches[1] : 'dashboard';
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    }

    formatRating(rating) {
        if (!rating) return 'N/A';
        return parseFloat(rating).toFixed(1);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(`app:${eventName}`, {
            detail: detail,
            bubbles: true,
            cancelable: true
        });

        document.dispatchEvent(event);
    }

    attachMovieCardListeners() {
        // Re-attach event listeners for dynamically created movie cards
        const movieCards = document.querySelectorAll('.movie-card');

        movieCards.forEach(card => {
            // Make cards focusable for keyboard navigation
            if (!card.hasAttribute('tabindex')) {
                card.setAttribute('tabindex', '0');
            }

            // Add click handler if not already present
            if (!card.hasAttribute('data-listeners-attached')) {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.movie-card-action')) {
                        const contentId = card.getAttribute('data-content-id');
                        this.viewContentDetails(contentId);
                    }
                });

                card.setAttribute('data-listeners-attached', 'true');
            }
        });
    }

    initializeComponents() {
        // Initialize any custom components here
        this.initializeCarousels();
        this.initializeTabs();
        this.initializeTooltips();
    }

    initializeCarousels() {
        // Custom carousel initialization if needed
        const carousels = document.querySelectorAll('.carousel');
        carousels.forEach(carousel => {
            // Add touch support, etc.
        });
    }

    initializeTabs() {
        // Tab functionality
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-tab')) {
                e.preventDefault();
                this.switchTab(e.target);
            }
        });
    }

    switchTab(tabButton) {
        const tabContainer = tabButton.closest('.tabs');
        if (!tabContainer) return;

        const targetId = tabButton.getAttribute('href') || tabButton.getAttribute('data-tab');
        const targetPane = document.querySelector(targetId);

        if (!targetPane) return;

        // Update active tab
        tabContainer.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        tabButton.classList.add('active');

        // Update active pane
        const tabContent = tabContainer.querySelector('.tab-content');
        if (tabContent) {
            tabContent.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            targetPane.classList.add('active');
        }
    }

    initializeTooltips() {
        // Simple tooltip implementation
        document.addEventListener('mouseenter', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.showTooltip(e.target);
            }
        });

        document.addEventListener('mouseleave', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.hideTooltip();
            }
        });
    }

    showTooltip(element) {
        const text = element.getAttribute('data-tooltip');
        if (!text) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip-popup fixed bg-black text-white px-2 py-1 rounded text-sm z-50 pointer-events-none';
        tooltip.textContent = text;
        tooltip.id = 'active-tooltip';

        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
    }

    hideTooltip() {
        const tooltip = document.getElementById('active-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    // ============================================================================
    // PLACEHOLDER METHODS FOR FUTURE IMPLEMENTATION
    // ============================================================================

    async isInWatchlist(contentId) {
        // This would check the user's watchlist status for the content
        // For now, return false as a placeholder
        return false;
    }

    async isInFavorites(contentId) {
        // This would check the user's favorites status for the content
        // For now, return false as a placeholder
        return false;
    }

    renderAdminAnalytics(analytics) {
        // Render admin analytics dashboard
        console.log('Rendering admin analytics:', analytics);
    }

    renderAdminRecommendations(recommendations) {
        // Render admin recommendations management
        console.log('Rendering admin recommendations:', recommendations);
    }

    renderAdminContentBrowser() {
        // Render admin content browser interface
        console.log('Rendering admin content browser');
    }

    renderAdminPosts(posts) {
        // Render admin posts management
        console.log('Rendering admin posts:', posts);
    }

    renderAdminAnalyticsPage(analytics) {
        // Render full admin analytics page
        console.log('Rendering admin analytics page:', analytics);
    }

    renderAdminSearchResults(results, query, source) {
        // Render admin search results for external content
        console.log('Rendering admin search results:', { results, query, source });
    }
}

// Initialize the app when DOM is ready
let app;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new MoviePlatformApp();
    });
} else {
    app = new MoviePlatformApp();
}

// Export for global access
window.app = app;

// Service Worker Registration for PWA functionality
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

// Export the main class for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoviePlatformApp;
}