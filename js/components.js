// API Configuration
const API_BASE = 'https://backend-app-970m.onrender.com/api';

// API Service Class
class APIService {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'Authorization': this.token ? `Bearer ${this.token}` : ''
        };
    }

    updateToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
        this.baseHeaders.Authorization = `Bearer ${token}`;
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('auth_token');
        delete this.baseHeaders.Authorization;
    }

    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${url}`, {
                ...options,
                headers: {
                    ...this.baseHeaders,
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication endpoints
    async login(credentials) {
        return this.makeRequest('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async register(userData) {
        return this.makeRequest('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Content endpoints
    async getHomepage() {
        return this.makeRequest('/homepage');
    }

    async getRecommendations() {
        return this.makeRequest('/recommendations');
    }

    async getPersonalizedRecommendations() {
        return this.makeRequest('/recommendations/personalized');
    }

    async getContentDetails(id) {
        return this.makeRequest(`/content/${id}/details`);
    }

    async searchContent(query) {
        return this.makeRequest(`/search?q=${encodeURIComponent(query)}`);
    }

    // User interactions
    async recordInteraction(data) {
        return this.makeRequest('/interact', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Admin endpoints
    async adminBrowseContent(params) {
        const queryString = new URLSearchParams(params).toString();
        return this.makeRequest(`/admin/enhanced-browse?${queryString}`);
    }

    async adminCreatePost(data) {
        return this.makeRequest('/admin/create-post', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async adminGetPosts() {
        return this.makeRequest('/admin/posts');
    }

    async adminAnalytics() {
        return this.makeRequest('/admin/analytics');
    }
}

// Initialize API service
const apiService = new APIService();

// UI Components
class UIComponents {
    static showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    static hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✓',
                        error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type]}</span>
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    static createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'movie-card animate-fadeIn';
        card.onclick = () => navigateToMovie(movie.id);
        
        const posterUrl = movie.poster_path || '/api/placeholder/200/300';
        const title = movie.title || movie.name || 'Unknown Title';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        const rating = movie.rating ? movie.rating.toFixed(1) : '';

        card.innerHTML = `
            <img src="${posterUrl}" alt="${title}" class="movie-card-poster" loading="lazy">
            <div class="movie-card-info">
                <h3 class="movie-card-title">${title}</h3>
                <div class="movie-card-meta">
                    <span class="movie-card-year">${year}</span>
                    ${rating ? `<span class="movie-card-rating">${rating}</span>` : ''}
                </div>
            </div>
        `;

        return card;
    }

    static createCuratedCard(item) {
        const card = document.createElement('div');
        card.className = 'curated-card animate-scaleIn';
        card.onclick = () => navigateToMovie(item.id);
        
        const imageUrl = item.poster_path || item.backdrop_path || '/api/placeholder/250/200';
        
        card.innerHTML = `
            <img src="${imageUrl}" alt="${item.title}" class="curated-card-image" loading="lazy">
            <div class="curated-card-content">
                <h3 class="curated-card-title">${item.admin_title || 'Staff Pick'}</h3>
                <h4 class="curated-card-subtitle">${item.title}</h4>
                <p class="curated-card-description">${item.admin_description || item.overview || ''}</p>
                ${item.custom_tags ? `
                    <div class="curated-card-tags">
                        ${item.custom_tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    static createContinueWatchingCard(item) {
        const card = document.createElement('div');
        card.className = 'continue-watching-card animate-slideInLeft';
        card.onclick = () => navigateToMovie(item.content_id);
        
        const posterUrl = item.poster_path || '/api/placeholder/300/180';
        const progress = item.progress || Math.random() * 80 + 10; // Mock progress
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${item.title}" class="continue-watching-poster" loading="lazy">
            <div class="continue-watching-info">
                <h3 class="continue-watching-title">${item.title}</h3>
                <div class="continue-watching-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <p class="continue-watching-time">${Math.floor(progress)}% watched</p>
            </div>
        `;

        return card;
    }

    static createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.onclick = () => openVideoModal(video);
        
        card.innerHTML = `
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                <button class="video-play-btn">▶</button>
            </div>
            <div class="video-info">
                <h4 class="video-title">${video.title}</h4>
                <p class="video-type">${video.type}</p>
            </div>
        `;

        return card;
    }

    static createCastCard(person) {
        const card = document.createElement('div');
        card.className = 'cast-card';
        
        const photoUrl = person.profile_path ? 
            `https://image.tmdb.org/t/p/w185${person.profile_path}` : 
            '/api/placeholder/120/120';
        
        card.innerHTML = `
            <img src="${photoUrl}" alt="${person.name}" class="cast-photo" loading="lazy">
            <h4 class="cast-name">${person.name}</h4>
            <p class="cast-character">${person.character || person.job || ''}</p>
        `;

        return card;
    }

    static createReviewCard(review) {
        const card = document.createElement('div');
        card.className = 'review-card';
        
        const userInitial = review.username ? review.username.charAt(0).toUpperCase() : 'U';
        const rating = review.rating || 0;
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        
        card.innerHTML = `
            <div class="review-header">
                <div class="review-user">
                    <div class="review-avatar">${userInitial}</div>
                    <span class="review-username">${review.username || 'Anonymous'}</span>
                </div>
                <div class="review-rating">${stars} ${rating}/5</div>
            </div>
            <p class="review-text">${review.review_text || 'No review text provided.'}</p>
            <p class="review-date">${new Date(review.created_at).toLocaleDateString()}</p>
        `;

        return card;
    }

    static createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'movie-card skeleton';
        card.innerHTML = `
            <div class="movie-card-poster skeleton"></div>
            <div class="movie-card-info">
                <div class="movie-card-title skeleton" style="height: 1.2rem; margin-bottom: 0.5rem;"></div>
                <div class="movie-card-meta skeleton" style="height: 1rem;"></div>
            </div>
        `;
        return card;
    }

    static createEmptyState(title, description, actionText = null, actionCallback = null) {
        const container = document.createElement('div');
        container.className = 'empty-state';
        
        container.innerHTML = `
            <div class="empty-state-icon">📽️</div>
            <h3 class="empty-state-title">${title}</h3>
            <p class="empty-state-description">${description}</p>
            ${actionText ? `<button class="btn-primary" onclick="${actionCallback}">${actionText}</button>` : ''}
        `;

        return container;
    }

    static createErrorState(title, description, actionText = 'Try Again', actionCallback = 'location.reload()') {
        const container = document.createElement('div');
        container.className = 'error-state';
        
        container.innerHTML = `
            <div class="error-state-icon">⚠️</div>
            <h3 class="error-state-title">${title}</h3>
            <p class="error-state-description">${description}</p>
            <button class="btn-primary" onclick="${actionCallback}">${actionText}</button>
        `;

        return container;
    }
}

