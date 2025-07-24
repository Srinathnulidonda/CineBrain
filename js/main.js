// API Configuration
const API_BASE = 'https://backend-app-970m.onrender.com/api';

// Application State
const AppState = {
    user: null,
    isAuthenticated: false,
    searchCache: new Map(),
    contentCache: new Map(),
    currentPage: window.location.pathname,
    isLoading: false
};

// Utility Functions
const Utils = {
    // Debounce function for search
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

    // Format date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    },

    // Format rating
    formatRating(rating) {
        if (!rating) return 'N/A';
        return parseFloat(rating).toFixed(1);
    },

    // Truncate text
    truncateText(text, maxLength = 150) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    // Get image URL
    getImageUrl(path, size = 'w300') {
        if (!path) return 'https://via.placeholder.com/300x450?text=No+Image';
        if (path.startsWith('http')) return path;
        return `https://image.tmdb.org/t/p/${size}${path}`;
    },

    // Show loading
    showLoading(element) {
        if (element) {
            element.innerHTML = '<div class="loading-spinner-small"></div>';
        }
    },

    // Hide loading screen
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    },

    // Show toast notification
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-body">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle me-2"></i>
                ${message}
            </div>
        `;

        // Add to document
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    },

    // Navigate to page with content ID
    navigateToDetails(contentId) {
        localStorage.setItem('selectedContentId', contentId);
        window.location.href = `/details?id=${contentId}`;
    },

    // Get URL parameter
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    // Set URL parameter
    setUrlParameter(name, value) {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        window.history.pushState({}, '', url);
    }
};

// API Service
const ApiService = {
    // Make API request
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
            defaultOptions.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Authentication
    async login(credentials) {
        return await this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },

    async register(userData) {
        return await this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    // Content
    async search(query, type = 'multi', page = 1) {
        return await this.request(`/search?query=${encodeURIComponent(query)}&type=${type}&page=${page}`);
    },

    async getContentDetails(contentId) {
        return await this.request(`/content/${contentId}`);
    },

    // Recommendations
    async getTrending(type = 'all', limit = 20) {
        return await this.request(`/recommendations/trending?type=${type}&limit=${limit}`);
    },

    async getNewReleases(type = 'movie', limit = 20) {
        return await this.request(`/recommendations/new-releases?type=${type}&limit=${limit}`);
    },

    async getCriticsChoice(type = 'movie', limit = 20) {
        return await this.request(`/recommendations/critics-choice?type=${type}&limit=${limit}`);
    },

    async getRegional(language, type = 'movie', limit = 20) {
        return await this.request(`/recommendations/regional/${language}?type=${type}&limit=${limit}`);
    },

    async getAnime(genre = null, limit = 20) {
        const genreParam = genre ? `?genre=${genre}` : '';
        return await this.request(`/recommendations/anime${genreParam}&limit=${limit}`);
    },

    async getSimilar(contentId, limit = 20) {
        return await this.request(`/recommendations/similar/${contentId}?limit=${limit}`);
    },

    async getPersonalized(limit = 20) {
        return await this.request(`/recommendations/personalized?limit=${limit}`);
    },

    async getAnonymous(limit = 20) {
        return await this.request(`/recommendations/anonymous?limit=${limit}`);
    },

    // User interactions
    async recordInteraction(contentId, type, rating = null) {
        return await this.request('/interactions', {
            method: 'POST',
            body: JSON.stringify({
                content_id: contentId,
                interaction_type: type,
                rating
            })
        });
    },

    async getWatchlist() {
        return await this.request('/user/watchlist');
    },

    async getFavorites() {
        return await this.request('/user/favorites');
    }
};

// UI Components
const UIComponents = {
    // Create content card
    createContentCard(content) {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.onclick = () => Utils.navigateToDetails(content.id);

        const badges = [];
        if (content.is_trending) badges.push('<span class="badge badge-trending">Trending</span>');
        if (content.is_new_release) badges.push('<span class="badge badge-new">New</span>');
        if (content.is_critics_choice) badges.push('<span class="badge badge-critics">Critics Choice</span>');

        card.innerHTML = `
            <div class="content-card-poster">
                <img src="${Utils.getImageUrl(content.poster_path)}" 
                     alt="${content.title}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                <div class="content-card-overlay">
                    <button class="play-btn" onclick="event.stopPropagation(); UIComponents.playTrailer('${content.youtube_trailer || ''}')">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
                ${badges.length ? `<div class="content-card-badges">${badges.join('')}</div>` : ''}
            </div>
            <div class="content-card-info">
                <h6 class="content-card-title">${content.title}</h6>
                <div class="content-card-meta">
                    <span class="content-type">${content.content_type.toUpperCase()}</span>
                    <div class="content-card-rating">
                        <i class="fas fa-star"></i>
                        <span>${Utils.formatRating(content.rating)}</span>
                    </div>
                </div>
            </div>
        `;

        return card;
    },

    // Create carousel
    createCarousel(items, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'carousel-container';

        if (items.length === 0) {
            carouselContainer.innerHTML = '<p class="text-muted text-center py-4">No content available</p>';
        } else {
            items.forEach(item => {
                const card = this.createContentCard(item);
                carouselContainer.appendChild(card);
            });
        }

        container.innerHTML = '';
        container.appendChild(carouselContainer);

        // Add navigation if needed
        if (items.length > 5) {
            this.addCarouselNavigation(container, carouselContainer);
        }
    },

    // Add carousel navigation
    addCarouselNavigation(container, carouselContainer) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-nav carousel-nav-prev';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-nav carousel-nav-next';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

        prevBtn.onclick = () => {
            carouselContainer.scrollBy({ left: -220, behavior: 'smooth' });
        };

        nextBtn.onclick = () => {
            carouselContainer.scrollBy({ left: 220, behavior: 'smooth' });
        };

        container.style.position = 'relative';
        container.appendChild(prevBtn);
        container.appendChild(nextBtn);
    },

    // Play trailer
    playTrailer(youtubeUrl) {
        if (!youtubeUrl) {
            Utils.showToast('Trailer not available', 'error');
            return;
        }

        // Extract video ID from URL
        const videoId = youtubeUrl.includes('watch?v=') 
            ? youtubeUrl.split('watch?v=')[1].split('&')[0]
            : youtubeUrl.split('/').pop();

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'trailer-modal';
        modal.innerHTML = `
            <div class="trailer-modal-content">
                <button class="trailer-modal-close">&times;</button>
                <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                        frameborder="0" 
                        allowfullscreen></iframe>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('show');

        // Close modal
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        };

        modal.querySelector('.trailer-modal-close').onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    },

    // Create search suggestions
    createSearchSuggestions(results, container) {
        container.innerHTML = '';
        
        if (results.length === 0) {
            container.style.display = 'none';
            return;
        }

        results.slice(0, 5).forEach(item => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item';
            suggestion.onclick = () => Utils.navigateToDetails(item.id);

            suggestion.innerHTML = `
                <img src="${Utils.getImageUrl(item.poster_path, 'w92')}" 
                     alt="${item.title}" 
                     class="suggestion-poster"
                     onerror="this.src='https://via.placeholder.com/92x138?text=No+Image'">
                <div class="suggestion-details">
                    <h6>${item.title}</h6>
                    <p>${item.content_type.toUpperCase()} • ${Utils.formatRating(item.rating)}</p>
                </div>
            `;

            container.appendChild(suggestion);
        });

        container.style.display = 'block';
    }
};

