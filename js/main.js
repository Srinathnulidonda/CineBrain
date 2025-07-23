// Global Configuration
const CONFIG = {
    API_BASE: 'https://backend-app-970m.onrender.com/api',
    APP_NAME: 'CineScope',
    VERSION: '2.0.0',
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 500,
    IMAGE_PLACEHOLDER: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMkEyQTJBIi8+CjxwYXRoIGQ9Ik05MiAxMDBWMTgwSDEwOFYxMDBIOTJaTTEwMCA4NEMxMDQuNDE4IDg0IDEwOCA4Ny41ODE3IDEwOCA5MkMxMDggOTYuNDE4MyAxMDQuNDE4IDEwMCAxMDAgMTAwQzk1LjU4MTcgMTAwIDkyIDk2LjQxODMgOTIgOTJDOTIgODcuNTgxNyA5NS41ODE3IDg0IDEwMCA4NFoiIGZpbGw9IiM2QjcyODAiLz4KPC9zdmc+'
};

// Global State Management
class AppState {
    constructor() {
        this.user = null;
        this.token = null;
        this.cache = new Map();
        this.isLoading = false;
        this.currentRoute = '';
        this.preferences = {
            theme: 'dark',
            language: 'en',
            region: 'US'
        };
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
    }

    loadFromStorage() {
        try {
            const token = localStorage.getItem('auth_token');
            const user = localStorage.getItem('user_data');
            const preferences = localStorage.getItem('user_preferences');

            if (token) this.token = token;
            if (user) this.user = JSON.parse(user);
            if (preferences) this.preferences = { ...this.preferences, ...JSON.parse(preferences) };
        } catch (error) {
            console.error('Error loading from storage:', error);
            this.clearStorage();
        }
    }

    saveToStorage() {
        try {
            if (this.token) localStorage.setItem('auth_token', this.token);
            if (this.user) localStorage.setItem('user_data', JSON.stringify(this.user));
            localStorage.setItem('user_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    clearStorage() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_preferences');
        this.token = null;
        this.user = null;
    }

    setupEventListeners() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'auth_token' && !e.newValue) {
                this.clearStorage();
                window.location.href = '/login';
            }
        });
    }

    setUser(user, token) {
        this.user = user;
        this.token = token;
        this.saveToStorage();
        EventBus.emit('user:updated', user);
    }

    logout() {
        this.clearStorage();
        this.cache.clear();
        EventBus.emit('user:logout');
        window.location.href = '/login';
    }

    isAuthenticated() {
        return !!(this.token && this.user);
    }

    isAdmin() {
        return this.user && this.user.is_admin;
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }
}

