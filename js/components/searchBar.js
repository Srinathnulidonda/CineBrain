/**
 * Search Bar Component with Advanced Features
 */

class SearchBarComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            placeholder: 'Search movies, TV shows...',
            minLength: 2,
            debounceDelay: 300,
            maxResults: 8,
            showFilters: true,
            showHistory: true,
            ...options
        };
        
        this.searchInput = null;
        this.resultsContainer = null;
        this.filtersContainer = null;
        this.isSearching = false;
        this.currentQuery = '';
        this.searchHistory = [];
        this.activeFilters = {};
        
        this.searchDebounce = debounce(this.performSearch.bind(this), this.options.debounceDelay);
        
        this.init();
    }

    init() {
        this.render();
        this.loadSearchHistory();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="search-bar-wrapper">
                <!-- Main Search Input -->
                <div class="search-input-group">
                    <div class="search-input-wrapper">
                        <input type="text" 
                               class="search-input form-control" 
                               placeholder="${this.options.placeholder}"
                               autocomplete="off"
                               spellcheck="false">
                        <button class="search-clear-btn d-none" type="button">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="search-submit-btn" type="button">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    
                    ${this.options.showFilters ? this.renderFiltersToggle() : ''}
                </div>

                <!-- Search Filters -->
                ${this.options.showFilters ? this.renderFilters() : ''}

                <!-- Search Results -->
                <div class="search-results-wrapper">
                    <div class="search-results d-none">
                        <div class="search-results-header">
                            <span class="results-count"></span>
                            <button class="close-results-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="search-results-content"></div>
                        <div class="search-results-footer d-none">
                            <button class="btn btn-outline-light btn-sm load-more-btn">
                                Load More Results
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Search History -->
                ${this.options.showHistory ? this.renderSearchHistory() : ''}
            </div>
        `;

        this.searchInput = this.container.querySelector('.search-input');
        this.resultsContainer = this.container.querySelector('.search-results');
        this.filtersContainer = this.container.querySelector('.search-filters');
    }

    renderFiltersToggle() {
        return `
            <button class="filters-toggle-btn btn btn-outline-light btn-sm ms-2" type="button">
                <i class="fas fa-filter me-1"></i>
                Filters
                <span class="filter-count d-none">0</span>
            </button>
        `;
    }

    renderFilters() {
        return `
            <div class="search-filters collapse mt-3">
                <div class="filters-grid">
                    <!-- Content Type Filter -->
                    <div class="filter-group">
                        <label class="filter-label">Type</label>
                        <div class="filter-options">
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" 
                                       id="filter-movie" value="movie" data-filter="type">
                                <label class="form-check-label" for="filter-movie">Movies</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" 
                                       id="filter-tv" value="tv" data-filter="type">
                                <label class="form-check-label" for="filter-tv">TV Shows</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" 
                                       id="filter-anime" value="anime" data-filter="type">
                                <label class="form-check-label" for="filter-anime">Anime</label>
                            </div>
                        </div>
                    </div>

                    <!-- Genre Filter -->
                    <div class="filter-group">
                        <label class="filter-label">Genre</label>
                        <select class="form-select" data-filter="genre">
                            <option value="">All Genres</option>
                            ${Object.entries(GENRE_MAP).map(([id, name]) => 
                                `<option value="${id}">${name}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <!-- Year Filter -->
                    <div class="filter-group">
                        <label class="filter-label">Year</label>
                        <div class="year-range">
                            <input type="number" class="form-control form-control-sm" 
                                   placeholder="From" min="1900" max="${new Date().getFullYear()}"
                                   data-filter="year_from">
                            <span class="mx-2">to</span>
                            <input type="number" class="form-control form-control-sm" 
                                   placeholder="To" min="1900" max="${new Date().getFullYear()}"
                                   data-filter="year_to">
                        </div>
                    </div>

                    <!-- Rating Filter -->
                    <div class="filter-group">
                        <label class="filter-label">Minimum Rating</label>
                        <select class="form-select" data-filter="rating">
                            <option value="">Any Rating</option>
                            <option value="7">7.0+</option>
                            <option value="8">8.0+</option>
                            <option value="9">9.0+</option>
                        </select>
                    </div>

                    <!-- Language Filter -->
                    <div class="filter-group">
                        <label class="filter-label">Language</label>
                        <select class="form-select" data-filter="language">
                            <option value="">All Languages</option>
                            ${Object.entries(REGIONAL_LANGUAGES).map(([name, code]) => 
                                `<option value="${code}">${name}</option>`
                            ).join('')}
                            <option value="en">English</option>
                            <option value="ja">Japanese</option>
                            <option value="ko">Korean</option>
                        </select>
                    </div>
                </div>

                <div class="filters-actions mt-3">
                    <button class="btn btn-primary btn-sm apply-filters-btn">
                        <i class="fas fa-check me-1"></i>Apply Filters
                    </button>
                    <button class="btn btn-outline-light btn-sm clear-filters-btn">
                        <i class="fas fa-undo me-1"></i>Clear All
                    </button>
                </div>
            </div>
        `;
    }

    renderSearchHistory() {
        return `
            <div class="search-history d-none">
                <div class="search-history-header">
                    <h6><i class="fas fa-history me-2"></i>Recent Searches</h6>
                    <button class="clear-history-btn btn btn-link btn-sm p-0">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="search-history-items"></div>
            </div>
        `;
    }

    bindEvents() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.handleInputChange(query);
        });

        this.searchInput.addEventListener('focus', () => {
            this.handleInputFocus();
        });

        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Search actions
        this.container.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            switch (true) {
                case target.classList.contains('search-submit-btn'):
                    this.handleSearchSubmit();
                    break;
                case target.classList.contains('search-clear-btn'):
                    this.clearSearch();
                    break;
                case target.classList.contains('filters-toggle-btn'):
                    this.toggleFilters();
                    break;
                case target.classList.contains('apply-filters-btn'):
                    this.applyFilters();
                    break;
                case target.classList.contains('clear-filters-btn'):
                    this.clearFilters();
                    break;
                case target.classList.contains('close-results-btn'):
                    this.hideResults();
                    break;
                case target.classList.contains('load-more-btn'):
                    this.loadMoreResults();
                    break;
                case target.classList.contains('clear-history-btn'):
                    this.clearSearchHistory();
                    break;
            }
        });

        // Filter changes
        this.container.addEventListener('change', (e) => {
            if (e.target.hasAttribute('data-filter')) {
                this.updateActiveFilters();
            }
        });

        // Search result clicks
        this.container.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                this.handleResultClick(resultItem);
            }

            const historyItem = e.target.closest('.search-history-item');
            if (historyItem) {
                this.handleHistoryClick(historyItem);
            }
        });

        // Outside click to close
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideResults();
                this.hideSearchHistory();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideResults();
                this.hideSearchHistory();
            }
        });
    }

    handleInputChange(query) {
        this.currentQuery = query;
        
        // Show/hide clear button
        const clearBtn = this.container.querySelector('.search-clear-btn');
        clearBtn.classList.toggle('d-none', !query);

        // Hide search history when typing
        this.hideSearchHistory();

        if (query.length >= this.options.minLength) {
            this.searchDebounce(query);
        } else {
            this.hideResults();
        }
    }

    handleInputFocus() {
        if (!this.currentQuery && this.options.showHistory) {
            this.showSearchHistory();
        }
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                this.handleSearchSubmit();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateResults('down');
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateResults('up');
                break;
        }
    }

    handleSearchSubmit() {
        if (this.currentQuery.length >= this.options.minLength) {
            this.performSearch(this.currentQuery);
            this.saveToHistory(this.currentQuery);
            this.searchInput.blur();
        }
    }

    async performSearch(query) {
        if (this.isSearching) return;
        
        this.isSearching = true;
        this.showSearchLoading();

        try {
            Performance.mark('search-start');
            
            const filters = this.getActiveFilters();
            const searchParams = { ...filters, q: query };
            
            const results = await apiService.searchContent(query, filters);
            
            Performance.measure('Search Performance', 'search-start');
            
            this.displayResults(results, query);
            this.saveToHistory(query);

            // Track search event
            EventEmitter.emit('analytics', {
                event: 'search_performed',
                category: 'search',
                data: { query, filters: Object.keys(filters).length }
            });

        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError('Search failed. Please try again.');
        } finally {
            this.isSearching = false;
        }
    }

    showSearchLoading() {
        const resultsContent = this.container.querySelector('.search-results-content');
        resultsContent.innerHTML = `
            <div class="search-loading text-center py-4">
                <div class="spinner-border text-danger mb-3" role="status">
                    <span class="visually-hidden">Searching...</span>
                </div>
                <p>Searching for "${sanitizeText(this.currentQuery)}"...</p>
            </div>
        `;
        this.showResults();
    }

    displayResults(results, query) {
        const { database_results = [], tmdb_results = [] } = results;
        const allResults = [...database_results, ...tmdb_results];
        
        if (allResults.length === 0) {
            this.showNoResults(query);
            return;
        }

        const resultsContent = this.container.querySelector('.search-results-content');
        const resultsCount = this.container.querySelector('.results-count');
        
        resultsCount.textContent = `${allResults.length} results for "${query}"`;
        
        resultsContent.innerHTML = this.renderResults(allResults.slice(0, this.options.maxResults));
        
        // Show load more if there are more results
        const loadMoreBtn = this.container.querySelector('.load-more-btn');
        const footer = this.container.querySelector('.search-results-footer');
        
        if (allResults.length > this.options.maxResults) {
            footer.classList.remove('d-none');
            loadMoreBtn.dataset.offset = this.options.maxResults;
            loadMoreBtn.dataset.total = allResults.length;
        } else {
            footer.classList.add('d-none');
        }

        this.showResults();
    }

    renderResults(results) {
        return results.map(item => {
            const title = item.title || item.name;
            const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
            const rating = item.rating || item.vote_average;
            
            return `
                <div class="search-result-item" data-content-id="${item.id || item.tmdb_id}">
                    <div class="result-image">
                        <img src="${getImageUrl(item.poster_path, 'w92')}" 
                             alt="${sanitizeText(title)}"
                             onerror="this.src='${IMAGE_CONFIG.PLACEHOLDER}'">
                    </div>
                    <div class="result-info">
                        <h6 class="result-title">${sanitizeText(title)}</h6>
                        <p class="result-overview">${sanitizeText(item.overview, 80)}</p>
                        <div class="result-meta">
                            ${year ? `<span class="year">${year}</span>` : ''}
                            ${rating ? `<span class="rating"><i class="fas fa-star"></i> ${formatRating(rating)}</span>` : ''}
                            <span class="type">${item.content_type || (item.first_air_date ? 'TV' : 'Movie')}</span>
                        </div>
                    </div>
                    <div class="result-actions">
                        <button class="btn btn-sm btn-outline-light quick-add-btn" 
                                data-action="favorite" data-content-id="${item.id || item.tmdb_id}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    showNoResults(query) {
        const resultsContent = this.container.querySelector('.search-results-content');
        const resultsCount = this.container.querySelector('.results-count');
        
        resultsCount.textContent = `No results found for "${query}"`;
        resultsContent.innerHTML = `
            <div class="no-results text-center py-4">
                <i class="fas fa-search text-muted mb-3" style="font-size: 3rem;"></i>
                <h5>No results found</h5>
                <p class="text-muted">Try adjusting your search terms or filters</p>
                <button class="btn btn-outline-light btn-sm clear-filters-btn mt-2">
                    <i class="fas fa-filter me-1"></i>Clear Filters
                </button>
            </div>
        `;
        
        this.showResults();
    }

    showSearchError(message) {
        const resultsContent = this.container.querySelector('.search-results-content');
        resultsContent.innerHTML = `
            <div class="search-error text-center py-4">
                <i class="fas fa-exclamation-triangle text-warning mb-3" style="font-size: 3rem;"></i>
                <h5>Search Error</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary btn-sm retry-search-btn">
                    <i class="fas fa-redo me-1"></i>Try Again
                </button>
            </div>
        `;
        this.showResults();
    }

    showResults() {
        this.resultsContainer.classList.remove('d-none');
        this.hideSearchHistory();
    }

    hideResults() {
        this.resultsContainer.classList.add('d-none');
    }

    showSearchHistory() {
        if (this.searchHistory.length === 0) return;
        
        const historyContainer = this.container.querySelector('.search-history');
        const historyItems = this.container.querySelector('.search-history-items');
        
        historyItems.innerHTML = this.searchHistory.map(query => `
            <div class="search-history-item" data-query="${query}">
                <i class="fas fa-history me-2"></i>
                <span>${sanitizeText(query)}</span>
            </div>
        `).join('');
        
        historyContainer.classList.remove('d-none');
    }

    hideSearchHistory() {
        const historyContainer = this.container.querySelector('.search-history');
        historyContainer.classList.add('d-none');
    }

    loadSearchHistory() {
        this.searchHistory = storageService.getSearchHistory();
    }

    saveToHistory(query) {
        storageService.saveSearchHistory(query);
        this.loadSearchHistory();
    }

    clearSearchHistory() {
        storageService.clearSearchHistory();
        this.searchHistory = [];
        this.hideSearchHistory();
        showToast('Search history cleared', 'success');
    }

    clearSearch() {
        this.searchInput.value = '';
        this.currentQuery = '';
        this.hideResults();
        this.container.querySelector('.search-clear-btn').classList.add('d-none');
        this.searchInput.focus();
    }

    toggleFilters() {
        const filters = this.container.querySelector('.search-filters');
        const toggle = this.container.querySelector('.filters-toggle-btn');
        
        if (filters.classList.contains('show')) {
            bootstrap.Collapse.getInstance(filters).hide();
        } else {
            new bootstrap.Collapse(filters).show();
        }
    }

    updateActiveFilters() {
        this.activeFilters = this.getActiveFilters();
        this.updateFilterCount();
        
        // Auto-search if there's a query
        if (this.currentQuery.length >= this.options.minLength) {
            this.searchDebounce(this.currentQuery);
        }
    }

    getActiveFilters() {
        const filters = {};
        const filterElements = this.container.querySelectorAll('[data-filter]');
        
        filterElements.forEach(element => {
            const filterKey = element.dataset.filter;
            let value = element.value;
            
            if (element.type === 'checkbox' && element.checked) {
                if (!filters[filterKey]) filters[filterKey] = [];
                filters[filterKey].push(value);
            } else if (element.type !== 'checkbox' && value) {
                filters[filterKey] = value;
            }
        });
        
        return filters;
    }

    updateFilterCount() {
        const filterCount = Object.keys(this.activeFilters).length;
        const countElement = this.container.querySelector('.filter-count');
        
        if (filterCount > 0) {
            countElement.textContent = filterCount;
            countElement.classList.remove('d-none');
        } else {
            countElement.classList.add('d-none');
        }
    }

    applyFilters() {
        this.updateActiveFilters();
        if (this.currentQuery.length >= this.options.minLength) {
            this.performSearch(this.currentQuery);
        }
        this.toggleFilters();
    }

    clearFilters() {
        const filterElements = this.container.querySelectorAll('[data-filter]');
        filterElements.forEach(element => {
            if (element.type === 'checkbox') {
                element.checked = false;
            } else {
                element.value = '';
            }
        });
        
        this.activeFilters = {};
        this.updateFilterCount();
        
        if (this.currentQuery.length >= this.options.minLength) {
            this.performSearch(this.currentQuery);
        }
    }

    handleResultClick(resultItem) {
        const contentId = resultItem.dataset.contentId;
        
        // Hide results
        this.hideResults();
        
        // Show content modal
        const modal = new ContentModal();
        modal.show(contentId);
        
        // Track result click
        EventEmitter.emit('analytics', {
            event: 'search_result_click',
            category: 'search',
            data: { contentId, query: this.currentQuery }
        });
    }

    handleHistoryClick(historyItem) {
        const query = historyItem.dataset.query;
        this.searchInput.value = query;
        this.currentQuery = query;
        this.performSearch(query);
        this.hideSearchHistory();
    }

    navigateResults(direction) {
        const results = this.container.querySelectorAll('.search-result-item');
        if (results.length === 0) return;
        
        const current = this.container.querySelector('.search-result-item.highlighted');
        let nextIndex = 0;
        
        if (current) {
            const currentIndex = Array.from(results).indexOf(current);
            nextIndex = direction === 'down' 
                ? Math.min(currentIndex + 1, results.length - 1)
                : Math.max(currentIndex - 1, 0);
            current.classList.remove('highlighted');
        }
        
        results[nextIndex].classList.add('highlighted');
        results[nextIndex].scrollIntoView({ block: 'nearest' });
    }

    async loadMoreResults() {
        // Implementation for loading more results
        showToast('Load more functionality coming soon!', 'info');
    }

    // Public methods
    focus() {
        this.searchInput.focus();
    }

    setValue(value) {
        this.searchInput.value = value;
        this.currentQuery = value;
        if (value.length >= this.options.minLength) {
            this.performSearch(value);
        }
    }

    getValue() {
        return this.currentQuery;
    }

    destroy() {
        // Clean up event listeners and DOM
        this.container.innerHTML = '';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchBarComponent;
} else if (typeof window !== 'undefined') {
    window.SearchBarComponent = SearchBarComponent;
}