/**
 * CineBrain Trending Page Manager
 * Integrated with content-card system and theme management
 * Updated with small top-right notification system and TrailerModal
 */

class TrendingPageManager {
    constructor() {
        // API Configuration - Same as other components
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.posterBase = 'https://image.tmdb.org/t/p/w500';
        this.backdropBase = 'https://image.tmdb.org/t/p/w1280';

        // Authentication state
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;
        this.currentUser = this.getCurrentUser();

        // User data
        this.userWishlist = new Set();
        this.contentCache = new Map();
        this.interactionStates = new Map();

        // Loading states
        this.isLoadingHero = false;
        this.isLoadingTop10 = false;

        // Content row configurations for trending page
        this.contentRows = [
            {
                id: 'trending-movies',
                title: '🔥 Trending Movies',
                endpoint: '/recommendations/trending',
                params: { category: 'movies', limit: 20 }
            },
            {
                id: 'trending-tv',
                title: '📺 Trending TV Shows',
                endpoint: '/recommendations/trending',
                params: { category: 'tv_shows', limit: 20 }
            },
            {
                id: 'trending-anime',
                title: '🎌 Trending Anime',
                endpoint: '/recommendations/anime',
                params: { limit: 20 }
            },
            {
                id: 'rising-fast',
                title: '⚡ Rising Fast',
                endpoint: '/recommendations/new-releases',
                params: { type: 'movie', limit: 20 }
            },
            {
                id: 'popular-nearby',
                title: '🌍 Popular in Your Region',
                endpoint: '/recommendations/trending',
                params: { category: 'all', limit: 20, region: 'IN' }
            },
            {
                id: 'critics-choice',
                title: '🏆 Critics Choice',
                endpoint: '/recommendations/critics-choice',
                params: { type: 'movie', limit: 20 }
            }
        ];

        // Register with theme manager if available
        if (window.themeManager) {
            window.themeManager.register((theme) => this.onThemeChange(theme));
        }

        this.init();
    }

