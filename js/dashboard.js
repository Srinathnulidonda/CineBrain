// Dashboard-specific functionality
class DashboardManager {
    constructor() {
        this.currentGenre = null;
        this.activityPage = 1;
        this.init();
    }

    init() {
        this.loadUserStats();
        this.loadPersonalizedContent();
        this.loadActivityBasedContent();
        this.loadGenreRecommendations();
        this.loadRecentlyAdded();
        this.loadUserActivity();
        this.startRealTimeUpdates();
    }

    async loadUserStats() {
        try {
            const welcomeMsg = document.getElementById('welcome-message');
            const userStats = document.getElementById('user-stats');

            if (appState.user) {
                welcomeMsg.textContent = `Welcome back, ${appState.user.username}!`;
            }

            // Load user statistics
            const [watchlist, favorites] = await Promise.all([
                ApiService.getWatchlist(),
                ApiService.getFavorites()
            ]);

            document.getElementById('watchlist-count').textContent = watchlist.watchlist.length;
            document.getElementById('favorites-count').textContent = favorites.favorites.length;

            // Load continue watching if available
            if (watchlist.watchlist.length > 0) {
                const continueSection = document.getElementById('continue-watching');
                continueSection.style.display = 'block';
                UIComponents.createCarousel(
                    'Continue Watching',
                    watchlist.watchlist.slice(0, 10),
                    'continue-watching-content'
                );
            }

            userStats.textContent = `${watchlist.watchlist.length} items in watchlist • ${favorites.favorites.length} favorites`;
        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }

    async loadPersonalizedContent() {
        const container = document.getElementById('personalized-content');

        try {
            const response = await ApiService.getPersonalizedRecommendations(20);
            UIComponents.createCarousel(
                'Recommended for You',
                response.recommendations,
                'personalized-content',
                false
            );
        } catch (error) {
            // Fallback to trending if personalized fails
            try {
                const trending = await ApiService.getTrending('all', 20);
                UIComponents.createCarousel(
                    'Trending for You',
                    trending.recommendations,
                    'personalized-content',
                    false
                );
            } catch (fallbackError) {
                UIComponents.showError(container, 'Failed to load recommendations');
            }
        }
    }

    async loadActivityBasedContent() {
        const container = document.getElementById('activity-content');

        try {
            // This would use a specific endpoint for activity-based recommendations
            const response = await ApiService.getTrending('all', 15);
            UIComponents.createCarousel(
                'Based on Your Activity',
                response.recommendations,
                'activity-content',
                false
            );
        } catch (error) {
            UIComponents.showError(container, 'Failed to load activity-based content');
        }
    }

    async loadGenreRecommendations() {
        const tabList = document.getElementById('genre-tab-list');
        const genreContent = document.getElementById('genre-content');

        // Get user's preferred genres or use default
        const userGenres = appState.user?.preferred_genres ?
            JSON.parse(appState.user.preferred_genres) :
            ['Action', 'Comedy', 'Drama', 'Romance'];

        // Create genre tabs
        tabList.innerHTML = userGenres.map(genre =>
            `<button class="tab-button ${genre === userGenres[0] ? 'active' : ''}" 
                     onclick="DashboardManager.switchGenre('${genre}')">${genre}</button>`
        ).join('');

        // Load first genre content
        if (userGenres.length > 0) {
            this.switchGenre(userGenres[0]);
        }
    }

    async switchGenre(genre) {
        this.currentGenre = genre;

        // Update active tab
        document.querySelectorAll('#genre-tab-list .tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === genre);
        });

        const container = document.getElementById('genre-content');
        UIComponents.showLoading(container);

        try {
            const response = await ApiService.getGenreRecommendations(genre.toLowerCase(), 'all', 15);
            UIComponents.createCarousel(
                `${genre} Recommendations`,
                response.recommendations,
                'genre-content',
                false
            );
        } catch (error) {
            UIComponents.showError(container, `Failed to load ${genre} recommendations`);
        }
    }

    async loadRecentlyAdded() {
        const container = document.getElementById('recently-added-content');

        try {
            const response = await ApiService.getNewReleases(null, 'all', 15);
            UIComponents.createCarousel(
                'Recently Added',
                response.recommendations,
                'recently-added-content',
                false
            );
        } catch (error) {
            UIComponents.showError(container, 'Failed to load recently added content');
        }
    }

    async loadUserActivity() {
        const activityList = document.getElementById('activity-list');

        try {
            // Simulate activity data (in real app, this would come from API)
            const activities = [
                { type: 'view', content: 'Movie Title', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
                { type: 'favorite', content: 'TV Show Title', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
                { type: 'watchlist', content: 'Anime Title', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6) }
            ];

            activityList.innerHTML = activities.map(activity => `
                <div class="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
                    <div class="w-8 h-8 bg-primary-blue rounded-full flex items-center justify-center text-sm">
                        ${this.getActivityIcon(activity.type)}
                    </div>
                    <div class="flex-1">
                        <div class="font-medium">${this.getActivityText(activity.type)} "${activity.content}"</div>
                        <div class="text-sm text-muted">${this.formatTimeAgo(activity.timestamp)}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load user activity:', error);
        }
    }

    getActivityIcon(type) {
        const icons = {
            view: '👁️',
            favorite: '❤️',
            watchlist: '📚',
            rating: '⭐'
        };
        return icons[type] || '📱';
    }

    getActivityText(type) {
        const texts = {
            view: 'Watched',
            favorite: 'Added to favorites',
            watchlist: 'Added to watchlist',
            rating: 'Rated'
        };
        return texts[type] || 'Interacted with';
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) return `${minutes} minutes ago`;
        if (hours < 24) return `${hours} hours ago`;
        return `${days} days ago`;
    }

    async refreshRecommendations() {
        UIComponents.showToast('Refreshing recommendations...', 'success');

        // Clear cache for user-specific data
        appState.cache.clear();

        // Reload personalized content
        await this.loadPersonalizedContent();

        UIComponents.showToast('Recommendations updated!', 'success');
    }

    async loadMoreActivity() {
        this.activityPage++;
        // Load more activity data
        UIComponents.showToast('Loading more activity...', 'success');
    }

    startRealTimeUpdates() {
        // Update dashboard data every 10 minutes
        setInterval(() => {
            this.loadUserStats();
            this.loadRecentlyAdded();
        }, 10 * 60 * 1000);

        // Real-time notifications simulation
        this.simulateRealTimeNotifications();
    }

    simulateRealTimeNotifications() {
        // Simulate real-time notifications every 30 seconds
        setInterval(() => {
            const notifications = [
                'New episode of your favorite show is available!',
                'A movie from your watchlist is now trending!',
                'New recommendations based on your activity!',
                'Your friend rated a movie you might like!'
            ];

            const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
            this.showRealTimeNotification(randomNotification);
        }, 30000);
    }

    showRealTimeNotification(message) {
        const container = document.getElementById('real-time-notifications');

        const notification = document.createElement('div');
        notification.className = 'bg-primary-blue text-white p-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0';
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span class="text-sm">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-white/70 hover:text-white">×</button>
            </div>
        `;

        container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/dashboard') {
        window.DashboardManager = new DashboardManager();
    }
});