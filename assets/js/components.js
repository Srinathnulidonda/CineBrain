// Reusable Components for CineBrain
class Components {
    // Load and render topbar
    static async loadTopbar() {
        const topbarHtml = `
            <nav class="navbar navbar-expand-lg fixed-topbar">
                <div class="container-fluid px-3">
                    <!-- Logo -->
                    <a class="navbar-brand d-flex flex-column align-items-start" href="index.html">
                        <div class="logo-text">CineBrain</div>
                        <div class="tagline-text">The Mind Behind Your Next Favorite</div>
                    </a>

                    <!-- Search -->
                    <div class="search-container d-none d-md-flex mx-auto">
                        <div class="input-group">
                            <button class="btn btn-outline-secondary" type="button" id="search-toggle">
                                <i class="fas fa-search"></i>
                            </button>
                            <input type="text" class="form-control search-input" id="global-search" 
                                   placeholder="Search movies, TV shows, anime..." style="width: 0; transition: width 0.3s ease;">
                        </div>
                        <div class="search-results" id="search-results" style="display: none;"></div>
                    </div>

                    <!-- User Avatar -->
                    <div class="d-flex align-items-center">
                        <button class="btn btn-link text-white me-2 d-md-none" id="mobile-search-btn">
                            <i class="fas fa-search"></i>
                        </button>
                        <div class="dropdown">
                            <button class="btn btn-link p-0" type="button" id="user-dropdown" data-bs-toggle="dropdown">
                                <img src="" id="user-avatar" class="rounded-circle" width="40" height="40" alt="User">
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end glass-effect">
                                <li><a class="dropdown-item text-white" href="user/profile.html">Profile</a></li>
                                <li><a class="dropdown-item text-white" href="user/watchlist.html">Watchlist</a></li>
                                <li><a class="dropdown-item text-white" href="user/favorites.html">Favorites</a></li>
                                <li><a class="dropdown-item text-white" href="user/settings.html">Settings</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-white" href="#" id="logout-btn">Logout</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </nav>
        `;

        document.getElementById('topbar-container').innerHTML = topbarHtml;

        // Initialize search functionality
        this.initializeSearch();

        // Initialize user avatar
        this.initializeUserAvatar();

        // Initialize logout
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }

    // Load and render mobile navigation
    static async loadMobileNav() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        const mobileNavHtml = `
            <nav class="mobile-nav d-flex d-md-none">
                <div class="container-fluid">
                    <div class="row w-100">
                        <div class="col d-flex justify-content-around align-items-center py-2">
                            <a href="index.html" class="mobile-nav-item d-flex flex-column align-items-center ${currentPage === 'index.html' ? 'active' : ''}">
                                <i class="fas fa-home fs-5"></i>
                                <small>Home</small>
                            </a>
                            <a href="content/search.html" class="mobile-nav-item d-flex flex-column align-items-center ${currentPage === 'search.html' ? 'active' : ''}">
                                <i class="fas fa-search fs-5"></i>
                                <small>Search</small>
                            </a>
                            <a href="user/watchlist.html" class="mobile-nav-item d-flex flex-column align-items-center ${currentPage === 'watchlist.html' ? 'active' : ''}">
                                <i class="fas fa-bookmark fs-5"></i>
                                <small>Watchlist</small>
                            </a>
                            <a href="user/favorites.html" class="mobile-nav-item d-flex flex-column align-items-center ${currentPage === 'favorites.html' ? 'active' : ''}">
                                <i class="fas fa-heart fs-5"></i>
                                <small>Favorites</small>
                            </a>
                            <a href="user/profile.html" class="mobile-nav-item d-flex flex-column align-items-center ${currentPage === 'profile.html' ? 'active' : ''}">
                                <i class="fas fa-user fs-5"></i>
                                <small>Profile</small>
                            </a>
                        </div>
                    </div>
                </div>
            </nav>
        `;