// Authentication Manager
const AuthManager = {
    // Initialize authentication
    init() {
        this.checkAuthStatus();
        this.bindEvents();
    },

    // Check authentication status
    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');

        if (token && userData) {
            try {
                AppState.user = JSON.parse(userData);
                AppState.isAuthenticated = true;
                this.updateUI();
            } catch (error) {
                this.logout();
            }
        }
    },

    // Update UI based on auth status
    updateUI() {
        const userNavItem = document.getElementById('userNavItem');
        const loginNavItem = document.getElementById('loginNavItem');
        const userNameDisplay = document.getElementById('userNameDisplay');

        if (AppState.isAuthenticated && AppState.user) {
            if (userNavItem) userNavItem.style.display = 'block';
            if (loginNavItem) loginNavItem.style.display = 'none';
            if (userNameDisplay) userNameDisplay.textContent = AppState.user.username;
        } else {
            if (userNavItem) userNavItem.style.display = 'none';
            if (loginNavItem) loginNavItem.style.display = 'block';
        }
    },

    // Bind events
    bindEvents() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.logout();
        }
    },

    // Login
    async login(credentials) {
        try {
            const response = await ApiService.login(credentials);
            
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('userData', JSON.stringify(response.user));
            
            AppState.user = response.user;
            AppState.isAuthenticated = true;
            
            this.updateUI();
            Utils.showToast('Login successful!', 'success');
            
            // Redirect to dashboard or return URL
            const returnUrl = new URLSearchParams(window.location.search).get('return') || '/dashboard';
            window.location.href = returnUrl;
            
        } catch (error) {
            Utils.showToast('Login failed. Please check your credentials.', 'error');
            throw error;
        }
    },

    // Register
    async register(userData) {
        try {
            const response = await ApiService.register(userData);
            
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('userData', JSON.stringify(response.user));
            
            AppState.user = response.user;
            AppState.isAuthenticated = true;
            
            this.updateUI();
            Utils.showToast('Registration successful!', 'success');
            
            window.location.href = '/dashboard';
            
        } catch (error) {
            Utils.showToast('Registration failed. Please try again.', 'error');
            throw error;
        }
    },

    // Logout
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        AppState.user = null;
        AppState.isAuthenticated = false;
        
        this.updateUI();
        Utils.showToast('Logged out successfully', 'info');
        
        // Redirect to home if on protected page
        const protectedPages = ['/dashboard', '/profile', '/user/watchlist', '/user/favorites'];
        if (protectedPages.some(page => window.location.pathname.startsWith(page))) {
            window.location.href = '/';
        }
    },

    // Check if user is authenticated
    requireAuth() {
        if (!AppState.isAuthenticated) {
            const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?return=${currentUrl}`;
            return false;
        }
        return true;
    }
};

// Search Manager
const SearchManager = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        // Desktop search
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const searchSuggestions = document.getElementById('searchSuggestions');

        // Mobile search
        const mobileSearchToggle = document.getElementById('mobileSearchToggle');
        const mobileSearchBar = document.getElementById('mobileSearchBar');
        const mobileSearchInput = document.getElementById('mobileSearchInput');
        const mobileSearchBtn = document.getElementById('mobileSearchBtn');

        // Desktop search events
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.handleSearchInput(e.target.value, searchSuggestions);
            }, 300));

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }

        if (searchBtn) {
            searchBtn.onclick = () => {
                const query = searchInput ? searchInput.value : '';
                this.performSearch(query);
            };
        }

        // Mobile search events
        if (mobileSearchToggle) {
            mobileSearchToggle.onclick = () => {
                mobileSearchBar.classList.toggle('show');
                if (mobileSearchBar.classList.contains('show')) {
                    mobileSearchInput.focus();
                }
            };
        }

        if (mobileSearchInput) {
            mobileSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }

        if (mobileSearchBtn) {
            mobileSearchBtn.onclick = () => {
                const query = mobileSearchInput ? mobileSearchInput.value : '';
                this.performSearch(query);
            };
        }

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (searchSuggestions && !searchInput?.contains(e.target) && !searchSuggestions.contains(e.target)) {
                searchSuggestions.style.display = 'none';
            }
        });
    },

    async handleSearchInput(query, suggestionsContainer) {
        if (!query.trim() || query.length < 2) {
            if (suggestionsContainer) {
                suggestionsContainer.style.display = 'none';
            }
            return;
        }

        try {
            // Check cache first
            const cacheKey = `search_${query.toLowerCase()}`;
            let results = AppState.searchCache.get(cacheKey);

            if (!results) {
                const response = await ApiService.search(query, 'multi', 1);
                results = response.results || [];
                AppState.searchCache.set(cacheKey, results);
            }

            if (suggestionsContainer) {
                UIComponents.createSearchSuggestions(results, suggestionsContainer);
            }
        } catch (error) {
            console.error('Search suggestions failed:', error);
        }
    },

    performSearch(query) {
        if (!query.trim()) return;

        // Store search query and navigate to search page
        localStorage.setItem('searchQuery', query);
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
};

// Content Manager
const ContentManager = {
    // Load homepage content
    async loadHomepageContent() {
        try {
            // Load trending content
            const trending = await ApiService.getTrending('all', 20);
            UIComponents.createCarousel(trending.recommendations || [], 'trendingCarousel');

            // Load new releases
            const newReleases = await ApiService.getNewReleases('movie', 20);
            UIComponents.createCarousel(newReleases.recommendations || [], 'newReleasesCarousel');

            // Load critics choice
            const criticsChoice = await ApiService.getCriticsChoice('movie', 20);
            UIComponents.createCarousel(criticsChoice.recommendations || [], 'criticsChoiceCarousel');

            // Load regional content (Hindi by default)
            await this.loadRegionalContent('hindi');

            // Load anime
            const anime = await ApiService.getAnime(null, 20);
            UIComponents.createCarousel(anime.recommendations || [], 'animeCarousel');

        } catch (error) {
            console.error('Failed to load homepage content:', error);
            Utils.showToast('Failed to load content. Please refresh the page.', 'error');
        }
    },

    // Load regional content
    async loadRegionalContent(language) {
        try {
            const regional = await ApiService.getRegional(language, 'movie', 20);
            UIComponents.createCarousel(regional.recommendations || [], 'regionalCarousel');
        } catch (error) {
            console.error('Failed to load regional content:', error);
        }
    },

    // Bind regional language tabs
    bindRegionalTabs() {
        const languageTabs = document.querySelectorAll('.language-tabs .btn');
        languageTabs.forEach(tab => {
            tab.onclick = async () => {
                // Update active state
                languageTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Load content for selected language
                const language = tab.getAttribute('data-language');
                await this.loadRegionalContent(language);
            };
        });
    },

    // Load content details
    async loadContentDetails(contentId) {
        try {
            const response = await ApiService.getContentDetails(contentId);
            return response;
        } catch (error) {
            console.error('Failed to load content details:', error);
            throw error;
        }
    }
};

// Page-specific initialization
const PageInitializers = {
    // Initialize homepage
    async initHomepage() {
        await ContentManager.loadHomepageContent();
        ContentManager.bindRegionalTabs();

        // Hero section interactions
        const exploreBtn = document.getElementById('exploreBtn');
        if (exploreBtn) {
            exploreBtn.onclick = () => {
                document.querySelector('.content-sections').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            };
        }
    },

    // Initialize dashboard
    async initDashboard() {
        if (!AuthManager.requireAuth()) return;

        try {
            let recommendations;
            
            if (AppState.isAuthenticated) {
                // Try to get personalized recommendations
                try {
                    recommendations = await ApiService.getPersonalized(20);
                } catch (error) {
                    // Fallback to anonymous recommendations
                    recommendations = await ApiService.getAnonymous(20);
                }
            } else {
                recommendations = await ApiService.getAnonymous(20);
            }

            UIComponents.createCarousel(recommendations.recommendations || [], 'recommendationsCarousel');

            // Load continue watching, watchlist, etc.
            if (AppState.isAuthenticated) {
                await this.loadUserContent();
            }

        } catch (error) {
            console.error('Failed to load dashboard content:', error);
            Utils.showToast('Failed to load dashboard. Please refresh the page.', 'error');
        }
    },

    // Load user-specific content
    async loadUserContent() {
        try {
            // Load watchlist
            const watchlist = await ApiService.getWatchlist();
            if (watchlist.watchlist) {
                UIComponents.createCarousel(watchlist.watchlist, 'watchlistCarousel');
            }

            // Load favorites
            const favorites = await ApiService.getFavorites();
            if (favorites.favorites) {
                UIComponents.createCarousel(favorites.favorites, 'favoritesCarousel');
            }

        } catch (error) {
            console.error('Failed to load user content:', error);
        }
    },

    // Initialize details page
    async initDetailsPage() {
        const contentId = Utils.getUrlParameter('id') || localStorage.getItem('selectedContentId');
        
        if (!contentId) {
            Utils.showToast('Content not found', 'error');
            window.location.href = '/';
            return;
        }

        try {
            const content = await ContentManager.loadContentDetails(contentId);
            this.renderContentDetails(content);

            // Load similar content
            if (content.similar_content) {
                UIComponents.createCarousel(content.similar_content, 'similarCarousel');
            }

            // Record view interaction
            if (AppState.isAuthenticated) {
                try {
                    await ApiService.recordInteraction(contentId, 'view');
                } catch (error) {
                    console.error('Failed to record interaction:', error);
                }
            }

        } catch (error) {
            console.error('Failed to load content details:', error);
            Utils.showToast('Failed to load content details', 'error');
            window.location.href = '/';
        }
    },

    // Render content details
    renderContentDetails(content) {
        document.title = `${content.title} - CineScope`;

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = Utils.truncateText(content.overview, 160);
        }

        // Populate content details in the page
        // This would be implemented based on the details.html structure
        console.log('Content details:', content);
    }
};

// Global initialization
function initializeApp() {
    // Initialize core managers
    AuthManager.init();
    SearchManager.init();

    // Page-specific initialization
    const currentPage = window.location.pathname;

    if (currentPage === '/' || currentPage === '/index.html') {
        PageInitializers.initHomepage();
    } else if (currentPage === '/dashboard') {
        PageInitializers.initDashboard();
    } else if (currentPage === '/details') {
        PageInitializers.initDetailsPage();
    }

    // Hide loading screen
    setTimeout(() => {
        Utils.hideLoadingScreen();
    }, 1000);
}

// Initialize homepage specifically
function initializeHomepage() {
    initializeApp();
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Utils.showToast('An unexpected error occurred', 'error');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Utils.showToast('An unexpected error occurred', 'error');
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);