// CineScope Authentication - JWT with Username Routing
class CineScopeAuth {
    constructor() {
        this.token = localStorage.getItem('cinescope_token');
        this.user = this.getStoredUser();
        this.setupEventListeners();
        this.checkAuthStatus();
        performance.mark(window.CineScope.PERF_MARKS.AUTH_READY);
    }

    setupEventListeners() {
        // Handle auth state changes
        window.addEventListener('auth:logout', () => {
            this.handleLogout();
        });

        // Handle page navigation
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });

        // Check auth on visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated()) {
                this.validateToken();
            }
        });
    }

    // Real JWT token validation with backend
    async validateToken() {
        if (!this.token) return false;

        try {
            // Verify token is not expired
            const payload = this.decodeJWT(this.token);
            if (payload.exp * 1000 < Date.now()) {
                this.clearAuth();
                return false;
            }

            // Validate with backend by making an authenticated request
            const response = await window.api.getWatchlist();
            return true;
        } catch (error) {
            if (error.message.includes('Authentication')) {
                this.clearAuth();
                return false;
            }
            return true; // Network error, assume valid
        }
    }

    async login(credentials) {
        try {
            const response = await window.api.login(credentials);
            
            if (response.token && response.user) {
                this.setAuth(response.token, response.user);
                this.navigateToUserProfile();
                return { success: true, user: response.user };
            }
            
            return { success: false, error: 'Invalid response format' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async register(userData) {
        try {
            const response = await window.api.register(userData);
            
            if (response.token && response.user) {
                this.setAuth(response.token, response.user);
                this.navigateToUserProfile();
                return { success: true, user: response.user };
            }
            
            return { success: false, error: 'Registration failed' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.clearAuth();
        this.navigateToHome();
        window.dispatchEvent(new CustomEvent('auth:stateChanged', { 
            detail: { authenticated: false } 
        }));
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('cinescope_token', token);
        localStorage.setItem('cinescope_user', JSON.stringify(user));
        
        window.dispatchEvent(new CustomEvent('auth:stateChanged', { 
            detail: { authenticated: true, user } 
        }));
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('cinescope_token');
        localStorage.removeItem('cinescope_user');
        window.api.clearCache();
    }

    getStoredUser() {
        try {
            const userData = localStorage.getItem('cinescope_user');
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    }

    isAuthenticated() {
        return !!(this.token && this.user);
    }

    isAdmin() {
        return this.user?.is_admin === true;
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    // Username-based routing
    navigateToUserProfile() {
        if (this.user?.username) {
            this.navigate(`/${this.user.username}/profile`);
        }
    }

    navigateToHome() {
        this.navigate('/');
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRouteChange();
    }

    // Route handling with authentication
    handleRouteChange() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);

        // Check if this is a protected route
        if (this.isProtectedRoute(path)) {
            if (!this.isAuthenticated()) {
                this.redirectToLogin(path);
                return;
            }

            // Validate username in URL matches current user
            if (segments.length >= 2 && segments[1] === 'profile') {
                const urlUsername = segments[0];
                if (this.user?.username !== urlUsername) {
                    this.navigateToUserProfile();
                    return;
                }
            }
        }

        // Check admin routes
        if (path.startsWith('/admin')) {
            if (!this.isAuthenticated() || !this.isAdmin()) {
                this.navigate('/');
                window.app?.showToast('Admin access required', 'error');
                return;
            }
        }

        // Trigger route change event
        window.dispatchEvent(new CustomEvent('route:changed', { 
            detail: { path, segments } 
        }));
    }

    isProtectedRoute(path) {
        const protectedPatterns = [
            /^\/[^\/]+\/profile/,
            /^\/[^\/]+\/watchlist/,
            /^\/[^\/]+\/favorites/,
            /^\/[^\/]+\/activity/,
            /^\/[^\/]+\/settings/,
            /^\/admin/
        ];

        return protectedPatterns.some(pattern => pattern.test(path));
    }

    redirectToLogin(intendedPath) {
        localStorage.setItem('cinescope_intended_path', intendedPath);
        this.navigate('/auth/login.html');
    }

    handleSuccessfulAuth() {
        const intendedPath = localStorage.getItem('cinescope_intended_path');
        localStorage.removeItem('cinescope_intended_path');
        
        if (intendedPath) {
            this.navigate(intendedPath);
        } else {
            this.navigateToUserProfile();
        }
    }

    checkAuthStatus() {
        if (this.isAuthenticated()) {
            this.validateToken().then(isValid => {
                if (!isValid) {
                    this.logout();
                }
            });
        }
        
        this.handleRouteChange();
    }

    // JWT helper
    decodeJWT(token) {
        try {
            const payload = token.split('.')[1];
            return JSON.parse(atob(payload));
        } catch {
            return {};
        }
    }

    // Avatar generation
    getUserAvatar(username = null) {
        const user = username || this.user?.username || 'User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user)}&background=3b82f6&color=ffffff&bold=true&size=40`;
    }

    getUserAvatarLarge(username = null) {
        const user = username || this.user?.username || 'User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user)}&background=3b82f6&color=ffffff&bold=true&size=120`;
    }
}

// Initialize global auth instance
window.auth = new CineScopeAuth();

// Export auth utilities
window.requireAuth = (callback) => {
    if (window.auth.isAuthenticated()) {
        callback();
    } else {
        window.auth.redirectToLogin(window.location.pathname);
    }
};

window.requireAdmin = (callback) => {
    if (window.auth.isAuthenticated() && window.auth.isAdmin()) {
        callback();
    } else {
        window.location.href = '/';
    }
};