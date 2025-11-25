class CineBrainNewReleasesManager {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.authToken = this.getAuthToken();
        this.isAuthenticated = !!this.authToken;
        this.currentUser = this.getCurrentUser();

        this.userFavorites = new Set();
        this.contentCache = new Map();
        this.loadingControllers = new Map();
        this.observers = new Set();
        this.eventListeners = new Map();

        this.isDestroyed = false;
        this.maxRetries = 3;
        this.cacheTimeout = 300000;
        this.apiTimeout = 10000;

        this.languagePriorities = {
            'telugu': 1,
            'te': 1,
            'english': 2,
            'en': 2,
            'hindi': 3,
            'hi': 3,
            'malayalam': 4,
            'ml': 4,
            'kannada': 5,
            'kn': 5,
            'tamil': 6,
            'ta': 6,
            'other': 7
        };

        this.newReleasesCategories = [
            {
                id: 'this-week',
                title: 'This Week\'s CineBrain Picks',
                description: 'Fresh content from the last 7 days',
                endpoint: '/recommendations/new-releases',
                params: { date_range: 'week', limit: 25, sort_by: 'release_date_desc' },
                priority: 1
            },
            {
                id: 'coming-month',
                title: 'Coming This Month',
                description: 'Upcoming releases in the current month',
                endpoint: '/upcoming-sync',
                params: {
                    region: 'IN',
                    categories: 'movies,tv,anime',
                    time_range: 'month',
                    use_cache: 'true',
                    include_analytics: 'false'
                },
                priority: 2,
                isUpcoming: true
            },
            {
                id: 'new-movies',
                title: 'New Movies',
                description: 'Latest theatrical and streaming movie releases',
                endpoint: '/recommendations/new-releases',
                params: { content_type: 'movie', limit: 20, sort_by: 'popularity_desc' },
                priority: 1
            },
            {
                id: 'new-tv-shows',
                title: 'New TV Shows',
                description: 'Fresh series premieres and new episodes',
                endpoint: '/recommendations/new-releases',
                params: { content_type: 'tv', limit: 20, sort_by: 'release_date_desc' },
                priority: 2
            },
            {
                id: 'new-seasons',
                title: 'New Seasons',
                description: 'Latest seasons of your favorite shows',
                endpoint: '/recommendations/trending',
                params: { category: 'tv_shows', filter: 'new_seasons', limit: 15 },
                priority: 3
            },
            {
                id: 'new-anime',
                title: 'New Anime',
                description: 'Latest anime releases and seasonal picks',
                endpoint: '/recommendations/anime',
                params: { type: 'airing', limit: 20, sort_by: 'start_date_desc' },
                priority: 2
            },
            {
                id: 'recent-releases',
                title: 'Recent Releases',
                description: 'Latest releases from the past month',
                endpoint: '/recommendations/new-releases',
                params: { limit: 20, sort_by: 'release_date_desc', date_range: 'month' },
                priority: 2
            },
            {
                id: 'international-releases',
                title: 'International Releases',
                description: 'New foreign content with subtitles',
                endpoint: '/recommendations/trending',
                params: { category: 'all', filter: 'international', language_priority: 'false', limit: 18 },
                priority: 3
            }
        ];

        this.bindMethods();
        this.init().catch(this.handleError.bind(this));
    }

    bindMethods() {
        this.onThemeChange = this.onThemeChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleStorageChange = this.handleStorageChange.bind(this);
        this.handleUserStateChange = this.handleUserStateChange.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    getAuthToken() {
        try {
            return localStorage.getItem('cinebrain-token');
        } catch (error) {
            return null;
        }
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('cinebrain-user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            return null;
        }
    }

    getCurrentMonthDateRange() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        return {
            start: startOfMonth,
            end: endOfMonth,
            startISO: startOfMonth.toISOString().split('T')[0],
            endISO: endOfMonth.toISOString().split('T')[0]
        };
    }

    isWithinCurrentMonth(dateString) {
        if (!dateString) return false;

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return false;

            const { start, end } = this.getCurrentMonthDateRange();
            return date >= start && date <= end;
        } catch {
            return false;
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
        const container = document.getElementById('newReleasesContainer');
        if (!container) {
            return;
        }

        if (window.themeManager) {
            window.themeManager.register(this.onThemeChange);
        }

        try {
            if (this.isAuthenticated) {
                await this.loadUserFavorites();
            }

            this.createCategoryRows();
            await this.loadAllContent();
            this.setupEventListeners();
            this.updateFeatherIcons();

        } catch (error) {
            this.handleError(error);
        }
    }

    async loadUserFavorites() {
        if (!this.isAuthenticated || this.isDestroyed) {
            this.userFavorites.clear();
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
                this.userFavorites.clear();

                if (Array.isArray(data?.favorites)) {
                    data.favorites.forEach(item => {
                        if (item?.id) this.userFavorites.add(item.id);
                    });
                }
            } else if (response.status === 401) {
                this.handleAuthFailure();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.handleError(error);
            }
        }
    }

    handleAuthFailure() {
        try {
            localStorage.removeItem('cinebrain-token');
            localStorage.removeItem('cinebrain-user');
        } catch (error) { }

        this.authToken = null;
        this.isAuthenticated = false;
        this.userFavorites.clear();
    }

    createCategoryRows() {
        const container = document.getElementById('newReleasesContainer');
        if (!container) return;

        container.innerHTML = '';

        const sortedCategories = [...this.newReleasesCategories].sort((a, b) => a.priority - b.priority);

        sortedCategories.forEach((category, index) => {
            if (this.isDestroyed) return;

            try {
                const row = this.createCategoryRow(category);
                row.style.animationDelay = `${index * 0.1}s`;
                container.appendChild(row);
                this.setRowLoadingState(category.id, 'loading');
            } catch (error) {
                this.handleError(error);
            }
        });
    }

    createCategoryRow(category) {
        const row = document.createElement('div');
        row.className = 'content-row loading';
        row.id = category.id;

        row.innerHTML = `
            <div class="row-header">
                <h2 class="row-title">${this.escapeHtml(category.title)}</h2>
                <a href="/explore/${category.id}.html" class="see-all">See All →</a>
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
        return Array(Math.max(0, Math.min(count, 20))).fill('').map((_, index) => `
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

    async loadAllContent() {
        if (this.isDestroyed) return;

        try {
            const highPriorityCategories = this.newReleasesCategories.filter(cat => cat.priority <= 2);
            const lowPriorityCategories = this.newReleasesCategories.filter(cat => cat.priority > 2);

            const highPriorityPromises = highPriorityCategories.map(async (category, index) => {
                if (this.isDestroyed) return;
                await this.delay(index * 100);
                return this.loadCategoryContent(category);
            });

            await Promise.allSettled(highPriorityPromises);

            if (this.isDestroyed) return;

            lowPriorityCategories.forEach((category, index) => {
                setTimeout(() => {
                    if (!this.isDestroyed) {
                        this.loadCategoryContent(category);
                    }
                }, index * 300 + 500);
            });
        } catch (error) {
            this.handleError(error);
        }
    }

    async loadCategoryContent(category) {
        if (this.isDestroyed || !category?.id) return;

        try {
            this.setRowLoadingState(category.id, 'loading');

            const cacheKey = this.getCacheKey(category);
            let content;

            const cached = this.contentCache.get(cacheKey);
            if (cached && this.isCacheValid(cached.timestamp)) {
                content = cached.content;
            } else {
                const rawData = await this.fetchCategoryContent(category);
                content = this.parseContentResponse(rawData, category);

                if (Array.isArray(content) && content.length > 0) {
                    this.contentCache.set(cacheKey, {
                        content,
                        timestamp: Date.now()
                    });
                }
            }

            if (this.isDestroyed) return;

            this.displayCategoryContent(category.id, content || [], category);
            this.setRowLoadingState(category.id, 'loaded');

        } catch (error) {
            if (!this.isDestroyed) {
                this.setRowLoadingState(category.id, 'error');
                this.showCategoryError(category.id, category.title);
                this.handleError(error);
            }
        }
    }

    async fetchCategoryContent(category) {
        if (this.isDestroyed || !category) return [];

        const controller = new AbortController();
        this.loadingControllers.set(category.id, controller);

        try {
            const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

            const queryString = new URLSearchParams(category.params).toString();
            const url = `${this.apiBase}${category.endpoint}${queryString ? '?' + queryString : ''}`;

            const headers = {};
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const response = await fetch(url, {
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } finally {
            this.loadingControllers.delete(category.id);
        }
    }

    getLanguagePriority(content) {
        if (!content || !content.languages) return 999;

        let minPriority = 999;

        if (Array.isArray(content.languages)) {
            for (const lang of content.languages) {
                const langLower = lang.toLowerCase();
                if (this.languagePriorities[langLower] !== undefined) {
                    minPriority = Math.min(minPriority, this.languagePriorities[langLower]);
                }
            }
        }

        return minPriority === 999 ? this.languagePriorities['other'] : minPriority;
    }

    sortUpcomingByDateAndLanguage(content) {
        if (!Array.isArray(content) || content.length === 0) return content;

        const currentMonthContent = content.filter(item => {
            return this.isWithinCurrentMonth(item.release_date);
        });

        if (currentMonthContent.length === 0) return currentMonthContent;

        const contentByDate = new Map();

        currentMonthContent.forEach(item => {
            const releaseDate = item.release_date;
            if (!releaseDate) return;

            let dateKey;
            try {
                const date = new Date(releaseDate);
                dateKey = date.toISOString().split('T')[0];
            } catch {
                dateKey = 'unknown';
            }

            if (!contentByDate.has(dateKey)) {
                contentByDate.set(dateKey, []);
            }
            contentByDate.get(dateKey).push(item);
        });

        const sortedDates = Array.from(contentByDate.keys()).sort();

        const finalContent = [];

        sortedDates.forEach(dateKey => {
            const dateContent = contentByDate.get(dateKey);

            const sortedByLanguage = dateContent.sort((a, b) => {
                const aPriority = this.getLanguagePriority(a);
                const bPriority = this.getLanguagePriority(b);

                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }

                const aPopularity = parseFloat(a.popularity) || 0;
                const bPopularity = parseFloat(b.popularity) || 0;
                return bPopularity - aPopularity;
            });

            finalContent.push(...sortedByLanguage);
        });

        return finalContent;
    }

    parseContentResponse(data, category) {
        if (!data || this.isDestroyed) return [];

        try {
            let content = [];

            if (category?.id === 'coming-month' && data.movies && data.tv_series && data.anime) {
                content = [
                    ...(Array.isArray(data.movies) ? data.movies : []),
                    ...(Array.isArray(data.tv_series) ? data.tv_series : []),
                    ...(Array.isArray(data.anime) ? data.anime : [])
                ];
            }
            else if (data.success && data.data) {
                if (data.data.movies && data.data.tv_series && data.data.anime) {
                    content = [
                        ...(Array.isArray(data.data.movies) ? data.data.movies : []),
                        ...(Array.isArray(data.data.tv_series) ? data.data.tv_series : []),
                        ...(Array.isArray(data.data.anime) ? data.data.anime : [])
                    ];
                } else if (Array.isArray(data.data.priority_content)) {
                    content = data.data.priority_content;
                } else if (data.data.all_content) {
                    Object.values(data.data.all_content).forEach(categoryItems => {
                        if (Array.isArray(categoryItems)) {
                            content.push(...categoryItems);
                        }
                    });
                }
            }
            else if (Array.isArray(data.recommendations)) {
                content = data.recommendations;
            } else if (data.categories) {
                Object.values(data.categories).forEach(categoryItems => {
                    if (Array.isArray(categoryItems)) {
                        content.push(...categoryItems);
                    }
                });
            } else if (Array.isArray(data.results)) {
                content = data.results;
            } else if (Array.isArray(data)) {
                content = data;
            }

            if (category?.id) {
                if (category.id === 'new-movies') {
                    content = content.filter(item => this.detectContentType(item) === 'movie');
                } else if (category.id === 'new-tv-shows') {
                    content = content.filter(item => this.detectContentType(item) === 'tv');
                } else if (category.id === 'new-anime') {
                    content = content.filter(item => this.detectContentType(item) === 'anime');
                }
            }

            if (category?.isUpcoming || category?.id === 'coming-month') {
                content = this.sortUpcomingByDateAndLanguage(content);
            }

            return content;
        } catch (error) {
            this.handleError(error);
            return [];
        }
    }

    detectContentType(item) {
        if (!item) return 'movie';

        if (item.content_type) return item.content_type;

        if (item.first_air_date || item.number_of_seasons || item.number_of_episodes ||
            item.episode_run_time || item.name || item.original_name) {
            return 'tv';
        }

        if (item.mal_id || item.studios || item.source ||
            (Array.isArray(item.genres) && item.genres.some(g =>
                typeof g === 'string' && ['anime', 'manga', 'light novel'].includes(g.toLowerCase())))) {
            return 'anime';
        }

        return 'movie';
    }

    displayCategoryContent(categoryId, content, category = null) {
        if (this.isDestroyed || !categoryId) return;

        const row = document.getElementById(categoryId);
        if (!row) return;

        const wrapper = row.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = '';

        if (!Array.isArray(content) || content.length === 0) {
            const { start, end } = this.getCurrentMonthDateRange();
            const monthName = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            wrapper.innerHTML = `
                <div class="error-message">
                    <h3>No CineBrain releases found for ${monthName}</h3>
                    <p>Check back later for fresh content in this month</p>
                </div>
            `;
            return;
        }

        content.forEach((item, index) => {
            if (this.isDestroyed) return;

            try {
                const card = this.createContentCard(item, category);
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                wrapper.appendChild(card);

                setTimeout(() => {
                    if (!this.isDestroyed && card.parentNode) {
                        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }
                }, index * 50);
            } catch (error) {
                this.handleError(error);
            }
        });

        this.setupCarouselNavigation(row);
    }

    createContentCard(content, category = null) {
        if (!content) return document.createElement('div');

        const card = document.createElement('div');
        card.className = 'content-card';
        card.dataset.contentId = content.id || '';

        if (content.slug) {
            card.dataset.contentSlug = content.slug;
        }
        if (content.title || content.name) {
            card.dataset.contentTitle = content.title || content.name;
        }
        if (content.tmdb_id) {
            card.dataset.tmdbId = content.tmdb_id;
        }

        const posterUrl = this.formatPosterUrl(content.poster_path || content.poster_url);
        const rating = this.formatRating(content.rating || content.vote_average);
        const ratingValue = parseFloat(content.rating || content.vote_average) || 0;
        const contentType = this.detectContentType(content);
        const isInFavorites = this.userFavorites.has(content.id);
        const genres = Array.isArray(content.genres) ? content.genres.slice(0, 2) : [];

        let metaContent = '';
        if (category?.isUpcoming || category?.id === 'coming-month') {
            const releaseDate = this.formatUpcomingDate(content.release_date);
            const languageInfo = this.getContentLanguageInfo(content);
            const daysFromNow = this.getDaysFromNow(content.release_date);

            metaContent = `
                ${releaseDate ? `<span class="card-release-date">${releaseDate}</span>` : ''}
                ${languageInfo ? `<span class="card-language">• ${languageInfo}</span>` : ''}
                ${daysFromNow !== null ? `<span class="card-days-remaining">• ${daysFromNow}</span>` : ''}
            `;
        } else {
            const year = this.extractYear(content.release_date);
            const runtime = this.formatRuntime(content.runtime);
            metaContent = `
                ${year ? `<span class="card-year">${year}</span>` : ''}
                ${runtime ? `<span class="card-runtime">• ${runtime}</span>` : ''}
            `;
        }

        card.innerHTML = `
            <div class="card-poster-container">
                <img 
                    class="card-poster" 
                    data-src="${posterUrl}" 
                    alt="${this.escapeHtml(content.title || content.name || 'CineBrain Content')}"
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
                <div class="card-title">${this.escapeHtml(content.title || content.name || 'Unknown')}</div>
                <div class="card-meta">
                    ${metaContent}
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

    extractContentInfo(card, contentId) {
        try {
            const title = card.querySelector('.card-title')?.textContent?.trim() || 'Unknown';
            const poster = card.querySelector('.card-poster')?.getAttribute('data-src') || card.querySelector('.card-poster')?.src;
            const ratingBadge = card.querySelector('.rating-badge span')?.textContent;
            const year = card.querySelector('.card-year')?.textContent;
            const releaseDate = card.querySelector('.card-release-date')?.textContent;

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
                poster_path: poster ? poster.replace('https://image.tmdb.org/t/p/w500', '') : null,
                rating: ratingBadge && ratingBadge !== 'N/A' ? parseFloat(ratingBadge) : null,
                release_date: releaseDate || (year ? `${year}-01-01` : null),
                content_type: contentType,
                tmdb_id: tmdbId,
                overview: '',
                slug: card.dataset.contentSlug || null
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

    getDaysFromNow(dateString) {
        if (!dateString) return null;

        try {
            const releaseDate = new Date(dateString);
            const now = new Date();
            const diffTime = releaseDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays > 1) return `${diffDays} days`;
            if (diffDays === -1) return 'Yesterday';
            if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;

            return null;
        } catch {
            return null;
        }
    }

    getContentLanguageInfo(content) {
        if (!content || !content.languages || !Array.isArray(content.languages)) {
            return '';
        }

        const languageNames = {
            'telugu': 'Te',
            'te': 'Te',
            'english': 'En',
            'en': 'En',
            'hindi': 'Hi',
            'hi': 'Hi',
            'malayalam': 'Ml',
            'ml': 'Ml',
            'kannada': 'Kn',
            'kn': 'Kn',
            'tamil': 'Ta',
            'ta': 'Ta'
        };

        const priority = this.getLanguagePriority(content);
        const primaryLang = content.languages.find(lang => {
            const langLower = lang.toLowerCase();
            return this.languagePriorities[langLower] === priority;
        });

        if (primaryLang) {
            const langLower = primaryLang.toLowerCase();
            return languageNames[langLower] || primaryLang.substring(0, 2).toUpperCase();
        }

        return content.languages[0] ? content.languages[0].substring(0, 2).toUpperCase() : '';
    }

    formatUpcomingDate(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';

            const options = {
                month: 'short',
                day: 'numeric'
            };

            const now = new Date();
            if (date.getFullYear() !== now.getFullYear()) {
                options.year = 'numeric';
            }

            return date.toLocaleDateString('en-US', options);
        } catch {
            return '';
        }
    }

    setupCardHandlers(card, content) {
        if (!card || !content) return;

        const clickHandler = (e) => {
            if (e.target.closest('.wishlist-btn')) return;

            let slug = content.slug;
            if (!slug && content.title) {
                slug = this.generateSlug(content.title, content.release_date);
            }

            if (slug) {
                window.location.href = `/explore/details.html?${encodeURIComponent(slug)}`;
            } else {
                this.showNotification('Unable to view CineBrain details', 'error');
            }
        };

        card.addEventListener('click', clickHandler);
        this.addEventListenerTracking(card, 'click', clickHandler);

        const wishlistBtn = card.querySelector('.wishlist-btn');
        if (wishlistBtn) {
            const wishlistHandler = async (e) => {
                e.stopPropagation();
                await this.handleWishlistClick(content.id, wishlistBtn);
            };

            wishlistBtn.addEventListener('click', wishlistHandler);
            this.addEventListenerTracking(wishlistBtn, 'click', wishlistHandler);
        }
    }

    async handleWishlistClick(contentId, button) {
        if (!button || button.disabled) return;

        if (!this.isAuthenticated) {
            this.showNotification('Please login to add to CineBrain favorites', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
        }

        try {
            button.disabled = true;

            let numericContentId;
            try {
                if (typeof contentId === 'string') {
                    if (contentId.includes('tmdb_') || contentId.includes('mal_') || contentId.includes('imdb_')) {
                        console.warn('CineBrain: External ID format detected, cannot process:', contentId);
                        this.showNotification('Unable to process this content format', 'warning');
                        return;
                    }
                    numericContentId = parseInt(contentId, 10);
                } else {
                    numericContentId = parseInt(contentId, 10);
                }

                if (isNaN(numericContentId) || numericContentId <= 0) {
                    throw new Error('Invalid content ID');
                }
            } catch (error) {
                console.error('CineBrain: Invalid content ID format:', contentId, error);
                this.showNotification('Invalid content ID format', 'error');
                return;
            }

            const isCurrentlyInFavorites = button.classList.contains('active');
            const card = button.closest('.content-card');
            const contentInfo = this.extractContentInfo(card, numericContentId);

            const actualContentId = card.dataset.actualContentId ? parseInt(card.dataset.actualContentId) : numericContentId;

            const originalState = {
                isActive: isCurrentlyInFavorites,
                inFavorites: this.userFavorites.has(numericContentId)
            };

            if (isCurrentlyInFavorites) {
                button.classList.remove('active');
                this.userFavorites.delete(numericContentId);
                button.setAttribute('title', 'Add to CineBrain Favorites');
                button.setAttribute('aria-label', 'Add to CineBrain Favorites');
            } else {
                button.classList.add('active');
                this.userFavorites.add(numericContentId);
                button.setAttribute('title', 'Remove from CineBrain Favorites');
                button.setAttribute('aria-label', 'Remove from CineBrain Favorites');
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            let response;

            try {
                if (isCurrentlyInFavorites) {
                    console.log(`CineBrain: Attempting to remove favorite with ID ${actualContentId} (original: ${numericContentId})`);

                    response = await fetch(`${this.apiBase}/user/favorites/${actualContentId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        },
                        signal: controller.signal
                    });
                } else {
                    response = await fetch(`${this.apiBase}/user/favorites`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.authToken}`
                        },
                        body: JSON.stringify({
                            content_id: numericContentId,
                            rating: null,
                            metadata: {
                                content_info: contentInfo,
                                source: 'new_releases_page',
                                timestamp: new Date().toISOString()
                            }
                        }),
                        signal: controller.signal
                    });
                }

                clearTimeout(timeoutId);

                if (response.ok) {
                    const result = await response.json();

                    if (!isCurrentlyInFavorites && result.actual_content_id && result.actual_content_id !== numericContentId) {
                        card.dataset.actualContentId = result.actual_content_id;
                        console.log(`CineBrain: Mapped content ID ${numericContentId} to ${result.actual_content_id}`);

                        this.userFavorites.delete(numericContentId);
                        this.userFavorites.add(result.actual_content_id);

                        button.dataset.contentId = result.actual_content_id;
                    }

                    if (isCurrentlyInFavorites && result.actual_content_id && result.actual_content_id !== numericContentId) {
                        this.userFavorites.delete(numericContentId);
                        this.userFavorites.delete(result.actual_content_id);
                    }

                    this.showNotification(
                        isCurrentlyInFavorites ? 'Removed from CineBrain favorites' : 'Added to CineBrain favorites',
                        'success'
                    );

                    try {
                        const interactionController = new AbortController();
                        const interactionTimeoutId = setTimeout(() => interactionController.abort(), 10000);

                        const interactionContentId = result.actual_content_id || numericContentId;

                        await fetch(`${this.apiBase}/interactions`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.authToken}`
                            },
                            body: JSON.stringify({
                                content_id: interactionContentId,
                                interaction_type: isCurrentlyInFavorites ? 'remove_favorite' : 'favorite',
                                metadata: {
                                    content_info: {
                                        ...contentInfo,
                                        id: interactionContentId,
                                        original_id: numericContentId !== interactionContentId ? numericContentId : undefined
                                    },
                                    source: 'new_releases_interaction',
                                    timestamp: new Date().toISOString(),
                                    id_mapping: numericContentId !== interactionContentId ? {
                                        frontend_id: numericContentId,
                                        backend_id: interactionContentId
                                    } : undefined
                                }
                            }),
                            signal: interactionController.signal
                        });

                        clearTimeout(interactionTimeoutId);
                        console.log('CineBrain interaction tracking updated successfully');
                        // In the catch block for interaction tracking
                    } catch (interactionError) {
                        // Don't show error to user if it's just a 404 on removal
                        if (isCurrentlyInFavorites && interactionError.message && interactionError.message.includes('404')) {
                            console.log('CineBrain: Interaction record already removed, continuing');
                        } else {
                            console.warn('CineBrain: Failed to update interaction tracking:', interactionError);
                        }
                        // Don't fail the main operation if interaction tracking fails
                    }

                    if (!isCurrentlyInFavorites && result.actual_content_id && result.actual_content_id !== numericContentId) {
                        try {
                            const allCards = document.querySelectorAll(`[data-content-id="${numericContentId}"]`);
                            allCards.forEach(otherCard => {
                                if (otherCard !== card) {
                                    otherCard.dataset.actualContentId = result.actual_content_id;
                                    const otherButton = otherCard.querySelector('.wishlist-btn');
                                    if (otherButton) {
                                        otherButton.dataset.contentId = result.actual_content_id;
                                        otherButton.classList.add('active');
                                        otherButton.setAttribute('title', 'Remove from CineBrain Favorites');
                                        otherButton.setAttribute('aria-label', 'Remove from CineBrain Favorites');
                                    }
                                }
                            });
                            console.log(`CineBrain: Updated ${allCards.length} cards with mapped ID`);
                        } catch (updateError) {
                            console.warn('CineBrain: Failed to update other cards:', updateError);
                        }
                    }

                    if (isCurrentlyInFavorites) {
                        try {
                            const searchIds = [numericContentId];
                            if (result.actual_content_id && result.actual_content_id !== numericContentId) {
                                searchIds.push(result.actual_content_id);
                            }

                            searchIds.forEach(searchId => {
                                const allCards = document.querySelectorAll(`[data-content-id="${searchId}"], [data-actual-content-id="${searchId}"]`);
                                allCards.forEach(otherCard => {
                                    const otherButton = otherCard.querySelector('.wishlist-btn');
                                    if (otherButton) {
                                        otherButton.classList.remove('active');
                                        otherButton.setAttribute('title', 'Add to CineBrain Favorites');
                                        otherButton.setAttribute('aria-label', 'Add to CineBrain Favorites');
                                    }
                                });
                            });
                        } catch (updateError) {
                            console.warn('CineBrain: Failed to update other cards for removal:', updateError);
                        }
                    }

                    console.log('CineBrain favorites operation completed:', {
                        operation: isCurrentlyInFavorites ? 'remove' : 'add',
                        frontend_id: numericContentId,
                        backend_id: result.actual_content_id,
                        mapped: numericContentId !== result.actual_content_id,
                        content_title: contentInfo.title,
                        page: 'new_releases'
                    });
                } else {
                    if (originalState.isActive) {
                        button.classList.add('active');
                        this.userFavorites.add(numericContentId);
                        button.setAttribute('title', 'Remove from CineBrain Favorites');
                        button.setAttribute('aria-label', 'Remove from CineBrain Favorites');
                    } else {
                        button.classList.remove('active');
                        this.userFavorites.delete(numericContentId);
                        button.setAttribute('title', 'Add to CineBrain Favorites');
                        button.setAttribute('aria-label', 'Add to CineBrain Favorites');
                    }

                    const errorData = await response.json().catch(() => ({}));
                    console.error('CineBrain favorites update failed:', response.status, errorData);

                    if (response.status === 401) {
                        this.handleAuthFailure();
                        this.showNotification('Please login again', 'warning');
                    } else if (response.status === 400) {
                        this.showNotification(errorData.message || 'Content not available', 'warning');
                    } else if (response.status === 404) {
                        this.showNotification('Content not found in favorites', 'warning');
                    } else {
                        this.showNotification(errorData.error || 'Failed to update CineBrain favorites', 'error');
                    }
                }

            } catch (fetchError) {
                clearTimeout(timeoutId);

                if (originalState.isActive) {
                    button.classList.add('active');
                    this.userFavorites.add(numericContentId);
                    button.setAttribute('title', 'Remove from CineBrain Favorites');
                    button.setAttribute('aria-label', 'Remove from CineBrain Favorites');
                } else {
                    button.classList.remove('active');
                    this.userFavorites.delete(numericContentId);
                    button.setAttribute('title', 'Add to CineBrain Favorites');
                    button.setAttribute('aria-label', 'Add to CineBrain Favorites');
                }

                if (fetchError.name === 'AbortError') {
                    this.showNotification('Request timeout - please try again', 'warning');
                } else {
                    console.error('CineBrain network error:', fetchError);
                    this.showNotification('Network error - please check your connection', 'error');
                }
            }

        } catch (error) {
            console.error('CineBrain error updating favorites:', error);
            this.showNotification('Failed to update CineBrain favorites', 'error');
            this.handleError(error);
        } finally {
            setTimeout(() => {
                if (button) button.disabled = false;
            }, 300);
        }
    }

    setupLazyLoading(card) {
        if (!card) return;

        const img = card.querySelector('.card-poster');
        if (!img) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isDestroyed) {
                    const imgSrc = img.dataset.src;
                    if (imgSrc) {
                        const tempImg = new Image();
                        const container = img.parentElement;

                        if (container) container.classList.add('loading-image');

                        tempImg.onload = () => {
                            if (!this.isDestroyed && img.parentNode) {
                                img.src = imgSrc;
                                img.classList.add('loaded');
                                if (container) container.classList.remove('loading-image');
                            }
                        };

                        tempImg.onerror = () => {
                            if (!this.isDestroyed && img.parentNode) {
                                img.src = this.getPlaceholderImage();
                                img.classList.add('loaded');
                                if (container) container.classList.remove('loading-image');
                            }
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
        this.observers.add(observer);
    }

    setupCarouselNavigation(carouselRow) {
        if (!carouselRow) return;

        const wrapper = carouselRow.querySelector('.carousel-wrapper');
        const prevBtn = carouselRow.querySelector('.carousel-nav.prev');
        const nextBtn = carouselRow.querySelector('.carousel-nav.next');

        if (!wrapper || !prevBtn || !nextBtn) return;

        const getScrollAmount = () => {
            const containerWidth = wrapper.clientWidth;
            const cardWidth = wrapper.querySelector('.content-card')?.offsetWidth || 180;
            const gap = parseInt(getComputedStyle(wrapper).gap) || 12;
            const visibleCards = Math.floor(containerWidth / (cardWidth + gap));
            return (cardWidth + gap) * Math.max(1, visibleCards - 1);
        };

        let ticking = false;
        const updateNavButtons = () => {
            if (!ticking && !this.isDestroyed) {
                requestAnimationFrame(() => {
                    if (this.isDestroyed || !wrapper) return;

                    const scrollLeft = wrapper.scrollLeft;
                    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;

                    const shouldShowPrev = scrollLeft > 0;
                    const shouldShowNext = scrollLeft < maxScroll - 1;

                    if (prevBtn) {
                        prevBtn.style.opacity = shouldShowPrev ? '1' : '0';
                        prevBtn.classList.toggle('disabled', !shouldShowPrev);
                    }

                    if (nextBtn) {
                        nextBtn.style.opacity = shouldShowNext ? '1' : '0';
                        nextBtn.classList.toggle('disabled', !shouldShowNext);
                    }

                    ticking = false;
                });
                ticking = true;
            }
        };

        if (window.innerWidth > 768) {
            const prevHandler = () => {
                if (!this.isDestroyed && wrapper) {
                    wrapper.scrollBy({
                        left: -getScrollAmount(),
                        behavior: 'smooth'
                    });
                }
            };

            const nextHandler = () => {
                if (!this.isDestroyed && wrapper) {
                    wrapper.scrollBy({
                        left: getScrollAmount(),
                        behavior: 'smooth'
                    });
                }
            };

            const scrollHandler = () => {
                if (!this.isDestroyed) updateNavButtons();
            };

            prevBtn.addEventListener('click', prevHandler);
            nextBtn.addEventListener('click', nextHandler);
            wrapper.addEventListener('scroll', scrollHandler, { passive: true });

            this.addEventListenerTracking(prevBtn, 'click', prevHandler);
            this.addEventListenerTracking(nextBtn, 'click', nextHandler);
            this.addEventListenerTracking(wrapper, 'scroll', scrollHandler);

            updateNavButtons();
        }
    }

    showCategoryError(categoryId, categoryTitle) {
        if (this.isDestroyed || !categoryId) return;

        const row = document.getElementById(categoryId);
        if (!row) return;

        const wrapper = row.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = `
            <div class="error-message">
                <h3>Unable to load ${this.escapeHtml(categoryTitle)}</h3>
                <p>Please check your connection and try again</p>
                <button class="retry-btn" data-category-id="${categoryId}">Retry CineBrain</button>
            </div>
        `;

        const retryBtn = wrapper.querySelector('.retry-btn');
        if (retryBtn) {
            const retryHandler = () => {
                if (this.isDestroyed) return;

                wrapper.innerHTML = this.createEnhancedSkeletons(8);
                const category = this.newReleasesCategories.find(cat => cat.id === categoryId);
                if (category) {
                    this.loadCategoryContent(category);
                }
            };

            retryBtn.addEventListener('click', retryHandler);
            this.addEventListenerTracking(retryBtn, 'click', retryHandler);
        }
    }

    setupEventListeners() {
        if (this.isDestroyed) return;

        window.addEventListener('resize', this.handleResize);
        window.addEventListener('storage', this.handleStorageChange);
        window.addEventListener('userLoggedIn', this.handleUserStateChange);
        window.addEventListener('userLoggedOut', this.handleUserStateChange);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        this.addEventListenerTracking(window, 'resize', this.handleResize);
        this.addEventListenerTracking(window, 'storage', this.handleStorageChange);
        this.addEventListenerTracking(window, 'userLoggedIn', this.handleUserStateChange);
        this.addEventListenerTracking(window, 'userLoggedOut', this.handleUserStateChange);
        this.addEventListenerTracking(document, 'visibilitychange', this.handleVisibilityChange);
    }

    handleResize() {
        if (this.isDestroyed) return;

        this.debounce(() => {
            document.querySelectorAll('.content-row').forEach(row => {
                this.setupCarouselNavigation(row);
            });
        }, 250)();
    }

    handleStorageChange(e) {
        if (this.isDestroyed) return;

        if (e.key === 'cinebrain-token') {
            const oldAuth = this.isAuthenticated;
            this.authToken = e.newValue;
            this.isAuthenticated = !!this.authToken;

            if (oldAuth !== this.isAuthenticated) {
                this.handleAuthStateChange();
            }
        }
    }

    handleUserStateChange() {
        if (this.isDestroyed) return;

        this.handleAuthStateChange();
    }

    handleVisibilityChange() {
        if (this.isDestroyed) return;

        if (document.hidden) {
            this.loadingControllers.forEach(controller => {
                try {
                    controller.abort();
                } catch (error) { }
            });
        }
    }

    async handleAuthStateChange() {
        if (this.isDestroyed) return;

        if (this.isAuthenticated) {
            await this.loadUserFavorites();
        } else {
            this.userFavorites.clear();
        }

        this.updateWishlistButtons();
    }

    updateWishlistButtons() {
        if (this.isDestroyed) return;

        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            try {
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
            } catch (error) {
                this.handleError(error);
            }
        });
    }

    setRowLoadingState(rowId, state) {
        if (this.isDestroyed || !rowId) return;

        const row = document.getElementById(rowId);
        if (row) {
            row.classList.remove('loading', 'loaded', 'error');
            row.classList.add(state);
        }
    }

    getCacheKey(category) {
        if (!category) return '';
        const { startISO, endISO } = this.getCurrentMonthDateRange();
        return `cinebrain-new-releases-${category.id}-${startISO}-${endISO}-${JSON.stringify(category.params)}-${this.isAuthenticated ? 'auth' : 'anon'}`;
    }

    isCacheValid(timestamp) {
        return timestamp && (Date.now() - timestamp < this.cacheTimeout);
    }

    formatPosterUrl(posterPath) {
        if (!posterPath) return this.getPlaceholderImage();
        if (posterPath.startsWith('http')) return posterPath;
        return `https://image.tmdb.org/t/p/w500${posterPath}`;
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2luZUJyYWluPC90ZXh0Pjwvc3ZnPg==';
    }

    formatRating(rating) {
        if (!rating || isNaN(rating)) return 'N/A';
        return Number(rating).toFixed(1);
    }

    extractYear(dateString) {
        if (!dateString) return '';
        try {
            const year = new Date(dateString).getFullYear();
            return isNaN(year) ? '' : year;
        } catch {
            return '';
        }
    }

    formatRuntime(minutes) {
        if (!minutes || isNaN(minutes)) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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

    showNotification(message, type = 'info') {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        }
    }

    onThemeChange() {
        this.updateFeatherIcons();
    }

    updateFeatherIcons() {
        if (typeof feather !== 'undefined') {
            try {
                feather.replace();
            } catch (error) {
                this.handleError(error);
            }
        }
    }

    addEventListenerTracking(element, event, handler) {
        if (!element || !event || !handler) return;

        const key = `${element.constructor.name}_${event}_${Date.now()}`;
        this.eventListeners.set(key, { element, event, handler });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
    }

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
    }

    handleError(error) {
        if (error?.name === 'AbortError') return;
    }

    destroy() {
        this.isDestroyed = true;

        this.loadingControllers.forEach(controller => {
            try {
                controller.abort();
            } catch (error) { }
        });
        this.loadingControllers.clear();

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
        this.userFavorites.clear();

        if (window.themeManager) {
            try {
                window.themeManager.unregister(this.onThemeChange);
            } catch (error) { }
        }
    }
}

if (document.getElementById('newReleasesContainer')) {
    const cineBrainNewReleasesManager = new CineBrainNewReleasesManager();
    window.cineBrainNewReleasesManager = cineBrainNewReleasesManager;

    window.addEventListener('beforeunload', () => {
        if (window.cineBrainNewReleasesManager) {
            window.cineBrainNewReleasesManager.destroy();
        }
    });
}