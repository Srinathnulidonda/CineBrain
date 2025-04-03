// topbar.js - Updated with Improved Search

// Initialize Feather Icons first
if (typeof feather !== 'undefined') {
    feather.replace();
}

// Advanced Search Engine with Enhanced Backend Integration
class SearchEngine {
    constructor(apiBase) {
        this.apiBase = apiBase;
        this.cache = new Map();
        this.activeRequest = null;
        this.maxCacheSize = 100;
        this.cacheTimeout = 30000; // 30 seconds
        this.recentSearches = this.loadRecentSearches();
        this.maxRecentSearches = 10;
        this.instantSearchController = null;
        this.autocompleteController = null;
        this.lastInstantQuery = '';
        this.instantCache = new Map();
        this.searchMetrics = {
            totalSearches: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };
    }

    loadRecentSearches() {
        try {
            const stored = localStorage.getItem('cinebrain-recent-searches');
            if (!stored) return [];

            const searches = JSON.parse(stored);
            return searches.filter(item =>
                item &&
                typeof item === 'object' &&
                item.query &&
                typeof item.query === 'string'
            ).slice(0, this.maxRecentSearches);
        } catch (e) {
            console.error('Error loading recent searches:', e);
            localStorage.removeItem('cinebrain-recent-searches');
            return [];
        }
    }

    saveRecentSearches() {
        try {
            localStorage.setItem('cinebrain-recent-searches', JSON.stringify(this.recentSearches));
        } catch (e) {
            console.error('Failed to save recent searches:', e);
        }
    }

    addRecentSearch(query, result = null) {
        if (!query || typeof query !== 'string' || query.length < 2) return;

        // Remove existing entry for this query
        this.recentSearches = this.recentSearches.filter(item => {
            return item && item.query && item.query.toLowerCase() !== query.toLowerCase();
        });

        const recentItem = {
            query: query,
            timestamp: Date.now(),
            resultCount: result ? result.length : 0,
            firstResult: result && result[0] ? {
                title: result[0].title || 'Unknown',
                type: result[0].content_type || result[0].type || 'unknown',
                id: result[0].id
            } : null
        };

        this.recentSearches.unshift(recentItem);
        this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches);
        this.saveRecentSearches();
    }

    getRecentSearches() {
        return this.recentSearches.filter(item =>
            item && item.query && typeof item.query === 'string'
        );
    }

    clearRecentSearches() {
        this.recentSearches = [];
        this.saveRecentSearches();
    }

    removeRecentSearch(query) {
        if (!query || typeof query !== 'string') return;

        this.recentSearches = this.recentSearches.filter(item =>
            item && item.query && item.query.toLowerCase() !== query.toLowerCase()
        );
        this.saveRecentSearches();
    }

    // Enhanced autocomplete with better backend integration
    async autocomplete(prefix, signal) {
        const cacheKey = `autocomplete:${prefix.toLowerCase()}`;

        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
                this.searchMetrics.cacheHits++;
                return cached.suggestions;
            }
        }

        // Cancel previous autocomplete
        if (this.autocompleteController) {
            this.autocompleteController.abort();
        }

        this.autocompleteController = new AbortController();
        const combinedSignal = signal || this.autocompleteController.signal;

        try {
            const startTime = performance.now();
            const response = await fetch(
                `${this.apiBase}/search/autocomplete?q=${encodeURIComponent(prefix)}&limit=10`,
                {
                    signal: combinedSignal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            const responseTime = performance.now() - startTime;
            this.updateMetrics(responseTime);

            if (!response.ok) {
                console.warn(`Autocomplete returned ${response.status}`);
                return [];
            }

            const data = await response.json();
            const suggestions = data.suggestions || [];

            // Cache autocomplete results
            this.cache.set(cacheKey, {
                suggestions,
                timestamp: Date.now()
            });

            return suggestions;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Autocomplete error:', error);
            }
            return [];
        } finally {
            this.autocompleteController = null;
        }
    }

    // Enhanced main search with better error handling and response processing
    async search(query, signal, options = {}) {
        const cacheKey = this.generateCacheKey(query, options);

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                this.searchMetrics.cacheHits++;
                return {
                    ...cached,
                    fromCache: true
                };
            }
            this.cache.delete(cacheKey);
        }

        // Cancel previous request if exists
        if (this.activeRequest) {
            this.activeRequest.abort();
        }

        const controller = new AbortController();
        this.activeRequest = controller;

        try {
            this.searchMetrics.totalSearches++;
            const startTime = performance.now();

            // Build query parameters
            const params = new URLSearchParams({
                query: query,
                type: options.type || 'multi',
                page: options.page || 1
            });

            // Add filters if provided
            if (options.filters) {
                Object.entries(options.filters).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                        params.append(key, value);
                    }
                });
            }

            const response = await fetch(
                `${this.apiBase}/search?${params.toString()}`,
                {
                    signal: signal || controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            const responseTime = performance.now() - startTime;
            this.updateMetrics(responseTime);

            if (!response.ok) {
                // Handle specific error codes
                if (response.status === 400) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Invalid search request');
                }
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();

            // Process the response
            const processedData = {
                results: this.processSearchResults(data.results || []),
                total_results: data.total_results || 0,
                page: data.page || 1,
                query: data.query || query,
                search_time: data.search_time || responseTime,
                suggestions: data.suggestions || [],
                instant: data.instant || false,
                cached: data.cached || false,
                filters_applied: data.filters_applied || {},
                timestamp: Date.now()
            };

            // Add to recent searches if we got results
            if (processedData.results.length > 0) {
                this.addRecentSearch(query, processedData.results);
            }

            // Cache the results
            this.cache.set(cacheKey, processedData);

            // Manage cache size
            if (this.cache.size > this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            return { ...processedData, fromCache: false };

        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            console.error('Search error:', error);

            // Return empty results with error information
            return {
                results: [],
                total_results: 0,
                error: error.message,
                query: query,
                fromCache: false
            };
        } finally {
            if (this.activeRequest === controller) {
                this.activeRequest = null;
            }
        }
    }

    // Process search results to ensure consistent format
    processSearchResults(results) {
        if (!Array.isArray(results)) return [];

        return results.map(item => {
            // Ensure all required fields are present
            return {
                id: item.id,
                title: item.title || 'Unknown Title',
                original_title: item.original_title,
                content_type: item.content_type || item.type || 'unknown',
                genres: item.genres || [],
                languages: item.languages || [],
                rating: parseFloat(item.rating) || 0,
                vote_count: item.vote_count || 0,
                popularity: item.popularity || 0,
                release_date: item.release_date,
                year: item.year || (item.release_date ? new Date(item.release_date).getFullYear() : null),
                poster_path: item.poster_path,
                overview: item.overview,
                youtube_trailer: item.youtube_trailer,
                is_trending: item.is_trending || false,
                is_new_release: item.is_new_release || false,
                match_info: item.match_info || {
                    exact_match: false,
                    source: 'backend',
                    score: 0
                }
            };
        });
    }

    // Generate cache key with filters
    generateCacheKey(query, options = {}) {
        const parts = [
            query.toLowerCase().trim(),
            options.type || 'multi',
            options.page || 1
        ];

        if (options.filters) {
            const filterStr = Object.entries(options.filters)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `${k}:${v}`)
                .join('|');
            parts.push(filterStr);
        }

        return parts.join('::');
    }

    // Update search metrics
    updateMetrics(responseTime) {
        const currentAvg = this.searchMetrics.averageResponseTime;
        const totalSearches = this.searchMetrics.totalSearches;

        this.searchMetrics.averageResponseTime =
            (currentAvg * (totalSearches - 1) + responseTime) / totalSearches;
    }

    // Get trending searches from backend
    async getTrendingSearches() {
        try {
            const response = await fetch(`${this.apiBase}/search/suggestions?limit=10`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) return [];

            const data = await response.json();
            return data.trending || [];
        } catch (error) {
            console.error('Failed to get trending searches:', error);
            return this.getDefaultTrending();
        }
    }

    // Default trending searches
    getDefaultTrending() {
        return [
            "Telugu movies 2024",
            "Latest Telugu releases",
            "New releases",
            "Action movies",
            "Romantic series",
            "Best anime",
            "Thriller movies",
            "Comedy shows",
            "Marvel",
            "Netflix originals"
        ];
    }

    // Clear all caches
    clearCache() {
        this.cache.clear();
        this.instantCache.clear();
    }

    // Get search metrics
    getMetrics() {
        return {
            ...this.searchMetrics,
            cacheHitRate: this.searchMetrics.totalSearches > 0
                ? (this.searchMetrics.cacheHits / this.searchMetrics.totalSearches * 100).toFixed(2) + '%'
                : '0%',
            cacheSize: this.cache.size
        };
    }
}

