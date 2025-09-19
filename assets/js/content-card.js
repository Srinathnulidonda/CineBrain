// Enhanced Content Card Component - Instant Loading with Better Skeletons
class ContentCardManager {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.posterBase = 'https://image.tmdb.org/t/p/w500';

        // Auth state
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;
        this.currentUser = this.getCurrentUser();

        // Enhanced caching system
        this.userWishlist = new Set();
        this.contentCache = new Map();
        this.interactionStates = new Map();
        this.loadingStates = new Map(); // Track loading states
        this.preloadedContent = new Map(); // Preloaded content for instant display

        // Loading management
        this.loadingControllers = new Map(); // AbortControllers for cancelling requests
        this.isInitialLoad = true;
        this.backgroundLoader = null;

        // Content row configurations with priority levels
        this.contentRows = [
            {
                id: 'trending',
                title: 'Trending Now',
                endpoint: '/recommendations/trending',
                params: { category: 'all', limit: 20 },
                priority: 1, // High priority - load first
                cached: true // Cache this content
            },
            {
                id: 'new-releases',
                title: 'New Releases',
                endpoint: '/recommendations/new-releases',
                params: { type: 'movie', limit: 20 },
                priority: 2,
                cached: true
            },
            {
                id: 'critics-choice',
                title: 'Critics Choice',
                endpoint: '/recommendations/critics-choice',
                params: { type: 'movie', limit: 20 },
                priority: 3,
                cached: true
            },
            {
                id: 'popular-movies',
                title: 'Popular Movies',
                endpoint: '/recommendations/trending',
                params: { category: 'movies', limit: 20 },
                priority: 2,
                cached: true
            },
            {
                id: 'top-tv-shows',
                title: 'Top TV Shows',
                endpoint: '/recommendations/trending',
                params: { category: 'tv_shows', limit: 20 },
                priority: 3,
                cached: true
            },
            {
                id: 'anime-picks',
                title: 'Anime Collection',
                endpoint: '/recommendations/anime',
                params: { limit: 20 },
                priority: 4,
                cached: false // Don't cache anime for now
            }
        ];

        if (window.themeManager) {
            window.themeManager.register((theme) => this.onThemeChange(theme));
        }

