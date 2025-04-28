class CineBrainCriticsChoiceManager {
    constructor() {
        this.apiBase = 'https://cinebrain.onrender.com/api';
        this.posterBase = 'https://image.tmdb.org/t/p/w500';

        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;

        this.currentFilters = {
            type: 'all',
            genre: '',
            language: '',
            time_period: 'all',
            region: 'global',
            sort: 'critics_score'
        };

        this.currentPage = 1;
        this.itemsPerPage = 24;
        this.isLoading = false;
        this.hasMoreItems = true;
        this.allItems = [];
        this.filteredItems = [];
        this.viewMode = 'grid';

        this.userFavorites = new Set();
        this.refreshStatusInterval = null;

        this.init();
    }

    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    async setup() {
        this.setupEventListeners();
        this.setupFilters();

        if (this.isAuthenticated) {
            await this.loadUserFavorites();
        }

        await this.loadCriticsChoice();

        this.startRefreshStatusUpdates();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        console.log('CineBrain Critics Choice Manager initialized');
    }

    setupEventListeners() {
        const applyBtn = document.getElementById('apply-filters-btn');
        const clearBtn = document.getElementById('clear-filters-btn');
        const retryBtn = document.getElementById('retry-btn');
        const loadMoreBtn = document.getElementById('load-more-btn');
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');

        applyBtn?.addEventListener('click', () => this.applyFilters());
        clearBtn?.addEventListener('click', () => this.clearFilters());
        retryBtn?.addEventListener('click', () => this.loadCriticsChoice());
        loadMoreBtn?.addEventListener('click', () => this.loadMoreItems());

        gridViewBtn?.addEventListener('click', () => this.setViewMode('grid'));
        listViewBtn?.addEventListener('click', () => this.setViewMode('list'));

        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => this.updateFiltersFromUI());
        });

        window.addEventListener('scroll', () => this.handleScroll());

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopRefreshStatusUpdates();
            } else {
                this.startRefreshStatusUpdates();
            }
        });
    }

    setupFilters() {
        const urlParams = new URLSearchParams(window.location.search);

        Object.keys(this.currentFilters).forEach(key => {
            const value = urlParams.get(key);
            if (value) {
                this.currentFilters[key] = value;
                const element = document.getElementById(`${key.replace('_', '-')}-filter`);
                if (element) {
                    element.value = value;
                }
            }
        });
    }

    updateFiltersFromUI() {
        this.currentFilters.type = document.getElementById('content-type-filter')?.value || 'all';
        this.currentFilters.genre = document.getElementById('genre-filter')?.value || '';
        this.currentFilters.language = document.getElementById('language-filter')?.value || '';
        this.currentFilters.time_period = document.getElementById('time-period-filter')?.value || 'all';
        this.currentFilters.region = document.getElementById('region-filter')?.value || 'global';
        this.currentFilters.sort = document.getElementById('sort-filter')?.value || 'critics_score';
    }

    async applyFilters() {
        this.updateFiltersFromUI();
        this.currentPage = 1;
        this.allItems = [];
        this.hasMoreItems = true;

        this.updateURL();
        await this.loadCriticsChoice();
    }

    clearFilters() {
        this.currentFilters = {
            type: 'all',
            genre: '',
            language: '',
            time_period: 'all',
            region: 'global',
            sort: 'critics_score'
        };

        document.getElementById('content-type-filter').value = 'all';
        document.getElementById('genre-filter').value = '';
        document.getElementById('language-filter').value = '';
        document.getElementById('time-period-filter').value = 'all';
        document.getElementById('region-filter').value = 'global';
        document.getElementById('sort-filter').value = 'critics_score';

        this.currentPage = 1;
        this.allItems = [];
        this.hasMoreItems = true;

        this.updateURL();
        this.loadCriticsChoice();
    }

    updateURL() {
        const params = new URLSearchParams();
        Object.entries(this.currentFilters).forEach(([key, value]) => {
            if (value && value !== 'all' && value !== 'global' && value !== '') {
                params.set(key, value);
            }
        });

        const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newURL);
    }

    async loadCriticsChoice() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();
        this.hideError();

        try {
            const params = {
                ...this.currentFilters,
                limit: this.itemsPerPage * this.currentPage
            };

            const queryString = new URLSearchParams(params).toString();
            const url = `${this.apiBase}/recommendations/critics-choice?${queryString}`;

            const headers = {};
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const response = await fetch(url, {
                headers,
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.recommendations && Array.isArray(data.recommendations)) {
                this.allItems = data.recommendations;
                this.applyClientSideSort();
                this.displayItems();
                this.updateStats(data.metadata);
                this.updateResultsCount();

                this.hasMoreItems = this.allItems.length >= this.itemsPerPage * this.currentPage;
                this.updateLoadMoreButton();
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error('CineBrain Critics Choice load error:', error);
            this.showError();
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadMoreItems() {
        if (this.isLoading || !this.hasMoreItems) return;

        this.currentPage++;
        await this.loadCriticsChoice();
    }

    applyClientSideSort() {
        if (this.currentFilters.sort === 'critics_score') {
            this.allItems.sort((a, b) => (b.critics_score || 0) - (a.critics_score || 0));
        } else if (this.currentFilters.sort === 'rating') {
            this.allItems.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (this.currentFilters.sort === 'popularity') {
            this.allItems.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
        } else if (this.currentFilters.sort === 'release_date') {
            this.allItems.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
        }
    }

    displayItems() {
        const container = document.getElementById('content-grid');
        if (!container) return;

        if (this.currentPage === 1) {
            container.innerHTML = '';
        }

        if (this.allItems.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>No critics choice found</h3>
                    <p>Try adjusting your filters</p>
                </div>
            `;
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.allItems.length);
        const itemsToShow = this.allItems.slice(startIndex, endIndex);

        itemsToShow.forEach((item, index) => {
            const card = this.createContentCard(item);
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            container.appendChild(card);

            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    createContentCard(content) {
        const card = document.createElement('div');
        card.className = `content-card ${this.viewMode}-view`;
        card.dataset.contentId = content.id;

        const posterUrl = this.formatPosterUrl(content.poster_path);
        const rating = this.formatRating(content.rating);
        const criticsScore = content.critics_score ? content.critics_score.toFixed(1) : 'N/A';
        const year = this.extractYear(content.release_date);
        const genres = content.genres?.slice(0, 2) || [];
        const isInFavorites = this.userFavorites.has(content.id);

        card.innerHTML = `
            <div class="card-poster-container">
                <img 
                    class="card-poster" 
                    src="${posterUrl}" 
                    alt="${this.escapeHtml(content.title || 'CineBrain Content')}"
                    loading="lazy"
                >
                <div class="content-type-badge ${content.content_type}">
                    ${content.content_type?.toUpperCase()}
                </div>
                <div class="critics-score-badge">
                    <i data-feather="award"></i>
                    <span>${criticsScore}</span>
                </div>
                <div class="card-overlays">
                    <div class="card-top-overlay">
                        <button class="wishlist-btn ${isInFavorites ? 'active' : ''}" 
                                data-content-id="${content.id}">
                            <i data-feather="heart"></i>
                        </button>
                    </div>
                    <div class="card-bottom-overlay">
                        <div class="rating-badge">
                            <i data-feather="star"></i>
                            <span>${rating}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-info">
                <div class="card-title">${this.escapeHtml(content.title || 'Unknown')}</div>
                <div class="card-meta">
                    ${year ? `<span class="card-year">${year}</span>` : ''}
                    ${content.languages?.length ? `<span class="card-language">• ${content.languages[0]}</span>` : ''}
                </div>
                ${genres.length > 0 ? `
                    <div class="card-genres">
                        ${genres.map(genre => `<span class="genre-chip">${this.escapeHtml(genre)}</span>`).join('')}
                    </div>
                ` : ''}
                ${content.awards ? `
                    <div class="card-awards">
                        <i data-feather="award"></i>
                        <span>${content.awards}</span>
                    </div>
                ` : ''}
            </div>
        `;

        this.setupCardHandlers(card, content);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        return card;
    }

    setupCardHandlers(card, content) {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.wishlist-btn')) {
                if (content.slug) {
                    window.location.href = `/content/details.html?${encodeURIComponent(content.slug)}`;
                }
            }
        });

        const wishlistBtn = card.querySelector('.wishlist-btn');
        wishlistBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleWishlistClick(content.id, wishlistBtn);
        });
    }

    async handleWishlistClick(contentId, button) {
        if (!this.isAuthenticated) {
            this.showNotification('Please login to add to favorites', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
        }

        try {
            button.disabled = true;
            const isCurrentlyInFavorites = button.classList.contains('active');

            if (isCurrentlyInFavorites) {
                button.classList.remove('active');
                this.userFavorites.delete(contentId);
            } else {
                button.classList.add('active');
                this.userFavorites.add(contentId);
            }

            const response = await fetch(`${this.apiBase}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    content_id: contentId,
                    interaction_type: isCurrentlyInFavorites ? 'remove_favorite' : 'favorite'
                })
            });

            if (response.ok) {
                this.showNotification(
                    isCurrentlyInFavorites ? 'Removed from favorites' : 'Added to favorites',
                    'success'
                );
            } else {
                throw new Error('Failed to update favorites');
            }

        } catch (error) {
            console.error('Error updating favorites:', error);
            this.showNotification('Failed to update favorites', 'error');

            if (button.classList.contains('active')) {
                button.classList.remove('active');
                this.userFavorites.delete(contentId);
            } else {
                button.classList.add('active');
                this.userFavorites.add(contentId);
            }
        } finally {
            button.disabled = false;
        }
    }

    async loadUserFavorites() {
        if (!this.isAuthenticated) return;

        try {
            const response = await fetch(`${this.apiBase}/user/favorites`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.userFavorites.clear();
                if (data.favorites && Array.isArray(data.favorites)) {
                    data.favorites.forEach(item => this.userFavorites.add(item.id));
                }
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;
        const container = document.getElementById('content-grid');
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtn = document.getElementById('list-view-btn');

        container.className = `content-grid ${mode}-view`;

        gridBtn.classList.toggle('active', mode === 'grid');
        listBtn.classList.toggle('active', mode === 'list');
    }

    updateStats(metadata) {
        if (!metadata) return;

        document.getElementById('algorithm-info').textContent = metadata.algorithm || 'CineBrain Enhanced v2';
        document.getElementById('sources-info').textContent = metadata.sources?.join(', ') || 'TMDB, OMDb, Metacritic';
        document.getElementById('avg-score-info').textContent = metadata.average_critics_score || '--';
        document.getElementById('lang-priority-info').textContent = metadata.telugu_priority ? 'Telugu First' : 'Global';

        if (metadata.refresh_info) {
            this.displayRefreshInfo(metadata.refresh_info);
        }
    }

    displayRefreshInfo(refreshInfo) {
        const lastRefresh = refreshInfo.last_refresh ? new Date(refreshInfo.last_refresh) : null;
        const nextRefresh = refreshInfo.next_refresh ? new Date(refreshInfo.next_refresh) : null;

        let refreshElement = document.getElementById('refresh-status');
        if (!refreshElement) {
            refreshElement = document.createElement('div');
            refreshElement.id = 'refresh-status';
            refreshElement.className = 'refresh-status-info';

            const statsSection = document.querySelector('.stats-section');
            if (statsSection) {
                statsSection.insertBefore(refreshElement, statsSection.firstChild);
            }
        }

        const timeUntilNext = nextRefresh ? this.getTimeUntilRefresh(nextRefresh) : 'Unknown';
        const lastRefreshText = lastRefresh ? this.formatTimeAgo(lastRefresh) : 'Never';

        refreshElement.innerHTML = `
            <div class="refresh-info-container">
                <div class="refresh-item">
                    <i data-feather="refresh-cw"></i>
                    <span>Last Updated: ${lastRefreshText}</span>
                </div>
                <div class="refresh-item">
                    <i data-feather="clock"></i>
                    <span>Next Update: ${timeUntilNext}</span>
                </div>
                ${refreshInfo.is_refreshing ? `
                    <div class="refresh-item refreshing">
                        <i data-feather="loader" class="spinning"></i>
                        <span>Refreshing now...</span>
                    </div>
                ` : ''}
            </div>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    getTimeUntilRefresh(nextRefreshDate) {
        const now = new Date();
        const diff = nextRefreshDate - now;

        if (diff <= 0) return 'Any moment now';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    startRefreshStatusUpdates() {
        this.updateRefreshCountdown();

        this.refreshStatusInterval = setInterval(() => {
            this.updateRefreshCountdown();
        }, 60000);
    }

    stopRefreshStatusUpdates() {
        if (this.refreshStatusInterval) {
            clearInterval(this.refreshStatusInterval);
            this.refreshStatusInterval = null;
        }
    }

    updateRefreshCountdown() {
        const refreshElement = document.getElementById('refresh-status');
        if (!refreshElement) return;

        const nextRefreshElement = refreshElement.querySelector('.refresh-item:nth-child(2) span');
        if (!nextRefreshElement) return;

        const metadata = this.lastMetadata;
        if (metadata?.refresh_info?.next_refresh) {
            const nextRefresh = new Date(metadata.refresh_info.next_refresh);
            const timeUntilNext = this.getTimeUntilRefresh(nextRefresh);
            nextRefreshElement.textContent = `Next Update: ${timeUntilNext}`;
        }
    }

    updateResultsCount() {
        const countElement = document.getElementById('results-count');
        if (countElement) {
            countElement.textContent = this.allItems.length;
        }
    }

    updateLoadMoreButton() {
        const loadMoreSection = document.getElementById('load-more-section');
        const loadMoreBtn = document.getElementById('load-more-btn');

        if (this.hasMoreItems && this.allItems.length >= this.itemsPerPage) {
            loadMoreSection.style.display = 'block';
            loadMoreBtn.disabled = this.isLoading;
            loadMoreBtn.textContent = this.isLoading ? 'Loading...' : 'Load More Critics Choice';
        } else {
            loadMoreSection.style.display = 'none';
        }
    }

    handleScroll() {
        if (this.hasMoreItems && !this.isLoading) {
            const loadMoreSection = document.getElementById('load-more-section');
            if (loadMoreSection && this.isElementInViewport(loadMoreSection)) {
                this.loadMoreItems();
            }
        }
    }

    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.top <= window.innerHeight;
    }

    showLoading() {
        document.getElementById('loading-indicator').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading-indicator').style.display = 'none';
    }

    showError() {
        document.getElementById('error-message').style.display = 'block';
    }

    hideError() {
        document.getElementById('error-message').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    formatPosterUrl(posterPath) {
        if (!posterPath) {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2luZUJyYWluPC90ZXh0Pjwvc3ZnPg==';
        }
        if (posterPath.startsWith('http')) return posterPath;
        return `${this.posterBase}${posterPath}`;
    }

    formatRating(rating) {
        if (!rating) return 'N/A';
        return Number(rating).toFixed(1);
    }

    extractYear(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).getFullYear();
        } catch {
            return '';
        }
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

const cineBrainCriticsChoiceManager = new CineBrainCriticsChoiceManager();