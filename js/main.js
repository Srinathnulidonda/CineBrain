// API Configuration
const API_BASE = 'https://backend-app-970m.onrender.com/api';

// Global State Management
class AppState {
    constructor() {
        this.user = null;
        this.authToken = null;
        this.loading = false;
        this.error = null;
        this.cache = new Map();
        this.sessionId = this.generateSessionId();
        this.observers = new Map();
    }

    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    subscribe(event, callback) {
        if (!this.observers.has(event)) {
            this.observers.set(event, []);
        }
        this.observers.get(event).push(callback);
    }

    notify(event, data) {
        if (this.observers.has(event)) {
            this.observers.get(event).forEach(callback => callback(data));
        }
    }

    setUser(user) {
        this.user = user;
        this.notify('userChanged', user);
    }

    setAuthToken(token) {
        this.authToken = token;
        this.notify('authChanged', !!token);
    }

    setLoading(loading) {
        this.loading = loading;
        this.notify('loadingChanged', loading);
    }

    setError(error) {
        this.error = error;
        this.notify('errorChanged', error);
    }
}

// Initialize global state
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

        // Add auth token if available
        if (appState.authToken) {
            config.headers.Authorization = `Bearer ${appState.authToken}`;
        }

        try {
            appState.setLoading(true);
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            appState.setError(error.message);
            throw error;
        } finally {
            appState.setLoading(false);
        }
    }

    static async get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${endpoint}?${query}` : endpoint;
        return this.request(url);
    }

    static async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Authentication methods
    static async login(username, password) {
        const response = await this.post('/login', { username, password });
        if (response.token) {
            appState.setAuthToken(response.token);
            appState.setUser(response.user);
        }
        return response;
    }

    static async register(userData) {
        const response = await this.post('/register', userData);
        if (response.token) {
            appState.setAuthToken(response.token);
            appState.setUser(response.user);
        }
        return response;
    }

    static logout() {
        appState.setAuthToken(null);
        appState.setUser(null);
        window.location.href = '/';
    }

    // Content methods
    static async searchContent(query, type = 'multi', page = 1) {
        return this.get('/search', { query, type, page });
    }

    static async getContentDetails(contentId) {
        const cacheKey = `content_${contentId}`;
        if (appState.cache.has(cacheKey)) {
            return appState.cache.get(cacheKey);
        }

        const data = await this.get(`/content/${contentId}`);
        appState.cache.set(cacheKey, data);
        return data;
    }

    // Recommendation methods
    static async getTrending(type = 'all', limit = 20) {
        return this.get('/recommendations/trending', { type, limit });
    }

    static async getNewReleases(language = null, type = 'movie', limit = 20) {
        const params = { type, limit };
        if (language) params.language = language;
        return this.get('/recommendations/new-releases', params);
    }

    static async getCriticsChoice(type = 'movie', limit = 20) {
        return this.get('/recommendations/critics-choice', { type, limit });
    }

    static async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        return this.get(`/recommendations/genre/${genre}`, { type, limit });
    }

    static async getRegionalContent(language, type = 'movie', limit = 20) {
        return this.get(`/recommendations/regional/${language}`, { type, limit });
    }

    static async getAnimeRecommendations(genre = null, limit = 20) {
        const params = { limit };
        if (genre) params.genre = genre;
        return this.get('/recommendations/anime', params);
    }

    static async getPersonalizedRecommendations(limit = 20) {
        return this.get('/recommendations/personalized', { limit });
    }

    static async getSimilarContent(contentId, limit = 10) {
        return this.get(`/recommendations/similar/${contentId}`, { limit });
    }

    static async getAdminChoice(limit = 20) {
        return this.get('/recommendations/admin-choice', { limit });
    }

    // User interaction methods
    static async recordInteraction(contentId, interactionType, rating = null) {
        const data = { content_id: contentId, interaction_type: interactionType };
        if (rating) data.rating = rating;
        return this.post('/interactions', data);
    }

    static async getWatchlist() {
        return this.get('/user/watchlist');
    }

    static async getFavorites() {
        return this.get('/user/favorites');
    }
}

// UI Components
class UIComponents {
    static showLoading(container) {
        const spinner = document.createElement('div');
        spinner.className = 'flex justify-center items-center p-8';
        spinner.innerHTML = '<div class="spinner"></div>';
        container.innerHTML = '';
        container.appendChild(spinner);
    }

    static showError(container, message) {
        container.innerHTML = `
      <div class="text-center p-8">
        <div class="text-error mb-4">⚠️</div>
        <p class="text-secondary">${message}</p>
        <button onclick="location.reload()" class="btn btn-secondary mt-4">
          Try Again
        </button>
      </div>
    `;
    }

    static createContentCard(content) {
        const card = document.createElement('div');
        card.className = 'content-card interactive';

        const posterUrl = content.poster_path || '/assets/images/placeholder-poster.jpg';
        const rating = content.rating ? content.rating.toFixed(1) : 'N/A';
        const genres = content.genres ? content.genres.slice(0, 2).join(', ') : 'Unknown';

        card.innerHTML = `
      <img src="${posterUrl}" alt="${content.title}" class="content-card-poster" loading="lazy">
      <div class="content-card-overlay">
        <h3 class="content-card-title">${content.title}</h3>
        <div class="content-card-meta">
          <span class="content-card-rating">${rating}</span>
          <span>${content.content_type.toUpperCase()}</span>
          <span>${genres}</span>
        </div>
      </div>
      <div class="content-card-actions">
        <button class="content-card-action" onclick="ContentManager.addToWatchlist(${content.id})" title="Add to Watchlist">
          📚
        </button>
        <button class="content-card-action" onclick="ContentManager.addToFavorites(${content.id})" title="Add to Favorites">
          ❤️
        </button>
        ${content.youtube_trailer ?
                `<button class="content-card-action" onclick="VideoPlayer.playTrailer('${content.youtube_trailer}')" title="Play Trailer">▶️</button>`
                : ''
            }
      </div>
    `;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.content-card-action')) {
                window.location.href = `/details?id=${content.id}`;
            }
        });

        return card;
    }

    static createCarousel(title, items, containerId, showNav = true) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
      <div class="carousel">
        <div class="carousel-header">
          <h2 class="carousel-title">${title}</h2>
          ${showNav ? `
            <div class="carousel-nav">
              <button class="carousel-nav-btn" onclick="this.parentElement.parentElement.nextElementSibling.children[0].scrollBy({left: -400, behavior: 'smooth'})">‹</button>
              <button class="carousel-nav-btn" onclick="this.parentElement.parentElement.nextElementSibling.children[0].scrollBy({left: 400, behavior: 'smooth'})">›</button>
            </div>
          ` : ''}
        </div>
        <div class="carousel-container">
          <div class="carousel-track" id="${containerId}-track">
            ${items.map(item => `
              <div class="carousel-item">
                ${this.createContentCard(item).outerHTML}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

        // Add touch scroll for mobile
        const track = document.getElementById(`${containerId}-track`);
        if (track) {
            this.addTouchScroll(track);
        }
    }

    static addTouchScroll(element) {
        let isDown = false;
        let startX;
        let scrollLeft;

        element.addEventListener('mousedown', (e) => {
            isDown = true;
            element.style.cursor = 'grabbing';
            startX = e.pageX - element.offsetLeft;
            scrollLeft = element.scrollLeft;
        });

        element.addEventListener('mouseleave', () => {
            isDown = false;
            element.style.cursor = 'grab';
        });

        element.addEventListener('mouseup', () => {
            isDown = false;
            element.style.cursor = 'grab';
        });

        element.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - element.offsetLeft;
            const walk = (x - startX) * 2;
            element.scrollLeft = scrollLeft - walk;
        });
    }

    static showToast(message, type = 'success', duration = 3000) {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="toast-message">${message}</div>
    `;

        toastContainer.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    static createModal(title, content, actions = '') {
        const modalId = 'modal-' + Date.now();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="UIComponents.closeModal('${modalId}')">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${actions ? `<div class="modal-footer">${actions}</div>` : ''}
      </div>
    `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modalId);
            }
        });

        return modalId;
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }
}

