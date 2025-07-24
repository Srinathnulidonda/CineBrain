// API Configuration
const API_BASE = 'https://backend-app-970m.onrender.com/api';

// Global state management
class AppState {
    constructor() {
        this.user = null;
        this.token = null;
        this.currentContent = null;
        this.searchResults = [];
        this.recommendations = {};
        this.loading = false;
    }

    setUser(user, token) {
        this.user = user;
        this.token = token;
    }

    isAuthenticated() {
        return !!this.token;
    }

    isAdmin() {
        return this.user && this.user.is_admin;
    }

    clearAuth() {
        this.user = null;
        this.token = null;
    }
}

const appState = new AppState();

// API Service
class ApiService {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (appState.token) {
            config.headers.Authorization = `Bearer ${appState.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request(endpoint);
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Auth methods
    static async login(username, password) {
        return this.post('/login', { username, password });
    }

    static async register(userData) {
        return this.post('/register', userData);
    }

    // Content methods
    static async search(query, type = 'multi', page = 1) {
        return this.get(`/search?query=${encodeURIComponent(query)}&type=${type}&page=${page}`);
    }

    static async getContent(id) {
        return this.get(`/content/${id}`);
    }

    // Recommendation methods
    static async getTrending(type = 'all', limit = 20) {
        return this.get(`/recommendations/trending?type=${type}&limit=${limit}`);
    }

    static async getNewReleases(language = null, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        if (language) params.append('language', language);
        return this.get(`/recommendations/new-releases?${params}`);
    }

    static async getCriticsChoice(type = 'movie', limit = 20) {
        return this.get(`/recommendations/critics-choice?type=${type}&limit=${limit}`);
    }

    static async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        return this.get(`/recommendations/genre/${genre}?type=${type}&limit=${limit}`);
    }

    static async getRegionalContent(language, type = 'movie', limit = 20) {
        return this.get(`/recommendations/regional/${language}?type=${type}&limit=${limit}`);
    }

    static async getAnimeRecommendations(genre = null, limit = 20) {
        const params = new URLSearchParams({ limit });
        if (genre) params.append('genre', genre);
        return this.get(`/recommendations/anime?${params}`);
    }

    static async getPersonalizedRecommendations() {
        return this.get('/recommendations/personalized');
    }

    static async getAnonymousRecommendations() {
        return this.get('/recommendations/anonymous');
    }

    static async getSimilarContent(contentId) {
        return this.get(`/recommendations/similar/${contentId}`);
    }

    // User methods
    static async getWatchlist() {
        return this.get('/user/watchlist');
    }

    static async getFavorites() {
        return this.get('/user/favorites');
    }

    static async recordInteraction(contentId, interactionType, rating = null) {
        return this.post('/interactions', {
            content_id: contentId,
            interaction_type: interactionType,
            rating
        });
    }
}

// UI Components
class UIComponents {
    static showLoader() {
        document.body.classList.add('loading');
        const loader = document.querySelector('.global-loader');
        if (loader) loader.style.display = 'flex';
    }

    static hideLoader() {
        document.body.classList.remove('loading');
        const loader = document.querySelector('.global-loader');
        if (loader) loader.style.display = 'none';
    }

    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').onclick = () => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 300);
        };
    }

    static createContentCard(content, size = 'medium') {
        const genres = content.genres ? content.genres.slice(0, 2).join(', ') : '';
        const posterUrl = content.poster_path || '/assets/images/placeholder-poster.jpg';
        
        return `
            <div class="content-card ${size}" data-content-id="${content.id}">
                <div class="content-card-poster">
                    <img src="${posterUrl}" alt="${content.title}" loading="lazy" 
                         onerror="this.src='/assets/images/placeholder-poster.jpg'">
                    <div class="content-card-overlay">
                        <button class="play-btn" data-action="play">
                            <i class="play-icon"></i>
                        </button>
                        <div class="content-card-actions">
                            <button class="action-btn" data-action="favorite" title="Add to Favorites">
                                <i class="heart-icon"></i>
                            </button>
                            <button class="action-btn" data-action="watchlist" title="Add to Watchlist">
                                <i class="bookmark-icon"></i>
                            </button>
                            <button class="action-btn" data-action="info" title="More Info">
                                <i class="info-icon"></i>
                            </button>
                        </div>
                    </div>
                    ${content.rating ? `<div class="rating-badge">${content.rating.toFixed(1)}</div>` : ''}
                </div>
                <div class="content-card-info">
                    <h3 class="content-title">${content.title}</h3>
                    <p class="content-meta">${content.content_type} ${genres ? `• ${genres}` : ''}</p>
                </div>
            </div>
        `;
    }

    static createCarousel(title, items, sectionId) {
        return `
            <section class="content-section" id="${sectionId}">
                <div class="section-header">
                    <h2 class="section-title">${title}</h2>
                    <button class="see-all-btn" data-section="${sectionId}">See All</button>
                </div>
                <div class="content-carousel">
                    <button class="carousel-nav carousel-prev" data-direction="prev">
                        <i class="chevron-left"></i>
                    </button>
                    <div class="carousel-container">
                        <div class="carousel-track">
                            ${items.map(item => this.createContentCard(item)).join('')}
                        </div>
                    </div>
                    <button class="carousel-nav carousel-next" data-direction="next">
                        <i class="chevron-right"></i>
                    </button>
                </div>
            </section>
        `;
    }
}

// Navigation and Routing
class Navigation {
    static init() {
        this.setupMobileMenu();
        this.setupSearch();
        this.setupAuthState();
    }

    static setupMobileMenu() {
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');
        const overlay = document.querySelector('.mobile-menu-overlay');

        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
                document.body.classList.toggle('menu-open');
            });

            if (overlay) {
                overlay.addEventListener('click', () => {
                    mobileMenu.classList.remove('active');
                    document.body.classList.remove('menu-open');
                });
            }
        }
    }

    static setupSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchResults = document.querySelector('.search-results');
        let searchTimeout;

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();

                if (query.length < 2) {
                    if (searchResults) searchResults.style.display = 'none';
                    return;
                }

                searchTimeout = setTimeout(async () => {
                    try {
                        const results = await ApiService.search(query);
                        this.displaySearchResults(results.results);
                    } catch (error) {
                        console.error('Search failed:', error);
                    }
                }, 300);
            });

            // Close search results when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    if (searchResults) searchResults.style.display = 'none';
                }
            });
        }
    }

    static displaySearchResults(results) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No results found</div>';
        } else {
            searchResults.innerHTML = results.slice(0, 8).map(result => `
                <div class="search-result-item" data-content-id="${result.id}">
                    <img src="${result.poster_path || '/assets/images/placeholder-poster.jpg'}" 
                         alt="${result.title}" loading="lazy">
                    <div class="search-result-info">
                        <h4>${result.title}</h4>
                        <p>${result.content_type} ${result.rating ? `• ${result.rating}/10` : ''}</p>
                    </div>
                </div>
            `).join('');
        }

        searchResults.style.display = 'block';
    }

    static setupAuthState() {
        const userMenu = document.querySelector('.user-menu');
        const loginBtn = document.querySelector('.login-btn');

        if (appState.isAuthenticated()) {
            if (userMenu) userMenu.style.display = 'block';
            if (loginBtn) loginBtn.style.display = 'none';
        } else {
            if (userMenu) userMenu.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'block';
        }
    }

    static redirectBasedOnAuth() {
        if (appState.isAuthenticated()) {
            if (appState.isAdmin()) {
                window.location.href = '/admin/dashboard';
            } else {
                window.location.href = '/dashboard';
            }
        } else {
            window.location.href = '/';
        }
    }
}

// Content Management
class ContentManager {
    static async loadContentDetails(contentId) {
        try {
            UIComponents.showLoader();
            const content = await ApiService.getContent(contentId);
            appState.currentContent = content;
            
            // Record view interaction
            if (appState.isAuthenticated()) {
                await ApiService.recordInteraction(contentId, 'view');
            }
            
            return content;
        } catch (error) {
            UIComponents.showToast('Failed to load content details', 'error');
            throw error;
        } finally {
            UIComponents.hideLoader();
        }
    }

    static async toggleWatchlist(contentId) {
        if (!appState.isAuthenticated()) {
            UIComponents.showToast('Please login to add to watchlist', 'warning');
            return;
        }

        try {
            await ApiService.recordInteraction(contentId, 'watchlist');
            UIComponents.showToast('Added to watchlist', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to add to watchlist', 'error');
        }
    }

    static async toggleFavorite(contentId) {
        if (!appState.isAuthenticated()) {
            UIComponents.showToast('Please login to add to favorites', 'warning');
            return;
        }

        try {
            await ApiService.recordInteraction(contentId, 'favorite');
            UIComponents.showToast('Added to favorites', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to add to favorites', 'error');
        }
    }
}

// Event Handlers
class EventHandlers {
    static init() {
        this.setupContentCardEvents();
        this.setupCarouselEvents();
        this.setupModalEvents();
    }

    static setupContentCardEvents() {
        document.addEventListener('click', async (e) => {
            const card = e.target.closest('.content-card');
            if (!card) return;

            const contentId = card.dataset.contentId;
            const action = e.target.closest('[data-action]')?.dataset.action;

            switch (action) {
                case 'play':
                case 'info':
                    window.location.href = `/details?id=${contentId}`;
                    break;
                case 'favorite':
                    await ContentManager.toggleFavorite(contentId);
                    break;
                case 'watchlist':
                    await ContentManager.toggleWatchlist(contentId);
                    break;
                default:
                    if (!action) {
                        window.location.href = `/details?id=${contentId}`;
                    }
            }
        });
    }

    static setupCarouselEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.carousel-nav')) {
                const nav = e.target.closest('.carousel-nav');
                const direction = nav.dataset.direction;
                const carousel = nav.closest('.content-carousel');
                this.scrollCarousel(carousel, direction);
            }
        });

        // Touch events for mobile
        document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    }

    static scrollCarousel(carousel, direction) {
        const track = carousel.querySelector('.carousel-track');
        const cardWidth = track.querySelector('.content-card').offsetWidth + 16; // 16px gap
        const scrollAmount = cardWidth * 3; // Scroll 3 cards at a time

        if (direction === 'next') {
            track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        } else {
            track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
    }

    static handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
    }

    static handleTouchMove(e) {
        if (!this.touchStartX) return;

        const touchEndX = e.touches[0].clientX;
        const diff = this.touchStartX - touchEndX;

        if (Math.abs(diff) > 50) { // Minimum swipe distance
            const carousel = e.target.closest('.content-carousel');
            if (carousel) {
                this.scrollCarousel(carousel, diff > 0 ? 'next' : 'prev');
            }
            this.touchStartX = null;
        }
    }

    static setupModalEvents() {
        // Handle escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                }
            }
        });
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    Navigation.init();
    EventHandlers.init();
    
    // Check for existing authentication
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (token && user) {
        appState.setUser(user, token);
        Navigation.setupAuthState();
    }
});

// Export for use in other files
window.AppState = appState;
window.ApiService = ApiService;
window.UIComponents = UIComponents;
window.Navigation = Navigation;
window.ContentManager = ContentManager;
window.EventHandlers = EventHandlers;