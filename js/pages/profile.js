/**
 * Profile Page Logic
 */

class ProfilePage {
    constructor() {
        this.currentUser = null;
        this.userStats = null;
        this.recommendations = [];
        this.watchHistory = [];
        this.favorites = [];
        this.isEditing = false;
        
        this.init();
    }

    async init() {
        if (!authService.isAuthenticated()) {
            this.redirectToLogin();
            return;
        }

        this.currentUser = authService.getCurrentUser();
        
        try {
            await this.loadUserProfile();
            this.renderProfile();
            this.bindEvents();
            await this.loadUserContent();
        } catch (error) {
            console.error('Profile initialization error:', error);
            this.showError();
        }
    }

    redirectToLogin() {
        showToast('Please log in to view your profile', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
    }

    async loadUserProfile() {
        try {
            // Load user stats and content
            const [stats, history, favorites, recommendations] = await Promise.allSettled([
                this.getUserStats(),
                this.getUserWatchHistory(),
                this.getUserFavorites(),
                this.getPersonalizedRecommendations()
            ]);

            this.userStats = stats.value || this.getDefaultStats();
            this.watchHistory = history.value || [];
            this.favorites = favorites.value || [];
            this.recommendations = recommendations.value || [];

        } catch (error) {
            console.error('Failed to load profile data:', error);
            throw error;
        }
    }

    async getUserStats() {
        // Calculate user statistics from local storage and API
        const interactions = storageService.getUserInteractions();
        const favorites = storageService.getFavoriteContentIds();
        const watchlist = storageService.getWatchlistContentIds();
        
        return {
            totalWatched: interactions.filter(i => i.interactionType === INTERACTION_TYPES.VIEW).length,
            totalFavorites: favorites.length,
            totalWatchlist: watchlist.length,
            totalRatings: interactions.filter(i => i.interactionType === INTERACTION_TYPES.LIKE).length,
            joinDate: this.currentUser.created_at || new Date().toISOString(),
            lastActive: new Date().toISOString()
        };
    }

    async getUserWatchHistory() {
        const interactions = storageService.getUserInteractions(null, INTERACTION_TYPES.VIEW);
        const recentViews = interactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 20);
        
        // Get content details for recent views
        const historyWithDetails = await Promise.all(
            recentViews.map(async (interaction) => {
                try {
                    const content = await apiService.getContentDetails(interaction.contentId);
                    return { ...content, viewedAt: interaction.timestamp };
                } catch (error) {
                    return null;
                }
            })
        );

        return historyWithDetails.filter(item => item !== null);
    }

    async getUserFavorites() {
        const favoriteIds = storageService.getFavoriteContentIds();
        
        const favoritesWithDetails = await Promise.all(
            favoriteIds.slice(0, 20).map(async (contentId) => {
                try {
                    return await apiService.getContentDetails(contentId);
                } catch (error) {
                    return null;
                }
            })
        );

        return favoritesWithDetails.filter(item => item !== null);
    }

    async getPersonalizedRecommendations() {
        if (authService.isAuthenticated()) {
            try {
                const data = await apiService.getPersonalizedRecommendations();
                return data.hybrid_recommendations || [];
            } catch (error) {
                console.error('Failed to load recommendations:', error);
                return [];
            }
        }
        return [];
    }

    getDefaultStats() {
        return {
            totalWatched: 0,
            totalFavorites: 0,
            totalWatchlist: 0,
            totalRatings: 0,
            joinDate: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };
    }

    renderProfile() {
        const profileContainer = document.getElementById('profile-content');
        if (!profileContainer) return;

        profileContainer.innerHTML = `
            ${this.renderProfileHeader()}
            ${this.renderProfileStats()}
            ${this.renderProfileContent()}
        `;
    }

