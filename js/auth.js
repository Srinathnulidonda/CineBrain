// Authentication Module with JWT and Username Routing
class AuthManager {
    constructor() {
        this.user = null;
        this.loadUser();
    }

    // Load user from localStorage
    loadUser() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                this.user = JSON.parse(userStr);
            } catch (e) {
                this.logout();
            }
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.user && !!localStorage.getItem('auth_token');
    }

    // Check if user is admin
    isAdmin() {
        return this.user && this.user.is_admin === true;
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Login
    async login(username, password) {
        try {
            const response = await apiClient.post(CONFIG.API_ENDPOINTS.LOGIN, {
                username,
                password
            });

            if (response.token) {
                // Store auth data
                localStorage.setItem('auth_token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                this.user = response.user;

                // Sync with service worker
                await apiClient.syncWithServiceWorker();

                // Redirect to user profile
                window.location.href = `/${response.user.username}/profile`;
                return { success: true };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Register
    async register(userData) {
        try {
            const response = await apiClient.post(CONFIG.API_ENDPOINTS.REGISTER, userData);

            if (response.token) {
                // Store auth data
                localStorage.setItem('auth_token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                this.user = response.user;

                // Redirect to user profile
                window.location.href = `/${response.user.username}/profile`;
                return { success: true };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Logout
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        this.user = null;
        apiClient.clearCache();
        window.location.href = '/';
    }

    // Update user preferences
    async updatePreferences(preferences) {
        try {
            const response = await apiClient.put('/user/preferences', preferences);
            if (response.success) {
                this.user = { ...this.user, ...preferences };
                localStorage.setItem('user', JSON.stringify(this.user));
                return { success: true };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Route protection
    requireAuth() {
        if (!this.isAuthenticated()) {
            const currentPath = window.location.pathname;
            localStorage.setItem('redirect_after_login', currentPath);
            window.location.href = '/auth/login.html';
            return false;
        }
        return true;
    }

    // Admin route protection
    requireAdmin() {
        if (!this.isAdmin()) {
            window.location.href = '/';
            return false;
        }
        return true;
    }

    // Username-based routing
    validateUsernameRoute(username) {
        return this.user && this.user.username === username;
    }

    // Get profile URL
    getProfileUrl(username = null) {
        const targetUsername = username || (this.user && this.user.username);
        return targetUsername ? `/${targetUsername}/profile` : '/auth/login.html';
    }
}

// Export singleton instance
const auth = new AuthManager();