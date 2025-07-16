// Profile Page
class ProfilePage {
    constructor() {
        this.user = AuthService.getUser();
        this.stats = null;
        this.watchlist = [];
        this.favorites = [];
        this.activeTab = 'overview';
    }

    async init() {
        if (!AuthService.isAuthenticated()) {
            window.location.href = '/';
            return;
        }

        try {
            Loading.show();
            await this.loadUserData();
            this.render();
        } catch (error) {
            console.error('Failed to load profile:', error);
            new Toast('Failed to load profile data', 'error').show();
        } finally {
            Loading.hide();
        }
    }

    async loadUserData() {
        // Load user interactions
        const interactions = await API.request('/user/interactions');
        
        // Organize data
        this.watchlist = interactions.filter(i => i.interaction_type === 'wishlist');
        this.favorites = interactions.filter(i => i.interaction_type === 'favorite');
        
        // Calculate stats
        this.stats = {
            totalWatched: interactions.filter(i => i.interaction_type === 'view').length,
            totalRated: interactions.filter(i => i.rating).length,
            averageRating: this.calculateAverageRating(interactions),
            favoriteGenres: this.calculateFavoriteGenres(interactions)
        };
    }

    calculateAverageRating(interactions) {
        const rated = interactions.filter(i => i.rating);
        if (rated.length === 0) return 0;
        
        const sum = rated.reduce((acc, i) => acc + i.rating, 0);
        return (sum / rated.length).toFixed(1);
    }