        this.init();
    }

    onThemeChange(theme) {
        console.log('Content cards theme updated to:', theme);
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    async setup() {
        const container = document.getElementById('content-container');
        if (!container) {
            console.log('Content container not found - skipping initialization');
            return;
        }

        // Start background preloading immediately
        this.startBackgroundPreloading();

        // Create all carousel rows immediately with skeletons
        this.contentRows.forEach(rowConfig => {
            const row = this.createCarouselRow(rowConfig);
            container.appendChild(row);
            // Set initial loading state
            this.setRowLoadingState(rowConfig.id, 'loading');
        });

        // Load user data and content in parallel
        const promises = [];

        // Load user wishlist if authenticated (don't wait for it)
        if (this.isAuthenticated) {
            promises.push(this.loadUserWishlist().catch(err => console.error('Wishlist load error:', err)));
        }

        // Load content with smart priority and parallel loading
        promises.push(this.loadAllContentIntelligently());

        // Don't wait for wishlist to complete before showing content
        await Promise.allSettled(promises);

        this.setupEventListeners();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        this.isInitialLoad = false;
    }

    async startBackgroundPreloading() {
        // Preload critical content in the background
        try {
            const highPriorityRows = this.contentRows
                .filter(row => row.priority <= 2 && row.cached)
                .slice(0, 2); // Only preload top 2 most important

            const preloadPromises = highPriorityRows.map(async rowConfig => {
                try {
                    const content = await this.fetchContent(rowConfig.endpoint, rowConfig.params, true);
                    if (content && content.length > 0) {
                        this.preloadedContent.set(rowConfig.id, content);
                        console.log(`Preloaded ${rowConfig.id} with ${content.length} items`);
                    }
                } catch (err) {
                    console.warn(`Preload failed for ${rowConfig.id}:`, err);
                }
            });

            await Promise.allSettled(preloadPromises);
        } catch (error) {
            console.warn('Background preloading error:', error);
        }
    }

    async loadAllContentIntelligently() {
        // Sort rows by priority
        const sortedRows = [...this.contentRows].sort((a, b) => a.priority - b.priority);

        // Load high priority content first (parallel)
        const highPriorityRows = sortedRows.filter(row => row.priority <= 2);
        const lowPriorityRows = sortedRows.filter(row => row.priority > 2);

        // Load high priority content in parallel
        const highPriorityPromises = highPriorityRows.map(async (rowConfig, index) => {
            // Small delay to stagger the loading for better UX
            await new Promise(resolve => setTimeout(resolve, index * 50));
            return this.loadContentRowWithInstantDisplay(rowConfig);
        });

        // Wait for high priority content
        await Promise.allSettled(highPriorityPromises);

        // Load low priority content with longer delays
        lowPriorityRows.forEach((rowConfig, index) => {
            setTimeout(() => {
                this.loadContentRowWithInstantDisplay(rowConfig);
            }, index * 200 + 300); // Start after high priority is done
        });
    }

    async loadContentRowWithInstantDisplay(rowConfig) {
        const rowId = rowConfig.id;

        try {
            // Check if we have preloaded content for instant display
            if (this.preloadedContent.has(rowId)) {
                const preloadedContent = this.preloadedContent.get(rowId);
                this.displayContent(rowId, preloadedContent);
                this.setRowLoadingState(rowId, 'loaded');

                // Still fetch fresh content in background
                this.loadContentRowInBackground(rowConfig);
                return;
            }

            // Check cache for instant display
            const cacheKey = this.getCacheKey(rowConfig);
            if (this.contentCache.has(cacheKey)) {
                const cachedContent = this.contentCache.get(cacheKey);
                this.displayContent(rowId, cachedContent);
                this.setRowLoadingState(rowId, 'loaded');

                // Refresh in background if cache is old
                if (this.isCacheStale(cacheKey)) {
                    this.loadContentRowInBackground(rowConfig);
                }
                return;
            }

            // No cached content, load normally
            await this.loadContentRow(rowConfig);

        } catch (error) {
            console.error(`Error loading row ${rowId}:`, error);
            this.setRowLoadingState(rowId, 'error');
        }
    }

    async loadContentRowInBackground(rowConfig) {
        try {
            const content = await this.fetchContent(rowConfig.endpoint, rowConfig.params, false);
            if (content && content.length > 0) {
                const cacheKey = this.getCacheKey(rowConfig);
                this.contentCache.set(cacheKey, {
                    content,
                    timestamp: Date.now()
                });

                // Update display if content is different
                this.displayContent(rowConfig.id, content);
            }
        } catch (error) {
            console.warn(`Background refresh failed for ${rowConfig.id}:`, error);
        }
    }

    setRowLoadingState(rowId, state) {
        this.loadingStates.set(rowId, state);
        const row = document.getElementById(rowId);
        if (row) {
            row.classList.remove('loading', 'loaded', 'error');
            row.classList.add(state);
        }
    }

    displayContent(rowId, content) {
        const row = document.getElementById(rowId);
        if (!row) return;

        const wrapper = row.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        // Clear current content
        wrapper.innerHTML = '';

        // Add content cards with smooth animation
        content.forEach((item, index) => {
            const card = this.createContentCard(item);

            // Add staggered animation
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            wrapper.appendChild(card);

            // Animate in with delay
            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 20); // Stagger animation
        });

        this.setupCarouselNavigation(row);
    }

    getCacheKey(rowConfig) {
        return `${rowConfig.endpoint}-${JSON.stringify(rowConfig.params)}-${this.isAuthenticated ? 'auth' : 'anon'}`;
    }

    isCacheStale(cacheKey) {
        const cached = this.contentCache.get(cacheKey);
        if (!cached || !cached.timestamp) return true;

        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() - cached.timestamp > fiveMinutes;
    }

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

    async loadUserWishlist() {
        if (!this.isAuthenticated) {
            this.userWishlist.clear();
            this.interactionStates.clear();
            this.updateWishlistButtons();
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });

            if (response.ok) {
                const data = await response.json();
                this.userWishlist.clear();
                this.interactionStates.clear();

                if (data.watchlist && Array.isArray(data.watchlist)) {
                    data.watchlist.forEach(item => {
                        this.userWishlist.add(item.content_id);
                        this.interactionStates.set(item.content_id, 'watchlist');
                    });
                }
                console.log('Loaded wishlist with', this.userWishlist.size, 'items');

                // Update wishlist buttons immediately
                this.updateWishlistButtons();
            } else if (response.status === 401) {
                console.error('Authentication failed, clearing token');
                this.handleAuthFailure();
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    }

    handleAuthFailure() {
        localStorage.removeItem('cinebrain-token');
        localStorage.removeItem('cinebrain-user');
        this.authToken = null;
        this.isAuthenticated = false;
        this.userWishlist.clear();
        this.interactionStates.clear();
        this.updateWishlistButtons();

        // Clear authenticated content cache
        this.contentCache.clear();
    }

    createCarouselRow(rowConfig) {
        const row = document.createElement('div');
        row.className = 'content-row loading'; // Start with loading state
        row.id = rowConfig.id;

        row.innerHTML = `
            <div class="row-header">
                <h2 class="row-title">${rowConfig.title}</h2>
                <a href="/content/${rowConfig.id}.html" class="see-all">See All →</a>
            </div>
            <div class="carousel-container">
                <button class="carousel-nav prev" aria-label="Previous" style="opacity: 0;">
                    <svg viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                <div class="carousel-wrapper">
                    ${this.createEnhancedSkeletons(8)}
                </div>
                <button class="carousel-nav next" aria-label="Next" style="opacity: 0;">
                    <svg viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            </div>
        `;

        return row;
    }

    createEnhancedSkeletons(count) {
        return Array(count).fill('').map((_, index) => `
            <div class="skeleton-card" style="animation-delay: ${index * 0.1}s;">
                <div class="skeleton skeleton-poster">
                    <div class="skeleton-shimmer"></div>
                </div>
                <div class="skeleton-info">
                    <div class="skeleton skeleton-title">
                        <div class="skeleton-shimmer"></div>
                    </div>
                    <div class="skeleton skeleton-meta">
                        <div class="skeleton-shimmer"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    createContentCard(content) {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.dataset.contentId = content.id;

        if (content.slug) {
            card.dataset.contentSlug = content.slug;
        }

        const posterUrl = this.formatPosterUrl(content.poster_path || content.poster_url);
        const rating = this.formatRating(content.rating);
        const ratingValue = parseFloat(content.rating) || 0;
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
                        <div class="rating-badge" ${ratingValue >= 8.0 ? 'data-high-rating="true"' : ''}>
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

        this.setupCardHandlers(card, content);
        this.setupLazyLoading(card);

        return card;
    }

    setupCardHandlers(card, content) {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.wishlist-btn')) {
                let slug = content.slug;

                if (!slug && content.title) {
                    slug = this.generateSlug(content.title, content.release_date);
                }

                if (slug) {
                    window.location.href = `/content/details.html?slug=${encodeURIComponent(slug)}`;
                } else {
                    console.error('No slug available for content:', content);
                    this.showNotification('Unable to view details', 'error');
                }
            }
        });

        const wishlistBtn = card.querySelector('.wishlist-btn');
        wishlistBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleWishlistClick(content.id, wishlistBtn);
        });
    }

    generateSlug(title, releaseDate) {
        if (!title) return '';

        let slug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .trim();

        if (releaseDate) {
            const year = this.extractYear(releaseDate);
            if (year) {
                slug += `-${year}`;
            }
        }

        if (slug.length > 100) {
            slug = slug.substring(0, 100).replace(/-[^-]*$/, '');
        }

        return slug;
    }

    setupLazyLoading(card) {
        const img = card.querySelector('.card-poster');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const imgSrc = img.dataset.src;
                    if (imgSrc) {
                        // Create a temporary image to preload
                        const tempImg = new Image();

                        // Add loading state
                        img.parentElement.classList.add('loading-image');

                        tempImg.onload = () => {
                            img.src = imgSrc;
                            img.classList.add('loaded');
                            img.parentElement.classList.remove('loading-image');
                        };
                        tempImg.onerror = () => {
                            img.src = this.getPlaceholderImage();
                            img.classList.add('loaded');
                            img.parentElement.classList.remove('loading-image');
                        };
                        tempImg.src = imgSrc;
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: window.innerWidth <= 768 ? '50px' : '100px',
            threshold: 0.01
        });

        observer.observe(img);
    }

    async handleWishlistClick(contentId, button) {
        if (!this.isAuthenticated) {
            this.showNotification('Please login to add to wishlist', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
        }

        try {
            if (button.disabled) return;
            button.disabled = true;

            const isCurrentlyInWishlist = button.classList.contains('active');

            // Optimistic UI update
            if (isCurrentlyInWishlist) {
                button.classList.remove('active');
                this.userWishlist.delete(contentId);
                this.interactionStates.delete(contentId);
                button.setAttribute('title', 'Add to Wishlist');
                button.setAttribute('aria-label', 'Add to Wishlist');
            } else {
                button.classList.add('active');
                this.userWishlist.add(contentId);
                this.interactionStates.set(contentId, 'watchlist');
                button.setAttribute('title', 'Remove from Wishlist');
                button.setAttribute('aria-label', 'Remove from Wishlist');
            }

            // Send request to backend
            const response = await fetch(`${this.apiBase}/users/watchlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    content_id: contentId,
                    action: isCurrentlyInWishlist ? 'remove' : 'add'
                }),
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                this.showNotification(
                    isCurrentlyInWishlist ? 'Removed from wishlist' : 'Added to wishlist',
                    'success'
                );
            } else {
                // Revert optimistic update on failure
                if (isCurrentlyInWishlist) {
                    button.classList.add('active');
                    this.userWishlist.add(contentId);
                    this.interactionStates.set(contentId, 'watchlist');
                    button.setAttribute('title', 'Remove from Wishlist');
                    button.setAttribute('aria-label', 'Remove from Wishlist');
                } else {
                    button.classList.remove('active');
                    this.userWishlist.delete(contentId);
                    this.interactionStates.delete(contentId);
                    button.setAttribute('title', 'Add to Wishlist');
                    button.setAttribute('aria-label', 'Add to Wishlist');
                }
                throw new Error('Failed to update wishlist');
            }

        } catch (error) {
            this.showNotification('Failed to update wishlist', 'error');
            console.error('Error updating wishlist:', error);
        } finally {
            setTimeout(() => {
                button.disabled = false;
            }, 300);
        }
    }

    async loadContentRow(rowConfig) {
        const row = document.getElementById(rowConfig.id);
        if (!row) return;

        const wrapper = row.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        try {
            this.setRowLoadingState(rowConfig.id, 'loading');

            const cacheKey = this.getCacheKey(rowConfig);
            let content;

            // Check cache first
            const cached = this.contentCache.get(cacheKey);
            if (cached && !this.isCacheStale(cacheKey)) {
                content = cached.content;
            } else {
                // Cancel any existing request for this row
                if (this.loadingControllers.has(rowConfig.id)) {
                    this.loadingControllers.get(rowConfig.id).abort();
                }

                const controller = new AbortController();
                this.loadingControllers.set(rowConfig.id, controller);

                content = await this.fetchContent(rowConfig.endpoint, rowConfig.params, false, controller.signal);

                if (content && content.length > 0 && rowConfig.cached) {
                    this.contentCache.set(cacheKey, {
                        content,
                        timestamp: Date.now()
                    });
                }
            }

            this.displayContent(rowConfig.id, content || []);
            this.setRowLoadingState(rowConfig.id, 'loaded');

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`Request aborted for ${rowConfig.id}`);
                return;
            }

            console.error(`Error loading ${rowConfig.title}:`, error);
            this.setRowLoadingState(rowConfig.id, 'error');

            const wrapper = row.querySelector('.carousel-wrapper');
            wrapper.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load content</h3>
                    <p>Please check your connection and try again</p>
                    <button class="retry-btn" data-row-id="${rowConfig.id}">Retry</button>
                </div>
            `;

            const retryBtn = wrapper.querySelector('.retry-btn');
            retryBtn?.addEventListener('click', () => {
                wrapper.innerHTML = this.createEnhancedSkeletons(8);
                this.loadContentRow(rowConfig);
            });
        }
    }

    async fetchContent(endpoint, params = {}, isPreload = false, signal = null) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.apiBase}${endpoint}${queryString ? '?' + queryString : ''}`;

        const headers = {};
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const requestOptions = {
            headers,
            signal: signal || AbortSignal.timeout(isPreload ? 15000 : 8000)
        };

        try {
            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Handle different response structures from backend
            if (data.recommendations && Array.isArray(data.recommendations)) {
                return data.recommendations;
            } else if (data.categories) {
                // For trending endpoint with categories
                const allContent = [];
                Object.values(data.categories).forEach(categoryItems => {
                    if (Array.isArray(categoryItems)) {
                        allContent.push(...categoryItems);
                    }
                });

                // Remove duplicates and limit results
                const uniqueContent = [];
                const seenIds = new Set();
                allContent.forEach(item => {
                    if (item && item.id && !seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        uniqueContent.push(item);
                    }
                });

                return uniqueContent.slice(0, params.limit || 20);
            } else if (data.results && Array.isArray(data.results)) {
                return data.results;
            } else if (Array.isArray(data)) {
                return data;
            } else {
                console.warn('Unexpected response structure:', data);
                return [];
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            console.error('Fetch error:', error);
            throw error;
        }
    }

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

        let ticking = false;
        const updateNavButtons = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    if (!prevBtn || !nextBtn) return;

                    const scrollLeft = wrapper.scrollLeft;
                    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;

                    const shouldShowPrev = scrollLeft > 0;
                    const shouldShowNext = scrollLeft < maxScroll - 1;

                    prevBtn.style.opacity = shouldShowPrev ? '1' : '0';
                    nextBtn.style.opacity = shouldShowNext ? '1' : '0';

                    prevBtn.classList.toggle('disabled', !shouldShowPrev);
                    nextBtn.classList.toggle('disabled', !shouldShowNext);

                    ticking = false;
                });
                ticking = true;
            }
        };

        if (prevBtn && nextBtn && window.innerWidth > 768) {
            prevBtn.addEventListener('click', () => {
                wrapper.scrollBy({
                    left: -getScrollAmount(),
                    behavior: 'smooth'
                });
            });

            nextBtn.addEventListener('click', () => {
                wrapper.scrollBy({
                    left: getScrollAmount(),
                    behavior: 'smooth'
                });
            });

            wrapper.addEventListener('scroll', updateNavButtons, { passive: true });
            updateNavButtons();
        }

        this.setupTouchScroll(wrapper);
    }

    setupTouchScroll(wrapper) {
        if (window.innerWidth > 768) {
            let isDown = false;
            let startX = 0;
            let scrollLeft = 0;

            wrapper.addEventListener('mousedown', (e) => {
                isDown = true;
                startX = e.pageX;
                scrollLeft = wrapper.scrollLeft;
                wrapper.style.cursor = 'grabbing';
                e.preventDefault();
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
        } else {
            wrapper.style.cursor = 'default';
            wrapper.style.webkitOverflowScrolling = 'touch';
            wrapper.style.overscrollBehaviorX = 'contain';
        }
    }

    setupEventListeners() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                document.querySelectorAll('.content-row').forEach(row => {
                    this.setupCarouselNavigation(row);
                });
            }, 250);
        });

        // Enhanced auth state change handling
        window.addEventListener('storage', (e) => {
            if (e.key === 'cinebrain-token') {
                const oldAuth = this.isAuthenticated;
                this.authToken = e.newValue;
                this.isAuthenticated = !!this.authToken;

                if (oldAuth !== this.isAuthenticated) {
                    // Auth state changed - refresh content
                    this.handleAuthStateChange();
                }
            }
        });

        // Listen for login success events
        window.addEventListener('userLoggedIn', () => {
            this.handleAuthStateChange();
        });

        // Listen for logout events
        window.addEventListener('userLoggedOut', () => {
            this.handleAuthStateChange();
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated) {
                this.loadUserWishlist();
            }
        });

        window.addEventListener('focus', () => {
            if (this.isAuthenticated) {
                this.loadUserWishlist();
            }
        });
    }

    async handleAuthStateChange() {
        console.log('Auth state changed - refreshing content');

        // Show loading state immediately
        this.contentRows.forEach(rowConfig => {
            this.setRowLoadingState(rowConfig.id, 'loading');
            const wrapper = document.getElementById(rowConfig.id)?.querySelector('.carousel-wrapper');
            if (wrapper) {
                wrapper.innerHTML = this.createEnhancedSkeletons(8);
            }
        });

        // Clear caches
        this.contentCache.clear();
        this.preloadedContent.clear();

        // Reload user data and content
        if (this.isAuthenticated) {
            await this.loadUserWishlist();
        } else {
            this.userWishlist.clear();
            this.interactionStates.clear();
        }

        // Reload all content
        await this.loadAllContentIntelligently();
        this.updateWishlistButtons();
    }

    updateWishlistButtons() {
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            const contentId = parseInt(btn.dataset.contentId);
            const isInWishlist = this.userWishlist.has(contentId);

            if (isInWishlist) {
                btn.classList.add('active');
                btn.setAttribute('title', 'Remove from Wishlist');
                btn.setAttribute('aria-label', 'Remove from Wishlist');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('title', 'Add to Wishlist');
                btn.setAttribute('aria-label', 'Add to Wishlist');
            }
        });
    }

    showNotification(message, type = 'info') {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Utility methods
    formatPosterUrl(posterPath) {
        if (!posterPath) {
            return this.getPlaceholderImage();
        }
        if (posterPath.startsWith('http')) return posterPath;
        return `${this.posterBase}${posterPath}`;
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    }

    formatRating(rating) {
        if (!rating) return 'N/A';
        return Number(rating).toFixed(1);
    }

    extractYear(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).getFullYear();
        } catch {
            return '';
        }
    }

    formatRuntime(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

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
}

// Initialize only on homepage
if (document.getElementById('content-container')) {
    const contentCardManager = new ContentCardManager();
    window.contentCardManager = contentCardManager;
} else {
    console.log('ContentCardManager: Skipped initialization - not on homepage');
}