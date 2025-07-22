// Netflix-Inspired Movie Platform - Main JavaScript
class MoviePlatform {
    constructor() {
        this.API_BASE = 'https://backend-app-970m.onrender.com/api';
        this.currentUser = null;
        this.authToken = null;
        this.searchTimeout = null;
        this.loadingStates = new Set();
        this.cache = new Map();
        this.currentPage = 'home';
        this.init();
    }

    // Initialize the application
    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.setupIntersectionObserver();
        this.setupServiceWorker();
        this.preloadCriticalContent();
    }

    // Authentication Methods
    async checkAuthStatus() {
        // Since we're not using localStorage, check if user data exists in memory
        if (this.currentUser && this.authToken) {
            this.showAuthenticatedState();
        } else {
            this.showUnauthenticatedState();
        }
    }

    async login(username, password) {
        try {
            this.setLoadingState('login', true);
            
            const response = await this.apiCall('/login', 'POST', {
                username,
                password
            });

            if (response.token) {
                this.authToken = response.token;
                this.currentUser = response.user;
                this.showAuthenticatedState();
                this.showNotification('Login successful!', 'success');
                this.navigateTo('dashboard');
                return true;
            }
        } catch (error) {
            this.showNotification(error.message || 'Login failed', 'error');
            return false;
        } finally {
            this.setLoadingState('login', false);
        }
    }

    async register(userData) {
        try {
            this.setLoadingState('register', true);
            
            const response = await this.apiCall('/register', 'POST', userData);

            if (response.token) {
                this.authToken = response.token;
                this.currentUser = response.user;
                this.showAuthenticatedState();
                this.showNotification('Registration successful!', 'success');
                this.navigateTo('dashboard');
                return true;
            }
        } catch (error) {
            this.showNotification(error.message || 'Registration failed', 'error');
            return false;
        } finally {
            this.setLoadingState('register', false);
        }
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        this.cache.clear();
        this.showUnauthenticatedState();
        this.navigateTo('home');
        this.showNotification('Logged out successfully', 'info');
    }

    // API Methods
    async apiCall(endpoint, method = 'GET', data = null, useAuth = true) {
        const url = `${this.API_BASE}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (useAuth && this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // Content Methods
    async searchContent(query, type = 'multi', page = 1) {
        if (!query.trim()) return [];

        const cacheKey = `search_${query}_${type}_${page}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(
                `/search?query=${encodeURIComponent(query)}&type=${type}&page=${page}`,
                'GET',
                null,
                false
            );

            this.cache.set(cacheKey, response.results);
            return response.results || [];
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    }

    async getContentDetails(contentId) {
        const cacheKey = `content_${contentId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiCall(`/content/${contentId}`, 'GET', null, false);
            this.cache.set(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get content details:', error);
            throw error;
        }
    }

    async getRecommendations(type, options = {}) {
        const cacheKey = `recommendations_${type}_${JSON.stringify(options)}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            let endpoint = `/recommendations/${type}`;
            const params = new URLSearchParams();

            Object.entries(options).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value);
                }
            });

            if (params.toString()) {
                endpoint += `?${params.toString()}`;
            }

            const response = await this.apiCall(endpoint, 'GET', null, type === 'personalized');
            const recommendations = response.recommendations || [];
            
            this.cache.set(cacheKey, recommendations);
            return recommendations;
        } catch (error) {
            console.error('Failed to get recommendations:', error);
            return [];
        }
    }

    async recordInteraction(contentId, interactionType, rating = null) {
        if (!this.currentUser) return;

        try {
            await this.apiCall('/interactions', 'POST', {
                content_id: contentId,
                interaction_type: interactionType,
                rating
            });
        } catch (error) {
            console.error('Failed to record interaction:', error);
        }
    }

    // UI Methods
    showAuthenticatedState() {
        const authElements = document.querySelectorAll('[data-auth="true"]');
        const noAuthElements = document.querySelectorAll('[data-auth="false"]');
        
        authElements.forEach(el => el.classList.remove('hidden'));
        noAuthElements.forEach(el => el.classList.add('hidden'));

        // Update user info
        const userElements = document.querySelectorAll('[data-user-info]');
        userElements.forEach(el => {
            const info = el.dataset.userInfo;
            if (this.currentUser && this.currentUser[info]) {
                el.textContent = this.currentUser[info];
            }
        });
    }

    showUnauthenticatedState() {
        const authElements = document.querySelectorAll('[data-auth="true"]');
        const noAuthElements = document.querySelectorAll('[data-auth="false"]');
        
        authElements.forEach(el => el.classList.add('hidden'));
        noAuthElements.forEach(el => el.classList.remove('hidden'));
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add notification styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1000;
                    max-width: 400px;
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    box-shadow: var(--shadow-lg);
                    animation: slideInRight 0.3s ease;
                }
                .notification-success { background: #10b981; color: white; }
                .notification-error { background: #ef4444; color: white; }
                .notification-warning { background: #f59e0b; color: white; }
                .notification-info { background: var(--primary-blue); color: white; }
                .notification-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: currentColor;
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0;
                    opacity: 0.8;
                }
                .notification-close:hover { opacity: 1; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    showModal(content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <button class="modal-close">&times;</button>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close handlers
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        return modal;
    }

    setLoadingState(component, loading) {
        if (loading) {
            this.loadingStates.add(component);
        } else {
            this.loadingStates.delete(component);
        }

        // Update UI loading indicators
        const loadingElement = document.querySelector(`[data-loading="${component}"]`);
        if (loadingElement) {
            loadingElement.classList.toggle('loading', loading);
        }
    }

    // Content Rendering Methods
    renderContentGrid(container, contents, options = {}) {
        if (!container) return;

        const {
            showSkeletons = false,
            skeletonCount = 12,
            emptyMessage = 'No content found',
            onContentClick = null
        } = options;

        if (showSkeletons) {
            container.innerHTML = Array(skeletonCount).fill().map(() => `
                <div class="content-card skeleton skeleton-card"></div>
            `).join('');
            return;
        }

        if (!contents || contents.length === 0) {
            container.innerHTML = `
                <div class="empty-state text-center">
                    <p class="text-muted">${emptyMessage}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = contents.map(content => `
            <div class="content-card" data-content-id="${content.id}">
                <img 
                    class="content-card-image" 
                    src="${content.poster_path || '/assets/images/placeholder.jpg'}"
                    alt="${content.title}"
                    loading="lazy"
                    onerror="this.src='/assets/images/placeholder.jpg'"
                >
                <div class="content-card-content">
                    <h3 class="content-card-title">${content.title}</h3>
                    <div class="content-card-meta">
                        ${content.rating ? `
                            <span class="content-card-rating">
                                ⭐ ${content.rating.toFixed(1)}
                            </span>
                        ` : ''}
                        <span class="badge badge-primary">${content.content_type}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.content-card').forEach(card => {
            card.addEventListener('click', () => {
                const contentId = card.dataset.contentId;
                if (onContentClick) {
                    onContentClick(contentId);
                } else {
                    this.showContentDetails(contentId);
                }
            });
        });
    }

    renderCarousel(container, contents, options = {}) {
        if (!container || !contents || contents.length === 0) return;

        const {
            showControls = true,
            autoPlay = false,
            autoPlayDelay = 5000
        } = options;

        container.innerHTML = `
            <div class="carousel">
                ${showControls ? '<button class="carousel-controls carousel-prev">‹</button>' : ''}
                <div class="carousel-track">
                    ${contents.map(content => `
                        <div class="content-card" data-content-id="${content.id}">
                            <img 
                                class="content-card-image" 
                                src="${content.poster_path || '/assets/images/placeholder.jpg'}"
                                alt="${content.title}"
                                loading="lazy"
                            >
                            <div class="content-card-content">
                                <h3 class="content-card-title">${content.title}</h3>
                                <div class="content-card-meta">
                                    ${content.rating ? `<span class="content-card-rating">⭐ ${content.rating.toFixed(1)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${showControls ? '<button class="carousel-controls carousel-next">›</button>' : ''}
            </div>
        `;

        this.initializeCarousel(container.querySelector('.carousel'), { autoPlay, autoPlayDelay });
    }

    initializeCarousel(carousel, options = {}) {
        if (!carousel) return;

        const track = carousel.querySelector('.carousel-track');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');
        const cards = track.querySelectorAll('.content-card');
        
        if (!track || cards.length === 0) return;

        let currentIndex = 0;
        const cardWidth = cards[0].offsetWidth + 16; // 16px gap
        const visibleCards = Math.floor(carousel.offsetWidth / cardWidth);
        const maxIndex = Math.max(0, cards.length - visibleCards);

        const updateCarousel = () => {
            const translateX = -currentIndex * cardWidth;
            track.style.transform = `translateX(${translateX}px)`;
            
            if (prevBtn) prevBtn.disabled = currentIndex === 0;
            if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
        };

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateCarousel();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentIndex < maxIndex) {
                    currentIndex++;
                    updateCarousel();
                }
            });
        }

        // Touch/swipe support
        let startX = 0;
        let isDragging = false;

        track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });

        track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
        });

        track.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;

            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;

            if (Math.abs(diff) > 50) {
                if (diff > 0 && currentIndex < maxIndex) {
                    currentIndex++;
                } else if (diff < 0 && currentIndex > 0) {
                    currentIndex--;
                }
                updateCarousel();
            }
        });

        // Auto play
        if (options.autoPlay) {
            setInterval(() => {
                if (currentIndex >= maxIndex) {
                    currentIndex = 0;
                } else {
                    currentIndex++;
                }
                updateCarousel();
            }, options.autoPlayDelay || 5000);
        }

        // Add click handlers for content cards
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const contentId = card.dataset.contentId;
                this.showContentDetails(contentId);
            });
        });

        updateCarousel();
    }

    async showContentDetails(contentId) {
        try {
            this.setLoadingState('content-details', true);
            
            const content = await this.getContentDetails(contentId);
            
            // Record view interaction
            this.recordInteraction(contentId, 'view');

            const modalContent = `
                <div class="content-details">
                    <div class="content-details-header">
                        <div class="content-details-poster">
                            <img src="${content.poster_path || '/assets/images/placeholder.jpg'}" alt="${content.title}">
                        </div>
                        <div class="content-details-info">
                            <h1 class="content-details-title">${content.title}</h1>
                            ${content.original_title && content.original_title !== content.title ? 
                                `<p class="content-details-original">${content.original_title}</p>` : ''
                            }
                            <div class="content-details-meta">
                                <span class="badge badge-primary">${content.content_type}</span>
                                ${content.rating ? `<span class="content-details-rating">⭐ ${content.rating.toFixed(1)}</span>` : ''}
                                ${content.release_date ? `<span>${new Date(content.release_date).getFullYear()}</span>` : ''}
                                ${content.runtime ? `<span>${content.runtime} min</span>` : ''}
                            </div>
                            <div class="content-details-genres">
                                ${(content.genres || []).map(genre => `<span class="badge">${genre}</span>`).join('')}
                            </div>
                            <div class="content-details-actions">
                                ${this.currentUser ? `
                                    <button class="btn btn-primary" onclick="app.addToWatchlist(${content.id})">
                                        Add to Watchlist
                                    </button>
                                    <button class="btn btn-secondary" onclick="app.addToFavorites(${content.id})">
                                        ❤️ Favorite
                                    </button>
                                ` : `
                                    <button class="btn btn-primary" onclick="app.navigateTo('login')">
                                        Login to Add to Watchlist
                                    </button>
                                `}
                                ${content.youtube_trailer ? `
                                    <button class="btn btn-outline" onclick="app.playTrailer('${content.youtube_trailer}')">
                                        ▶️ Trailer
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="content-details-body">
                        ${content.overview ? `
                            <div class="content-details-section">
                                <h3>Synopsis</h3>
                                <p>${content.overview}</p>
                            </div>
                        ` : ''}
                        ${content.cast && content.cast.length > 0 ? `
                            <div class="content-details-section">
                                <h3>Cast</h3>
                                <div class="cast-grid">
                                    ${content.cast.slice(0, 6).map(actor => `
                                        <div class="cast-member">
                                            <img src="${actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : '/assets/images/avatar-placeholder.jpg'}" alt="${actor.name}">
                                            <div class="cast-info">
                                                <div class="cast-name">${actor.name}</div>
                                                <div class="cast-character">${actor.character || actor.known_for_department}</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${content.similar_content && content.similar_content.length > 0 ? `
                            <div class="content-details-section">
                                <h3>Similar Content</h3>
                                <div class="similar-content-grid">
                                    ${content.similar_content.slice(0, 6).map(similar => `
                                        <div class="content-card" onclick="app.showContentDetails(${similar.id})">
                                            <img src="${similar.poster_path || '/assets/images/placeholder.jpg'}" alt="${similar.title}">
                                            <div class="content-card-content">
                                                <h4 class="content-card-title">${similar.title}</h4>
                                                ${similar.rating ? `<span class="content-card-rating">⭐ ${similar.rating.toFixed(1)}</span>` : ''}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            // Add styles for content details if not present
            if (!document.querySelector('#content-details-styles')) {
                const styles = document.createElement('style');
                styles.id = 'content-details-styles';
                styles.textContent = `
                    .content-details-header {
                        display: flex;
                        gap: 2rem;
                        margin-bottom: 2rem;
                    }
                    .content-details-poster img {
                        width: 200px;
                        height: 300px;
                        object-fit: cover;
                        border-radius: var(--radius-lg);
                    }
                    .content-details-info {
                        flex: 1;
                    }
                    .content-details-title {
                        font-size: 2rem;
                        margin-bottom: 0.5rem;
                    }
                    .content-details-original {
                        color: var(--text-muted);
                        margin-bottom: 1rem;
                    }
                    .content-details-meta {
                        display: flex;
                        gap: 1rem;
                        margin-bottom: 1rem;
                        flex-wrap: wrap;
                        align-items: center;
                    }
                    .content-details-rating {
                        color: var(--primary-blue-light);
                        font-weight: 600;
                    }
                    .content-details-genres {
                        display: flex;
                        gap: 0.5rem;
                        margin-bottom: 1.5rem;
                        flex-wrap: wrap;
                    }
                    .content-details-actions {
                        display: flex;
                        gap: 1rem;
                        flex-wrap: wrap;
                    }
                    .content-details-section {
                        margin-bottom: 2rem;
                    }
                    .content-details-section h3 {
                        margin-bottom: 1rem;
                        color: var(--text-primary);
                    }
                    .cast-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 1rem;
                    }
                    .cast-member {
                        text-align: center;
                    }
                    .cast-member img {
                        width: 100%;
                        height: 150px;
                        object-fit: cover;
                        border-radius: var(--radius-md);
                        margin-bottom: 0.5rem;
                    }
                    .cast-name {
                        font-weight: 600;
                        font-size: 0.9rem;
                    }
                    .cast-character {
                        font-size: 0.8rem;
                        color: var(--text-muted);
                    }
                    .similar-content-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                        gap: 1rem;
                    }
                    @media (max-width: 640px) {
                        .content-details-header {
                            flex-direction: column;
                            text-align: center;
                        }
                        .content-details-poster img {
                            width: 150px;
                            height: 225px;
                            margin: 0 auto;
                        }
                        .content-details-actions {
                            justify-content: center;
                        }
                    }
                `;
                document.head.appendChild(styles);
            }

            this.showModal(modalContent, { size: 'large' });

        } catch (error) {
            this.showNotification('Failed to load content details', 'error');
        } finally {
            this.setLoadingState('content-details', false);
        }
    }

    playTrailer(youtubeUrl) {
        if (youtubeUrl) {
            window.open(youtubeUrl, '_blank');
        }
    }

    async addToWatchlist(contentId) {
        if (!this.currentUser) {
            this.showNotification('Please login to add to watchlist', 'warning');
            return;
        }

        try {
            await this.recordInteraction(contentId, 'watchlist');
            this.showNotification('Added to watchlist!', 'success');
        } catch (error) {
            this.showNotification('Failed to add to watchlist', 'error');
        }
    }

    async addToFavorites(contentId) {
        if (!this.currentUser) {
            this.showNotification('Please login to add to favorites', 'warning');
            return;
        }

        try {
            await this.recordInteraction(contentId, 'favorite');
            this.showNotification('Added to favorites!', 'success');
        } catch (error) {
            this.showNotification('Failed to add to favorites', 'error');
        }
    }

    // Navigation
    navigateTo(page, params = {}) {
        // Update URL without page reload
        const url = new URL(window.location);
        url.pathname = page === 'home' ? '/' : `/${page}`;
        
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });

        window.history.pushState({ page, params }, '', url);
        this.currentPage = page;
        this.loadPage(page, params);
    }

    async loadPage(page, params = {}) {
        const container = document.getElementById('main-content');
        if (!container) return;

        // Update active navigation
        document.querySelectorAll('.navbar-nav a').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Load page content
        try {
            switch (page) {
                case 'home':
                case 'dashboard':
                    await this.loadHomePage();
                    break;
                case 'search':
                    await this.loadSearchPage(params.query);
                    break;
                case 'trending':
                    await this.loadCategoryPage('trending', 'Trending Now');
                    break;
                case 'popular':
                    await this.loadCategoryPage('popular', 'Popular');
                    break;
                case 'new-releases':
                    await this.loadCategoryPage('new-releases', 'New Releases');
                    break;
                case 'critics-choice':
                    await this.loadCategoryPage('critics-choice', 'Critics Choice');
                    break;
                case 'movies':
                    await this.loadCategoryPage('genre', 'Movies', { type: 'movie' });
                    break;
                case 'tv-shows':
                    await this.loadCategoryPage('genre', 'TV Shows', { type: 'tv' });
                    break;
                case 'anime':
                    await this.loadCategoryPage('anime', 'Anime');
                    break;
                case 'watchlist':
                    await this.loadWatchlistPage();
                    break;
                case 'favorites':
                    await this.loadFavoritesPage();
                    break;
                default:
                    container.innerHTML = '<h1>Page Not Found</h1>';
            }
        } catch (error) {
            console.error('Failed to load page:', error);
            container.innerHTML = '<h1>Error loading page</h1>';
        }
    }

    async loadHomePage() {
        const container = document.getElementById('main-content');
        
        // Show loading state
        container.innerHTML = `
            <section class="hero-section">
                <div class="hero" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/assets/images/hero-bg.jpg')">
                    <div class="container">
                        <div class="hero-content">
                            <h1 class="hero-title">Discover Your Next Favorite</h1>
                            <p class="hero-description">
                                Explore millions of movies, TV shows, and anime with personalized recommendations
                                powered by advanced AI technology.
                            </p>
                            <div class="hero-actions">
                                ${this.currentUser ? `
                                    <button class="btn btn-primary btn-lg" onclick="app.navigateTo('dashboard')">
                                        Go to Dashboard
                                    </button>
                                ` : `
                                    <button class="btn btn-primary btn-lg" onclick="app.navigateTo('login')">
                                        Get Started
                                    </button>
                                `}
                                <button class="btn btn-outline btn-lg" onclick="app.navigateTo('trending')">
                                    Explore Trending
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div class="container">
                <section class="section">
                    <div class="section-header">
                        <div>
                            <h2 class="section-title">Trending Now</h2>
                            <p class="section-subtitle">What everyone's watching</p>
                        </div>
                        <button class="btn btn-outline" onclick="app.navigateTo('trending')">View All</button>
                    </div>
                    <div id="trending-carousel" class="loading">
                        <div class="carousel">
                            <div class="carousel-track">
                                ${Array(8).fill().map(() => '<div class="content-card skeleton skeleton-card"></div>').join('')}
                            </div>
                        </div>
                    </div>
                </section>

                <section class="section">
                    <div class="section-header">
                        <div>
                            <h2 class="section-title">New Releases</h2>
                            <p class="section-subtitle">Fresh content just added</p>
                        </div>
                        <button class="btn btn-outline" onclick="app.navigateTo('new-releases')">View All</button>
                    </div>
                    <div id="new-releases-carousel" class="loading">
                        <div class="carousel">
                            <div class="carousel-track">
                                ${Array(8).fill().map(() => '<div class="content-card skeleton skeleton-card"></div>').join('')}
                            </div>
                        </div>
                    </div>
                </section>

                <section class="section">
                    <div class="section-header">
                        <div>
                            <h2 class="section-title">Critics' Choice</h2>
                            <p class="section-subtitle">Highly rated by critics</p>
                        </div>
                        <button class="btn btn-outline" onclick="app.navigateTo('critics-choice')">View All</button>
                    </div>
                    <div id="critics-choice-carousel" class="loading">
                        <div class="carousel">
                            <div class="carousel-track">
                                ${Array(8).fill().map(() => '<div class="content-card skeleton skeleton-card"></div>').join('')}
                            </div>
                        </div>
                    </div>
                </section>

                ${this.currentUser ? `
                    <section class="section">
                        <div class="section-header">
                            <div>
                                <h2 class="section-title">Recommended for You</h2>
                                <p class="section-subtitle">Based on your preferences</p>
                            </div>
                        </div>
                        <div id="personalized-carousel" class="loading">
                            <div class="carousel">
                                <div class="carousel-track">
                                    ${Array(8).fill().map(() => '<div class="content-card skeleton skeleton-card"></div>').join('')}
                                </div>
                            </div>
                        </div>
                    </section>
                ` : ''}
            </div>
        `;

        // Load content for carousels
        try {
            const [trending, newReleases, criticsChoice, personalized] = await Promise.all([
                this.getRecommendations('trending', { limit: 20 }),
                this.getRecommendations('new-releases', { limit: 20 }),
                this.getRecommendations('critics-choice', { limit: 20 }),
                this.currentUser ? this.getRecommendations('personalized', { limit: 20 }) : Promise.resolve([])
            ]);

            this.renderCarousel(document.getElementById('trending-carousel'), trending);
            this.renderCarousel(document.getElementById('new-releases-carousel'), newReleases);
            this.renderCarousel(document.getElementById('critics-choice-carousel'), criticsChoice);
            
            if (this.currentUser && personalized.length > 0) {
                this.renderCarousel(document.getElementById('personalized-carousel'), personalized);
            }
        } catch (error) {
            console.error('Failed to load home page content:', error);
        }
    }

    async loadCategoryPage(category, title, options = {}) {
        const container = document.getElementById('main-content');
        
        container.innerHTML = `
            <div class="container">
                <section class="section">
                    <div class="section-header">
                        <div>
                            <h1 class="section-title">${title}</h1>
                            <p class="section-subtitle">Discover amazing content</p>
                        </div>
                    </div>
                    <div id="category-grid" class="grid grid-auto">
                        ${Array(24).fill().map(() => '<div class="content-card skeleton skeleton-card"></div>').join('')}
                    </div>
                    <div class="text-center mt-8">
                        <button id="load-more-btn" class="btn btn-outline" style="display: none;">
                            Load More
                        </button>
                    </div>
                </section>
            </div>
        `;

        try {
            const content = await this.getRecommendations(category, { limit: 24, ...options });
            this.renderContentGrid(document.getElementById('category-grid'), content, {
                emptyMessage: `No ${title.toLowerCase()} found`
            });

            // Show load more button if there are results
            if (content.length > 0) {
                document.getElementById('load-more-btn').style.display = 'block';
            }
        } catch (error) {
            console.error(`Failed to load ${category} content:`, error);
            document.getElementById('category-grid').innerHTML = `
                <div class="empty-state text-center">
                    <p class="text-muted">Failed to load content. Please try again.</p>
                </div>
            `;
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Mobile menu toggle
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const navbarNav = document.querySelector('.navbar-nav');
        
        if (mobileMenuToggle && navbarNav) {
            mobileMenuToggle.addEventListener('click', () => {
                navbarNav.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar') && navbarNav) {
                navbarNav.classList.remove('active');
            }
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.performSearch(e.target.value);
                }, 300);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.navigateTo('search', { query: e.target.value });
                }
            });
        }

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const state = e.state || {};
            this.loadPage(state.page || 'home', state.params || {});
        });

        // Navbar scroll effect
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (!navbar) return;

            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            // Hide/show navbar on scroll
            if (window.scrollY > lastScrollY && window.scrollY > 200) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
            lastScrollY = window.scrollY;
        });

        // Login form handling
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(loginForm);
                const success = await this.login(
                    formData.get('username'),
                    formData.get('password')
                );
                if (success) {
                    loginForm.reset();
                }
            });
        }

        // Register form handling
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

                const success = await this.register(userData);
                if (success) {
                    registerForm.reset();
                }
            });
        }

        // Logout handling
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="logout"]')) {
                e.preventDefault();
                this.logout();
            }
        });

        // Navigation handling
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]')) {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.navigateTo(page);
            }
        });
    }

    async performSearch(query) {
        if (!query.trim()) {
            this.hideSearchResults();
            return;
        }

        try {
            const results = await this.searchContent(query);
            this.showSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    showSearchResults(results) {
        let resultsContainer = document.getElementById('search-results');
        
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'search-results';
            resultsContainer.className = 'search-results';
            document.querySelector('.search-container').appendChild(resultsContainer);
        }

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
            return;
        }

        resultsContainer.innerHTML = results.slice(0, 8).map(result => `
            <div class="search-result-item" data-content-id="${result.id}">
                <img 
                    class="search-result-image" 
                    src="${result.poster_path || '/assets/images/placeholder.jpg'}"
                    alt="${result.title}"
                    onerror="this.src='/assets/images/placeholder.jpg'"
                >
                <div class="search-result-content">
                    <div class="search-result-title">${result.title}</div>
                    <div class="search-result-meta">
                        ${result.content_type} • ${result.rating ? `⭐ ${result.rating.toFixed(1)}` : 'No rating'}
                        ${result.release_date ? ` • ${new Date(result.release_date).getFullYear()}` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const contentId = item.dataset.contentId;
                this.showContentDetails(contentId);
                this.hideSearchResults();
            });
        });
    }

    hideSearchResults() {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.remove();
        }
    }

    // Progressive Loading & Performance
    setupIntersectionObserver() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });

        // Observe all images with data-src
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        });
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
    }

    preloadCriticalContent() {
        // Preload trending content
        this.getRecommendations('trending', { limit: 20 });
        
        // Preload fonts
        const fontLinks = [
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
        ];
        
        fontLinks.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = href;
            document.head.appendChild(link);
        });
    }
}

// Initialize the application
const app = new MoviePlatform();

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    app.showNotification('Something went wrong. Please refresh the page.', 'error');
});

// Expose app globally for HTML onclick handlers
window.app = app;
