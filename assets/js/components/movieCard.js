class MovieCardComponent {
    constructor(movieData, options = {}) {
        this.data = movieData;
        this.options = {
            size: 'medium', // small, medium, large
            showActions: true,
            showInfo: true,
            onClick: null,
            ...options
        };
        
        this.element = null;
        this.isInWatchlist = false;
        this.isInFavorites = false;
        
        this.init();
    }

    init() {
        this.createElement();
        this.setupEventListeners();
        this.checkUserInteractions();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = `movie-card movie-card-${this.options.size}`;
        this.element.dataset.movieId = this.data.id;
        
        const posterUrl = this.getPosterUrl();
        const title = this.data.title || this.data.name || 'Unknown Title';
        const year = this.getYear();
        const rating = this.getRating();
        const genres = this.getGenres();
        
        this.element.innerHTML = `
            <div class="movie-card-inner">
                <div class="movie-poster-container">
                    <img 
                        src="${posterUrl}" 
                        alt="${title}" 
                        class="movie-poster"
                        loading="lazy"
                        onerror="this.src='${IMAGE_CONFIG.DEFAULT_POSTER}'"
                    >
                    <div class="movie-overlay">
                        <div class="movie-quick-actions">
                            <button class="quick-action-btn play-btn" title="Play Trailer">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                    ${this.options.showActions ? this.createActionsHTML() : ''}
                </div>
                
                ${this.options.showInfo ? `
                    <div class="movie-info">
                        <h3 class="movie-title">${title}</h3>
                        <div class="movie-meta">
                            ${year ? `<span class="movie-year">${year}</span>` : ''}
                            ${rating ? `
                                <div class="movie-rating">
                                    <i class="fas fa-star"></i>
                                    <span>${rating}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${genres ? `<div class="movie-genres">${genres}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    createActionsHTML() {
        return `
            <div class="movie-actions">
                <button class="action-btn watchlist-btn" title="Add to Watchlist" data-action="watchlist">
                    <i class="fas fa-bookmark"></i>
                </button>
                <button class="action-btn favorite-btn" title="Add to Favorites" data-action="favorite">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="action-btn info-btn" title="More Info" data-action="info">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        // Card click
        this.element.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn') || e.target.closest('.quick-action-btn')) {
                return; // Don't trigger card click for buttons
            }
            
            if (this.options.onClick) {
                this.options.onClick(this.data);
            } else {
                this.showDetails();
            }
        });

        // Action buttons
        this.element.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;
            
            e.stopPropagation();
            const action = actionBtn.dataset.action;
            
            switch (action) {
                case 'watchlist':
                    this.toggleWatchlist();
                    break;
                case 'favorite':
                    this.toggleFavorite();
                    break;
                case 'info':
                    this.showDetails();
                    break;
            }
        });

        // Play button
        const playBtn = this.element.querySelector('.play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playTrailer();
            });
        }

        // Hover effects
        this.element.addEventListener('mouseenter', () => {
            this.element.classList.add('hovered');
        });

        this.element.addEventListener('mouseleave', () => {
            this.element.classList.remove('hovered');
        });
    }

    async checkUserInteractions() {
        if (!window.app || !window.app.isAuthenticated()) return;
        
        try {
            // Check if in watchlist
            const watchlist = await this.getUserList('watchlist');
            this.isInWatchlist = watchlist.some(item => item.id === this.data.id);
            
            // Check if in favorites
            const favorites = await this.getUserList('favorites');
            this.isInFavorites = favorites.some(item => item.id === this.data.id);
            
            this.updateActionButtons();
        } catch (error) {
            console.error('Error checking user interactions:', error);
        }
    }

    async getUserList(type) {
        const cached = StorageManager.getCacheData(`user_${type}`);
        if (cached) return cached;
        
        try {
            const response = type === 'watchlist' 
                ? await api.getUserWatchlist()
                : await api.getUserFavorites();
            
            StorageManager.setCacheData(`user_${type}`, response, 5); // 5 minutes cache
            return response;
        } catch (error) {
            return [];
        }
    }

    updateActionButtons() {
        const watchlistBtn = this.element.querySelector('.watchlist-btn');
        const favoriteBtn = this.element.querySelector('.favorite-btn');
        
        if (watchlistBtn) {
            watchlistBtn.classList.toggle('active', this.isInWatchlist);
            watchlistBtn.title = this.isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
            
            const icon = watchlistBtn.querySelector('i');
            icon.className = this.isInWatchlist ? 'fas fa-bookmark' : 'far fa-bookmark';
        }
        
        if (favoriteBtn) {
            favoriteBtn.classList.toggle('active', this.isInFavorites);
            favoriteBtn.title = this.isInFavorites ? 'Remove from Favorites' : 'Add to Favorites';
            
            const icon = favoriteBtn.querySelector('i');
            icon.className = this.isInFavorites ? 'fas fa-heart' : 'far fa-heart';
        }
    }

    async toggleWatchlist() {
        if (!window.app || !window.app.isAuthenticated()) {
            notification.show('warning', 'Login Required', 'Please login to add items to your watchlist.');
            return;
        }

        try {
            await api.addToWatchlist(this.data.id);
            this.isInWatchlist = !this.isInWatchlist;
            this.updateActionButtons();
            
            // Clear cache
            StorageManager.remove('cache_user_watchlist');
            
            const message = this.isInWatchlist ? 'Added to watchlist!' : 'Removed from watchlist.';
            notification.show('success', 'Watchlist Updated', message);
        } catch (error) {
            notification.show('error', 'Error', 'Failed to update watchlist.');
        }
    }

    async toggleFavorite() {
        if (!window.app || !window.app.isAuthenticated()) {
            notification.show('warning', 'Login Required', 'Please login to add items to your favorites.');
            return;
        }

        try {
            await api.addToFavorites(this.data.id);
            this.isInFavorites = !this.isInFavorites;
            this.updateActionButtons();
            
            // Clear cache
            StorageManager.remove('cache_user_favorites');
            
            const message = this.isInFavorites ? 'Added to favorites!' : 'Removed from favorites.';
            notification.show('success', 'Favorites Updated', message);
        } catch (error) {
            notification.show('error', 'Error', 'Failed to update favorites.');
        }
    }

    showDetails() {
        const url = `#movie-detail?id=${this.data.id}`;
        window.history.pushState({ page: 'movie-detail', id: this.data.id }, '', url);
        window.app.navigateTo('movie-detail');
    }

    async playTrailer() {
        try {
            const details = await api.getContentDetails(this.data.id);
            const videos = details.youtube_videos?.trailers || details.tmdb_details?.videos?.results || [];
            
            if (videos.length > 0) {
                const trailer = videos[0];
                this.openVideoModal(trailer);
            } else {
                notification.show('info', 'No Trailer', 'No trailer available for this title.');
            }
        } catch (error) {
            notification.show('error', 'Error', 'Failed to load trailer.');
        }
    }

    openVideoModal(video) {
        const videoUrl = video.url || `https://www.youtube.com/embed/${video.video_id}`;
        
        modal.show({
            title: video.title || 'Trailer',
            content: `
                <div class="video-player">
                    <iframe 
                        src="${videoUrl}" 
                        frameborder="0" 
                        allowfullscreen
                        style="width: 100%; height: 400px;"
                    ></iframe>
                </div>
            `,
            size: 'lg',
            className: 'video-modal'
        });
    }

    getPosterUrl() {
        if (this.data.poster_path) {
            if (this.data.poster_path.startsWith('http')) {
                return this.data.poster_path;
            }
            return `${IMAGE_CONFIG.TMDB_BASE_URL}w500${this.data.poster_path}`;
        }
        
        return IMAGE_CONFIG.DEFAULT_POSTER;
    }

    getYear() {
        const date = this.data.release_date || this.data.first_air_date;
        if (date) {
            return new Date(date).getFullYear();
        }
        return null;
    }

    getRating() {
        const rating = this.data.rating || this.data.vote_average;
        if (rating) {
            return Math.round(rating * 10) / 10;
        }
        return null;
    }

    getGenres() {
        if (this.data.genre_names && this.data.genre_names.length > 0) {
            return this.data.genre_names.slice(0, 2).join(', ');
        }
        
        if (this.data.genres && this.data.genres.length > 0) {
            const genreNames = this.data.genres.map(id => GENRE_MAP[id] || id);
            return genreNames.slice(0, 2).join(', ');
        }
        
        return null;
    }

    update(newData) {
        this.data = { ...this.data, ...newData };
        this.createElement();
        this.setupEventListeners();
        this.checkUserInteractions();
    }

    getElement() {
        return this.element;
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Factory function for creating movie cards
function createMovieCard(movieData, options = {}) {
    return new MovieCardComponent(movieData, options);
}

// Utility function to create movie grid
function createMovieGrid(container, movies, options = {}) {
    const fragment = document.createDocumentFragment();
    
    movies.forEach(movie => {
        const card = createMovieCard(movie, options);
        fragment.appendChild(card.getElement());
    });
    
    container.appendChild(fragment);
}

window.MovieCardComponent = MovieCardComponent;
window.createMovieCard = createMovieCard;
window.createMovieGrid = createMovieGrid;