// API Configuration
const API_BASE = 'https://backend-app-970m.onrender.com/api';

// Theme colors
const THEME = {
    primary: '#0f172a',
    secondary: '#6b21a8',
    accent: '#8b5cf6',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#cbd5e1'
};

class MoviePlatform {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.loadIncludes();
        this.setupIntersectionObserver();
    }

    // Authentication Management
    async checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (token) {
            this.authToken = token;
            try {
                const userData = this.decodeJWT(token);
                if (userData && userData.exp > Date.now() / 1000) {
                    this.currentUser = JSON.parse(localStorage.getItem('userData'));
                    this.updateUIForLoggedInUser();
                    return true;
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }
        this.logout();
        return false;
    }

    decodeJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            return null;
        }
    }

    async login(username, password) {
        this.showLoadingState('Signing in...');
        try {
            const response = await this.apiCall('/login', 'POST', { username, password });
            if (response.token) {
                this.authToken = response.token;
                this.currentUser = response.user;
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userData', JSON.stringify(response.user));
                this.updateUIForLoggedInUser();
                this.showNotification('Welcome back!', 'success');
                
                // Redirect to dashboard or requested page
                const returnUrl = sessionStorage.getItem('returnUrl') || '/dashboard';
                sessionStorage.removeItem('returnUrl');
                this.navigateTo(returnUrl);
                return true;
            }
        } catch (error) {
            this.showNotification(error.message || 'Login failed', 'error');
            return false;
        } finally {
            this.hideLoadingState();
        }
    }

    async register(userData) {
        this.showLoadingState('Creating account...');
        try {
            const response = await this.apiCall('/register', 'POST', userData);
            if (response.token) {
                this.authToken = response.token;
                this.currentUser = response.user;
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userData', JSON.stringify(response.user));
                this.updateUIForLoggedInUser();
                this.showNotification('Account created successfully!', 'success');
                this.navigateTo('/dashboard');
                return true;
            }
        } catch (error) {
            this.showNotification(error.message || 'Registration failed', 'error');
            return false;
        } finally {
            this.hideLoadingState();
        }
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        this.updateUIForLoggedOutUser();
        this.navigateTo('/');
    }

    // API Calls with proper error handling
    async apiCall(endpoint, method = 'GET', data = null, requireAuth = false) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
        };

        if (requireAuth && this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const config = {
            method,
            headers,
            ...(data && { body: JSON.stringify(data) })
        };

        try {
            const response = await fetch(url, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error(`API call failed: ${method} ${endpoint}`, error);
            throw error;
        }
    }

    // Content Discovery
    async searchContent(query, type = 'multi', page = 1) {
        if (!query.trim()) return { results: [] };
        
        this.showLoadingState('Searching...');
        try {
            const params = new URLSearchParams({ query, type, page });
            return await this.apiCall(`/search?${params}`);
        } catch (error) {
            this.showNotification('Search failed', 'error');
            return { results: [] };
        } finally {
            this.hideLoadingState();
        }
    }

    async getContentDetails(contentId) {
        this.showLoadingState('Loading details...');
        try {
            return await this.apiCall(`/content/${contentId}`);
        } catch (error) {
            this.showNotification('Failed to load content details', 'error');
            throw error;
        } finally {
            this.hideLoadingState();
        }
    }

    // Recommendations
    async getTrendingContent(type = 'all', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return await this.apiCall(`/recommendations/trending?${params}`);
    }

    async getNewReleases(language = null, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        if (language) params.append('language', language);
        return await this.apiCall(`/recommendations/new-releases?${params}`);
    }

    async getCriticsChoice(type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return await this.apiCall(`/recommendations/critics-choice?${params}`);
    }

    async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return await this.apiCall(`/recommendations/genre/${genre}?${params}`);
    }

    async getRegionalContent(language, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return await this.apiCall(`/recommendations/regional/${language}?${params}`);
    }

    async getAnimeRecommendations(genre = null, limit = 20) {
        const params = new URLSearchParams({ limit });
        if (genre) params.append('genre', genre);
        return await this.apiCall(`/recommendations/anime?${params}`);
    }

    async getPersonalizedRecommendations(limit = 20) {
        if (!this.authToken) return { recommendations: [] };
        const params = new URLSearchParams({ limit });
        return await this.apiCall(`/recommendations/personalized?${params}`, 'GET', null, true);
    }

    // User Interactions
    async recordInteraction(contentId, interactionType, rating = null) {
        if (!this.authToken) return;
        
        try {
            await this.apiCall('/interactions', 'POST', {
                content_id: contentId,
                interaction_type: interactionType,
                rating
            }, true);
        } catch (error) {
            console.error('Failed to record interaction:', error);
        }
    }

    async getWatchlist() {
        if (!this.authToken) return { watchlist: [] };
        return await this.apiCall('/user/watchlist', 'GET', null, true);
    }

    async getFavorites() {
        if (!this.authToken) return { favorites: [] };
        return await this.apiCall('/user/favorites', 'GET', null, true);
    }

    // UI Management
    updateUIForLoggedInUser() {
        document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'none');
        
        const userElements = document.querySelectorAll('[data-user-name]');
        userElements.forEach(el => {
            el.textContent = this.currentUser?.username || 'User';
        });

        // Update navigation
        this.updateNavigation();
    }

    updateUIForLoggedOutUser() {
        document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'block');
        this.updateNavigation();
    }

    updateNavigation() {
        const navContainer = document.querySelector('#navigation-container');
        if (navContainer) {
            navContainer.innerHTML = this.currentUser ? this.getLoggedInNavigation() : this.getGuestNavigation();
            this.setupMobileMenu();
        }
    }

    getLoggedInNavigation() {
        const isAdmin = this.currentUser?.is_admin;
        return `
            <nav class="navbar">
                <div class="nav-brand">
                    <a href="/" class="brand-link">
                        <h1 class="brand-title">CineScope</h1>
                    </a>
                </div>
                
                <div class="nav-menu" id="nav-menu">
                    <a href="/dashboard" class="nav-link">Dashboard</a>
                    <div class="nav-dropdown">
                        <span class="nav-link dropdown-trigger">Categories</span>
                        <div class="dropdown-content">
                            <a href="/categories/trending">Trending</a>
                            <a href="/categories/popular">Popular</a>
                            <a href="/categories/new-releases">New Releases</a>
                            <a href="/categories/critic-choices">Critics' Choice</a>
                            <a href="/categories/movies">Movies</a>
                            <a href="/categories/tv-shows">TV Shows</a>
                            <a href="/categories/anime">Anime</a>
                        </div>
                    </div>
                    <div class="nav-dropdown">
                        <span class="nav-link dropdown-trigger">Languages</span>
                        <div class="dropdown-content">
                            <a href="/languages/english">English</a>
                            <a href="/languages/hindi">Hindi</a>
                            <a href="/languages/telugu">Telugu</a>
                            <a href="/languages/tamil">Tamil</a>
                            <a href="/languages/kannada">Kannada</a>
                            <a href="/languages/malayalam">Malayalam</a>
                        </div>
                    </div>
                    <a href="/user/watchlist" class="nav-link">Watchlist</a>
                    <a href="/user/favorites" class="nav-link">Favorites</a>
                    ${isAdmin ? '<a href="/admin/dashboard" class="nav-link admin-link">Admin</a>' : ''}
                </div>

                <div class="nav-actions">
                    <div class="search-container">
                        <input type="text" class="search-input" placeholder="Search movies, shows, anime..." id="global-search">
                        <button class="search-btn" onclick="app.performGlobalSearch()">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    
                    <div class="user-menu">
                        <button class="user-avatar" onclick="app.toggleUserMenu()">
                            <span>${this.currentUser?.username?.[0]?.toUpperCase() || 'U'}</span>
                        </button>
                        <div class="user-dropdown" id="user-dropdown">
                            <a href="/profile">Profile</a>
                            <button onclick="app.logout()">Logout</button>
                        </div>
                    </div>
                </div>

                <button class="mobile-menu-toggle" onclick="app.toggleMobileMenu()">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>
        `;
    }

    getGuestNavigation() {
        return `
            <nav class="navbar">
                <div class="nav-brand">
                    <a href="/" class="brand-link">
                        <h1 class="brand-title">CineScope</h1>
                    </a>
                </div>
                
                <div class="nav-menu" id="nav-menu">
                    <a href="/" class="nav-link">Home</a>
                    <div class="nav-dropdown">
                        <span class="nav-link dropdown-trigger">Browse</span>
                        <div class="dropdown-content">
                            <a href="/categories/trending">Trending</a>
                            <a href="/categories/popular">Popular</a>
                            <a href="/categories/movies">Movies</a>
                            <a href="/categories/tv-shows">TV Shows</a>
                            <a href="/categories/anime">Anime</a>
                        </div>
                    </div>
                    <div class="nav-dropdown">
                        <span class="nav-link dropdown-trigger">Languages</span>
                        <div class="dropdown-content">
                            <a href="/languages/english">English</a>
                            <a href="/languages/hindi">Hindi</a>
                            <a href="/languages/telugu">Telugu</a>
                            <a href="/languages/tamil">Tamil</a>
                            <a href="/languages/kannada">Kannada</a>
                            <a href="/languages/malayalam">Malayalam</a>
                        </div>
                    </div>
                </div>

                <div class="nav-actions">
                    <div class="search-container">
                        <input type="text" class="search-input" placeholder="Search movies, shows, anime..." id="global-search">
                        <button class="search-btn" onclick="app.performGlobalSearch()">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    
                    <div class="auth-buttons">
                        <a href="/login" class="btn btn-outline">Sign In</a>
                    </div>
                </div>

                <button class="mobile-menu-toggle" onclick="app.toggleMobileMenu()">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>
        `;
    }

    // Navigation & Routing
    navigateTo(path) {
        if (typeof path === 'string') {
            window.location.href = path;
        }
    }

    requireAuth() {
        if (!this.authToken) {
            sessionStorage.setItem('returnUrl', window.location.pathname);
            this.navigateTo('/login');
            return false;
        }
        return true;
    }

    performGlobalSearch() {
        const searchInput = document.getElementById('global-search');
        const query = searchInput?.value?.trim();
        if (query) {
            const params = new URLSearchParams({ q: query });
            this.navigateTo(`/search?${params}`);
        }
    }

    // UI Utilities
    showLoadingState(message = 'Loading...') {
        this.isLoading = true;
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.querySelector('.loader-text').textContent = message;
            loader.classList.add('active');
        }
    }

    hideLoadingState() {
        this.isLoading = false;
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.classList.remove('active');
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        const container = document.getElementById('notification-container') || document.body;
        container.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // Content Rendering
    renderContentGrid(items, container, options = {}) {
        if (!container) return;

        const {
            showTrailer = true,
            showRating = true,
            showGenres = true,
            onContentClick = null
        } = options;

        container.innerHTML = items.map(item => `
            <div class="content-card" onclick="${onContentClick ? `${onContentClick}(${item.id})` : `app.navigateToContent(${item.id})`}">
                <div class="content-poster">
                    <img src="${item.poster_path || '/assets/images/placeholder.jpg'}" 
                         alt="${item.title}" 
                         class="poster-image"
                         loading="lazy"
                         onerror="this.src='/assets/images/placeholder.jpg'">
                    <div class="content-overlay">
                        <div class="content-actions">
                            ${showTrailer && item.youtube_trailer ? `
                                <button class="action-btn trailer-btn" onclick="event.stopPropagation(); app.playTrailer('${item.youtube_trailer}')">
                                    <i class="fas fa-play"></i>
                                </button>
                            ` : ''}
                            <button class="action-btn favorite-btn" onclick="event.stopPropagation(); app.toggleFavorite(${item.id})">
                                <i class="fas fa-heart"></i>
                            </button>
                            <button class="action-btn watchlist-btn" onclick="event.stopPropagation(); app.toggleWatchlist(${item.id})">
                                <i class="fas fa-bookmark"></i>
                            </button>
                        </div>
                        ${showRating && item.rating ? `
                            <div class="content-rating">
                                <i class="fas fa-star"></i>
                                <span>${item.rating.toFixed(1)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="content-info">
                    <h3 class="content-title">${item.title}</h3>
                    <p class="content-type">${item.content_type.toUpperCase()}</p>
                    ${showGenres && item.genres?.length ? `
                        <div class="content-genres">
                            ${item.genres.slice(0, 2).map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        this.setupLazyLoading();
    }

    navigateToContent(contentId) {
        this.navigateTo(`/details?id=${contentId}`);
    }

    // Media Player
    playTrailer(youtubeUrl) {
        const videoId = this.extractYouTubeId(youtubeUrl);
        if (videoId) {
            this.showVideoModal(videoId);
        }
    }

    extractYouTubeId(url) {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    showVideoModal(videoId) {
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modal.innerHTML = `
            <div class="video-modal-content">
                <button class="video-modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
                <div class="video-container">
                    <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                            frameborder="0" 
                            allowfullscreen
                            allow="autoplay; encrypted-media">
                    </iframe>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // User Actions
    async toggleFavorite(contentId) {
        if (!this.requireAuth()) return;
        
        try {
            await this.recordInteraction(contentId, 'favorite');
            this.showNotification('Added to favorites', 'success');
        } catch (error) {
            this.showNotification('Failed to add to favorites', 'error');
        }
    }

    async toggleWatchlist(contentId) {
        if (!this.requireAuth()) return;
        
        try {
            await this.recordInteraction(contentId, 'watchlist');
            this.showNotification('Added to watchlist', 'success');
        } catch (error) {
            this.showNotification('Failed to add to watchlist', 'error');
        }
    }

    // Lazy Loading & Performance
    setupLazyLoading() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            if (this.observer) {
                this.observer.observe(img);
            }
        });
    }

    setupIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        this.observer.unobserve(img);
                    }
                }
            });
        }, { threshold: 0.1 });
    }

    // Include Management
    async loadIncludes() {
        const includeElements = document.querySelectorAll('[data-include]');
        
        for (const element of includeElements) {
            const includePath = element.getAttribute('data-include');
            try {
                const response = await fetch(`/includes/${includePath}.html`);
                if (response.ok) {
                    const content = await response.text();
                    element.innerHTML = content;
                    
                    // Re-run initialization for included content
                    if (includePath === 'header') {
                        this.updateNavigation();
                    }
                }
            } catch (error) {
                console.error(`Failed to load include: ${includePath}`, error);
            }
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        document.getElementById('global-search')?.focus();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                // Close modals
                document.querySelectorAll('.video-modal, .user-dropdown.active').forEach(el => {
                    el.classList.remove('active');
                    if (el.classList.contains('video-modal')) {
                        el.remove();
                    }
                });
            }
        });

        // Handle form submissions
        document.addEventListener('submit', async (e) => {
            const form = e.target;
            if (form.matches('.auth-form')) {
                e.preventDefault();
                await this.handleAuthForm(form);
            }
        });

        // Handle link navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="/"]');
            if (link && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.navigateTo(link.href);
            }
        });
    }

    // Mobile Menu
    toggleMobileMenu() {
        const navMenu = document.getElementById('nav-menu');
        navMenu?.classList.toggle('active');
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        dropdown?.classList.toggle('active');
    }

    setupMobileMenu() {
        // Setup dropdown toggles for mobile
        document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const dropdown = trigger.parentElement;
                dropdown.classList.toggle('active');
            });
        });
    }

    // Initialize skeleton loaders
    showSkeletonLoader(container, count = 6) {
        if (!container) return;
        
        container.innerHTML = Array(count).fill(0).map(() => `
            <div class="content-card skeleton">
                <div class="skeleton-poster"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-type"></div>
                    <div class="skeleton-genres">
                        <div class="skeleton-genre"></div>
                        <div class="skeleton-genre"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Initialize the app
const app = new MoviePlatform();

// Make app globally available
window.app = app;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoviePlatform;
}