// Advanced Search Functionality
class SearchManager {
    constructor() {
        this.searchTimeout = null;
        this.searchHistory = [];
        this.currentQuery = '';
        this.currentFilters = {};
        this.init();
    }

    init() {
        this.loadSearchHistory();
        this.setupGlobalSearch();
    }

    // Setup global search
    setupGlobalSearch() {
        const searchInputs = document.querySelectorAll('[data-search]');

        searchInputs.forEach(input => {
            // Add search icon if not present
            if (!input.parentElement.querySelector('.search-icon')) {
                const icon = document.createElement('i');
                icon.className = 'bi bi-search search-icon';
                input.parentElement.insertBefore(icon, input);
            }

            // Setup autocomplete
            this.setupAutocomplete(input);

            // Setup search events
            input.addEventListener('input', (e) => this.handleSearch(e));
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        });
    }

    // Setup autocomplete
    setupAutocomplete(input) {
        const autocompleteId = `autocomplete-${input.id || Date.now()}`;

        // Create autocomplete container
        const autocomplete = document.createElement('div');
        autocomplete.className = 'search-autocomplete';
        autocomplete.id = autocompleteId;
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(autocomplete);

        // Handle input
        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();

            if (query.length < 2) {
                autocomplete.style.display = 'none';
                return;
            }

            // Show suggestions
            const suggestions = await this.getSuggestions(query);
            this.renderSuggestions(autocomplete, suggestions, input);
        });

        // Handle clicks outside
        document.addEventListener('click', (e) => {
            if (!input.parentElement.contains(e.target)) {
                autocomplete.style.display = 'none';
            }
        });
    }

    // Get search suggestions
    async getSuggestions(query) {
        try {
            // Get from API
            const response = await api.search(query, 'multi', 1);
            const apiSuggestions = response.results.slice(0, 5).map(item => ({
                type: 'content',
                title: item.title,
                subtitle: item.content_type,
                data: item
            }));

            // Get from history
            const historySuggestions = this.searchHistory
                .filter(h => h.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 3)
                .map(h => ({
                    type: 'history',
                    title: h,
                    subtitle: 'Recent search'
                }));

            return [...historySuggestions, ...apiSuggestions];
        } catch (error) {
            console.error('Failed to get suggestions:', error);
            return [];
        }
    }

    // Render suggestions
    renderSuggestions(container, suggestions, input) {
        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = suggestions.map(suggestion => `
            <div class="search-suggestion" data-type="${suggestion.type}">
                <i class="bi bi-${suggestion.type === 'history' ? 'clock-history' : 'film'}"></i>
                <div class="search-suggestion__content">
                    <div class="search-suggestion__title">${suggestion.title}</div>
                    <div class="search-suggestion__subtitle">${suggestion.subtitle}</div>
                </div>
            </div>
        `).join('');

        container.style.display = 'block';

        // Handle suggestion clicks
        container.querySelectorAll('.search-suggestion').forEach((el, index) => {
            el.addEventListener('click', () => {
                const suggestion = suggestions[index];

                if (suggestion.type === 'content' && suggestion.data) {
                    navigateToContentDetails(suggestion.data.id);
                } else {
                    input.value = suggestion.title;
                    this.performSearch(suggestion.title);
                }

                container.style.display = 'none';
            });
        });
    }

    // Handle search input
    handleSearch(e) {
        clearTimeout(this.searchTimeout);
        const query = e.target.value.trim();

        if (query.length >= 2) {
            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, Config.DEBOUNCE_DELAY);
        }
    }

    // Perform search
    async performSearch(query) {
        if (!query) return;

        this.currentQuery = query;
        this.addToHistory(query);

        // Update URL if on search page
        if (window.location.pathname.includes('/search')) {
            router.updateParams({ query });
        } else {
            // Navigate to search page
            navigateToSearch(query);
        }
    }

    // Advanced search with filters
    async advancedSearch(query, filters = {}) {
        try {
            const {
                type = 'multi',
                genre = null,
                year = null,
                rating = null,
                language = null,
                sort = 'relevance',
                page = 1
            } = filters;

            // Build search parameters
            const params = { query, type, page };

            // Perform search
            const response = await api.search(query, type, page);

            // Apply client-side filters
            let results = response.results;

            if (genre) {
                results = results.filter(item =>
                    item.genres && item.genres.includes(genre)
                );
            }

            if (year) {
                results = results.filter(item => {
                    const itemYear = new Date(item.release_date).getFullYear();
                    return itemYear === parseInt(year);
                });
            }

            if (rating) {
                results = results.filter(item =>
                    item.rating && item.rating >= parseFloat(rating)
                );
            }

            if (language) {
                results = results.filter(item =>
                    item.languages && item.languages.includes(language)
                );
            }

            // Sort results
            results = this.sortResults(results, sort);

            return {
                results,
                total_results: results.length,
                query,
                filters
            };
        } catch (error) {
            console.error('Advanced search failed:', error);
            throw error;
        }
    }

    // Sort search results
    sortResults(results, sortBy) {
        switch (sortBy) {
            case 'popularity':
                return results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            case 'rating':
                return results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'release_date':
                return results.sort((a, b) => {
                    const dateA = new Date(a.release_date || 0);
                    const dateB = new Date(b.release_date || 0);
                    return dateB - dateA;
                });
            case 'title':
                return results.sort((a, b) => a.title.localeCompare(b.title));
            default:
                return results; // relevance (default API order)
        }
    }

    // Search history management
    loadSearchHistory() {
        this.searchHistory = Storage.getSearchHistory();
    }

    addToHistory(query) {
        Storage.addToSearchHistory(query);
        this.loadSearchHistory();
    }

    clearHistory() {
        Storage.clearSearchHistory();
        this.searchHistory = [];
    }

    // Voice search
    async startVoiceSearch(callback) {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toastManager.error('Voice search is not supported in your browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            toastManager.info('Listening... Speak now');
        };

        recognition.onresult = (event) => {
            const query = event.results[0][0].transcript;
            if (callback) {
                callback(query);
            } else {
                this.performSearch(query);
            }
        };

        recognition.onerror = (event) => {
            toastManager.error(`Voice search error: ${event.error}`);
        };

        recognition.start();
    }
}

// Create global instance
const searchManager = new SearchManager();

// Export for global use
window.searchManager = searchManager;