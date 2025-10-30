class EnhancedProfileManager {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.posterBase = window.CineBrainConfig.posterBase;
        this.authToken = localStorage.getItem('cinebrain-token');
        this.currentUser = this.getCurrentUser();
        this.isAuthenticated = !!this.authToken;

        this.urlParams = new URLSearchParams(window.location.search);
        this.profileUsername = this.urlParams.get('username') || this.extractUsernameFromPath();
        this.isOwnProfile = this.isAuthenticated && this.currentUser &&
            this.currentUser.username === this.profileUsername;

        this.profileData = null;
        this.profileUser = null;
        this.statsData = null;
        this.insightsData = null;
        this.forYouContent = null;

        this.isMobile = window.innerWidth <= 768;
        this.isTouchDevice = 'ontouchstart' in window;

        this.selectedAvatarFile = null;
        this.avatarModal = null;

        this.init();
    }

    extractUsernameFromPath() {
        const pathParts = window.location.pathname.split('/').filter(part => part);
        if (pathParts.length >= 1 && pathParts[1] === 'profile.html') {
            return pathParts[0];
        }
        return null;
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('cinebrain-user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('Error parsing user data:', e);
                return null;
            }
        }
        return null;
    }

    async init() {
        try {
            this.showLoadingStates();
            this.updatePageMetadata();
            this.setupResponsiveFeatures();
            this.setupEventListeners();

            if (this.isOwnProfile) {
                this.initializeAvatarUpload();
            } else {
                this.hidePersonalActions();
            }

            await this.loadProfile();

            if (!this.profileUser) {
                this.showUserNotFound();
                return;
            }

            const loadingPromises = [];

            if (this.isOwnProfile) {
                loadingPromises.push(
                    this.loadUserStats(),
                    this.loadRecentActivity(),
                    this.loadUserPreferences(),
                    this.loadUserInsights(),
                    this.loadForYouRecommendations()
                );
            } else {
                loadingPromises.push(
                    this.loadPublicActivity(),
                    this.loadPublicStats()
                );
            }

            await Promise.allSettled(loadingPromises);

            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            this.staggerAnimations();

            console.log('Enhanced CineBrain Profile initialized successfully');
        } catch (error) {
            console.error('Profile initialization error:', error);
            this.showError('Failed to load profile data');
        }
    }

    updatePageMetadata() {
        if (this.profileUsername) {
            document.title = `${this.profileUsername} - CineBrain Profile`;

            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) {
                canonical.href = `${window.location.origin}/${this.profileUsername}/profile.html`;
            }

            if (!this.isOwnProfile) {
                const ogTitle = document.querySelector('meta[property="og:title"]');
                if (ogTitle) {
                    ogTitle.content = `${this.profileUsername}'s CineBrain Profile`;
                }
            }
        }
    }

    hidePersonalActions() {
        const personalElements = [
            'completionScore',
            'completionProgress',
            'completionInsights',
            'completionSuggestions',
            'userInsights',
            'recommendationEffectiveness',
            'forYouPreview'
        ];

        personalElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.closest('.fade-in-up')?.style.setProperty('display', 'none');
            }
        });

        const avatarOverlay = document.querySelector('.avatar-upload-overlay');
        if (avatarOverlay) {
            avatarOverlay.style.display = 'none';
        }

        this.updateProfileActions();
    }

    updateProfileActions() {
        const actionsContainer = document.querySelector('.profile-actions');
        if (!actionsContainer) return;

        if (this.isOwnProfile) {
            return;
        }

        actionsContainer.innerHTML = `
            <button class="profile-btn" id="followUserBtn">
                <i data-feather="user-plus"></i>
                <span class="btn-text">Follow</span>
            </button>
            <button class="profile-btn" id="shareProfileBtn">
                <i data-feather="share-2"></i>
                <span class="btn-text">Share</span>
            </button>
            <button class="profile-btn" id="reportUserBtn">
                <i data-feather="flag"></i>
                <span class="btn-text">Report</span>
            </button>
        `;

        this.setupOtherProfileActions();
    }

    setupOtherProfileActions() {
        const followBtn = document.getElementById('followUserBtn');
        const shareBtn = document.getElementById('shareProfileBtn');
        const reportBtn = document.getElementById('reportUserBtn');

        followBtn?.addEventListener('click', () => {
            this.toggleFollow();
        });

        shareBtn?.addEventListener('click', () => {
            this.shareProfile();
        });

        reportBtn?.addEventListener('click', () => {
            this.reportUser();
        });
    }

    async loadProfile() {
        try {
            let response;

            if (this.isOwnProfile && this.isAuthenticated) {
                response = await fetch(`${this.apiBase}/users/profile`, {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
            } else {
                response = await fetch(`${this.apiBase}/users/profile/public/${encodeURIComponent(this.profileUsername)}`);
            }

            if (response.ok) {
                const data = await response.json();
                this.profileData = data;
                this.profileUser = data.user;
                this.displayProfile(data);
            } else if (response.status === 404) {
                this.profileUser = null;
                this.showUserNotFound();
            } else {
                throw new Error(`Failed to load profile: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load profile data');
        }
    }

    showUserNotFound() {
        const container = document.querySelector('.profile-container');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-content">
                    <i data-feather="user-x" style="width: 64px; height: 64px; margin-bottom: 24px;"></i>
                    <h1>User Not Found</h1>
                    <p>The user "${this.profileUsername}" doesn't exist or has been deactivated.</p>
                    <div class="error-actions">
                        <a href="/" class="profile-btn">
                            <i data-feather="home"></i>
                            <span class="btn-text">Go Home</span>
                        </a>
                        <button class="profile-btn" onclick="history.back()">
                            <i data-feather="arrow-left"></i>
                            <span class="btn-text">Go Back</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async loadPublicActivity() {
        try {
            const response = await fetch(`${this.apiBase}/users/${encodeURIComponent(this.profileUsername)}/activity/public`);

            if (response.ok) {
                const data = await response.json();
                this.displayRecentActivity(data.recent_activity || []);
            } else {
                this.displayRecentActivity([]);
            }
        } catch (error) {
            console.error('Error loading public activity:', error);
            this.displayRecentActivity([]);
        }
    }

    async loadPublicStats() {
        try {
            const response = await fetch(`${this.apiBase}/users/${encodeURIComponent(this.profileUsername)}/stats/public`);

            if (response.ok) {
                const data = await response.json();
                this.displayPublicStats(data.stats || {});
            } else {
                this.displayPublicStats({});
            }
        } catch (error) {
            console.error('Error loading public stats:', error);
            this.displayPublicStats({});
        }
    }

    displayPublicStats(stats) {
        this.animateStatValue('totalInteractions', stats.total_interactions || 0);
        this.animateStatValue('favoriteCount', stats.favorites || 0);
        this.animateStatValue('ratingsGiven', stats.ratings_given || 0);

        const sensitiveStats = ['averageRating', 'recommendationAccuracy', 'engagementScore', 'discoveryScore'];
        sensitiveStats.forEach(statId => {
            const element = document.getElementById(statId);
            if (element) {
                element.closest('.stat-card').style.display = 'none';
            }
        });
    }

    async toggleFollow() {
        if (!this.isAuthenticated) {
            window.location.href = '/auth/login.html';
            return;
        }

        const followBtn = document.getElementById('followUserBtn');
        const originalText = followBtn.innerHTML;

        followBtn.innerHTML = '<div class="loading-spinner-profile"></div>';
        followBtn.disabled = true;

        try {
            const response = await fetch(`${this.apiBase}/users/${encodeURIComponent(this.profileUsername)}/follow`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.following) {
                    followBtn.innerHTML = `
                        <i data-feather="user-check"></i>
                        <span class="btn-text">Following</span>
                    `;
                    this.showNotification('Now following user!', 'success');
                } else {
                    followBtn.innerHTML = `
                        <i data-feather="user-plus"></i>
                        <span class="btn-text">Follow</span>
                    `;
                    this.showNotification('Unfollowed user', 'info');
                }
            } else {
                this.showNotification('Failed to update follow status', 'error');
                followBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Follow error:', error);
            this.showNotification('Failed to update follow status', 'error');
            followBtn.innerHTML = originalText;
        } finally {
            followBtn.disabled = false;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    reportUser() {
        window.location.href = `/support/report-user.html?username=${encodeURIComponent(this.profileUsername)}`;
    }

    setupResponsiveFeatures() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.isMobile = window.innerWidth <= 768;
                this.updateMobileInterface();
            }, 250);
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.isMobile = window.innerWidth <= 768;
                this.updateMobileInterface();
            }, 100);
        });

        this.updateMobileInterface();
    }

    updateMobileInterface() {
        if (this.isMobile) {
            document.body.classList.add('mobile-interface');
        } else {
            document.body.classList.remove('mobile-interface');
        }
    }

    showLoadingStates() {
        const loadingElements = document.querySelectorAll('.loading-spinner-profile');
        loadingElements.forEach(el => {
            el.style.display = 'block';
        });
    }

    staggerAnimations() {
        const animatedElements = document.querySelectorAll('.fade-in-up');
        animatedElements.forEach((el, index) => {
            el.style.animationDelay = `${index * 0.1}s`;
        });
    }

    setupEventListeners() {
        const avatar = document.getElementById('profileAvatar');
        avatar?.addEventListener('click', () => {
            if (this.isOwnProfile) {
                this.openAvatarUploadModal();
            }
        });

        const refreshStatsBtn = document.getElementById('refreshStatsBtn');
        refreshStatsBtn?.addEventListener('click', () => {
            this.refreshStats();
        });

        const refreshInsightsBtn = document.getElementById('refreshInsightsBtn');
        refreshInsightsBtn?.addEventListener('click', () => {
            this.refreshInsights();
        });

        const shareBtn = document.getElementById('shareProfileBtn');
        shareBtn?.addEventListener('click', () => {
            this.shareProfile();
        });

        if (!this.isMobile) {
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case 'r':
                            e.preventDefault();
                            this.refreshStats();
                            break;
                        case 's':
                            e.preventDefault();
                            window.location.href = '/user/settings.html';
                            break;
                    }
                }
            });
        }

        if (this.isTouchDevice) {
            this.setupTouchInteractions();
        }
    }

    setupTouchInteractions() {
        const touchElements = document.querySelectorAll('.profile-btn, .quick-action-btn, .activity-item, .content-mini-card');

        touchElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.style.transform = 'scale(0.98)';
            }, { passive: true });

            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.style.transform = '';
                }, 100);
            }, { passive: true });
        });
    }

    initializeAvatarUpload() {
        this.avatarModal = new bootstrap.Modal(document.getElementById('avatarUploadModal'));

        const fileInput = document.getElementById('avatarFileInput');
        const selectImageBtn = document.getElementById('selectImageBtn');
        const uploadBtn = document.getElementById('uploadAvatarBtn');
        const removeBtn = document.getElementById('removeAvatarBtn');

        selectImageBtn?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', (e) => {
            this.handleAvatarFileSelect(e.target.files[0]);
        });

        uploadBtn?.addEventListener('click', () => {
            this.uploadAvatar();
        });

        removeBtn?.addEventListener('click', () => {
            this.removeAvatar();
        });

        const avatarPreview = document.getElementById('avatarPreview');
        avatarPreview?.addEventListener('dragover', (e) => {
            e.preventDefault();
            avatarPreview.classList.add('drag-over');
        });

        avatarPreview?.addEventListener('dragleave', () => {
            avatarPreview.classList.remove('drag-over');
        });

        avatarPreview?.addEventListener('drop', (e) => {
            e.preventDefault();
            avatarPreview.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleAvatarFileSelect(file);
            }
        });
    }

    openAvatarUploadModal() {
        this.loadCurrentAvatarStatus();
        this.avatarModal?.show();
    }

    async loadCurrentAvatarStatus() {
        try {
            const response = await fetch(`${this.apiBase}/users/avatar/url`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const removeBtn = document.getElementById('removeAvatarBtn');

                if (data.has_avatar && data.avatar_url) {
                    removeBtn.style.display = 'block';
                    removeBtn.textContent = 'Remove Current Avatar';
                } else {
                    removeBtn.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading avatar status:', error);
        }
    }

    handleAvatarFileSelect(file) {
        if (!file) return;

        const validation = this.validateAvatarFile(file);
        if (!validation.valid) {
            this.showNotification(validation.message, 'error');
            return;
        }

        this.selectedAvatarFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImage = document.getElementById('previewImage');
            const placeholder = document.getElementById('avatarPlaceholder');

            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            placeholder.style.display = 'none';

            document.getElementById('uploadAvatarBtn').disabled = false;
        };
        reader.readAsDataURL(file);
    }

    validateAvatarFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                message: 'Invalid file type. Please select a JPEG, PNG, or WEBP image.'
            };
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return {
                valid: false,
                message: 'File size too large. Maximum 5MB allowed.'
            };
        }

        return { valid: true };
    }

    async uploadAvatar() {
        if (!this.selectedAvatarFile) return;

        const uploadBtn = document.getElementById('uploadAvatarBtn');
        const originalText = uploadBtn.innerHTML;

        uploadBtn.innerHTML = '<div class="loading-spinner-profile"></div> Uploading...';
        uploadBtn.disabled = true;

        try {
            const base64 = await this.fileToBase64(this.selectedAvatarFile);

            const response = await fetch(`${this.apiBase}/users/avatar/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: base64
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.updateProfileAvatar(data.avatar_url);

                if (this.currentUser) {
                    this.currentUser.avatar_url = data.avatar_url;
                    localStorage.setItem('cinebrain-user', JSON.stringify(this.currentUser));
                }

                this.showNotification('Avatar uploaded successfully!', 'success');
                this.avatarModal?.hide();

                this.resetAvatarForm();
            } else {
                this.showNotification(data.error || 'Failed to upload avatar', 'error');
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            this.showNotification('Failed to upload avatar', 'error');
        } finally {
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
        }
    }

    async removeAvatar() {
        const removeBtn = document.getElementById('removeAvatarBtn');
        const originalText = removeBtn.innerHTML;

        removeBtn.innerHTML = '<div class="loading-spinner-profile"></div> Removing...';
        removeBtn.disabled = true;

        try {
            const response = await fetch(`${this.apiBase}/users/avatar/delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.updateProfileAvatar(null);

                if (this.currentUser) {
                    this.currentUser.avatar_url = null;
                    localStorage.setItem('cinebrain-user', JSON.stringify(this.currentUser));
                }

                this.showNotification('Avatar removed successfully!', 'success');
                this.avatarModal?.hide();

                this.resetAvatarForm();
            } else {
                this.showNotification(data.error || 'Failed to remove avatar', 'error');
            }
        } catch (error) {
            console.error('Avatar removal error:', error);
            this.showNotification('Failed to remove avatar', 'error');
        } finally {
            removeBtn.innerHTML = originalText;
            removeBtn.disabled = false;
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    updateProfileAvatar(avatarUrl) {
        const avatarImage = document.getElementById('avatarImage');
        const avatarInitial = document.getElementById('avatarInitial');

        if (avatarUrl) {
            avatarImage.src = avatarUrl;
            avatarImage.style.display = 'block';
            avatarInitial.style.display = 'none';
        } else {
            avatarImage.style.display = 'none';
            avatarInitial.style.display = 'block';
            const initial = this.profileUser?.username ?
                this.profileUser.username.charAt(0).toUpperCase() : 'U';
            avatarInitial.textContent = initial;
        }
    }

    resetAvatarForm() {
        this.selectedAvatarFile = null;
        document.getElementById('avatarFileInput').value = '';
        document.getElementById('previewImage').style.display = 'none';
        document.getElementById('avatarPlaceholder').style.display = 'block';
        document.getElementById('uploadAvatarBtn').disabled = true;
    }

    displayProfile(data) {
        const user = data.user || this.profileUser;
        if (!user) return;

        document.getElementById('profileName').textContent = user.username || 'User';
        document.getElementById('profileUsername').textContent = `@${user.username || 'user'}`;

        this.updateProfileAvatar(user.avatar_url);

        const memberSince = user.created_at ? new Date(user.created_at).getFullYear() : 'Unknown';
        document.getElementById('memberSince').textContent = `Member since ${memberSince}`;

        this.displayProfileBadges(user, data);

        if (data.profile_completion && this.isOwnProfile) {
            this.displayProfileCompletion(data.profile_completion);
        }
    }

    displayProfileBadges(user, data) {
        const badges = document.getElementById('profileBadges');
        let badgeHTML = `
            <div class="profile-badge">
                <i data-feather="calendar"></i>
                <span>Member since ${user.created_at ? new Date(user.created_at).getFullYear() : 'Unknown'}</span>
            </div>
        `;

        if (user.is_admin) {
            badgeHTML += `
                <div class="profile-badge success">
                    <i data-feather="shield"></i>
                    <span>Admin</span>
                </div>
            `;
        }

        if (data.profile_completion && data.profile_completion.score >= 80) {
            badgeHTML += `
                <div class="profile-badge success">
                    <i data-feather="check-circle"></i>
                    <span>Complete Profile</span>
                </div>
            `;
        }

        if (data.stats && data.stats.total_interactions > 50) {
            badgeHTML += `
                <div class="profile-badge">
                    <i data-feather="zap"></i>
                    <span>Active User</span>
                </div>
            `;
        }

        if (data.stats && data.stats.average_rating >= 8) {
            badgeHTML += `
                <div class="profile-badge">
                    <i data-feather="star"></i>
                    <span>Quality Critic</span>
                </div>
            `;
        }

        badges.innerHTML = badgeHTML;
    }

    displayProfileCompletion(completion) {
        const score = completion.score || 0;
        document.getElementById('completionScore').textContent = `${score}%`;

        setTimeout(() => {
            document.getElementById('completionProgress').style.width = `${score}%`;
        }, 300);

        const statusElement = document.getElementById('completionStatus');
        if (score >= 90) {
            statusElement.textContent = 'Excellent!';
            statusElement.style.color = 'var(--stat-trend-positive)';
        } else if (score >= 70) {
            statusElement.textContent = 'Great progress!';
            statusElement.style.color = 'var(--badge-accent-color)';
        } else if (score >= 50) {
            statusElement.textContent = 'Keep going!';
            statusElement.style.color = 'var(--badge-warning-color)';
        } else {
            statusElement.textContent = 'Getting started...';
            statusElement.style.color = 'var(--text-secondary)';
        }

        const insights = document.getElementById('completionInsights');
        const suggestions = document.getElementById('completionSuggestions');
        let insightsHTML = '';
        let suggestionsHTML = '';

        if (completion.suggestions && completion.suggestions.length > 0) {
            completion.suggestions.forEach(suggestion => {
                suggestionsHTML += `
                    <div class="insight-card">
                        <div class="insight-title">💡 Suggestion</div>
                        <div class="insight-description">${this.escapeHtml(suggestion)}</div>
                    </div>
                `;
            });
        }

        if (completion.missing_fields && completion.missing_fields.length > 0) {
            insightsHTML += `
                <div class="insight-card">
                    <div class="insight-title">🔧 Complete Your Profile</div>
                    <div class="insight-description">
                        Add: ${completion.missing_fields.join(', ')}
                    </div>
                </div>
            `;
        }

        insights.innerHTML = insightsHTML;
        suggestions.innerHTML = suggestionsHTML;
    }

    async loadUserStats() {
        try {
            const response = await fetch(`${this.apiBase}/users/analytics`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.statsData = data.analytics || {};
                this.displayStats(this.statsData);
            } else {
                this.displayStats({});
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.displayStats({});
        }
    }

    displayStats(stats) {
        this.animateStatValue('totalInteractions', stats.total_interactions || 0);
        this.animateStatValue('favoriteCount', stats.favorites || 0);
        this.animateStatValue('watchlistCount', stats.watchlist_items || 0);
        this.animateStatValue('ratingsGiven', stats.ratings_given || 0);

        const avgRating = stats.average_rating;
        document.getElementById('averageRating').textContent = avgRating ?
            `${avgRating}/10` : '--';

        const accuracy = stats.recommendation_effectiveness?.accuracy_estimate ||
            stats.engagement_metrics?.engagement_score * 100 || 0;
        document.getElementById('recommendationAccuracy').textContent =
            accuracy ? `${Math.round(accuracy)}%` : '--';

        const engagementScore = stats.engagement_metrics?.engagement_score * 100 || 0;
        document.getElementById('engagementScore').textContent =
            engagementScore ? `${Math.round(engagementScore)}%` : '--';

        const discoveryScore = stats.discovery_score * 100 || 0;
        document.getElementById('discoveryScore').textContent =
            discoveryScore ? `${Math.round(discoveryScore)}%` : '--';

        this.updateQuickActionCounts(stats);
        this.displayStatTrends(stats);
    }

    updateQuickActionCounts(stats) {
        const watchlistCount = document.getElementById('watchlistActionCount');
        if (watchlistCount) {
            watchlistCount.textContent = stats.watchlist_items || 0;
        }

        const favoritesCount = document.getElementById('favoritesActionCount');
        if (favoritesCount) {
            favoritesCount.textContent = stats.favorites || 0;
        }

        const ratingsCount = document.getElementById('ratingsActionCount');
        if (ratingsCount) {
            ratingsCount.textContent = stats.ratings_given || 0;
        }
    }

    animateStatValue(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent) || 0;
        const duration = this.isMobile ? 800 : 1000;
        const startTime = performance.now();

        const updateValue = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);

            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        };

        requestAnimationFrame(updateValue);
    }

    displayStatTrends(stats) {
        if (stats.total_interactions > 10) {
            const trendElement = document.getElementById('interactionsTrend');
            if (trendElement) {
                trendElement.style.display = 'inline';
                trendElement.textContent = '↗';
                trendElement.className = 'stat-trend positive';
            }
        }
    }

    async refreshStats() {
        const refreshBtn = document.getElementById('refreshStatsBtn');
        const originalHTML = refreshBtn.innerHTML;

        refreshBtn.innerHTML = '<div class="loading-spinner-profile"></div>';
        refreshBtn.disabled = true;

        try {
            await this.loadUserStats();
            this.showNotification('Stats refreshed successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to refresh stats', 'error');
        } finally {
            refreshBtn.innerHTML = originalHTML;
            refreshBtn.disabled = false;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    async loadRecentActivity() {
        try {
            const response = await fetch(`${this.apiBase}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayRecentActivity(data.recent_activity || []);
            } else {
                this.displayRecentActivity([]);
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            this.displayRecentActivity([]);
        }
    }

    displayRecentActivity(activities) {
        const container = document.getElementById('recentActivity');

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-feather="clock"></i>
                    <h3>No Recent Activity</h3>
                    <p>Start exploring CineBrain to see your activity here!</p>
                    <a href="/" class="profile-btn">
                        <i data-feather="home"></i>
                        <span class="btn-text">Discover Content</span>
                    </a>
                </div>
            `;
            return;
        }

        let html = '';
        activities.slice(0, 5).forEach(activity => {
            const content = activity.content;
            if (!content) return;

            const posterUrl = this.formatPosterUrl(content.poster_path);
            const timeAgo = this.getTimeAgo(activity.timestamp);
            const actionText = this.getActionText(activity.interaction_type);

            html += `
                <div class="activity-item" data-slug="${content.slug || content.id}">
                    <img src="${posterUrl}" alt="${this.escapeHtml(content.title)}" class="activity-poster"
                         onerror="this.src='${this.getPlaceholderImage()}'">
                    <div class="activity-content">
                        <div class="activity-title">${this.escapeHtml(content.title)}</div>
                        <div class="activity-meta">
                            <span class="activity-type">${actionText}</span>
                            <span>${timeAgo}</span>
                            ${activity.rating ? `<span class="activity-rating">⭐ ${activity.rating}/10</span>` : ''}
                        </div>
                    </div>
                    <i data-feather="chevron-right" style="width: 16px; height: 16px; color: var(--text-muted);"></i>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.activity-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const slug = item.dataset.slug;
                if (slug) {
                    window.location.href = `/explore/details.html?${encodeURIComponent(slug)}`;
                }
            });
        });
    }

    async loadUserPreferences() {
        const container = document.getElementById('userPreferences');

        if (!this.profileUser) {
            container.innerHTML = '<div class="empty-state"><p>No preferences data available</p></div>';
            return;
        }

        const preferences = [
            {
                label: 'Preferred Languages',
                value: this.profileUser.preferred_languages ?
                    this.profileUser.preferred_languages.join(', ') : 'Not set',
                icon: 'globe'
            },
            {
                label: 'Favorite Genres',
                value: this.profileUser.preferred_genres ?
                    this.profileUser.preferred_genres.slice(0, 3).join(', ') : 'Not set',
                icon: 'film'
            },
            {
                label: 'Location',
                value: this.profileUser.location || 'Not set',
                icon: 'map-pin'
            },
            {
                label: 'Member Since',
                value: this.profileUser.created_at ?
                    new Date(this.profileUser.created_at).toLocaleDateString() : 'Unknown',
                icon: 'calendar'
            }
        ];

        let html = '';
        preferences.forEach(pref => {
            html += `
                <div class="preference-item">
                    <div class="preference-label">
                        <i data-feather="${pref.icon}"></i>
                        ${pref.label}
                    </div>
                    <div class="preference-value">${this.escapeHtml(pref.value)}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadUserInsights() {
        try {
            const response = await fetch(`${this.apiBase}/personalized/profile-insights`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.insightsData = data.insights || {};
                this.displayUserInsights(this.insightsData);
            } else {
                this.displayUserInsights({});
            }
        } catch (error) {
            console.error('Error loading insights:', error);
            this.displayUserInsights({});
        }
    }

    displayUserInsights(insights) {
        const container = document.getElementById('userInsights');

        if (!insights || Object.keys(insights).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-feather="cpu"></i>
                    <h3>Building Your AI Profile</h3>
                    <p>Keep using CineBrain to unlock personalized insights!</p>
                    <a href="/" class="profile-btn">
                        <i data-feather="play"></i>
                        <span class="btn-text">Start Watching</span>
                    </a>
                </div>
            `;
            return;
        }

        let html = '';

        if (insights.profile_strength) {
            const strength = insights.profile_strength;
            html += `
                <div class="insight-card">
                    <div class="insight-title">🎯 Profile Strength: ${strength.status}</div>
                    <div class="insight-description">
                        Your profile is ${Math.round(strength.completeness * 100)}% complete with 
                        ${Math.round(strength.confidence * 100)}% confidence level.
                    </div>
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>AI Confidence</span>
                            <span>${Math.round(strength.confidence * 100)}%</span>
                        </div>
                        <div class="progress-bar-custom">
                            <div class="progress-fill" style="width: ${strength.confidence * 100}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (insights.preferences && insights.preferences.top_genres) {
            html += `
                <div class="insight-card">
                    <div class="insight-title">🎭 Your Favorite Genres</div>
                    <div class="insight-description">
                        Based on your activity: ${insights.preferences.top_genres.join(', ')}
                    </div>
                </div>
            `;
        }

        if (insights.behavior) {
            const behavior = insights.behavior;
            html += `
                <div class="insight-card">
                    <div class="insight-title">📈 Viewing Style: ${behavior.viewing_style}</div>
                    <div class="insight-description">
                        You have ${behavior.total_interactions} total interactions with an engagement score of 
                        ${Math.round(behavior.engagement_score * 100)}%. Your exploration tendency is 
                        ${Math.round(behavior.exploration_tendency * 100)}%.
                    </div>
                </div>
            `;
        }

        if (insights.recommendations_quality) {
            const quality = insights.recommendations_quality;
            html += `
                <div class="insight-card">
                    <div class="insight-title">🤖 AI Recommendation Quality</div>
                    <div class="insight-description">
                        ${quality.next_improvement}
                    </div>
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>Accuracy</span>
                            <span>${Math.round(quality.accuracy_estimate)}%</span>
                        </div>
                        <div class="progress-bar-custom">
                            <div class="progress-fill" style="width: ${quality.accuracy_estimate}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html || `
            <div class="empty-state">
                <i data-feather="brain"></i>
                <h3>No Insights Yet</h3>
                <p>Use CineBrain more to unlock personalized insights!</p>
            </div>
        `;

        this.displayRecommendationEffectiveness(insights);
    }

    displayRecommendationEffectiveness(insights) {
        const container = document.getElementById('recommendationEffectiveness');

        if (!insights.recommendations_quality) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-feather="brain"></i>
                    <h3>Building AI Profile</h3>
                    <p>Rate and interact with more content to see recommendation performance!</p>
                </div>
            `;
            return;
        }

        const quality = insights.recommendations_quality;

        let html = `
            <div class="insight-card">
                <div class="insight-title">🎯 Overall Performance</div>
                <div class="insight-description">
                    Your CineBrain AI is ${quality.accuracy_estimate}% accurate with ${quality.personalization_level} personalization.
                </div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>AI Accuracy</span>
                        <span>${Math.round(quality.accuracy_estimate)}%</span>
                    </div>
                    <div class="progress-bar-custom">
                        <div class="progress-fill" style="width: ${quality.accuracy_estimate}%"></div>
                    </div>
                </div>
            </div>
        `;

        if (insights.behavior && insights.behavior.total_interactions) {
            html += `
                <div class="insight-card">
                    <div class="insight-title">📊 Data Points</div>
                    <div class="insight-description">
                        Based on ${insights.behavior.total_interactions} interactions with 
                        ${Math.round(insights.behavior.consistency * 100)}% consistency.
                    </div>
                </div>
            `;
        }

        html += `
            <div class="insight-card">
                <div class="insight-title">💡 Next Steps</div>
                <div class="insight-description">
                    ${quality.next_improvement}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    async refreshInsights() {
        const refreshBtn = document.getElementById('refreshInsightsBtn');
        const originalHTML = refreshBtn.innerHTML;

        refreshBtn.innerHTML = '<div class="loading-spinner-profile"></div>';
        refreshBtn.disabled = true;

        try {
            await this.loadUserInsights();
            this.showNotification('Insights refreshed successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to refresh insights', 'error');
        } finally {
            refreshBtn.innerHTML = originalHTML;
            refreshBtn.disabled = false;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    async loadForYouRecommendations() {
        try {
            const response = await fetch(`${this.apiBase}/personalized/for-you?limit=8`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.forYouContent = data.recommendations || [];
                this.displayForYouRecommendations(this.forYouContent);
            } else {
                this.displayForYouRecommendations([]);
            }
        } catch (error) {
            console.error('Error loading For You recommendations:', error);
            this.displayForYouRecommendations([]);
        }
    }

    displayForYouRecommendations(recommendations) {
        const container = document.getElementById('forYouPreview');

        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-feather="target"></i>
                    <h3>Building Your Recommendations</h3>
                    <p>Rate and interact with more content to get personalized suggestions!</p>
                    <a href="/explore/trending.html" class="profile-btn">
                        <i data-feather="trending-up"></i>
                        <span class="btn-text">Explore Trending</span>
                    </a>
                </div>
            `;
            return;
        }

        let html = '';
        recommendations.slice(0, 8).forEach(item => {
            const posterUrl = this.formatPosterUrl(item.poster_path);
            const rating = item.rating ? parseFloat(item.rating).toFixed(1) : 'N/A';

            html += `
                <div class="content-mini-card" onclick="window.location.href='/explore/details.html?${encodeURIComponent(item.slug || item.id)}'">
                    <img src="${posterUrl}" alt="${this.escapeHtml(item.title)}" class="content-mini-poster"
                         onerror="this.src='${this.getPlaceholderImage()}'">
                    <div class="content-mini-info">
                        <div class="content-mini-title">${this.escapeHtml(item.title)}</div>
                        <div class="content-mini-meta">⭐ ${rating}</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    shareProfile() {
        const profileUrl = `${window.location.origin}/${this.profileUsername}/profile.html`;
        const shareData = {
            title: `${this.profileUsername}'s CineBrain Profile`,
            text: `Check out ${this.profileUsername}'s profile on CineBrain!`,
            url: profileUrl
        };

        if (navigator.share && this.isMobile) {
            navigator.share(shareData).catch(err => console.log('Error sharing:', err));
        } else {
            navigator.clipboard.writeText(profileUrl).then(() => {
                this.showNotification('Profile link copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Unable to copy link', 'error');
            });
        }
    }

    formatPosterUrl(posterPath) {
        if (!posterPath) return this.getPlaceholderImage();
        if (posterPath.startsWith('http')) return posterPath;
        return `${this.posterBase}${posterPath}`;
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2luZUJyYWluPC90ZXh0Pjwvc3ZnPg==';
    }

    getActionText(interactionType) {
        const actions = {
            'favorite': 'Favorited',
            'watchlist': 'Added to Watchlist',
            'rating': 'Rated',
            'view': 'Viewed',
            'like': 'Liked',
            'search': 'Searched'
        };
        return actions[interactionType] || 'Interacted';
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return 'Recently';

        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        if (window.topbar && window.topbar.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            console.log(`CineBrain ${type.toUpperCase()}: ${message}`);
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

document.addEventListener('DOMContentLoaded', () => {
    new EnhancedProfileManager();
});