class SearchPage {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.searchClear = document.getElementById('search-clear');
        this.resultsGrid = document.getElementById('results-grid');
        this.resultsList = document.getElementById('results-list');
        this.loadMoreBtn = document.getElementById('load-more-btn');
        
        this.currentQuery = '';
        this.currentFilters = {};
        this.currentPage = 1;
        this.totalPages = 1;
        this.viewMode = 'grid';
        this.isLoading = false;
        this.searchTimeout = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFilters();
        this.loadRecentSearches();
        this.loadSearchSuggestions();
        
        // Check for search query in URL
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            this.searchInput.value = query;
            this.performSearch(query);
        }
    }

    setupEventListeners() {
        // Search input
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(this.searchTimeout);
            
            if (query) {
                this.searchClear.style.display = 'block';
                
                // Auto-search with debounce
                this.searchTimeout = setTimeout(() => {
                    this.performSearch(query);
                }, 500);
            } else {
                this.searchClear.style.display = 'none';
                this.showRecentSearches();
            }
        });

        // Search button
        this.searchBtn.addEventListener('click', () => {
            const query = this.searchInput.value.trim();
            if (query) {
                this.performSearch(query);
            }
        });

        // Clear search
        this.searchClear.addEventListener('click', () => {
            this.searchInput.value = '';
            this.searchClear.style.display = 'none';
            this.showRecentSearches();
            this.searchInput.focus();
        });

        // Enter key
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = this.searchInput.value.trim();
                if (query) {
                    this.performSearch(query);
                }
            }
        });

        // View toggle
        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-btn');
            if (viewBtn) {
                const view = viewBtn.dataset.view;
                this.setViewMode(view);
            }
        });

        // Filter changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('filter-select')) {
                this.updateFilters();
                if (this.currentQuery) {
                    this.performSearch(this.currentQuery, 1);
                }
            }
        });

        // Clear filters
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Load more
        this.loadMoreBtn?.addEventListener('click', () => {
            this.loadMoreResults();
        });

        // Recent search clicks
        document.addEventListener('click', (e) => {
            const recentTag = e.target.closest('.recent-tag');
            if (recentTag) {
                const query = recentTag.textContent;
                this.searchInput.value = query;
                this.performSearch(query);
            }
        });

        // Suggestion clicks
        document.addEventListener('click', (e) => {
            const suggestionTag = e.target.closest('.suggestion-tag');
            if (suggestionTag) {
                const query = suggestionTag.textContent;
                this.searchInput.value = query;
                this.performSearch(query);
            }
        });

        // Clear recent searches
        document.getElementById('clear-recent')?.addEventListener('click', () => {
            StorageManager.clearRecentSearches();
            this.loadRecentSearches();
        });
    }

    setupFilters() {
        this.populateGenreFilter();
        this.populateYearFilter();
    }

    populateGenreFilter() {
        const genreFilter = document.getElementById('genre-filter');
        if (!genreFilter) return;

        Object.entries(GENRE_MAP).forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            genreFilter.appendChild(option);
        });
    }

    populateYearFilter() {
        const yearFilter = document.getElementById('year-filter');
        if (!yearFilter) return;

        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 1950; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        }
    }

    async performSearch(query, page = 1) {
        if (this.isLoading) return;

        this.currentQuery = query;
        this.currentPage = page;

        // Hide other sections
        this.hideAllSections();
        this.showLoading();

        // Add to recent searches
        StorageManager.addRecentSearch(query);

        try {
            const params = {
                q: query,
                type: this.currentFilters.type || 'all',
                page: page
            };

            // Add filters
            if (this.currentFilters.genre !== 'all') {
                params.genre = this.currentFilters.genre;
            }
            if (this.currentFilters.year !== 'all') {
                params.year = this.currentFilters.year;
            }
            if (this.currentFilters.language !== 'all') {
                params.language = this.currentFilters.language;
            }

            const response = await api.searchContent(query, params.type);
            
            // Combine and filter results
            let results = [
                ...(response.database_results || []),
                ...(response.tmdb_results || [])
            ];

            // Remove duplicates
            results = this.removeDuplicates(results);

            // Apply client-side filters
            results = this.applyFilters(results);

            this.displayResults(results, page === 1);
            
            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('q', query);
            window.history.replaceState({}, '', url);

        } catch (error) {
            console.error('Search error:', error);
            notification.show('error', 'Search Error', 'Failed to perform search. Please try again.');
            this.showNoResults();
        } finally {
            this.hideLoading();
        }
    }

    removeDuplicates(results) {
        const seen = new Set();
        return results.filter(item => {
            const key = `${item.title || item.name}-${item.release_date || item.first_air_date}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    applyFilters(results) {
        let filtered = [...results];

        // Genre filter
        if (this.currentFilters.genre && this.currentFilters.genre !== 'all') {
            const genreId = parseInt(this.currentFilters.genre);
            filtered = filtered.filter(item => {
                return item.genre_ids?.includes(genreId) || 
                       item.genres?.includes(genreId);
            });
        }

        // Year filter
        if (this.currentFilters.year && this.currentFilters.year !== 'all') {
            const year = parseInt(this.currentFilters.year);
            filtered = filtered.filter(item => {
                const date = item.release_date || item.first_air_date;
                return date && new Date(date).getFullYear() === year;
            });
        }

        // Language filter
        if (this.currentFilters.language && this.currentFilters.language !== 'all') {
            filtered = filtered.filter(item => {
                return item.original_language === this.currentFilters.language;
            });
        }

        return filtered;
    }

    displayResults(results, clearPrevious = true) {
        if (clearPrevious) {
            this.resultsGrid.innerHTML = '';
            this.resultsList.innerHTML = '';
        }

        if (results.length === 0) {
            this.showNoResults();
            return;
        }

        // Update results header
        this.updateResultsHeader(results.length);

        // Display based on view mode
        if (this.viewMode === 'grid') {
            this.displayGridResults(results);
        } else {
            this.displayListResults(results);
        }

        this.showResults();
    }

    displayGridResults(results) {
        const fragment = document.createDocumentFragment();

        results.forEach(item => {
            const card = createMovieCard(item, {
                size: 'medium',
                onClick: (data) => {
                    window.app.navigateTo(`movie-detail?id=${data.id}`);
                }
            });
            fragment.appendChild(card.getElement());
        });

        this.resultsGrid.appendChild(fragment);
    }

    displayListResults(results) {
        const fragment = document.createDocumentFragment();

        results.forEach(item => {
            const listItem = this.createListItem(item);
            fragment.appendChild(listItem);
        });

        this.resultsList.appendChild(fragment);
    }

    createListItem(item) {
        const div = document.createElement('div');
        div.className = 'result-item-list';
        div.dataset.id = item.id;

        const posterUrl = item.poster_path 
            ? `${IMAGE_CONFIG.TMDB_BASE_URL}w92${item.poster_path}`
            : IMAGE_CONFIG.DEFAULT_POSTER;

        const title = item.title || item.name;
        const year = item.release_date || item.first_air_date 
            ? new Date(item.release_date || item.first_air_date).getFullYear()
            : '';
        const rating = item.vote_average 
            ? Math.round(item.vote_average * 10) / 10
            : '';
        const overview = item.overview || 'No overview available.';

        div.innerHTML = `
            <img src="${posterUrl}" alt="${title}" class="result-poster-list">
            <div class="result-info-list">
                <h3 class="result-title-list">${title}</h3>
                <div class="result-meta-list">
                    ${year ? `<span>${year}</span>` : ''}
                    ${rating ? `<span>⭐ ${rating}</span>` : ''}
                    <span>${item.media_type || 'Movie'}</span>
                </div>
                <p class="result-overview-list">${overview}</p>
            </div>
        `;

        div.addEventListener('click', () => {
            window.app.navigateTo(`movie-detail?id=${item.id}`);
        });

        return div;
    }

    updateResultsHeader(count) {
        const resultsTitle = document.getElementById('results-title');
        const resultsCount = document.getElementById('results-count');

        if (resultsTitle) {
            resultsTitle.textContent = `Search Results for "${this.currentQuery}"`;
        }

        if (resultsCount) {
            resultsCount.textContent = `${count} result${count !== 1 ? 's' : ''}`;
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;

        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });

        // Show/hide containers
        this.resultsGrid.style.display = mode === 'grid' ? 'grid' : 'none';
        this.resultsList.style.display = mode === 'list' ? 'block' : 'none';
    }

    updateFilters() {
        this.currentFilters = {
            type: document.getElementById('content-type-filter')?.value || 'all',
            genre: document.getElementById('genre-filter')?.value || 'all',
            year: document.getElementById('year-filter')?.value || 'all',
            language: document.getElementById('language-filter')?.value || 'all'
        };
    }

    clearFilters() {
        document.querySelectorAll('.filter-select').forEach(select => {
            select.value = 'all';
        });
        
        this.currentFilters = {};
        
        if (this.currentQuery) {
            this.performSearch(this.currentQuery, 1);
        }
    }

    loadRecentSearches() {
        const recentList = document.getElementById('recent-list');
        const recentSection = document.getElementById('recent-searches');
        
        if (!recentList || !recentSection) return;

        const recentSearches = StorageManager.getRecentSearches();
        
        if (recentSearches.length === 0) {
            recentSection.style.display = 'none';
            return;
        }

        recentSection.style.display = 'block';
        recentList.innerHTML = '';

        recentSearches.forEach(search => {
            const tag = document.createElement('span');
            tag.className = 'recent-tag';
            tag.textContent = search.query;
            recentList.appendChild(tag);
        });
    }

    loadSearchSuggestions() {
        const suggestions = [
            'Action Movies', 'Comedy Shows', 'Horror Films', 'Documentaries',
            'Marvel Movies', 'Netflix Originals', 'Anime Series', 'Classic Films',
            'Bollywood Movies', 'Korean Drama', 'Sci-Fi Thriller', 'Romance Comedy'
        ];

        const suggestionsList = document.getElementById('suggestions-list');
        if (!suggestionsList) return;

        suggestionsList.innerHTML = '';

        suggestions.forEach(suggestion => {
            const tag = document.createElement('span');
            tag.className = 'suggestion-tag';
            tag.textContent = suggestion;
            suggestionsList.appendChild(tag);
        });
    }

    async loadMoreResults() {
        if (this.isLoading || this.currentPage >= this.totalPages) return;

        try {
            await this.performSearch(this.currentQuery, this.currentPage + 1);
        } catch (error) {
            notification.show('error', 'Error', 'Failed to load more results.');
        }
    }

    showResults() {
        document.getElementById('search-results').style.display = 'block';
        document.getElementById('recent-searches').style.display = 'none';
        document.getElementById('search-suggestions').style.display = 'none';
        document.getElementById('no-results').style.display = 'none';
    }

    showRecentSearches() {
        document.getElementById('search-results').style.display = 'none';
        document.getElementById('recent-searches').style.display = 'block';
        document.getElementById('search-suggestions').style.display = 'block';
        document.getElementById('no-results').style.display = 'none';
    }

    showNoResults() {
        document.getElementById('search-results').style.display = 'none';
        document.getElementById('recent-searches').style.display = 'none';
        document.getElementById('search-suggestions').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
    }

    showLoading() {
        document.getElementById('search-loading').style.display = 'block';
        this.isLoading = true;
    }

    hideLoading() {
        document.getElementById('search-loading').style.display = 'none';
        this.isLoading = false;
    }

    hideAllSections() {
        document.getElementById('search-results').style.display = 'none';
        document.getElementById('recent-searches').style.display = 'none';
        document.getElementById('search-suggestions').style.display = 'none';
        document.getElementById('no-results').style.display = 'none';
    }
}

window.SearchPage = SearchPage;