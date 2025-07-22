// Main Application JavaScript
class MovieApp {
    constructor() {
        this.API_BASE = 'https://backend-app-970m.onrender.com/api';
        this.currentUser = null;
        this.authToken = null;
        this.currentPage = 1;
        this.loadingStates = new Set();
        this.cache = new Map();
        this.intersectionObserver = null;
        
        this.init();
    }

    async init() {
        console.log('Initializing Movie App...');
        
        // Initialize components
        this.setupEventListeners();
        this.setupIntersectionObserver();
        this.setupNavbar();
        this.checkAuthStatus();
        this.loadCurrentPage();
        
        // Initialize UI components
        this.initializeTooltips();
        this.initializeModals();
        this.initializeTabs();
        this.initializeDropdowns();
        
        console.log('Movie App initialized successfully');
    }

    // Authentication Methods
    checkAuthStatus() {
        const token = this.getStoredToken();
        if (token) {
            this.authToken = token;
            this.fetchUserProfile();
        }
        this.updateAuthUI();
    }

    getStoredToken() {
        // Using JavaScript variables only (no localStorage)
        return this.authToken;
    }

    async login(credentials) {
        try {
            this.setLoadingState('login', true);
            
            const response = await this.apiCall('/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (response.token) {
                this.authToken = response.token;
                this.currentUser = response.user;
                this.updateAuthUI();
                this.showToast('Login successful!', 'success');
                
                // Redirect based on user type
                if (this.currentUser.is_admin) {
                    this.navigate('/admin/dashboard');
                } else {
                    this.navigate('/dashboard');
                }
                
                return { success: true };
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message || 'Login failed', 'error');
            return { success: false, error: error.message };
        } finally {
            this.setLoadingState('login', false);
        }
    }

    async register(userData) {
        try {
            this.setLoadingState('register', true);
            
            const response = await this.apiCall('/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.token) {
                this.authToken = response.token;
                this.currentUser = response.user;
                this.updateAuthUI();
                this.showToast('Registration successful!', 'success');
                this.navigate('/dashboard');
                return { success: true };
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast(error.message || 'Registration failed', 'error');
            return { success: false, error: error.message };
        } finally {
            this.setLoadingState('register', false);
        }
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        this.updateAuthUI();
        this.showToast('Logged out successfully', 'success');
        this.navigate('/');
    }

    async fetchUserProfile() {
        try {
            const response = await this.apiCall('/user/profile');
            this.currentUser = response.user;
            this.updateAuthUI();
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            this.logout();
        }
    }

    // API Methods
    async apiCall(endpoint, options = {}) {
        const url = `${this.API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.authToken) {
            config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            if (error.message.includes('401') || error.message.includes('Invalid token')) {
                this.logout();
            }
            throw error;
        }
    }

    // Content Loading Methods
    async loadTrending(limit = 20, contentType = 'all') {
        const cacheKey = `trending_${contentType}_${limit}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            this.setLoadingState('trending', true);
            const response = await this.apiCall(`/recommendations/trending?type=${contentType}&limit=${limit}`);
            
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load trending content:', error);
            this.showToast('Failed to load trending content', 'error');
            return [];
        } finally {
            this.setLoadingState('trending', false);
        }
    }

