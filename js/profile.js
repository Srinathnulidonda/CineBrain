// Profile management functionality
class ProfileManager {
    constructor() {
        this.currentTab = 'preferences';
        this.init();
    }

    init() {
        this.setupTabs();
        this.loadUserProfile();
        this.loadUserPreferences();
        this.loadUserActivity();
        this.loadRecommendationSettings();
    }

    setupTabs() {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        this.currentTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn =>
            btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content =>
            content.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');

        // Load content for active tab
        switch (tabId) {
            case 'activity':
                this.loadUserActivity();
                break;
            case 'recommendations':
                this.loadTasteProfile();
                break;
            case 'settings':
                this.loadAccountSettings();
                break;
        }
    }

    async loadUserProfile() {
        try {
            if (appState.user) {
                const user = appState.user;

                // Update profile header
                document.getElementById('user-name').textContent = user.username;
                document.getElementById('user-email').textContent = user.email;
                document.getElementById('user-initials').textContent =
                    user.username.substring(0, 1).toUpperCase();

                // Update profile stats
                const [watchlist, favorites] = await Promise.all([
                    ApiService.getWatchlist(),
                    ApiService.getFavorites()
                ]);

                document.getElementById('profile-watchlist-count').textContent = watchlist.watchlist.length;
                document.getElementById('profile-favorites-count').textContent = favorites.favorites.length;

                // Calculate member since
                const memberSince = new Date(user.created_at || Date.now()).getFullYear();
                document.getElementById('profile-member-since').textContent = memberSince;

                // Update navigation name
                const navNameElement = document.getElementById('user-name-nav');
                if (navNameElement) {
                    navNameElement.textContent = user.username;
                }
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }

    async loadUserPreferences() {
        try {
            const user = appState.user;
            if (!user) return;

            // Load language preferences
            const languages = ['english', 'hindi', 'telugu', 'tamil', 'kannada', 'malayalam'];
            const userLanguages = user.preferred_languages || [];

            const languageContainer = document.getElementById('language-preferences');
            languageContainer.innerHTML = languages.map(lang => `
                <label class="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg cursor-pointer hover:bg-bg-secondary">
                    <input type="checkbox" name="languages" value="${lang}" 
                           ${userLanguages.includes(lang) ? 'checked' : ''} 
                           class="w-4 h-4 text-primary-blue">
                    <span class="capitalize">${lang}</span>
                </label>
            `).join('');

            // Load genre preferences
            const genres = ['Action', 'Comedy', 'Drama', 'Romance', 'Thriller', 'Horror', 'Sci-Fi', 'Fantasy'];
            const userGenres = user.preferred_genres || [];

            const genreContainer = document.getElementById('genre-preferences');
            genreContainer.innerHTML = genres.map(genre => `
                <label class="flex items-center gap-2">
                    <input type="checkbox" name="genres" value="${genre}" 
                           ${userGenres.includes(genre) ? 'checked' : ''} 
                           class="w-4 h-4 text-primary-blue">
                    <span class="text-sm">${genre}</span>
                </label>
            `).join('');

        } catch (error) {
            console.error('Failed to load user preferences:', error);
        }
    }

    async loadUserActivity() {
        try {
            // Simulate activity data
            const activities = [
                { type: 'view', content: 'Avengers: Endgame', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
                { type: 'favorite', content: 'Breaking Bad', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
                { type: 'watchlist', content: 'Attack on Titan', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6) },
                { type: 'rating', content: 'The Office', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12) }
            ];

            // Update activity summary
            document.getElementById('activity-views').textContent = Math.floor(Math.random() * 100) + 50;
            document.getElementById('activity-ratings').textContent = Math.floor(Math.random() * 20) + 10;
            document.getElementById('activity-this-month').textContent = Math.floor(Math.random() * 30) + 15;
            document.getElementById('activity-streak').textContent = Math.floor(Math.random() * 7) + 1;

            // Update recent activity
            const activityList = document.getElementById('recent-activity-list');
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

    async loadTasteProfile() {
        const container = document.getElementById('taste-profile');

        try {
            // Simulate AI taste analysis
            const tasteProfile = {
                primaryGenres: ['Action', 'Sci-Fi', 'Thriller'],
                contentTypes: { movies: 60, tv: 30, anime: 10 },
                moodProfile: 'Adventure Seeker',
                recommendations: 'Based on your viewing history, you enjoy fast-paced content with complex storylines.'
            };

            container.innerHTML = `
                <div class="space-y-6">
                    <div>
                        <h4 class="font-medium mb-3">Your Viewing Profile</h4>
                        <div class="p-4 bg-bg-tertiary rounded-lg">
                            <div class="text-lg font-semibold text-primary-blue mb-2">${tasteProfile.moodProfile}</div>
                            <p class="text-secondary">${tasteProfile.recommendations}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-medium mb-3">Content Distribution</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <span>Movies</span>
                                <div class="flex items-center gap-2">
                                    <div class="w-24 h-2 bg-bg-secondary rounded-full overflow-hidden">
                                        <div class="h-full bg-primary-blue" style="width: ${tasteProfile.contentTypes.movies}%"></div>
                                    </div>
                                    <span class="text-sm text-muted">${tasteProfile.contentTypes.movies}%</span>
                                </div>
                            </div>
                            <div class="flex justify-between items-center">
                                <span>TV Shows</span>
                                <div class="flex items-center gap-2">
                                    <div class="w-24 h-2 bg-bg-secondary rounded-full overflow-hidden">
                                        <div class="h-full bg-primary-purple" style="width: ${tasteProfile.contentTypes.tv}%"></div>
                                    </div>
                                    <span class="text-sm text-muted">${tasteProfile.contentTypes.tv}%</span>
                                </div>
                            </div>
                            <div class="flex justify-between items-center">
                                <span>Anime</span>
                                <div class="flex items-center gap-2">
                                    <div class="w-24 h-2 bg-bg-secondary rounded-full overflow-hidden">
                                        <div class="h-full bg-success" style="width: ${tasteProfile.contentTypes.anime}%"></div>
                                    </div>
                                    <span class="text-sm text-muted">${tasteProfile.contentTypes.anime}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Failed to load taste profile:', error);
            container.innerHTML = '<p class="text-error">Failed to load taste profile</p>';
        }
    }

    loadAccountSettings() {
        if (appState.user) {
            document.getElementById('settings-username').value = appState.user.username;
            document.getElementById('settings-email').value = appState.user.email;
        }
    }

    loadRecommendationSettings() {
        // Load saved settings or use defaults
        document.getElementById('personalized-recs').checked = true;
        document.getElementById('adult-content').checked = false;
        document.getElementById('regional-priority').checked = true;
        document.getElementById('activity-tracking').checked = true;
    }

    async updateLanguages() {
        try {
            const selectedLanguages = Array.from(
                document.querySelectorAll('input[name="languages"]:checked')
            ).map(input => input.value);

            // Update user preferences via API
            await ApiService.put('/user/preferences', {
                preferred_languages: selectedLanguages
            });

            UIComponents.showToast('Language preferences updated!', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to update languages', 'error');
        }
    }

    async updateGenres() {
        try {
            const selectedGenres = Array.from(
                document.querySelectorAll('input[name="genres"]:checked')
            ).map(input => input.value);

            await ApiService.put('/user/preferences', {
                preferred_genres: selectedGenres
            });

            UIComponents.showToast('Genre preferences updated!', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to update genres', 'error');
        }
    }

    async updateContentPreferences() {
        try {
            const preferences = {
                movies: document.getElementById('movies-preference').value,
                tv: document.getElementById('tv-preference').value,
                anime: document.getElementById('anime-preference').value
            };

            await ApiService.put('/user/content-preferences', preferences);
            UIComponents.showToast('Content preferences updated!', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to update preferences', 'error');
        }
    }

    async updateRecommendationSettings() {
        try {
            const settings = {
                personalized: document.getElementById('personalized-recs').checked,
                adult_content: document.getElementById('adult-content').checked,
                regional_priority: document.getElementById('regional-priority').checked
            };

            await ApiService.put('/user/recommendation-settings', settings);
            UIComponents.showToast('Recommendation settings saved!', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to save settings', 'error');
        }
    }

    async updateAccountInfo() {
        try {
            const email = document.getElementById('settings-email').value;

            await ApiService.put('/user/account', { email });
            UIComponents.showToast('Account information updated!', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to update account', 'error');
        }
    }

    showEditModal() {
        const content = `
            <form id="edit-profile-form" class="space-y-4">
                <div class="form-group">
                    <label class="form-label">Display Name</label>
                    <input type="text" id="edit-username" class="form-input" value="${appState.user?.username || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="edit-email" class="form-input" value="${appState.user?.email || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Bio</label>
                    <textarea id="edit-bio" class="form-input" rows="3" placeholder="Tell us about yourself..."></textarea>
                </div>
            </form>
        `;

        const actions = `
            <button onclick="ProfileManager.saveProfile()" class="btn btn-primary">Save Changes</button>
            <button onclick="UIComponents.closeModal(document.querySelector('.modal-overlay').id)" class="btn btn-secondary">Cancel</button>
        `;

        UIComponents.createModal('Edit Profile', content, actions);
    }

    async saveProfile() {
        try {
            const formData = {
                username: document.getElementById('edit-username').value,
                email: document.getElementById('edit-email').value,
                bio: document.getElementById('edit-bio').value
            };

            await ApiService.put('/user/profile', formData);

            // Update local state
            appState.user = { ...appState.user, ...formData };

            // Refresh profile display
            this.loadUserProfile();

            UIComponents.closeModal(document.querySelector('.modal-overlay').id);
            UIComponents.showToast('Profile updated successfully!', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to update profile', 'error');
        }
    }

    showChangePasswordModal() {
        const content = `
            <form id="change-password-form" class="space-y-4">
                <div class="form-group">
                    <label class="form-label">Current Password</label>
                    <input type="password" id="current-password" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">New Password</label>
                    <input type="password" id="new-password" class="form-input" required minlength="6">
                </div>
                <div class="form-group">
                    <label class="form-label">Confirm New Password</label>
                    <input type="password" id="confirm-password" class="form-input" required>
                </div>
            </form>
        `;

        const actions = `
            <button onclick="ProfileManager.changePassword()" class="btn btn-primary">Change Password</button>
            <button onclick="UIComponents.closeModal(document.querySelector('.modal-overlay').id)" class="btn btn-secondary">Cancel</button>
        `;

        UIComponents.createModal('Change Password', content, actions);
    }

    async changePassword() {
        try {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                UIComponents.showToast('Passwords do not match', 'error');
                return;
            }

            await ApiService.post('/user/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });

            UIComponents.closeModal(document.querySelector('.modal-overlay').id);
            UIComponents.showToast('Password changed successfully!', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to change password', 'error');
        }
    }

    async exportData() {
        try {
            const response = await ApiService.get('/user/export-data');

            const blob = new Blob([JSON.stringify(response, null, 2)],
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `cinescope-data-${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
            UIComponents.showToast('Data export started!', 'success');
        } catch (error) {
            UIComponents.showToast('Failed to export data', 'error');
        }
    }

    async clearAllData() {
        const confirmed = confirm('Are you sure you want to clear all your data? This action cannot be undone.');

        if (confirmed) {
            try {
                await ApiService.delete('/user/clear-data');
                UIComponents.showToast('All data cleared successfully', 'success');

                // Refresh the page
                setTimeout(() => location.reload(), 2000);
            } catch (error) {
                UIComponents.showToast('Failed to clear data', 'error');
            }
        }
    }

    async deleteAccount() {
        const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');

        if (confirmed) {
            const doubleConfirm = confirm('This will permanently delete your account and all associated data. Are you absolutely sure?');

            if (doubleConfirm) {
                try {
                    await ApiService.delete('/user/account');
                    UIComponents.showToast('Account deleted successfully', 'success');

                    // Logout and redirect
                    setTimeout(() => {
                        AuthManager.logout();
                    }, 2000);
                } catch (error) {
                    UIComponents.showToast('Failed to delete account', 'error');
                }
            }
        }
    }

    getActivityIcon(type) {
        const icons = {
            view: '👁️',
            favorite: '❤️',
            watchlist: '📚',
            rating: '⭐',
            search: '🔍'
        };
        return icons[type] || '📱';
    }

    getActivityText(type) {
        const texts = {
            view: 'Watched',
            favorite: 'Added to favorites',
            watchlist: 'Added to watchlist',
            rating: 'Rated',
            search: 'Searched for'
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
}

// Initialize profile manager when DOM is ready
let profileManager;
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/profile') {
        profileManager = new ProfileManager();
        window.ProfileManager = profileManager;
    }
});