// Carousel Management
class CarouselManager {
    constructor() {
        this.carousels = new Map();
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.isScrolling = false;
    }

    initializeCarousel(carouselId, trackId) {
        const carousel = document.getElementById(carouselId);
        const track = document.getElementById(trackId);
        
        if (!carousel || !track) return;

        this.carousels.set(carouselId, {
            carousel,
            track,
            currentIndex: 0,
            itemWidth: 220, // Default item width + gap
            visibleItems: this.calculateVisibleItems(carousel)
        });

        // Add touch event listeners
        track.addEventListener('touchstart', (e) => this.handleTouchStart(e, carouselId));
        track.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        track.addEventListener('touchend', (e) => this.handleTouchEnd(e, carouselId));

        // Add resize listener
        window.addEventListener('resize', () => this.updateVisibleItems(carouselId));
    }

    calculateVisibleItems(carousel) {
        const containerWidth = carousel.offsetWidth;
        return Math.floor(containerWidth / 220); // 200px card + 20px gap
    }

    updateVisibleItems(carouselId) {
        const carouselData = this.carousels.get(carouselId);
        if (carouselData) {
            carouselData.visibleItems = this.calculateVisibleItems(carouselData.carousel);
        }
    }

    scrollCarousel(carouselId, direction) {
        const carouselData = this.carousels.get(carouselId);
        if (!carouselData || this.isScrolling) return;

        const { track, currentIndex, itemWidth, visibleItems } = carouselData;
        const totalItems = track.children.length;
        const maxIndex = Math.max(0, totalItems - visibleItems);

        let newIndex = currentIndex + (direction * visibleItems);
        newIndex = Math.max(0, Math.min(newIndex, maxIndex));

        if (newIndex !== currentIndex) {
            this.isScrolling = true;
            carouselData.currentIndex = newIndex;
            
            const translateX = -newIndex * itemWidth;
            track.style.transform = `translateX(${translateX}px)`;

            setTimeout(() => {
                this.isScrolling = false;
            }, 300);
        }
    }

    handleTouchStart(e, carouselId) {
        this.touchStartX = e.touches[0].clientX;
    }

    handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling
    }

    handleTouchEnd(e, carouselId) {
        this.touchEndX = e.changedTouches[0].clientX;
        this.handleSwipe(carouselId);
    }

    handleSwipe(carouselId) {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next
                this.scrollCarousel(carouselId, 1);
            } else {
                // Swipe right - previous
                this.scrollCarousel(carouselId, -1);
            }
        }
    }

    populateCarousel(trackId, items, createCardFunction) {
        const track = document.getElementById(trackId);
        if (!track) return;

        // Clear existing content
        track.innerHTML = '';

        if (!items || items.length === 0) {
            const emptyState = UIComponents.createEmptyState(
                'No Content Available',
                'Check back later for new recommendations.'
            );
            track.appendChild(emptyState);
            return;
        }

        // Add items to carousel
        items.forEach(item => {
            const card = createCardFunction(item);
            track.appendChild(card);
        });

        // Initialize carousel if not already done
        const carouselId = trackId.replace('-track', '-carousel');
        if (!this.carousels.has(carouselId)) {
            this.initializeCarousel(carouselId, trackId);
        }
    }
}

// Initialize carousel manager
const carouselManager = new CarouselManager();

// Modal Management
class ModalManager {
    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Focus trap
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            
            // Stop any videos
            const videoContainer = modal.querySelector('#video-container');
            if (videoContainer) {
                videoContainer.innerHTML = '';
            }
        }
    }

    static closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
        document.body.style.overflow = '';
    }
}

// Search Management
class SearchManager {
    constructor() {
        this.searchTimeout = null;
        this.searchResults = [];
        this.isSearching = false;
    }

    initializeSearch() {
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        searchInput.addEventListener('focus', () => {
            if (this.searchResults.length > 0) {
                searchResults?.classList.remove('hidden');
            }
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults?.classList.add('hidden');
            }
        });
    }

    handleSearchInput(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.length < 2) {
            this.hideSearchResults();
            return;
        }

        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    async performSearch(query) {
        if (this.isSearching) return;
        
        this.isSearching = true;
        
        try {
            const results = await apiService.searchContent(query);
            this.searchResults = [
                ...(results.database_results || []),
                ...(results.tmdb_results || [])
            ];
            
            this.displaySearchResults();
        } catch (error) {
            console.error('Search failed:', error);
            UIComponents.showToast('Search failed. Please try again.', 'error');
        } finally {
            this.isSearching = false;
        }
    }

    displaySearchResults() {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        searchResults.innerHTML = '';

                if (this.searchResults.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
        } else {
            this.searchResults.slice(0, 8).forEach(item => {
                const resultItem = this.createSearchResultItem(item);
                searchResults.appendChild(resultItem);
            });
        }

        searchResults.classList.remove('hidden');
    }

    createSearchResultItem(item) {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.onclick = () => {
            this.hideSearchResults();
            navigateToMovie(item.id || item.tmdb_id);
        };

        const posterUrl = item.poster_path ? 
            (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w92${item.poster_path}`) :
            '/api/placeholder/50/75';
        
        const title = item.title || item.name || 'Unknown Title';
        const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
        const type = item.content_type || (item.first_air_date ? 'TV Show' : 'Movie');

        resultItem.innerHTML = `
            <img src="${posterUrl}" alt="${title}" class="search-result-poster" loading="lazy">
            <div class="search-result-info">
                <h4>${title} ${year ? `(${year})` : ''}</h4>
                <p>${type}</p>
            </div>
        `;

        return resultItem;
    }

    hideSearchResults() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.classList.add('hidden');
        }
    }
}

// Initialize search manager
const searchManager = new SearchManager();

// User Management
class UserManager {
    constructor() {
        this.currentUser = null;
        this.loadUserFromStorage();
    }

    loadUserFromStorage() {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                apiService.updateToken(token);
            } catch (error) {
                console.error('Failed to load user data:', error);
                this.logout();
            }
        }
    }

    async login(credentials) {
        try {
            UIComponents.showLoading();
            const response = await apiService.login(credentials);
            
            this.currentUser = {
                id: response.user_id,
                username: response.username
            };
            
            localStorage.setItem('user_data', JSON.stringify(this.currentUser));
            apiService.updateToken(response.token);
            
            UIComponents.showToast('Login successful!', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } catch (error) {
            console.error('Login failed:', error);
            UIComponents.showToast('Login failed. Please check your credentials.', 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    async register(userData) {
        try {
            UIComponents.showLoading();
            const response = await apiService.register(userData);
            
            this.currentUser = {
                id: response.user_id,
                username: response.username
            };
            
            localStorage.setItem('user_data', JSON.stringify(this.currentUser));
            apiService.updateToken(response.token);
            
            UIComponents.showToast('Registration successful!', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } catch (error) {
            console.error('Registration failed:', error);
            UIComponents.showToast('Registration failed. Please try again.', 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('user_data');
        apiService.clearToken();
        
        UIComponents.showToast('Logged out successfully', 'info');
        
        // Redirect to home
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    updateUserDisplay() {
        const usernameDisplay = document.getElementById('username-display');
        const userInitial = document.getElementById('user-initial');
        
        if (this.currentUser) {
            if (usernameDisplay) {
                usernameDisplay.textContent = this.currentUser.username;
            }
            if (userInitial) {
                userInitial.textContent = this.currentUser.username.charAt(0).toUpperCase();
            }
        }
    }

    async recordInteraction(contentId, interactionType, rating = null) {
        if (!this.isLoggedIn()) return;

        try {
            await apiService.recordInteraction({
                content_id: contentId,
                interaction_type: interactionType,
                rating: rating
            });
        } catch (error) {
            console.error('Failed to record interaction:', error);
        }
    }
}

// Initialize user manager
const userManager = new UserManager();

// Navigation Functions
function navigateToMovie(movieId) {
    if (movieId) {
        window.location.href = `movie-detail.html?id=${movieId}`;
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function scrollCarousel(carouselId, direction) {
    carouselManager.scrollCarousel(carouselId, direction);
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value.trim()) {
        searchManager.performSearch(searchInput.value.trim());
    }
}

// Modal Functions
function openModal(modalId) {
    ModalManager.openModal(modalId);
}

function closeModal(modalId) {
    ModalManager.closeModal(modalId);
}

function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    const title = document.getElementById('video-title');
    const container = document.getElementById('video-container');
    
    if (modal && title && container) {
        title.textContent = video.title;
        
        // Create YouTube embed
        const videoId = video.video_id || video.url.split('v=')[1]?.split('&')[0];
        if (videoId) {
            container.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                    frameborder="0" 
                    allowfullscreen
                    allow="autoplay; encrypted-media">
                </iframe>
            `;
        }
        
        ModalManager.openModal('video-modal');
    }
}

