// Watchlist management functionality
class WatchlistManager {
    constructor() {
        this.currentSort = 'recent';
        this.currentType = 'all';
        this.viewMode = 'grid';
        this.watchlistItems = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadWatchlist();
        this.setupContextMenu();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Sort filter
        document.getElementById('sort-filter').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortWatchlist();
        });

        // Type filter
        document.getElementById('type-filter').addEventListener('change', (e) => {
            this.currentType = e.target.value;
            this.filterWatchlist();
        });

        // View mode toggles
        document.getElementById('view-grid').addEventListener('click', () => {
            this.setViewMode('grid');
        });

        document.getElementById('view-list').addEventListener('click', () => {
            this.setViewMode('list');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.sortWatchlist();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                }
            }
        });
    }

    async loadWatchlist() {
        const container = document.getElementById('watchlist-content');
        UIComponents.showLoading(container);

        try {
            if (!appState.authToken) {
                window.location.href = '/login';
                return;
            }

            const response = await ApiService.getWatchlist();
            this.watchlistItems = response.watchlist;

            if (this.watchlistItems.length === 0) {
                this.showEmptyState();
            } else {
                this.renderWatchlist();
                this.updateStats();
                this.loadContinueWatching();
                this.loadRecommendations();
            }
        } catch (error) {
            UIComponents.showError(container, 'Failed to load watchlist');
        }
    }

    renderWatchlist() {
        const container = document.getElementById('watchlist-content');
        const emptyState = document.getElementById('empty-state');

        emptyState.classList.add('hidden');

        if (this.viewMode === 'grid') {
            container.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    ${this.watchlistItems.map(item => this.createWatchlistCard(item)).join('')}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="space-y-4">
                    ${this.watchlistItems.map(item => this.createWatchlistListItem(item)).join('')}
                </div>
            `;
        }

        // Update total count
        document.getElementById('total-items').textContent = this.watchlistItems.length;
    }

    createWatchlistCard(item) {
        const posterUrl = item.poster_path || '/assets/images/placeholder-poster.jpg';
        const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
        const addedDate = new Date(item.added_date || Date.now()).toLocaleDateString();

        return `
            <div class="watchlist-card interactive" data-id="${item.id}" oncontextmenu="WatchlistManager.showContextMenu(event, ${item.id})">
                <div class="relative">
                    <img src="${posterUrl}" alt="${item.title}" class="content-card-poster" loading="lazy">
                    <div class="absolute top-2 right-2">
                        <button class="content-card-action" onclick="WatchlistManager.removeFromWatchlist(${item.id})" title="Remove from Watchlist">
                            ✕
                        </button>
                    </div>
                    <div class="absolute bottom-2 left-2 right-2">
                        <div class="bg-black/80 rounded p-2">
                            <h3 class="text-sm font-semibold text-white truncate">${item.title}</h3>
                            <div class="flex justify-between items-center mt-1 text-xs text-gray-300">
                                <span>${item.content_type.toUpperCase()}</span>
                                <span>⭐ ${rating}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-3">
                    <div class="text-xs text-muted">Added ${addedDate}</div>
                    <div class="mt-2 flex gap-2">
                        <button onclick="window.location.href='/details?id=${item.id}'" class="btn btn-primary btn-sm flex-1">
                            Watch Now
                        </button>
                        ${item.youtube_trailer ?
                `<button onclick="VideoPlayer.playTrailer('${item.youtube_trailer}')" class="btn btn-ghost btn-sm">
                                ▶️
                            </button>` : ''
            }
                    </div>
                </div>
            </div>
        `;
    }

    createWatchlistListItem(item) {
        const posterUrl = item.poster_path || '/assets/images/placeholder-poster.jpg';
        const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
        const genres = item.genres ? item.genres.slice(0, 3).join(', ') : 'Unknown';
        const addedDate = new Date(item.added_date || Date.now()).toLocaleDateString();

        return `
            <div class="watchlist-list-item card p-4" data-id="${item.id}" oncontextmenu="WatchlistManager.showContextMenu(event, ${item.id})">
                <div class="flex gap-4">
                    <img src="${posterUrl}" alt="${item.title}" class="w-20 h-30 object-cover rounded" loading="lazy">
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-lg font-semibold">${item.title}</h3>
                            <button onclick="WatchlistManager.removeFromWatchlist(${item.id})" class="btn btn-ghost btn-sm text-error">
                                Remove
                            </button>
                        </div>
                        <div class="flex gap-4 mb-2 text-sm text-secondary">
                            <span>${item.content_type.toUpperCase()}</span>
                            <span>⭐ ${rating}</span>
                            <span>${item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}</span>
                        </div>
                        <p class="text-secondary text-sm mb-3">${genres}</p>
                        <div class="flex justify-between items-center">
                            <span class="text-xs text-muted">Added ${addedDate}</span>
                            <div class="flex gap-2">
                                <button onclick="window.location.href='/details?id=${item.id}'" class="btn btn-primary btn-sm">
                                    Watch Now
                                </button>
                                ${item.youtube_trailer ?
                `<button onclick="VideoPlayer.playTrailer('${item.youtube_trailer}')" class="btn btn-secondary btn-sm">
                                        Trailer
                                    </button>` : ''
            }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setViewMode(mode) {
        this.viewMode = mode;

        // Update active button
        document.querySelectorAll('#view-grid, #view-list').forEach(btn =>
            btn.classList.remove('active'));
        document.getElementById(`view-${mode}`).classList.add('active');

        // Re-render with new view mode
        this.renderWatchlist();
    }

    sortWatchlist() {
        switch (this.currentSort) {
            case 'title':
                this.watchlistItems.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'rating':
                this.watchlistItems.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'release':
                this.watchlistItems.sort((a, b) =>
                    new Date(b.release_date || 0) - new Date(a.release_date || 0));
                break;
            default: // recent
                this.watchlistItems.sort((a, b) =>
                    new Date(b.added_date || 0) - new Date(a.added_date || 0));
        }

        this.renderWatchlist();
    }

    filterWatchlist() {
        let filteredItems = [...this.watchlistItems];

        if (this.currentType !== 'all') {
            filteredItems = filteredItems.filter(item =>
                item.content_type === this.currentType);
        }

        // Temporarily store original items and render filtered
        const originalItems = this.watchlistItems;
        this.watchlistItems = filteredItems;
        this.renderWatchlist();
        this.watchlistItems = originalItems;
    }

    updateStats() {
        const movieCount = this.watchlistItems.filter(item => item.content_type === 'movie').length;
        const showCount = this.watchlistItems.filter(item => item.content_type === 'tv').length;
        const animeCount = this.watchlistItems.filter(item => item.content_type === 'anime').length;

        // Calculate total runtime (estimated)
        const totalRuntime = this.watchlistItems.reduce((total, item) => {
            const runtime = item.runtime || (item.content_type === 'movie' ? 120 : 45);
            return total + runtime;
        }, 0);

        document.getElementById('movies-count').textContent = movieCount;
        document.getElementById('shows-count').textContent = showCount;
        document.getElementById('anime-count').textContent = animeCount;
        document.getElementById('total-time').textContent = Math.round(totalRuntime / 60) + 'h';
    }

    async loadContinueWatching() {
        try {
            // Get items with watch progress (simulated)
            const continueWatching = this.watchlistItems.filter((item, index) => index < 3);

            if (continueWatching.length > 0) {
                const section = document.getElementById('continue-watching');
                const grid = document.getElementById('continue-watching-grid');

                grid.innerHTML = continueWatching.map(item => `
                    <div class="card p-4">
                        <div class="flex gap-3">
                            <img src="${item.poster_path || '/assets/images/placeholder-poster.jpg'}" 
                                 alt="${item.title}" class="w-16 h-24 object-cover rounded">
                            <div class="flex-1">
                                <h4 class="font-semibold mb-2">${item.title}</h4>
                                <div class="progress-bar mb-2">
                                    <div class="progress-fill" style="width: ${Math.random() * 70 + 10}%"></div>
                                </div>
                                <button onclick="window.location.href='/details?id=${item.id}'" class="btn btn-primary btn-sm">
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');

                section.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load continue watching:', error);
        }
    }

    async loadRecommendations() {
        try {
            if (this.watchlistItems.length > 0) {
                // Get recommendations based on watchlist
                const response = await ApiService.getPersonalizedRecommendations(10);

                const section = document.getElementById('watchlist-recommendations');
                UIComponents.createCarousel(
                    'You Might Also Like',
                    response.recommendations,
                    'recommendations-carousel',
                    true
                );

                section.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load recommendations:', error);
        }
    }

    showEmptyState() {
        document.getElementById('empty-state').classList.remove('hidden');
        document.getElementById('watchlist-content').innerHTML = '';
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('context-menu');

        // Hide context menu on click outside
        document.addEventListener('click', () => {
            contextMenu.classList.add('hidden');
        });

        // Handle context menu actions
        contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const itemId = contextMenu.dataset.itemId;

            if (action && itemId) {
                this.handleContextAction(action, parseInt(itemId));
                contextMenu.classList.add('hidden');
            }
        });
    }

    showContextMenu(event, itemId) {
        event.preventDefault();
        const contextMenu = document.getElementById('context-menu');

        contextMenu.dataset.itemId = itemId;
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        contextMenu.classList.remove('hidden');
    }

    handleContextAction(action, itemId) {
        const item = this.watchlistItems.find(item => item.id === itemId);
        if (!item) return;

        switch (action) {
            case 'move-to-top':
                this.moveToTop(itemId);
                break;
            case 'mark-watched':
                this.markAsWatched(itemId);
                break;
            case 'add-to-favorites':
                ContentManager.addToFavorites(itemId);
                break;
            case 'share':
                this.shareItem(item);
                break;
            case 'remove':
                this.removeFromWatchlist(itemId);
                break;
        }
    }

    moveToTop(itemId) {
        const index = this.watchlistItems.findIndex(item => item.id === itemId);
        if (index > 0) {
            const item = this.watchlistItems.splice(index, 1)[0];
            this.watchlistItems.unshift(item);
            this.renderWatchlist();
            UIComponents.showToast('Moved to top of watchlist', 'success');
        }
    }

    async markAsWatched(itemId) {
        try {
            await ApiService.recordInteraction(itemId, 'watched');
            UIComponents.showToast('Marked as watched!', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to mark as watched', 'error');
        }
    }

    shareItem(item) {
        if (navigator.share) {
            navigator.share({
                title: item.title,
                text: `Check out ${item.title} on CineScope`,
                url: `${window.location.origin}/details?id=${item.id}`
            });
        } else {
            // Fallback: copy to clipboard
            const url = `${window.location.origin}/details?id=${item.id}`;
            navigator.clipboard.writeText(url).then(() => {
                UIComponents.showToast('Link copied to clipboard!', 'success');
            });
        }
    }

    async removeFromWatchlist(itemId) {
        try {
            await ApiService.delete(`/interactions/watchlist/${itemId}`);

            // Remove from local array
            this.watchlistItems = this.watchlistItems.filter(item => item.id !== itemId);

            if (this.watchlistItems.length === 0) {
                this.showEmptyState();
            } else {
                this.renderWatchlist();
                this.updateStats();
            }

            UIComponents.showToast('Removed from watchlist', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to remove from watchlist', 'error');
        }
    }

    static async clearAll() {
        const confirmed = confirm('Are you sure you want to clear your entire watchlist?');

        if (confirmed) {
            try {
                await ApiService.delete('/user/watchlist/clear');
                location.reload();
            } catch (error) {
                UIComponents.showToast('Failed to clear watchlist', 'error');
            }
        }
    }

    startRealTimeUpdates() {
        // Update watchlist stats every 5 minutes
        setInterval(() => {
            this.updateStats();
        }, 5 * 60 * 1000);

        // Check for new recommendations every 10 minutes
        setInterval(() => {
            this.loadRecommendations();
        }, 10 * 60 * 1000);
    }
}

// Initialize watchlist manager
let watchlistManager;
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/user/watchlist') {
        watchlistManager = new WatchlistManager();
        window.WatchlistManager = watchlistManager;
    }
});