// Content Management
class ContentManager {
    static async addToWatchlist(contentId) {
        try {
            if (!appState.authToken) {
                AuthManager.showLoginPrompt();
                return;
            }

            await ApiService.recordInteraction(contentId, 'watchlist');
            UIComponents.showToast('Added to watchlist!');
        } catch (error) {
            UIComponents.showToast('Failed to add to watchlist', 'error');
        }
    }

    static async addToFavorites(contentId) {
        try {
            if (!appState.authToken) {
                AuthManager.showLoginPrompt();
                return;
            }

            await ApiService.recordInteraction(contentId, 'favorite');
            UIComponents.showToast('Added to favorites!');
        } catch (error) {
            UIComponents.showToast('Failed to add to favorites', 'error');
        }
    }

    static async recordView(contentId) {
        try {
            if (appState.authToken) {
                await ApiService.recordInteraction(contentId, 'view');
            }
        } catch (error) {
            console.error('Failed to record view:', error);
        }
    }

    static async loadContentDetails(contentId) {
        try {
            const content = await ApiService.getContentDetails(contentId);
            this.recordView(contentId);
            return content;
        } catch (error) {
            throw error;
        }
    }
}

// Authentication Manager
class AuthManager {
    static init() {
        // Check for existing auth token
        const token = this.getStoredToken();
        if (token) {
            appState.setAuthToken(token);
            this.validateToken();
        }

        // Setup auth state observers
        appState.subscribe('authChanged', (isAuthenticated) => {
            this.updateUI(isAuthenticated);
        });
    }