// Event Bus for global communication
class EventBusClass {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

// API Service
class APIService {
    constructor() {
        this.baseURL = CONFIG.API_BASE;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    getAuthHeaders() {
        const headers = { ...this.defaultHeaders };
        if (appState.token) {
            headers['Authorization'] = `Bearer ${appState.token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            
            if (error.message.includes('401') || error.message.includes('Invalid token')) {
                appState.logout();
                return;
            }
            
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
        return this.request(`/search?${params}`);
    }

    async getContent(contentId) {
        return this.request(`/content/${contentId}`);
    }

    // Recommendations
    async getTrending(type = 'all', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return this.request(`/recommendations/trending?${params}`);
    }

    async getPopular(type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return this.request(`/recommendations/popular?${params}`);
    }

    async getNewReleases(language = null, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        if (language) params.append('language', language);
        return this.request(`/recommendations/new-releases?${params}`);
    }

    async getCriticsChoice(type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return this.request(`/recommendations/critics-choice?${params}`);
    }

    async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return this.request(`/recommendations/genre/${genre}?${params}`);
    }

    async getRegionalContent(language, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return this.request(`/recommendations/regional/${language}?${params}`);
    }

    async getAnimeRecommendations(genre = null, limit = 20) {
        const params = new URLSearchParams({ limit });
        if (genre) params.append('genre', genre);
        return this.request(`/recommendations/anime?${params}`);
    }

    async getSimilarContent(contentId, limit = 20) {
        const params = new URLSearchParams({ limit });
        return this.request(`/recommendations/similar/${contentId}?${params}`);
    }

    async getPersonalizedRecommendations() {
        return this.request('/recommendations/personalized');
    }

    async getAnonymousRecommendations(limit = 20) {
        const params = new URLSearchParams({ limit });
        return this.request(`/recommendations/anonymous?${params}`);
    }

    async getAdminChoice(type = 'admin_choice', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        return this.request(`/recommendations/admin-choice?${params}`);
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
        return this.request('/user/watchlist');
    }

    async getFavorites() {
        return this.request('/user/favorites');
    }

    // Admin APIs
    async adminSearch(query, source = 'tmdb', page = 1) {
        const params = new URLSearchParams({ query, source, page });
        return this.request(`/admin/search?${params}`);
    }

    async saveContent(contentData) {
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

    async getAdminRecommendations(page = 1, perPage = 20) {
        const params = new URLSearchParams({ page, per_page: perPage });
        return this.request(`/admin/recommendations?${params}`);
    }

    async getAnalytics() {
        return this.request('/admin/analytics');
    }

    async checkMLService() {
        return this.request('/admin/ml-service-check');
    }

    async updateMLService() {
        return this.request('/admin/ml-service-update', {
            method: 'POST'
        });
    }
}

// Utility Functions
const Utils = {
    // Debounce function
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

    // Throttle function
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
        }
    },

    // Format date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.getFullYear();
        } catch {
            return 'N/A';
        }
    },

    // Format runtime
    formatRuntime(minutes) {
        if (!minutes) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    },

    // Format rating
    formatRating(rating) {
        if (!rating) return 'N/A';
        return Math.round(rating * 10) / 10;
    },

    // Truncate text
    truncateText(text, length = 150) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    },

    // Generate placeholder image
    getPlaceholderImage(width = 300, height = 450) {
        return `data:image/svg+xml;base64,${btoa(`
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="${width}" height="${height}" fill="#2A2A2A"/>
                <path d="M${width/2-8} ${height/2-40}V${height/2+40}H${width/2+8}V${height/2-40}H${width/2-8}ZM${width/2} ${height/2-56}C${width/2+4.418} ${height/2-56} ${width/2+8} ${height/2-52.582} ${width/2+8} ${height/2-48}C${width/2+8} ${height/2-43.582} ${width/2+4.418} ${height/2-40} ${width/2} ${height/2-40}C${width/2-4.418} ${height/2-40} ${width/2-8} ${height/2-43.582} ${width/2-8} ${height/2-48}C${width/2-8} ${height/2-52.582} ${width/2-4.418} ${height/2-56} ${width/2} ${height/2-56}Z" fill="#6B7280"/>
            </svg>
        `)}`;
    },

    // Handle image loading errors
    handleImageError(img) {
        img.src = this.getPlaceholderImage();
        img.onerror = null;
    },

    // Lazy load images
    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.onerror = () => this.handleImageError(img);
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    },

    // Smooth scroll to element
    scrollToElement(selector, offset = 0) {
        const element = document.querySelector(selector);
        if (element) {
            const elementPosition = element.offsetTop - offset;
            window.scrollTo({
                top: elementPosition,
                behavior: 'smooth'
            });
        }
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            return result;
        }
    },

    // Generate random ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Sanitize HTML
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    // Parse URL parameters
    getURLParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    // Set URL parameter
    setURLParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.pushState({}, '', url);
    }
};

// UI Components
const UI = {
    // Show loading spinner
    showLoading(target = 'body') {
        const container = typeof target === 'string' ? document.querySelector(target) : target;
        if (!container) return;

        const loader = document.createElement('div');
        loader.className = 'flex items-center justify-center p-8';
        loader.innerHTML = `
            <div class="loader"></div>
        `;
        container.appendChild(loader);
        return loader;
    },

    // Hide loading spinner
    hideLoading(loader) {
        if (loader && loader.parentNode) {
            loader.parentNode.removeChild(loader);
        }
    },

    // Show skeleton loading
    showSkeleton(container, count = 6) {
        const skeletonHTML = Array(count).fill(0).map(() => `
            <div class="skeleton skeleton-card"></div>
        `).join('');
        
        container.innerHTML = skeletonHTML;
    },

    // Show toast notification
    showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
                <span class="toast-message">${Utils.sanitizeHTML(message)}</span>
                <button class="toast-close ml-auto" onclick="this.closest('.toast').remove()">×</button>
            </div>
        `;

        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        return toast;
    },

    getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    },

    // Show modal
    showModal(content, title = '') {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                ${title ? `
                    <div class="modal-header">
                        <h3 class="modal-title">${Utils.sanitizeHTML(title)}</h3>
                        <button class="modal-close">×</button>
                    </div>
                ` : ''}
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('.modal-close')?.addEventListener('click', () => this.hideModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideModal(modal);
        });

        // Show animation
        setTimeout(() => modal.classList.add('show'), 10);

        return modal;
    },

