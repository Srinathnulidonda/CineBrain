// Enhanced Movie Platform Frontend
class MoviePlatform {
    constructor() {
        this.API_BASE = 'https://backend-app-970m.onrender.com/api';
        this.currentUser = null;
        this.authToken = null;
        this.isLoading = false;
        this.cache = new Map();
        this.intersectionObserver = null;
        
        this.init();
    }

    // Initialize the application
    async init() {
        this.setupEventListeners();
        this.initializeIntersectionObserver();
        this.setupServiceWorker();
        await this.checkAuthStatus();
        this.handleRouting();
        this.loadPageContent();
    }

    // Authentication Methods
    async checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                // Verify token validity by making a test request
                const response = await this.apiCall('/user/profile', 'GET', null, token);
                if (response.success) {
                    this.authToken = token;
                    this.currentUser = response.data;
                    this.updateUIForAuthenticatedUser();
                }
            } catch (error) {
                console.log('Token expired or invalid, clearing...');
                localStorage.removeItem('authToken');
            }
        }
    }

    async login(credentials) {
        try {
            this.showLoading('Signing in...');
            const response = await this.apiCall('/login', 'POST', credentials);
            
            if (response.token) {
                this.authToken = response.token;
                this.currentUser = response.user;
                localStorage.setItem('authToken', response.token);
                
                this.showAlert('Login successful!', 'success');
                
                // Redirect based on user role
                if (response.user.is_admin) {
                    window.location.href = '/admin/dashboard';
                } else {
                    window.location.href = '/dashboard';
                }
                
                return { success: true, user: response.user };
            }
        } catch (error) {
            this.showAlert(error.message || 'Login failed', 'error');
            return { success: false, error: error.message };
        } finally {
            this.hideLoading();
        }
    }

    async register(userData) {
        try {
            this.showLoading('Creating account...');
            const response = await this.apiCall('/register', 'POST', userData);
            
            if (response.token) {
                this.authToken = response.token;
                this.currentUser = response.user;
                localStorage.setItem('authToken', response.token);
                
                this.showAlert('Account created successfully!', 'success');
                window.location.href = '/dashboard';
                
                return { success: true, user: response.user };
            }
        } catch (error) {
            this.showAlert(error.message || 'Registration failed', 'error');
            return { success: false, error: error.message };
        } finally {
            this.hideLoading();
        }
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        this.cache.clear();
        window.location.href = '/';
    }

    // API Call Method with Enhanced Error Handling
    async apiCall(endpoint, method = 'GET', data = null, token = null) {
        const url = `${this.API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
        };

        if (token || this.authToken) {
            headers['Authorization'] = `Bearer ${token || this.authToken}`;
        }

        const config = {
            method,
            headers,
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.message || 'Request failed');
            }

            return result;
        } catch (error) {
            console.error('API Call Error:', error);
            
            if (error.message.includes('401') || error.message.includes('token')) {
                this.logout();
            }
            
            throw error;
        }
    }

    // Content Loading Methods
    async loadContent(type, params = {}) {
        const cacheKey = `${type}_${JSON.stringify(params)}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes
                return cached.data;
            }
        }

        try {
            let endpoint;
            switch (type) {
                case 'trending':
                    endpoint = `/recommendations/trending?${new URLSearchParams(params)}`;
                    break;
                case 'popular':
                    endpoint = `/recommendations/trending?type=movie&${new URLSearchParams(params)}`;
                    break;
                case 'new-releases':
                    endpoint = `/recommendations/new-releases?${new URLSearchParams(params)}`;
                    break;
                case 'critics-choice':
                    endpoint = `/recommendations/critics-choice?${new URLSearchParams(params)}`;
                    break;
                case 'movies':
                    endpoint = `/recommendations/genre/action?type=movie&${new URLSearchParams(params)}`;
                    break;
                case 'tv-shows':
                    endpoint = `/recommendations/trending?type=tv&${new URLSearchParams(params)}`;
                    break;
                case 'anime':
                    endpoint = `/recommendations/anime?${new URLSearchParams(params)}`;
                    break;
                case 'regional':
                    endpoint = `/recommendations/regional/${params.language}?${new URLSearchParams(params)}`;
                    break;
                case 'genre':
                    endpoint = `/recommendations/genre/${params.genre}?${new URLSearchParams(params)}`;
                    break;
                case 'search':
                    endpoint = `/search?${new URLSearchParams(params)}`;
                    break;
                case 'details':
                    endpoint = `/content/${params.id}`;
                    break;
                case 'similar':
                    endpoint = `/recommendations/similar/${params.id}`;
                    break;
                case 'anonymous':
                    endpoint = `/recommendations/anonymous?${new URLSearchParams(params)}`;
                    break;
                case 'personalized':
                    endpoint = `/recommendations/personalized?${new URLSearchParams(params)}`;
                    break;
                case 'watchlist':
                    endpoint = `/user/watchlist`;
                    break;
                case 'favorites':
                    endpoint = `/user/favorites`;
                    break;
                default:
                    throw new Error('Invalid content type');
            }

            const response = await this.apiCall(endpoint);
            const data = response.recommendations || response.results || response;

            // Cache the result
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Load content error:', error);
            return [];
        }
    }

    // Content Detail Loading
    async loadContentDetails(contentId) {
        try {
            const response = await this.apiCall(`/content/${contentId}`);
            return response;
        } catch (error) {
            console.error('Load content details error:', error);
            return null;
        }
    }

    // Search Methods
    async searchContent(query, type = 'multi', page = 1) {
        if (!query.trim()) return [];

        try {
            const params = { query: query.trim(), type, page };
            const response = await this.apiCall(`/search?${new URLSearchParams(params)}`);
            return response.results || [];
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    // User Interaction Methods
    async addToWatchlist(contentId) {
        if (!this.authToken) {
            this.showAlert('Please login to add to watchlist', 'warning');
            return false;
        }

        try {
            await this.apiCall('/interactions', 'POST', {
                content_id: contentId,
                interaction_type: 'watchlist'
            });
            this.showAlert('Added to watchlist!', 'success');
            return true;
        } catch (error) {
            this.showAlert('Failed to add to watchlist', 'error');
            return false;
        }
    }

    async addToFavorites(contentId) {
        if (!this.authToken) {
            this.showAlert('Please login to add to favorites', 'warning');
            return false;
        }

        try {
            await this.apiCall('/interactions', 'POST', {
                content_id: contentId,
                interaction_type: 'favorite'
            });
            this.showAlert('Added to favorites!', 'success');
            return true;
        } catch (error) {
            this.showAlert('Failed to add to favorites', 'error');
            return false;
        }
    }

    async rateContent(contentId, rating) {
        if (!this.authToken) {
            this.showAlert('Please login to rate content', 'warning');
            return false;
        }

        try {
            await this.apiCall('/interactions', 'POST', {
                content_id: contentId,
                interaction_type: 'rating',
                rating: rating
            });
            this.showAlert('Rating saved!', 'success');
            return true;
        } catch (error) {
            this.showAlert('Failed to save rating', 'error');
            return false;
        }
    }

    // UI Rendering Methods
    renderContentGrid(contents, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!contents || contents.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No content found</p>';
            return;
        }

        container.innerHTML = contents.map(content => this.createContentCard(content)).join('');
        
        // Setup lazy loading for images
        this.setupLazyLoading(container);
        
        // Add click handlers
        container.querySelectorAll('.content-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                window.location.href = `/details?id=${contents[index].id}`;
            });
        });
    }

    renderContentCarousel(contents, containerId, title = '') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            ${title ? `<div class="section-header">
                <h2 class="section-title">${title}</h2>
            </div>` : ''}
            <div class="scroll-container">
                ${contents.map(content => `
                    <div class="scroll-item">
                        ${this.createContentCard(content)}
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = html;
        
        // Setup lazy loading and click handlers
        this.setupLazyLoading(container);
        container.querySelectorAll('.content-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                window.location.href = `/details?id=${contents[index].id}`;
            });
        });
    }

    createContentCard(content) {
        const posterUrl = this.getOptimizedImageUrl(content.poster_path, 'w300');
        const rating = content.rating ? parseFloat(content.rating).toFixed(1) : 'N/A';
        const genres = Array.isArray(content.genres) ? content.genres.slice(0, 2) : [];
        const releaseYear = content.release_date ? new Date(content.release_date).getFullYear() : '';

        return `
            <div class="content-card" data-content-id="${content.id}">
                <img 
                    class="content-poster lazy-image" 
                    data-src="${posterUrl}"
                    alt="${content.title}"
                    loading="lazy"
                />
                <div class="content-info">
                    <h3 class="content-title">${content.title}</h3>
                    <div class="content-meta">
                        <span class="content-type">${content.content_type}</span>
                        <div class="content-rating">
                            <span>⭐</span>
                            <span>${rating}</span>
                        </div>
                        ${releaseYear ? `<span>${releaseYear}</span>` : ''}
                    </div>
                    ${genres.length > 0 ? `
                        <div class="content-genres">
                            ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Content Details Page
    renderContentDetails(content, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !content) return;

        const posterUrl = this.getOptimizedImageUrl(content.poster_path, 'w500');
        const backdropUrl = this.getOptimizedImageUrl(content.backdrop_path, 'w1280');
        const rating = content.rating ? parseFloat(content.rating).toFixed(1) : 'N/A';
        const genres = Array.isArray(content.genres) ? content.genres : [];
        const languages = Array.isArray(content.languages) ? content.languages : [];
        const cast = Array.isArray(content.cast) ? content.cast.slice(0, 6) : [];

        container.innerHTML = `
            <div class="content-details">
                ${backdropUrl ? `
                    <div class="content-backdrop" style="background-image: url('${backdropUrl}')">
                        <div class="backdrop-overlay"></div>
                    </div>
                ` : ''}
                
                <div class="content-details-body">
                    <div class="content-details-main">
                        <div class="content-poster-large">
                            <img src="${posterUrl}" alt="${content.title}" class="poster-image" />
                        </div>
                        
                        <div class="content-details-info">
                            <h1 class="content-details-title">${content.title}</h1>
                            
                            ${content.original_title && content.original_title !== content.title ? `
                                <p class="original-title">${content.original_title}</p>
                            ` : ''}
                            
                            <div class="content-details-meta">
                                <span class="content-type">${content.content_type.toUpperCase()}</span>
                                <div class="rating">⭐ ${rating}</div>
                                ${content.release_date ? `<span>${new Date(content.release_date).getFullYear()}</span>` : ''}
                                ${content.runtime ? `<span>${content.runtime} min</span>` : ''}
                            </div>
                            
                            ${genres.length > 0 ? `
                                <div class="genres">
                                    ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                                </div>
                            ` : ''}
                            
                            ${content.overview ? `
                                <div class="overview">
                                    <h3>Overview</h3>
                                    <p>${content.overview}</p>
                                </div>
                            ` : ''}
                            
                            <div class="content-actions">
                                <button class="btn btn-primary" onclick="app.addToWatchlist(${content.id})">
                                    Add to Watchlist
                                </button>
                                <button class="btn btn-secondary" onclick="app.addToFavorites(${content.id})">
                                    Add to Favorites
                                </button>
                                ${content.youtube_trailer ? `
                                    <a href="${content.youtube_trailer}" target="_blank" class="btn btn-outline">
                                        Watch Trailer
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    ${cast.length > 0 ? `
                        <div class="cast-section">
                            <h3>Cast</h3>
                            <div class="cast-grid">
                                ${cast.map(member => `
                                    <div class="cast-member">
                                        <div class="cast-photo">
                                            ${member.profile_path ? `
                                                <img src="https://image.tmdb.org/t/p/w185${member.profile_path}" alt="${member.name}" />
                                            ` : `
                                                <div class="cast-placeholder">${member.name.charAt(0)}</div>
                                            `}
                                        </div>
                                        <div class="cast-info">
                                            <p class="cast-name">${member.name}</p>
                                            <p class="cast-character">${member.character}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Load similar content
        this.loadSimilarContent(content.id);
    }

    async loadSimilarContent(contentId) {
        try {
            const similarContent = await this.loadContent('similar', { id: contentId });
            if (similarContent && similarContent.length > 0) {
                this.renderContentCarousel(similarContent, 'similar-content', 'Similar Content');
            }
        } catch (error) {
            console.error('Error loading similar content:', error);
        }
    }

    // Utility Methods
    getOptimizedImageUrl(imagePath, size = 'w300') {
        if (!imagePath) return '/assets/images/placeholder.jpg';
        if (imagePath.startsWith('http')) return imagePath;
        return `https://image.tmdb.org/t/p/${size}${imagePath}`;
    }

    setupLazyLoading(container) {
        const images = container.querySelectorAll('.lazy-image');
        
        if (this.intersectionObserver) {
            images.forEach(img => this.intersectionObserver.observe(img));
        } else {
            // Fallback for browsers without intersection observer
            images.forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy-image');
            });
        }
    }

    initializeIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-image');
                        this.intersectionObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px'
            });
        }
    }

    // UI Helper Methods
    showLoading(message = 'Loading...') {
        this.isLoading = true;
        const existingLoader = document.getElementById('global-loader');
        if (existingLoader) return;

        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loader.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 flex items-center gap-3">
                <div class="spinner"></div>
                <span class="text-white">${message}</span>
            </div>
        `;
        document.body.appendChild(loader);
    }

    hideLoading() {
        this.isLoading = false;
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.remove();
        }
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container') || this.createAlertContainer();
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-auto text-lg">&times;</button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    createAlertContainer() {
        const container = document.createElement('div');
        container.id = 'alert-container';
        container.className = 'fixed top-20 right-4 space-y-2 z-40';
        document.body.appendChild(container);
        return container;
    }

    // Page-specific content loading
    async loadPageContent() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);

        try {
            switch (path) {
                case '/':
                case '/index.html':
                    await this.loadHomePage();
                    break;
                    
                case '/dashboard':
                case '/dashboard.html':
                    await this.loadDashboard();
                    break;
                    
                case '/details':
                case '/details.html':
                    const contentId = params.get('id');
                    if (contentId) {
                        await this.loadDetailsPage(contentId);
                    }
                    break;
                    
                case '/categories/trending':
                case '/categories/trending.html':
                    await this.loadCategoryPage('trending');
                    break;
                    
                case '/categories/popular':
                case '/categories/popular.html':
                    await this.loadCategoryPage('popular');
                    break;
                    
                case '/categories/new-releases':
                case '/categories/new-releases.html':
                    await this.loadCategoryPage('new-releases');
                    break;
                    
                case '/categories/critics-choice':
                case '/categories/critics-choice.html':
                    await this.loadCategoryPage('critics-choice');
                    break;
                    
                case '/categories/movies':
                case '/categories/movies.html':
                    await this.loadCategoryPage('movies');
                    break;
                    
                case '/categories/tv-shows':
                case '/categories/tv-shows.html':
                    await this.loadCategoryPage('tv-shows');
                    break;
                    
                case '/categories/anime':
                case '/categories/anime.html':
                    await this.loadCategoryPage('anime');
                    break;
                    
                default:
                    // Handle language and user pages
                    if (path.startsWith('/languages/')) {
                        const language = path.split('/').pop().replace('.html', '');
                        await this.loadLanguagePage(language);
                    } else if (path.startsWith('/user/')) {
                        const userPage = path.split('/').pop().replace('.html', '');
                        await this.loadUserPage(userPage);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error loading page content:', error);
            this.showAlert('Failed to load content', 'error');
        }
    }

    async loadHomePage() {
        // Load different content based on auth status
        if (this.authToken) {
            // Load personalized content for logged-in users
            const personalizedContent = await this.loadContent('personalized', { limit: 20 });
            this.renderContentCarousel(personalizedContent, 'personalized-recommendations', 'Recommended for You');
        } else {
            // Load anonymous recommendations
            const anonymousContent = await this.loadContent('anonymous', { limit: 20 });
            this.renderContentCarousel(anonymousContent, 'hero-recommendations', 'Popular Right Now');
        }

        // Load common sections
        const trending = await this.loadContent('trending', { limit: 20 });
        this.renderContentCarousel(trending, 'trending-content', 'Trending Now');

        const newReleases = await this.loadContent('new-releases', { limit: 20 });
        this.renderContentCarousel(newReleases, 'new-releases', 'New Releases');

        const criticsChoice = await this.loadContent('critics-choice', { limit: 20 });
        this.renderContentCarousel(criticsChoice, 'critics-choice', 'Critics\' Choice');

        const anime = await this.loadContent('anime', { limit: 20 });
        this.renderContentCarousel(anime, 'anime-content', 'Popular Anime');
    }

    async loadDashboard() {
        if (!this.authToken) {
            window.location.href = '/login';
            return;
        }

        // Load personalized recommendations
        const personalized = await this.loadContent('personalized', { limit: 20 });
        this.renderContentCarousel(personalized, 'personalized-recommendations', 'Recommended for You');

        // Load watchlist
        const watchlist = await this.loadContent('watchlist');
        this.renderContentCarousel(watchlist, 'continue-watching', 'Continue Watching');

        // Load recent activity based recommendations
        const trending = await this.loadContent('trending', { limit: 15 });
        this.renderContentCarousel(trending, 'trending-now', 'Trending Now');

        // Load genre-based recommendations
        const actionMovies = await this.loadContent('genre', { genre: 'action', type: 'movie', limit: 15 });
        this.renderContentCarousel(actionMovies, 'action-movies', 'Action Movies');
    }

    async loadDetailsPage(contentId) {
        const content = await this.loadContentDetails(contentId);
        if (content) {
            this.renderContentDetails(content, 'content-details');
            
            // Update page title
            document.title = `${content.title} | CineScope`;
            
            // Record view interaction
            if (this.authToken) {
                try {
                    await this.apiCall('/interactions', 'POST', {
                        content_id: contentId,
                        interaction_type: 'view'
                    });
                } catch (error) {
                    console.error('Failed to record view interaction:', error);
                }
            }
        } else {
            this.showAlert('Content not found', 'error');
        }
    }

    async loadCategoryPage(category) {
        const content = await this.loadContent(category, { limit: 40 });
        this.renderContentGrid(content, 'category-content');

        // Update page title
        const titles = {
            'trending': 'Trending',
            'popular': 'Popular',
            'new-releases': 'New Releases',
            'critics-choice': 'Critics\' Choice',
            'movies': 'Movies',
            'tv-shows': 'TV Shows',
            'anime': 'Anime'
        };
        document.title = `${titles[category] || category} | CineScope`;
    }

    async loadLanguagePage(language) {
        const content = await this.loadContent('regional', { language, limit: 40 });
        this.renderContentGrid(content, 'language-content');
        
        // Update page title
        document.title = `${language.charAt(0).toUpperCase() + language.slice(1)} Content | CineScope`;
    }

    async loadUserPage(page) {
        if (!this.authToken) {
            window.location.href = '/login';
            return;
        }

        const content = await this.loadContent(page);
        this.renderContentGrid(content, 'user-content');
        
        // Update page title
        const titles = {
            'watchlist': 'My Watchlist',
            'favorites': 'My Favorites'
        };
        document.title = `${titles[page] || page} | CineScope`;
    }

    // Search functionality
    setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        if (!searchInput || !searchResults) return;

        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(searchTimeout);
            
            if (query.length < 2) {
                searchResults.innerHTML = '';
                searchResults.classList.add('hidden');
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                try {
                    const results = await this.searchContent(query);
                    this.renderSearchResults(results, searchResults);
                    searchResults.classList.remove('hidden');
                } catch (error) {
                    console.error('Search error:', error);
                }
            }, 300);
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.add('hidden');
            }
        });
    }

    renderSearchResults(results, container) {
        if (!results || results.length === 0) {
            container.innerHTML = '<p class="p-4 text-center text-muted">No results found</p>';
            return;
        }

        container.innerHTML = results.slice(0, 8).map(content => `
            <div class="search-result-item" onclick="window.location.href='/details?id=${content.id}'">
                <img 
                    src="${this.getOptimizedImageUrl(content.poster_path, 'w92')}" 
                    alt="${content.title}"
                    class="search-result-poster"
                />
                <div class="search-result-info">
                    <h4 class="search-result-title">${content.title}</h4>
                    <p class="search-result-meta">
                        ${content.content_type} • ${content.release_date ? new Date(content.release_date).getFullYear() : 'N/A'}
                    </p>
                </div>
            </div>
        `).join('');
    }

    // Event Listeners
    setupEventListeners() {
        // Mobile navigation toggle
        const mobileToggle = document.getElementById('mobile-nav-toggle');
        const navLinks = document.getElementById('nav-links');
        
        if (mobileToggle && navLinks) {
            mobileToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (header) {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            }
        });

        // Setup search
        this.setupSearch();

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(loginForm);
                const credentials = {
                    username: formData.get('username'),
                    password: formData.get('password')
                };
                await this.login(credentials);
            });
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(registerForm);
                const userData = {
                    username: formData.get('username'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    preferred_languages: Array.from(formData.getAll('languages')),
                    preferred_genres: Array.from(formData.getAll('genres'))
                };
                await this.register(userData);
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    updateUIForAuthenticatedUser() {
        // Update navigation
        const authLinks = document.querySelectorAll('.auth-required');
        const guestLinks = document.querySelectorAll('.guest-only');
        
        authLinks.forEach(link => link.classList.remove('hidden'));
        guestLinks.forEach(link => link.classList.add('hidden'));

        // Update user info
        const userInfo = document.getElementById('user-info');
        if (userInfo && this.currentUser) {
            userInfo.innerHTML = `
                <div class="user-menu">
                    <span class="user-name">${this.currentUser.username}</span>
                    <div class="user-avatar">${this.currentUser.username.charAt(0).toUpperCase()}</div>
                </div>
            `;
        }
    }

    handleRouting() {
        // Simple client-side routing for SPAs
        window.addEventListener('popstate', () => {
            this.loadPageContent();
        });
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registered'))
                .catch(error => console.log('SW registration failed'));
        }
    }
}

// Initialize the application
const app = new MoviePlatform();

// Export for global access
window.app = app;