// Authentication Functions
function logout() {
    userManager.logout();
}

// Mobile Menu Functions
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar')) {
                mobileMenuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
    }
}

// User Menu Functions
function initializeUserMenu() {
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            userDropdown.classList.add('hidden');
        });
    }
}

// Tab Management
function initializeTabs() {
    // Content tabs
    const contentTabs = document.querySelectorAll('.tab-btn');
    contentTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            contentTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Handle tab content switching
            const tabType = tab.dataset.tab;
            handleTabSwitch(tabType);
        });
    });
    
    // Regional tabs
    const regionalTabs = document.querySelectorAll('.regional-tab');
    regionalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            regionalTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Handle regional content switching
            const region = tab.dataset.region;
            handleRegionalSwitch(region);
        });
    });
}

function handleTabSwitch(tabType) {
    // This will be implemented in app.js based on current page context
    console.log('Tab switched to:', tabType);
}

function handleRegionalSwitch(region) {
    // This will be implemented in app.js based on current page context
    console.log('Regional content switched to:', region);
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatRuntime(minutes) {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function getGenreNames(genreIds) {
    const genreMap = {
        28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
        99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
        27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
        10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
    };
    
    return genreIds.map(id => genreMap[id] || 'Unknown').filter(Boolean);
}

// Error Handling
function handleError(error, context = 'Operation') {
    console.error(`${context} failed:`, error);
    
    let message = 'Something went wrong. Please try again.';
    
    if (error.message.includes('401')) {
        message = 'Please log in to continue.';
        userManager.logout();
    } else if (error.message.includes('403')) {
        message = 'You do not have permission to perform this action.';
    } else if (error.message.includes('404')) {
        message = 'The requested content was not found.';
    } else if (error.message.includes('500')) {
        message = 'Server error. Please try again later.';
    }
    
    UIComponents.showToast(message, 'error');
}

// Intersection Observer for Lazy Loading
function initializeLazyLoading() {
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

    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
}

// Performance Monitoring
function initializePerformanceMonitoring() {
    // Monitor page load time
    window.addEventListener('load', () => {
        const loadTime = performance.now();
        console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
        
        // Report slow loads
        if (loadTime > 3000) {
            console.warn('Slow page load detected');
        }
    });
    
    // Monitor API response times
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const start = performance.now();
        return originalFetch.apply(this, args).then(response => {
            const duration = performance.now() - start;
            console.log(`API call to ${args[0]} took ${duration.toFixed(2)}ms`);
            return response;
        });
    };
}

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeMobileMenu();
    initializeUserMenu();
    initializeTabs();
    searchManager.initializeSearch();
    userManager.updateUserDisplay();
    initializeLazyLoading();
    initializePerformanceMonitoring();
    
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ModalManager.closeAllModals();
        }
    });
    
    // Handle back button for modals
    window.addEventListener('popstate', () => {
        ModalManager.closeAllModals();
    });
});

// Export for use in other files
window.UIComponents = UIComponents;
window.carouselManager = carouselManager;
window.ModalManager = ModalManager;
window.searchManager = searchManager;
window.userManager = userManager;
window.apiService = apiService;