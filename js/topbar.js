// Initialize Feather Icons first
if (typeof feather !== 'undefined') {
    feather.replace();
}

// Advanced Search Engine with Backend Priority and Recent Searches
class SearchEngine {
    constructor(apiBase) {
        this.apiBase = apiBase;
        this.cache = new Map();
        this.activeRequest = null;
        this.maxCacheSize = 50;
        this.cacheTimeout = 60000; // 1 minute cache
        this.recentSearches = this.loadRecentSearches();
        this.maxRecentSearches = 10;
    }

    loadRecentSearches() {
        try {
            const stored = localStorage.getItem('cinebrain-recent-searches');
            if (!stored) return [];

            const searches = JSON.parse(stored);
            // Validate and filter out invalid entries
            return searches.filter(item =>
                item &&
                typeof item === 'object' &&
                item.query &&
                typeof item.query === 'string'
            );
        } catch (e) {
            console.error('Error loading recent searches:', e);
            // Clear corrupted data
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

        // Remove if already exists - with proper validation
        this.recentSearches = this.recentSearches.filter(item => {
            // Ensure item and item.query exist before comparing
            return item && item.query && item.query.toLowerCase() !== query.toLowerCase();
        });

        // Add to beginning with timestamp and optional result info
        const recentItem = {
            query: query,
            timestamp: Date.now(),
            resultCount: result ? result.length : 0,
            firstResult: result && result[0] ? {
                title: result[0].title || 'Unknown',
                type: result[0].content_type || 'unknown'
            } : null
        };

        this.recentSearches.unshift(recentItem);

        // Keep only max number of searches
        if (this.recentSearches.length > this.maxRecentSearches) {
            this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches);
        }

        this.saveRecentSearches();
    }

    getRecentSearches() {
        // Return only valid recent searches
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

    async search(query, signal) {
        const cacheKey = query.toLowerCase().trim();

        // Check cache first (but with short timeout)
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return { results: cached.results, fromCache: true };
            }
            this.cache.delete(cacheKey);
        }

        // Cancel previous request if exists
        if (this.activeRequest) {
            this.activeRequest.abort();
        }

        // Create new abort controller for this request
        const controller = new AbortController();
        this.activeRequest = controller;