    calculateFavoriteGenres(interactions) {
        const genreCounts = {};
        
        interactions.forEach(interaction => {
            if (interaction.content && interaction.content.genres) {
                interaction.content.genres.forEach(genre => {
                    const genreName = GENRE_MAP[genre] || genre;
                    genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
                });
            }
        });
        
        return Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre]) => genre);
    }

    render() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="profile-page">
                <!-- Header -->
                <div class="bg-secondary-bg">
                    <div class="container mx-auto px-4 py-8">
                        <div class="flex items-center space-x-6">
                            <div class="w-24 h-24 bg-netflix-red rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-4xl"></i>
                            </div>
                            <div>
                                <h1 class="text-3xl font-bold mb-2">${this.user.username}</h1>
                                <p class="text-text-secondary">Member since ${new Date().getFullYear()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="border-b border-border-color">
                    <div class="container mx-auto px-4">
                        <div class="flex space-x-8">
                            <button onclick="ProfilePageInstance.setTab('overview')" 
                                    class="py-4 border-b-2 ${this.activeTab === 'overview' ? 'border-netflix-red text-netflix-red' : 'border-transparent'} transition">
                                Overview
                            </button>
                            <button onclick="ProfilePageInstance.setTab('watchlist')" 
                                    class="py-4 border-b-2 ${this.activeTab === 'watchlist' ? 'border-netflix-red text-netflix-red' : 'border-transparent'} transition">
                                Watchlist
                            </button>
                            <button onclick="ProfilePageInstance.setTab('favorites')" 
                                    class="py-4 border-b-2 ${this.activeTab === 'favorites' ? 'border-netflix-red text-netflix-red' : 'border-transparent'} transition">
                                Favorites
                            </button>
                            <button onclick="ProfilePageInstance.setTab('settings')" 
                                    class="py-4 border-b-2 ${this.activeTab === 'settings' ? 'border-netflix-red text-netflix-red' : 'border-transparent'} transition">
                                Settings
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="container mx-auto px-4 py-8">
                    ${this.renderTabContent()}
                </div>
            </div>
        `;
    }

    renderTabContent() {
        switch (this.activeTab) {
            case 'overview':
                return this.renderOverview();
            case 'watchlist':
                return this.renderWatchlist();
            case 'favorites':
                return this.renderFavorites();
            case 'settings':
                return this.renderSettings();
            default:
                return '';
        }
    }

    renderOverview() {
        return `
            <div class="overview">
                <!-- Stats Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <div class="bg-card-bg rounded-lg p-6 text-center">
                        <i class="fas fa-play-circle text-3xl text-netflix-red mb-3"></i>
                        <p class="text-2xl font-bold">${this.stats.totalWatched}</p>
                        <p class="text-text-secondary text-sm">Watched</p>
                    </div>
                    <div class="bg-card-bg rounded-lg p-6 text-center">
                        <i class="fas fa-star text-3xl text-yellow-500 mb-3"></i>
                        <p class="text-2xl font-bold">${this.stats.totalRated}</p>
                        <p class="text-text-secondary text-sm">Rated</p>
                    </div>
                    <div class="bg-card-bg rounded-lg p-6 text-center">
                        <i class="fas fa-heart text-3xl text-netflix-red mb-3"></i>
                        <p class="text-2xl font-bold">${this.favorites.length}</p>
                        <p class="text-text-secondary text-sm">Favorites</p>
                    </div>
                    <div class="bg-card-bg rounded-lg p-6 text-center">
                        <i class="fas fa-list text-3xl text-netflix-red mb-3"></i>
                        <p class="text-2xl font-bold">${this.watchlist.length}</p>
                        <p class="text-text-secondary text-sm">Watchlist</p>
                    </div>
                </div>

                <!-- Favorite Genres -->
                ${this.stats.favoriteGenres.length > 0 ? `
                    <div class="mb-12">
                        <h2 class="text-xl font-bold mb-4">Your Favorite Genres</h2>
                        <div class="flex flex-wrap gap-2">
                            ${this.stats.favoriteGenres.map(genre => `
                                <span class="px-4 py-2 bg-netflix-red rounded-full text-sm">
                                    ${genre}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Recent Activity -->
                <div>
                    <h2 class="text-xl font-bold mb-4">Recent Activity</h2>
                    <div class="space-y-4">
                        ${this.renderRecentActivity()}
                    </div>
                </div>
            </div>
        `;
    }

    renderWatchlist() {
        if (this.watchlist.length === 0) {
            return `
                <div class="text-center py-16">
                    <i class="fas fa-bookmark text-6xl text-text-muted mb-4"></i>
                    <p class="text-text-secondary mb-6">Your watchlist is empty</p>
                    <a href="/" class="bg-netflix-red hover:bg-hover-red px-6 py-3 rounded font-medium transition">
                        Browse Content
                    </a>
                </div>
            `;
        }

        return new ContentGrid(this.watchlist.map(i => i.content), {
            emptyMessage: 'No items in watchlist'
        }).render();
    }

    renderFavorites() {
        if (this.favorites.length === 0) {
            return `
                <div class="text-center py-16">
                    <i class="fas fa-heart text-6xl text-text-muted mb-4"></i>
                    <p class="text-text-secondary mb-6">You haven't added any favorites yet</p>
                    <a href="/" class="bg-netflix-red hover:bg-hover-red px-6 py-3 rounded font-medium transition">
                        Discover Content
                    </a>
                </div>
            `;
        }

        return new ContentGrid(this.favorites.map(i => i.content), {
            emptyMessage: 'No favorites yet'
        }).render();
    }

    renderSettings() {
        return `
            <div class="settings max-w-2xl">
                <h2 class="text-xl font-bold mb-6">Account Settings</h2>
                
                <!-- Email Preferences -->
                <div class="bg-card-bg rounded-lg p-6 mb-6">
                    <h3 class="font-bold mb-4">Email Preferences</h3>
                    <label class="flex items-center mb-3">
                        <input type="checkbox" class="mr-3 accent-netflix-red" checked>
                        <span>Weekly recommendations</span>
                    </label>
                    <label class="flex items-center mb-3">
                        <input type="checkbox" class="mr-3 accent-netflix-red">
                        <span>New releases in favorite genres</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="mr-3 accent-netflix-red" checked>
                        <span>Account updates</span>
                    </label>
                </div>

                <!-- Privacy Settings -->
                <div class="bg-card-bg rounded-lg p-6 mb-6">
                    <h3 class="font-bold mb-4">Privacy</h3>
                    <label class="flex items-center mb-3">
                        <input type="checkbox" class="mr-3 accent-netflix-red" checked>
                        <span>Show activity to other users</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="mr-3 accent-netflix-red">
                        <span>Use my data for recommendations</span>
                    </label>
                </div>

                <!-- Account Actions -->
                <div class="bg-card-bg rounded-lg p-6">
                    <h3 class="font-bold mb-4">Account</h3>
                    <button class="bg-secondary-bg hover:bg-hover-bg px-6 py-3 rounded mb-3 w-full text-left transition">
                        Change Password
                    </button>
                    <button class="bg-secondary-bg hover:bg-hover-bg px-6 py-3 rounded mb-3 w-full text-left transition">
                        Download My Data
                    </button>
                    <button onclick="AuthService.logout()" class="bg-netflix-red hover:bg-hover-red px-6 py-3 rounded w-full transition">
                        Sign Out
                    </button>
                </div>
            </div>
        `;
    }

    renderRecentActivity() {
        // Mock recent activity
        return `<p class="text-text-secondary">No recent activity</p>`;
    }

    setTab(tab) {
        this.activeTab = tab;
        this.render();
    }
}

const ProfilePageInstance = new ProfilePage();