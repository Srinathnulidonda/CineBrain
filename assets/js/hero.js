class HeroFooterManager {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;

        this.todaysPicks = [];
        this.currentIndex = 0;
        this.autoPlayTimer = null;
        this.isPlaying = true;
        this.autoPlayDuration = 5000;

        this.contentCache = new Map();
        this.lastUpdateDate = this.getTodayDateString();
        this.lastUpdateTime = Date.now();

        this.isMobile = window.innerWidth <= 768;
        this.userWishlist = new Set();

        this.keyboardControlsEnabled = true;
        this.controlsHintTimer = null;

        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 50;

        this.refreshInterval = null;
        this.realTimeUpdateInterval = 30 * 60 * 1000;
        this.dailyRefreshInterval = 6 * 60 * 60 * 1000;

        this.loadingControllers = new Map();

        if (window.themeManager) {
            window.themeManager.register((theme) => this.onThemeChange(theme));
        }

        this.init();
    }

    onThemeChange(theme) {
        this.updateFeatherIcons();
    }

    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    async setup() {
        if (window.contentCardManager?.userWishlist) {
            this.userWishlist = window.contentCardManager.userWishlist;
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
        const contentContainer = document.getElementById('content-container');

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
        }
    }

    async initHero() {
        const heroSection = document.getElementById('heroSection');
        if (!heroSection) {
            console.log('Hero section not found - skipping initialization');
            return;
        }

        heroSection.setAttribute('tabindex', '0');
        heroSection.setAttribute('aria-label', 'Hero carousel - Use arrow keys to navigate, enter for details');

        try {
            this.showHeroLoading(true);
            await this.fetchRealTimeContent();

            if (this.todaysPicks.length > 0) {
                await this.displayHeroContent(0);
                this.showHeroLoading(false);
            } else {
                this.showHeroFallback();
            }

        } catch (error) {
            console.error('Error initializing hero:', error);
            this.showHeroError();
        }
    }

    async fetchRealTimeContent() {
        try {
            const cacheKey = `hero-content-${this.getTodayDateString()}`;
            const cachedContent = this.getCachedContent(cacheKey);

            if (cachedContent && this.isCacheValid(cachedContent.timestamp)) {
                this.todaysPicks = cachedContent.content;
                console.log('Using cached hero content');

                this.scheduleBackgroundRefresh();
                return;
            }

            console.log('Fetching fresh hero content from backend...');

            const contentSources = await this.fetchMultipleContentSources();
            const processedContent = this.processBackendContent(contentSources);

            this.todaysPicks = this.selectDiverseContent(processedContent, 6);

            this.setCachedContent(cacheKey, {
                content: this.todaysPicks,
                timestamp: Date.now()
            }, this.realTimeUpdateInterval);

            console.log(`Fetched ${this.todaysPicks.length} real-time hero picks`);

        } catch (error) {
            console.error('Error fetching real-time content:', error);

            const fallbackCache = this.getCachedContent('hero-fallback');
            if (fallbackCache) {
                this.todaysPicks = fallbackCache.content;
                console.log('Using fallback cached content');
            } else {
                this.todaysPicks = this.getFallbackContent();
            }
        }
    }

    async fetchMultipleContentSources() {
        const sources = [];
        const controllers = [];

        try {
            const sourceConfigs = [
                {
                    name: 'trending',
                    endpoint: '/recommendations/trending',
                    params: { category: 'all', limit: 15, language_priority: 'true' },
                    weight: 3
                },
                {
                    name: 'admin_choice',
                    endpoint: '/recommendations/admin-choice',
                    params: { type: 'admin_choice', limit: 8 },
                    weight: 4
                },
                {
                    name: 'new_releases',
                    endpoint: '/recommendations/new-releases',
                    params: { type: 'movie', limit: 10 },
                    weight: 2
                },
                {
                    name: 'critics_choice',
                    endpoint: '/recommendations/critics-choice',
                    params: { type: 'movie', limit: 8 },
                    weight: 2
                },
                {
                    name: 'upcoming',
                    endpoint: '/upcoming-sync',
                    params: {
                        region: 'IN',
                        categories: 'movies,tv',
                        include_analytics: 'true'
                    },
                    weight: 1
                }
            ];

            const fetchPromises = sourceConfigs.map(async (config) => {
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
                    console.warn(`Failed to fetch ${config.name}:`, error);
                    return { name: config.name, data: [], weight: config.weight };
                }
            });

            const results = await Promise.allSettled(fetchPromises);

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value.data.length > 0) {
                    sources.push(result.value);
                }
            });

            return sources;

        } catch (error) {
            console.error('Error fetching content sources:', error);
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

                const headers = {
                    'Content-Type': 'application/json'
                };

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
                return this.parseBackendResponse(data);

            } catch (error) {
                if (error.name === 'AbortError') {
                    throw error;
                }

                console.warn(`Attempt ${attempt + 1} failed for ${endpoint}:`, error);

                if (attempt === retries) {
                    throw error;
                }

                await this.delay(Math.pow(2, attempt) * 1000);
            }
        }
    }

    parseBackendResponse(data) {
        if (!data) return [];

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
            return allContent;
        }

        if (data.data && data.data.categories) {
            const allContent = [];
            Object.values(data.data.categories).forEach(categoryItems => {
                if (Array.isArray(categoryItems)) {
                    allContent.push(...categoryItems);
                }
            });
            return allContent;
        }

        if (data.results && Array.isArray(data.results)) {
            return data.results;
        }

        if (Array.isArray(data)) {
            return data;
        }

        return [];
    }

    processBackendContent(sources) {
        const allContent = [];
        const seenIds = new Set();

        sources.forEach(source => {
            const { data, weight, name } = source;

            data.forEach(item => {
                if (!item || !item.id || seenIds.has(item.id)) return;

                if (!item.title || !this.hasValidImage(item)) return;

                seenIds.add(item.id);

                const processedItem = {
                    ...item,
                    source: name,
                    weight: weight,
                    processedAt: Date.now(),
                    slug: item.slug || this.generateSlug(item.title, item.release_date)
                };

                allContent.push(processedItem);
            });
        });

        return allContent;
    }

    selectDiverseContent(content, maxCount) {
        const scored = content.map(item => {
            let score = 0;

            score += (item.weight || 1) * 15;

            if (item.rating) {
                score += Math.min(25, item.rating * 2.5);
            }

            if (item.popularity) {
                score += Math.min(20, item.popularity / 20);
            }

            if (item.backdrop_path || item.poster_path) {
                score += 10;
            }

            if (item.release_date) {
                const releaseDate = new Date(item.release_date);
                const now = new Date();
                const daysDiff = (now - releaseDate) / (1000 * 60 * 60 * 24);

                if (daysDiff < 30) {
                    score += 15;
                } else if (daysDiff < 365) {
                    score += Math.max(0, 10 - (daysDiff / 365 * 10));
                }
            }

            if (item.source === 'admin_choice') score += 20;
            if (item.source === 'trending') score += 15;
            if (item.source === 'upcoming') score += 10;

            const telugu_keywords = ['telugu', 'tollywood', 'te'];
            const itemLanguages = (item.languages || []).map(l => l.toLowerCase());
            if (telugu_keywords.some(keyword =>
                itemLanguages.includes(keyword) ||
                (item.title && item.title.toLowerCase().includes(keyword))
            )) {
                score += 12;
            }

            if (item.content_type === 'anime') score += 8;
            if (item.content_type === 'tv') score += 5;

            return { ...item, calculatedScore: score };
        });

        scored.sort((a, b) => b.calculatedScore - a.calculatedScore);

        const selected = [];
        const usedSources = new Set();
        const maxPerSource = Math.ceil(maxCount / 3);

        for (const item of scored) {
            if (selected.length >= maxCount) break;

            const sourceCount = selected.filter(s => s.source === item.source).length;
            if (sourceCount < maxPerSource) {
                selected.push(item);
                usedSources.add(item.source);
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

    async displayHeroContent(index) {
        if (!this.todaysPicks[index]) return;

        const content = this.todaysPicks[index];

        try {
            await this.updateHeroElements(content);
            this.currentIndex = index;

        } catch (error) {
            console.error('Error displaying hero content:', error);
        }
    }

    async updateHeroElements(content) {
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
                    heroImage.src = imageUrl;
                    heroImage.classList.add('loaded');
                };
                img.onerror = () => {
                    heroImage.src = this.getPlaceholderImage();
                    heroImage.classList.add('loaded');
                };
                img.src = imageUrl;
            }
        }

        if (heroTitle) {
            heroTitle.textContent = content.title || content.original_title || 'Featured Content';
        }

        if (heroRating) {
            const ratingSpan = heroRating.querySelector('span');
            if (ratingSpan) {
                const rating = content.rating || content.vote_average || 0;
                ratingSpan.textContent = rating ? Number(rating).toFixed(1) : 'N/A';
            }
        }

        if (heroType) {
            let type = (content.content_type || content.media_type || 'movie').toUpperCase();
            if (content.source === 'admin_choice') {
                type = 'FEATURED';
            } else if (content.source === 'upcoming') {
                type = 'UPCOMING';
            }
            heroType.textContent = type;
        }

        if (heroYear && content.release_date) {
            try {
                const year = new Date(content.release_date).getFullYear();
                heroYear.textContent = year || '';
            } catch (e) {
                heroYear.textContent = '';
            }
        }

        if (heroGenres) {
            const genres = this.extractGenres(content);
            heroGenres.textContent = genres.slice(0, 2).join(' • ') || 'Entertainment';
        }

        if (heroDescription) {
            const description = content.overview || content.description ||
                'Discover amazing entertainment with CineBrain\'s AI-powered recommendations.';
            heroDescription.textContent = description;
        }

        this.updateHeroButtons(content);

        if (heroContent) {
            heroContent.classList.add('loaded');
        }
    }

    getOptimalImageUrl(content) {
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
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMTEzQ0NGIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMUU0RkU1Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+';
    }

    extractGenres(content) {
        if (content.genres && Array.isArray(content.genres)) {
            return content.genres;
        }

        if (content.anime_genres && Array.isArray(content.anime_genres)) {
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
        const watchBtn = document.getElementById('heroWatchBtn');
        const wishlistBtn = document.getElementById('heroWishlistBtn');
        const infoBtn = document.getElementById('heroInfoBtn');

        if (watchBtn) {
            watchBtn.onclick = () => this.handleViewDetails(content);
            this.updateButtonContent(watchBtn, {
                icon: 'play',
                text: 'View Details',
                mobileAriaLabel: 'View Details'
            });
        }

        if (wishlistBtn) {
            wishlistBtn.onclick = () => this.handleWishlistToggle(content);
            this.updateWishlistButtonState(wishlistBtn, content);
        }

        if (infoBtn) {
            infoBtn.onclick = () => this.handleMoreInfo(content);
            this.updateButtonContent(infoBtn, {
                icon: 'info',
                text: 'More Info',
                mobileAriaLabel: 'More Information'
            });
        }
    }

    updateButtonContent(button, config) {
        if (!button) return;

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
        if (!button) return;

        const isInWishlist = this.userWishlist.has(content.id) ||
            (window.contentCardManager?.userWishlist?.has(content.id));

        if (isInWishlist) {
            button.classList.add('active');
            this.updateButtonContent(button, {
                icon: 'heart',
                text: 'In List',
                mobileAriaLabel: 'Remove from Wishlist'
            });
        } else {
            button.classList.remove('active');
            this.updateButtonContent(button, {
                icon: 'heart',
                text: 'Add to List',
                mobileAriaLabel: 'Add to Wishlist'
            });
        }

        this.updateFeatherIcons();
    }

    handleViewDetails(content) {
        const slug = content.slug || this.generateSlug(content.title, content.release_date);
        if (slug) {
            window.location.href = `/content/details.html?${encodeURIComponent(slug)}`;
        } else {
            console.error('No slug available for content:', content);
            this.showNotification('Unable to view details', 'error');
        }
    }

    async handleWishlistToggle(content) {
        if (window.contentCardManager) {
            const button = document.getElementById('heroWishlistBtn');
            try {
                await window.contentCardManager.handleWishlistClick(content.id, button);

                if (window.contentCardManager.userWishlist.has(content.id)) {
                    this.userWishlist.add(content.id);
                } else {
                    this.userWishlist.delete(content.id);
                }

                this.updateWishlistButtonState(button, content);

            } catch (error) {
                console.error('Error toggling wishlist:', error);
                this.showNotification('Failed to update wishlist', 'error');
            }
        } else {
            this.showNotification('Please login to add to wishlist', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
        }
    }

    handleMoreInfo(content) {
        this.handleViewDetails(content);
    }

    handleAuthFailure() {
        localStorage.removeItem('cinebrain-token');
        localStorage.removeItem('cinebrain-user');
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

        if (slug.length > 100) {
            slug = slug.substring(0, 100).replace(/-[^-]*$/, '');
        }

        return slug;
    }

    startRealTimeUpdates() {
        this.refreshInterval = setInterval(async () => {
            const currentTime = Date.now();
            const timeSinceLastUpdate = currentTime - this.lastUpdateTime;

            if (timeSinceLastUpdate >= this.realTimeUpdateInterval) {
                console.log('Performing real-time hero content update...');
                await this.performBackgroundUpdate();
            }

            const today = this.getTodayDateString();
            if (today !== this.lastUpdateDate) {
                console.log('Date changed - performing daily refresh...');
                this.lastUpdateDate = today;
                await this.performDailyRefresh();
            }
        }, 60000);
    }

    async performBackgroundUpdate() {
        try {
            this.clearExpiredCache();

            const sources = await this.fetchMultipleContentSources();
            const processedContent = this.processBackendContent(sources);
            const newPicks = this.selectDiverseContent(processedContent, 6);

            if (newPicks.length > 0) {
                const oldPicks = [...this.todaysPicks];
                this.todaysPicks = newPicks;

                const cacheKey = `hero-content-${this.getTodayDateString()}`;
                this.setCachedContent(cacheKey, {
                    content: this.todaysPicks,
                    timestamp: Date.now()
                }, this.realTimeUpdateInterval);

                if (this.hasSignificantChanges(oldPicks, newPicks)) {
                    this.currentIndex = 0;
                    await this.displayHeroContent(0);
                    console.log('Hero content updated with fresh data');
                }

                this.lastUpdateTime = Date.now();
            }

        } catch (error) {
            console.error('Background update failed:', error);
        }
    }

    async performDailyRefresh() {
        try {
            this.contentCache.clear();

            await this.fetchRealTimeContent();

            if (this.todaysPicks.length > 0) {
                this.currentIndex = 0;
                await this.displayHeroContent(0);
                this.startAutoPlay();
                console.log('Daily refresh completed');
            }

        } catch (error) {
            console.error('Daily refresh failed:', error);
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
        if (index >= 0 && index < this.todaysPicks.length) {
            this.stopAutoPlay();
            this.displayHeroContent(index);
            this.startAutoPlay();
        }
    }

    nextSlide() {
        const nextIndex = (this.currentIndex + 1) % this.todaysPicks.length;
        this.goToSlide(nextIndex);
    }

    previousSlide() {
        const prevIndex = (this.currentIndex - 1 + this.todaysPicks.length) % this.todaysPicks.length;
        this.goToSlide(prevIndex);
    }

    startAutoPlay() {
        if (this.todaysPicks.length <= 1) return;

        this.stopAutoPlay();
        this.isPlaying = true;

        this.autoPlayTimer = setTimeout(() => {
            if (this.isPlaying) {
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

    showHeroLoading(show) {
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
        this.todaysPicks = this.getFallbackContent();
        this.displayHeroContent(0);
        this.showHeroLoading(false);
    }

    getFallbackContent() {
        return [{
            id: 'fallback-1',
            title: 'CineBrain AI Recommendations',
            overview: 'Experience the future of entertainment discovery with our advanced AI-powered recommendation system. Get personalized suggestions for movies, TV shows, and anime.',
            content_type: 'featured',
            rating: 9.2,
            backdrop_path: this.getPlaceholderImage(),
            genres: ['AI', 'Entertainment', 'Recommendations'],
            slug: 'cinebrain-ai-recommendations',
            source: 'fallback',
            weight: 5
        }];
    }

    showHeroError() {
        const heroSection = document.getElementById('heroSection');
        if (heroSection) {
            heroSection.innerHTML = `
                <div class="hero-error" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 2rem; color: white;">
                    <h2 style="margin-bottom: 1rem;">Unable to load content</h2>
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

    setupKeyboardControls() {
        const heroSection = document.getElementById('heroSection');
        if (!heroSection) return;

        document.addEventListener('keydown', (e) => {
            if (!this.keyboardControlsEnabled || !this.isHeroVisible()) return;

            const handledKeys = ['ArrowLeft', 'ArrowRight', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
            if (handledKeys.includes(e.code)) {
                e.preventDefault();
            }

            switch (e.code) {
                case 'ArrowLeft':
                    this.previousSlide();
                    this.showControlsHint('Previous');
                    break;
                case 'ArrowRight':
                    this.nextSlide();
                    this.showControlsHint('Next');
                    break;
                case 'Enter':
                    if (this.todaysPicks[this.currentIndex]) {
                        this.handleViewDetails(this.todaysPicks[this.currentIndex]);
                    }
                    break;
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Digit5':
                case 'Digit6':
                    const slideNumber = parseInt(e.code.replace('Digit', '')) - 1;
                    if (slideNumber >= 0 && slideNumber < this.todaysPicks.length) {
                        this.goToSlide(slideNumber);
                        this.showControlsHint(`Slide ${slideNumber + 1}`);
                    }
                    break;
            }
        });

        heroSection.addEventListener('focus', () => {
            this.showControlsHint();
        });
    }

    setupEnhancedTouchControls() {
        const heroSection = document.getElementById('heroSection');
        if (!heroSection) return;

        heroSection.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        heroSection.addEventListener('touchmove', (e) => {
            const deltaX = Math.abs(e.touches[0].clientX - this.touchStartX);
            const deltaY = Math.abs(e.touches[0].clientY - this.touchStartY);

            if (deltaX > deltaY && deltaX > 10) {
                e.preventDefault();
            }
        }, { passive: false });

        heroSection.addEventListener('touchend', (e) => {
            if (!this.touchStartX || !this.touchStartY) return;

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
        }, { passive: true });
    }

    showControlsHint(action = '') {
        if (this.isMobile) return;

        const hint = document.querySelector('.hero-controls-hint') || this.createControlsHint();

        let message = action || '←→ Navigate • Enter Details • 1-6 Go to slide';
        hint.textContent = message;
        hint.classList.add('show');

        if (this.controlsHintTimer) {
            clearTimeout(this.controlsHintTimer);
        }

        this.controlsHintTimer = setTimeout(() => {
            hint.classList.remove('show');
        }, action ? 1500 : 3000);
    }

    createControlsHint() {
        const heroSection = document.getElementById('heroSection');
        if (!heroSection) return null;

        const hint = document.createElement('div');
        hint.className = 'hero-controls-hint';
        heroSection.appendChild(hint);
        return hint;
    }

    isHeroVisible() {
        const heroSection = document.getElementById('heroSection');
        if (!heroSection) return false;

        const rect = heroSection.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    setupEventListeners() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const wasMobile = this.isMobile;
                this.isMobile = window.innerWidth <= 768;

                if (wasMobile !== this.isMobile) {
                    this.handleResponsiveUpdates();
                }
            }, 250);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoPlay();
            } else if (this.todaysPicks.length > 1) {
                this.startAutoPlay();
            }
        });

        window.addEventListener('userLoggedIn', () => {
            this.handleAuthStateChange();
        });

        window.addEventListener('userLoggedOut', () => {
            this.handleAuthStateChange();
        });

        window.addEventListener('beforeunload', () => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            this.loadingControllers.forEach(controller => {
                try {
                    controller.abort();
                } catch (e) { }
            });
        });
    }

    handleResponsiveUpdates() {
        if (this.todaysPicks[this.currentIndex]) {
            this.updateHeroButtons(this.todaysPicks[this.currentIndex]);
        }
        this.updateFeatherIcons();
    }

    async handleAuthStateChange() {
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;

        if (window.contentCardManager?.userWishlist) {
            this.userWishlist = window.contentCardManager.userWishlist;
        } else {
            this.userWishlist.clear();
        }

        if (this.todaysPicks[this.currentIndex]) {
            this.updateHeroButtons(this.todaysPicks[this.currentIndex]);
        }

        await this.performBackgroundUpdate();
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
        } catch (e) {
            console.warn('Failed to cache hero content:', e);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showNotification(message, type) {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    updateFeatherIcons() {
        setTimeout(() => {
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }, 0);
    }
}

if (document.getElementById('heroSection')) {
    const heroFooterManager = new HeroFooterManager();
    window.heroFooterManager = heroFooterManager;
} else {
    console.log('Hero section not found - skipping hero initialization');
}