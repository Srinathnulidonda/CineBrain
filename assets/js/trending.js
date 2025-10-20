class CineBrainTrendingContentManager {
    constructor() {
        this.apiBase = 'https://cinebrain.onrender.com/api';
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

        this.selectedGenres = new Set();
        this.allGenres = [
            'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
            'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
            'Romance', 'Science Fiction', 'Thriller', 'War', 'Western', 'Biography',
            'Musical', 'Sport', 'Film Noir', 'Short', 'News', 'Reality', 'Talk Show'
        ];

        this.trendingRows = [
            {
                id: 'top-10-today',
                title: 'Top 10 Today',
                endpoint: '/recommendations/trending',
                params: { category: 'top10', limit: 10, timeframe: '24h' },
                priority: 1,
                cached: true
            },
            {
                id: 'trending-movies',
                title: 'Trending Movies',
                endpoint: '/recommendations/trending',
                params: { category: 'movies', limit: 20, sort: 'popularity' },
                priority: 1,
                cached: true
            },
            {
                id: 'trending-tv-shows',
                title: 'Trending TV Shows',
                endpoint: '/recommendations/trending',
                params: { category: 'tv_shows', limit: 20, sort: 'popularity' },
                priority: 2,
                cached: true
            },
            {
                id: 'rising-stars',
                title: 'Rising Stars',
                endpoint: '/recommendations/trending',
                params: { category: 'all', limit: 15, sort: 'growth_rate', timeframe: 'week' },
                priority: 2,
                cached: true
            },
            {
                id: 'critics-audience-favorites',
                title: 'Critics & Audience Favorites',
                endpoint: '/recommendations/critics-choice',
                params: { type: 'trending', min_rating: 7.5, limit: 18 },
                priority: 3,
                cached: true
            },
            {
                id: 'trending-anime',
                title: 'Trending Anime',
                endpoint: '/recommendations/anime',
                params: { sort: 'trending', limit: 20 },
                priority: 3,
                cached: true
            },
            {
                id: 'genre-action',
                title: 'Trending Action',
                endpoint: '/recommendations/genre/action',
                params: { type: 'movie', limit: 15, sort: 'trending' },
                priority: 4,
                cached: true
            },
            {
                id: 'genre-comedy',
                title: 'Trending Comedy',
                endpoint: '/recommendations/genre/comedy',
                params: { type: 'movie', limit: 15, sort: 'trending' },
                priority: 4,
                cached: true
            }
        ];

        if (window.themeManager) {
            window.themeManager.register((theme) => this.onThemeChange(theme));
        }

        this.init();
    }

    onThemeChange(theme) {
        console.log('CineBrain trending content theme updated to:', theme);

        setTimeout(() => {
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }, 0);
    }

    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    async setup() {
        const container = document.getElementById('trending-content-container');
        if (!container) {
            console.log('CineBrain trending content container not found - skipping initialization');
            return;
        }

        this.setupGenreFilters();
        this.configureHeroForTrending();
        this.startBackgroundPreloading();

        this.trendingRows.forEach(rowConfig => {
            const row = this.createTrendingCarouselRow(rowConfig);
            container.appendChild(row);
            this.setRowLoadingState(rowConfig.id, 'loading');
        });

        const promises = [];

        if (this.isAuthenticated) {
            promises.push(this.loadUserFavorites().catch(err => console.error('CineBrain favorites load error:', err)));
        }

        promises.push(this.loadAllTrendingContentIntelligently());

        await Promise.allSettled(promises);

        this.setupEventListeners();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        this.isInitialLoad = false;
        console.log('CineBrain TrendingContentManager initialized successfully');
    }

    setupGenreFilters() {
        const genreGrid = document.getElementById('genreGrid');
        const genreFilterToggle = document.getElementById('genreFilterToggle');
        const genreFilterContainer = document.getElementById('genreFilterContainer');
        const selectAllBtn = document.getElementById('selectAllGenres');
        const clearAllBtn = document.getElementById('clearAllGenres');
        const selectedCount = document.getElementById('selectedCount');

        if (!genreGrid || !genreFilterToggle || !genreFilterContainer) return;

        this.allGenres.forEach((genre, index) => {
            const genreBtn = document.createElement('button');
            genreBtn.className = 'genre-btn';
            genreBtn.textContent = genre;
            genreBtn.dataset.genre = genre.toLowerCase();
            genreBtn.setAttribute('aria-pressed', 'false');
            genreBtn.setAttribute('title', `Filter by ${genre} content`);

            genreBtn.style.animationDelay = `${index * 0.05}s`;

            genreBtn.addEventListener('click', () => {
                this.toggleGenreFilter(genre, genreBtn);
                this.updateSelectedCount();
            });

            genreGrid.appendChild(genreBtn);
        });

        genreFilterToggle.addEventListener('click', () => {
            const isVisible = genreFilterContainer.style.display !== 'none';
            genreFilterContainer.style.display = isVisible ? 'none' : 'block';

            genreFilterToggle.classList.toggle('active', !isVisible);

            genreFilterToggle.setAttribute('aria-expanded', !isVisible);

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        });

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.allGenres.forEach(genre => {
                    const genreLower = genre.toLowerCase();
                    if (!this.selectedGenres.has(genreLower)) {
                        this.selectedGenres.add(genreLower);
                        const button = document.querySelector(`[data-genre="${genreLower}"]`);
                        if (button) {
                            button.classList.add('active');
                            button.setAttribute('aria-pressed', 'true');
                        }
                    }
                });
                this.updateSelectedCount();
                this.applyGenreFilters();

                this.showNotification('All genres selected', 'info');
            });
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.selectedGenres.clear();
                document.querySelectorAll('.genre-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                this.updateSelectedCount();
                this.applyGenreFilters();

                this.showNotification('All filters cleared', 'info');
            });
        }

        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) {
            const count = this.selectedGenres.size;
            const text = count === 0 ? 'No genres selected' :
                count === 1 ? '1 genre selected' :
                    `${count} genres selected`;
            selectedCount.textContent = text;

            selectedCount.style.color = count > 0 ? 'var(--cinebrain-primary)' : 'var(--text-secondary)';
            selectedCount.style.fontWeight = count > 0 ? '600' : '500';
        }
    }

    toggleGenreFilter(genre, button) {
        const genreLower = genre.toLowerCase();

        button.classList.add('loading');

        setTimeout(() => {
            if (this.selectedGenres.has(genreLower)) {
                this.selectedGenres.delete(genreLower);
                button.classList.remove('active');
                button.setAttribute('aria-pressed', 'false');
            } else {
                this.selectedGenres.add(genreLower);
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
            }

            button.classList.remove('loading');

            this.applyGenreFilters();

            const action = this.selectedGenres.has(genreLower) ? 'added' : 'removed';
            button.setAttribute('title', `${genre} filter ${action}`);

        }, 150);
    }

    applyGenreFilters() {
        const contentCards = document.querySelectorAll('.content-card');
        let visibleCount = 0;

        if (this.selectedGenres.size === 0) {
            contentCards.forEach(card => {
                card.style.display = '';
                card.style.opacity = '1';
            });
            visibleCount = contentCards.length;
        } else {
            contentCards.forEach(card => {
                const genreChips = card.querySelectorAll('.genre-chip');
                const cardGenres = Array.from(genreChips).map(chip =>
                    chip.textContent.toLowerCase()
                );

                const hasMatchingGenre = Array.from(this.selectedGenres).some(selectedGenre =>
                    cardGenres.some(cardGenre =>
                        cardGenre.includes(selectedGenre) || selectedGenre.includes(cardGenre)
                    )
                );

                if (hasMatchingGenre) {
                    card.style.display = '';
                    card.style.opacity = '1';
                    visibleCount++;
                } else {
                    card.style.opacity = '0.3';
                    setTimeout(() => {
                        if (card.style.opacity === '0.3') {
                            card.style.display = 'none';
                        }
                    }, 300);
                }
            });
        }

        setTimeout(() => {
            document.querySelectorAll('.content-row').forEach(row => {
                this.setupTrendingCarouselNavigation(row);
            });
        }, 350);

        if (this.selectedGenres.size > 0) {
            const message = visibleCount === 0 ? 'No content matches selected filters' :
                visibleCount === 1 ? '1 item matches your filters' :
                    `${visibleCount} items match your filters`;

            if (visibleCount === 0) {
                this.showNotification(message, 'warning');
            }
        }
    }

    configureHeroForTrending() {
        if (window.heroFooterManager) {
            window.heroFooterManager.autoPlayDuration = 4000;
            window.heroFooterManager.trendingMode = true;

            const originalFetchMethod = window.heroFooterManager.fetchMultipleContentSources;
            window.heroFooterManager.fetchMultipleContentSources = async function () {
                const sources = [];

                try {
                    const trendingMovies = await this.fetchContentWithRetry(
                        '/recommendations/trending',
                        { category: 'movies', limit: 5, sort: 'popularity', timeframe: 'today' }
                    );

                    if (trendingMovies && trendingMovies.length > 0) {
                        sources.push({
                            name: 'trending_movies_hero',
                            data: trendingMovies,
                            weight: 5
                        });
                    }

                    const generalTrending = await this.fetchContentWithRetry(
                        '/recommendations/trending',
                        { category: 'all', limit: 8, sort: 'popularity' }
                    );

                    if (generalTrending && generalTrending.length > 0) {
                        sources.push({
                            name: 'general_trending',
                            data: generalTrending,
                            weight: 4
                        });
                    }

                } catch (error) {
                    console.warn('Failed to fetch trending hero content:', error);
                    return originalFetchMethod.call(this);
                }

                return sources;
            }.bind(window.heroFooterManager);
        }
    }

    async startBackgroundPreloading() {
        try {
            const highPriorityRows = this.trendingRows
                .filter(row => row.priority <= 2 && row.cached)
                .slice(0, 3);

            console.log(`CineBrain: Starting trending background preload for ${highPriorityRows.length} high-priority rows`);

            const preloadPromises = highPriorityRows.map(async rowConfig => {
                try {
                    console.log(`CineBrain: Preloading trending ${rowConfig.id}...`);
                    const content = await this.fetchTrendingContent(rowConfig.endpoint, rowConfig.params, true);
                    if (content && Array.isArray(content) && content.length > 0) {
                        this.preloadedContent.set(rowConfig.id, content);
                        console.log(`CineBrain: Preloaded trending ${rowConfig.id} with ${content.length} items`);
                    } else {
                        console.log(`CineBrain: Preload for trending ${rowConfig.id} returned no content`);
                    }
                } catch (err) {
                    console.warn(`CineBrain trending preload failed for ${rowConfig.id}:`, err);
                }
            });

            await Promise.allSettled(preloadPromises);
            console.log('CineBrain: Trending background preloading completed');
        } catch (error) {
            console.warn('CineBrain trending background preloading error:', error);
        }
    }

    async loadAllTrendingContentIntelligently() {
        const sortedRows = [...this.trendingRows].sort((a, b) => a.priority - b.priority);

        const highPriorityRows = sortedRows.filter(row => row.priority <= 2);
        const lowPriorityRows = sortedRows.filter(row => row.priority > 2);

        console.log(`CineBrain: Loading ${highPriorityRows.length} high-priority trending rows first`);

        const highPriorityPromises = highPriorityRows.map(async (rowConfig, index) => {
            await new Promise(resolve => setTimeout(resolve, index * 50));
            return this.loadTrendingContentRowWithInstantDisplay(rowConfig);
        });

        await Promise.allSettled(highPriorityPromises);

        console.log(`CineBrain: Loading ${lowPriorityRows.length} low-priority trending rows with delay`);

        lowPriorityRows.forEach((rowConfig, index) => {
            setTimeout(() => {
                this.loadTrendingContentRowWithInstantDisplay(rowConfig);
            }, index * 200 + 300);
        });
    }

    async loadTrendingContentRowWithInstantDisplay(rowConfig) {
        const rowId = rowConfig.id;

        try {
            if (this.preloadedContent.has(rowId)) {
                const preloadedContent = this.preloadedContent.get(rowId);
                console.log(`CineBrain: Using preloaded trending content for ${rowId} (${preloadedContent.length} items)`);
                this.displayTrendingContent(rowId, preloadedContent);
                this.setRowLoadingState(rowId, 'loaded');

                this.loadTrendingContentRowInBackground(rowConfig);
                return;
            }

            const cacheKey = this.getTrendingCacheKey(rowConfig);
            if (this.contentCache.has(cacheKey)) {
                const cachedContent = this.contentCache.get(cacheKey);
                console.log(`CineBrain: Using cached trending content for ${rowId} (${cachedContent.content.length} items)`);
                this.displayTrendingContent(rowId, cachedContent.content);
                this.setRowLoadingState(rowId, 'loaded');

                if (this.isTrendingCacheStale(cacheKey)) {
                    this.loadTrendingContentRowInBackground(rowConfig);
                }
                return;
            }

            await this.loadTrendingContentRow(rowConfig);

        } catch (error) {
            console.error(`CineBrain error loading trending row ${rowId}:`, error);
            this.setRowLoadingState(rowId, 'error');
        }
    }

    async loadTrendingContentRowInBackground(rowConfig) {
        try {
            console.log(`CineBrain: Background refresh for trending ${rowConfig.id}`);
            const content = await this.fetchTrendingContent(rowConfig.endpoint, rowConfig.params, false);
            if (content && Array.isArray(content) && content.length > 0) {
                const cacheKey = this.getTrendingCacheKey(rowConfig);
                this.contentCache.set(cacheKey, {
                    content,
                    timestamp: Date.now()
                });

                this.displayTrendingContent(rowConfig.id, content);
                console.log(`CineBrain: Background refresh completed for trending ${rowConfig.id} (${content.length} items)`);
            }
        } catch (error) {
            console.warn(`CineBrain trending background refresh failed for ${rowConfig.id}:`, error);
        }
    }

    createTrendingCarouselRow(rowConfig) {
        const row = document.createElement('div');
        row.className = 'content-row loading';
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
                    ${this.createTrendingSkeletons(8)}
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

    createTrendingSkeletons(count) {
        return Array(count).fill('').map((_, index) => `
            <div class="skeleton-card trending-skeleton" style="animation-delay: ${index * 0.1}s;">
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

    async fetchTrendingContent(endpoint, params = {}, isPreload = false, signal = null) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.apiBase}${endpoint}${queryString ? '?' + queryString : ''}`;

        const headers = {};
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const timeout = isPreload ? 12000 : 8000;

        const requestOptions = {
            headers,
            signal: signal || AbortSignal.timeout(timeout)
        };

        try {
            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                throw new Error(`CineBrain Trending API error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                const trendingData = data.data;

                if (trendingData.recommendations && Array.isArray(trendingData.recommendations)) {
                    return trendingData.recommendations;
                }

                if (trendingData.categories) {
                    const allContent = [];
                    Object.values(trendingData.categories).forEach(categoryItems => {
                        if (Array.isArray(categoryItems)) {
                            allContent.push(...categoryItems);
                        }
                    });

                    const uniqueContent = this.deduplicateContent(allContent);
                    return uniqueContent.slice(0, params.limit || 20);
                }

                if (Array.isArray(trendingData)) {
                    return trendingData;
                }
            }

            if (data.recommendations && Array.isArray(data.recommendations)) {
                return data.recommendations;
            }

            if (data.categories) {
                const allContent = [];
                Object.values(data.categories).forEach(categoryItems => {
                    if (Array.isArray(categoryItems)) {
                        allContent.push(...categoryItems);
                    }
                });

                const uniqueContent = this.deduplicateContent(allContent);
                return uniqueContent.slice(0, params.limit || 20);
            }

            if (data.results && Array.isArray(data.results)) {
                return data.results;
            }

            if (Array.isArray(data)) {
                return data;
            }

            console.warn('CineBrain: No recognizable trending content structure found in response for', endpoint);
            return [];

        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            console.error('CineBrain trending fetch error:', error);
            throw error;
        }
    }

    displayTrendingContent(rowId, content) {
        const row = document.getElementById(rowId);
        if (!row) return;

        const wrapper = row.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = '';

        if (!content || !Array.isArray(content) || content.length === 0) {
            wrapper.innerHTML = `
                <div class="error-message">
                    <h3>No trending content available</h3>
                    <p>Check back later for trending updates</p>
                </div>
            `;
            return;
        }

        content.forEach((item, index) => {
            const card = this.createTrendingContentCard(item, index, rowId);

            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            wrapper.appendChild(card);

            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 20);
        });

        this.setupTrendingCarouselNavigation(row);
        console.log(`CineBrain: Displayed ${content.length} trending items for ${rowId}`);
    }

    createTrendingContentCard(content, index, rowId) {
        const card = document.createElement('div');
        card.className = 'content-card trending-card';
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
        const isInFavorites = this.userFavorites.has(content.id);

        card.innerHTML = `
            <div class="card-poster-container">
                <img 
                    class="card-poster" 
                    data-src="${posterUrl}" 
                    alt="${this.escapeHtml(content.title || 'CineBrain Trending Content')}"
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

        this.setupTrendingCardHandlers(card, content);
        this.setupLazyLoading(card);

        return card;
    }

    setupTrendingCardHandlers(card, content) {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.wishlist-btn')) {
                let slug = content.slug;

                if (!slug && content.title) {
                    slug = this.generateSlug(content.title, content.release_date);
                }

                if (slug) {
                    window.location.href = `/content/details.html?${encodeURIComponent(slug)}`;
                } else {
                    console.error('CineBrain: No slug available for trending content:', content);
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

    setupTrendingCarouselNavigation(carouselRow) {
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

        try {
            const response = await fetch(`${this.apiBase}/user/favorites`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                signal: AbortSignal.timeout(5000)
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
                console.log('CineBrain: Loaded trending favorites with', this.userFavorites.size, 'items');

                this.updateWishlistButtons();
            } else if (response.status === 401) {
                console.error('CineBrain authentication failed, clearing token');
                this.handleAuthFailure();
            }
        } catch (error) {
            console.error('CineBrain error loading trending favorites:', error);
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
                    interaction_type: isCurrentlyInFavorites ? 'remove_favorite' : 'favorite'
                }),
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                this.showNotification(
                    isCurrentlyInFavorites ? 'Removed from CineBrain favorites' : 'Added to CineBrain favorites',
                    'success'
                );
            } else {
                if (isCurrentlyInFavorites) {
                    button.classList.add('active');
                    this.userFavorites.add(contentId);
                    this.interactionStates.set(contentId, 'favorite');
                    button.setAttribute('title', 'Remove from CineBrain Favorites');
                    button.setAttribute('aria-label', 'Remove from CineBrain Favorites');
                } else {
                    button.classList.remove('active');
                    this.userFavorites.delete(contentId);
                    this.interactionStates.delete(contentId);
                    button.setAttribute('title', 'Add to CineBrain Favorites');
                    button.setAttribute('aria-label', 'Add to CineBrain Favorites');
                }
                throw new Error('Failed to update CineBrain favorites');
            }

        } catch (error) {
            this.showNotification('Failed to update CineBrain favorites', 'error');
            console.error('CineBrain error updating favorites:', error);
        } finally {
            setTimeout(() => {
                button.disabled = false;
            }, 300);
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

    async loadTrendingContentRow(rowConfig) {
        const row = document.getElementById(rowConfig.id);
        if (!row) return;

        const wrapper = row.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        try {
            this.setRowLoadingState(rowConfig.id, 'loading');

            const cacheKey = this.getTrendingCacheKey(rowConfig);
            let content;

            const cached = this.contentCache.get(cacheKey);
            if (cached && !this.isTrendingCacheStale(cacheKey)) {
                content = cached.content;
                console.log(`CineBrain: Using cached trending content for ${rowConfig.id} (${content.length} items)`);
            } else {
                if (this.loadingControllers.has(rowConfig.id)) {
                    this.loadingControllers.get(rowConfig.id).abort();
                }

                const controller = new AbortController();
                this.loadingControllers.set(rowConfig.id, controller);

                console.log(`CineBrain: Fetching fresh trending content for ${rowConfig.id}`);
                content = await this.fetchTrendingContentWithRetry(rowConfig, controller.signal);

                if (content && Array.isArray(content) && content.length > 0 && rowConfig.cached) {
                    this.contentCache.set(cacheKey, {
                        content,
                        timestamp: Date.now()
                    });
                    console.log(`CineBrain: Cached ${content.length} trending items for ${rowConfig.id}`);
                }
            }

            this.displayTrendingContent(rowConfig.id, content || []);
            this.setRowLoadingState(rowConfig.id, 'loaded');

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`CineBrain trending request aborted for ${rowConfig.id}`);
                return;
            }

            console.error(`CineBrain error loading trending ${rowConfig.title}:`, error);
            this.setRowLoadingState(rowConfig.id, 'error');

            const wrapper = row.querySelector('.carousel-wrapper');
            wrapper.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load trending content</h3>
                    <p>Please check your connection and try again</p>
                    <button class="retry-btn" data-row-id="${rowConfig.id}">Retry</button>
                </div>
            `;

            const retryBtn = wrapper.querySelector('.retry-btn');
            retryBtn?.addEventListener('click', () => {
                wrapper.innerHTML = this.createTrendingSkeletons(8);
                this.loadTrendingContentRow(rowConfig);
            });
        }
    }

    async fetchTrendingContentWithRetry(rowConfig, signal) {
        const maxRetries = rowConfig.retries || 1;
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.fetchTrendingContent(rowConfig.endpoint, rowConfig.params, false, signal);
            } catch (error) {
                lastError = error;

                if (error.name === 'AbortError' || attempt === maxRetries) {
                    break;
                }

                console.warn(`CineBrain trending attempt ${attempt + 1} failed for ${rowConfig.id}, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }

        throw lastError;
    }

    setupEventListeners() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                document.querySelectorAll('.content-row').forEach(row => {
                    this.setupTrendingCarouselNavigation(row);
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
        console.log('CineBrain trending auth state changed - refreshing content');

        this.trendingRows.forEach(rowConfig => {
            this.setRowLoadingState(rowConfig.id, 'loading');
            const wrapper = document.getElementById(rowConfig.id)?.querySelector('.carousel-wrapper');
            if (wrapper) {
                wrapper.innerHTML = this.createTrendingSkeletons(8);
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

        await this.loadAllTrendingContentIntelligently();
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

    setRowLoadingState(rowId, state) {
        this.loadingStates.set(rowId, state);
        const row = document.getElementById(rowId);
        if (row) {
            row.classList.remove('loading', 'loaded', 'error');
            row.classList.add(state);
        }
    }

    getTrendingCacheKey(rowConfig) {
        return `cinebrain-trending-${rowConfig.endpoint}-${JSON.stringify(rowConfig.params)}-${this.isAuthenticated ? 'auth' : 'anon'}`;
    }

    isTrendingCacheStale(cacheKey) {
        const cached = this.contentCache.get(cacheKey);
        if (!cached || !cached.timestamp) return true;

        const threeMinutes = 3 * 60 * 1000;
        return Date.now() - cached.timestamp > threeMinutes;
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

    showNotification(message, type = 'info') {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            console.log(`CineBrain Trending ${type.toUpperCase()}: ${message}`);
        }
    }

    formatPosterUrl(posterPath) {
        if (!posterPath) {
            return this.getPlaceholderImage();
        }
        if (posterPath.startsWith('http')) return posterPath;
        return `https://image.tmdb.org/t/p/w500${posterPath}`;
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
}

if (document.getElementById('trending-content-container')) {
    const cineBrainTrendingContentManager = new CineBrainTrendingContentManager();
    window.trendingContentManager = cineBrainTrendingContentManager;
    window.cineBrainTrendingContentManager = cineBrainTrendingContentManager;
} else {
    console.log('CineBrain TrendingContentManager: Skipped initialization - not on trending page');
}