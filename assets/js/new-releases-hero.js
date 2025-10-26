class CineBrainNewReleasesHeroManager {
    constructor() {
        this.apiBase = 'https://cinebrain.onrender.com/api';
        this.authToken = this.getAuthToken();
        this.isAuthenticated = !!this.authToken;

        this.featuredContent = [];
        this.currentIndex = 0;
        this.autoPlayTimer = null;
        this.controlsHintTimer = null;
        this.isPlaying = false;
        this.autoPlayDuration = 5000;
        this.isDestroyed = false;

        this.contentCache = new Map();
        this.userWishlist = new Set();
        this.isMobile = window.innerWidth <= 768;
        this.observers = new Set();
        this.eventListeners = new Map();

        this.keyboardControlsEnabled = true;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 50;

        this.refreshInterval = null;
        this.realTimeUpdateInterval = 30 * 60 * 1000;
        this.dailyRefreshInterval = 6 * 60 * 60 * 1000;
        this.lastUpdateDate = this.getTodayDateString();
        this.lastUpdateTime = Date.now();

        this.languagePriorities = ['telugu', 'english', 'hindi', 'malayalam', 'kannada', 'tamil'];

        this.bindMethods();
        this.init().catch(this.handleError.bind(this));
    }

    bindMethods() {
        this.onThemeChange = this.onThemeChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
    }

    getAuthToken() {
        try {
            return localStorage.getItem('cinebrain-token');
        } catch (error) {
            return null;
        }
    }

    async init() {
        if (this.isDestroyed) return;

        try {
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve, { once: true });
                });
            }

            if (this.isDestroyed) return;

            await this.setup();
        } catch (error) {
            this.handleError(error);
        }
    }

    async setup() {
        const heroSection = document.getElementById('heroSection');
        if (!heroSection) {
            return;
        }

        heroSection.setAttribute('tabindex', '0');
        heroSection.setAttribute('aria-label', 'CineBrain New Releases Hero carousel - Use arrow keys to navigate, enter for details');

        if (window.themeManager) {
            window.themeManager.register(this.onThemeChange);
        }

        if (window.contentCardManager?.userWishlist) {
            this.userWishlist = window.contentCardManager.userWishlist;
        }

        try {
            if (this.isAuthenticated) {
                await this.loadUserFavorites();
            }

            this.preventSkeletonConflicts();
            this.optimizeAnimationPerformance();

            await this.initHero();
            this.setupEventListeners();
            this.setupKeyboardControls();
            this.setupEnhancedTouchControls();
            this.updateFeatherIcons();
            this.startAutoPlay();
            this.showControlsHint();
            this.startRealTimeUpdates();

        } catch (error) {
            this.handleError(error);
        }
    }

    preventSkeletonConflicts() {
        const heroLoading = document.getElementById('heroLoading');
        if (heroLoading) {
            heroLoading.classList.add('hero-skeleton-container');
        }

        if (window.contentCardManager) {
            setTimeout(() => {
                const contentCards = document.querySelectorAll('.content-card');
                contentCards.forEach(card => {
                    card.style.animation = 'none';
                    card.offsetHeight;
                    card.style.animation = null;
                });
            }, 100);
        }
    }

    optimizeAnimationPerformance() {
        const heroSection = document.getElementById('heroSection');
        const contentContainer = document.getElementById('newReleasesContainer');

        if (contentContainer && heroSection) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        const loadingCards = contentContainer.querySelectorAll('.skeleton-card');

                        if (loadingCards.length > 0) {
                            heroSection.style.setProperty('--hero-skeleton-speed', '3s');
                        } else {
                            heroSection.style.setProperty('--hero-skeleton-speed', '1.5s');
                        }
                    }
                });
            });

            observer.observe(contentContainer, {
                childList: true,
                subtree: true
            });

            this.observers.add(observer);
        }
    }

    async loadUserFavorites() {
        if (!this.isAuthenticated || this.isDestroyed) {
            this.userWishlist.clear();
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.apiBase}/user/favorites`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                this.userWishlist.clear();

                if (Array.isArray(data?.favorites)) {
                    data.favorites.forEach(item => {
                        if (item?.id) this.userWishlist.add(item.id);
                    });
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.handleError(error);
            }
        }
    }

    async initHero() {
        if (this.isDestroyed) return;

        try {
            this.showHeroLoading(true);
            await this.fetchOnlyNewReleasesContent();

            if (this.isDestroyed) return;

            if (this.featuredContent.length > 0) {
                await this.displayHeroContent(0);
                this.showHeroLoading(false);
            } else {
                this.showHeroFallback();
            }

        } catch (error) {
            if (!this.isDestroyed) {
                this.showHeroError();
                this.handleError(error);
            }
        }
    }

    async fetchOnlyNewReleasesContent() {
        if (this.isDestroyed) return;

        try {
            const cacheKey = `cinebrain-new-releases-hero-only-${this.getTodayDateString()}`;
            const cachedContent = this.getCachedContent(cacheKey);

            if (cachedContent && this.isCacheValid(cachedContent.timestamp)) {
                this.featuredContent = cachedContent.content;
                this.scheduleBackgroundRefresh();
                return;
            }

            const newReleasesSources = await this.fetchOnlyNewReleasesSources();
            const processedContent = this.processOnlyNewReleasesContent(newReleasesSources);

            this.featuredContent = this.selectBestNewReleases(processedContent, 6);

            this.setCachedContent(cacheKey, {
                content: this.featuredContent,
                timestamp: Date.now()
            }, this.realTimeUpdateInterval);

        } catch (error) {
            if (error.name !== 'AbortError' && !this.isDestroyed) {
                this.featuredContent = this.getFallbackNewReleasesContent();
                this.handleError(error);
            }
        }
    }

    async fetchOnlyNewReleasesSources() {
        const sources = [];
        const controllers = [];

        try {
            const newReleasesConfigs = [
                {
                    name: 'latest_releases',
                    endpoint: '/recommendations/new-releases',
                    params: {
                        date_range: 'week',
                        limit: 25,
                        sort_by: 'release_date_desc',
                        force_refresh: 'true'
                    },
                    weight: 5
                },
                {
                    name: 'new_movies',
                    endpoint: '/recommendations/new-releases',
                    params: {
                        content_type: 'movie',
                        limit: 20,
                        sort_by: 'release_date_desc'
                    },
                    weight: 4
                },
                {
                    name: 'new_tv_shows',
                    endpoint: '/recommendations/new-releases',
                    params: {
                        content_type: 'tv',
                        limit: 20,
                        sort_by: 'release_date_desc'
                    },
                    weight: 4
                },
                {
                    name: 'new_anime',
                    endpoint: '/recommendations/anime',
                    params: {
                        type: 'airing',
                        limit: 15,
                        sort_by: 'start_date_desc'
                    },
                    weight: 3
                },
                {
                    name: 'cinebrain_new_releases_service',
                    endpoint: '/recommendations/new-releases',
                    params: {
                        use_cache: 'false',
                        limit: 30
                    },
                    weight: 5
                }
            ];

            const fetchPromises = newReleasesConfigs.map(async (config) => {
                try {
                    const controller = new AbortController();
                    controllers.push(controller);

                    const data = await this.fetchContentWithRetry(
                        config.endpoint,
                        config.params,
                        controller.signal
                    );

                    return {
                        name: config.name,
                        data: data || [],
                        weight: config.weight
                    };
                } catch (error) {
                    return { name: config.name, data: [], weight: config.weight };
                }
            });

            const results = await Promise.allSettled(fetchPromises);

            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value.data.length > 0) {
                    sources.push(result.value);
                }
            });

            return sources;

        } catch (error) {
            this.handleError(error);
            return sources;
        } finally {
            controllers.forEach(controller => {
                try {
                    controller.abort();
                } catch (e) { }
            });
        }
    }

    async fetchContentWithRetry(endpoint, params = {}, signal = null, retries = 2) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const queryString = new URLSearchParams(params).toString();
                const url = `${this.apiBase}${endpoint}${queryString ? '?' + queryString : ''}`;

                const headers = { 'Content-Type': 'application/json' };
                if (this.authToken) {
                    headers['Authorization'] = `Bearer ${this.authToken}`;
                }

                const timeoutSignal = AbortSignal.timeout(8000);
                const combinedSignal = signal ?
                    AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

                const response = await fetch(url, {
                    headers,
                    signal: combinedSignal
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        this.handleAuthFailure();
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return this.parseNewReleasesOnlyResponse(data);

            } catch (error) {
                if (error.name === 'AbortError') {
                    throw error;
                }

                if (attempt === retries) {
                    throw error;
                }

                await this.delay(Math.pow(2, attempt) * 1000);
            }
        }
    }

    parseNewReleasesOnlyResponse(data) {
        if (!data) return [];

        if (data.success && data.data) {
            if (Array.isArray(data.data.priority_content)) {
                return this.filterOnlyNewReleases(data.data.priority_content);
            } else if (data.data.all_content) {
                const allContent = [];
                Object.values(data.data.all_content).forEach(categoryItems => {
                    if (Array.isArray(categoryItems)) {
                        allContent.push(...categoryItems);
                    }
                });
                return this.filterOnlyNewReleases(allContent);
            }
        }

        if (Array.isArray(data.recommendations)) {
            return this.filterOnlyNewReleases(data.recommendations);
        }

        if (data.categories) {
            const allContent = [];
            Object.values(data.categories).forEach(categoryItems => {
                if (Array.isArray(categoryItems)) {
                    allContent.push(...categoryItems);
                }
            });
            return this.filterOnlyNewReleases(allContent);
        }

        if (Array.isArray(data.results)) {
            return this.filterOnlyNewReleases(data.results);
        }

        if (Array.isArray(data)) {
            return this.filterOnlyNewReleases(data);
        }

        return [];
    }

    filterOnlyNewReleases(content) {
        if (!Array.isArray(content)) return [];

        return content.filter(item => {
            if (!item || !item.release_date) return false;

            try {
                const releaseDate = new Date(item.release_date);
                const now = new Date();
                const daysDiff = (now - releaseDate) / (1000 * 60 * 60 * 24);

                return daysDiff >= -30 && daysDiff <= 45;
            } catch (e) {
                return false;
            }
        });
    }

    processOnlyNewReleasesContent(sources) {
        const allContent = [];
        const seenIds = new Set();

        sources.forEach(source => {
            const { data, weight, name } = source;

            data.forEach(item => {
                if (!item || !item.id || seenIds.has(item.id)) return;

                if (!item.title || !this.hasValidImage(item)) return;

                if (!this.isStrictNewRelease(item)) return;

                seenIds.add(item.id);

                const processedItem = {
                    ...item,
                    source: name,
                    weight: weight,
                    processedAt: Date.now(),
                    slug: item.slug || this.generateSlug(item.title, item.release_date),
                    newReleaseScore: this.calculateNewReleaseScore(item)
                };

                allContent.push(processedItem);
            });
        });

        return allContent;
    }

    isStrictNewRelease(item) {
        if (!item.release_date) return false;

        try {
            const releaseDate = new Date(item.release_date);
            const now = new Date();
            const daysDiff = (now - releaseDate) / (1000 * 60 * 60 * 24);

            return daysDiff >= -30 && daysDiff <= 45;
        } catch (e) {
            return false;
        }
    }

    calculateNewReleaseScore(item) {
        if (!item.release_date) return 0;

        try {
            const releaseDate = new Date(item.release_date);
            const now = new Date();
            const daysDiff = (now - releaseDate) / (1000 * 60 * 60 * 24);

            let score = 100;

            if (daysDiff < 0) {
                score = 120 + Math.abs(daysDiff);
            } else if (daysDiff <= 7) {
                score = 100;
            } else if (daysDiff <= 14) {
                score = 85;
            } else if (daysDiff <= 30) {
                score = 70;
            } else if (daysDiff <= 45) {
                score = 50;
            } else {
                score = 0;
            }

            if (item.rating && item.rating >= 8.0) score += 20;
            if (item.popularity && item.popularity > 50) score += 15;

            const telugu_keywords = ['telugu', 'tollywood', 'te'];
            const itemLanguages = (item.languages || []).map(l => l.toLowerCase());
            if (telugu_keywords.some(keyword =>
                itemLanguages.includes(keyword) ||
                (item.title && item.title.toLowerCase().includes(keyword))
            )) {
                score += 25;
            }

            return score;
        } catch (e) {
            return 0;
        }
    }

    selectBestNewReleases(content, maxCount) {
        if (!Array.isArray(content)) return [];

        const scored = content.map(item => {
            let score = item.newReleaseScore || 0;

            score += (item.weight || 1) * 10;

            if (item.rating) {
                score += Math.min(15, item.rating * 1.5);
            }

            if (item.popularity) {
                score += Math.min(10, item.popularity / 30);
            }

            if (item.backdrop_path || item.poster_path) {
                score += 5;
            }

            return { ...item, finalScore: score };
        });

        scored.sort((a, b) => b.finalScore - a.finalScore);

        const selected = [];
        const usedTypes = new Map();
        const maxPerType = Math.ceil(maxCount / 3);

        for (const item of scored) {
            if (selected.length >= maxCount) break;

            const contentType = item.content_type || 'movie';
            const typeCount = usedTypes.get(contentType) || 0;

            if (typeCount < maxPerType) {
                selected.push(item);
                usedTypes.set(contentType, typeCount + 1);
            }
        }

        while (selected.length < maxCount && scored.length > selected.length) {
            const remaining = scored.filter(item =>
                !selected.some(s => s.id === item.id)
            );

            if (remaining.length === 0) break;
            selected.push(remaining[0]);
        }

        return selected.slice(0, maxCount);
    }

    hasValidImage(item) {
        return !!(item.backdrop_path || item.poster_path || item.poster_url);
    }

    getFallbackNewReleasesContent() {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        return [
            {
                id: 'cinebrain-new-releases-fallback-1',
                title: 'This Week\'s New CineBrain Releases',
                overview: 'Discover the freshest movies, TV shows, and anime that just hit the screens. Stay updated with the latest entertainment releases.',
                content_type: 'movie',
                rating: 8.5,
                languages: ['telugu', 'english'],
                release_date: weekAgo.toISOString().split('T')[0],
                backdrop_path: this.getPlaceholderImage(),
                genres: ['New Releases', 'Fresh Content'],
                slug: 'this-weeks-new-cinebrain-releases',
                source: 'fallback',
                weight: 5,
                newReleaseScore: 100
            },
            {
                id: 'cinebrain-new-releases-fallback-2',
                title: 'Latest CineBrain Movie Releases',
                overview: 'The newest movies now available for streaming and in theaters. Don\'t miss out on the latest cinematic experiences.',
                content_type: 'movie',
                rating: 8.2,
                languages: ['hindi', 'english'],
                release_date: today.toISOString().split('T')[0],
                backdrop_path: this.getPlaceholderImage(),
                genres: ['Movies', 'Just Released'],
                slug: 'latest-cinebrain-movie-releases',
                source: 'fallback',
                weight: 4,
                newReleaseScore: 95
            }
        ];
    }

    async displayHeroContent(index) {
        if (this.isDestroyed || !this.featuredContent[index]) return;

        const content = this.featuredContent[index];

        try {
            await this.updateHeroElements(content);
            this.currentIndex = index;

        } catch (error) {
            this.handleError(error);
        }
    }

    async updateHeroElements(content) {
        if (this.isDestroyed || !content) return;

        const heroImage = document.getElementById('heroImage');
        const heroTitle = document.getElementById('heroTitle');
        const heroRating = document.getElementById('heroRating');
        const heroType = document.getElementById('heroType');
        const heroYear = document.getElementById('heroYear');
        const heroGenres = document.getElementById('heroGenres');
        const heroDescription = document.getElementById('heroDescription');
        const heroContent = document.querySelector('.hero-content');

        if (heroImage) {
            const imageUrl = this.getOptimalImageUrl(content);
            if (imageUrl) {
                const img = new Image();
                img.onload = () => {
                    if (!this.isDestroyed && heroImage) {
                        heroImage.src = imageUrl;
                        heroImage.classList.add('loaded');
                    }
                };
                img.onerror = () => {
                    if (!this.isDestroyed && heroImage) {
                        heroImage.src = this.getPlaceholderImage();
                        heroImage.classList.add('loaded');
                    }
                };
                img.src = imageUrl;
            }
        }

        if (heroTitle) {
            heroTitle.textContent = content.title || content.name || content.original_title || 'New CineBrain Release';
        }

        if (heroRating) {
            const ratingSpan = heroRating.querySelector('span');
            if (ratingSpan) {
                const rating = content.rating || content.vote_average || 0;
                ratingSpan.textContent = rating ? Number(rating).toFixed(1) : 'N/A';
            }
        }

        if (heroType) {
            let type = 'JUST RELEASED';

            if (content.release_date) {
                try {
                    const releaseDate = new Date(content.release_date);
                    const now = new Date();
                    const daysDiff = (now - releaseDate) / (1000 * 60 * 60 * 24);

                    if (daysDiff < 0) {
                        type = 'COMING SOON';
                    } else if (daysDiff <= 7) {
                        type = 'JUST RELEASED';
                    } else if (daysDiff <= 30) {
                        type = 'NEW RELEASE';
                    } else {
                        type = 'RECENT RELEASE';
                    }
                } catch (e) {
                    type = 'NEW RELEASE';
                }
            }

            heroType.textContent = type;
        }

        if (heroYear && content.release_date) {
            try {
                const year = new Date(content.release_date).getFullYear();
                heroYear.textContent = year && !isNaN(year) ? year : '';
            } catch (e) {
                heroYear.textContent = '';
            }
        }

        if (heroGenres) {
            const genres = this.extractGenres(content);
            heroGenres.textContent = genres.slice(0, 2).join(' • ') || 'New Release';
        }

        if (heroDescription) {
            const description = content.overview || content.description ||
                'Discover the latest entertainment releases with CineBrain\'s comprehensive new releases collection.';
            heroDescription.textContent = description;
        }

        this.updateHeroButtons(content);

        if (heroContent) {
            heroContent.classList.add('loaded');
        }
    }

    getOptimalImageUrl(content) {
        if (!content) return this.getPlaceholderImage();

        const backdrop = content.backdrop_path;
        const poster = content.poster_path || content.poster_url;

        if (backdrop) {
            if (backdrop.startsWith('http')) {
                return backdrop;
            }
            return `https://image.tmdb.org/t/p/w1280${backdrop}`;
        }

        if (poster) {
            if (poster.startsWith('http')) {
                return poster;
            }
            return `https://image.tmdb.org/t/p/w1280${poster}`;
        }

        return this.getPlaceholderImage();
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMTEzQ0NGIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMUU0RkU1Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSJ1cmwoI2EpIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiNmZmYiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5DaW5lQnJhaW48L3RleHQ+PC9zdmc+';
    }

    extractGenres(content) {
        if (!content) return [];

        if (Array.isArray(content.genres)) {
            return content.genres;
        }

        if (Array.isArray(content.anime_genres)) {
            return content.anime_genres;
        }

        if (typeof content.genres === 'string') {
            try {
                return JSON.parse(content.genres);
            } catch (e) {
                return content.genres.split(',').map(g => g.trim());
            }
        }

        return [];
    }

    updateHeroButtons(content) {
        if (this.isDestroyed || !content) return;

        const watchBtn = document.getElementById('heroWatchBtn');
        const wishlistBtn = document.getElementById('heroWishlistBtn');
        const infoBtn = document.getElementById('heroInfoBtn');

        if (watchBtn) {
            watchBtn.onclick = () => this.handleViewDetails(content);
            this.updateButtonContent(watchBtn, {
                icon: 'play',
                text: 'View Details',
                mobileAriaLabel: 'View CineBrain Details'
            });
        }

        if (wishlistBtn) {
            wishlistBtn.dataset.contentId = content.id;
            wishlistBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleWishlistToggle(content);
            };
            this.updateWishlistButtonState(wishlistBtn, content);
        }

        if (infoBtn) {
            infoBtn.onclick = () => this.handleViewDetails(content);
            this.updateButtonContent(infoBtn, {
                icon: 'info',
                text: 'More Info',
                mobileAriaLabel: 'More CineBrain Information'
            });
        }
    }

    updateButtonContent(button, config) {
        if (!button || !config) return;

        button.innerHTML = '';

        const icon = document.createElement('i');
        icon.setAttribute('data-feather', config.icon);
        button.appendChild(icon);

        const textSpan = document.createElement('span');
        textSpan.className = 'btn-text';
        textSpan.textContent = config.text;
        button.appendChild(textSpan);

        button.setAttribute('aria-label', config.mobileAriaLabel || config.text);
        button.setAttribute('title', config.text);
    }

    updateWishlistButtonState(button, content) {
        if (!button || !content) return;

        const isInWishlist = this.userWishlist.has(content.id) ||
            (window.contentCardManager?.userWishlist?.has(content.id));

        if (isInWishlist) {
            button.classList.add('active');
            this.updateButtonContent(button, {
                icon: 'heart',
                text: 'In CineBrain List',
                mobileAriaLabel: 'Remove from CineBrain Favorites'
            });
        } else {
            button.classList.remove('active');
            this.updateButtonContent(button, {
                icon: 'heart',
                text: 'Add to CineBrain List',
                mobileAriaLabel: 'Add to CineBrain Favorites'
            });
        }

        this.updateFeatherIcons();
    }

    startRealTimeUpdates() {
        this.refreshInterval = setInterval(async () => {
            const currentTime = Date.now();
            const timeSinceLastUpdate = currentTime - this.lastUpdateTime;

            if (timeSinceLastUpdate >= this.realTimeUpdateInterval) {
                await this.performBackgroundUpdate();
            }

            const today = this.getTodayDateString();
            if (today !== this.lastUpdateDate) {
                this.lastUpdateDate = today;
                await this.performDailyRefresh();
            }
        }, 60000);
    }

    async performBackgroundUpdate() {
        try {
            this.clearExpiredCache();

            const sources = await this.fetchOnlyNewReleasesSources();
            const processedContent = this.processOnlyNewReleasesContent(sources);
            const newPicks = this.selectBestNewReleases(processedContent, 6);

            if (newPicks.length > 0) {
                const oldPicks = [...this.featuredContent];
                this.featuredContent = newPicks;

                const cacheKey = `cinebrain-new-releases-hero-only-${this.getTodayDateString()}`;
                this.setCachedContent(cacheKey, {
                    content: this.featuredContent,
                    timestamp: Date.now()
                }, this.realTimeUpdateInterval);

                if (this.hasSignificantChanges(oldPicks, newPicks)) {
                    this.currentIndex = 0;
                    await this.displayHeroContent(0);
                }

                this.lastUpdateTime = Date.now();
            }

        } catch (error) {
            this.handleError(error);
        }
    }

    async performDailyRefresh() {
        try {
            this.contentCache.clear();

            await this.fetchOnlyNewReleasesContent();

            if (this.featuredContent.length > 0) {
                this.currentIndex = 0;
                await this.displayHeroContent(0);
                this.startAutoPlay();
            }

        } catch (error) {
            this.handleError(error);
        }
    }

    scheduleBackgroundRefresh() {
        setTimeout(async () => {
            await this.performBackgroundUpdate();
        }, 5 * 60 * 1000);
    }

    hasSignificantChanges(oldPicks, newPicks) {
        if (oldPicks.length !== newPicks.length) return true;

        const oldIds = new Set(oldPicks.map(p => p.id));
        const newIds = new Set(newPicks.map(p => p.id));

        const intersection = new Set([...oldIds].filter(id => newIds.has(id)));
        const changePercentage = 1 - (intersection.size / oldIds.size);

        return changePercentage >= 0.3;
    }

    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.contentCache.entries()) {
            if (value.expiry && now > value.expiry) {
                this.contentCache.delete(key);
            }
        }
    }

    isCacheValid(timestamp) {
        const now = Date.now();
        return (now - timestamp) < this.realTimeUpdateInterval;
    }

    goToSlide(index) {
        if (this.isDestroyed || index < 0 || index >= this.featuredContent.length) return;

        this.stopAutoPlay();
        this.displayHeroContent(index);
        this.startAutoPlay();
    }

    nextSlide() {
        if (this.isDestroyed || this.featuredContent.length === 0) return;

        const nextIndex = (this.currentIndex + 1) % this.featuredContent.length;
        this.goToSlide(nextIndex);
    }

    previousSlide() {
        if (this.isDestroyed || this.featuredContent.length === 0) return;

        const prevIndex = (this.currentIndex - 1 + this.featuredContent.length) % this.featuredContent.length;
        this.goToSlide(prevIndex);
    }

    startAutoPlay() {
        if (this.isDestroyed || this.featuredContent.length <= 1) return;

        this.stopAutoPlay();
        this.isPlaying = true;

        this.autoPlayTimer = setTimeout(() => {
            if (this.isPlaying && !this.isDestroyed) {
                this.nextSlide();
            }
        }, this.autoPlayDuration);
    }

    stopAutoPlay() {
        if (this.autoPlayTimer) {
            clearTimeout(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
        this.isPlaying = false;
    }

    setupKeyboardControls() {
        if (this.isDestroyed) return;

        document.addEventListener('keydown', this.handleKeyDown);
        this.addEventListenerTracking(document, 'keydown', this.handleKeyDown);

        const heroSection = document.getElementById('heroSection');
        if (heroSection) {
            heroSection.addEventListener('focus', this.handleFocus);
            this.addEventListenerTracking(heroSection, 'focus', this.handleFocus);
        }
    }

    handleKeyDown(e) {
        if (this.isDestroyed || !this.keyboardControlsEnabled || !this.isHeroVisible()) return;

        const handledKeys = ['ArrowLeft', 'ArrowRight', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
        if (handledKeys.includes(e.code)) {
            e.preventDefault();
        }

        switch (e.code) {
            case 'ArrowLeft':
                this.previousSlide();
                this.showControlsHint('Previous New Release');
                break;
            case 'ArrowRight':
                this.nextSlide();
                this.showControlsHint('Next New Release');
                break;
            case 'Enter':
                if (this.featuredContent[this.currentIndex]) {
                    this.handleViewDetails(this.featuredContent[this.currentIndex]);
                }
                break;
            case 'Digit1':
            case 'Digit2':
            case 'Digit3':
            case 'Digit4':
            case 'Digit5':
            case 'Digit6':
                const slideNumber = parseInt(e.code.replace('Digit', '')) - 1;
                if (slideNumber >= 0 && slideNumber < this.featuredContent.length) {
                    this.goToSlide(slideNumber);
                    this.showControlsHint(`New Release ${slideNumber + 1}`);
                }
                break;
        }
    }

    handleFocus() {
        if (!this.isDestroyed) {
            this.showControlsHint();
        }
    }

    setupEnhancedTouchControls() {
        if (this.isDestroyed) return;

        const heroSection = document.getElementById('heroSection');
        if (!heroSection) return;

        heroSection.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        heroSection.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        heroSection.addEventListener('touchend', this.handleTouchEnd, { passive: true });

        this.addEventListenerTracking(heroSection, 'touchstart', this.handleTouchStart);
        this.addEventListenerTracking(heroSection, 'touchmove', this.handleTouchMove);
        this.addEventListenerTracking(heroSection, 'touchend', this.handleTouchEnd);
    }

    handleTouchStart(e) {
        if (this.isDestroyed) return;

        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        if (this.isDestroyed) return;

        const deltaX = Math.abs(e.touches[0].clientX - this.touchStartX);
        const deltaY = Math.abs(e.touches[0].clientY - this.touchStartY);

        if (deltaX > deltaY && deltaX > 10) {
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        if (this.isDestroyed || !this.touchStartX || !this.touchStartY) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;

        const deltaX = this.touchStartX - endX;
        const deltaY = this.touchStartY - endY;

        this.touchStartX = 0;
        this.touchStartY = 0;

        if (Math.abs(deltaX) > this.swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                this.nextSlide();
            } else {
                this.previousSlide();
            }
        }
    }

    showControlsHint(action = '') {
        if (this.isMobile || this.isDestroyed) return;

        const hint = document.querySelector('.hero-controls-hint') || this.createControlsHint();
        if (!hint) return;

        const message = action || '←→ Navigate New Releases • Enter Details • 1-6 Go to release';
        hint.textContent = message;
        hint.classList.add('show');

        if (this.controlsHintTimer) {
            clearTimeout(this.controlsHintTimer);
        }

        this.controlsHintTimer = setTimeout(() => {
            if (!this.isDestroyed && hint) {
                hint.classList.remove('show');
            }
        }, action ? 1500 : 3000);
    }

    createControlsHint() {
        if (this.isDestroyed) return null;

        const heroSection = document.getElementById('heroSection');
        if (!heroSection) return null;

        const hint = document.createElement('div');
        hint.className = 'hero-controls-hint';
        heroSection.appendChild(hint);
        return hint;
    }

    isHeroVisible() {
        if (this.isDestroyed) return false;

        const heroSection = document.getElementById('heroSection');
        if (!heroSection) return false;

        const rect = heroSection.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    handleViewDetails(content) {
        if (this.isDestroyed || !content) return;

        const slug = content.slug || this.generateSlug(content.title || content.name, content.release_date);
        if (slug) {
            window.location.href = `/explore/details.html?${encodeURIComponent(slug)}`;
        } else {
            this.showNotification('Unable to view CineBrain details', 'error');
        }
    }

    async handleWishlistToggle(content) {
        if (this.isDestroyed || !content) return;

        if (!this.isAuthenticated) {
            this.showNotification('Please login to add to CineBrain favorites', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
        }

        const button = document.getElementById('heroWishlistBtn');
        if (!button || button.disabled) return;

        try {
            button.disabled = true;

            const isCurrentlyInFavorites = button.classList.contains('active') || this.userWishlist.has(content.id);
            const newState = !isCurrentlyInFavorites;

            if (newState) {
                button.classList.add('active');
                this.userWishlist.add(content.id);
            } else {
                button.classList.remove('active');
                this.userWishlist.delete(content.id);
            }

            this.updateWishlistButtonState(button, content);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(`${this.apiBase}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    content_id: content.id,
                    interaction_type: newState ? 'favorite' : 'remove_favorite'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (newState) {
                    button.classList.remove('active');
                    this.userWishlist.delete(content.id);
                } else {
                    button.classList.add('active');
                    this.userWishlist.add(content.id);
                }
                this.updateWishlistButtonState(button, content);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.showNotification(
                newState ? 'Added to CineBrain favorites' : 'Removed from CineBrain favorites',
                'success'
            );

            if (window.contentCardManager?.userFavorites) {
                if (newState) {
                    window.contentCardManager.userFavorites.add(content.id);
                    window.contentCardManager.interactionStates?.set(content.id, 'favorite');
                } else {
                    window.contentCardManager.userFavorites.delete(content.id);
                    window.contentCardManager.interactionStates?.delete(content.id);
                }
                window.contentCardManager.updateWishlistButtons?.();
            }

        } catch (error) {
            if (error.message.includes('401')) {
                this.handleAuthFailure();
                this.showNotification('Please login again to CineBrain', 'warning');
                return;
            }

            this.showNotification('Failed to update CineBrain favorites', 'error');
            this.handleError(error);
        } finally {
            setTimeout(() => {
                if (button && !this.isDestroyed) button.disabled = false;
            }, 300);
        }
    }

    handleAuthFailure() {
        try {
            localStorage.removeItem('cinebrain-token');
            localStorage.removeItem('cinebrain-user');
        } catch (error) { }

        this.authToken = null;
        this.isAuthenticated = false;
        this.userWishlist.clear();
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
            try {
                const year = new Date(releaseDate).getFullYear();
                if (year && !isNaN(year)) {
                    slug += `-${year}`;
                }
            } catch (e) { }
        }

        return slug.length > 100 ? slug.substring(0, 100).replace(/-[^-]*$/, '') : slug;
    }

    showHeroLoading(show) {
        if (this.isDestroyed) return;

        const heroLoading = document.getElementById('heroLoading');
        if (heroLoading) {
            if (show) {
                heroLoading.classList.remove('hidden');
            } else {
                heroLoading.classList.add('hidden');
            }
        }
    }

    showHeroFallback() {
        if (this.isDestroyed) return;

        this.featuredContent = this.getFallbackNewReleasesContent();
        this.displayHeroContent(0);
        this.showHeroLoading(false);
    }

    showHeroError() {
        if (this.isDestroyed) return;

        const heroSection = document.getElementById('heroSection');
        if (heroSection) {
            heroSection.innerHTML = `
                <div class="hero-error" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 2rem; color: white;">
                    <h2 style="margin-bottom: 1rem;">Unable to load new releases</h2>
                    <p style="margin-bottom: 1.5rem; opacity: 0.8;">Please check your connection and try again</p>
                    <button onclick="window.location.reload()" class="hero-btn hero-btn-primary" style="display: flex; align-items: center; gap: 0.5rem;">
                        <i data-feather="refresh-cw"></i>
                        <span class="btn-text">Retry</span>
                    </button>
                </div>
            `;
        }
        this.updateFeatherIcons();
    }

    setupEventListeners() {
        if (this.isDestroyed) return;

        window.addEventListener('resize', this.handleResize);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('userLoggedIn', this.handleAuthStateChange);
        window.addEventListener('userLoggedOut', this.handleAuthStateChange);
        window.addEventListener('focus', this.handleAuthStateChange);

        this.addEventListenerTracking(window, 'resize', this.handleResize);
        this.addEventListenerTracking(document, 'visibilitychange', this.handleVisibilityChange);
        this.addEventListenerTracking(window, 'userLoggedIn', this.handleAuthStateChange);
        this.addEventListenerTracking(window, 'userLoggedOut', this.handleAuthStateChange);
        this.addEventListenerTracking(window, 'focus', this.handleAuthStateChange);
    }

    handleResize() {
        if (this.isDestroyed) return;

        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        if (wasMobile !== this.isMobile && this.featuredContent[this.currentIndex]) {
            this.updateHeroElements(this.featuredContent[this.currentIndex]);
        }
    }

    handleVisibilityChange() {
        if (this.isDestroyed) return;

        if (document.hidden) {
            this.stopAutoPlay();
        } else if (this.featuredContent.length > 1) {
            this.startAutoPlay();
        }
    }

    async handleAuthStateChange() {
        if (this.isDestroyed) return;

        this.authToken = this.getAuthToken();
        this.isAuthenticated = !!this.authToken;

        if (this.isAuthenticated) {
            await this.loadUserFavorites();
        } else {
            this.userWishlist.clear();
        }

        if (window.contentCardManager?.userWishlist) {
            this.userWishlist = window.contentCardManager.userWishlist;
        }

        if (this.featuredContent[this.currentIndex]) {
            this.updateHeroButtons(this.featuredContent[this.currentIndex]);
        }
    }

    getTodayDateString() {
        return new Date().toISOString().split('T')[0];
    }

    getCachedContent(key) {
        try {
            const cached = localStorage.getItem(`cinebrain-hero-${key}`);
            if (!cached) return null;

            const data = JSON.parse(cached);
            if (Date.now() > data.expiry) {
                localStorage.removeItem(`cinebrain-hero-${key}`);
                return null;
            }

            return data.content;
        } catch (e) {
            return null;
        }
    }

    setCachedContent(key, content, ttl) {
        try {
            const data = {
                content,
                expiry: Date.now() + ttl
            };
            localStorage.setItem(`cinebrain-hero-${key}`, JSON.stringify(data));
        } catch (e) { }
    }

    showNotification(message, type) {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        }
    }

    onThemeChange() {
        this.updateFeatherIcons();
    }

    updateFeatherIcons() {
        if (this.isDestroyed) return;

        setTimeout(() => {
            if (typeof feather !== 'undefined' && !this.isDestroyed) {
                try {
                    feather.replace();
                } catch (error) {
                    this.handleError(error);
                }
            }
        }, 0);
    }

    addEventListenerTracking(element, event, handler) {
        if (!element || !event || !handler) return;

        const key = `${element.constructor.name}_${event}_${Date.now()}`;
        this.eventListeners.set(key, { element, event, handler });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
    }

    handleError(error) {
        if (error?.name === 'AbortError') return;
    }

    destroy() {
        this.isDestroyed = true;

        this.stopAutoPlay();

        if (this.controlsHintTimer) {
            clearTimeout(this.controlsHintTimer);
            this.controlsHintTimer = null;
        }

        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) { }
        });
        this.observers.clear();

        this.eventListeners.forEach(({ element, event, handler }) => {
            try {
                element.removeEventListener(event, handler);
            } catch (error) { }
        });
        this.eventListeners.clear();

        this.contentCache.clear();
        this.userWishlist.clear();
        this.featuredContent = [];

        if (window.themeManager) {
            try {
                window.themeManager.unregister(this.onThemeChange);
            } catch (error) { }
        }
    }
}

if (document.getElementById('heroSection')) {
    const cineBrainNewReleasesHeroManager = new CineBrainNewReleasesHeroManager();
    window.cineBrainNewReleasesHeroManager = cineBrainNewReleasesHeroManager;

    window.addEventListener('beforeunload', () => {
        if (window.cineBrainNewReleasesHeroManager) {
            window.cineBrainNewReleasesHeroManager.destroy();
        }
    });
}