    static getStoredToken() {
        // Since we can't use localStorage, we'll use a simple variable
        // In a real app, you might use secure cookies or session storage
        return null;
    }

    static updateUI(isAuthenticated) {
        const loginBtn = document.getElementById('login-btn');
        const userMenu = document.getElementById('user-menu');
        const guestContent = document.querySelectorAll('.guest-only');
        const userContent = document.querySelectorAll('.user-only');

        if (isAuthenticated) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            guestContent.forEach(el => el.style.display = 'none');
            userContent.forEach(el => el.style.display = 'block');
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
            guestContent.forEach(el => el.style.display = 'block');
            userContent.forEach(el => el.style.display = 'none');
        }
    }

    static async validateToken() {
        try {
            // Try to make an authenticated request
            await ApiService.get('/user/profile');
        } catch (error) {
            // Token is invalid
            this.logout();
        }
    }

    static showLoginPrompt() {
        const content = `
      <form id="login-form" class="space-y-4">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" id="login-username" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="login-password" class="form-input" required>
        </div>
        <div class="form-error" id="login-error"></div>
      </form>
    `;

        const actions = `
      <button class="btn btn-primary" onclick="AuthManager.handleLogin()">Login</button>
      <button class="btn btn-secondary" onclick="window.location.href='/login'">Register</button>
    `;

        UIComponents.createModal('Login Required', content, actions);
    }

    static async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        try {
            await ApiService.login(username, password);
            UIComponents.closeModal(document.querySelector('.modal-overlay').id);
            UIComponents.showToast('Login successful!');

            // Redirect based on user role
            if (appState.user?.is_admin) {
                window.location.href = '/admin/dashboard';
            } else {
                window.location.href = '/dashboard';
            }
        } catch (error) {
            errorEl.textContent = error.message;
        }
    }

    static logout() {
        ApiService.logout();
    }
}

// Search Manager
class SearchManager {
    static init() {
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');

        if (!searchInput) return;

        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length < 2) {
                this.hideResults();
                return;
            }

            searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2) {
                this.showResults();
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideResults();
            }
        });
    }

    static async performSearch(query) {
        try {
            const results = await ApiService.searchContent(query);
            this.displayResults(results.results || []);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    static displayResults(results) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="p-4 text-center text-secondary">No results found</div>';
        } else {
            searchResults.innerHTML = results.slice(0, 10).map(item => `
        <div class="search-result-item" onclick="window.location.href='/details?id=${item.id}'">
          <img src="${item.poster_path || '/assets/images/placeholder-poster.jpg'}" alt="${item.title}" class="search-result-poster">
          <div class="search-result-info">
            <h4>${item.title}</h4>
            <div class="search-result-meta">
              ${item.content_type.toUpperCase()} • ${item.rating ? item.rating.toFixed(1) : 'N/A'} ⭐
            </div>
          </div>
        </div>
      `).join('');
        }

        this.showResults();
    }

    static showResults() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.style.display = 'block';
        }
    }

    static hideResults() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }
}

// Video Player
class VideoPlayer {
    static playTrailer(youtubeUrl) {
        const videoId = this.extractVideoId(youtubeUrl);
        if (!videoId) return;

        const content = `
      <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
          frameborder="0" 
          allowfullscreen>
        </iframe>
      </div>
    `;

        UIComponents.createModal('Trailer', content);
    }

    static extractVideoId(url) {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }
}

