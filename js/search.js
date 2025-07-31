// Enhanced Search functionality
class EnhancedSearchManager {
    constructor() {
        this.currentQuery = '';
        this.currentFilters = {
            type: 'all',
            genre: '',
            language: '',
            year: ''
        };
        this.currentPage = 1;
        this.searchTimeout = null;
        this.recentSearches = [];
        this.searchSuggestions = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPopularContent();
        this.loadTrendingSearches();
        this.loadRecentSearches();
        this.setupRealTimeSearch();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('main-search');
        const filterBtns = document.querySelectorAll('.filter-btn');
        const advancedToggle = document.getElementById('advanced-filters-toggle');
        const sortSelect = document.getElementById('sort-by');
        const loadMoreBtn = document.getElementById('load-more-btn');

        // Main search input
        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        searchInput.addEventListener('focus', () => {
            this.showSearchSuggestions();
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(e.target.value);
            }
        });

        // Filter buttons
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.currentFilters.type = e.target.dataset.type;
                if (this.currentQuery) {
                    this.performSearch(this.currentQuery);
                }
            });
        });

        // Advanced filters toggle
        advancedToggle.addEventListener('click', () => {
            this.toggleAdvancedFilters();
        });

        // Sort change
        sortSelect.addEventListener('change', (e) => {
            if (this.currentQuery) {
                this.sortResults(e.target.value);
            }
        });

        // Load more
        loadMoreBtn.addEventListener('click', () => {
            this.loadMoreResults();
        });

        // Clear search on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSearch();
            }
        });
    }

    handleSearchInput(query) {
        clearTimeout(this.searchTimeout);

        if (query.length === 0) {
            this.showPopularContent();
            this.hideSearchSuggestions();
            return;
        }

        if (query.length >= 2) {
            // Show live suggestions after 300ms delay
            this.searchTimeout = setTimeout(() => {
                this.showLiveSuggestions(query);
            }, 300);
        }

        if (query.length >= 3) {
            // Perform search after 500ms delay
            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 500);
        }
    }

    async showLiveSuggestions(query) {
        try {
            const response = await ApiService.searchContent(query, 'multi', 1);
            const suggestions = response.results.slice(0, 5);

            const suggestionsContainer = document.getElementById('search-suggestions');
            const trendingContainer = document.getElementById('trending-searches');

            if (suggestions.length > 0) {
                trendingContainer.innerHTML = suggestions.map(item => `
                    <button class="suggestion-tag" onclick="EnhancedSearchManager.selectSuggestion('${item.title}')">
                        ${item.title}
                    </button>
                `).join('');

                this.showSearchSuggestions();
            }
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        }
    }

    showSearchSuggestions() {
        const suggestionsContainer = document.getElementById('search-suggestions');
        suggestionsContainer.classList.remove('hidden');
    }

    hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('search-suggestions');
        suggestionsContainer.classList.add('hidden');
    }

    static selectSuggestion(title) {
        const searchInput = document.getElementById('main-search');
        searchInput.value = title;
        searchManager.performSearch(title);
        searchManager.hideSearchSuggestions();
    }

    async performSearch(query) {
        this.currentQuery = query;
        this.currentPage = 1;

        if (!query.trim()) {
            this.showPopularContent();
            return;
        }

        this.addToRecentSearches(query);
        this.showSearchResults();

        const resultsGrid = document.getElementById('results-grid');
        UIComponents.showLoading(resultsGrid.parentElement);

        try {
            const response = await ApiService.searchContent(
                query,
                this.currentFilters.type,
                this.currentPage
            );

            if (response.results.length > 0) {
                this.renderSearchResults(response.results, response.total_results);
            } else {
                this.showNoResults();
            }
        } catch (error) {
            this.showSearchError();
        }
    }

    renderSearchResults(results, totalResults) {
        const resultsGrid = document.getElementById('results-grid');
        const resultsTitle = document.getElementById('results-title');
        const resultsCount = document.getElementById('results-count');
        const loadMoreBtn = document.getElementById('load-more-btn');

        resultsTitle.textContent = `Search Results for "${this.currentQuery}"`;
        resultsCount.textContent = `${totalResults.toLocaleString()} results found`;

        resultsGrid.innerHTML = results.map(item =>
            UIComponents.createContentCard(item).outerHTML
        ).join('');

        // Show load more if there are more results
        loadMoreBtn.style.display = results.length >= 20 ? 'block' : 'none';
    }

    async loadMoreResults() {
        this.currentPage++;
        const loadMoreBtn = document.getElementById('load-more-btn');

        loadMoreBtn.textContent = 'Loading...';
        loadMoreBtn.disabled = true;

        try {
            const response = await ApiService.searchContent(
                this.currentQuery,
                this.currentFilters.type,
                this.currentPage
            );

            const resultsGrid = document.getElementById('results-grid');
            response.results.forEach(item => {
                const cardElement = UIComponents.createContentCard(item);
                resultsGrid.appendChild(cardElement);
            });

            if (response.results.length < 20) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.textContent = 'Load More Results';
                loadMoreBtn.disabled = false;
            }
        } catch (error) {
            UIComponents.showToast('Failed to load more results', 'error');
            loadMoreBtn.textContent = 'Load More Results';
            loadMoreBtn.disabled = false;
        }
    }

    showSearchResults() {
        document.getElementById('popular-content').classList.add('hidden');
        document.getElementById('search-results').classList.remove('hidden');
        document.getElementById('no-results').classList.add('hidden');
    }

    showPopularContent() {
        document.getElementById('popular-content').classList.remove('hidden');
        document.getElementById('search-results').classList.add('hidden');
        document.getElementById('no-results').classList.add('hidden');
    }

    showNoResults() {
        document.getElementById('popular-content').classList.add('hidden');
        document.getElementById('search-results').classList.add('hidden');
        document.getElementById('no-results').classList.remove('hidden');
    }

    showSearchError() {
        const resultsGrid = document.getElementById('results-grid');
        resultsGrid.parentElement.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">⚠️</div>
                <h3 class="text-xl font-semibold mb-2">Search failed</h3>
                <p class="text-secondary mb-4">Please try again</p>
                <button onclick="searchManager.performSearch('${this.currentQuery}')" class="btn btn-primary">
                    Retry Search
                </button>
            </div>
        `;
    }

    setActiveFilter(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn =>
            btn.classList.remove('active')
        );
        activeBtn.classList.add('active');
    }

    toggleAdvancedFilters() {
        const filtersContainer = document.getElementById('advanced-filters');
        const toggle = document.getElementById('advanced-filters-toggle');

        filtersContainer.classList.toggle('hidden');
        toggle.textContent = filtersContainer.classList.contains('hidden')
            ? 'Advanced Filters ▼'
            : 'Advanced Filters ▲';
    }

    applyFilters() {
        this.currentFilters.genre = document.getElementById('genre-filter').value;
        this.currentFilters.language = document.getElementById('language-filter').value;
        this.currentFilters.year = document.getElementById('year-filter').value;

        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        }

        UIComponents.showToast('Filters applied', 'success');
    }

    clearFilters() {
        document.getElementById('genre-filter').value = '';
        document.getElementById('language-filter').value = '';
        document.getElementById('year-filter').value = '';

        this.currentFilters = {
            type: this.currentFilters.type,
            genre: '',
            language: '',
            year: ''
        };

        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        }

        UIComponents.showToast('Filters cleared', 'success');
    }

    clearSearch() {
        document.getElementById('main-search').value = '';
        this.currentQuery = '';
        this.showPopularContent();
        this.hideSearchSuggestions();
    }

    sortResults(sortBy) {
        const resultsGrid = document.getElementById('results-grid');
        const cards = Array.from(resultsGrid.children);

        cards.sort((a, b) => {
            const aData = this.extractCardData(a);
            const bData = this.extractCardData(b);

            switch (sortBy) {
                case 'rating':
                    return bData.rating - aData.rating;
                case 'year':
                    return bData.year - aData.year;
                case 'title':
                    return aData.title.localeCompare(bData.title);
                default:
                    return 0; // Keep original order for relevance
            }
        });

        resultsGrid.innerHTML = '';
        cards.forEach(card => resultsGrid.appendChild(card));
    }

    extractCardData(cardElement) {
        const titleElement = cardElement.querySelector('.content-card-title');
        const ratingElement = cardElement.querySelector('.content-card-rating');

        return {
            title: titleElement ? titleElement.textContent : '',
            rating: ratingElement ? parseFloat(ratingElement.textContent) : 0,
            year: 2024 // Would extract from actual data
        };
    }

    addToRecentSearches(query) {
        if (!this.recentSearches.includes(query)) {
            this.recentSearches.unshift(query);
            this.recentSearches = this.recentSearches.slice(0, 10); // Keep only 10 recent
            this.updateRecentSearchesDisplay();
        }
    }

    updateRecentSearchesDisplay() {
        const container = document.getElementById('recent-searches-list');
        container.innerHTML = this.recentSearches.map(search => `
            <button class="recent-search-tag" onclick="searchManager.performSearch('${search}')">
                ${search}
            </button>
        `).join('');
    }

    async loadPopularContent() {
        try {
            const response = await ApiService.getTrending('all', 12);
            const popularGrid = document.getElementById('popular-grid');

            popularGrid.innerHTML = response.recommendations.map(item =>
                UIComponents.createContentCard(item).outerHTML
            ).join('');
        } catch (error) {
            console.error('Failed to load popular content:', error);
        }
    }

    async loadTrendingSearches() {
        // Simulate trending searches
        const trending = [
            'Avengers', 'Breaking Bad', 'Naruto', 'The Office', 'Spider-Man',
            'Game of Thrones', 'One Piece', 'Marvel', 'Disney', 'Horror Movies'
        ];

        const container = document.getElementById('trending-searches');
        container.innerHTML = trending.map(search => `
            <button class="suggestion-tag" onclick="searchManager.performSearch('${search}')">
                ${search}
            </button>
        `).join('');
    }

    loadRecentSearches() {
        this.updateRecentSearchesDisplay();
    }

    setupRealTimeSearch() {
        // Setup WebSocket or Server-Sent Events for real-time search suggestions
        // This is a placeholder for real-time functionality
        console.log('Real-time search initialized');
    }
}

// CSS for new components
const searchStyles = `
<style>
.filter-btn {
    padding: 0.5rem 1rem;
    background: var(--bg-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.filter-btn.active,
.filter-btn:hover {
    background: var(--primary-blue);
    color: white;
    border-color: var(--primary-blue);
}

.time-filter-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
}

.time-filter-btn.active,
.time-filter-btn:hover {
    background: var(--primary-blue);
    color: white;
}

.suggestion-tag,
.recent-search-tag {
    padding: 0.25rem 0.75rem;
    background: var(--bg-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.8rem;
}

.suggestion-tag:hover,
.recent-search-tag:hover {
    background: var(--primary-blue);
    color: white;
    border-color: var(--primary-blue);
}

.switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--bg-tertiary);
    transition: 0.3s;
    border-radius: 24px;
}

.slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
}

input:checked + .slider {
    background-color: var(--primary-blue);
}

input:checked + .slider:before {
    transform: translateX(20px);
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', searchStyles);

// Initialize enhanced search manager
let searchManager;
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/search') {
        searchManager = new EnhancedSearchManager();
        window.SearchManager = searchManager;
    }
});