// Notification System (unchanged - keeping as is)
class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';

            // Responsive positioning based on screen size
            const isMobile = window.innerWidth <= 768;

            this.container.style.cssText = `
                position: fixed;
                ${isMobile ? 'top: 10px; left: 10px; right: 10px;' : 'top: 70px; right: 20px;'}
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
                max-width: ${isMobile ? '100%' : '400px'};
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        const isMobile = window.innerWidth <= 768;

        // Define colors based on type
        const colors = {
            success: 'linear-gradient(135deg, #10b981, #059669)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)',
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
            info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
        };

        // Define icons based on type
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        // Responsive notification styling
        notification.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: ${isMobile ? 'clamp(12px, 3vw, 16px) clamp(14px, 3.5vw, 18px)' : '16px 20px'};
            border-radius: ${isMobile ? 'clamp(8px, 2vw, 12px)' : '12px'};
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: ${isMobile ? 'clamp(8px, 2vw, 12px)' : '12px'};
            min-width: ${isMobile ? 'auto' : '300px'};
            max-width: 100%;
            pointer-events: auto;
            cursor: pointer;
            animation: ${isMobile ? 'slideDown' : 'slideInRight'} 0.3s ease;
            font-size: ${isMobile ? 'clamp(12px, 3.5vw, 14px)' : '14px'};
            font-weight: 500;
            position: relative;
            overflow: hidden;
            width: ${isMobile ? '100%' : 'auto'};
        `;

        // Add icon with responsive sizing
        const iconElement = document.createElement('i');
        iconElement.setAttribute('data-feather', icons[type] || icons.info);
        iconElement.style.cssText = `
            width: ${isMobile ? 'clamp(18px, 5vw, 20px)' : '20px'};
            height: ${isMobile ? 'clamp(18px, 5vw, 20px)' : '20px'};
            flex-shrink: 0;
        `;

        // Add message
        const messageElement = document.createElement('span');
        messageElement.textContent = message;
        messageElement.style.cssText = 'flex: 1; line-height: 1.4;';

        // Add close button with responsive sizing
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: ${isMobile ? 'clamp(20px, 6vw, 24px)' : '24px'};
            line-height: 1;
            cursor: pointer;
            padding: 0;
            margin-left: ${isMobile ? 'clamp(8px, 2vw, 12px)' : '12px'};
            opacity: 0.8;
            transition: opacity 0.2s;
            min-width: ${isMobile ? '24px' : 'auto'};
        `;
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';

        // Add progress bar
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: rgba(255, 255, 255, 0.5);
            animation: progress ${duration}ms linear;
            width: 100%;
            transform-origin: left;
        `;

        notification.appendChild(iconElement);
        notification.appendChild(messageElement);
        notification.appendChild(closeBtn);
        notification.appendChild(progressBar);

        this.container.appendChild(notification);

        // Initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Auto remove after duration
        const removeNotification = () => {
            notification.style.animation = `${isMobile ? 'slideDown' : 'slideOutRight'} 0.3s ease reverse`;
            setTimeout(() => {
                notification.remove();
            }, 300);
        };

        const timeoutId = setTimeout(removeNotification, duration);

        // Click to dismiss
        notification.addEventListener('click', () => {
            clearTimeout(timeoutId);
            removeNotification();
        });

        // Add animations to style if not exists
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                @keyframes slideDown {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes progress {
                    from {
                        transform: scaleX(1);
                    }
                    to {
                        transform: scaleX(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Enhanced TopBar Component with Improved Search
class TopbarComponent {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.searchEngine = new SearchEngine(this.apiBase);
        this.notificationSystem = new NotificationSystem();
        this.searchDebounceTimer = null;
        this.currentUser = this.getCurrentUser();
        this.currentSearchQuery = '';
        this.searchController = null;
        this.lastSearchResults = [];
        this.searchInProgress = false;
        this.showingRecentSearches = false;
        this.currentFilters = {};

        // Optimized debounce timings
        this.SEARCH_DEBOUNCE_MS = 300; // Slightly longer for better backend performance
        this.MIN_SEARCH_LENGTH = 2; // Minimum 2 characters for search

        // Register with theme manager if available
        if (window.themeManager) {
            window.themeManager.register((theme) => this.onThemeChange(theme));
        }

        this.init();
    }

    init() {
        this.initTheme();
        this.initOptimizedSearch();
        this.initUserMenu();
        this.initMobileSearch();
        this.setupEventListeners();
        this.handleResponsive();
        this.initKeyboardShortcuts();
        this.loadTrendingSearches();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async loadTrendingSearches() {
        // Load trending searches in background
        this.trendingSearches = await this.searchEngine.getTrendingSearches();
    }

    onThemeChange(theme) {
        this.updateThemeUI(theme);
    }

    updateThemeUI(theme) {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        this.updateIconColors();
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();

                if (window.innerWidth > 767) {
                    const desktopInput = document.getElementById('desktopSearchInput');
                    desktopInput?.focus();
                } else {
                    document.getElementById('mobileSearchTrigger')?.click();
                }
            }

            // Escape to clear search
            if (e.key === 'Escape') {
                const desktopInput = document.getElementById('desktopSearchInput');
                const clearBtn = document.getElementById('searchClear');
                if (desktopInput && desktopInput.value) {
                    desktopInput.value = '';
                    this.currentSearchQuery = '';
                    if (clearBtn) clearBtn.style.display = 'none';
                    this.closeSearchResults('desktop');
                } else if (this.showingRecentSearches) {
                    this.closeSearchResults('desktop');
                    this.closeSearchResults('mobile');
                }
            }

            // Enter to select first result
            if (e.key === 'Enter' && this.currentSearchQuery) {
                const activeResult = document.querySelector('.search-result-item.active');
                if (activeResult) {
                    activeResult.click();
                } else {
                    const firstResult = document.querySelector('.search-result-item');
                    if (firstResult) {
                        firstResult.click();
                    }
                }
            }
        });
    }

    initOptimizedSearch() {
        const desktopInput = document.getElementById('desktopSearchInput');
        const mobileInput = document.getElementById('mobileSearchInput');
        const clearBtn = document.getElementById('searchClear');

        if (desktopInput) {
            // Handle all input events
            desktopInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value, 'desktop');
                if (clearBtn) {
                    clearBtn.style.display = e.target.value ? 'flex' : 'none';
                }
            });

            // Handle paste separately for immediate response
            desktopInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.handleSearchInput(desktopInput.value, 'desktop');
                }, 0);
            });

            // Show recent searches on focus
            desktopInput.addEventListener('focus', (e) => {
                if (!e.target.value.trim()) {
                    this.showRecentSearches('desktop');
                } else if (e.target.value.trim().length >= this.MIN_SEARCH_LENGTH && this.lastSearchResults.length > 0) {
                    this.displaySearchResults(this.lastSearchResults, 'desktop', e.target.value.trim());
                }
            });

            // Hide results on blur (with delay for click handling)
            desktopInput.addEventListener('blur', (e) => {
                setTimeout(() => {
                    if (!e.target.value.trim() && !this.searchInProgress) {
                        this.closeSearchResults('desktop');
                    }
                }, 200);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (desktopInput) {
                    desktopInput.value = '';
                    this.currentSearchQuery = '';
                    this.lastSearchResults = [];
                    this.currentFilters = {};
                    clearBtn.style.display = 'none';
                    this.closeSearchResults('desktop');
                    desktopInput.focus();
                    // Show recent searches after clearing
                    this.showRecentSearches('desktop');
                }
            });
        }

        if (mobileInput) {
            mobileInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value, 'mobile');
            });

            mobileInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.handleSearchInput(mobileInput.value, 'mobile');
                }, 0);
            });

            mobileInput.addEventListener('focus', (e) => {
                if (!e.target.value.trim()) {
                    this.showRecentSearches('mobile');
                }
            });
        }
    }

    // Enhanced search input handler
    handleSearchInput(value, mode) {
        const query = value ? value.trim() : '';
        this.currentSearchQuery = query;
        this.showingRecentSearches = false;

        // Clear all timers
        clearTimeout(this.searchDebounceTimer);

        // Close results if query is empty
        if (query.length === 0) {
            this.closeSearchResults(mode);
            this.lastSearchResults = [];
            this.showRecentSearches(mode);
            return;
        }

        // Show loading state for queries of minimum length
        if (query.length >= this.MIN_SEARCH_LENGTH) {
            // Check cache first for instant display
            const cacheKey = this.searchEngine.generateCacheKey(query, { filters: this.currentFilters });
            if (this.searchEngine.cache.has(cacheKey)) {
                const cached = this.searchEngine.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 30000) {
                    this.displaySearchResults(cached.results, mode, query, cached);
                    return;
                }
            }

            this.showLoadingState(mode, query);

            // Debounce the search
            this.searchDebounceTimer = setTimeout(() => {
                this.performSearch(query, mode);
            }, this.SEARCH_DEBOUNCE_MS);
        } else {
            // Show message for too short query
            this.showMinLengthMessage(mode);
        }
    }

    // Enhanced search with better error handling
    async performSearch(query, mode) {
        if (query !== this.currentSearchQuery || query.length < this.MIN_SEARCH_LENGTH) {
            return;
        }

        try {
            this.searchInProgress = true;

            if (this.searchController) {
                this.searchController.abort();
            }

            this.searchController = new AbortController();

            const searchOptions = {
                type: 'multi',
                page: 1,
                filters: this.currentFilters
            };

            const result = await this.searchEngine.search(
                query,
                this.searchController.signal,
                searchOptions
            );

            if (query === this.currentSearchQuery) {
                this.lastSearchResults = result.results || [];

                if (result.error) {
                    this.displaySearchError(mode, query, result.error);
                } else {
                    this.displaySearchResults(this.lastSearchResults, mode, query, result);

                    // Fetch and display autocomplete suggestions
                    if (result.suggestions && result.suggestions.length > 0) {
                        this.displaySuggestions(result.suggestions, mode);
                    }
                }
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Search error:', error);
                if (query === this.currentSearchQuery) {
                    this.displaySearchError(mode, query, error.message);
                }
            }
        } finally {
            this.searchInProgress = false;
            this.searchController = null;
        }
    }

    showMinLengthMessage(mode) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="search-empty">
                <i data-feather="search"></i>
                <p>Type at least ${this.MIN_SEARCH_LENGTH} characters to search</p>
            </div>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        resultsContainer.classList.add('show');
    }

    showLoadingState(mode, query) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        if (!resultsContainer) return;

        const loadingMessage = `Searching for "${this.escapeHtml(query)}"...`;

        resultsContainer.innerHTML = `
            <div class="search-loading">
                <div class="spinner-cinebrain"></div>
                <span>${loadingMessage}</span>
            </div>
        `;
        resultsContainer.classList.add('show');
    }

    // Enhanced display search results with better formatting
    displaySearchResults(results, mode, query, metadata = {}) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        if (!resultsContainer) return;

        if (query !== this.currentSearchQuery) {
            return;
        }

        this.showingRecentSearches = false;

        if (!results || results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <i data-feather="search"></i>
                    <p>No results found for "${this.escapeHtml(query)}"</p>
                    <p class="small">Try different keywords or check spelling</p>
                    ${this.getSuggestedSearchesHTML()}
                </div>
            `;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            resultsContainer.classList.add('show');
            this.attachSuggestionHandlers(resultsContainer, mode);
            return;
        }

        let html = '';
        const isMobile = window.innerWidth <= 480;

        // Group results by match quality if available
        const exactMatches = results.filter(r => r.match_info?.exact_match);
        const otherResults = results.filter(r => !r.match_info?.exact_match);

        // Display exact matches first
        if (exactMatches.length > 0) {
            html += '<div class="search-section-header">Best Matches</div>';
            html += this.renderSearchResults(exactMatches, isMobile);
        }

        // Display other results
        if (otherResults.length > 0) {
            if (exactMatches.length > 0) {
                html += '<div class="search-section-header">More Results</div>';
            }
            html += this.renderSearchResults(otherResults, isMobile);
        }

        // Add search metadata footer
        html += this.getSearchFooter(metadata, results.length);

        resultsContainer.innerHTML = html;
        resultsContainer.classList.add('show');

        // Add click handlers
        resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const contentId = item.dataset.id;
                if (contentId) {
                    // Track click for analytics
                    this.trackSearchClick(contentId, query, index);
                    window.location.href = `/content/details.html?id=${contentId}`;
                }
            });

            // Add hover effect for keyboard navigation
            item.addEventListener('mouseenter', () => {
                resultsContainer.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    renderSearchResults(results, isMobile) {
        let html = '';

        results.forEach((item, index) => {
            if (!item) return;

            const posterUrl = this.getPosterUrl(item);
            const year = item.year || (item.release_date ? new Date(item.release_date).getFullYear() : '');
            const rating = item.rating ? `⭐ ${parseFloat(item.rating).toFixed(1)}` : '';
            const title = item.title || 'Unknown Title';
            const displayTitle = isMobile && title.length > 30
                ? title.substring(0, 30) + '...'
                : title;

            const contentType = item.content_type || item.type || 'movie';
            const typeColor = this.getTypeColor(contentType);

            // Add quality indicators
            const qualityBadges = this.getQualityBadges(item);

            html += `
                <div class="search-result-item d-flex ${index === 0 ? 'active' : ''}" 
                     data-id="${item.id || ''}"
                     data-match-score="${item.match_info?.score || 0}">
                    <div class="poster-wrapper">
                        <img src="${posterUrl}" 
                             alt="${this.escapeHtml(title)}" 
                             class="search-poster"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy82MDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+PC9zdmc+'"
                             loading="lazy">
                    </div>
                    <div class="search-result-content">
                        <div class="search-result-title">${this.escapeHtml(displayTitle)}</div>
                        <div class="search-result-meta">
                            <span class="badge bg-${typeColor}">${contentType}</span>
                            ${year ? `<span>${year}</span>` : ''}
                            ${rating ? `<span>${rating}</span>` : ''}
                            ${qualityBadges}
                        </div>
                        ${item.overview && !isMobile ? `
                            <div class="search-result-overview">
                                ${this.escapeHtml(item.overview.substring(0, 100))}...
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        return html;
    }

    getQualityBadges(item) {
        let badges = '';

        if (item.is_trending) {
            badges += '<span class="badge bg-danger ms-1">🔥 Trending</span>';
        }
        if (item.is_new_release) {
            badges += '<span class="badge bg-success ms-1">New</span>';
        }
        if (item.match_info?.exact_match) {
            badges += '<span class="badge bg-info ms-1">Exact Match</span>';
        }

        return badges;
    }

    getSearchFooter(metadata, resultCount) {
        let footer = '<div class="search-indicator">';

        if (metadata.fromCache) {
            footer += `<small>⚡ Cached results • ${resultCount} items`;
        } else if (metadata.instant) {
            footer += `<small>⚡ Instant results • ${resultCount} items`;
        } else if (metadata.search_time) {
            footer += `<small>Found ${resultCount} results in ${Math.round(metadata.search_time)}ms`;
        } else {
            footer += `<small>${resultCount} results found`;
        }

        if (metadata.cached) {
            footer += ' • From server cache';
        }

        footer += '</small></div>';

        // Add search metrics if available
        const metrics = this.searchEngine.getMetrics();
        if (metrics.totalSearches > 10) {
            footer += `
                <div class="search-metrics">
                    <small>Cache hit rate: ${metrics.cacheHitRate} • Avg response: ${Math.round(metrics.averageResponseTime)}ms</small>
                </div>
            `;
        }

        return footer;
    }

    getSuggestedSearchesHTML() {
        const suggestions = this.trendingSearches || this.searchEngine.getDefaultTrending();
        const randomSuggestions = suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);

        return `
            <div class="search-suggestions mt-3">
                <span class="suggestions-title">Try searching for:</span>
                <div class="suggestion-chips">
                    ${randomSuggestions.map(s =>
            `<span class="suggestion-chip" data-query="${this.escapeHtml(s)}">${this.escapeHtml(s)}</span>`
        ).join('')}
                </div>
            </div>
        `;
    }

    getPosterUrl(item) {
        if (item.poster_path) {
            if (item.poster_path.startsWith('http')) {
                return item.poster_path;
            }
            return `https://image.tmdb.org/t/p/w92${item.poster_path}`;
        }
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy82MDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+PC9zdmc+';
    }

    getTypeColor(contentType) {
        const colors = {
            'movie': 'primary',
            'tv': 'success',
            'anime': 'warning',
            'series': 'success'
        };
        return colors[contentType.toLowerCase()] || 'secondary';
    }

    trackSearchClick(contentId, query, position) {
        // Track search click for analytics (can be sent to backend)
        try {
            const clickData = {
                contentId,
                query,
                position,
                timestamp: Date.now()
            };

            // Store in local storage for now
            const clicks = JSON.parse(localStorage.getItem('cinebrain-search-clicks') || '[]');
            clicks.push(clickData);

            // Keep only last 50 clicks
            if (clicks.length > 50) {
                clicks.splice(0, clicks.length - 50);
            }

            localStorage.setItem('cinebrain-search-clicks', JSON.stringify(clicks));
        } catch (e) {
            console.error('Failed to track search click:', e);
        }
    }

    displaySuggestions(suggestions, mode) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        if (!resultsContainer || !suggestions || suggestions.length === 0) return;

        // Find or create suggestions container
        let suggestionsContainer = resultsContainer.querySelector('.search-suggestions-inline');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'search-suggestions-inline';
            resultsContainer.appendChild(suggestionsContainer);
        }

        let html = `
            <div class="suggestions-inline-header">
                <span class="suggestions-title">Related searches:</span>
            </div>
            <div class="suggestion-chips">
        `;

        suggestions.slice(0, 5).forEach(suggestion => {
            html += `<span class="suggestion-chip" data-query="${this.escapeHtml(suggestion)}">${this.escapeHtml(suggestion)}</span>`;
        });

        html += `</div>`;
        suggestionsContainer.innerHTML = html;

        this.attachSuggestionHandlers(suggestionsContainer, mode);
    }

    attachSuggestionHandlers(container, mode) {
        container.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const query = chip.dataset.query;
                const input = document.getElementById(`${mode}SearchInput`);
                if (input && query) {
                    input.value = query;
                    this.handleSearchInput(query, mode);
                    if (mode === 'desktop') {
                        const clearBtn = document.getElementById('searchClear');
                        if (clearBtn) clearBtn.style.display = 'flex';
                    }
                }
            });
        });
    }

    displaySearchError(mode, query, errorMessage) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="search-empty">
                <i data-feather="wifi-off"></i>
                <p>Search failed</p>
                <p class="small">${this.escapeHtml(errorMessage || `Unable to search for "${query}"`)}</p>
                <p class="small">Please check your connection and try again</p>
                ${this.getSuggestedSearchesHTML()}
            </div>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        resultsContainer.classList.add('show');
        this.attachSuggestionHandlers(resultsContainer, mode);
    }

    showRecentSearches(mode) {
        const recentSearches = this.searchEngine.getRecentSearches();
        const resultsContainer = document.getElementById(`${mode}SearchResults`);

        if (!resultsContainer) {
            return;
        }

        this.showingRecentSearches = true;

        let html = '';

        // Only show header if there are recent searches
        if (recentSearches.length > 0) {
            html += `
                <div class="recent-searches-header">
                    <span class="recent-title">Recent Searches</span>
                    <button class="clear-recent-btn" onclick="topbar.clearRecentSearches('${mode}')">
                        <i data-feather="trash-2"></i> Clear
                    </button>
                </div>
            `;

            recentSearches.forEach((item, index) => {
                if (!item || !item.query) return;

                const timeAgo = this.getTimeAgo(item.timestamp || Date.now());
                const resultInfo = item.firstResult
                    ? `<span class="recent-result-info">${item.firstResult.type || 'unknown'} • ${item.resultCount || 0} results</span>`
                    : '';

                html += `
                    <div class="search-result-item recent-search-item" data-query="${this.escapeHtml(item.query)}">
                        <div class="recent-search-content">
                            <i data-feather="clock" class="recent-icon"></i>
                            <div class="recent-search-details">
                                <div class="recent-search-query">${this.escapeHtml(item.query)}</div>
                                <div class="recent-search-meta">
                                    <span class="recent-time">${timeAgo}</span>
                                    ${resultInfo}
                                </div>
                            </div>
                            <button class="remove-recent-btn" data-query="${this.escapeHtml(item.query)}" onclick="event.stopPropagation(); topbar.removeRecentSearch('${this.escapeHtml(item.query)}', '${mode}')">
                                <i data-feather="x"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        // Add trending suggestions
        const trendingSuggestions = this.trendingSearches || this.searchEngine.getDefaultTrending();
        html += `
            <div class="search-suggestions">
                <span class="suggestions-title">Trending searches:</span>
                <div class="suggestion-chips">
                    ${trendingSuggestions.slice(0, 5).map(s =>
            `<span class="suggestion-chip" data-query="${this.escapeHtml(s)}">${this.escapeHtml(s)}</span>`
        ).join('')}
                </div>
            </div>
        `;

        resultsContainer.innerHTML = html;
        resultsContainer.classList.add('show');

        // Replace feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Add click handlers for recent searches
        resultsContainer.querySelectorAll('.recent-search-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-recent-btn')) {
                    const query = item.dataset.query;
                    const input = document.getElementById(`${mode}SearchInput`);
                    if (input && query) {
                        input.value = query;
                        this.handleSearchInput(query, mode);
                        if (mode === 'desktop') {
                            const clearBtn = document.getElementById('searchClear');
                            if (clearBtn) clearBtn.style.display = 'flex';
                        }
                    }
                }
            });
        });

        // Add click handlers for suggestion chips
        this.attachSuggestionHandlers(resultsContainer, mode);
    }

    clearRecentSearches(mode) {
        this.searchEngine.clearRecentSearches();
        this.closeSearchResults(mode);
        const input = document.getElementById(`${mode}SearchInput`);
        if (input && !input.value.trim()) {
            this.showRecentSearches(mode);
        }
    }

    removeRecentSearch(query, mode) {
        this.searchEngine.removeRecentSearch(query);
        const input = document.getElementById(`${mode}SearchInput`);
        if (input && !input.value.trim()) {
            this.showRecentSearches(mode);
        }
    }

    getTimeAgo(timestamp) {
        if (!timestamp || typeof timestamp !== 'number') return 'Recently';

        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    closeSearchResults(mode = null) {
        if (mode) {
            const resultsContainer = document.getElementById(`${mode}SearchResults`);
            if (resultsContainer) {
                resultsContainer.classList.remove('show');
            }
        } else {
            document.querySelectorAll('.search-results').forEach(container => {
                container.classList.remove('show');
            });
        }
        this.showingRecentSearches = false;
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // ... Rest of the TopbarComponent methods remain the same ...
    // (handleResponsive, adjustForScreenSize, initTheme, setTheme, updateIconColors, 
    //  toggleTheme, getCurrentUser, initUserMenu, logout, initMobileSearch, 
    //  setupEventListeners, handleSearchNavigation)

    handleResponsive() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.adjustForScreenSize();
            }, 250);
        });
        this.adjustForScreenSize();
    }

    adjustForScreenSize() {
        const width = window.innerWidth;
        const taglineFull = document.querySelector('.tagline-full');
        const taglineMedium = document.querySelector('.tagline-medium');
        const taglineShort = document.querySelector('.tagline-short');

        if (width <= 359) {
            if (taglineFull) taglineFull.style.display = 'none';
            if (taglineMedium) taglineMedium.style.display = 'none';
            if (taglineShort) taglineShort.style.display = 'block';
        } else if (width <= 479) {
            if (taglineFull) taglineFull.style.display = 'none';
            if (taglineMedium) taglineMedium.style.display = 'block';
            if (taglineShort) taglineShort.style.display = 'none';
        } else {
            if (taglineFull) taglineFull.style.display = 'block';
            if (taglineMedium) taglineMedium.style.display = 'none';
            if (taglineShort) taglineShort.style.display = 'none';
        }

        const dropdown = document.querySelector('.dropdown-menu-cinebrain.show');
        if (dropdown) {
            const rect = dropdown.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                dropdown.style.right = '4px';
                dropdown.style.left = 'auto';
            }
        }
    }

    initTheme() {
        if (window.themeManager) {
            const theme = window.themeManager.getCurrentTheme();
            this.updateThemeUI(theme);
        } else {
            const savedTheme = localStorage.getItem('cinebrain-theme') || 'dark';
            this.setTheme(savedTheme);
        }
    }

    setTheme(theme) {
        if (window.themeManager) {
            window.themeManager.applyTheme(theme);
        } else {
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.setAttribute('data-bs-theme', theme);
            document.body.setAttribute('data-theme', theme);
            document.body.setAttribute('data-bs-theme', theme);

            localStorage.setItem('cinebrain-theme', theme);

            window.dispatchEvent(new CustomEvent('themeChanged', {
                detail: { theme: theme },
                bubbles: true
            }));

            setTimeout(() => {
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
                this.updateIconColors();
            }, 0);
        }
    }

    updateIconColors() {
        const allIcons = document.querySelectorAll('svg');
        allIcons.forEach(icon => {
            if (!icon.closest('.avatar-menu')) {
                const parent = icon.parentElement;
                if (parent) {
                    const display = parent.style.display;
                    parent.style.display = 'none';
                    parent.offsetHeight;
                    parent.style.display = display;
                }
            }
        });
    }

    toggleTheme() {
        if (window.themeManager) {
            window.themeManager.toggleTheme();
        } else {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        }

        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    getCurrentUser() {
        const token = localStorage.getItem('cinebrain-token');
        const userStr = localStorage.getItem('cinebrain-user');

        if (token && userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    initUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        if (!dropdown) return;

        if (this.currentUser) {
            const avatarMenu = document.getElementById('avatarMenu');
            const initial = this.currentUser.username ? this.currentUser.username.charAt(0).toUpperCase() : 'U';
            avatarMenu.innerHTML = `<span>${initial}</span>`;

            const width = window.innerWidth;
            const username = this.currentUser.username || 'User';
            const displayName = width <= 400
                ? username.substring(0, 8) + (username.length > 8 ? '...' : '')
                : username;

            let menuItems = `
                <li><h6 class="dropdown-header">Hello, ${displayName}!</h6></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/${username}/profile.html">
                    <i data-feather="user"></i><span>Profile</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/watchlist.html">
                    <i data-feather="bookmark"></i><span>Watchlist</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/favorites.html">
                    <i data-feather="heart"></i><span>Favorites</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/activity.html">
                    <i data-feather="activity"></i><span>Activity</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/settings.html">
                    <i data-feather="settings"></i><span>Settings</span>
                </a></li>`;

            if (this.currentUser.is_admin) {
                menuItems += `
                    <li><hr class="dropdown-divider"></li>
                    <li><h6 class="dropdown-header">Admin</h6></li>
                    <li><a class="dropdown-item dropdown-item-cinebrain" href="/admin/index.html">
                        <i data-feather="shield"></i><span>Dashboard</span>
                    </a></li>
                    <li><a class="dropdown-item dropdown-item-cinebrain" href="/admin/content.html">
                        <i data-feather="film"></i><span>Content</span>
                    </a></li>
                    <li><a class="dropdown-item dropdown-item-cinebrain" href="/admin/users.html">
                        <i data-feather="users"></i><span>Users</span>
                    </a></li>
                    <li><a class="dropdown-item dropdown-item-cinebrain" href="/admin/analytics.html">
                        <i data-feather="bar-chart-2"></i><span>Analytics</span>
                    </a></li>`;
            }

            menuItems += `
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="#" onclick="topbar.logout(); return false;">
                    <i data-feather="log-out"></i><span>Sign Out</span>
                </a></li>`;

            dropdown.innerHTML = menuItems;
        } else {
            dropdown.innerHTML = `
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/auth/login.html">
                    <i data-feather="log-in"></i><span>Login</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/auth/register.html">
                    <i data-feather="user-plus"></i><span>Register</span>
                </a></li>`;
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    logout() {
        // Keep the existing logout implementation
        // It's already well-implemented with responsive dialog
        const confirmDialog = document.createElement('div');
        confirmDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        `;

        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: var(--bs-dropdown-bg, #1a1a1a);
            border-radius: clamp(16px, 4vw, 24px);
            padding: clamp(20px, 5vw, 32px);
            width: min(90vw, 400px);
            max-width: calc(100vw - 32px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: scaleIn 0.2s ease;
            text-align: center;
            position: relative;
            margin: auto;
        `;

        dialogBox.innerHTML = `
            <div class="dialog-content-wrapper" style="margin-bottom: clamp(16px, 4vw, 24px);">
                <div class="dialog-icon-section">
                    <div class="dialog-icon-wrapper" style="
                        width: clamp(48px, 12vw, 64px);
                        height: clamp(48px, 12vw, 64px);
                        margin: 0 auto clamp(12px, 3vw, 20px);
                        background: linear-gradient(135deg, var(--cinebrain-red, #E50914), var(--cinebrain-purple, #8B5CF6));
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                    ">
                        <i data-feather="log-out" class="dialog-icon" style="
                            width: clamp(24px, 6vw, 32px);
                            height: clamp(24px, 6vw, 32px);
                            stroke: white;
                            stroke-width: 2.5;
                        "></i>
                    </div>
                </div>
                
                <h3 class="dialog-title" style="
                    margin: 0 0 clamp(6px, 1.5vw, 10px) 0;
                    color: var(--text-primary, #ffffff);
                    font-size: clamp(16px, 4.5vw, 20px);
                    font-weight: 600;
                    line-height: 1.3;
                ">Sign Out?</h3>
                
                <p class="dialog-text" style="
                    margin: 0;
                    color: var(--text-secondary, #b3b3b3);
                    font-size: clamp(13px, 3.5vw, 15px);
                    line-height: 1.5;
                    padding: 0 clamp(8px, 2vw, 16px);
                ">
                    Are you sure you want to sign out of CineBrain?
                </p>
            </div>
            
            <div style="
                display: flex;
                gap: clamp(8px, 2vw, 12px);
                justify-content: center;
                flex-wrap: nowrap;
            ">
                <button id="cancelLogout" class="dialog-button" style="
                    flex: 1;
                    min-width: 0;
                    max-width: 160px;
                    padding: clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px);
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-primary, #ffffff);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: clamp(8px, 2vw, 12px);
                    cursor: pointer;
                    font-weight: 500;
                    font-size: clamp(13px, 3.5vw, 15px);
                    transition: all 0.2s;
                    min-height: clamp(38px, 10vw, 46px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: nowrap;
                    -webkit-tap-highlight-color: transparent;
                "
                onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'"
                onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'"
                >Cancel</button>
                
                <button id="confirmLogout" class="dialog-button" style="
                    flex: 1;
                    min-width: 0;
                    max-width: 160px;
                    padding: clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px);
                    background: linear-gradient(135deg, var(--cinebrain-red, #E50914), var(--cinebrain-purple, #8B5CF6));
                    color: white;
                    border: none;
                    border-radius: clamp(8px, 2vw, 12px);
                    cursor: pointer;
                    font-weight: 500;
                    font-size: clamp(13px, 3.5vw, 15px);
                    transition: all 0.2s;
                    min-height: clamp(38px, 10vw, 46px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: nowrap;
                    position: relative;
                    overflow: hidden;
                    -webkit-tap-highlight-color: transparent;
                "
                onmouseover="this.style.filter='brightness(1.1)'"
                onmouseout="this.style.filter='brightness(1)'"
                >Sign Out</button>
            </div>
        `;

        confirmDialog.appendChild(dialogBox);
        document.body.appendChild(confirmDialog);

        // Add animations
        if (!document.getElementById('dialog-animations')) {
            const style = document.createElement('style');
            style.id = 'dialog-animations';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { 
                        transform: scale(0.9); 
                        opacity: 0; 
                    }
                    to { 
                        transform: scale(1); 
                        opacity: 1; 
                    }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        // Initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Handle button clicks
        document.getElementById('cancelLogout').addEventListener('click', () => {
            confirmDialog.style.animation = 'fadeIn 0.2s ease reverse';
            setTimeout(() => confirmDialog.remove(), 200);
        });

        document.getElementById('confirmLogout').addEventListener('click', function () {
            // Show loading state
            this.innerHTML = `
                <svg style="
                    width: 16px; 
                    height: 16px; 
                    margin-right: 6px;
                    animation: spin 1s linear infinite;
                " viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3"/>
                    <path d="M21 12a9 9 0 11-18 0" stroke-linecap="round"/>
                </svg>
                Signing out...
            `;
            this.disabled = true;
            this.style.opacity = '0.8';

            // Show notification
            if (window.topbar && window.topbar.notificationSystem) {
                window.topbar.notificationSystem.show('Signing out successfully...', 'success', 2000);
            }

            // Clear all auth data
            localStorage.removeItem('cinebrain-token');
            localStorage.removeItem('cinebrain-user');
            localStorage.removeItem('cinebrain-role');
            sessionStorage.clear();

            // Store flag to show logout message on home page
            sessionStorage.setItem('show-logout-message', 'true');

            // Redirect to home page (guest view) after delay
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        });

        // Close on backdrop click
        confirmDialog.addEventListener('click', (e) => {
            if (e.target === confirmDialog) {
                confirmDialog.style.animation = 'fadeIn 0.2s ease reverse';
                setTimeout(() => confirmDialog.remove(), 200);
            }
        });

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                confirmDialog.style.animation = 'fadeIn 0.2s ease reverse';
                setTimeout(() => confirmDialog.remove(), 200);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    initMobileSearch() {
        const trigger = document.getElementById('mobileSearchTrigger');
        const overlay = document.getElementById('mobileSearchOverlay');
        const closeBtn = document.getElementById('closeMobileSearch');
        const input = document.getElementById('mobileSearchInput');

        if (trigger) {
            trigger.addEventListener('click', () => {
                overlay?.classList.add('show');
                setTimeout(() => {
                    input?.focus();
                    if (input && !input.value.trim()) {
                        this.showRecentSearches('mobile');
                    }
                }, 300);
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (overlay) overlay.classList.remove('show');
                if (input) {
                    input.value = '';
                    this.currentSearchQuery = '';
                    this.lastSearchResults = [];
                    this.closeSearchResults('mobile');
                }
            });
        }

        // Swipe to close on mobile
        let touchStartX = 0;
        overlay?.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        overlay?.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            if (touchEndX - touchStartX > 100) {
                overlay.classList.remove('show');
            }
        });
    }

    setupEventListeners() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTheme();
            });
        }

        // Arrow key navigation for search results
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                this.handleSearchNavigation(e);
            }
        });

        // Avatar menu positioning
        const avatarMenu = document.getElementById('avatarMenu');
        if (avatarMenu) {
            avatarMenu.addEventListener('click', () => {
                setTimeout(() => {
                    const dropdown = document.querySelector('.dropdown-menu-cinebrain.show');
                    if (dropdown) {
                        const rect = dropdown.getBoundingClientRect();
                        if (rect.right > window.innerWidth) {
                            dropdown.style.right = '4px';
                            dropdown.style.left = 'auto';
                        }
                    }
                }, 10);
            });
        }
    }

    handleSearchNavigation(event) {
        const activeResults = document.querySelector('.search-results.show');
        if (!activeResults) return;

        const items = activeResults.querySelectorAll('.search-result-item:not(.recent-search-item)');
        if (items.length === 0) return;

        event.preventDefault();

        let currentIndex = Array.from(items).findIndex(item => item.classList.contains('active'));

        if (event.key === 'ArrowDown') {
            currentIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
            currentIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        items.forEach(item => item.classList.remove('active'));
        items[currentIndex].classList.add('active');
        items[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

// Initialize TopBar Component
window.topbar = new TopbarComponent();

// Check for logout message on page load
document.addEventListener('DOMContentLoaded', () => {
    const showLogoutMessage = sessionStorage.getItem('show-logout-message');

    if (showLogoutMessage) {
        sessionStorage.removeItem('show-logout-message');

        if (window.topbar && window.topbar.notificationSystem) {
            setTimeout(() => {
                window.topbar.notificationSystem.show('You have been signed out successfully', 'info', 4000);
            }, 500);
        }
    }
});