        try {
            const response = await fetch(
                `${this.apiBase}/search?query=${encodeURIComponent(query)}&type=multi&page=1`,
                {
                    signal: signal || controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            const results = data.results || [];

            // Add to recent searches if we got results
            if (results.length > 0) {
                this.addRecentSearch(query, results);
            }

            // Cache the results
            this.cache.set(cacheKey, {
                results,
                timestamp: Date.now()
            });

            // Manage cache size
            if (this.cache.size > this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            return { results, fromCache: false };
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            console.error('Search error:', error);
            throw error;
        } finally {
            if (this.activeRequest === controller) {
                this.activeRequest = null;
            }
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

// Notification System with Responsive Sizing
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

// Optimized TopBar Component with Theme Manager Integration
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

        // Reduced debounce for faster response
        this.SEARCH_DEBOUNCE_MS = 150; // Reduced from 300ms
        this.MIN_SEARCH_LENGTH = 1; // Start searching from 1 character

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

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // New method for theme change callback
    onThemeChange(theme) {
        this.updateThemeUI(theme);
    }

    // New method to update UI without setting theme
    updateThemeUI(theme) {
        // Just update the UI elements, don't set attributes
        // The theme manager already did that

        // Update any component-specific theme elements
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
            // Handle all input events (typing, paste, etc.)
            desktopInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value, 'desktop');
                if (clearBtn) {
                    clearBtn.style.display = e.target.value ? 'flex' : 'none';
                }
            });

            // Handle paste separately for immediate response
            desktopInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.handleSearchInput(e.target.value, 'desktop');
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
                    this.handleSearchInput(e.target.value, 'mobile');
                }, 0);
            });

            mobileInput.addEventListener('focus', (e) => {
                if (!e.target.value.trim()) {
                    this.showRecentSearches('mobile');
                }
            });
        }
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
                if (!item || !item.query) return; // Skip invalid items

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
        html += `
            <div class="search-suggestions">
                <span class="suggestions-title">Try searching for:</span>
                <div class="suggestion-chips">
                    <span class="suggestion-chip" data-query="Avengers">Avengers</span>
                    <span class="suggestion-chip" data-query="Spider-Man">Spider-Man</span>
                    <span class="suggestion-chip" data-query="Batman">Batman</span>
                    <span class="suggestion-chip" data-query="Anime">Anime</span>
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
        resultsContainer.querySelectorAll('.suggestion-chip').forEach(chip => {
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

    handleSearchInput(value, mode) {
        const query = value ? value.trim() : '';
        this.currentSearchQuery = query;
        this.showingRecentSearches = false;

        // Clear existing debounce timer
        clearTimeout(this.searchDebounceTimer);

        // Close results if query is too short
        if (query.length < this.MIN_SEARCH_LENGTH) {
            this.closeSearchResults(mode);
            this.lastSearchResults = [];
            // Show recent searches when input is empty
            if (query.length === 0) {
                this.showRecentSearches(mode);
            }
            return;
        }

        // Show loading state immediately
        this.showLoadingState(mode, query);

        // Set up debounced search
        this.searchDebounceTimer = setTimeout(() => {
            this.performSearch(query, mode);
        }, this.SEARCH_DEBOUNCE_MS);
    }

    async performSearch(query, mode) {
        // Skip if query hasn't changed or is too short
        if (query !== this.currentSearchQuery || query.length < this.MIN_SEARCH_LENGTH) {
            return;
        }

        try {
            this.searchInProgress = true;

            // Cancel any existing search request
            if (this.searchController) {
                this.searchController.abort();
            }

            this.searchController = new AbortController();

            const startTime = performance.now();
            const { results, fromCache } = await this.searchEngine.search(query, this.searchController.signal);
            const responseTime = performance.now() - startTime;

            // Only update if this is still the current query
            if (query === this.currentSearchQuery) {
                this.lastSearchResults = results;
                this.displaySearchResults(results, mode, query, fromCache ? 'cache' : 'backend', responseTime);
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Search error:', error);
                if (query === this.currentSearchQuery) {
                    this.displaySearchError(mode, query);
                }
            }
        } finally {
            this.searchInProgress = false;
            this.searchController = null;
        }
    }

    showLoadingState(mode, query) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        if (!resultsContainer) return;

        // Only show loading if we don't have cached results to show
        if (this.lastSearchResults.length === 0 || this.currentSearchQuery !== query) {
            resultsContainer.innerHTML = `
                <div class="search-loading">
                    <div class="spinner-cinebrain"></div>
                    <span>Searching for "${this.escapeHtml(query)}"...</span>
                </div>
            `;
            resultsContainer.classList.add('show');
        }
    }

    displaySearchResults(results, mode, query, source = 'backend', responseTime = 0) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        if (!resultsContainer) return;

        // Don't update if query has changed
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
                </div>
            `;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            resultsContainer.classList.add('show');
            return;
        }

        // Build results HTML
        let html = '';
        const isMobile = window.innerWidth <= 480;

        results.forEach((item, index) => {
            if (!item) return; // Skip invalid items

            const posterUrl = item.poster_path
                ? (item.poster_path.startsWith('http')
                    ? item.poster_path
                    : `https://image.tmdb.org/t/p/w92${item.poster_path}`)
                : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy82MDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+PC9zdmc+';

            const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
            const rating = item.rating ? `⭐ ${item.rating.toFixed(1)}` : '';
            const title = item.title || 'Unknown Title';
            const displayTitle = isMobile && title.length > 30
                ? title.substring(0, 30) + '...'
                : title;

            const contentType = item.content_type || 'movie';
            const typeColor = contentType === 'movie' ? 'primary' :
                contentType === 'tv' ? 'success' :
                    contentType === 'anime' ? 'warning' : 'secondary';

            html += `
                <div class="search-result-item d-flex ${index === 0 ? 'active' : ''}" data-id="${item.id || ''}">
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
                        </div>
                    </div>
                </div>
            `;
        });

        // Add search info footer
        if (source === 'backend' && responseTime > 0) {
            html += `
                <div class="search-indicator">
                    <small>Found ${results.length} results in ${responseTime.toFixed(0)}ms</small>
                </div>
            `;
        } else if (source === 'cache') {
            html += `
                <div class="search-indicator">
                    <small>⚡ Cached results • ${results.length} items</small>
                </div>
            `;
        }

        resultsContainer.innerHTML = html;
        resultsContainer.classList.add('show');

        // Add click handlers
        resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const contentId = item.dataset.id;
                if (contentId) {
                    window.location.href = `/content/details.html?id=${contentId}`;
                }
            });
        });
    }

    displaySearchError(mode, query) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="search-empty">
                <i data-feather="wifi-off"></i>
                <p>Search failed</p>
                <p class="small">Unable to search for "${this.escapeHtml(query)}"</p>
                <p class="small">Please check your connection and try again</p>
            </div>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        resultsContainer.classList.add('show');
    }

    closeSearchResults(mode = null) {
        if (mode) {
            const resultsContainer = document.getElementById(`${mode}SearchResults`);
            if (resultsContainer) {
                resultsContainer.classList.remove('show');
                // Don't clear the HTML to allow for re-showing on focus
            }
        } else {
            document.querySelectorAll('.search-results').forEach(container => {
                container.classList.remove('show');
            });
        }
        this.showingRecentSearches = false;
    }

    escapeHtml(text) {
        // Handle null/undefined values
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
        // If theme manager exists, use it
        if (window.themeManager) {
            const theme = window.themeManager.getCurrentTheme();
            this.updateThemeUI(theme);
        } else {
            // Fallback to old method
            const savedTheme = localStorage.getItem('cinebrain-theme') || 'dark';
            this.setTheme(savedTheme);
        }
    }

    setTheme(theme) {
        // If theme manager exists, delegate to it
        if (window.themeManager) {
            window.themeManager.applyTheme(theme);
        } else {
            // Fallback to old method
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
            // Fallback to old method
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        }

        // Provide haptic feedback if available
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
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/profile.html">
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
        // Create responsive confirmation dialog
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
        <style>
            @media (max-width: 320px) {
                .dialog-icon-wrapper { 
                    width: 48px !important; 
                    height: 48px !important; 
                }
                .dialog-icon { 
                    width: 24px !important; 
                    height: 24px !important; 
                }
                .dialog-title { 
                    font-size: 16px !important; 
                }
                .dialog-text { 
                    font-size: 13px !important; 
                }
                .dialog-button { 
                    font-size: 13px !important;
                    padding: 10px 16px !important;
                    min-height: 38px !important;
                }
            }
            
            @media (min-width: 321px) and (max-width: 375px) {
                .dialog-icon-wrapper { 
                    width: 56px !important; 
                    height: 56px !important; 
                }
                .dialog-icon { 
                    width: 28px !important; 
                    height: 28px !important; 
                }
                .dialog-title { 
                    font-size: 18px !important; 
                }
                .dialog-text { 
                    font-size: 14px !important; 
                }
                .dialog-button { 
                    font-size: 14px !important;
                    padding: 11px 20px !important;
                    min-height: 42px !important;
                }
            }
            
            @media (min-width: 376px) and (max-width: 414px) {
                .dialog-icon-wrapper { 
                    width: 60px !important; 
                    height: 60px !important; 
                }
                .dialog-icon { 
                    width: 30px !important; 
                    height: 30px !important; 
                }
                .dialog-title { 
                    font-size: 19px !important; 
                }
                .dialog-text { 
                    font-size: 14px !important; 
                }
                .dialog-button { 
                    font-size: 14px !important;
                    padding: 12px 22px !important;
                    min-height: 44px !important;
                }
            }
            
            @media (min-width: 415px) {
                .dialog-icon-wrapper { 
                    width: 64px !important; 
                    height: 64px !important; 
                }
                .dialog-icon { 
                    width: 32px !important; 
                    height: 32px !important; 
                }
                .dialog-title { 
                    font-size: 20px !important; 
                }
                .dialog-text { 
                    font-size: 15px !important; 
                }
                .dialog-button { 
                    font-size: 15px !important;
                    padding: 12px 24px !important;
                    min-height: 46px !important;
                }
            }

            /* Landscape mode adjustments */
            @media (orientation: landscape) and (max-height: 500px) {
                .dialog-icon-wrapper { 
                    width: 40px !important; 
                    height: 40px !important; 
                }
                .dialog-icon { 
                    width: 20px !important; 
                    height: 20px !important; 
                }
                .dialog-content-wrapper {
                    margin-bottom: 12px !important;
                }
            }

            /* Small devices in landscape */
            @media (orientation: landscape) and (max-height: 400px) {
                .dialog-icon-section {
                    display: none !important;
                }
            }
        </style>
        
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
            ontouchstart="this.style.background='rgba(255, 255, 255, 0.15)'"
            ontouchend="this.style.background='rgba(255, 255, 255, 0.1)'"
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
            ontouchstart="this.style.filter='brightness(1.1)'"
            ontouchend="this.style.filter='brightness(1)'"
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
            
            /* Responsive button hover effects */
            @media (hover: hover) {
                .dialog-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }
            }
            
            /* Touch feedback */
            .dialog-button:active {
                transform: scale(0.98);
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
            // Show loading state with responsive text
            const viewportWidth = window.innerWidth;
            const loadingText = viewportWidth < 360 ? 'Signing out...' : 'Signing out...';
            const spinnerSize = viewportWidth < 360 ? '14px' : '16px';

            this.innerHTML = `
            <svg style="
                width: ${spinnerSize}; 
                height: ${spinnerSize}; 
                margin-right: 6px;
                animation: spin 1s linear infinite;
            " viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3"/>
                <path d="M21 12a9 9 0 11-18 0" stroke-linecap="round"/>
            </svg>
            ${loadingText}
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
                    // Show recent searches on mobile when opened
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
        // Remove the flag
        sessionStorage.removeItem('show-logout-message');

        // Show notification if notification system exists
        if (window.topbar && window.topbar.notificationSystem) {
            setTimeout(() => {
                window.topbar.notificationSystem.show('You have been signed out successfully', 'info', 4000);
            }, 500);
        }
    }
});