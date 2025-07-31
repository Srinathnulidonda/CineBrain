// Movies page functionality
class MoviesPage {
    constructor() {
        this.currentGenre = 'all';
        this.currentFilters = {
            year: '',
            rating: '',
            language: '',
            sortBy: 'popularity'
        };
        this.currentPage = 1;
        this.isLoading = false;
        this.movies = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFeaturedMovies();
        this.loadBoxOffice();
        this.loadMovies();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Genre pills
        document.querySelectorAll('.genre-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentGenre = e.target.dataset.genre;
                this.switchActiveGenre(e.target);
                this.resetAndLoad();
            });
        });

        // Filters
        document.getElementById('year-filter').addEventListener('change', (e) => {
            this.currentFilters.year = e.target.value;
        });

        document.getElementById('rating-filter').addEventListener('change', (e) => {
            this.currentFilters.rating = e.target.value;
        });

        document.getElementById('language-filter').addEventListener('change', (e) => {
            this.currentFilters.language = e.target.value;
        });

        document.getElementById('sort-filter').addEventListener('change', (e) => {
            this.currentFilters.sortBy = e.target.value;
            this.sortMovies();
        });

        // Clear filters
        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });

        // View mode toggles
        document.getElementById('view-grid').addEventListener('click', () => {
            this.setViewMode('grid');
        });

        document.getElementById('view-list').addEventListener('click', () => {
            this.setViewMode('list');
        });

        // Infinite scroll
        window.addEventListener('scroll', () => {
            if (this.shouldLoadMore()) {
                this.loadMoreMovies();
            }
        });
    }

    switchActiveGenre(activeBtn) {
        document.querySelectorAll('.genre-pill').forEach(btn =>
            btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    async loadFeaturedMovies() {
        try {
            const response = await ApiService.getTrending('movie', 8);
            UIComponents.createCarousel(
                'Featured Movies',
                response.recommendations.slice(0, 8),
                'featured-movies',
                true
            );
        } catch (error) {
            console.error('Failed to load featured movies:', error);
        }
    }

    async loadBoxOffice() {
        const container = document.getElementById('box-office-movies');

        try {
            // Simulate box office data with real-time updates
            const boxOfficeData = [
                {
                    rank: 1,
                    title: 'Top Grossing Movie',
                    collection: '$125M',
                    weekendCollection: '$45M',
                    trend: 'up',
                    weeksInTheater: 2
                },
                {
                    rank: 2,
                    title: 'Action Blockbuster',
                    collection: '$98M',
                    weekendCollection: '$32M',
                    trend: 'stable',
                    weeksInTheater: 3
                },
                {
                    rank: 3,
                    title: 'Family Entertainment',
                    collection: '$67M',
                    weekendCollection: '$25M',
                    trend: 'down',
                    weeksInTheater: 4
                }
            ];

            container.innerHTML = boxOfficeData.map(movie => `
                <div class="card p-6 border-l-4 border-warning">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-semibold text-lg">#${movie.rank} ${movie.title}</h4>
                            <p class="text-sm text-muted">Week ${movie.weeksInTheater} in theaters</p>
                        </div>
                        <span class="text-${movie.trend === 'up' ? 'success' : movie.trend === 'down' ? 'error' : 'warning'}">
                            ${movie.trend === 'up' ? '📈' : movie.trend === 'down' ? '📉' : '➡️'}
                        </span>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-sm text-muted">Total</span>
                            <span class="font-bold text-warning">${movie.collection}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-muted">Weekend</span>
                            <span class="font-semibold">${movie.weekendCollection}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load box office data:', error);
        }
    }

    async loadMovies() {
        const container = document.getElementById('movies-grid');
        UIComponents.showLoading(container);

        try {
            let response;

            if (this.currentGenre === 'all') {
                response = await ApiService.getTrending('movie', 24);
            } else {
                response = await ApiService.getGenreRecommendations(this.currentGenre, 'movie', 24);
            }

            this.movies = response.recommendations;
            this.renderMovies();
            this.updateStats();
        } catch (error) {
            UIComponents.showError(container, 'Failed to load movies');
        }
    }

    renderMovies() {
        const container = document.getElementById('movies-grid');
        const filteredMovies = this.applyFilters(this.movies);

        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                ${filteredMovies.map(movie => UIComponents.createContentCard(movie).outerHTML).join('')}
            </div>
        `;

        document.getElementById('results-count').textContent = `${filteredMovies.length} movies`;
    }

    applyFilters(movies) {
        return movies.filter(movie => {
            // Year filter
            if (this.currentFilters.year) {
                const movieYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
                if (this.currentFilters.year === '2020s' && (!movieYear || movieYear < 2020)) return false;
                if (this.currentFilters.year === '2010s' && (!movieYear || movieYear < 2010 || movieYear >= 2020)) return false;
                if (this.currentFilters.year === '2000s' && (!movieYear || movieYear < 2000 || movieYear >= 2010)) return false;
                if (this.currentFilters.year === '1990s' && (!movieYear || movieYear < 1990 || movieYear >= 2000)) return false;
                if (this.currentFilters.year.match(/^\d{4}$/) && movieYear !== parseInt(this.currentFilters.year)) return false;
            }

            // Rating filter
            if (this.currentFilters.rating && movie.rating < parseFloat(this.currentFilters.rating)) {
                return false;
            }

            // Language filter
            if (this.currentFilters.language) {
                const languages = movie.languages || [];
                if (!languages.includes(this.currentFilters.language)) return false;
            }

            return true;
        });
    }

    sortMovies() {
        const sortedMovies = [...this.movies];

        switch (this.currentFilters.sortBy) {
            case 'rating':
                sortedMovies.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'release_date':
                sortedMovies.sort((a, b) =>
                    new Date(b.release_date || 0) - new Date(a.release_date || 0));
                break;
            case 'title':
                sortedMovies.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'runtime':
                sortedMovies.sort((a, b) => (b.runtime || 0) - (a.runtime || 0));
                break;
            default: // popularity
                sortedMovies.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        }

        this.movies = sortedMovies;
        this.renderMovies();
    }

    clearFilters() {
        this.currentFilters = {
            year: '',
            rating: '',
            language: '',
            sortBy: 'popularity'
        };

        document.getElementById('year-filter').value = '';
        document.getElementById('rating-filter').value = '';
        document.getElementById('language-filter').value = '';
        document.getElementById('sort-filter').value = 'popularity';

        this.renderMovies();
    }

    resetAndLoad() {
        this.currentPage = 1;
        this.movies = [];
        this.loadMovies();
    }

    shouldLoadMore() {
        if (this.isLoading) return false;

        const scrollPosition = window.scrollY + window.innerHeight;
        const totalHeight = document.documentElement.scrollHeight;

        return scrollPosition >= totalHeight - 1000;
    }

    async loadMoreMovies() {
        if (this.isLoading) return;

        this.isLoading = true;
        const loader = document.getElementById('infinite-loader');
        loader.classList.remove('hidden');

        try {
            this.currentPage++;
            let response;

            if (this.currentGenre === 'all') {
                response = await ApiService.getTrending('movie', 24, this.currentPage);
            } else {
                response = await ApiService.getGenreRecommendations(
                    this.currentGenre, 'movie', 24, this.currentPage);
            }

            if (response.recommendations.length > 0) {
                this.movies = [...this.movies, ...response.recommendations];
                this.renderMovies();
            }
        } catch (error) {
            console.error('Failed to load more movies:', error);
        } finally {
            this.isLoading = false;
            loader.classList.add('hidden');
        }
    }

    setViewMode(mode) {
        // Update view mode buttons
        document.querySelectorAll('#view-grid, #view-list').forEach(btn =>
            btn.classList.remove('active'));
        document.getElementById(`view-${mode}`).classList.add('active');

        // Update grid layout
        const grid = document.querySelector('#movies-grid > div');
        if (grid) {
            if (mode === 'list') {
                grid.className = 'space-y-4';
                // Re-render as list view
                this.renderMoviesList();
            } else {
                grid.className = 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4';
                this.renderMovies();
            }
        }
    }

    renderMoviesList() {
        const container = document.getElementById('movies-grid');
        const filteredMovies = this.applyFilters(this.movies);

        container.innerHTML = `
            <div class="space-y-4">
                ${filteredMovies.map(movie => this.createMovieListItem(movie)).join('')}
            </div>
        `;
    }

    createMovieListItem(movie) {
        const posterUrl = movie.poster_path || '/assets/images/placeholder-poster.jpg';
        const rating = movie.rating ? movie.rating.toFixed(1) : 'N/A';
        const genres = movie.genres ? movie.genres.slice(0, 3).join(', ') : 'Unknown';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';

        return `
            <div class="card p-4 interactive" onclick="window.location.href='/details?id=${movie.id}'">
                <div class="flex gap-4">
                    <img src="${posterUrl}" alt="${movie.title}" class="w-20 h-30 object-cover rounded">
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-lg font-semibold">${movie.title}</h3>
                            <span class="badge badge-primary">⭐ ${rating}</span>
                        </div>
                        <div class="flex gap-4 mb-2 text-sm text-secondary">
                            <span>${year}</span>
                            <span>${movie.runtime ? movie.runtime + ' min' : 'N/A'}</span>
                            <span>${genres}</span>
                        </div>
                        <p class="text-secondary text-sm line-clamp-2">${movie.overview || 'No description available.'}</p>
                        <div class="flex gap-2 mt-3">
                            ${movie.youtube_trailer ?
                `<button onclick="event.stopPropagation(); VideoPlayer.playTrailer('${movie.youtube_trailer}')" class="btn btn-primary btn-sm">
                                    ▶️ Trailer
                                </button>` : ''
            }
                            <button onclick="event.stopPropagation(); ContentManager.addToWatchlist(${movie.id})" class="btn btn-secondary btn-sm">
                                📚 Watchlist
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateStats() {
        // Update real-time movie stats
        const totalMovies = (Math.random() * 1000 + 11500).toFixed(1) + 'K';
        const newToday = Math.floor(Math.random() * 20 + 10);

        document.getElementById('total-movies').textContent = totalMovies;
        document.getElementById('new-today').textContent = newToday;
    }

    startRealTimeUpdates() {
        // Update stats every minute
        setInterval(() => {
            this.updateStats();
        }, 60000);

        // Update box office every 5 minutes
        setInterval(() => {
            this.loadBoxOffice();
        }, 5 * 60 * 1000);

        // Subscribe to real-time updates
        if (window.realTimeManager) {
            window.realTimeManager.subscribe('content_update', (data) => {
                if (data.content_type === 'movie') {
                    this.handleRealTimeUpdate(data);
                }
            });
        }
    }

    handleRealTimeUpdate(data) {
        // Update movie if it's in the current list
        const movieIndex = this.movies.findIndex(m => m.id === data.content_id);
        if (movieIndex !== -1) {
            // Update movie data
            Object.assign(this.movies[movieIndex], data.updates);

            // Re-render the specific movie card
            const movieCard = document.querySelector(`[data-content-id="${data.content_id}"]`);
            if (movieCard) {
                const newCard = UIComponents.createContentCard(this.movies[movieIndex]);
                movieCard.replaceWith(newCard);

                // Add update animation
                newCard.classList.add('animate-pulse');
                setTimeout(() => newCard.classList.remove('animate-pulse'), 2000);
            }
        }
    }
}

// Initialize movies page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/categories/movies') {
        new MoviesPage();
    }
});