// Page-specific functionality
class PageManager {
    static init() {
        const path = window.location.pathname;

        switch (path) {
            case '/':
                this.initHomePage();
                break;
            case '/dashboard':
                this.initDashboard();
                break;
            case '/details':
                this.initDetailsPage();
                break;
            case '/login':
                this.initLoginPage();
                break;
            default:
                this.initGenericPage();
        }
    }

    static async initHomePage() {
        try {
            // Load trending content
            const trending = await ApiService.getTrending('all', 20);
            UIComponents.createCarousel('Trending Now', trending.recommendations, 'trending-carousel');

            // Load new releases
            const newReleases = await ApiService.getNewReleases();
            UIComponents.createCarousel('New Releases', newReleases.recommendations, 'new-releases-carousel');

            // Load critics choice
            const criticsChoice = await ApiService.getCriticsChoice();
            UIComponents.createCarousel('Critics Choice', criticsChoice.recommendations, 'critics-choice-carousel');

            // Load admin recommendations
            try {
                const adminChoice = await ApiService.getAdminChoice();
                if (adminChoice.recommendations.length > 0) {
                    UIComponents.createCarousel('Admin\'s Pick', adminChoice.recommendations, 'admin-choice-carousel');
                }
            } catch (error) {
                console.log('No admin recommendations available');
            }

        } catch (error) {
            console.error('Failed to load homepage content:', error);
        }
    }

    static async initDashboard() {
        if (!appState.authToken) {
            window.location.href = '/login';
            return;
        }

        try {
            // Load personalized recommendations
            const personalized = await ApiService.getPersonalizedRecommendations();
            UIComponents.createCarousel('Recommended for You', personalized.recommendations, 'personalized-carousel');

            // Load watchlist
            const watchlist = await ApiService.getWatchlist();
            if (watchlist.watchlist.length > 0) {
                UIComponents.createCarousel('Continue Watching', watchlist.watchlist, 'watchlist-carousel');
            }

            // Load favorites
            const favorites = await ApiService.getFavorites();
            if (favorites.favorites.length > 0) {
                UIComponents.createCarousel('Your Favorites', favorites.favorites, 'favorites-carousel');
            }

        } catch (error) {
            console.error('Failed to load dashboard content:', error);
        }
    }

    static async initDetailsPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const contentId = urlParams.get('id');

        if (!contentId) {
            window.location.href = '/';
            return;
        }