        document.getElementById('mobile-nav-container').innerHTML = mobileNavHtml;
    }

    // Initialize search functionality
    static initializeSearch() {
        const searchToggle = document.getElementById('search-toggle');
        const searchInput = document.getElementById('global-search');
        const searchResults = document.getElementById('search-results');

        if (!searchToggle || !searchInput) return;

        // Toggle search input
        searchToggle.addEventListener('click', () => {
            if (searchInput.style.width === '0px' || !searchInput.style.width) {
                searchInput.style.width = '300px';
                searchInput.focus();
            } else {
                searchInput.style.width = '0px';
                searchResults.style.display = 'none';
            }
        });

        // Search functionality with debounce
        const debouncedSearch = Utils.debounce(async (query) => {
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }

            try {
                const results = await apiClient.searchContent(query, 'multi', 1);
                this.renderSearchResults(results.results.slice(0, 5), searchResults);
                searchResults.style.display = 'block';
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });

        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults.style.display = 'none';
            }
        });
    }

    // Render search results
    static renderSearchResults(results, container) {
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="p-3 text-center text-muted">No results found</div>';
            return;
        }

        const resultsHtml = results.map(item => `
            <div class="search-result-item p-2 border-bottom border-secondary" onclick="window.location.href='content/details.html?id=${item.id}'">
                <div class="d-flex">
                    <img src="${Utils.getImageUrl(item.poster_path, 'w92')}" 
                         alt="${item.title}" class="rounded me-3" width="40" height="60"
                         onerror="this.src='${Utils.getImageUrl(null)}'">
                    <div class="flex-grow-1">
                        <h6 class="mb-1 text-white">${item.title}</h6>
                        <small class="text-muted">${Utils.formatContentType(item.content_type)} • ${Utils.formatDate(item.release_date)}</small>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = resultsHtml;
    }

    // Initialize user avatar
    static initializeUserAvatar() {
        const userAvatar = document.getElementById('user-avatar');
        const userData = Utils.getStorage('user_data');

        if (userData && userData.username) {
            // Generate avatar using UI Avatars
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=E50914&color=fff&size=40&bold=true`;
            userAvatar.src = avatarUrl;
        } else {
            // Default guest avatar
            userAvatar.src = 'https://ui-avatars.com/api/?name=Guest&background=6B7280&color=fff&size=40';
        }
    }

    // Content card component
    static createContentCard(content, size = 'normal') {
        const cardClass = size === 'mini' ? 'card-mini' : '';
        const rating = Utils.formatRating(content.rating);

        return `
            <div class="content-card ${cardClass}" onclick="window.location.href='content/details.html?id=${content.id}'">
                <div class="position-relative">
                    <img src="${Utils.getImageUrl(content.poster_path)}" 
                         alt="${content.title}" class="content-card-image"
                         loading="lazy" onerror="this.src='${Utils.getImageUrl(null)}'">
                    
                    <!-- Rating Badge -->
                    ${content.rating ? `<div class="position-absolute top-0 end-0 m-2">
                        <span class="${rating.className}">${rating.value}</span>
                    </div>` : ''}

                    <!-- Type Badge -->
                    <div class="position-absolute top-0 start-0 m-2">
                        <span class="type-badge">${Utils.formatContentType(content.content_type)}</span>
                    </div>

                    <!-- Hover Overlay -->
                    <div class="position-absolute bottom-0 start-0 end-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-all duration-300">
                        <h6 class="text-white mb-1 fw-bold">${content.title}</h6>
                        ${content.genres ? `<div class="mb-2">
                            ${JSON.parse(content.genres).slice(0, 2).map(genre =>
            `<span class="genre-chip">${genre}</span>`
        ).join('')}
                        </div>` : ''}
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-primary-custom" onclick="event.stopPropagation(); Components.addToWatchlist(${content.id})">
                                <i class="fas fa-plus"></i>
                            </button>
                            ${content.youtube_trailer ? `
                                <button class="btn btn-sm btn-secondary-custom" onclick="event.stopPropagation(); Components.openTrailer('${Utils.extractYouTubeId(content.youtube_trailer)}', '${content.title}')">
                                    <i class="fas fa-play"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Hero carousel item
    static createHeroItem(content) {
        const youtubeId = Utils.extractYouTubeId(content.youtube_trailer);

        return `
            <div class="carousel-item ${content === 0 ? 'active' : ''} hero-item"
                 style="background-image: url('${Utils.getImageUrl(content.backdrop_path, 'w1280')}')">
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    <div class="container-fluid">
                        <div class="row">
                            <div class="col-md-6">
                                <h1 class="display-4 text-white fw-bold mb-3">${content.title}</h1>
                                <p class="lead text-white mb-4">${Utils.truncateText(content.overview, 200)}</p>
                                
                                <div class="d-flex align-items-center mb-4">
                                    ${content.rating ? `<span class="${Utils.formatRating(content.rating).className} me-3">${Utils.formatRating(content.rating).value}</span>` : ''}
                                    <span class="type-badge me-3">${Utils.formatContentType(content.content_type)}</span>
                                    <span class="text-muted">${Utils.formatDate(content.release_date)}</span>
                                </div>

                                <div class="d-flex gap-3">
                                    ${youtubeId ? `
                                        <button class="btn btn-primary-custom btn-lg" onclick="Components.openTrailer('${youtubeId}', '${content.title}')">
                                            <i class="fas fa-play me-2"></i>Play Trailer
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-secondary-custom btn-lg" onclick="window.location.href='content/details.html?id=${content.id}'">
                                        <i class="fas fa-info-circle me-2"></i>More Info
                                    </button>
                                    <button class="btn btn-secondary-custom btn-lg" onclick="Components.addToWatchlist(${content.id})">
                                        <i class="fas fa-plus me-2"></i>Watchlist
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Open trailer modal
    static openTrailer(youtubeId, title) {
        if (!youtubeId) {
            Utils.showToast('Trailer not available', 'error');
            return;
        }

        const modalHtml = `
            <div class="modal fade" id="trailerModal" tabindex="-1">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title text-white">${title} - Trailer</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            <div class="video-player">
                                <iframe src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0" 
                                        allowfullscreen allow="autoplay"></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existingModal = document.getElementById('trailerModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = new bootstrap.Modal(document.getElementById('trailerModal'));
        modal.show();

        // Clean up on modal hide
        document.getElementById('trailerModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    // Add to watchlist
    static async addToWatchlist(contentId) {
        try {
            await apiClient.recordInteraction(contentId, 'watchlist');
            Utils.showToast('Added to watchlist', 'success');
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            Utils.showToast('Failed to add to watchlist', 'error');
        }
    }

    // Add to favorites
    static async addToFavorites(contentId) {
        try {
            await apiClient.recordInteraction(contentId, 'favorite');
            Utils.showToast('Added to favorites', 'success');
        } catch (error) {
            console.error('Error adding to favorites:', error);
            Utils.showToast('Failed to add to favorites', 'error');
        }
    }

    // Logout function
    static logout() {
        Utils.setStorage('auth_token', null);
        Utils.setStorage('user_data', null);
        window.location.href = 'auth/login.html';
    }

    // Loading skeleton
    static createLoadingSkeleton(count = 6) {
        return Array.from({ length: count }, () => `
            <div class="card-skeleton"></div>
        `).join('');
    }

    // Error state
    static createErrorState(message = 'Failed to load content') {
        return `
            <div class="d-flex flex-column align-items-center justify-content-center p-4 text-center">
                <i class="fas fa-exclamation-triangle text-warning mb-3" style="font-size: 3rem;"></i>
                <h5 class="text-white mb-2">Oops! Something went wrong</h5>
                <p class="text-muted mb-3">${message}</p>
                <button class="btn btn-primary-custom" onclick="window.location.reload()">
                    <i class="fas fa-refresh me-2"></i>Try Again
                </button>
            </div>
        `;
    }

    // Empty state
    static createEmptyState(message = 'No content found') {
        return `
            <div class="d-flex flex-column align-items-center justify-content-center p-4 text-center">
                <i class="fas fa-film text-muted mb-3" style="font-size: 3rem;"></i>
                <h5 class="text-white mb-2">Nothing here yet</h5>
                <p class="text-muted">${message}</p>
            </div>
        `;
    }
}

// Auto-load components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Components.loadTopbar();
    Components.loadMobileNav();
});