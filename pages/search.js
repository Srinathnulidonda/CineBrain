// Search Results Page
class SearchPage {
    constructor() {
        this.searchParams = new URLSearchParams(window.location.search);
        this.query = this.searchParams.get('q') || '';
        this.results = {
            database: [],
            tmdb: []
        };
        this.isLoading = true;
        this.currentTab = 'all';
    }

    async init() {
        if (!this.query) {
            this.renderEmptyState();
            return;
        }

        try {
            Loading.show();
            await this.searchContent();
            this.render();
        } catch (error) {
            console.error('Search failed:', error);
            new Toast('Search failed', 'error').show();
        } finally {
            Loading.hide();
        }
    }

    async searchContent() {
        const type = this.searchParams.get('type') || 'movie';
        const response = await API.searchContent(this.query, type);
        
        this.results = {
            database: response.database_results || [],
            tmdb: response.tmdb_results || []
        };
    }

    render() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="search-page">
                <!-- Search Header -->
                <div class="bg-secondary-bg">
                    <div class="container mx-auto px-4 py-8">
                        ${new SearchForm({ showFilters: true }).render()}
                    </div>
                </div>

                <!-- Results -->
                <div class="container mx-auto px-4 py-8">
                    ${this.query ? `
                        <h1 class="text-2xl font-bold mb-6">
                            Search results for "${this.query}"
                        </h1>

                        <!-- Tabs -->
                        <div class="flex space-x-6 mb-8 border-b border-border-color">
                            <button onclick="SearchPageInstance.setTab('all')" 
                                    class="pb-4 border-b-2 ${this.currentTab === 'all' ? 'border-netflix-red text-netflix-red' : 'border-transparent'} transition">
                                All Results (${this.getTotalResults()})
                            </button>
                            <button onclick="SearchPageInstance.setTab('database')" 
                                    class="pb-4 border-b-2 ${this.currentTab === 'database' ? 'border-netflix-red text-netflix-red' : 'border-transparent'} transition">
                                In Library (${this.results.database.length})
                            </button>
                            <button onclick="SearchPageInstance.setTab('tmdb')" 
                                    class="pb-4 border-b-2 ${this.currentTab === 'tmdb' ? 'border-netflix-red text-netflix-red' : 'border-transparent'} transition">
                                More Results (${this.results.tmdb.length})
                            </button>
                        </div>

                        <!-- Results Grid -->
                        ${this.renderResults()}
                    ` : this.renderEmptyState()}
                </div>
            </div>
        `;
    }

    renderResults() {
        let items = [];
        
        switch (this.currentTab) {
            case 'all':
                items = [...this.results.database, ...this.results.tmdb];
                break;
            case 'database':
                items = this.results.database;
                break;
            case 'tmdb':
                items = this.results.tmdb;
                break;
        }

        if (items.length === 0) {
            return this.renderNoResults();
        }

        return new ContentGrid(items, {
            columns: { mobile: 2, tablet: 4, desktop: 6 },
            cardSize: 'small'
        }).render();
    }

    renderEmptyState() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="container mx-auto px-4 py-16">
                <div class="max-w-2xl mx-auto text-center">
                    <i class="fas fa-search text-6xl text-text-muted mb-6"></i>
                    <h1 class="text-3xl font-bold mb-4">Search for Movies, TV Shows & More</h1>
                    <p class="text-text-secondary mb-8">
                        Discover your next favorite content from our vast collection
                    </p>
                    ${new SearchForm({ showFilters: false }).render()}
                </div>
            </div>
        `;
    }

    renderNoResults() {
        return `
            <div class="text-center py-16">
                <i class="fas fa-search-minus text-6xl text-text-muted mb-4"></i>
                <p class="text-xl mb-2">No results found for "${this.query}"</p>
                <p class="text-text-secondary mb-6">Try searching with different keywords</p>
                <a href="/" class="bg-netflix-red hover:bg-hover-red px-6 py-3 rounded font-medium transition">
                    Browse Popular Content
                </a>
            </div>
        `;
    }

    getTotalResults() {
        return this.results.database.length + this.results.tmdb.length;
    }

    setTab(tab) {
        this.currentTab = tab;
        this.render();
    }
}

const SearchPageInstance = new SearchPage();