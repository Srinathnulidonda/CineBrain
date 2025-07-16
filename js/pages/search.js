class SearchPageController {
    constructor() {
        this.currentQuery = '';
        this.currentFilters = {};
        this.currentPage = 1;
        this.totalResults = 0;
        this.isLoading = false;
        this.currentView = 'grid';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSearchHistory();
        this.loadPopularSearches();
        this.loadTrendingContent();
        this.checkURLParams();
    }

    setupEventListeners() {
        // Main search form
        const searchForm = document.getElementById('main-search-form');
        const searchInput = document.getElementById('main-search-input');

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                // Auto-complete suggestions
                this.showSearchSuggestions(e.target.value);
            });
        }

        // Filter changes
        const filters = ['type-filter', 'genre-filter', 'year-filter', 'rating-filter'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.updateFilters();
                    if (this.currentQuery) {
                        this.performSearch(true);
                    }
                });
            }
        });

        // View toggle
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreResults();
            });
        }

        // Clear history button
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.clearSearchHistory();
            });
        }
    }

    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        
        if (query) {
            document.getElementById('main-search-input').value = query;
            this.currentQuery = query;
            this.performSearch();
        }
    }

    async performSearch(isFilterUpdate = false) {
        const searchInput = document.getElementById('main-search-input');
        const query = searchInput.value.trim();

        if (!query) return;

        this.currentQuery = query;
        
        if (!isFilterUpdate) {
            this.currentPage = 1;
        }

        this.showLoadingState();

        try {
            const searchParams = {
                q: query,
                type: this.currentFilters.type || '',
                genre: this.currentFilters.genre || '',
                year: this.currentFilters.year || '',
                rating: this.currentFilters.rating || '',
                page: this.currentPage
            };

            const results = await window.apiService.searchContent(query, searchParams.type);
            
            this.displaySearchResults(results, isFilterUpdate);
            this.addToSearchHistory(query);
            this.updateURL(query);

        } catch (error) {
            console.error('Search failed:', error);
            this.showErrorState();
        } finally {
            this.hideLoadingState();
        }
    }

    displaySearchResults(results, isAppend = false) {
        const resultsSection = document.getElementById('search-results-section');
        const noResultsSection = document.getElementById('no-results-section');
        const resultsGrid = document.getElementById('results-grid');
        const resultsTitle = document.getElementById('results-title');
        const resultsMeta = document.getElementById('results-meta');

        const dbResults = results.database_results || [];
        const tmdbResults = results.tmdb_results || [];
        const allResults = [...dbResults, ...tmdbResults];

        if (allResults.length === 0) {
            resultsSection.style.display = 'none';
            noResultsSection.style.display = 'block';
            return;
        }

        resultsSection.style.display = 'block';
        noResultsSection.style.display = 'none';

        // Update results info
        resultsTitle.textContent = `Search Results for "${this.currentQuery}"`;
        resultsMeta.textContent = `Found ${allResults.length} results`;

        if (!isAppend) {
            resultsGrid.innerHTML = '';
        }

        // Display results based on current view
        allResults.forEach(item => {
            const resultElement = this.createResultElement(item);
            resultsGrid.appendChild(resultElement);
        });

        // Update load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = allResults.length >= 20 ? 'block' : 'none';
        }
    }

    createResultElement(item) {
        if (this.currentView === 'grid') {
            return new MovieCardComponent().createMovieCard(item);
        } else {
            return new MovieCardComponent().createHorizontalCard(item);
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Update results grid class
        const resultsGrid = document.getElementById('results-grid');
        resultsGrid.className = `results-${view}`;

        // Re-render current results
        if (this.currentQuery) {
            this.performSearch(true);
        }
    }

    updateFilters() {
        this.currentFilters = {
            type: document.getElementById('type-filter').value,
            genre: document.getElementById('genre-filter').value,
            year: document.getElementById('year-filter').value,
            rating: document.getElementById('rating-filter').value
        };
    }

    async loadMoreResults() {
        this.currentPage++;
        await this.performSearch(true);
    }

    showSearchSuggestions(query) {
        // Implementation for showing search suggestions
        // This could be enhanced with a proper autocomplete service
        if (query.length < 2) return;

        // Show cached suggestions or popular searches
        console.log('Showing suggestions for:', query);
    }

    loadSearchHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        const history = window.storageService?.getSearchHistory() || [];
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="text-netflix-gray">No recent searches</p>';
            return;
        }

        historyList.innerHTML = history.map(query => `
            <button class="history-item" data-query="${query}">
                <i class="fas fa-history"></i>
                <span>${query}</span>
                <i class="fas fa-arrow-up-right"></i>
            </button>
        `).join('');

        // Add click handlers
        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.dataset.query;
                document.getElementById('main-search-input').value = query;
                this.currentQuery = query;
                this.performSearch();
            });
        });
    }

    addToSearchHistory(query) {
        window.storageService?.addToSearchHistory(query);
        this.loadSearchHistory(); // Refresh the display
    }

    clearSearchHistory() {
        window.storageService?.clearSearchHistory();
        this.loadSearchHistory();
    }

    async loadPopularSearches() {
        const suggestionsGrid = document.getElementById('suggestions-grid');
        if (!suggestionsGrid) return;

        // Mock popular searches - in a real app, this would come from the API
        const popularSearches = [
            'Marvel Movies', 'Horror Movies 2024', 'Best TV Shows', 
            'Anime Series', 'Comedy Movies', 'Action Thrillers',
            'Romantic Movies', 'Sci-Fi Series', 'Documentary Films'
        ];

        suggestionsGrid.innerHTML = popularSearches.map(search => `
            <button class="suggestion-item" data-query="${search}">
                <i class="fas fa-fire"></i>
                <span>${search}</span>
            </button>
        `).join('');

        // Add click handlers
        suggestionsGrid.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.dataset.query;
                document.getElementById('main-search-input').value = query;
                this.currentQuery = query;
                this.performSearch();
            });
        });
    }

    async loadTrendingContent() {
        const trendingContent = document.getElementById('trending-content');
        if (!trendingContent) return;

        try {
            // This would typically load from the homepage API
            const data = await window.apiService.getHomepageData();
            const trending = data.whats_hot?.slice(0, 10) || [];

            const carousel = document.createElement('div');
            carousel.className = 'content-carousel';

            trending.forEach(item => {
                const card = new MovieCardComponent().createMovieCard(item, { size: 'small' });
                carousel.appendChild(card);
            });

            trendingContent.appendChild(carousel);

        } catch (error) {
            console.error('Failed to load trending content:', error);
            trendingContent.innerHTML = '<p class="text-netflix-gray">Unable to load trending content</p>';
        }
    }

    updateURL(query) {
        const url = new URL(window.location);
        url.searchParams.set('q', query);
        window.history.pushState({}, '', url);
    }

    showLoadingState() {
        this.isLoading = true;
        const resultsGrid = document.getElementById('results-grid');
        if (resultsGrid) {
            resultsGrid.innerHTML = this.createLoadingSkeleton();
        }
    }

    hideLoadingState() {
        this.isLoading = false;
    }

    showErrorState() {
        const resultsSection = document.getElementById('search-results-section');
        const noResultsSection = document.getElementById('no-results-section');
        
        resultsSection.style.display = 'none';
        noResultsSection.style.display = 'block';
        
        noResultsSection.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h2 class="empty-state-title">Search Error</h2>
                <p class="empty-state-description">
                    Something went wrong while searching. Please try again.
                </p>
                <button class="btn-primary" onclick="window.location.reload()">
                    <i class="fas fa-refresh"></i> Try Again
                </button>
            </div>
        `;
    }

    createLoadingSkeleton() {
        return Array(12).fill().map(() => `
            <div class="skeleton-card loading">
                <div class="skeleton-image"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-meta"></div>
            </div>
        `).join('');
    }
}

// Export for use in other modules
window.SearchPageController = SearchPageController;