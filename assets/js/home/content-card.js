class CineBrainContentCardManager {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.posterBase = window.CineBrainConfig.posterBase;
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;
        this.currentUser = this.getCurrentUser();

        this.userFavorites = new Set();
        this.contentCache = new Map();
        this.interactionStates = new Map();
        this.loadingStates = new Map();
        this.preloadedContent = new Map();

        this.loadingControllers = new Map();
        this.isInitialLoad = true;
        this.backgroundLoader = null;
        this.loadingFavorites = false;

        this.contentRows = [
            {
                id: 'trending',
                title: 'Trending Now',
                endpoint: '/recommendations/trending',
                params: { category: 'all', limit: 20 },
                priority: 1,
                cached: true
            },
            {
                id: 'new-releases',
                title: 'New Releases',
                endpoint: '/recommendations/new-releases',
                params: { limit: 40 },
                priority: 1,
                cached: true,
                cinebrain_service: true
            },
            {
                id: 'critics-choice',
                title: 'Critics Choice',
                endpoint: '/recommendations/critics-choice',
                params: { type: 'movie', limit: 20 },
                priority: 3,
                cached: true,
                retries: 2
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
                cached: false
            }
        ];

        if (window.themeManager) {
            window.themeManager.register((theme) => this.onThemeChange(theme));
        }

        this.init();
    }

    onThemeChange(theme) {
        console.log('CineBrain content cards theme updated to:', theme);
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
            console.log('CineBrain content container not found - skipping initialization');
            return;
        }

        this.startBackgroundPreloading();

        this.contentRows.forEach(rowConfig => {
            const row = this.createCarouselRow(rowConfig);
            container.appendChild(row);
            this.setRowLoadingState(rowConfig.id, 'loading');
        });

        const promises = [];

        if (this.isAuthenticated) {
            promises.push(this.loadUserFavorites().catch(err => console.error('CineBrain favorites load error:', err)));
        }

        promises.push(this.loadAllContentIntelligently());

        await Promise.allSettled(promises);

        this.setupEventListeners();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        this.isInitialLoad = false;
        console.log('CineBrain ContentCardManager initialized successfully');
    }

    async startBackgroundPreloading() {
        try {
            const highPriorityRows = this.contentRows
                .filter(row => row.priority <= 2 && row.cached)
                .slice(0, 3);

            console.log(`CineBrain: Starting background preload for ${highPriorityRows.length} high-priority rows`);

            const preloadPromises = highPriorityRows.map(async rowConfig => {
                try {
                    console.log(`CineBrain: Preloading ${rowConfig.id}...`);
                    const content = await this.fetchContent(rowConfig.endpoint, rowConfig.params, true);
                    if (content && Array.isArray(content) && content.length > 0) {
                        this.preloadedContent.set(rowConfig.id, content);
                        console.log(`CineBrain: Preloaded ${rowConfig.id} with ${content.length} items`);
                    } else {
                        console.log(`CineBrain: Preload for ${rowConfig.id} returned no content`);
                    }
                } catch (err) {
                    console.warn(`CineBrain preload failed for ${rowConfig.id}:`, err);
                }
            });

            await Promise.allSettled(preloadPromises);
            console.log('CineBrain: Background preloading completed');
        } catch (error) {
            console.warn('CineBrain background preloading error:', error);
        }
    }

    async loadAllContentIntelligently() {
        const sortedRows = [...this.contentRows].sort((a, b) => a.priority - b.priority);

        const highPriorityRows = sortedRows.filter(row => row.priority <= 2);
        const lowPriorityRows = sortedRows.filter(row => row.priority > 2);

        console.log(`CineBrain: Loading ${highPriorityRows.length} high-priority rows first`);

        const highPriorityPromises = highPriorityRows.map(async (rowConfig, index) => {
            await new Promise(resolve => setTimeout(resolve, index * 50));
            return this.loadContentRowWithInstantDisplay(rowConfig);
        });

        await Promise.allSettled(highPriorityPromises);

        console.log(`CineBrain: Loading ${lowPriorityRows.length} low-priority rows with delay`);

        lowPriorityRows.forEach((rowConfig, index) => {
            setTimeout(() => {
                this.loadContentRowWithInstantDisplay(rowConfig);
            }, index * 200 + 300);
        });
    }

    async loadContentRowWithInstantDisplay(rowConfig) {
        const rowId = rowConfig.id;

        try {
            if (this.preloadedContent.has(rowId)) {
                const preloadedContent = this.preloadedContent.get(rowId);
                console.log(`CineBrain: Using preloaded content for ${rowId} (${preloadedContent.length} items)`);
                this.displayContent(rowId, preloadedContent);
                this.setRowLoadingState(rowId, 'loaded');

                this.loadContentRowInBackground(rowConfig);
                return;
            }

            const cacheKey = this.getCacheKey(rowConfig);
            if (this.contentCache.has(cacheKey)) {
                const cachedContent = this.contentCache.get(cacheKey);
                console.log(`CineBrain: Using cached content for ${rowId} (${cachedContent.content.length} items)`);
                this.displayContent(rowId, cachedContent.content);
                this.setRowLoadingState(rowId, 'loaded');

                if (this.isCacheStale(cacheKey)) {
                    this.loadContentRowInBackground(rowConfig);
                }
                return;
            }

            await this.loadContentRow(rowConfig);

        } catch (error) {
            console.error(`CineBrain error loading row ${rowId}:`, error);
            this.setRowLoadingState(rowId, 'error');
        }
    }

    async loadContentRowInBackground(rowConfig) {
        try {
            console.log(`CineBrain: Background refresh for ${rowConfig.id}`);
            const content = await this.fetchContent(rowConfig.endpoint, rowConfig.params, false);
            if (content && Array.isArray(content) && content.length > 0) {
                const cacheKey = this.getCacheKey(rowConfig);
                this.contentCache.set(cacheKey, {
                    content,
                    timestamp: Date.now()
                });

                this.displayContent(rowConfig.id, content);
                console.log(`CineBrain: Background refresh completed for ${rowConfig.id} (${content.length} items)`);
            }
        } catch (error) {
            console.warn(`CineBrain background refresh failed for ${rowConfig.id}:`, error);
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

        wrapper.innerHTML = '';

        if (!content || !Array.isArray(content) || content.length === 0) {
            wrapper.innerHTML = `
                <div class="error-message">
                    <h3>No CineBrain content available</h3>
                    <p>Check back later for updates</p>
                </div>
            `;
            return;
        }

        content.forEach((item, index) => {
            const card = this.createContentCard(item);

            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            wrapper.appendChild(card);

            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 20);
        });

        this.setupCarouselNavigation(row);
        console.log(`CineBrain: Displayed ${content.length} items for ${rowId}`);
    }

    getCacheKey(rowConfig) {
        return `cinebrain-${rowConfig.endpoint}-${JSON.stringify(rowConfig.params)}-${this.isAuthenticated ? 'auth' : 'anon'}`;
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
                console.error('CineBrain error parsing user data:', e);
                return null;
            }
        }
        return null;
    }

    async loadUserFavorites() {
        if (!this.isAuthenticated) {
            this.userFavorites.clear();
            this.interactionStates.clear();
            this.updateWishlistButtons();
            return;
        }

        if (this.loadingFavorites) {
            return;
        }
        this.loadingFavorites = true;

        try {
            const response = await fetch(`${this.apiBase}/user/favorites`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                signal: AbortSignal.timeout(8000)
            });

            if (response.ok) {
                const data = await response.json();
                this.userFavorites.clear();
                this.interactionStates.clear();

                if (data.favorites && Array.isArray(data.favorites)) {
                    data.favorites.forEach(item => {
                        this.userFavorites.add(item.id);
                        this.interactionStates.set(item.id, 'favorite');
                    });
                }
                console.log('CineBrain: Loaded favorites with', this.userFavorites.size, 'items');

                this.updateWishlistButtons();
            } else if (response.status === 401) {
                console.error('CineBrain authentication failed, clearing token');
                this.handleAuthFailure();
            }
        } catch (error) {
            console.error('CineBrain error loading favorites:', error);
        } finally {
            this.loadingFavorites = false;
        }
    }

    handleAuthFailure() {
        localStorage.removeItem('cinebrain-token');
        localStorage.removeItem('cinebrain-user');
        this.authToken = null;
        this.isAuthenticated = false;
        this.userFavorites.clear();
        this.interactionStates.clear();
        this.updateWishlistButtons();

        this.contentCache.clear();
    }

    createCarouselRow(rowConfig) {
        const row = document.createElement('div');
        row.className = 'content-row loading';
        row.id = rowConfig.id;

        const seeAllUrl = rowConfig.cinebrain_service ?
            '/explore/new-releases.html' :
            `/explore/${rowConfig.id}.html`;

        row.innerHTML = `
            <div class="row-header">
                <h2 class="row-title">${rowConfig.title}</h2>
                <a href="${seeAllUrl}" class="see-all">See All →</a>
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
        if (content.title) {
            card.dataset.contentTitle = content.title;
        }
        if (content.original_title) {
            card.dataset.originalTitle = content.original_title;
        }
        if (content.tmdb_id) {
            card.dataset.tmdbId = content.tmdb_id;
        }

        const posterUrl = this.formatPosterUrl(content.poster_path || content.poster_url);
        const rating = this.formatRating(content.rating);
        const ratingValue = parseFloat(content.rating) || 0;
        const year = this.extractYear(content.release_date);
        const genres = content.genres?.slice(0, 2) || [];
        const contentType = content.content_type || 'movie';
        const runtime = this.formatRuntime(content.runtime);
        const isInFavorites = this.userFavorites.has(content.id);

        card.innerHTML = `
            <div class="card-poster-container">
                <img 
                    class="card-poster" 
                    data-src="${posterUrl}" 
                    alt="${this.escapeHtml(content.title || 'CineBrain Content')}"
                    loading="lazy"
                >
                <div class="content-type-badge ${contentType}">
                    ${contentType.toUpperCase()}
                </div>
                <div class="card-overlays">
                    <div class="card-top-overlay">
                        <div></div>
                        <button class="wishlist-btn ${isInFavorites ? 'active' : ''}" 
                                data-content-id="${content.id}" 
                                title="${isInFavorites ? 'Remove from CineBrain Favorites' : 'Add to CineBrain Favorites'}"
                                aria-label="${isInFavorites ? 'Remove from CineBrain Favorites' : 'Add to CineBrain Favorites'}">
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
                card.style.transform = 'scale(0.98)';
                card.style.transition = 'transform 0.1s ease';

                setTimeout(() => {
                    card.style.transform = '';
                    this.navigateToContent(content);
                }, 100);
            }
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (!e.target.closest('.wishlist-btn')) {
                    e.preventDefault();
                    this.navigateToContent(content);
                }
            }
        });

        const wishlistBtn = card.querySelector('.wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleWishlistClick(content.id, wishlistBtn);
            });

            wishlistBtn.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    await this.handleWishlistClick(content.id, wishlistBtn);
                }
            });
        }
    }

    navigateToContent(content) {
        try {
            this.showLoadingIndicator();

            let slug = content.slug;

            if (!slug && content.title) {
                slug = this.generateSlug(
                    content.title,
                    content.release_date,
                    content.content_type,
                    content.tmdb_id || content.id
                );

                console.log('CineBrain: Generated slug for navigation:', slug);
            }

            if (slug && slug.length >= 2) {
                const cleanSlug = slug.replace(/[^a-z0-9\-]/gi, '').toLowerCase();
                if (cleanSlug.length >= 2) {
                    const targetUrl = `/explore/details.html?${encodeURIComponent(cleanSlug)}`;

                    if (window.history && window.history.pushState) {
                        this.prefetchDetailsPage(cleanSlug);
                    }

                    window.location.href = targetUrl;
                    return;
                }
            }

            if (content.id) {
                const fallbackSlug = `content-${content.id}`;
                window.location.href = `/explore/details.html?${encodeURIComponent(fallbackSlug)}`;
                return;
            }

            if (content.title) {
                const titleSlug = this.generateSlug(content.title, content.release_date, content.content_type);
                if (titleSlug) {
                    window.location.href = `/explore/details.html?${encodeURIComponent(titleSlug)}`;
                    return;
                }
            }

            console.error('CineBrain: Cannot navigate - no valid identifier for content:', content);
            this.showNotification('Unable to view content details', 'error');

        } catch (error) {
            console.error('CineBrain navigation error:', error);
            this.showNotification('Navigation failed', 'error');
        } finally {
            this.hideLoadingIndicator();
        }
    }

    generateSlug(title, releaseDate, contentType = 'movie', tmdbId = null) {
        if (!title) return '';

        try {
            const { cleanTitle, extractedYear } = this.extractYearFromTitle(title);
            const finalTitle = cleanTitle || title;

            let year = null;
            if (releaseDate) {
                year = this.extractYear(releaseDate);
            } else if (extractedYear) {
                year = extractedYear;
            }

            let slug = finalTitle.toLowerCase()
                .trim()
                .replace(/[^\w\s\-']/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');

            if (!slug || slug.length < 2) {
                slug = this.manualSlugify(finalTitle);
            }

            if (contentType === 'anime' && !slug.startsWith('anime-')) {
                slug = `anime-${slug}`;
            } else if (contentType === 'tv' && !slug.startsWith('tv-')) {
                slug = `tv-${slug}`;
            } else if (contentType === 'movie' && slug.length < 10) {
                slug = `movie-${slug}`;
            }

            if (year && (contentType === 'movie' || contentType === 'anime') && year >= 1900 && year <= 2030) {
                slug += `-${year}`;
            }

            if (tmdbId && slug.length < 15) {
                slug += `-${tmdbId}`;
            }

            if (slug.length > 120) {
                const parts = slug.substring(0, 117).split('-');
                if (parts.length > 1) {
                    parts.pop();
                    slug = parts.join('-');
                } else {
                    slug = slug.substring(0, 117);
                }
            }

            return slug || `content-${tmdbId || Date.now()}`;

        } catch (error) {
            console.error('CineBrain slug generation error:', error);
            return `content-${tmdbId || Date.now()}`;
        }
    }

    extractYearFromTitle(title) {
        try {
            const yearPatterns = [
                /\((\d{4})\)$/,
                /\s(\d{4})$/,
                /-(\d{4})$/,
                /\[(\d{4})\]$/
            ];

            for (const pattern of yearPatterns) {
                const match = title.match(pattern);
                if (match) {
                    const year = parseInt(match[1]);
                    if (year >= 1900 && year <= 2030) {
                        const cleanTitle = title.replace(pattern, '').trim();
                        return { cleanTitle, extractedYear: year };
                    }
                }
            }

            return { cleanTitle: title, extractedYear: null };
        } catch (error) {
            console.error('CineBrain year extraction error:', error);
            return { cleanTitle: title, extractedYear: null };
        }
    }

    manualSlugify(text) {
        try {
            if (!text) return '';
            return text.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[-\s]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 70);
        } catch (error) {
            return '';
        }
    }

    prefetchDetailsPage(slug) {
        try {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = `/explore/details.html?${encodeURIComponent(slug)}`;
                    document.head.appendChild(link);

                    setTimeout(() => {
                        if (link.parentNode) {
                            document.head.removeChild(link);
                        }
                    }, 5000);
                });
            }
        } catch (error) {
            console.debug('CineBrain prefetch failed:', error);
        }
    }

    showLoadingIndicator() {
        if (window.showLoadingIndicator) {
            window.showLoadingIndicator();
        }
    }

    hideLoadingIndicator() {
        if (window.hideLoadingIndicator) {
            setTimeout(() => {
                window.hideLoadingIndicator();
            }, 300);
        }
    }

    setupLazyLoading(card) {
        const img = card.querySelector('.card-poster');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const imgSrc = img.dataset.src;
                    if (imgSrc) {
                        const tempImg = new Image();

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

    extractContentInfo(card, contentId) {
        try {
            const title = card.querySelector('.card-title')?.textContent?.trim() || 'Unknown';
            const poster = card.querySelector('.card-poster')?.getAttribute('data-src') || card.querySelector('.card-poster')?.src;
            const ratingBadge = card.querySelector('.rating-badge span')?.textContent;
            const year = card.querySelector('.card-year')?.textContent;

            const contentTypeBadge = card.querySelector('.content-type-badge')?.textContent?.toLowerCase()?.trim();
            let contentType = 'movie';

            if (contentTypeBadge) {
                const cleanType = contentTypeBadge.replace(/\s+/g, '').toLowerCase();
                if (['movie', 'tv', 'anime'].includes(cleanType)) {
                    contentType = cleanType;
                }
            }

            const tmdbId = card.dataset.tmdbId ? parseInt(card.dataset.tmdbId) : null;

            return {
                id: contentId,
                title: title,
                original_title: card.dataset.originalTitle || null,
                poster_path: poster?.replace(this.posterBase, '') || null,
                rating: ratingBadge && ratingBadge !== 'N/A' ? parseFloat(ratingBadge) : null,
                release_date: year ? `${year}-01-01` : null,
                content_type: contentType,
                tmdb_id: tmdbId,
                overview: ''
            };
        } catch (error) {
            console.warn('Failed to extract content info:', error);
            return {
                id: contentId,
                title: 'Unknown Title',
                content_type: 'movie'
            };
        }
    }

    rollbackFavoriteState(button, contentId, originalState) {
        if (originalState.isActive) {
            button.classList.add('active');
            this.userFavorites.add(contentId);
            this.interactionStates.set(contentId, originalState.interactionState);
            button.setAttribute('title', 'Remove from CineBrain Favorites');
            button.setAttribute('aria-label', 'Remove from CineBrain Favorites');
        } else {
            button.classList.remove('active');
            this.userFavorites.delete(contentId);
            this.interactionStates.delete(contentId);
            button.setAttribute('title', 'Add to CineBrain Favorites');
            button.setAttribute('aria-label', 'Add to CineBrain Favorites');
        }
    }

    async handleWishlistClick(contentId, button) {
        if (!this.isAuthenticated) {
            this.showNotification('Please login to add to CineBrain favorites', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
        }

        try {
            if (button.disabled) return;
            button.disabled = true;

            const isCurrentlyInFavorites = button.classList.contains('active');

            const card = button.closest('.content-card');
            const contentInfo = this.extractContentInfo(card, contentId);

            const originalState = {
                isActive: isCurrentlyInFavorites,
                inFavorites: this.userFavorites.has(contentId),
                interactionState: this.interactionStates.get(contentId)
            };

            if (isCurrentlyInFavorites) {
                button.classList.remove('active');
                this.userFavorites.delete(contentId);
                this.interactionStates.delete(contentId);
                button.setAttribute('title', 'Add to CineBrain Favorites');
                button.setAttribute('aria-label', 'Add to CineBrain Favorites');
            } else {
                button.classList.add('active');
                this.userFavorites.add(contentId);
                this.interactionStates.set(contentId, 'favorite');
                button.setAttribute('title', 'Remove from CineBrain Favorites');
                button.setAttribute('aria-label', 'Remove from CineBrain Favorites');
            }

            const response = await fetch(`${this.apiBase}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    content_id: contentId,
                    interaction_type: isCurrentlyInFavorites ? 'remove_favorite' : 'favorite',
                    metadata: {
                        content_info: contentInfo,
                        source: 'content_card_interaction',
                        timestamp: new Date().toISOString()
                    }
                }),
                signal: AbortSignal.timeout(15000)
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(
                    isCurrentlyInFavorites ? 'Removed from CineBrain favorites' : 'Added to CineBrain favorites',
                    'success'
                );
                console.log('CineBrain favorites updated successfully:', result);
            } else {
                this.rollbackFavoriteState(button, contentId, originalState);

                const errorData = await response.json().catch(() => ({}));
                console.error('CineBrain favorites update failed:', errorData);

                if (response.status === 401) {
                    this.handleAuthFailure();
                    this.showNotification('Please login again', 'warning');
                } else if (response.status === 404) {
                    this.showNotification('Content not available for favorites', 'warning');
                } else {
                    this.showNotification(errorData.error || 'Failed to update CineBrain favorites', 'error');
                }
            }

        } catch (error) {
            console.error('CineBrain error updating favorites:', error);

            this.rollbackFavoriteState(button, contentId, {
                isActive: !isCurrentlyInFavorites,
                inFavorites: !this.userFavorites.has(contentId)
            });

            if (error.name === 'AbortError') {
                this.showNotification('Request timeout - please try again', 'warning');
            } else {
                this.showNotification('Failed to update CineBrain favorites', 'error');
            }
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

            const cached = this.contentCache.get(cacheKey);
            if (cached && !this.isCacheStale(cacheKey)) {
                content = cached.content;
                console.log(`CineBrain: Using cached content for ${rowConfig.id} (${content.length} items)`);
            } else {
                if (this.loadingControllers.has(rowConfig.id)) {
                    this.loadingControllers.get(rowConfig.id).abort();
                }

                const controller = new AbortController();
                this.loadingControllers.set(rowConfig.id, controller);

                console.log(`CineBrain: Fetching fresh content for ${rowConfig.id}`);
                content = await this.fetchContentWithRetry(rowConfig, controller.signal);

                if (content && Array.isArray(content) && content.length > 0 && rowConfig.cached) {
                    this.contentCache.set(cacheKey, {
                        content,
                        timestamp: Date.now()
                    });
                    console.log(`CineBrain: Cached ${content.length} items for ${rowConfig.id}`);
                }
            }

            this.displayContent(rowConfig.id, content || []);
            this.setRowLoadingState(rowConfig.id, 'loaded');

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`CineBrain request aborted for ${rowConfig.id}`);
                return;
            }

            console.error(`CineBrain error loading ${rowConfig.title}:`, error);
            this.setRowLoadingState(rowConfig.id, 'error');

            const wrapper = row.querySelector('.carousel-wrapper');
            wrapper.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load CineBrain content</h3>
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

    async fetchContentWithRetry(rowConfig, signal) {
        const maxRetries = rowConfig.retries || 1;
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.fetchContent(rowConfig.endpoint, rowConfig.params, false, signal);
            } catch (error) {
                lastError = error;

                if (error.name === 'AbortError' || attempt === maxRetries) {
                    break;
                }

                if (rowConfig.id === 'critics-choice' && attempt < maxRetries) {
                    console.warn(`CineBrain Critics Choice attempt ${attempt + 1} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }

                break;
            }
        }

        if (rowConfig.id === 'critics-choice') {
            console.warn('CineBrain Critics Choice fallback to popular movies');
            try {
                return await this.fetchContent('/recommendations/trending', { category: 'movies', limit: 8 }, false, signal);
            } catch (fallbackError) {
                console.error('CineBrain Critics Choice fallback failed:', fallbackError);
            }
        }

        throw lastError;
    }

    async fetchContent(endpoint, params = {}, isPreload = false, signal = null) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.apiBase}${endpoint}${queryString ? '?' + queryString : ''}`;

        const headers = {
            'Accept': 'application/json',
            'Cache-Control': isPreload ? 'no-cache' : 'max-age=300'
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const timeout = this.getTimeoutForEndpoint(endpoint, isPreload);
        const requestSignal = signal || AbortSignal.timeout(timeout);

        try {
            const response = await fetch(url, {
                headers,
                signal: requestSignal
            });

            if (!response.ok) {
                switch (response.status) {
                    case 404:
                        throw new Error(`CineBrain content not found: ${endpoint}`);
                    case 401:
                        this.handleAuthFailure();
                        throw new Error('CineBrain authentication failed');
                    case 429:
                        throw new Error('CineBrain rate limit exceeded');
                    case 503:
                        throw new Error('CineBrain service temporarily unavailable');
                    default:
                        throw new Error(`CineBrain API error: ${response.status} - ${response.statusText}`);
                }
            }

            const data = await response.json();
            const processedContent = this.processApiResponse(data, endpoint);

            console.log(`CineBrain: Successfully fetched ${processedContent.length} items from ${endpoint}`);

            return processedContent;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`CineBrain: Request timeout for ${endpoint}`);
                throw error;
            }

            console.error(`CineBrain fetch error for ${endpoint}:`, {
                message: error.message,
                endpoint,
                params,
                isPreload
            });

            throw error;
        }
    }

    getTimeoutForEndpoint(endpoint, isPreload) {
        const timeouts = {
            '/recommendations/critics-choice': 15000,
            '/recommendations/new-releases': 12000,
            '/recommendations/trending': 8000,
            '/recommendations/anime': 10000
        };

        const baseTimeout = timeouts[endpoint] || 8000;
        return isPreload ? baseTimeout + 4000 : baseTimeout;
    }

    processApiResponse(data, endpoint) {
        try {
            if (data.success && data.data) {
                const cineBrainData = data.data;

                if (data.cinebrain_service === 'new_releases' || endpoint.includes('new-releases')) {
                    console.log('CineBrain: Processing new releases with', cineBrainData.priority_content?.length || 0, 'priority items');
                    return cineBrainData.priority_content || cineBrainData.all_content || [];
                }

                if (data.cinebrain_service === 'critics_choice' || endpoint.includes('critics-choice')) {
                    console.log('CineBrain: Processing critics choice with', cineBrainData.recommendations?.length || 0, 'items');
                    return cineBrainData.recommendations || [];
                }

                if (cineBrainData.recommendations && Array.isArray(cineBrainData.recommendations)) {
                    return cineBrainData.recommendations;
                }

                if (cineBrainData.categories) {
                    return this.extractContentFromCategories(cineBrainData.categories);
                }

                if (Array.isArray(cineBrainData)) {
                    return cineBrainData;
                }
            }

            if (data.recommendations && Array.isArray(data.recommendations)) {
                return data.recommendations;
            }

            if (data.categories) {
                return this.extractContentFromCategories(data.categories);
            }

            if (data.results && Array.isArray(data.results)) {
                return data.results;
            }

            if (Array.isArray(data)) {
                return data;
            }

            console.warn('CineBrain: Unrecognized response format for', endpoint, 'Keys:', Object.keys(data));
            return [];

        } catch (error) {
            console.error('CineBrain: Error processing API response:', error);
            return [];
        }
    }

    extractContentFromCategories(categories) {
        const allContent = [];

        try {
            Object.entries(categories).forEach(([categoryName, categoryItems]) => {
                if (Array.isArray(categoryItems)) {
                    const itemsWithCategory = categoryItems.map(item => ({
                        ...item,
                        _category: categoryName
                    }));
                    allContent.push(...itemsWithCategory);
                }
            });

            const uniqueContent = this.deduplicateContent(allContent);
            console.log(`CineBrain: Extracted ${uniqueContent.length} unique items from ${Object.keys(categories).length} categories`);

            return uniqueContent;
        } catch (error) {
            console.error('CineBrain: Error extracting from categories:', error);
            return [];
        }
    }

    deduplicateContent(contentList) {
        const seenIds = new Set();
        const uniqueContent = [];

        contentList.forEach(item => {
            if (item && item.id && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                uniqueContent.push(item);
            }
        });

        return uniqueContent;
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

        window.addEventListener('storage', (e) => {
            if (e.key === 'cinebrain-token') {
                const oldAuth = this.isAuthenticated;
                this.authToken = e.newValue;
                this.isAuthenticated = !!this.authToken;

                if (oldAuth !== this.isAuthenticated) {
                    this.handleAuthStateChange();
                }
            }
        });

        window.addEventListener('userLoggedIn', () => {
            this.handleAuthStateChange();
        });

        window.addEventListener('userLoggedOut', () => {
            this.handleAuthStateChange();
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated) {
                this.loadUserFavorites();
            }
        });

        window.addEventListener('focus', () => {
            if (this.isAuthenticated) {
                this.loadUserFavorites();
            }
        });
    }

    async handleAuthStateChange() {
        console.log('CineBrain auth state changed - refreshing content');

        this.contentRows.forEach(rowConfig => {
            this.setRowLoadingState(rowConfig.id, 'loading');
            const wrapper = document.getElementById(rowConfig.id)?.querySelector('.carousel-wrapper');
            if (wrapper) {
                wrapper.innerHTML = this.createEnhancedSkeletons(8);
            }
        });

        this.contentCache.clear();
        this.preloadedContent.clear();

        if (this.isAuthenticated) {
            await this.loadUserFavorites();
        } else {
            this.userFavorites.clear();
            this.interactionStates.clear();
        }

        await this.loadAllContentIntelligently();
        this.updateWishlistButtons();
    }

    updateWishlistButtons() {
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            const contentId = parseInt(btn.dataset.contentId);
            const isInFavorites = this.userFavorites.has(contentId);

            if (isInFavorites) {
                btn.classList.add('active');
                btn.setAttribute('title', 'Remove from CineBrain Favorites');
                btn.setAttribute('aria-label', 'Remove from CineBrain Favorites');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('title', 'Add to CineBrain Favorites');
                btn.setAttribute('aria-label', 'Add to CineBrain Favorites');
            }
        });
    }

    showNotification(message, type = 'info') {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            console.log(`CineBrain ${type.toUpperCase()}: ${message}`);
        }
    }

    formatPosterUrl(posterPath) {
        if (!posterPath) {
            return this.getPlaceholderImage();
        }
        if (posterPath.startsWith('http')) return posterPath;
        return `${this.posterBase}${posterPath}`;
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2luZUJyYWluPC90ZXh0Pjwvc3ZnPg==';
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

if (document.getElementById('content-container')) {
    const cineBrainContentCardManager = new CineBrainContentCardManager();
    window.contentCardManager = cineBrainContentCardManager;
    window.cineBrainContentCardManager = cineBrainContentCardManager;
} else {
    console.log('CineBrain ContentCardManager: Skipped initialization - not on homepage');
}