    /**
     * Custom notification system - Small, Top Right positioned
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Remove any existing notifications first
        const existingNotifications = document.querySelectorAll('.trending-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `trending-notification trending-notification-${type}`;

        // Define colors based on type
        const colors = {
            success: {
                bg: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'rgba(5, 150, 105, 0.3)',
                icon: '✓'
            },
            error: {
                bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'rgba(220, 38, 38, 0.3)',
                icon: '✕'
            },
            warning: {
                bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'rgba(217, 119, 6, 0.3)',
                icon: '⚠'
            },
            info: {
                bg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'rgba(37, 99, 235, 0.3)',
                icon: 'ℹ'
            }
        };

        const config = colors[type] || colors.info;

        // Small notification at top right
        notification.style.cssText = `
            position: fixed;
            top: calc(var(--navbar-height, 60px) + 20px);
            right: 20px;
            background: ${config.bg};
            color: white;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid ${config.border};
            max-width: 280px;
            min-width: 200px;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.4;
            cursor: pointer;
            transition: all 0.2s ease;
            transform-origin: right top;
        `;

        // Add icon and message
        notification.innerHTML = `
            <span style="
                font-size: 14px;
                font-weight: 600;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                line-height: 1;
            ">${config.icon}</span>
            <span style="
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            ">${message}</span>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Add CSS animations if not already present
        if (!document.getElementById('trending-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'trending-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
                
                .trending-notification:hover {
                    transform: scale(1.02);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
                }
                
                .trending-notification:active {
                    transform: scale(0.98);
                }
                
                /* Mobile adjustments */
                @media (max-width: 768px) {
                    .trending-notification {
                        top: calc(var(--navbar-height, 60px) + 10px) !important;
                        right: 10px !important;
                        max-width: calc(100vw - 80px) !important;
                        font-size: 12px !important;
                        padding: 8px 14px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .trending-notification {
                        max-width: calc(100vw - 60px) !important;
                        font-size: 11px !important;
                        padding: 8px 12px !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Auto remove after duration
        const removeNotification = () => {
            notification.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        };

        const timeoutId = setTimeout(removeNotification, duration);

        // Click to dismiss
        notification.addEventListener('click', () => {
            clearTimeout(timeoutId);
            removeNotification();
        });
    }

    /**
     * Get current user from localStorage
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('cinebrain-user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('Error parsing user data:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Theme change callback from Theme Manager
     */
    onThemeChange(theme) {
        console.log('Trending page theme updated to:', theme);

        // Re-initialize feather icons if needed
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Update any dynamic theme-dependent elements
        this.updateThemeElements();
    }

    /**
     * Update theme-dependent elements
     */
    updateThemeElements() {
        // Update any elements that need manual theme updates
        const heroButtons = document.querySelectorAll('.hero-btn');
        heroButtons.forEach(btn => {
            // Force repaint for gradient updates
            btn.style.transform = 'translateZ(0)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 0);
        });
    }

    /**
     * Initialize the trending page
     */
    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * Setup the trending page
     */
    async setup() {
        try {
            // Show loading states
            this.showHeroSkeleton();
            this.showTop10Skeleton();

            // Load user wishlist if authenticated
            if (this.isAuthenticated) {
                await this.loadUserWishlist();
            }

            // Load hero content first (priority)
            await this.loadHeroContent();

            // Create content rows using same system as content-card
            this.createContentRows();

            // Load all content with staggered loading
            await this.loadAllContent();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            console.log('Trending page setup completed successfully');

        } catch (error) {
            console.error('Error setting up trending page:', error);
            this.showHeroError();
        }
    }

    /**
     * Load user wishlist
     */
    async loadUserWishlist() {
        if (!this.isAuthenticated) return;

        try {
            const response = await fetch(`${this.apiBase}/user/watchlist`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.userWishlist.clear();
                this.interactionStates.clear();

                if (data.watchlist && Array.isArray(data.watchlist)) {
                    data.watchlist.forEach(item => {
                        this.userWishlist.add(item.id);
                        this.interactionStates.set(item.id, 'watchlist');
                    });
                }
                console.log('Loaded wishlist with', this.userWishlist.size, 'items');

                // Update all wishlist buttons after loading
                this.updateWishlistButtons();
            } else if (response.status === 401) {
                // Token might be expired
                console.error('Authentication failed, clearing token');
                localStorage.removeItem('cinebrain-token');
                this.authToken = null;
                this.isAuthenticated = false;
                this.userWishlist.clear();
                this.interactionStates.clear();
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    }

    /**
     * Sync wishlist state with backend
     */
    async syncWishlistState() {
        if (!this.isAuthenticated) {
            this.userWishlist.clear();
            this.interactionStates.clear();
            this.updateWishlistButtons();
            return;
        }

        try {
            await this.loadUserWishlist();
        } catch (error) {
            console.error('Error syncing wishlist state:', error);
        }
    }

    /**
     * Show hero skeleton loading state
     */
    showHeroSkeleton() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;

        heroContent.innerHTML = `
            <div class="hero-skeleton hero-title-skeleton"></div>
            <div class="hero-skeleton hero-info-skeleton"></div>
            <div class="hero-skeleton hero-description-skeleton"></div>
            <div class="hero-actions">
                <div class="hero-skeleton" style="width: 120px; height: 44px; border-radius: 8px;"></div>
                <div class="hero-skeleton" style="width: 100px; height: 44px; border-radius: 8px;"></div>
                <div class="hero-skeleton" style="width: 110px; height: 44px; border-radius: 8px;"></div>
            </div>
        `;
    }

    /**
     * Show top 10 skeleton loading state
     */
    showTop10Skeleton() {
        const top10List = document.getElementById('top10List');
        if (!top10List) return;

        top10List.innerHTML = Array(10).fill('').map((_, index) => `
            <div class="top10-skeleton">
                <div class="top10-rank-skeleton"></div>
                <div class="top10-poster-skeleton"></div>
                <div class="top10-details-skeleton">
                    <div class="top10-title-skeleton"></div>
                    <div class="top10-meta-skeleton"></div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load hero content
     */
    async loadHeroContent() {
        if (this.isLoadingHero) return;
        this.isLoadingHero = true;

        try {
            const response = await fetch(`${this.apiBase}/recommendations/trending?category=all&limit=1`);
            if (!response.ok) throw new Error('Failed to fetch hero content');

            const data = await response.json();
            let heroContent = null;

            // Handle different response structures
            if (data.categories) {
                // Get first item from any category
                for (const categoryItems of Object.values(data.categories)) {
                    if (Array.isArray(categoryItems) && categoryItems.length > 0) {
                        heroContent = categoryItems[0];
                        break;
                    }
                }
            } else if (data.recommendations && data.recommendations.length > 0) {
                heroContent = data.recommendations[0];
            }

            if (heroContent) {
                await this.displayHeroContent(heroContent);
            } else {
                throw new Error('No hero content available');
            }

        } catch (error) {
            console.error('Error loading hero content:', error);
            this.showHeroError();
        } finally {
            this.isLoadingHero = false;
        }
    }

    /**
     * Display hero content with trailer button
     */
    async displayHeroContent(content) {
        try {
            // Set backdrop image with loading
            await this.loadHeroBackdrop(content);

            // Update hero content with animation
            const heroContent = document.querySelector('.hero-content');
            if (!heroContent) return;

            const isInWishlist = this.userWishlist.has(content.id);
            const rating = this.formatRating(content.rating);
            const year = this.extractYear(content.release_date);
            const genres = content.genres?.slice(0, 2).join(' • ') || 'Action';
            const contentType = (content.content_type || 'Movie').toUpperCase();

            heroContent.innerHTML = `
                <span class="hero-badge">
                    🔥 #1 Trending
                </span>
                <h1 class="hero-title">${this.escapeHtml(content.title || 'Untitled')}</h1>
                <div class="hero-info">
                    <span>⭐ ${rating}</span>
                    <span>${contentType}</span>
                    ${year ? `<span>${year}</span>` : ''}
                    <span>${genres}</span>
                </div>
                <p class="hero-description">${this.escapeHtml(content.overview || 'No description available.')}</p>
                <div class="hero-actions">
                    <button class="hero-btn hero-btn-trailer" id="heroTrailerBtn">
                        ▶ Trailer
                    </button>
                    <button class="hero-btn hero-btn-secondary ${isInWishlist ? 'added' : ''}" id="heroWatchlistBtn" data-content-id="${content.id}">
                        ${isInWishlist ? '✓ In List' : '+ My List'}
                    </button>
                    <button class="hero-btn hero-btn-secondary" id="heroInfoBtn">
                        ⓘ More Info
                    </button>
                </div>
            `;

            // Setup button event listeners
            this.setupHeroButtons(content);

        } catch (error) {
            console.error('Error displaying hero content:', error);
            this.showHeroError();
        }
    }

    /**
     * Load hero backdrop image
     */
    async loadHeroBackdrop(content) {
        return new Promise((resolve) => {
            const heroBackdrop = document.getElementById('heroBackdrop');
            if (!heroBackdrop) {
                resolve();
                return;
            }

            if (content.backdrop_path || content.poster_path) {
                const backdropUrl = content.backdrop_path
                    ? `${this.backdropBase}${content.backdrop_path}`
                    : this.formatPosterUrl(content.poster_path);

                const img = new Image();
                img.onload = () => {
                    heroBackdrop.src = backdropUrl;
                    heroBackdrop.classList.add('loaded');
                    resolve();
                };
                img.onerror = () => {
                    console.warn('Failed to load hero backdrop');
                    resolve();
                };
                img.src = backdropUrl;
            } else {
                resolve();
            }
        });
    }

    /**
     * Setup hero button event listeners
     */
    setupHeroButtons(content) {
        const trailerBtn = document.getElementById('heroTrailerBtn');
        const watchlistBtn = document.getElementById('heroWatchlistBtn');
        const infoBtn = document.getElementById('heroInfoBtn');

        if (trailerBtn) {
            trailerBtn.addEventListener('click', () => this.playTrailer(content));
        }

        if (watchlistBtn) {
            watchlistBtn.addEventListener('click', () => this.handleWishlistClick(content.id, watchlistBtn));
        }

        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.redirectToDetails(content));
        }
    }

    /**
     * Play trailer for content using the TrailerModal
     */
    async playTrailer(content) {
        try {
            // Check if TrailerModal is available
            if (!window.TrailerModal) {
                console.error('TrailerModal not initialized');
                this.showNotification('Trailer player not available', 'error');
                return;
            }

            // If content has an ID and content_type, fetch from backend
            if (content.id && content.content_type) {
                await window.TrailerModal.open(content.id, content.content_type);
            }
            // If content has YouTube trailer URL or ID
            else if (content.youtube_trailer || content.youtube_trailer_id) {
                const videoIdOrUrl = content.youtube_trailer || content.youtube_trailer_id;
                await window.TrailerModal.openByVideoId(videoIdOrUrl, content.title);
            }
            // Fallback to YouTube search
            else {
                this.fallbackToYouTubeSearch(content);
            }

        } catch (error) {
            console.error('Error playing trailer:', error);
            this.showNotification('Unable to load trailer', 'error');
            this.fallbackToYouTubeSearch(content);
        }
    }

    /**
     * Fallback to YouTube search when trailer is not available
     */
    fallbackToYouTubeSearch(content) {
        const searchQuery = encodeURIComponent(`${content.title} ${content.content_type || 'movie'} trailer`);
        const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

        this.showNotification('Trailer not found. Opening YouTube search...', 'info', 3000);

        setTimeout(() => {
            window.open(youtubeSearchUrl, '_blank');
        }, 1000);
    }

    /**
     * Show hero error state
     */
    showHeroError() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;

        heroContent.innerHTML = `
            <div class="error-hero">
                <h2>Unable to Load Content</h2>
                <p>Please check your connection and try again</p>
                <button class="retry-hero-btn" onclick="trendingManager.loadHeroContent()">
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Create content rows
     */
    createContentRows() {
        const container = document.getElementById('content-container');
        if (!container) return;

        this.contentRows.forEach(rowConfig => {
            const row = this.createCarouselRow(rowConfig);
            container.appendChild(row);
        });
    }

    /**
     * Create carousel row (same as content-card)
     */
    createCarouselRow(rowConfig) {
        const row = document.createElement('div');
        row.className = 'content-row';
        row.id = rowConfig.id;

        row.innerHTML = `
            <div class="row-header">
                <h2 class="row-title">${rowConfig.title}</h2>
                <a href="/browse/${rowConfig.id}" class="see-all">See All →</a>
            </div>
            <div class="carousel-container">
                <button class="carousel-nav prev" aria-label="Previous">
                    <svg viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                <div class="carousel-wrapper">
                    ${this.createSkeletons(8)}
                </div>
                <button class="carousel-nav next" aria-label="Next">
                    <svg viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            </div>
        `;

        return row;
    }

    /**
     * Create skeleton loading cards
     */
    createSkeletons(count) {
        return Array(count).fill('').map(() => `
            <div class="skeleton-card">
                <div class="skeleton skeleton-poster"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-meta"></div>
            </div>
        `).join('');
    }

    /**
     * Load all content with staggered loading
     */
    async loadAllContent() {
        try {
            // Load content rows with staggered timing
            for (let i = 0; i < this.contentRows.length; i++) {
                const rowConfig = this.contentRows[i];
                setTimeout(() => {
                    this.loadContentRow(rowConfig);
                }, i * 200); // Increased delay for better UX
            }

            // Load top 10 list
            setTimeout(() => {
                this.loadTop10List();
            }, this.contentRows.length * 200);

        } catch (error) {
            console.error('Error loading all content:', error);
        }
    }

    /**
     * Load content row (same as content-card)
     */
    async loadContentRow(rowConfig) {
        const row = document.getElementById(rowConfig.id);
        if (!row) return;

        const wrapper = row.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        try {
            const content = await this.fetchContent(rowConfig.endpoint, rowConfig.params);

            wrapper.innerHTML = '';

            if (!content || content.length === 0) {
                wrapper.innerHTML = `
                    <div class="error-message">
                        <p>No content available</p>
                    </div>
                `;
                return;
            }

            // Add content cards
            content.forEach(item => {
                const card = this.createContentCard(item);
                wrapper.appendChild(card);
            });

            // Setup navigation
            this.setupCarouselNavigation(row);

        } catch (error) {
            console.error(`Error loading ${rowConfig.title}:`, error);
            wrapper.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load content</h3>
                    <p>Please check your connection and try again</p>
                    <button class="retry-btn" onclick="trendingManager.loadContentRow(${JSON.stringify(rowConfig).replace(/"/g, '&quot;')})">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Create content card with trailer button
     */
    createContentCard(content) {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.dataset.contentId = content.id;

        const posterUrl = this.formatPosterUrl(content.poster_path);
        const rating = this.formatRating(content.rating);
        const year = this.extractYear(content.release_date);
        const genres = content.genres?.slice(0, 2) || [];
        const contentType = content.content_type || 'movie';
        const runtime = this.formatRuntime(content.runtime);
        const isInWishlist = this.userWishlist.has(content.id);

        card.innerHTML = `
            <div class="card-poster-container">
                <img 
                    class="card-poster" 
                    data-src="${posterUrl}" 
                    alt="${this.escapeHtml(content.title || 'Content')}"
                    loading="lazy"
                >
                <div class="content-type-badge ${contentType}">
                    ${contentType.toUpperCase()}
                </div>
                <div class="card-overlays">
                    <div class="card-top-overlay">
                        <div></div>
                        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                                data-content-id="${content.id}" 
                                title="${isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}"
                                aria-label="${isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-bottom-overlay">
                        <div class="rating-badge">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                            </svg>
                            <span>${rating}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-info">
                <div class="card-title">${this.escapeHtml(content.title || 'Unknown')}</div>
                <div class="card-meta">
                    ${year ? `<span class="card-year">${year}</span>` : ''}
                    ${runtime ? `<span class="card-runtime">• ${runtime}</span>` : ''}
                </div>
                ${genres.length > 0 ? `
                    <div class="card-genres">
                        ${genres.map(genre => `<span class="genre-chip">${this.escapeHtml(genre)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Setup event handlers
        this.setupCardHandlers(card, content);
        this.setupLazyLoading(card);

        return card;
    }

    /**
     * Setup card event handlers
     */
    setupCardHandlers(card, content) {
        // Card click handler - redirect to details page
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.wishlist-btn')) {
                this.redirectToDetails(content);
            }
        });

        // Wishlist button handler
        const wishlistBtn = card.querySelector('.wishlist-btn');
        wishlistBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleWishlistClick(content.id, wishlistBtn);
        });
    }

    /**
     * Setup lazy loading for images
     */
    setupLazyLoading(card) {
        const img = card.querySelector('.card-poster');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const imgSrc = img.dataset.src;
                    if (imgSrc) {
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            img.src = imgSrc;
                            img.classList.add('loaded');
                        };
                        tempImg.onerror = () => {
                            img.src = this.getPlaceholderImage();
                            img.classList.add('loaded');
                        };
                        tempImg.src = imgSrc;
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.01
        });
        observer.observe(img);
    }

    /**
     * Load top 10 list
     */
    async loadTop10List() {
        if (this.isLoadingTop10) return;
        this.isLoadingTop10 = true;

        try {
            const response = await fetch(`${this.apiBase}/recommendations/trending?category=all&limit=10`);
            if (!response.ok) throw new Error('Failed to fetch top 10');

            const data = await response.json();
            let top10Items = [];

            // Handle different response structures
            if (data.categories) {
                // Collect items from all categories
                Object.values(data.categories).forEach(categoryItems => {
                    if (Array.isArray(categoryItems)) {
                        top10Items.push(...categoryItems);
                    }
                });

                // Take first 10 unique items
                const seenIds = new Set();
                top10Items = top10Items.filter(item => {
                    if (item && item.id && !seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        return true;
                    }
                    return false;
                }).slice(0, 10);
            } else if (data.recommendations) {
                top10Items = data.recommendations.slice(0, 10);
            }

            this.displayTop10List(top10Items);

        } catch (error) {
            console.error('Error loading top 10:', error);
            this.showTop10Error();
        } finally {
            this.isLoadingTop10 = false;
        }
    }

    /**
     * Display top 10 list
     */
    displayTop10List(items) {
        const container = document.getElementById('top10List');
        if (!container) return;

        container.innerHTML = '';

        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="error-message">
                    <p>No top 10 data available</p>
                </div>
            `;
            return;
        }

        items.forEach((item, index) => {
            const listItem = this.createTop10Item(item, index + 1);
            container.appendChild(listItem);
        });
    }

    /**
     * Create top 10 list item with trailer button
     */
    createTop10Item(item, rank) {
        const div = document.createElement('div');
        div.className = 'top-10-item';
        div.dataset.contentId = item.id;

        const posterUrl = this.formatPosterUrl(item.poster_path);
        const isInWishlist = this.userWishlist.has(item.id);
        const rating = this.formatRating(item.rating);
        const year = this.extractYear(item.release_date);
        const contentType = (item.content_type || 'movie').toUpperCase();

        // Determine rank color
        let rankClass = '';
        if (rank === 1) rankClass = 'gold';
        else if (rank === 2) rankClass = 'silver';
        else if (rank === 3) rankClass = 'bronze';

        div.innerHTML = `
            <div class="item-rank ${rankClass}">${rank}</div>
            <img src="${posterUrl}" alt="${this.escapeHtml(item.title)}" class="item-poster" loading="lazy">
            <div class="item-details">
                <div class="item-title">${this.escapeHtml(item.title || 'Unknown')}</div>
                <div class="item-meta">
                    <span>⭐ ${rating}</span>
                    <span>${contentType}</span>
                    ${year ? `<span>${year}</span>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="item-btn item-btn-add wishlist-btn-top10 ${isInWishlist ? 'added' : ''}" 
                        data-content-id="${item.id}"
                        title="${isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}">
                    ${isInWishlist ? '✓ Added' : '+ Add'}
                </button>
                <button class="item-btn item-btn-play">
                    ▶ Trailer
                </button>
            </div>
        `;

        // Setup event handlers
        this.setupTop10ItemHandlers(div, item);

        return div;
    }

    /**
     * Setup top 10 item event handlers
     */
    setupTop10ItemHandlers(div, item) {
        // Item click handler - redirect to details page
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.item-actions')) {
                this.redirectToDetails(item);
            }
        });

        // Wishlist button
        const wishlistBtn = div.querySelector('.wishlist-btn-top10');
        wishlistBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleWishlistClick(item.id, wishlistBtn);
        });

        // Trailer button - now uses TrailerModal
        const trailerBtn = div.querySelector('.item-btn-play');
        trailerBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playTrailer(item);
        });
    }

    /**
     * Show top 10 error state
     */
    showTop10Error() {
        const container = document.getElementById('top10List');
        if (!container) return;

        container.innerHTML = `
            <div class="error-message">
                <h3>Unable to load Top 10</h3>
                <p>Please check your connection and try again</p>
                <button class="retry-btn" onclick="trendingManager.loadTop10List()">Retry</button>
            </div>
        `;
    }

    /**
     * Fetch content from API
     */
    async fetchContent(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.apiBase}${endpoint}${queryString ? '?' + queryString : ''}`;

        const headers = {};
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        try {
            const response = await fetch(url, {
                headers,
                timeout: 10000
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Handle different response structures
            if (data.recommendations) {
                return Array.isArray(data.recommendations) ? data.recommendations : [];
            } else if (data.categories) {
                const allContent = [];
                Object.values(data.categories).forEach(categoryItems => {
                    if (Array.isArray(categoryItems)) {
                        allContent.push(...categoryItems);
                    }
                });

                // Remove duplicates
                const uniqueContent = [];
                const seenIds = new Set();
                allContent.forEach(item => {
                    if (item && item.id && !seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        uniqueContent.push(item);
                    }
                });

                return uniqueContent.slice(0, params.limit || 20);
            } else if (data.results) {
                return Array.isArray(data.results) ? data.results : [];
            } else if (Array.isArray(data)) {
                return data;
            } else {
                console.warn('Unexpected response structure:', data);
                return [];
            }
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    /**
     * Setup carousel navigation
     */
    setupCarouselNavigation(carouselRow) {
        const wrapper = carouselRow.querySelector('.carousel-wrapper');
        const prevBtn = carouselRow.querySelector('.carousel-nav.prev');
        const nextBtn = carouselRow.querySelector('.carousel-nav.next');

        if (!wrapper) return;

        const getScrollAmount = () => {
            const containerWidth = wrapper.clientWidth;
            const cardWidth = wrapper.querySelector('.content-card')?.offsetWidth || 180;
            const gap = parseInt(getComputedStyle(wrapper).gap) || 12;
            const visibleCards = Math.floor(containerWidth / (cardWidth + gap));
            return (cardWidth + gap) * Math.max(1, visibleCards - 1);
        };

        const updateNavButtons = () => {
            if (!prevBtn || !nextBtn) return;
            const scrollLeft = wrapper.scrollLeft;
            const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
            prevBtn.classList.toggle('disabled', scrollLeft <= 0);
            nextBtn.classList.toggle('disabled', scrollLeft >= maxScroll - 1);
        };

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                wrapper.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
            });

            nextBtn.addEventListener('click', () => {
                wrapper.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
            });

            wrapper.addEventListener('scroll', updateNavButtons);
            updateNavButtons();
        }

        this.setupTouchScroll(wrapper);
    }

    /**
     * Setup touch scrolling for carousels
     */
    setupTouchScroll(wrapper) {
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        // Touch events
        wrapper.addEventListener('touchstart', (e) => {
            isDown = true;
            startX = e.touches[0].pageX;
            scrollLeft = wrapper.scrollLeft;
        }, { passive: true });

        wrapper.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            const x = e.touches[0].pageX;
            const walk = (startX - x) * 1.5;
            wrapper.scrollLeft = scrollLeft + walk;
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            isDown = false;
        });

        // Mouse events for desktop
        wrapper.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX;
            scrollLeft = wrapper.scrollLeft;
            wrapper.style.cursor = 'grabbing';
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX;
            const walk = (startX - x) * 2;
            wrapper.scrollLeft = scrollLeft + walk;
        });

        wrapper.addEventListener('mouseup', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
        });

        wrapper.addEventListener('mouseleave', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                document.querySelectorAll('.content-row').forEach(row => {
                    this.setupCarouselNavigation(row);
                });
            }, 250);
        });

        // Listen for auth changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'cinebrain-token') {
                this.authToken = e.newValue;
                this.isAuthenticated = !!this.authToken;
                if (this.isAuthenticated) {
                    this.loadUserWishlist();
                } else {
                    this.userWishlist.clear();
                    this.interactionStates.clear();
                }
                this.updateWishlistButtons();
            }
        });

        // Sync wishlist state when page becomes visible again
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated) {
                this.syncWishlistState();
            }
        });

        // Sync wishlist state when window gains focus
        window.addEventListener('focus', () => {
            if (this.isAuthenticated) {
                this.syncWishlistState();
            }
        });
    }

    /**
     * Handle wishlist click - Using custom notification system
     */
    async handleWishlistClick(contentId, button) {
        if (!this.isAuthenticated) {
            this.showNotification('Please login to add to wishlist', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
        }

        try {
            // Check current state
            const isCurrentlyInWishlist = button?.classList.contains('active') ||
                button?.classList.contains('added') ||
                this.userWishlist.has(contentId);

            // Prevent double clicks
            if (button && button.disabled) return;
            if (button) button.disabled = true;

            // For removing from wishlist
            if (isCurrentlyInWishlist) {
                // First, try to remove using DELETE method
                try {
                    const deleteResponse = await fetch(`${this.apiBase}/user/watchlist/${contentId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    });

                    if (deleteResponse.ok || deleteResponse.status === 404) {
                        // Successfully removed or already removed
                        this.updateWishlistUIAfterRemove(contentId, button);
                        this.showNotification('Removed from wishlist', 'success', 2000);
                        return;
                    }
                } catch (deleteError) {
                    console.log('DELETE method not supported, trying alternative method');
                }

                // Fallback: Record removal interaction
                const removeResponse = await fetch(`${this.apiBase}/interactions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify({
                        content_id: contentId,
                        interaction_type: 'remove_watchlist'
                    })
                });

                if (removeResponse.ok) {
                    this.updateWishlistUIAfterRemove(contentId, button);
                    this.showNotification('Removed from wishlist', 'success', 2000);
                } else {
                    throw new Error('Failed to remove from wishlist');
                }
            } else {
                // Add to wishlist
                const response = await fetch(`${this.apiBase}/interactions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify({
                        content_id: contentId,
                        interaction_type: 'watchlist'
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to add to wishlist: ${response.status}`);
                }

                this.updateWishlistUIAfterAdd(contentId, button);
                this.showNotification('Added to wishlist', 'success', 2000);
            }

            // Update hero button if it's the same content
            this.updateHeroWishlistButton(contentId);

        } catch (error) {
            this.showNotification('Failed to update wishlist', 'error');
            console.error('Error updating wishlist:', error);
        } finally {
            // Re-enable button after a short delay
            if (button) {
                setTimeout(() => {
                    button.disabled = false;
                }, 500);
            }
        }
    }

    /**
     * Update UI after adding to wishlist
     */
    updateWishlistUIAfterAdd(contentId, button) {
        this.userWishlist.add(contentId);
        this.interactionStates.set(contentId, 'watchlist');

        if (button) {
            if (button.classList.contains('wishlist-btn-top10')) {
                button.classList.add('added');
                button.textContent = '✓ Added';
            } else {
                button.classList.add('active');
            }
            button.setAttribute('title', 'Remove from Wishlist');
            button.setAttribute('aria-label', 'Remove from Wishlist');
        }

        // Update all buttons for this content
        this.updateAllWishlistButtonsForContent(contentId, true);
    }

    /**
     * Update UI after removing from wishlist
     */
    updateWishlistUIAfterRemove(contentId, button) {
        this.userWishlist.delete(contentId);
        this.interactionStates.delete(contentId);

        if (button) {
            if (button.classList.contains('wishlist-btn-top10')) {
                button.classList.remove('added');
                button.textContent = '+ Add';
            } else {
                button.classList.remove('active');
            }
            button.setAttribute('title', 'Add to Wishlist');
            button.setAttribute('aria-label', 'Add to Wishlist');
        }

        // Update all buttons for this content
        this.updateAllWishlistButtonsForContent(contentId, false);
    }

    /**
     * Update all wishlist buttons for a specific content
     */
    updateAllWishlistButtonsForContent(contentId, isInWishlist) {
        // Update all wishlist buttons for this content ID
        document.querySelectorAll(`[data-content-id="${contentId}"]`).forEach(btn => {
            if (btn.classList.contains('wishlist-btn')) {
                btn.classList.toggle('active', isInWishlist);
                btn.setAttribute('title', isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist');
                btn.setAttribute('aria-label', isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist');
            } else if (btn.classList.contains('wishlist-btn-top10')) {
                btn.classList.toggle('added', isInWishlist);
                btn.textContent = isInWishlist ? '✓ Added' : '+ Add';
                btn.setAttribute('title', isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist');
            }
        });
    }

    /**
     * Update hero wishlist button
     */
    updateHeroWishlistButton(contentId) {
        const heroWatchlistBtn = document.getElementById('heroWatchlistBtn');
        if (!heroWatchlistBtn) return;

        // Check if hero content matches the updated content
        const heroContentId = parseInt(heroWatchlistBtn.dataset.contentId || '0');
        if (heroContentId !== contentId) return;

        const isInWishlist = this.userWishlist.has(contentId);
        heroWatchlistBtn.textContent = isInWishlist ? '✓ In List' : '+ My List';
        heroWatchlistBtn.classList.toggle('added', isInWishlist);
    }

    /**
     * Update all wishlist buttons
     */
    updateWishlistButtons() {
        // Update all wishlist buttons based on current state
        document.querySelectorAll('.wishlist-btn, .wishlist-btn-top10').forEach(btn => {
            const contentId = parseInt(btn.dataset.contentId);
            const isInWishlist = this.userWishlist.has(contentId);

            if (btn.classList.contains('wishlist-btn-top10')) {
                btn.classList.toggle('added', isInWishlist);
                btn.textContent = isInWishlist ? '✓ Added' : '+ Add';
            } else {
                btn.classList.toggle('active', isInWishlist);
            }

            btn.setAttribute('title', isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist');
            btn.setAttribute('aria-label', isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist');
        });

        // Update hero button
        const heroWatchlistBtn = document.getElementById('heroWatchlistBtn');
        if (heroWatchlistBtn) {
            const heroContentId = parseInt(heroWatchlistBtn.dataset.contentId || '0');
            if (heroContentId && this.userWishlist.has(heroContentId)) {
                heroWatchlistBtn.textContent = '✓ In List';
                heroWatchlistBtn.classList.add('added');
            }
        }
    }

    /**
     * Redirect to details page
     */
    redirectToDetails(content) {
        // Store content data for the details page
        sessionStorage.setItem('contentDetails', JSON.stringify(content));

        // Redirect to details page
        const contentType = content.content_type || 'movie';
        const contentId = content.id;

        window.location.href = `/content/details.html?id=${contentId}&type=${contentType}`;
    }

    // Utility methods
    /**
     * Format poster URL
     */
    formatPosterUrl(posterPath) {
        if (!posterPath) {
            return this.getPlaceholderImage();
        }
        if (posterPath.startsWith('http')) return posterPath;
        return `${this.posterBase}${posterPath}`;
    }

    /**
     * Get placeholder image
     */
    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    }

    /**
     * Format rating
     */
    formatRating(rating) {
        if (!rating) return 'N/A';
        return Number(rating).toFixed(1);
    }

    /**
     * Extract year from date string
     */
    extractYear(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).getFullYear();
        } catch {
            return '';
        }
    }

    /**
     * Format runtime
     */
    formatRuntime(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Refresh page data
     */
    async refresh() {
        console.log('Refreshing trending page...');

        // Clear caches
        this.contentCache.clear();

        // Reload hero content
        this.showHeroSkeleton();
        await this.loadHeroContent();

        // Reload all content rows
        this.contentRows.forEach((rowConfig, index) => {
            const row = document.getElementById(rowConfig.id);
            if (row) {
                const wrapper = row.querySelector('.carousel-wrapper');
                if (wrapper) {
                    wrapper.innerHTML = this.createSkeletons(8);
                    setTimeout(() => {
                        this.loadContentRow(rowConfig);
                    }, index * 100);
                }
            }
        });

        // Reload top 10
        this.showTop10Skeleton();
        setTimeout(() => {
            this.loadTop10List();
        }, this.contentRows.length * 100);
    }

    /**
     * Handle page visibility for performance optimization
     */
    handleVisibilityChange() {
        if (document.visibilityState === 'visible' && this.isAuthenticated) {
            // Sync wishlist when page becomes visible
            this.syncWishlistState();
        }
    }

    /**
     * Handle online/offline events
     */
    handleOnlineStatus() {
        if (navigator.onLine) {
            console.log('Connection restored, refreshing content...');
            this.refresh();
            this.showNotification('Connection restored', 'success', 2000);
        } else {
            this.showNotification('You are offline. Some features may not work.', 'warning', 5000);
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        // Clear timers and observers
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }

        // Destroy TrailerModal if exists
        if (window.TrailerModal && window.TrailerModal.destroy) {
            window.TrailerModal.destroy();
        }

        // Clear caches
        this.contentCache.clear();
        this.userWishlist.clear();
        this.interactionStates.clear();

        console.log('Trending page manager destroyed');
    }
}

// Initialize Trending Page Manager
const trendingManager = new TrendingPageManager();

// Make it globally available
window.trendingManager = trendingManager;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrendingPageManager;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('Trending page DOM loaded successfully!');

    // Ensure body theme attributes are set
    const savedTheme = localStorage.getItem('cinebrain-theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    document.body.setAttribute('data-bs-theme', savedTheme);

    // Add page-specific class
    document.body.classList.add('trending-page');
});

// Handle page visibility changes for performance
document.addEventListener('visibilitychange', function () {
    if (window.trendingManager) {
        window.trendingManager.handleVisibilityChange();
    }
});

// Handle online/offline events
window.addEventListener('online', function () {
    if (window.trendingManager) {
        window.trendingManager.handleOnlineStatus();
    }
});

window.addEventListener('offline', function () {
    if (window.trendingManager) {
        window.trendingManager.handleOnlineStatus();
    }
});

// Memory cleanup on page unload
window.addEventListener('beforeunload', function () {
    if (window.trendingManager) {
        window.trendingManager.destroy();
    }
});