// Main JavaScript - CineScope Frontend
// Modern ES6+ Implementation with JWT Authentication

// Configuration
const CONFIG = {
    API_BASE: 'https://backend-app-970m.onrender.com/api',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p/',
    YOUTUBE_BASE: 'https://www.youtube.com/watch?v=',
    STORAGE_KEY: 'cinescope_user',
    TOKEN_KEY: 'cinescope_token'
};

// Global State Management
class AppState {
    constructor() {
        this.user = null;
        this.token = null;
        this.isLoading = false;
        this.searchCache = new Map();
        this.recommendations = new Map();
        this.init();
    }

    init() {
        this.loadStoredAuth();
        this.setupEventListeners();
    }

    loadStoredAuth() {
        const token = localStorage.getItem(CONFIG.TOKEN_KEY);
        const user = localStorage.getItem(CONFIG.STORAGE_KEY);
        
        if (token && user) {
            try {
                this.token = token;
                this.user = JSON.parse(user);
                this.updateAuthUI();
            } catch (error) {
                console.error('Failed to load stored auth:', error);
                this.clearAuth();
            }
        }
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(user));
        this.updateAuthUI();
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        this.updateAuthUI();
    }

    updateAuthUI() {
        const authButtons = document.querySelectorAll('[data-auth]');
        const userElements = document.querySelectorAll('[data-user]');
        const adminElements = document.querySelectorAll('[data-admin]');

        authButtons.forEach(btn => {
            const requireAuth = btn.dataset.auth === 'required';
            btn.style.display = (this.isAuthenticated() === requireAuth) ? 'block' : 'none';
        });

        userElements.forEach(el => {
            el.style.display = this.isAuthenticated() ? 'block' : 'none';
            if (this.user && el.dataset.user === 'name') {
                el.textContent = this.user.username;
            }
        });

        adminElements.forEach(el => {
            el.style.display = (this.isAuthenticated() && this.user?.is_admin) ? 'block' : 'none';
        });
    }

    isAuthenticated() {
        return !!(this.token && this.user);
    }

    isAdmin() {
        return this.isAuthenticated() && this.user?.is_admin;
    }

    setupEventListeners() {
        // Mobile menu toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-mobile-menu-toggle]')) {
                this.toggleMobileMenu();
            }
        });

        // Search functionality
        const searchInput = document.querySelector('[data-search-input]');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.handleSearch(e.target.value), 300);
            });
        }

        // Global click outside handler
        document.addEventListener('click', (e) => {
            this.handleOutsideClick(e);
        });
    }

    toggleMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        }
    }

    handleOutsideClick(e) {
        // Close search results if clicked outside
        const searchContainer = document.querySelector('.search-container');
        const searchResults = document.querySelector('.search-results');
        
        if (searchContainer && searchResults && !searchContainer.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    }

    async handleSearch(query) {
        if (query.length < 2) {
            this.hideSearchResults();
            return;
        }

        if (this.searchCache.has(query)) {
            this.displaySearchResults(this.searchCache.get(query));
            return;
        }

        try {
            const results = await apiClient.search(query);
            this.searchCache.set(query, results);
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.hideSearchResults();
        }
    }

    displaySearchResults(results) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) return;

        if (!results || results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
            searchResults.style.display = 'block';
            return;
        }

        const html = results.slice(0, 5).map(item => `
            <div class="search-result-item" onclick="app.goToDetails(${item.id})">
                <img src="${this.getImageUrl(item.poster_path, 'w92')}" 
                     alt="${item.title}" 
                     style="width: 40px; height: 60px; object-fit: cover; border-radius: 4px;"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA0MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0yMCAzMEwyNSAyNUgxNUwyMCAzMFoiIGZpbGw9IiM2QjcyODAiLz4KPC9zdmc+'" />
                <div class="flex-1">
                    <div class="font-semibold text-sm">${item.title}</div>
                    <div class="text-xs text-gray-400">
                        ${item.content_type} • ${item.rating ? `⭐ ${item.rating.toFixed(1)}` : 'No rating'}
                    </div>
                </div>
            </div>
        `).join('');

        searchResults.innerHTML = html;
        searchResults.style.display = 'block';
    }

    hideSearchResults() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }

    getImageUrl(path, size = 'w500') {
        if (!path) return this.getPlaceholderImage();
        if (path.startsWith('http')) return path;
        return `${CONFIG.TMDB_IMAGE_BASE}${size}${path}`;
    }

    getPlaceholderImage(width = 500, height = 750) {
        return `data:image/svg+xml;base64,${btoa(`
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="${width}" height="${height}" fill="#374151"/>
                <path d="M${width/2} ${height/2}L${width/2 + 25} ${height/2 - 25}H${width/2 - 25}L${width/2} ${height/2}Z" fill="#6B7280"/>
            </svg>
        `)}`;
    }

    showLoading(element) {
        if (element) {
            element.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        }
    }

    hideLoading() {
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => el.remove());
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-white">
                    ×
                </button>
            </div>
        `;

        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    goToDetails(contentId) {
        window.location.href = `/details?id=${contentId}`;
    }

    goToPage(page) {
        window.location.href = page;
    }

    logout() {
        this.clearAuth();
        this.showToast('Logged out successfully', 'success');
        window.location.href = '/';
    }
}

// API Client
class ApiClient {
    constructor() {
        this.baseURL = CONFIG.API_BASE;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (app.token) {
            config.headers.Authorization = `Bearer ${app.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Authentication
    async login(username, password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    async register(userData) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Content Discovery
    async search(query, type = 'multi', page = 1) {
        const params = new URLSearchParams({ query, type, page });
        const data = await this.request(`/search?${params}`);
        return data.results || [];
    }

    async getContentDetails(id) {
        return this.request(`/content/${id}`);
    }

    // Recommendations
    async getTrending(type = 'all', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        const data = await this.request(`/recommendations/trending?${params}`);
        return data.recommendations || [];
    }

    async getNewReleases(language = '', type = 'movie', limit = 20) {
        const params = new URLSearchParams({ language, type, limit });
        const data = await this.request(`/recommendations/new-releases?${params}`);
        return data.recommendations || [];
    }

    async getCriticsChoice(type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        const data = await this.request(`/recommendations/critics-choice?${params}`);
        return data.recommendations || [];
    }

    async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        const data = await this.request(`/recommendations/genre/${genre}?${params}`);
        return data.recommendations || [];
    }

    async getRegionalRecommendations(language, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        const data = await this.request(`/recommendations/regional/${language}?${params}`);
        return data.recommendations || [];
    }

    async getAnimeRecommendations(genre = '', limit = 20) {
        const params = new URLSearchParams({ genre, limit });
        const data = await this.request(`/recommendations/anime?${params}`);
        return data.recommendations || [];
    }

    async getPersonalizedRecommendations(limit = 20) {
        const params = new URLSearchParams({ limit });
        const data = await this.request(`/recommendations/personalized?${params}`);
        return data.recommendations || [];
    }

    async getSimilarRecommendations(contentId, limit = 20) {
        const params = new URLSearchParams({ limit });
        const data = await this.request(`/recommendations/similar/${contentId}?${params}`);
        return data.recommendations || [];
    }

    async getAdminChoice(limit = 20) {
        const params = new URLSearchParams({ limit });
        const data = await this.request(`/recommendations/admin-choice?${params}`);
        return data.recommendations || [];
    }

    // User Interactions
    async recordInteraction(contentId, interactionType, rating = null) {
        return this.request('/interactions', {
            method: 'POST',
            body: JSON.stringify({
                content_id: contentId,
                interaction_type: interactionType,
                rating
            })
        });
    }

    async getWatchlist() {
        const data = await this.request('/user/watchlist');
        return data.watchlist || [];
    }

    async getFavorites() {
        const data = await this.request('/user/favorites');
        return data.favorites || [];
    }

    // Admin Functions
    async adminSearch(query, source = 'tmdb', page = 1) {
        const params = new URLSearchParams({ query, source, page });
        const data = await this.request(`/admin/search?${params}`);
        return data.results || [];
    }

    async saveExternalContent(contentData) {
        return this.request('/admin/content', {
            method: 'POST',
            body: JSON.stringify(contentData)
        });
    }

    async createAdminRecommendation(contentId, type, description) {
        return this.request('/admin/recommendations', {
            method: 'POST',
            body: JSON.stringify({
                content_id: contentId,
                recommendation_type: type,
                description
            })
        });
    }

    async getAnalytics() {
        return this.request('/admin/analytics');
    }
}

