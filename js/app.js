class MovieApp {
    constructor() {
        this.currentPage = 'home';
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.showHome();
        this.setupSearch();
        this.setupServiceWorker();
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registered'))
                .catch(error => console.log('SW registration failed'));
        }
    }

    setupSearch() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control me-2';
        searchInput.placeholder = 'Search movies, shows...';
        searchInput.id = 'globalSearch';
        
        const searchContainer = document.createElement('div');
        searchContainer.className = 'position-relative';
        searchContainer.appendChild(searchInput);
        
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = 'searchSuggestions';
        suggestionsDiv.className = 'search-suggestions d-none';
        searchContainer.appendChild(suggestionsDiv);
        
        document.querySelector('.navbar-nav').parentNode.insertBefore(searchContainer, document.querySelector('.navbar-nav'));
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length > 2) {
                this.searchTimeout = setTimeout(() => this.handleSearch(query), 300);
            } else {
                this.hideSuggestions();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    async handleSearch(query) {
        try {
            const results = await api.searchContent(query);
            this.showSuggestions(results.database_results.concat(results.tmdb_results).slice(0, 5));
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    showSuggestions(results) {
        const suggestionsDiv = document.getElementById('searchSuggestions');
        
        if (results.length === 0) {
            suggestionsDiv.classList.add('d-none');
            return;
        }
        
        suggestionsDiv.innerHTML = results.map(item => `
            <div class="suggestion-item" onclick="app.showContentDetails(${item.id})">
                <img src="${item.poster_path || 'https://via.placeholder.com/50x75'}" alt="${item.title}">
                <div>
                    <div class="text-white fw-medium">${item.title}</div>
                    <small class="text-light">${item.release_date ? new Date(item.release_date).getFullYear() : ''} • ${item.content_type}</small>
                </div>
            </div>
        `).join('');
        
        suggestionsDiv.classList.remove('d-none');
    }

    hideSuggestions() {
        document.getElementById('searchSuggestions').classList.add('d-none');
    }

    async showHome() {
        this.currentPage = 'home';
        const mainContent = document.getElementById('mainContent');
        
        if (auth.isLoggedIn()) {
            mainContent.innerHTML = `
                <div class="container-fluid">
                    ${ComponentBuilder.createLoadingSkeleton(15)}
                </div>
            `;
            
            try {
                const [homepage, personalizedRecs] = await Promise.all([
                    api.getHomepage(),
                    api.getPersonalizedRecommendations()
                ]);
                
                mainContent.innerHTML = `
                    <div class="container-fluid fade-in">
                        ${ComponentBuilder.createHeroCarousel(homepage.trending.movies)}
                        ${ComponentBuilder.createContentSection('Recommended for You', personalizedRecs.hybrid_recommendations)}
                        ${ComponentBuilder.createContentSection('Because You Liked', personalizedRecs.favorites_based)}
                        ${ComponentBuilder.createContentSection('Continue Watching', personalizedRecs.watch_history_based)}
                        ${ComponentBuilder.createContentSection('Trending Now', homepage.trending.movies)}
                        ${ComponentBuilder.createContentSection('What\'s Hot', homepage.whats_hot)}
                        ${ComponentBuilder.createContentSection('Critics\' Choice', homepage.critics_choice)}
                        ${Object.entries(homepage.regional).map(([lang, content]) => 
                            ComponentBuilder.createContentSection(`${lang} Movies`, content)
                        ).join('')}
                    </div>
                `;
            } catch (error) {
                this.showError('Failed to load personalized content');
            }
        } else {
            this.showAnonymousHome();
        }
    }

    async showAnonymousHome() {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <div class="container-fluid">
                ${ComponentBuilder.createLoadingSkeleton(15)}
            </div>
        `;
        
        try {
            const homepage = await api.getHomepage();
            
            mainContent.innerHTML = `
                <div class="container-fluid fade-in">
                    ${ComponentBuilder.createHeroCarousel(homepage.trending.movies)}
                    ${ComponentBuilder.createContentSection('Trending Movies', homepage.trending.movies)}
                    ${ComponentBuilder.createContentSection('Trending TV Shows', homepage.trending.tv)}
                    ${ComponentBuilder.createContentSection('What\'s Hot', homepage.whats_hot)}
                    ${ComponentBuilder.createContentSection('Critics\' Choice', homepage.critics_choice)}
                    ${Object.entries(homepage.regional).map(([lang, content]) => 
                        ComponentBuilder.createContentSection(`${lang} Favorites`, content)
                    ).join('')}
                    ${ComponentBuilder.createContentSection('User Favorites', homepage.user_favorites)}
                    ${homepage.admin_curated.length > 0 ? ComponentBuilder.createContentSection('Staff Picks', homepage.admin_curated) : ''}
                </div>
            `;
        } catch (error) {
            this.showError('Failed to load homepage content');
        }
    }

    async showContentDetails(contentId) {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-12">
                        <div class="loading-skeleton" style="height: 400px; border-radius: 8px;"></div>
                    </div>
                </div>
            </div>
        `;
        
        try {
            const details = await api.getContentDetails(contentId);
            const content = details.content;
            
            mainContent.innerHTML = `
                <div class="container-fluid fade-in">
                    <div class="row">
                        <div class="col-12">
                            <div class="hero-section" style="background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${content.backdrop_path}') center/cover;">
                                <div class="container">
                                    <div class="row align-items-center">
                                        <div class="col-md-3">
                                            <img src="${content.poster_path}" alt="${content.title}" class="img-fluid rounded">
                                        </div>
                                        <div class="col-md-9">
                                            <h1 class="display-4 text-white fw-bold">${content.title}</h1>
                                            ${content.release_date ? `<p class="text-light fs-5">${new Date(content.release_date).getFullYear()}</p>` : ''}
                                            <p class="lead text-light">${content.overview || 'No overview available.'}</p>
                                            
                                            ${content.genre_names ? `
                                                <div class="mb-3">
                                                    ${content.genre_names.map(genre => `<span class="genre-tag me-2">${genre}</span>`).join('')}
                                                </div>
                                            ` : ''}
                                            
                                            ${content.rating ? `
                                                <div class="mb-3">
                                                    <span class="rating-stars fs-4">${'★'.repeat(Math.floor(content.rating / 2))}</span>
                                                    <span class="text-white fs-5 ms-2">${content.rating}/10</span>
                                                </div>
                                            ` : ''}
                                            
                                            <div class="d-flex gap-3 flex-wrap">
                                                ${details.youtube_videos && details.youtube_videos.trailers.length > 0 ? `
                                                    <button class="btn btn-netflix" onclick="app.playVideo('${details.youtube_videos.trailers[0].video_id}')">
                                                        <i class="fas fa-play me-2"></i>Play Trailer
                                                    </button>
                                                ` : ''}
                                                
                                                ${auth.isLoggedIn() ? `
                                                    <button class="btn btn-outline-light" onclick="app.addToWishlist(${content.id})">
                                                        <i class="fas fa-plus me-2"></i>Wishlist
                                                    </button>
                                                    <button class="btn btn-outline-light" onclick="app.addToFavorites(${content.id})">
                                                        <i class="fas fa-heart me-2"></i>Favorite
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${details.similar_content && details.similar_content.length > 0 ? `
                        <div class="container mt-5">
                            <h3 class="text-white mb-4">More Like This</h3>
                            <div class="row">
                                ${details.similar_content.map(item => ComponentBuilder.createContentCard(item)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${details.user_reviews && details.user_reviews.length > 0 ? `
                        <div class="container mt-5">
                            <h3 class="text-white mb-4">User Reviews</h3>
                            <div class="row">
                                ${details.user_reviews.map(review => `
                                    <div class="col-md-6 mb-3">
                                        <div class="content-card p-3">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <strong class="text-white">${review.username}</strong>
                                                <span class="rating-stars">${'★'.repeat(review.rating)}</span>
                                            </div>
                                            <small class="text-light">${new Date(review.created_at).toLocaleDateString()}</small>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            this.showError('Failed to load content details');
        }
    }

    playVideo(videoId) {
        const videoContainer = document.getElementById('videoContainer');
        videoContainer.innerHTML = `
            <iframe width="100%" height="500" 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                    frameborder="0" allowfullscreen>
            </iframe>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('videoModal'));
        modal.show();
        
        modal._element.addEventListener('hidden.bs.modal', () => {
            videoContainer.innerHTML = '';
        });
    }

    async addToWishlist(contentId) {
        if (!auth.isLoggedIn()) {
            auth.showLogin();
            return;
        }
        
        try {
            await api.recordInteraction({
                content_id: contentId,
                interaction_type: 'wishlist'
            });
            this.showToast('Added to wishlist!', 'success');
        } catch (error) {
            this.showToast('Failed to add to wishlist', 'error');
        }
    }

    async addToFavorites(contentId) {
        if (!auth.isLoggedIn()) {
            auth.showLogin();
            return;
        }
        
        try {
            await api.recordInteraction({
                content_id: contentId,
                interaction_type: 'favorite'
            });
            this.showToast('Added to favorites!', 'success');
        } catch (error) {
            this.showToast('Failed to add to favorites', 'error');
        }
    }

    showSearch() {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-md-8 mx-auto">
                        <div class="content-card p-4">
                            <h2 class="text-white mb-4 text-center">Search Movies & TV Shows</h2>
                            <div class="input-group mb-4">
                                <input type="text" class="form-control form-control-lg" id="mainSearchInput" 
                                       placeholder="Search for movies, TV shows, anime...">
                                <button class="btn btn-netflix" type="button" onclick="app.performSearch()">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label text-white">Content Type</label>
                                    <select class="form-select" id="searchType">
                                        <option value="movie">Movies</option>
                                        <option value="tv">TV Shows</option>
                                        <option value="anime">Anime</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-white">Genre</label>
                                    <select class="form-select" id="searchGenre">
                                        <option value="">All Genres</option>
                                        <option value="action">Action</option>
                                        <option value="comedy">Comedy</option>
                                        <option value="drama">Drama</option>
                                        <option value="horror">Horror</option>
                                        <option value="romance">Romance</option>
                                        <option value="thriller">Thriller</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="searchResults"></div>
            </div>
        `;
        
        document.getElementById('mainSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
    }

    async performSearch() {
        const query = document.getElementById('mainSearchInput').value.trim();
        const type = document.getElementById('searchType').value;
        
        if (!query) {
            this.showToast('Please enter a search term', 'warning');
            return;
        }
        
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = `
            <div class="container">
                <div class="row">
                    ${ComponentBuilder.createLoadingSkeleton(8)}
                </div>
            </div>
        `;
        
        try {
            const results = await api.searchContent(query, type);
            resultsDiv.innerHTML = ComponentBuilder.createSearchResults(results);
        } catch (error) {
            resultsDiv.innerHTML = '<div class="text-center text-light p-5"><h4>Search failed. Please try again.</h4></div>';
        }
    }

    showProfile() {
        if (!auth.isLoggedIn()) {
            auth.showLogin();
            return;
        }
        
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = ComponentBuilder.createUserProfile(auth.currentUser);
    }

    showAdmin() {
        if (!auth.isLoggedIn() || auth.currentUser?.preferences?.role !== 'admin') {
            this.showToast('Admin access required', 'error');
            return;
        }
        
        adminPanel.show();
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container') || this.createToastContainer();
        
        const toastId = 'toast_' + Date.now();
        const toastHtml = `
            <div class="toast" id="${toastId}" role="alert">
                <div class="toast-header bg-dark text-white border-0">
                    <i class="fas fa-${this.getToastIcon(type)} text-${this.getToastColor(type)} me-2"></i>
                    <strong class="me-auto">Notification</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${message}</div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('afterbegin', toastHtml);
        
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();
        
        setTimeout(() => {
            const element = document.getElementById(toastId);
            if (element) element.remove();
        }, 5000);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getToastColor(type) {
        const colors = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'info'
        };
        return colors[type] || 'info';
    }

    showError(message) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="container mt-5">
                <div class="row">
                    <div class="col-md-6 mx-auto text-center">
                        <div class="content-card p-5">
                            <i class="fas fa-exclamation-triangle text-netflix fa-3x mb-3"></i>
                            <h3 class="text-white mb-3">Oops! Something went wrong</h3>
                            <p class="text-light mb-4">${message}</p>
                            <button class="btn btn-netflix" onclick="app.showHome()">
                                <i class="fas fa-home me-2"></i>Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

const app = new MovieApp();