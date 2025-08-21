// auth.js - JWT authentication with refresh and username routing
class AuthManager {
    constructor() {
        this.tokenKey = 'cinescope_token';
        this.userKey = 'cinescope_user';
        this.refreshTimeout = null;
    }

    // Store authentication data
    setAuthData(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.scheduleTokenRefresh();
    }

    // Get stored token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Get current user
    getUser() {
        const userStr = localStorage.getItem(this.userKey);
        return userStr ? JSON.parse(userStr) : null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    }

    // Check if user is admin
    isAdmin() {
        const user = this.getUser();
        return user && user.is_admin;
    }

    // Parse JWT token
    parseToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    // Check if token is expired
    isTokenExpired() {
        const token = this.getToken();
        if (!token) return true;

        const payload = this.parseToken(token);
        if (!payload || !payload.exp) return true;

        return Date.now() >= payload.exp * 1000;
    }

    // Schedule automatic token refresh
    scheduleTokenRefresh() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        const token = this.getToken();
        if (!token) return;

        const payload = this.parseToken(token);
        if (!payload || !payload.exp) return;

        // Refresh 5 minutes before expiry
        const refreshTime = (payload.exp * 1000) - Date.now() - (5 * 60 * 1000);

        if (refreshTime > 0) {
            this.refreshTimeout = setTimeout(() => {
                this.refreshToken();
            }, refreshTime);
        }
    }

    // Login user
    async login(username, password) {
        try {
            const response = await fetch(`${CONFIG.BASE_URL}${CONFIG.API_ENDPOINTS.LOGIN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            this.setAuthData(data.token, data.user);

            // Clear API cache for personalized content
            API.client.clearCache();

            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Register new user
    async register(userData) {
        try {
            const response = await fetch(`${CONFIG.BASE_URL}${CONFIG.API_ENDPOINTS.REGISTER}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            const data = await response.json();
            this.setAuthData(data.token, data.user);

            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Refresh token
    async refreshToken() {
        try {
            const response = await fetch(`${CONFIG.BASE_URL}${CONFIG.API_ENDPOINTS.REFRESH_TOKEN}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            const user = this.getUser();
            this.setAuthData(data.token, user);

            return true;
        } catch (error) {
            this.logout();
            return false;
        }
    }

    // Logout user
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);

        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        // Clear all caches
        API.client.clearCache();

        // Redirect to home
        App.router.navigate('/');
    }

    // Get user profile URL
    getUserProfileUrl(username = null) {
        const user = username || this.getUser()?.username;
        return user ? `/${user}/profile` : null;
    }

    // Check if current route requires authentication
    requiresAuth(path) {
        const authRoutes = ['/profile', '/watchlist', '/favorites', '/settings', '/activity'];
        const adminRoutes = ['/admin'];

        // Check if it's a user-specific route
        const userRouteMatch = path.match(/^\/([^\/]+)\/(profile|watchlist|favorites|settings|activity)$/);
        if (userRouteMatch) {
            return true;
        }

        // Check admin routes
        if (adminRoutes.some(route => path.startsWith(route))) {
            return this.isAdmin();
        }

        return authRoutes.some(route => path.startsWith(route));
    }

    // Validate user access to route
    canAccessRoute(path) {
        if (!this.requiresAuth(path)) return true;
        if (!this.isAuthenticated()) return false;

        // Check user-specific routes
        const userRouteMatch = path.match(/^\/([^\/]+)\/(profile|watchlist|favorites|settings|activity)$/);
        if (userRouteMatch) {
            const routeUsername = userRouteMatch[1];
            const currentUser = this.getUser();
            return currentUser && (currentUser.username === routeUsername || this.isAdmin());
        }

        // Check admin routes
        if (path.startsWith('/admin')) {
            return this.isAdmin();
        }

        return true;
    }

    // Initialize auth on app start
    init() {
        if (this.isAuthenticated() && !this.isTokenExpired()) {
            this.scheduleTokenRefresh();
        } else {
            this.logout();
        }
    }
}

// Create global Auth instance
const Auth = new AuthManager();