// UI Components
class UIComponents {
    static createContentCard(content) {
        const youtubeUrl = content.youtube_trailer ? `${CONFIG.YOUTUBE_BASE}${content.youtube_trailer}` : null;
        
        return `
            <div class="content-card" onclick="app.goToDetails(${content.id})" data-content-id="${content.id}">
                <img src="${app.getImageUrl(content.poster_path)}" 
                     alt="${content.title}" 
                     class="content-card-image"
                     onerror="this.src='${app.getPlaceholderImage()}'" />
                
                <div class="content-card-overlay">
                    <h3 class="content-card-title">${content.title}</h3>
                    <div class="content-card-meta">
                        <span>${content.content_type.toUpperCase()}</span>
                        ${content.rating ? `
                            <div class="content-card-rating">
                                <span>⭐</span>
                                <span>${content.rating.toFixed(1)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="content-card-actions">
                    ${app.isAuthenticated() ? `
                        <button class="action-btn" onclick="event.stopPropagation(); userActions.addToWatchlist(${content.id})" title="Add to Watchlist">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                            </svg>
                        </button>
                        <button class="action-btn" onclick="event.stopPropagation(); userActions.addToFavorites(${content.id})" title="Add to Favorites">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
                            </svg>
                        </button>
                    ` : ''}
                    ${youtubeUrl ? `
                        <button class="action-btn" onclick="event.stopPropagation(); window.open('${youtubeUrl}', '_blank')" title="Watch Trailer">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static createCarousel(title, items, viewAllLink = null) {
        if (!items || items.length === 0) return '';

        const carouselId = `carousel-${Math.random().toString(36).substr(2, 9)}`;
        
        return `
            <div class="carousel-container" data-carousel="${carouselId}">
                <div class="carousel-header">
                    <h2 class="carousel-title">${title}</h2>
                    <div class="carousel-controls">
                        <button class="carousel-btn" onclick="carouselManager.prev('${carouselId}')" data-prev>
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                            </svg>
                        </button>
                        <button class="carousel-btn" onclick="carouselManager.next('${carouselId}')" data-next>
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                            </svg>
                        </button>
                        ${viewAllLink ? `<a href="${viewAllLink}" class="btn btn-outline btn-sm">View All</a>` : ''}
                    </div>
                </div>
                <div class="carousel-wrapper">
                    <div class="carousel-track" data-track>
                        ${items.map(item => `
                            <div class="carousel-item">
                                ${this.createContentCard(item)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    static createSkeleton(count = 5) {
        return Array(count).fill(0).map(() => `
            <div class="carousel-item">
                <div class="skeleton" style="aspect-ratio: 2/3; height: 300px;"></div>
            </div>
        `).join('');
    }

    static createModal(title, content, actions = '') {
        return `
            <div class="modal-overlay active" onclick="this.remove()">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${actions ? `<div class="modal-footer">${actions}</div>` : ''}
                </div>
            </div>
        `;
    }
}

// Carousel Manager
class CarouselManager {
    constructor() {
        this.carousels = new Map();
        this.itemWidth = 220; // Base item width
        this.gap = 16; // Gap between items
    }

    init(carouselId) {
        const carousel = document.querySelector(`[data-carousel="${carouselId}"]`);
        if (!carousel) return;

        const track = carousel.querySelector('[data-track]');
        const prevBtn = carousel.querySelector('[data-prev]');
        const nextBtn = carousel.querySelector('[data-next]');
        
        if (!track) return;

        const items = track.children;
        const containerWidth = carousel.offsetWidth;
        const itemsPerView = Math.floor(containerWidth / (this.itemWidth + this.gap));
        const maxScroll = Math.max(0, items.length - itemsPerView);

        this.carousels.set(carouselId, {
            track,
            currentIndex: 0,
            itemsPerView,
            maxScroll,
            itemWidth: this.itemWidth,
            gap: this.gap
        });

        this.updateButtons(carouselId);
    }

    next(carouselId) {
        const carousel = this.carousels.get(carouselId);
        if (!carousel) return;

        if (carousel.currentIndex < carousel.maxScroll) {
            carousel.currentIndex = Math.min(carousel.currentIndex + carousel.itemsPerView, carousel.maxScroll);
            this.updatePosition(carouselId);
        }
    }

    prev(carouselId) {
        const carousel = this.carousels.get(carouselId);
        if (!carousel) return;

        if (carousel.currentIndex > 0) {
            carousel.currentIndex = Math.max(carousel.currentIndex - carousel.itemsPerView, 0);
            this.updatePosition(carouselId);
        }
    }

    updatePosition(carouselId) {
        const carousel = this.carousels.get(carouselId);
        if (!carousel) return;

        const translateX = carousel.currentIndex * (carousel.itemWidth + carousel.gap);
        carousel.track.style.transform = `translateX(-${translateX}px)`;
        this.updateButtons(carouselId);
    }

    updateButtons(carouselId) {
        const carousel = this.carousels.get(carouselId);
        const container = document.querySelector(`[data-carousel="${carouselId}"]`);
        
        if (!carousel || !container) return;

        const prevBtn = container.querySelector('[data-prev]');
        const nextBtn = container.querySelector('[data-next]');

        if (prevBtn) prevBtn.disabled = carousel.currentIndex === 0;
        if (nextBtn) nextBtn.disabled = carousel.currentIndex >= carousel.maxScroll;
    }

    initAll() {
        const carousels = document.querySelectorAll('[data-carousel]');
        carousels.forEach(carousel => {
            const id = carousel.dataset.carousel;
            this.init(id);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            setTimeout(() => {
                carousels.forEach(carousel => {
                    const id = carousel.dataset.carousel;
                    this.init(id);
                });
            }, 100);
        });
    }
}

// User Actions Manager
class UserActions {
    async addToWatchlist(contentId) {
        if (!app.isAuthenticated()) {
            app.showToast('Please login to add to watchlist', 'warning');
            return;
        }

        try {
            await apiClient.recordInteraction(contentId, 'watchlist');
            app.showToast('Added to watchlist', 'success');
        } catch (error) {
            app.showToast('Failed to add to watchlist', 'error');
        }
    }

    async addToFavorites(contentId) {
        if (!app.isAuthenticated()) {
            app.showToast('Please login to add to favorites', 'warning');
            return;
        }

        try {
            await apiClient.recordInteraction(contentId, 'favorite');
            app.showToast('Added to favorites', 'success');
        } catch (error) {
            app.showToast('Failed to add to favorites', 'error');
        }
    }

    async rateContent(contentId, rating) {
        if (!app.isAuthenticated()) {
            app.showToast('Please login to rate content', 'warning');
            return;
        }

        try {
            await apiClient.recordInteraction(contentId, 'rating', rating);
            app.showToast(`Rated ${rating}/10`, 'success');
        } catch (error) {
            app.showToast('Failed to rate content', 'error');
        }
    }
}

// Initialize global instances
const app = new AppState();
const apiClient = new ApiClient();
const carouselManager = new CarouselManager();
const userActions = new UserActions();

// Page-specific initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize carousels on page load
    setTimeout(() => carouselManager.initAll(), 100);
    
    // Initialize page-specific functionality
    const page = window.location.pathname;
    
    if (page === '/' || page === '/index.html') {
        initHomePage();
    } else if (page === '/login' || page === '/login.html') {
        initLoginPage();
    } else if (page === '/dashboard' || page === '/dashboard.html') {
        initDashboardPage();
    } else if (page === '/details' || page === '/details.html') {
        initDetailsPage();
    } else if (page.startsWith('/admin/')) {
        initAdminPages();
    }
});

// Page initialization functions
async function initHomePage() {
    await loadHomepageRecommendations();
}

async function initLoginPage() {
    setupLoginForm();
}

async function initDashboardPage() {
    if (!app.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }
    await loadDashboardContent();
}

async function initDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const contentId = urlParams.get('id');
    if (contentId) {
        await loadContentDetails(contentId);
    }
}

async function initAdminPages() {
    if (!app.isAdmin()) {
        window.location.href = '/login';
        return;
    }
    // Admin-specific initialization will be handled in admin pages
}

// Homepage recommendations loader
async function loadHomepageRecommendations() {
    const sections = [
        { id: 'trending', title: 'Trending Now', loader: () => apiClient.getTrending() },
        { id: 'new-releases', title: 'New Releases', loader: () => apiClient.getNewReleases() },
        { id: 'critics-choice', title: 'Critics Choice', loader: () => apiClient.getCriticsChoice() },
        { id: 'admin-choice', title: 'Staff Picks', loader: () => apiClient.getAdminChoice() }
    ];

    for (const section of sections) {
        const container = document.getElementById(section.id);
        if (!container) continue;

        // Show skeleton loading
        container.innerHTML = `
            <div class="carousel-container">
                <div class="carousel-header">
                    <h2 class="carousel-title">${section.title}</h2>
                </div>
                <div class="carousel-wrapper">
                    <div class="carousel-track">
                        ${UIComponents.createSkeleton(5)}
                    </div>
                </div>
            </div>
        `;

        try {
            const items = await section.loader();
            if (items && items.length > 0) {
                container.innerHTML = UIComponents.createCarousel(section.title, items);
                carouselManager.initAll();
            }
        } catch (error) {
            console.error(`Failed to load ${section.id}:`, error);
            container.innerHTML = `<div class="text-center p-4 text-gray-400">Failed to load ${section.title}</div>`;
        }
    }
}

// Login form setup
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            
            try {
                const response = await apiClient.login(
                    formData.get('username'),
                    formData.get('password')
                );
                
                app.setAuth(response.token, response.user);
                app.showToast('Login successful!', 'success');
                
                // Redirect based on user role
                if (response.user.is_admin) {
                    window.location.href = '/admin/dashboard';
                } else {
                    window.location.href = '/dashboard';
                }
            } catch (error) {
                app.showToast(error.message || 'Login failed', 'error');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            
            try {
                const response = await apiClient.register({
                    username: formData.get('username'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    preferred_languages: formData.getAll('languages'),
                    preferred_genres: formData.getAll('genres')
                });
                
                app.setAuth(response.token, response.user);
                app.showToast('Registration successful!', 'success');
                window.location.href = '/dashboard';
            } catch (error) {
                app.showToast(error.message || 'Registration failed', 'error');
            }
        });
    }
}

// Dashboard content loader
async function loadDashboardContent() {
    try {
        const [personalized, watchlist, favorites] = await Promise.all([
            apiClient.getPersonalizedRecommendations(),
            apiClient.getWatchlist(),
            apiClient.getFavorites()
        ]);

        // Load personalized recommendations
        const personalizedContainer = document.getElementById('personalized');
        if (personalizedContainer && personalized.length > 0) {
            personalizedContainer.innerHTML = UIComponents.createCarousel('Recommended for You', personalized);
        }

        // Load watchlist
        const watchlistContainer = document.getElementById('watchlist');
        if (watchlistContainer && watchlist.length > 0) {
            watchlistContainer.innerHTML = UIComponents.createCarousel('Your Watchlist', watchlist, '/user/watchlist');
        }

        // Load favorites
        const favoritesContainer = document.getElementById('favorites');
        if (favoritesContainer && favorites.length > 0) {
            favoritesContainer.innerHTML = UIComponents.createCarousel('Your Favorites', favorites, '/user/favorites');
        }

        carouselManager.initAll();
    } catch (error) {
        console.error('Failed to load dashboard content:', error);
    }
}

// Content details loader
async function loadContentDetails(contentId) {
    try {
        const content = await apiClient.getContentDetails(contentId);
        
        // Record view interaction
        if (app.isAuthenticated()) {
            apiClient.recordInteraction(contentId, 'view');
        }

        // Update page content with details
        updateDetailsPage(content);
        
        // Load similar content
        if (content.similar_content && content.similar_content.length > 0) {
            const similarContainer = document.getElementById('similar-content');
            if (similarContainer) {
                similarContainer.innerHTML = UIComponents.createCarousel('More Like This', content.similar_content);
                carouselManager.initAll();
            }
        }
    } catch (error) {
        console.error('Failed to load content details:', error);
        app.showToast('Failed to load content details', 'error');
    }
}

function updateDetailsPage(content) {
    // Update title
    const titleElement = document.getElementById('content-title');
    if (titleElement) titleElement.textContent = content.title;

    // Update poster
    const posterElement = document.getElementById('content-poster');
    if (posterElement) {
        posterElement.src = app.getImageUrl(content.poster_path);
        posterElement.alt = content.title;
    }

    // Update backdrop
    const backdropElement = document.getElementById('content-backdrop');
    if (backdropElement && content.backdrop_path) {
        backdropElement.style.backgroundImage = `url(${app.getImageUrl(content.backdrop_path, 'w1280')})`;
    }

    // Update other details
    const elements = {
        'content-overview': content.overview,
        'content-rating': content.rating ? `⭐ ${content.rating.toFixed(1)}/10` : 'No rating',
        'content-release': content.release_date || 'Unknown',
        'content-runtime': content.runtime ? `${content.runtime} min` : '',
        'content-genres': content.genres ? content.genres.join(', ') : '',
        'content-languages': content.languages ? content.languages.join(', ') : ''
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) element.textContent = value;
    });

    // Update trailer button
    const trailerBtn = document.getElementById('trailer-btn');
    if (trailerBtn && content.youtube_trailer) {
        trailerBtn.onclick = () => window.open(`${CONFIG.YOUTUBE_BASE}${content.youtube_trailer}`, '_blank');
        trailerBtn.style.display = 'inline-flex';
    }

    // Update action buttons
    setupActionButtons(content.id);
}

function setupActionButtons(contentId) {
    const watchlistBtn = document.getElementById('watchlist-btn');
    const favoriteBtn = document.getElementById('favorite-btn');

    if (watchlistBtn) {
        watchlistBtn.onclick = () => userActions.addToWatchlist(contentId);
    }

    if (favoriteBtn) {
        favoriteBtn.onclick = () => userActions.addToFavorites(contentId);
    }
}

// Export for global access
window.app = app;
window.apiClient = apiClient;
window.carouselManager = carouselManager;
window.userActions = userActions;
window.UIComponents = UIComponents;