    async loadNewReleases(limit = 20, language = null, contentType = 'movie') {
        const cacheKey = `new_releases_${contentType}_${language}_${limit}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            this.setLoadingState('new-releases', true);
            let url = `/recommendations/new-releases?type=${contentType}&limit=${limit}`;
            if (language) url += `&language=${language}`;
            
            const response = await this.apiCall(url);
            
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load new releases:', error);
            this.showToast('Failed to load new releases', 'error');
            return [];
        } finally {
            this.setLoadingState('new-releases', false);
        }
    }

    async loadCriticsChoice(limit = 20, contentType = 'movie') {
        const cacheKey = `critics_choice_${contentType}_${limit}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            this.setLoadingState('critics-choice', true);
            const response = await this.apiCall(`/recommendations/critics-choice?type=${contentType}&limit=${limit}`);
            
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load critics choice:', error);
            this.showToast('Failed to load critics choice', 'error');
            return [];
        } finally {
            this.setLoadingState('critics-choice', false);
        }
    }

    async loadGenreContent(genre, limit = 20, contentType = 'movie') {
        const cacheKey = `genre_${genre}_${contentType}_${limit}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            this.setLoadingState(`genre-${genre}`, true);
            const response = await this.apiCall(`/recommendations/genre/${genre}?type=${contentType}&limit=${limit}`);
            
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error(`Failed to load ${genre} content:`, error);
            this.showToast(`Failed to load ${genre} content`, 'error');
            return [];
        } finally {
            this.setLoadingState(`genre-${genre}`, false);
        }
    }

    async loadRegionalContent(language, limit = 20, contentType = 'movie') {
        const cacheKey = `regional_${language}_${contentType}_${limit}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            this.setLoadingState(`regional-${language}`, true);
            const response = await this.apiCall(`/recommendations/regional/${language}?type=${contentType}&limit=${limit}`);
            
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error(`Failed to load ${language} content:`, error);
            this.showToast(`Failed to load ${language} content`, 'error');
            return [];
        } finally {
            this.setLoadingState(`regional-${language}`, false);
        }
    }

    async loadAnimeContent(limit = 20, genre = null) {
        const cacheKey = `anime_${genre || 'all'}_${limit}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            this.setLoadingState('anime', true);
            let url = `/recommendations/anime?limit=${limit}`;
            if (genre) url += `&genre=${genre}`;
            
            const response = await this.apiCall(url);
            
            this.cache.set(cacheKey, response.recommendations);
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load anime content:', error);
            this.showToast('Failed to load anime content', 'error');
            return [];
        } finally {
            this.setLoadingState('anime', false);
        }
    }

    async loadPersonalizedRecommendations() {
        if (!this.authToken) {
            return this.loadAnonymousRecommendations();
        }

        try {
            this.setLoadingState('personalized', true);
            const response = await this.apiCall('/recommendations/personalized');
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load personalized recommendations:', error);
            return this.loadAnonymousRecommendations();
        } finally {
            this.setLoadingState('personalized', false);
        }
    }

    async loadAnonymousRecommendations() {
        try {
            this.setLoadingState('anonymous', true);
            const response = await this.apiCall('/recommendations/anonymous');
            return response.recommendations;
        } catch (error) {
            console.error('Failed to load anonymous recommendations:', error);
            return [];
        } finally {
            this.setLoadingState('anonymous', false);
        }
    }

    async searchContent(query, page = 1, type = 'multi') {
        try {
            this.setLoadingState('search', true);
            const response = await this.apiCall(`/search?query=${encodeURIComponent(query)}&page=${page}&type=${type}`);
            return response;
        } catch (error) {
            console.error('Search failed:', error);
            this.showToast('Search failed', 'error');
            return { results: [], total_results: 0 };
        } finally {
            this.setLoadingState('search', false);
        }
    }

    async loadContentDetails(contentId) {
        const cacheKey = `content_${contentId}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            this.setLoadingState('content-details', true);
            const response = await this.apiCall(`/content/${contentId}`);
            
            this.cache.set(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to load content details:', error);
            this.showToast('Failed to load content details', 'error');
            return null;
        } finally {
            this.setLoadingState('content-details', false);
        }
    }

    // User Interaction Methods
    async recordInteraction(contentId, interactionType, rating = null) {
        if (!this.authToken) return;

        try {
            await this.apiCall('/interactions', {
                method: 'POST',
                body: JSON.stringify({
                    content_id: contentId,
                    interaction_type: interactionType,
                    rating: rating
                })
            });
        } catch (error) {
            console.error('Failed to record interaction:', error);
        }
    }

    async loadWatchlist() {
        if (!this.authToken) return [];

        try {
            this.setLoadingState('watchlist', true);
            const response = await this.apiCall('/user/watchlist');
            return response.watchlist;
        } catch (error) {
            console.error('Failed to load watchlist:', error);
            return [];
        } finally {
            this.setLoadingState('watchlist', false);
        }
    }

    async loadFavorites() {
        if (!this.authToken) return [];

        try {
            this.setLoadingState('favorites', true);
            const response = await this.apiCall('/user/favorites');
            return response.favorites;
        } catch (error) {
            console.error('Failed to load favorites:', error);
            return [];
        } finally {
            this.setLoadingState('favorites', false);
        }
    }

    // UI Rendering Methods
    renderContentGrid(contents, containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { layout = 'grid', showEmpty = true } = options;

        if (contents.length === 0 && showEmpty) {
            container.innerHTML = this.renderEmptyState('No content found');
            return;
        }

        if (layout === 'grid') {
            container.innerHTML = contents.map(content => this.renderContentCard(content)).join('');
        } else if (layout === 'list') {
            container.innerHTML = contents.map(content => this.renderContentListItem(content)).join('');
        }

        // Setup lazy loading for images
        this.setupLazyLoading(container);
    }

    renderContentCard(content) {
        const poster = this.optimizeImageUrl(content.poster_path, 'w300');
        const rating = content.rating ? parseFloat(content.rating).toFixed(1) : 'N/A';
        const genres = content.genres ? content.genres.slice(0, 2).join(', ') : '';
        
        return `
            <div class="content-card" onclick="app.openContentDetails(${content.id})" data-content-id="${content.id}">
                <img 
                    class="content-card-image lazy-load" 
                    data-src="${poster}"
                    alt="${content.title}"
                    loading="lazy"
                />
                <div class="content-card-overlay">
                    <h3 class="content-card-title">${content.title}</h3>
                    <div class="content-card-info">
                        <span class="content-card-rating">⭐ ${rating}</span>
                        <span class="content-card-type">${content.content_type.toUpperCase()}</span>
                    </div>
                    ${genres ? `<div class="genre-tags">${genres.split(', ').map(genre => `<span class="genre-tag">${genre}</span>`).join('')}</div>` : ''}
                    <div class="action-buttons">
                        <button class="action-btn" onclick="event.stopPropagation(); app.toggleWatchlist(${content.id})" title="Add to Watchlist">
                            📚
                        </button>
                        <button class="action-btn" onclick="event.stopPropagation(); app.toggleFavorite(${content.id})" title="Add to Favorites">
                            ❤️
                        </button>
                        ${content.youtube_trailer ? `<button class="action-btn" onclick="event.stopPropagation(); app.playTrailer('${content.youtube_trailer}')" title="Play Trailer">▶️</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderContentListItem(content) {
        const poster = this.optimizeImageUrl(content.poster_path, 'w92');
        const rating = content.rating ? parseFloat(content.rating).toFixed(1) : 'N/A';
        
        return `
            <div class="content-list-item" onclick="app.openContentDetails(${content.id})">
                <img class="poster lazy-load" data-src="${poster}" alt="${content.title}" loading="lazy" />
                <div class="info">
                    <div class="title">${content.title}</div>
                    <div class="meta">
                        <span>⭐ ${rating}</span>
                        <span>${content.content_type.toUpperCase()}</span>
                        ${content.release_date ? `<span>${new Date(content.release_date).getFullYear()}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderEmptyState(message, actionButton = null) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🎬</div>
                <h3 class="empty-state-title">No Content Found</h3>
                <p class="empty-state-description">${message}</p>
                ${actionButton ? actionButton : ''}
            </div>
        `;
    }

    renderLoadingGrid(count = 12) {
        return Array(count).fill(0).map(() => `
            <div class="content-card skeleton">
                <div class="content-card-image skeleton"></div>
            </div>
        `).join('');
    }

    // Navigation and Routing
    navigate(path) {
        // Simple client-side routing
        const currentPath = window.location.pathname;
        
        if (currentPath !== path) {
            window.history.pushState(null, '', path);
            this.loadCurrentPage();
        }
    }

    loadCurrentPage() {
        const path = window.location.pathname;
        const page = this.getPageFromPath(path);
        
        // Update active navigation
        this.updateActiveNavigation(path);
        
        // Load page content based on path
        switch (page) {
            case 'home':
                this.loadHomePage();
                break;
            case 'login':
                this.loadLoginPage();
                break;
            case 'dashboard':
                this.loadDashboardPage();
                break;
            case 'details':
                this.loadDetailsPage();
                break;
            case 'trending':
                this.loadTrendingPage();
                break;
            case 'popular':
                this.loadPopularPage();
                break;
            case 'new-releases':
                this.loadNewReleasesPage();
                break;
            case 'critics-choice':
                this.loadCriticsChoicePage();
                break;
            case 'movies':
                this.loadMoviesPage();
                break;
            case 'tv-shows':
                this.loadTVShowsPage();
                break;
            case 'anime':
                this.loadAnimePage();
                break;
            case 'watchlist':
                this.loadWatchlistPage();
                break;
            case 'favorites':
                this.loadFavoritesPage();
                break;
            case 'profile':
                this.loadProfilePage();
                break;
            default:
                this.loadHomePage();
        }
    }

    getPageFromPath(path) {
        const pathSegments = path.split('/').filter(segment => segment !== '');
        
        if (pathSegments.length === 0) return 'home';
        if (pathSegments[0] === 'categories') return pathSegments[1] || 'trending';
        if (pathSegments[0] === 'languages') return pathSegments[1] || 'english';
        if (pathSegments[0] === 'user') return pathSegments[1] || 'dashboard';
        if (pathSegments[0] === 'admin') return 'admin-' + (pathSegments[1] || 'dashboard');
        
        return pathSegments[0];
    }

    // Page Loading Methods
    async loadHomePage() {
        if (!this.currentUser) {
            // Load anonymous recommendations
            this.loadAnonymousHomePage();
        } else {
            // Load personalized dashboard
            this.loadDashboardPage();
        }
    }

    async loadAnonymousHomePage() {
        const contentAreas = [
            { id: 'trending-content', loader: () => this.loadTrending(12) },
            { id: 'popular-content', loader: () => this.loadTrending(12, 'movie') },
            { id: 'new-releases-content', loader: () => this.loadNewReleases(12) },
            { id: 'critics-choice-content', loader: () => this.loadCriticsChoice(12) }
        ];

        // Load content in parallel
        contentAreas.forEach(async ({ id, loader }) => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = this.renderLoadingGrid(12);
                const content = await loader();
                this.renderContentGrid(content, id);
            }
        });
    }

    async loadDashboardPage() {
        if (!this.currentUser) {
            this.navigate('/login');
            return;
        }

        const contentAreas = [
            { id: 'recommended-content', loader: () => this.loadPersonalizedRecommendations() },
            { id: 'continue-watching-content', loader: () => this.loadWatchlist() },
            { id: 'trending-content', loader: () => this.loadTrending(8) },
            { id: 'new-releases-content', loader: () => this.loadNewReleases(8) }
        ];

        contentAreas.forEach(async ({ id, loader }) => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = this.renderLoadingGrid(8);
                const content = await loader();
                this.renderContentGrid(content, id);
            }
        });
    }

    // Utility Methods
    optimizeImageUrl(imagePath, size = 'w500') {
        if (!imagePath) return '/assets/images/placeholder-poster.jpg';
        if (imagePath.startsWith('http')) return imagePath;
        return `https://image.tmdb.org/t/p/${size}${imagePath}`;
    }

    setLoadingState(key, isLoading) {
        if (isLoading) {
            this.loadingStates.add(key);
        } else {
            this.loadingStates.delete(key);
        }
        
        // Update global loading indicator
        const hasLoading = this.loadingStates.size > 0;
        document.body.classList.toggle('loading', hasLoading);
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Trigger show animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto-remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Event Listeners
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (e.target.value.trim()) {
                        this.performSearch(e.target.value.trim());
                    }
                }, 300);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(e.target.value.trim());
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput && searchInput.value.trim()) {
                    this.performSearch(searchInput.value.trim());
                }
            });
        }

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.loadCurrentPage();
        });

        // Handle clicks on navigation links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-navigate]');
            if (link) {
                e.preventDefault();
                this.navigate(link.dataset.navigate);
            }
        });

        // Handle form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'login-form') {
                e.preventDefault();
                this.handleLoginForm(e.target);
            } else if (e.target.id === 'register-form') {
                e.preventDefault();
                this.handleRegisterForm(e.target);
            }
        });
    }

    setupIntersectionObserver() {
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-load');
                        this.intersectionObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });
    }

    setupLazyLoading(container) {
        const lazyImages = container.querySelectorAll('.lazy-load');
        lazyImages.forEach(img => {
            this.intersectionObserver.observe(img);
        });
    }

    setupNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            
            // Add scrolled class for styling
            navbar.classList.toggle('scrolled', scrollY > 50);
            
            // Hide/show navbar on scroll
            if (scrollY > lastScrollY && scrollY > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
            
            lastScrollY = scrollY;
        });
    }

    updateAuthUI() {
        const loginButton = document.getElementById('login-btn');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');

        if (this.currentUser) {
            if (loginButton) loginButton.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userName) userName.textContent = this.currentUser.username;
        } else {
            if (loginButton) loginButton.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    updateActiveNavigation(currentPath) {
        document.querySelectorAll('.navbar-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }

    // Initialize UI Components
    initializeTooltips() {
        // Add tooltip functionality if needed
    }

    initializeModals() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
            if (e.target.classList.contains('modal-close')) {
                this.closeModal(e.target.closest('.modal'));
            }
        });
    }

    initializeTabs() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.activateTab(e.target);
            }
        });
    }

    initializeDropdowns() {
        document.addEventListener('click', (e) => {
            const dropdown = e.target.closest('.dropdown');
            if (dropdown && e.target.classList.contains('dropdown-toggle')) {
                e.stopPropagation();
                this.toggleDropdown(dropdown);
            } else {
                // Close all dropdowns
                document.querySelectorAll('.dropdown.open').forEach(d => {
                    d.classList.remove('open');
                });
            }
        });
    }

    // Modal Methods
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // Tab Methods
    activateTab(tabBtn) {
        const tabContainer = tabBtn.closest('.tabs');
        if (!tabContainer) return;

        const targetTab = tabBtn.dataset.tab;
        
        // Update tab buttons
        tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        tabBtn.classList.add('active');

        // Update tab content
        tabContainer.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetContent = tabContainer.querySelector(`[data-tab-content="${targetTab}"]`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    // Dropdown Methods
    toggleDropdown(dropdown) {
        dropdown.classList.toggle('open');
    }

    // Content Interaction Methods
    async openContentDetails(contentId) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('id', contentId);
        
        const newUrl = `/details?${urlParams.toString()}`;
        this.navigate(newUrl);
    }

    async toggleWatchlist(contentId) {
        if (!this.authToken) {
            this.showToast('Please login to add to watchlist', 'warning');
            return;
        }

        try {
            await this.recordInteraction(contentId, 'watchlist');
            this.showToast('Added to watchlist', 'success');
        } catch (error) {
            this.showToast('Failed to update watchlist', 'error');
        }
    }

    async toggleFavorite(contentId) {
        if (!this.authToken) {
            this.showToast('Please login to add to favorites', 'warning');
            return;
        }

        try {
            await this.recordInteraction(contentId, 'favorite');
            this.showToast('Added to favorites', 'success');
        } catch (error) {
            this.showToast('Failed to update favorites', 'error');
        }
    }

    playTrailer(youtubeUrl) {
        // Extract video ID from YouTube URL
        const videoId = youtubeUrl.includes('watch?v=') 
            ? youtubeUrl.split('watch?v=')[1].split('&')[0]
            : youtubeUrl.split('/').pop();

        // Open YouTube in new tab/window
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    }

    // Form Handlers
    async handleLoginForm(form) {
        const formData = new FormData(form);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        const result = await this.login(credentials);
        if (result.success) {
            form.reset();
        }
    }

    async handleRegisterForm(form) {
        const formData = new FormData(form);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            preferred_languages: formData.getAll('languages'),
            preferred_genres: formData.getAll('genres')
        };

        const result = await this.register(userData);
        if (result.success) {
            form.reset();
        }
    }

    // Search Methods
    async performSearch(query) {
        if (!query.trim()) return;

        // Navigate to search results or update current page
        const currentPath = window.location.pathname;
        if (currentPath === '/search') {
            this.updateSearchResults(query);
        } else {
            this.navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    }

    async updateSearchResults(query) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = this.renderLoadingGrid(12);
        
        const results = await this.searchContent(query);
        this.renderContentGrid(results.results, 'search-results');
        
        // Update search stats
        const statsElement = document.getElementById('search-stats');
        if (statsElement) {
            statsElement.textContent = `Found ${results.total_results} results for "${query}"`;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MovieApp();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MovieApp;
}