    renderProfileHeader() {
        const { username, email } = this.currentUser;
        const { joinDate, lastActive } = this.userStats;
        
        return `
            <div class="profile-header mb-5">
                <div class="row align-items-center">
                    <div class="col-md-3 text-center">
                        <div class="profile-avatar">
                            <div class="user-avatar-large">
                                ${getInitials(username)}
                            </div>
                            <button class="btn btn-outline-light btn-sm mt-2" id="change-avatar-btn">
                                <i class="fas fa-camera me-1"></i>
                                Change Photo
                            </button>
                        </div>
                    </div>
                    <div class="col-md-9">
                        <div class="profile-info">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h2 class="profile-username">${sanitizeText(username)}</h2>
                                    <p class="profile-email text-muted">${sanitizeText(email || 'No email provided')}</p>
                                </div>
                                <button class="btn btn-outline-light" id="edit-profile-btn">
                                    <i class="fas fa-edit me-1"></i>
                                    Edit Profile
                                </button>
                            </div>
                            
                            <div class="profile-meta">
                                <div class="meta-item">
                                    <i class="fas fa-calendar-alt me-2"></i>
                                    Joined ${formatDate(joinDate, 'long')}
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-clock me-2"></i>
                                    Last active ${formatDate(lastActive, 'relative')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderProfileStats() {
        const { totalWatched, totalFavorites, totalWatchlist, totalRatings } = this.userStats;
        
        return `
            <div class="profile-stats mb-5">
                <div class="row">
                    <div class="col-md-3 col-6 mb-3">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-play-circle"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalWatched}</h3>
                                <p>Watched</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 col-6 mb-3">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-heart"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalFavorites}</h3>
                                <p>Favorites</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 col-6 mb-3">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-bookmark"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalWatchlist}</h3>
                                <p>Watchlist</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 col-6 mb-3">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${totalRatings}</h3>
                                <p>Ratings</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderProfileContent() {
        return `
            <div class="profile-content-sections">
                <!-- Watch History Section -->
                ${this.renderWatchHistorySection()}
                
                <!-- Favorites Section -->
                ${this.renderFavoritesSection()}
                
                <!-- Recommendations Section -->
                ${this.renderRecommendationsSection()}
                
                <!-- Settings Section -->
                ${this.renderSettingsSection()}
            </div>
        `;
    }

    renderWatchHistorySection() {
        if (!this.watchHistory.length) {
            return `
                <div class="profile-section mb-5">
                    <h4><i class="fas fa-history me-2"></i>Watch History</h4>
                    <div class="empty-state">
                        <i class="fas fa-play-circle"></i>
                        <h5>No watch history yet</h5>
                        <p>Start watching content to see your history here</p>
                        <a href="/" class="btn btn-primary">
                            <i class="fas fa-home me-1"></i>Browse Content
                        </a>
                    </div>
                </div>
            `;
        }

        return `
            <div class="profile-section mb-5">
                <div class="section-header">
                    <h4><i class="fas fa-history me-2"></i>Watch History</h4>
                    <button class="btn btn-outline-light btn-sm" id="clear-history-btn">
                        <i class="fas fa-trash me-1"></i>Clear History
                    </button>
                </div>
                <div class="history-content">
                    ${this.renderContentGrid(this.watchHistory.slice(0, 8))}
                    ${this.watchHistory.length > 8 ? `
                        <div class="text-center mt-3">
                            <button class="btn btn-outline-light" id="load-more-history">
                                Load More History
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderFavoritesSection() {
        if (!this.favorites.length) {
            return `
                <div class="profile-section mb-5">
                    <h4><i class="fas fa-heart me-2"></i>Favorites</h4>
                    <div class="empty-state">
                        <i class="fas fa-heart"></i>
                        <h5>No favorites yet</h5>
                        <p>Add content to your favorites to see them here</p>
                        <a href="/" class="btn btn-primary">
                            <i class="fas fa-home me-1"></i>Discover Content
                        </a>
                    </div>
                </div>
            `;
        }

        return `
            <div class="profile-section mb-5">
                <div class="section-header">
                    <h4><i class="fas fa-heart me-2"></i>Favorites</h4>
                    <a href="/favorites.html" class="btn btn-outline-light btn-sm">
                        <i class="fas fa-external-link-alt me-1"></i>View All
                    </a>
                </div>
                <div class="favorites-content">
                    ${this.renderContentGrid(this.favorites.slice(0, 8))}
                </div>
            </div>
        `;
    }

    renderRecommendationsSection() {
        if (!this.recommendations.length) return '';

        return `
            <div class="profile-section mb-5">
                <h4><i class="fas fa-magic me-2"></i>Recommended for You</h4>
                <div class="recommendations-content">
                    ${this.renderContentGrid(this.recommendations.slice(0, 8))}
                </div>
            </div>
        `;
    }

    renderSettingsSection() {
        return `
            <div class="profile-section">
                <h4><i class="fas fa-cog me-2"></i>Settings</h4>
                <div class="settings-grid">
                    <div class="setting-item">
                        <div class="setting-info">
                            <h6>Change Password</h6>
                            <p class="text-muted">Update your account password</p>
                        </div>
                        <button class="btn btn-outline-light btn-sm" id="change-password-btn">
                            Change
                        </button>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <h6>Privacy Settings</h6>
                            <p class="text-muted">Manage your privacy preferences</p>
                        </div>
                        <button class="btn btn-outline-light btn-sm" id="privacy-settings-btn">
                            Manage
                        </button>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <h6>Export Data</h6>
                            <p class="text-muted">Download your profile data</p>
                        </div>
                        <button class="btn btn-outline-light btn-sm" id="export-data-btn">
                            Export
                        </button>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <h6>Delete Account</h6>
                            <p class="text-muted">Permanently delete your account</p>
                        </div>
                        <button class="btn btn-outline-danger btn-sm" id="delete-account-btn">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderContentGrid(content) {
        return `
            <div class="row">
                ${content.map(item => `
                    <div class="col-lg-3 col-md-4 col-6 mb-3">
                        <div class="content-card" data-content-id="${item.id}">
                            <div class="content-image">
                                <img src="${getImageUrl(item.poster_path, 'w300')}" 
                                     alt="${sanitizeText(item.title)}"
                                     onerror="this.src='${IMAGE_CONFIG.PLACEHOLDER}'">
                                <div class="content-overlay">
                                    <button class="btn btn-primary btn-sm play-btn">
                                        <i class="fas fa-play"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="content-info">
                                <h6>${sanitizeText(item.title, 30)}</h6>
                                ${item.viewedAt ? `
                                    <small class="text-muted">
                                        Watched ${formatDate(item.viewedAt, 'relative')}
                                    </small>
                                ` : ''}
                                ${item.rating ? `
                                    <div class="content-rating">
                                        <i class="fas fa-star"></i>
                                        ${formatRating(item.rating)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    bindEvents() {
        // Edit profile
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Settings buttons
        this.bindSettingsEvents();

        // Content interactions
        this.bindContentEvents();

        // History management
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearWatchHistory());
        }
    }

    bindSettingsEvents() {
        const changePasswordBtn = document.getElementById('change-password-btn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => this.showChangePasswordModal());
        }

        const exportDataBtn = document.getElementById('export-data-btn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportUserData());
        }

        const deleteAccountBtn = document.getElementById('delete-account-btn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.showDeleteAccountModal());
        }
    }

    bindContentEvents() {
        document.addEventListener('click', (e) => {
            const contentCard = e.target.closest('.content-card');
            if (contentCard) {
                const contentId = contentCard.dataset.contentId;
                const modal = new ContentModal();
                modal.show(contentId);
            }
        });
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        
        if (this.isEditing) {
            this.showEditForm();
        } else {
            this.renderProfile();
        }
    }

    showEditForm() {
        const profileInfo = document.querySelector('.profile-info');
        const { username, email } = this.currentUser;
        
        profileInfo.innerHTML = `
            <form id="edit-profile-form">
                <div class="mb-3">
                    <label for="edit-username" class="form-label">Username</label>
                    <input type="text" class="form-control" id="edit-username" 
                           value="${sanitizeText(username)}" required>
                </div>
                <div class="mb-3">
                    <label for="edit-email" class="form-label">Email</label>
                    <input type="email" class="form-control" id="edit-email" 
                           value="${sanitizeText(email || '')}" required>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save me-1"></i>Save Changes
                    </button>
                    <button type="button" class="btn btn-outline-light" id="cancel-edit-btn">
                        <i class="fas fa-times me-1"></i>Cancel
                    </button>
                </div>
            </form>
        `;

        // Bind form events
        const form = document.getElementById('edit-profile-form');
        form.addEventListener('submit', (e) => this.handleProfileUpdate(e));

        const cancelBtn = document.getElementById('cancel-edit-btn');
        cancelBtn.addEventListener('click', () => this.toggleEditMode());
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const updateData = {
            username: formData.get('edit-username'),
            email: formData.get('edit-email')
        };

        try {
            const result = await authService.updateProfile(updateData);
            
            if (result.success) {
                this.currentUser = result.user;
                showToast('Profile updated successfully', 'success');
                this.toggleEditMode();
            }
        } catch (error) {
            console.error('Profile update error:', error);
            showToast('Failed to update profile', 'error');
        }
    }

    showChangePasswordModal() {
        const modalHTML = `
            <div class="modal fade" id="change-password-modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Change Password</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="change-password-form">
                                <div class="mb-3">
                                    <label for="current-password" class="form-label">Current Password</label>
                                    <input type="password" class="form-control" id="current-password" required>
                                </div>
                                <div class="mb-3">
                                    <label for="new-password" class="form-label">New Password</label>
                                    <input type="password" class="form-control" id="new-password" required>
                                </div>
                                <div class="mb-3">
                                    <label for="confirm-password" class="form-label">Confirm New Password</label>
                                    <input type="password" class="form-control" id="confirm-password" required>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" form="change-password-form" class="btn btn-primary">
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('change-password-modal'));
        modal.show();

        // Handle form submission
        const form = document.getElementById('change-password-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePasswordChange(e, modal);
        });
    }

    async handlePasswordChange(e, modal) {
        const formData = new FormData(e.target);
        const currentPassword = formData.get('current-password');
        const newPassword = formData.get('new-password');
        const confirmPassword = formData.get('confirm-password');

        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        try {
            const result = await authService.changePassword(currentPassword, newPassword);
            
            if (result.success) {
                modal.hide();
                showToast('Password changed successfully', 'success');
            }
        } catch (error) {
            console.error('Password change error:', error);
            showToast('Failed to change password', 'error');
        }
    }

    exportUserData() {
        try {
            const userData = storageService.exportUserData();
            const blob = new Blob([userData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `cinestream-profile-${this.currentUser.username}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Profile data exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export data', 'error');
        }
    }

    clearWatchHistory() {
        if (confirm('Are you sure you want to clear your watch history? This action cannot be undone.')) {
            // Clear watch history from local storage
            const interactions = storageService.getUserInteractions();
            const filteredInteractions = interactions.filter(i => i.interactionType !== INTERACTION_TYPES.VIEW);
            storageService.setItem('user_interactions', filteredInteractions);
            
            // Reload profile
            this.loadUserProfile().then(() => {
                this.renderProfile();
                showToast('Watch history cleared', 'success');
            });
        }
    }

    showDeleteAccountModal() {
        const modalHTML = `
            <div class="modal fade" id="delete-account-modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-danger">
                            <h5 class="modal-title text-white">Delete Account</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-danger">
                                <strong>Warning!</strong> This action is permanent and cannot be undone.
                            </div>
                            <p>Deleting your account will:</p>
                            <ul>
                                <li>Remove all your profile data</li>
                                <li>Delete your watch history and favorites</li>
                                <li>Cancel any active subscriptions</li>
                                <li>Remove access to your personalized recommendations</li>
                            </ul>
                            <p>Are you sure you want to continue?</p>
                            <div class="mb-3">
                                <label for="delete-confirmation" class="form-label">
                                    Type "DELETE" to confirm:
                                </label>
                                <input type="text" class="form-control" id="delete-confirmation" required>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirm-delete-btn" disabled>
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('delete-account-modal'));
        modal.show();

        // Enable delete button only when confirmation is typed
        const confirmationInput = document.getElementById('delete-confirmation');
        const deleteBtn = document.getElementById('confirm-delete-btn');
        
        confirmationInput.addEventListener('input', (e) => {
            deleteBtn.disabled = e.target.value !== 'DELETE';
        });

        deleteBtn.addEventListener('click', () => {
            this.deleteAccount(modal);
        });
    }

    async deleteAccount(modal) {
        try {
            // Clear all local data
            storageService.clear();
            
            // Logout user
            authService.logout();
            
            modal.hide();
            showToast('Account deleted successfully', 'success');
            
            // Redirect to home
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            
        } catch (error) {
            console.error('Account deletion error:', error);
            showToast('Failed to delete account', 'error');
        }
    }

    async loadUserContent() {
        // Load additional user content in background
        try {
            const [additionalHistory, additionalFavorites] = await Promise.allSettled([
                this.getUserWatchHistory(),
                this.getUserFavorites()
            ]);

            // Update content if we got more data
            if (additionalHistory.value) {
                this.watchHistory = additionalHistory.value;
            }
            
            if (additionalFavorites.value) {
                this.favorites = additionalFavorites.value;
            }
        } catch (error) {
            console.error('Failed to load additional content:', error);
        }
    }

    showError() {
        const profileContainer = document.getElementById('profile-content');
        profileContainer.innerHTML = `
            <div class="error-state text-center py-5">
                <i class="fas fa-exclamation-triangle text-warning mb-4" style="font-size: 4rem;"></i>
                <h3>Unable to Load Profile</h3>
                <p class="text-muted mb-4">We're having trouble loading your profile data.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo me-1"></i>Try Again
                </button>
            </div>
        `;
    }

    destroy() {
        // Cleanup any event listeners or intervals
        this.currentUser = null;
        this.userStats = null;
        this.recommendations = [];
        this.watchHistory = [];
        this.favorites = [];
    }
}

// Initialize profile page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('profile')) {
            new ProfilePage();
        }
    });
} else {
    if (window.location.pathname.includes('profile')) {
        new ProfilePage();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfilePage;
} else if (typeof window !== 'undefined') {
    window.ProfilePage = ProfilePage;
}