    // Hide modal
    hideModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    },

    // Show alert
    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span class="alert-icon">${this.getToastIcon(type)}</span>
            <span class="alert-message">${Utils.sanitizeHTML(message)}</span>
            <button class="alert-close ml-auto" onclick="this.closest('.alert').remove()">×</button>
        `;

        const container = document.querySelector('.alert-container') || document.body;
        container.insertBefore(alert, container.firstChild);

        return alert;
    },

    // Create movie card
    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => Router.navigate(`/details?id=${movie.id}`);

        const posterUrl = movie.poster_path || Utils.getPlaceholderImage();
        const rating = Utils.formatRating(movie.rating);
        const year = Utils.formatDate(movie.release_date);

        card.innerHTML = `
            <img data-src="${posterUrl}" alt="${Utils.sanitizeHTML(movie.title)}" class="skeleton">
            <div class="movie-card-overlay">
                <h3 class="movie-card-title">${Utils.sanitizeHTML(movie.title)}</h3>
                <div class="movie-card-meta">
                    ${rating !== 'N/A' ? `<span class="rating">⭐ ${rating}</span>` : ''}
                    ${year !== 'N/A' ? `<span class="year">${year}</span>` : ''}
                    <span class="type">${movie.content_type?.toUpperCase() || 'MOVIE'}</span>
                </div>
            </div>
        `;

        return card;
    },

    // Create content section
    createContentSection(title, content, seeMoreLink = null) {
        const section = document.createElement('section');
        section.className = 'section';
        
        section.innerHTML = `
            <div class="section-header">
                <div>
                    <h2 class="section-title">${Utils.sanitizeHTML(title)}</h2>
                </div>
                ${seeMoreLink ? `<a href="${seeMoreLink}" class="btn btn-ghost btn-sm">See More</a>` : ''}
            </div>
            <div class="content-grid">
                ${content}
            </div>
        `;

        return section;
    },

    // Initialize tabs
    initTabs(container) {
        const tabButtons = container.querySelectorAll('.tab-button');
        const tabPanels = container.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Update active states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));

                button.classList.add('active');
                const targetPanel = container.querySelector(`[data-panel="${targetTab}"]`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    },

    // Initialize dropdowns
    initDropdowns() {
        document.addEventListener('click', (e) => {
            const dropdown = e.target.closest('.dropdown');
            if (dropdown) {
                const toggle = e.target.closest('.dropdown-toggle');
                if (toggle) {
                    e.preventDefault();
                    dropdown.classList.toggle('open');
                    return;
                }
            }

            // Close all dropdowns when clicking outside
            document.querySelectorAll('.dropdown.open').forEach(dd => {
                dd.classList.remove('open');
            });
        });
    },

    // Initialize search
    initSearch(inputSelector, resultsSelector, searchFunction) {
        const input = document.querySelector(inputSelector);
        const results = document.querySelector(resultsSelector);
        
        if (!input || !results) return;

        const debouncedSearch = Utils.debounce(async (query) => {
            if (query.length < 2) {
                results.innerHTML = '';
                results.style.display = 'none';
                return;
            }

            try {
                results.style.display = 'block';
                this.showSkeleton(results, 3);
                
                const searchResults = await searchFunction(query);
                this.renderSearchResults(results, searchResults);
            } catch (error) {
                results.innerHTML = `<div class="p-4 text-center text-red-400">Search failed: ${error.message}</div>`;
            }
        }, CONFIG.DEBOUNCE_DELAY);

        input.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim());
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.style.display = 'none';
            }
        });
    },

    renderSearchResults(container, results) {
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-gray-400">No results found</div>';
            return;
        }

        const resultsHTML = results.map(item => `
            <div class="search-result-item flex items-center gap-3 p-3 hover:bg-gray-800 cursor-pointer" 
                 onclick="Router.navigate('/details?id=${item.id}')">
                <img src="${item.poster_path || Utils.getPlaceholderImage(60, 90)}" 
                     alt="${Utils.sanitizeHTML(item.title)}" 
                     class="w-12 h-18 object-cover rounded">
                <div class="flex-1 min-w-0">
                    <h4 class="font-medium truncate">${Utils.sanitizeHTML(item.title)}</h4>
                    <p class="text-sm text-gray-400 truncate">${Utils.formatDate(item.release_date)} • ${item.content_type?.toUpperCase()}</p>
                    ${item.rating ? `<span class="text-xs text-yellow-400">⭐ ${Utils.formatRating(item.rating)}</span>` : ''}
                </div>
            </div>
        `).join('');

        container.innerHTML = resultsHTML;
    }
};

// Router for navigation
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = '';
        this.init();
    }

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    }

    route(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname;
        const params = Utils.getURLParams();
        
        // Route matching
        let handler = this.routes[path];
        
        if (!handler) {
            // Try to match dynamic routes
            for (const route in this.routes) {
                if (route.includes(':')) {
                    const routeParts = route.split('/');
                    const pathParts = path.split('/');
                    
                    if (routeParts.length === pathParts.length) {
                        const routeParams = {};
                        let matches = true;
                        
                        for (let i = 0; i < routeParts.length; i++) {
                            if (routeParts[i].startsWith(':')) {
                                routeParams[routeParts[i].slice(1)] = pathParts[i];
                            } else if (routeParts[i] !== pathParts[i]) {
                                matches = false;
                                break;
                            }
                        }
                        
                        if (matches) {
                            handler = this.routes[route];
                            Object.assign(params, routeParams);
                            break;
                        }
                    }
                }
            }
        }

        if (handler) {
            this.currentRoute = path;
            handler(params);
        } else {
            this.handle404();
        }

        // Update navigation active states
        this.updateNavigation();
    }

    handle404() {
        document.body.innerHTML = `
            <div class="container mx-auto px-4 py-20 text-center">
                <h1 class="text-6xl font-bold text-primary mb-4">404</h1>
                <h2 class="text-2xl font-semibold mb-4">Page Not Found</h2>
                <p class="text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
                <a href="/" class="btn btn-primary">Go Home</a>
            </div>
        `;
    }

    updateNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === this.currentRoute) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

// Authentication Manager
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuthOnLoad();
        this.setupAuthForms();
    }

    checkAuthOnLoad() {
        const protectedRoutes = ['/dashboard', '/profile', '/user/', '/admin/'];
        const currentPath = window.location.pathname;
        
        const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
        
        if (isProtectedRoute && !appState.isAuthenticated()) {
            window.location.href = '/login';
            return;
        }

        if (currentPath === '/login' && appState.isAuthenticated()) {
            window.location.href = '/dashboard';
            return;
        }
    }

    setupAuthForms() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(new FormData(loginForm));
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister(new FormData(registerForm));
            });
        }

        // Logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.logout-btn')) {
                this.handleLogout();
            }
        });
    }

    async handleLogin(formData) {
        const username = formData.get('username');
        const password = formData.get('password');

        if (!username || !password) {
            UI.showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            const submitBtn = document.querySelector('#loginForm button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            const response = await api.login(username, password);
            
            appState.setUser(response.user, response.token);
            UI.showToast('Login successful!', 'success');
            
            // Redirect based on user role
            const redirectPath = appState.isAdmin() ? '/admin/dashboard' : '/dashboard';
            setTimeout(() => window.location.href = redirectPath, 1000);

        } catch (error) {
            UI.showToast(error.message || 'Login failed', 'error');
        } finally {
            const submitBtn = document.querySelector('#loginForm button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    }

    async handleRegister(formData) {
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            UI.showToast('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            UI.showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            UI.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        if (!Utils.validateEmail(email)) {
            UI.showToast('Please enter a valid email', 'error');
            return;
        }

        try {
            const submitBtn = document.querySelector('#registerForm button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            const userData = {
                username,
                email,
                password,
                preferred_languages: Array.from(document.querySelectorAll('input[name="languages"]:checked')).map(cb => cb.value),
                preferred_genres: Array.from(document.querySelectorAll('input[name="genres"]:checked')).map(cb => cb.value)
            };

            const response = await api.register(userData);
            
            appState.setUser(response.user, response.token);
            UI.showToast('Account created successfully!', 'success');
            
            setTimeout(() => window.location.href = '/dashboard', 1000);

        } catch (error) {
            UI.showToast(error.message || 'Registration failed', 'error');
        } finally {
            const submitBtn = document.querySelector('#registerForm button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    }

    handleLogout() {
        appState.logout();
        UI.showToast('Logged out successfully', 'success');
    }
}

// Content Manager
class ContentManager {
    constructor() {
        this.loadingStates = new Set();
    }

    async loadContent(endpoint, container, renderFunction, cacheKey = null) {
        if (this.loadingStates.has(container)) return;
        
        try {
            this.loadingStates.add(container);
            
            // Check cache first
            let data = null;
            if (cacheKey) {
                data = appState.getCache(cacheKey);
            }
            
            if (!data) {
                UI.showSkeleton(container);
                data = await api[endpoint]();
                
                if (cacheKey) {
                    appState.setCache(cacheKey, data);
                }
            }
            
            renderFunction(container, data);
            
        } catch (error) {
            console.error(`Error loading ${endpoint}:`, error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3 class="empty-state-title">Failed to load content</h3>
                    <p class="empty-state-description">${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
        } finally {
            this.loadingStates.delete(container);
        }
    }

    async recordInteraction(contentId, type, rating = null) {
        if (!appState.isAuthenticated()) return;
        
        try {
            await api.recordInteraction(contentId, type, rating);
        } catch (error) {
            console.error('Failed to record interaction:', error);
        }
    }

    renderMovieGrid(container, data) {
        const content = data.recommendations || data.results || data.watchlist || data.favorites || data;
        
        if (!content || content.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎬</div>
                    <h3 class="empty-state-title">No content found</h3>
                    <p class="empty-state-description">Try browsing other categories or check back later.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = content.map(item => {
            const card = UI.createMovieCard(item);
            return card.outerHTML;
        }).join('');

        // Initialize lazy loading for new images
        Utils.lazyLoadImages();
    }

    async loadHomepageContent() {
        const sections = [
            { key: 'trending', title: 'Trending Now', endpoint: 'getTrending' },
            { key: 'newReleases', title: 'New Releases', endpoint: 'getNewReleases' },
            { key: 'criticsChoice', title: 'Critics Choice', endpoint: 'getCriticsChoice' },
            { key: 'adminChoice', title: 'Admin Recommendations', endpoint: 'getAdminChoice' }
        ];

        const contentContainer = document.getElementById('homepage-content');
        if (!contentContainer) return;

        for (const section of sections) {
            try {
                const sectionContainer = document.createElement('div');
                sectionContainer.innerHTML = `
                    <section class="section">
                        <div class="section-header">
                            <h2 class="section-title">${section.title}</h2>
                            <a href="/categories/${section.key}" class="btn btn-ghost btn-sm">See More</a>
                        </div>
                        <div class="content-grid" id="${section.key}-grid"></div>
                    </section>
                `;
                contentContainer.appendChild(sectionContainer);

                const grid = document.getElementById(`${section.key}-grid`);
                await this.loadContent(section.endpoint, grid, this.renderMovieGrid.bind(this), section.key);
            } catch (error) {
                console.error(`Error loading ${section.title}:`, error);
            }
        }
    }
}

// Initialize Global Objects
const appState = new AppState();
const EventBus = new EventBusClass();
const api = new APIService();
const router = new Router();
const authManager = new AuthManager();
const contentManager = new ContentManager();

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Hide preloader
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('hidden');
            setTimeout(() => preloader.remove(), 500);
        }
    }, 1000);

    // Initialize UI components
    UI.initDropdowns();
    
    // Initialize lazy loading
    Utils.lazyLoadImages();
    
    // Setup search if on appropriate page
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        UI.initSearch('#searchInput', '#searchResults', async (query) => {
            const response = await api.search(query);
            return response.results || [];
        });
    }

    // Handle mobile menu
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
        });

        // Close mobile menu when clicking on links
        mobileMenu.addEventListener('click', (e) => {
            if (e.target.matches('a')) {
                mobileMenu.classList.remove('open');
            }
        });
    }

    // Update navbar on scroll
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', Utils.throttle(() => {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }, 100));
    }

    // Initialize page-specific functionality
    const currentPage = window.location.pathname;
    
    if (currentPage === '/' || currentPage === '/index') {
        contentManager.loadHomepageContent();
    }
});

// Export for use in other files
window.appState = appState;
window.api = api;
window.UI = UI;
window.Utils = Utils;
window.Router = router;
window.contentManager = contentManager;