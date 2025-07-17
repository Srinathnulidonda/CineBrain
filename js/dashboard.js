// Dashboard-specific functionality
class DashboardManager {
    constructor() {
        this.refreshInterval = null;
        this.lastRefresh = null;
        this.autoRefreshEnabled = true;
        
        this.init();
    }
    
    init() {
        if (!requireAuth()) return;
        
        this.setupAutoRefresh();
        this.setupQuickActions();
        this.setupWatchlistManagement();
        this.setupRecommendationFilters();
        this.loadDashboardData();
    }
    
    setupAutoRefresh() {
        // Refresh recommendations every 30 minutes
        this.refreshInterval = setInterval(() => {
            if (this.autoRefreshEnabled && document.visibilityState === 'visible') {
                this.refreshRecommendations();
            }
        }, 30 * 60 * 1000);
        
        // Pause auto-refresh when page is hidden
        document.addEventListener('visibilitychange', () => {
            this.autoRefreshEnabled = document.visibilityState === 'visible';
        });
    }
    
    setupQuickActions() {
        // Preference tuner
        window.openPreferenceTuner = () => {
            openModal('preferenceTunerModal');
            this.loadPreferenceTuner();
        };
        
        window.closePreferenceTuner = () => {
            closeModal('preferenceTunerModal');
        };
        
        window.savePreferences = async () => {
            await this.saveUserPreferences();
        };
        
        // Genre exploration
        window.exploreGenres = () => {
            this.showGenreExplorer();
        };
        
        // Stats viewer
        window.viewStats = () => {
            this.showUserStats();
        };
        
        // Refresh recommendations
        window.refreshRecommendations = () => {
            this.refreshRecommendations();
        };
    }
    
