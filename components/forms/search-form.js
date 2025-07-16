// Search Form Component
class SearchForm {
    constructor(options = {}) {
        this.options = {
            placeholder: 'Search movies, TV shows, anime...',
            showFilters: true,
            onSearch: null,
            ...options
        };
        this.filters = {
            type: 'all',
            genre: '',
            year: '',
            sort: 'relevance'
        };
    }

    render() {
        return `
            <form onsubmit="SearchFormInstance.handleSubmit(event)" class="search-form">
                <!-- Search Input -->
                <div class="relative mb-4">
                    <input 
                        type="text" 
                        id="search-query"
                        placeholder="${this.options.placeholder}"
                        class="w-full bg-secondary-bg border border-border-color rounded-lg pl-12 pr-4 py-3 text-lg focus:outline-none focus:border-netflix-red"
                        value="${new URLSearchParams(window.location.search).get('q') || ''}"
                    >
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"></i>
                </div>
                
                ${this.options.showFilters ? this.renderFilters() : ''}
                
                <button type="submit" class="w-full md:w-auto bg-netflix-red hover:bg-hover-red px-8 py-3 rounded font-medium transition">
                    Search
                </button>
            </form>
        `;
    }

    renderFilters() {
        return `
            <div class="filters grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <!-- Type Filter -->
                <select id="filter-type" class="bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                    <option value="all">All Types</option>
                    <option value="movie">Movies</option>
                    <option value="tv">TV Shows</option>
                    <option value="anime">Anime</option>
                </select>
                
                <!-- Genre Filter -->
                <select id="filter-genre" class="bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                    <option value="">All Genres</option>
                    ${Object.entries(GENRE_MAP).map(([id, name]) => 
                        `<option value="${id}">${name}</option>`
                    ).join('')}
                </select>
                
                <!-- Year Filter -->
                <select id="filter-year" class="bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                    <option value="">All Years</option>
                    ${this.generateYearOptions()}
                </select>
                
                <!-- Sort Filter -->
                <select id="filter-sort" class="bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                    <option value="relevance">Relevance</option>
                    <option value="popularity">Popularity</option>
                    <option value="rating">Rating</option>
                    <option value="release_date">Release Date</option>
                </select>
            </div>
        `;
    }

    generateYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = [];
        
        for (let year = currentYear; year >= 1900; year--) {
            years.push(`<option value="${year}">${year}</option>`);
        }
        
        return years.join('');
    }

    handleSubmit(event) {
        event.preventDefault();
        
        const query = document.getElementById('search-query').value.trim();
        if (!query) return;
        
        const params = new URLSearchParams({
            q: query,
            type: document.getElementById('filter-type')?.value || 'all',
            genre: document.getElementById('filter-genre')?.value || '',
            year: document.getElementById('filter-year')?.value || '',
            sort: document.getElementById('filter-sort')?.value || 'relevance'
        });
        
        // Remove empty params
        Array.from(params.keys()).forEach(key => {
            if (!params.get(key)) params.delete(key);
        });
        
        window.location.href = `/search?${params.toString()}`;
    }
}

const SearchFormInstance = new SearchForm();