        try {
            const content = await ContentManager.loadContentDetails(contentId);
            this.renderContentDetails(content);
        } catch (error) {
            console.error('Failed to load content details:', error);
            UIComponents.showError(document.getElementById('content-details'), 'Failed to load content details');
        }
    }

    static renderContentDetails(content) {
        const container = document.getElementById('content-details');
        if (!container) return;

        const posterUrl = content.poster_path || '/assets/images/placeholder-poster.jpg';
        const backdropUrl = content.backdrop_path || content.poster_path || '/assets/images/placeholder-backdrop.jpg';
        const rating = content.rating ? content.rating.toFixed(1) : 'N/A';
        const genres = content.genres ? content.genres.join(', ') : 'Unknown';
        const releaseYear = content.release_date ? new Date(content.release_date).getFullYear() : 'Unknown';

        container.innerHTML = `
      <div class="hero" style="background-image: url('${backdropUrl}')">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="flex flex-col md:flex-row gap-8">
            <img src="${posterUrl}" alt="${content.title}" class="w-64 rounded-lg shadow-lg">
            <div class="flex-1">
              <h1 class="hero-title">${content.title}</h1>
              ${content.original_title && content.original_title !== content.title ?
                `<h2 class="text-xl text-secondary mb-4">${content.original_title}</h2>` : ''
            }
              <div class="flex gap-4 mb-6">
                <span class="badge badge-primary">${rating} ⭐</span>
                <span class="badge">${content.content_type.toUpperCase()}</span>
                <span class="badge">${releaseYear}</span>
                ${content.runtime ? `<span class="badge">${content.runtime} min</span>` : ''}
              </div>
              <p class="hero-description">${content.overview || 'No description available.'}</p>
              <div class="hero-actions">
                ${content.youtube_trailer ?
                `<button class="btn btn-primary" onclick="VideoPlayer.playTrailer('${content.youtube_trailer}')">
                    ▶️ Play Trailer
                  </button>` : ''
            }
                <button class="btn btn-secondary" onclick="ContentManager.addToWatchlist(${content.id})">
                  📚 Add to Watchlist
                </button>
                <button class="btn btn-secondary" onclick="ContentManager.addToFavorites(${content.id})">
                  ❤️ Add to Favorites
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="container py-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div class="md:col-span-2">
            <h3 class="text-xl font-semibold mb-4">Details</h3>
            <div class="space-y-2">
              <p><strong>Genres:</strong> ${genres}</p>
              ${content.languages ? `<p><strong>Languages:</strong> ${content.languages.join(', ')}</p>` : ''}
              ${content.release_date ? `<p><strong>Release Date:</strong> ${new Date(content.release_date).toLocaleDateString()}</p>` : ''}
              ${content.vote_count ? `<p><strong>Vote Count:</strong> ${content.vote_count.toLocaleString()}</p>` : ''}
            </div>
          </div>
          <div>
            <h3 class="text-xl font-semibold mb-4">Cast & Crew</h3>
            ${this.renderCastCrew(content.cast, content.crew)}
          </div>
        </div>
        
        ${content.similar_content && content.similar_content.length > 0 ?
                `<div id="similar-content">
            <h3 class="text-xl font-semibold mb-4">You might also like</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              ${content.similar_content.map(item => UIComponents.createContentCard(item).outerHTML).join('')}
            </div>
          </div>` : ''
            }
      </div>
    `;
    }

    static renderCastCrew(cast = [], crew = []) {
        const castList = cast.slice(0, 5).map(person =>
            `<p class="text-sm">${person.name} <span class="text-muted">as ${person.character || person.role}</span></p>`
        ).join('');

        const crewList = crew.slice(0, 3).map(person =>
            `<p class="text-sm">${person.name} <span class="text-muted">(${person.job || person.position})</span></p>`
        ).join('');

        return `
      ${castList || '<p class="text-muted">Cast information not available</p>'}
      ${crewList ? `<div class="mt-4">${crewList}</div>` : ''}
    `;
    }

    static initLoginPage() {
        // Login page specific functionality
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const username = formData.get('username');
                const password = formData.get('password');

                try {
                    await ApiService.login(username, password);

                    // Redirect based on user role
                    if (appState.user?.is_admin) {
                        window.location.href = '/admin/dashboard';
                    } else {
                        window.location.href = '/dashboard';
                    }
                } catch (error) {
                    UIComponents.showToast(error.message, 'error');
                }
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const userData = {
                    username: formData.get('username'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    preferred_languages: Array.from(formData.getAll('languages')),
                    preferred_genres: Array.from(formData.getAll('genres'))
                };

                try {
                    await ApiService.register(userData);
                    window.location.href = '/dashboard';
                } catch (error) {
                    UIComponents.showToast(error.message, 'error');
                }
            });
        }
    }

    static initGenericPage() {
        // Generic page initialization
        const path = window.location.pathname;

        if (path.startsWith('/categories/')) {
            this.initCategoryPage();
        } else if (path.startsWith('/languages/')) {
            this.initLanguagePage();
        } else if (path.startsWith('/user/')) {
            this.initUserPage();
        }
    }

    static async initCategoryPage() {
        const category = window.location.pathname.split('/').pop();
        const container = document.getElementById('content-grid');

        if (!container) return;

        try {
            let recommendations;

            switch (category) {
                case 'trending':
                    recommendations = await ApiService.getTrending();
                    break;
                case 'new-releases':
                    recommendations = await ApiService.getNewReleases();
                    break;
                case 'critics-choice':
                    recommendations = await ApiService.getCriticsChoice();
                    break;
                case 'movies':
                    recommendations = await ApiService.getTrending('movie');
                    break;
                case 'tv-shows':
                    recommendations = await ApiService.getTrending('tv');
                    break;
                case 'anime':
                    recommendations = await ApiService.getAnimeRecommendations();
                    break;
                default:
                    throw new Error('Unknown category');
            }

            this.renderContentGrid(recommendations.recommendations, container);
        } catch (error) {
            UIComponents.showError(container, 'Failed to load content');
        }
    }

    static async initLanguagePage() {
        const language = window.location.pathname.split('/').pop();
        const container = document.getElementById('content-grid');

        if (!container) return;

        try {
            const recommendations = await ApiService.getRegionalContent(language);
            this.renderContentGrid(recommendations.recommendations, container);
        } catch (error) {
            UIComponents.showError(container, 'Failed to load content');
        }
    }

    static async initUserPage() {
        const page = window.location.pathname.split('/').pop();
        const container = document.getElementById('content-grid');

        if (!container) return;

        if (!appState.authToken) {
            window.location.href = '/login';
            return;
        }

        try {
            let data;

            switch (page) {
                case 'watchlist':
                    data = await ApiService.getWatchlist();
                    this.renderContentGrid(data.watchlist, container);
                    break;
                case 'favorites':
                    data = await ApiService.getFavorites();
                    this.renderContentGrid(data.favorites, container);
                    break;
            }
        } catch (error) {
            UIComponents.showError(container, 'Failed to load content');
        }
    }

    static renderContentGrid(items, container) {
        container.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        ${items.map(item => UIComponents.createContentCard(item).outerHTML).join('')}
      </div>
    `;
    }
}

// Mobile Navigation
class MobileNav {
    static init() {
        const toggle = document.getElementById('mobile-menu-toggle');
        const menu = document.getElementById('nav-menu');

        if (!toggle || !menu) return;

        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
            toggle.setAttribute('aria-expanded', menu.classList.contains('active'));
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav') && menu.classList.contains('active')) {
                menu.classList.remove('active');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu when window is resized to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768 && menu.classList.contains('active')) {
                menu.classList.remove('active');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
}

// Performance Optimization
class PerformanceOptimizer {
    static init() {
        this.setupLazyLoading();
        this.setupImageOptimization();
        this.setupPrefetching();
    }

    static setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    static setupImageOptimization() {
        // Optimize images based on device pixel ratio and screen size
        const optimizeImage = (url, width = 300) => {
            if (!url || url.includes('placeholder')) return url;

            const dpr = window.devicePixelRatio || 1;
            const targetWidth = Math.round(width * dpr);

            if (url.includes('tmdb.org')) {
                return url.replace('/w500/', `/w${targetWidth}/`);
            }

            return url;
        };

        // Apply to all poster images
        document.querySelectorAll('.content-card-poster').forEach(img => {
            if (img.src) {
                img.src = optimizeImage(img.src, 200);
            }
        });
    }

    static setupPrefetching() {
        // Prefetch critical resources
        const prefetchResource = (url, type = 'fetch') => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            link.as = type;
            document.head.appendChild(link);
        };

        // Prefetch trending content
        if (window.location.pathname === '/') {
            setTimeout(() => {
                prefetchResource(`${API_BASE}/recommendations/trending`);
            }, 2000);
        }
    }
}

// Error Handling
class ErrorHandler {
    static init() {
        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.reportError(e.error);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.reportError(e.reason);
        });

        // API error handler
        appState.subscribe('errorChanged', (error) => {
            if (error) {
                this.handleApiError(error);
            }
        });
    }

    static handleApiError(error) {
        if (error.includes('401') || error.includes('Unauthorized')) {
            AuthManager.logout();
            UIComponents.showToast('Session expired. Please login again.', 'error');
        } else if (error.includes('403') || error.includes('Forbidden')) {
            UIComponents.showToast('Access denied', 'error');
        } else if (error.includes('404') || error.includes('Not found')) {
            UIComponents.showToast('Content not found', 'error');
        } else if (error.includes('500') || error.includes('Internal server error')) {
            UIComponents.showToast('Server error. Please try again later.', 'error');
        } else {
            UIComponents.showToast('Something went wrong. Please try again.', 'error');
        }
    }

    static reportError(error) {
        // In a production app, you would send this to your error tracking service
        console.error('Error reported:', error);
    }
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    AuthManager.init();
    SearchManager.init();
    MobileNav.init();
    PerformanceOptimizer.init();
    ErrorHandler.init();
    PageManager.init();

    // Setup loading state observer
    appState.subscribe('loadingChanged', (loading) => {
        document.body.classList.toggle('loading', loading);
    });

    // Setup keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key closes modals
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) {
                UIComponents.closeModal(activeModal.id);
            }
        }

        // Ctrl/Cmd + K opens search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });

    // Setup service worker for caching (if available)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    console.log('CineScope app initialized successfully!');
});

// Expose global functions for HTML onclick handlers
window.ContentManager = ContentManager;
window.VideoPlayer = VideoPlayer;
window.UIComponents = UIComponents;
window.AuthManager = AuthManager;
