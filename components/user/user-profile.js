// Optimized User Profile Component
class UserProfile {
    constructor(userId) {
        this.userId = userId;
        this.profileData = null;
        this.preferences = null;
    }

    async loadProfile() {
        try {
            const response = await API.request(`/user/${this.userId}/profile`);
            this.profileData = response.profile;
            this.preferences = response.preferences;
            return this.profileData;
        } catch (error) {
            console.error('Failed to load profile:', error);
            return null;
        }
    }

    render() {
        if (!this.profileData) {
            return this.renderSkeleton();
        }

        return `
            <div class="user-profile-component">
                ${this.renderHeader()}
                ${this.renderStats()}
                ${this.renderPreferences()}
                ${this.renderActivity()}
            </div>
        `;
    }

    renderHeader() {
        const { username, email, created_at, avatar_url } = this.profileData;
        const memberSince = new Date(created_at).getFullYear();

        return `
            <div class="profile-header-card bg-gradient-to-r from-netflix-red to-dark-red rounded-lg p-8 mb-8">
                <div class="flex items-center space-x-6">
                    <div class="avatar-container">
                        ${avatar_url ? `
                            <img src="${avatar_url}" alt="${username}" 
                                 class="w-24 h-24 rounded-full border-4 border-white">
                        ` : `
                            <div class="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-4xl text-white"></i>
                            </div>
                        `}
                    </div>
                    <div class="text-white">
                        <h2 class="text-3xl font-bold mb-2">${username}</h2>
                        <p class="text-white/80">${email}</p>
                        <p class="text-sm text-white/60 mt-2">Member since ${memberSince}</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderStats() {
        const stats = this.profileData.stats || {};
        
        return `
            <div class="profile-stats grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                ${this.renderStatCard('Watched', stats.watched || 0, 'fa-play-circle', 'text-netflix-red')}
                ${this.renderStatCard('Favorites', stats.favorites || 0, 'fa-heart', 'text-red-500')}
                ${this.renderStatCard('Rated', stats.rated || 0, 'fa-star', 'text-yellow-500')}
                ${this.renderStatCard('Watchlist', stats.watchlist || 0, 'fa-bookmark', 'text-blue-500')}
            </div>
        `;
    }

    renderStatCard(label, value, icon, iconColor) {
        return `
            <div class="stat-card bg-card-bg rounded-lg p-6 text-center hover:scale-105 transition-transform">
                <i class="fas ${icon} text-3xl ${iconColor} mb-3"></i>
                <p class="text-2xl font-bold">${value}</p>
                <p class="text-text-secondary text-sm">${label}</p>
            </div>
        `;
    }

    renderPreferences() {
        if (!this.preferences) return '';

        const { favorite_genres = [], preferred_languages = [], content_ratings = [] } = this.preferences;

        return `
            <div class="profile-preferences bg-card-bg rounded-lg p-6 mb-8">
                <h3 class="text-xl font-bold mb-4">Preferences</h3>
                
                ${favorite_genres.length > 0 ? `
                    <div class="mb-4">
                        <p class="text-sm text-text-secondary mb-2">Favorite Genres</p>
                        <div class="flex flex-wrap gap-2">
                            ${favorite_genres.map(genre => `
                                <span class="px-3 py-1 bg-netflix-red/20 text-netflix-red rounded-full text-sm">
                                    ${genre}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${preferred_languages.length > 0 ? `
                    <div class="mb-4">
                        <p class="text-sm text-text-secondary mb-2">Languages</p>
                        <div class="flex flex-wrap gap-2">
                            ${preferred_languages.map(lang => `
                                <span class="px-3 py-1 bg-secondary-bg rounded text-sm">
                                    ${lang}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderActivity() {
        const recentActivity = this.profileData.recent_activity || [];
        
        if (recentActivity.length === 0) {
            return '';
        }

        return `
            <div class="profile-activity bg-card-bg rounded-lg p-6">
                <h3 class="text-xl font-bold mb-4">Recent Activity</h3>
                <div class="space-y-3">
                    ${recentActivity.slice(0, 5).map(activity => this.renderActivityItem(activity)).join('')}
                </div>
            </div>
        `;
    }

    renderActivityItem(activity) {
        const { type, content_title, timestamp } = activity;
        const timeAgo = this.getTimeAgo(timestamp);
        
        const icons = {
            'watch': 'fa-play',
            'rate': 'fa-star',
            'favorite': 'fa-heart',
            'wishlist': 'fa-bookmark'
        };

        return `
            <div class="activity-item flex items-center justify-between py-2 border-b border-border-color last:border-0">
                <div class="flex items-center space-x-3">
                    <i class="fas ${icons[type] || 'fa-circle'} text-text-muted"></i>
                    <div>
                        <p class="text-sm">${this.getActivityText(type, content_title)}</p>
                        <p class="text-xs text-text-muted">${timeAgo}</p>
                    </div>
                </div>
            </div>
        `;
    }

    getActivityText(type, title) {
        const actions = {
            'watch': 'Watched',
            'rate': 'Rated',
            'favorite': 'Added to favorites',
            'wishlist': 'Added to watchlist'
        };
        return `${actions[type] || 'Interacted with'} ${title}`;
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, value] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / value);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    }

    renderSkeleton() {
        return `
            <div class="user-profile-skeleton">
                <div class="bg-card-bg rounded-lg p-8 mb-8 animate-pulse">
                    <div class="flex items-center space-x-6">
                        <div class="w-24 h-24 bg-secondary-bg rounded-full"></div>
                        <div>
                            <div class="h-8 w-48 bg-secondary-bg rounded mb-2"></div>
                            <div class="h-4 w-32 bg-secondary-bg rounded"></div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${Array(4).fill('').map(() => `
                        <div class="bg-card-bg rounded-lg p-6 animate-pulse">
                            <div class="h-12 w-12 bg-secondary-bg rounded-full mx-auto mb-3"></div>
                            <div class="h-6 w-16 bg-secondary-bg rounded mx-auto"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async updatePreferences(newPreferences) {
        try {
            await API.request(`/user/${this.userId}/preferences`, {
                method: 'PUT',
                body: JSON.stringify(newPreferences)
            });
            this.preferences = { ...this.preferences, ...newPreferences };
            return true;
        } catch (error) {
            console.error('Failed to update preferences:', error);
            return false;
        }
    }
}