    setupWatchlistManagement() {
        // Watchlist sorting
        const sortSelect = document.getElementById('watchlistSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortWatchlist(e.target.value);
            });
        }
        
        // Clear watchlist
        window.clearWatchlist = () => {
            if (confirm('Are you sure you want to clear your entire watchlist?')) {
                this.clearWatchlist();
            }
        };
        
        // Bulk actions
        this.setupBulkActions();
    }
    
    setupBulkActions() {
        let selectedItems = new Set();
        
        // Toggle selection mode
        window.toggleSelectionMode = () => {
            const isSelectionMode = document.body.classList.toggle('selection-mode');
            
            if (!isSelectionMode) {
                selectedItems.clear();
                document.querySelectorAll('.movie-card.selected').forEach(card => {
                    card.classList.remove('selected');
                });
            }
            
            this.updateBulkActionBar(selectedItems.size);
        };
        
        // Select/deselect item
        window.toggleItemSelection = (itemId) => {
            const card = document.querySelector(`[data-id="${itemId}"]`);
            if (!card) return;
            
            if (selectedItems.has(itemId)) {
                selectedItems.delete(itemId);
                card.classList.remove('selected');
            } else {
                selectedItems.add(itemId);
                card.classList.add('selected');
            }
            
            this.updateBulkActionBar(selectedItems.size);
        };
        
        // Bulk actions
        window.bulkAddToWatchlist = () => {
            this.bulkAction(selectedItems, 'watchlist');
        };
        
        window.bulkAddToFavorites = () => {
            this.bulkAction(selectedItems, 'favorite');
        };
        
        window.bulkRemove = () => {
            this.bulkAction(selectedItems, 'remove');
        };
    }
    
    updateBulkActionBar(count) {
        let actionBar = document.getElementById('bulkActionBar');
        
        if (count > 0) {
            if (!actionBar) {
                actionBar = document.createElement('div');
                actionBar.id = 'bulkActionBar';
                actionBar.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg p-4 shadow-lg z-40';
                document.body.appendChild(actionBar);
            }
            
            actionBar.innerHTML = `
                <div class="flex items-center space-x-4">
                    <span class="text-white">${count} selected</span>
                    <button onclick="bulkAddToWatchlist()" class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-sm">
                        Add to Watchlist
                    </button>
                    <button onclick="bulkAddToFavorites()" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm">
                        Add to Favorites
                    </button>
                    <button onclick="bulkRemove()" class="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-white text-sm">
                        Remove
                    </button>
                    <button onclick="toggleSelectionMode()" class="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-white text-sm">
                        Cancel
                    </button>
                </div>
            `;
        } else if (actionBar) {
            actionBar.remove();
        }
    }
    
    async bulkAction(itemIds, action) {
        try {
            showLoading(true);
            
            const promises = Array.from(itemIds).map(id => {
                switch (action) {
                    case 'watchlist':
                        return this.addToWatchlist(id);
                    case 'favorite':
                        return this.addToFavorites(id);
                    case 'remove':
                        return this.removeFromList(id);
                    default:
                        return Promise.resolve();
                }
            });
            
            await Promise.all(promises);
            
            showToast(`${action} applied to ${itemIds.size} items`, 'success');
            
            // Exit selection mode
            toggleSelectionMode();
            
            // Refresh the current view
            this.refreshCurrentView();
            
        } catch (error) {
            console.error('Bulk action error:', error);
            showToast('Some actions failed. Please try again.', 'error');
        } finally {
            showLoading(false);
        }
    }
    
    setupRecommendationFilters() {
        // Filter by genre
        window.filterByGenre = (genre) => {
            this.filterRecommendations({ genre });
        };
        
        // Filter by content type
        window.filterByType = (type) => {
            this.filterRecommendations({ type });
        };
        
        // Filter by rating
        window.filterByRating = (minRating) => {
            this.filterRecommendations({ minRating });
        };
        
        // Clear filters
        window.clearFilters = () => {
            this.filterRecommendations({});
        };
    }
    
    filterRecommendations(filters) {
        const sections = ['hybridRecommendations', 'recentActivityRecs', 'genreBasedRecs'];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (!section) return;
            
            const cards = section.querySelectorAll('.movie-card');
            
            cards.forEach(card => {
                let show = true;
                
                // Apply filters
                if (filters.genre) {
                    const genres = card.dataset.genres?.split(',') || [];
                    show = show && genres.includes(filters.genre);
                }
                
                if (filters.type) {
                    show = show && card.dataset.type === filters.type;
                }
                
                if (filters.minRating) {
                    const rating = parseFloat(card.dataset.rating) || 0;
                    show = show && rating >= filters.minRating;
                }
                
                card.style.display = show ? 'block' : 'none';
            });
        });
        
        // Update filter indicator
        this.updateFilterIndicator(filters);
    }
    
    updateFilterIndicator(filters) {
        let indicator = document.getElementById('filterIndicator');
        
        const hasFilters = Object.keys(filters).length > 0;
        
        if (hasFilters) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'filterIndicator';
                indicator.className = 'bg-blue-600 text-white px-3 py-1 rounded-full text-sm inline-flex items-center space-x-2';
                
                const recommendationsHeader = document.querySelector('#recommendations h2');
                if (recommendationsHeader) {
                    recommendationsHeader.appendChild(indicator);
                }
            }
            
            const filterTexts = [];
            if (filters.genre) filterTexts.push(`Genre: ${filters.genre}`);
            if (filters.type) filterTexts.push(`Type: ${filters.type}`);
            if (filters.minRating) filterTexts.push(`Rating: ${filters.minRating}+`);
            
            indicator.innerHTML = `
                <span>Filtered: ${filterTexts.join(', ')}</span>
                <button onclick="clearFilters()" class="ml-2 hover:bg-blue-700 rounded-full p-1">
                    <i class="fas fa-times text-xs"></i>
                </button>
            `;
        } else if (indicator) {
            indicator.remove();
        }
    }
    
    async loadDashboardData() {
        try {
            showLoading(true);
            
            // Load all dashboard data in parallel
            const [recommendations, userStats, watchlist, history] = await Promise.all([
                api.getPersonalizedRecommendations(),
                this.getUserStats(),
                this.getWatchlist(),
                this.getWatchHistory()
            ]);
            
            // Update UI
            this.updateUserStats(userStats);
            this.renderRecommendations(recommendations);
            this.renderWatchlist(watchlist);
            this.renderWatchHistory(history);
            
            this.lastRefresh = new Date();
            
        } catch (error) {
            console.error('Dashboard data loading error:', error);
            showToast('Failed to load dashboard data', 'error');
        } finally {
            showLoading(false);
        }
    }
    
    async getUserStats() {
        // In a real app, this would come from the API
        const watchlist = ui.loadFromStorage('watchlist', []);
        const history = ui.loadFromStorage('watchHistory', []);
        const favorites = ui.loadFromStorage('favorites', []);
        
        return {
            watched: history.length,
            watchlist: watchlist.length,
            favorites: favorites.length,
            totalWatchTime: history.length * 120, // Approximate minutes
            favoriteGenre: 'Action', // Would be calculated
            thisWeekWatched: history.filter(item => {
                const watchDate = new Date(item.watched_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return watchDate > weekAgo;
            }).length
        };
    }
    
    updateUserStats(stats) {
        const elements = {
            'watchedCount': stats.watched,
            'watchlistCount': stats.watchlist,
            'favoritesCount': stats.favorites
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                // Animate number change
                this.animateNumber(element, parseInt(element.textContent) || 0, value);
            }
        });
    }
    
    animateNumber(element, from, to) {
        const duration = 1000;
        const steps = 60;
        const stepValue = (to - from) / steps;
        let current = from;
        let step = 0;
        
        const timer = setInterval(() => {
            current += stepValue;
            element.textContent = Math.round(current);
            
            step++;
            if (step >= steps) {
                element.textContent = to;
                clearInterval(timer);
            }
        }, duration / steps);
    }
    
    renderRecommendations(recommendations) {
        const sections = [
            { id: 'hybridRecommendations', data: recommendations.hybrid_recommendations, title: 'Perfect Matches' },
            { id: 'recentActivityRecs', data: recommendations.watch_history_based, title: 'Based on Recent Activity' },
            { id: 'genreBasedRecs', data: recommendations.favorites_based, title: 'More Like What You Love' }
        ];
        
        sections.forEach(section => {
            const container = document.getElementById(section.id);
            if (!container) return;
            
            container.innerHTML = '';
            
            if (!section.data || section.data.length === 0) {
                container.appendChild(ui.createEmptyState(
                    `No ${section.title.toLowerCase()} yet`,
                    'Watch more content to get better recommendations'
                ));
                return;
            }
            
            section.data.forEach(item => {
                const card = createMovieCard(item, { lazy: true });
                
                // Add data attributes for filtering
                card.dataset.genres = item.genre_names?.join(',') || '';
                                card.dataset.type = item.content_type || 'movie';
                card.dataset.rating = item.rating || '0';
                card.dataset.id = item.id;
                
                container.appendChild(card);
            });
        });
    }
    
    async getWatchlist() {
        // In a real app, this would fetch from API
        return ui.loadFromStorage('watchlist', []);
    }
    
    async getWatchHistory() {
        // In a real app, this would fetch from API
        return ui.loadFromStorage('watchHistory', []);
    }
    
    renderWatchlist(watchlist) {
        const container = document.getElementById('watchlistGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (watchlist.length === 0) {
            container.appendChild(ui.createEmptyState(
                'Your watchlist is empty',
                'Add movies and shows you want to watch later',
                'Browse Content',
                () => window.location.href = 'index.html#trending'
            ));
            return;
        }
        
        watchlist.forEach(item => {
            const card = createMovieCard(item, { lazy: true });
            card.dataset.id = item.id;
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.removeFromWatchlist(item.id);
            };
            
            card.classList.add('group');
            card.appendChild(removeBtn);
            container.appendChild(card);
        });
    }
    
    renderWatchHistory(history) {
        const container = document.getElementById('historyGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (history.length === 0) {
            container.appendChild(ui.createEmptyState(
                'No watch history yet',
                'Start watching content to see your history here'
            ));
            return;
        }
        
        // Show only recent 12 items
        history.slice(0, 12).forEach(item => {
            const card = createMovieCard(item, { lazy: true });
            
            // Add watch date overlay
            const dateOverlay = document.createElement('div');
            dateOverlay.className = 'absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded';
            dateOverlay.textContent = new Date(item.watched_at).toLocaleDateString();
            
            card.appendChild(dateOverlay);
            container.appendChild(card);
        });
    }
    
    sortWatchlist(sortBy) {
        const watchlist = ui.loadFromStorage('watchlist', []);
        
        let sorted;
        switch (sortBy) {
            case 'title':
                sorted = watchlist.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'rating':
                sorted = watchlist.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'release':
                sorted = watchlist.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
                break;
            case 'added':
            default:
                sorted = watchlist.sort((a, b) => new Date(b.added_at || 0) - new Date(a.added_at || 0));
                break;
        }
        
        ui.saveToStorage('watchlist', sorted);
        this.renderWatchlist(sorted);
        
        showToast(`Watchlist sorted by ${sortBy}`, 'info');
    }
    
    async removeFromWatchlist(itemId) {
        try {
            const watchlist = ui.loadFromStorage('watchlist', []);
            const filtered = watchlist.filter(item => item.id !== itemId);
            
            ui.saveToStorage('watchlist', filtered);
            
            // Update UI
            this.renderWatchlist(filtered);
            this.updateUserStats(await this.getUserStats());
            
            showToast('Removed from watchlist', 'success');
            
        } catch (error) {
            console.error('Remove from watchlist error:', error);
            showToast('Failed to remove from watchlist', 'error');
        }
    }
    
    clearWatchlist() {
        ui.removeFromStorage('watchlist');
        this.renderWatchlist([]);
        this.updateUserStats({ watched: 0, watchlist: 0, favorites: 0 });
        showToast('Watchlist cleared', 'success');
    }
    
    async addToWatchlist(itemId) {
        try {
            // In a real app, fetch item details from API
            const item = { id: itemId, added_at: new Date().toISOString() };
            
            const watchlist = ui.loadFromStorage('watchlist', []);
            
            if (!watchlist.find(w => w.id === itemId)) {
                watchlist.unshift(item);
                ui.saveToStorage('watchlist', watchlist);
                
                await api.recordInteraction({
                    content_id: itemId,
                    interaction_type: 'wishlist'
                });
            }
            
        } catch (error) {
            console.error('Add to watchlist error:', error);
            throw error;
        }
    }
    
    async addToFavorites(itemId) {
        try {
            const favorites = ui.loadFromStorage('favorites', []);
            
            if (!favorites.find(f => f.id === itemId)) {
                favorites.unshift({ id: itemId, added_at: new Date().toISOString() });
                ui.saveToStorage('favorites', favorites);
                
                await api.recordInteraction({
                    content_id: itemId,
                    interaction_type: 'favorite'
                });
            }
            
        } catch (error) {
            console.error('Add to favorites error:', error);
            throw error;
        }
    }
    
    async removeFromList(itemId) {
        try {
            // Remove from all lists
            ['watchlist', 'favorites', 'watchHistory'].forEach(listName => {
                const list = ui.loadFromStorage(listName, []);
                const filtered = list.filter(item => item.id !== itemId);
                ui.saveToStorage(listName, filtered);
            });
            
        } catch (error) {
            console.error('Remove from list error:', error);
            throw error;
        }
    }
    
    async refreshRecommendations() {
        try {
            showToast('Refreshing recommendations...', 'info');
            
            const recommendations = await api.getPersonalizedRecommendations();
            this.renderRecommendations(recommendations);
            
            this.lastRefresh = new Date();
            showToast('Recommendations updated!', 'success');
            
        } catch (error) {
            console.error('Refresh recommendations error:', error);
            showToast('Failed to refresh recommendations', 'error');
        }
    }
    
    refreshCurrentView() {
        // Refresh the currently visible section
        const activeSection = document.querySelector('section:not(.hidden)');
        if (!activeSection) return;
        
        const sectionId = activeSection.id;
        
        switch (sectionId) {
            case 'watchlist':
                this.renderWatchlist(ui.loadFromStorage('watchlist', []));
                break;
            case 'history':
                this.renderWatchHistory(ui.loadFromStorage('watchHistory', []));
                break;
            case 'recommendations':
                this.refreshRecommendations();
                break;
        }
    }
    
    loadPreferenceTuner() {
        const preferences = ui.loadFromStorage('userPreferences', {
            genres: [],
            contentTypes: [],
            languages: []
        });
        
        // Load genre preferences
        const genreContainer = document.getElementById('genrePreferences');
        if (genreContainer) {
            const genres = [
                'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
                'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
                'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
                'Thriller', 'War', 'Western'
            ];
            
            genreContainer.innerHTML = genres.map(genre => `
                <label class="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-800 transition-colors">
                    <input type="checkbox" 
                           class="form-checkbox text-red-600" 
                           value="${genre}"
                           ${preferences.genres.includes(genre) ? 'checked' : ''}>
                    <span class="text-sm">${genre}</span>
                </label>
            `).join('');
        }
        
        // Load content type preferences
        const contentTypes = [
            { id: 'prefMovies', label: 'Movies', value: 'Movies' },
            { id: 'prefTVShows', label: 'TV Shows', value: 'TV Shows' },
            { id: 'prefAnime', label: 'Anime', value: 'Anime' },
            { id: 'prefDocumentaries', label: 'Documentaries', value: 'Documentaries' }
        ];
        
        contentTypes.forEach(type => {
            const checkbox = document.getElementById(type.id);
            if (checkbox) {
                checkbox.checked = preferences.contentTypes.includes(type.value);
            }
        });
        
        // Load language preferences
        const languages = [
            { id: 'langEnglish', label: 'English', value: 'English' },
            { id: 'langHindi', label: 'Hindi', value: 'Hindi' },
            { id: 'langTelugu', label: 'Telugu', value: 'Telugu' },
            { id: 'langTamil', label: 'Tamil', value: 'Tamil' }
        ];
        
        languages.forEach(lang => {
            const checkbox = document.getElementById(lang.id);
            if (checkbox) {
                checkbox.checked = preferences.languages.includes(lang.value);
            }
        });
    }
    
    async saveUserPreferences() {
        try {
            const preferences = {
                genres: [],
                contentTypes: [],
                languages: []
            };
            
            // Collect genre preferences
            document.querySelectorAll('#genrePreferences input:checked').forEach(input => {
                preferences.genres.push(input.value);
            });
            
            // Collect content type preferences
            const contentTypeIds = ['prefMovies', 'prefTVShows', 'prefAnime', 'prefDocumentaries'];
            const contentTypeValues = ['Movies', 'TV Shows', 'Anime', 'Documentaries'];
            
            contentTypeIds.forEach((id, index) => {
                const checkbox = document.getElementById(id);
                if (checkbox?.checked) {
                    preferences.contentTypes.push(contentTypeValues[index]);
                }
            });
            
            // Collect language preferences
            const languageIds = ['langEnglish', 'langHindi', 'langTelugu', 'langTamil'];
            const languageValues = ['English', 'Hindi', 'Telugu', 'Tamil'];
            
            languageIds.forEach((id, index) => {
                const checkbox = document.getElementById(id);
                if (checkbox?.checked) {
                    preferences.languages.push(languageValues[index]);
                }
            });
            
            // Save preferences
            ui.saveToStorage('userPreferences', preferences);
            
            // Close modal
            closeModal('preferenceTunerModal');
            
            showToast('Preferences saved! Your recommendations will be updated.', 'success');
            
            // Refresh recommendations after a short delay
            setTimeout(() => {
                this.refreshRecommendations();
            }, 1000);
            
        } catch (error) {
            console.error('Save preferences error:', error);
            showToast('Failed to save preferences', 'error');
        }
    }
    
    showGenreExplorer() {
        // Create and show genre explorer modal
        const modal = document.createElement('div');
        modal.id = 'genreExplorerModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold">Explore Genres</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${this.getGenreCards()}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    getGenreCards() {
        const genres = [
            { name: 'Action', icon: 'fas fa-fist-raised', color: 'bg-red-600' },
            { name: 'Comedy', icon: 'fas fa-laugh', color: 'bg-yellow-600' },
            { name: 'Drama', icon: 'fas fa-theater-masks', color: 'bg-blue-600' },
            { name: 'Horror', icon: 'fas fa-ghost', color: 'bg-purple-600' },
            { name: 'Romance', icon: 'fas fa-heart', color: 'bg-pink-600' },
            { name: 'Sci-Fi', icon: 'fas fa-rocket', color: 'bg-green-600' },
            { name: 'Thriller', icon: 'fas fa-eye', color: 'bg-gray-600' },
            { name: 'Animation', icon: 'fas fa-palette', color: 'bg-orange-600' }
        ];
        
        return genres.map(genre => `
            <div class="genre-card ${genre.color} p-4 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform"
                 onclick="filterByGenre('${genre.name}'); this.closest('.fixed').remove();">
                <i class="${genre.icon} text-3xl mb-2"></i>
                <h4 class="font-semibold">${genre.name}</h4>
            </div>
        `).join('');
    }
    
    showUserStats() {
        // Create and show detailed stats modal
        const modal = document.createElement('div');
        modal.id = 'userStatsModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold">Your Statistics</h3>
                                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-6">
                    ${this.generateStatsContent()}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    generateStatsContent() {
        const watchHistory = ui.loadFromStorage('watchHistory', []);
        const watchlist = ui.loadFromStorage('watchlist', []);
        const favorites = ui.loadFromStorage('favorites', []);
        
        // Calculate stats
        const totalWatched = watchHistory.length;
        const totalWatchTime = totalWatched * 120; // Approximate minutes
        const thisWeekWatched = watchHistory.filter(item => {
            const watchDate = new Date(item.watched_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return watchDate > weekAgo;
        }).length;
        
        const thisMonthWatched = watchHistory.filter(item => {
            const watchDate = new Date(item.watched_at);
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return watchDate > monthAgo;
        }).length;
        
        return `
            <div class="grid grid-cols-2 gap-4">
                <div class="stat-card bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-red-400">${totalWatched}</div>
                    <div class="text-sm text-gray-400">Total Watched</div>
                </div>
                <div class="stat-card bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-blue-400">${Math.round(totalWatchTime / 60)}h</div>
                    <div class="text-sm text-gray-400">Watch Time</div>
                </div>
                <div class="stat-card bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-green-400">${thisWeekWatched}</div>
                    <div class="text-sm text-gray-400">This Week</div>
                </div>
                <div class="stat-card bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-yellow-400">${thisMonthWatched}</div>
                    <div class="text-sm text-gray-400">This Month</div>
                </div>
            </div>
            
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="font-semibold mb-3">Activity Overview</h4>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>Watchlist Items:</span>
                        <span class="font-semibold">${watchlist.length}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Favorite Items:</span>
                        <span class="font-semibold">${favorites.length}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Average Rating:</span>
                        <span class="font-semibold">4.2/5</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Most Watched Genre:</span>
                        <span class="font-semibold">Action</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="font-semibold mb-3">Recent Activity</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                    ${watchHistory.slice(0, 5).map(item => `
                        <div class="flex justify-between text-sm">
                            <span class="truncate">Movie Title</span>
                            <span class="text-gray-400">${new Date(item.watched_at).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Cleanup
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

// Initialize dashboard manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        window.dashboardManager = new DashboardManager();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboardManager) {
        window.dashboardManager.destroy();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}