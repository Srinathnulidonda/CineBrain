// CineBrain Authentication System
class CineBrainAuth {
    constructor() {
        this.token = localStorage.getItem('cinebrain_token');
        this.user = JSON.parse(localStorage.getItem('cinebrain_user') || 'null');
        this.refreshTimer = null;
        this.init();
    }

    init() {
        this.setupTokenRefresh();
        this.checkAuthOnLoad();
    }

    checkAuthOnLoad() {
        if (this.token && this.user) {
            this.setupAuthenticatedState();
        } else {
            this.setupUnauthenticatedState();
        }
    }

    setupAuthenticatedState() {
        document.body.classList.add('authenticated');
        document.body.classList.remove('unauthenticated');
        this.updateUIForAuthenticatedUser();
    }

    setupUnauthenticatedState() {
        document.body.classList.add('unauthenticated');
        document.body.classList.remove('authenticated');
        this.updateUIForUnauthenticatedUser();
    }

    updateUIForAuthenticatedUser() {
        // Update topbar
        const authSection = document.querySelector('.auth-section');
        if (authSection && this.user) {
            authSection.innerHTML = `
                <div class="user-menu dropdown">
                    <button class="btn btn-link dropdown-toggle" type="button" data-bs-toggle="dropdown">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.username)}&background=6366f1&color=fff&size=32" 
                             alt="${this.user.username}" class="user-avatar">
                        <span class="username">${this.user.username}</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="/${this.user.username}/profile">Profile</a></li>
                        <li><a class="dropdown-item" href="/user/watchlist.html">Watchlist</a></li>
                        <li><a class="dropdown-item" href="/user/favorites.html">Favorites</a></li>
                        <li><a class="dropdown-item" href="/user/settings.html">Settings</a></li>
                        ${this.user.is_admin ? '<li><hr class="dropdown-divider"></li><li><a class="dropdown-item" href="/admin/">Admin Panel</a></li>' : ''}
                        <li><hr class="dropdown-divider"></li>
                        <li><button class="dropdown-item logout-btn" onclick="Auth.logout()">Logout</button></li>
                    </ul>
                </div>
            `;
        }

        // Update mobile nav
        const mobileAuthItem = document.querySelector('.mobile-nav .auth-item');
        if (mobileAuthItem && this.user) {
            mobileAuthItem.innerHTML = `
                <a href="/${this.user.username}/profile" class="nav-link">
                    <i class="bi bi-person-circle"></i>
                    <span>Profile</span>
                </a>
            `;
        }
    }

    updateUIForUnauthenticatedUser() {
        // Update topbar
        const authSection = document.querySelector('.auth-section');
        if (authSection) {
            authSection.innerHTML = `
                <div class="auth-buttons">
                    <a href="/auth/login.html" class="btn btn-outline-light me-2">Login</a>
                    <a href="/auth/register.html" class="btn btn-primary">Sign Up</a>
                </div>
            `;
        }

        // Update mobile nav
        const mobileAuthItem = document.querySelector('.mobile-nav .auth-item');
        if (mobileAuthItem) {
            mobileAuthItem.innerHTML = `
                <a href="/auth/login.html" class="nav-link">
                    <i class="bi bi-box-arrow-in-right"></i>
                    <span>Login</span>
                </a>
            `;
        }
    }

    async register(username, email, password, preferences = {}) {
        try {
            const response = await api.post(CONFIG.API_ENDPOINTS.REGISTER, {
                username,
                email,
                password,
                preferred_languages: preferences.languages || [],
                preferred_genres: preferences.genres || []
            });

            if (response.token && response.user) {
                this.setAuthData(response.token, response.user);
                this.handleAuthSuccess();
                return { success: true, user: response.user };
            } else {
                throw new Error('Invalid registration response');
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    async login(username, password) {
        try {
            const response = await api.post(CONFIG.API_ENDPOINTS.LOGIN, {
                username,
                password
            });

            if (response.token && response.user) {
                this.setAuthData(response.token, response.user);
                this.handleAuthSuccess();
                return { success: true, user: response.user };
            } else {
                throw new Error('Invalid login response');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.clearAuthData();
        this.handleLogout();
    }

    setAuthData(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('cinebrain_token', token);
        localStorage.setItem('cinebrain_user', JSON.stringify(user));
        this.setupTokenRefresh();
    }

    clearAuthData() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('cinebrain_token');
        localStorage.removeItem('cinebrain_user');
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    handleAuthSuccess() {
        this.setupAuthenticatedState();
        
        // Redirect based on user role and current page
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/auth/')) {
            if (this.user.is_admin) {
                Router.navigate('/admin/');
            } else {
                Router.navigate('/');
            }
        }

        // Show success toast
        App.showToast('Welcome back!', 'success');
        
        // Track login event
        if (this.user) {
            api.recordInteraction(0, 'login').catch(console.error);
        }
    }

    handleLogout() {
        this.setupUnauthenticatedState();
        
        // Clear any user-specific data
        api.clearCache();
        
        // Redirect to home page
        Router.navigate('/');
        
        // Show logout message
        App.showToast('You have been logged out', 'info');
    }

    setupTokenRefresh() {
        if (!this.token) return;

        // Clear existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        // Decode token to get expiration (simplified)
        try {
            const tokenParts = this.token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                const expirationTime = payload.exp * 1000; // Convert to milliseconds
                const currentTime = Date.now();
                const timeUntilExpiration = expirationTime - currentTime;
                
                // Refresh 5 minutes before expiration
                const refreshTime = Math.max(timeUntilExpiration - 300000, 60000);
                
                this.refreshTimer = setTimeout(() => {
                    this.refreshToken();
                }, refreshTime);
            }
        } catch (error) {
            console.warn('Could not parse token for refresh scheduling:', error);
        }
    }

    async refreshToken() {
        // Since the backend uses long-lived tokens, we'll just validate the current token
        try {
            const response = await api.get('/api/user/profile');
            if (response.user) {
                // Token is still valid, update user data
                this.user = { ...this.user, ...response.user };
                localStorage.setItem('cinebrain_user', JSON.stringify(this.user));
                this.setupTokenRefresh();
            }
        } catch (error) {
            console.warn('Token validation failed:', error);
            this.logout();
        }
    }

    // Getters
    getToken() {
        return this.token;
    }

    getUser() {
        return this.user;
    }

    isAuthenticated() {
        return !!(this.token && this.user);
    }

    isAdmin() {
        return this.user && this.user.is_admin;
    }

    getUserAvatar() {
        if (!this.user) return null;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.username)}&background=6366f1&color=fff&size=128`;
    }

    // Route protection
    requireAuth() {
        if (!this.isAuthenticated()) {
            Router.navigate('/auth/login.html');
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.isAuthenticated()) {
            Router.navigate('/auth/login.html');
            return false;
        }
        if (!this.isAdmin()) {
            App.showToast('Admin access required', 'error');
            Router.navigate('/');
            return false;
        }
        return true;
    }

    // Username-based routing
    generateProfileURL(username = null) {
        const targetUsername = username || (this.user ? this.user.username : null);
        if (!targetUsername) return '/auth/login.html';
        return `/${targetUsername}/profile`;
    }

    isOwnProfile(username) {
        return this.user && this.user.username === username;
    }
}

// Global Auth instance
const Auth = new CineBrainAuth();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainAuth;
}