// Authentication Management
class Auth {
    constructor() {
        this.token = null;
        this.user = null;
        this.init();
    }

    // Initialize auth state from storage
    init() {
        const token = Storage.getToken();
        const user = Storage.getUser();

        if (token && user) {
            this.token = token;
            this.user = user;
            api.setAuthToken(token);
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!(this.token && this.user);
    }

    // Check if user is admin
    isAdmin() {
        return this.isAuthenticated() && this.user.is_admin === true;
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Get username
    getUsername() {
        return this.user?.username || null;
    }

    // Login user
    async login(username, password) {
        try {
            const response = await api.login(username, password);

            if (response.token && response.user) {
                this.token = response.token;
                this.user = response.user;

                // Store auth data
                Storage.setAuth(response.token, response.user);

                // Set API token
                api.setAuthToken(response.token);

                return { success: true, user: response.user };
            }

            return { success: false, error: 'Invalid response from server' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Register new user
    async register(userData) {
        try {
            const response = await api.register(userData);

            if (response.token && response.user) {
                this.token = response.token;
                this.user = response.user;

                // Store auth data
                Storage.setAuth(response.token, response.user);

                // Set API token
                api.setAuthToken(response.token);

                return { success: true, user: response.user };
            }

            return { success: false, error: 'Invalid response from server' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Logout user
    logout() {
        this.token = null;
        this.user = null;

        // Clear storage
        Storage.clearAuth();

        // Clear API token
        api.setAuthToken(null);

        // Redirect to home
        window.location.href = '/';
    }

    // Check auth and redirect if needed
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/auth/login.html';
            return false;
        }
        return true;
    }

    // Check admin auth and redirect if needed
    requireAdmin() {
        if (!this.isAdmin()) {
            window.location.href = '/';
            return false;
        }
        return true;
    }

    // Get user profile URL
    getProfileUrl() {
        const username = this.getUsername();
        return username ? `/${username}/profile` : '/auth/login.html';
    }

    // Get user-specific URL
    getUserUrl(path) {
        const username = this.getUsername();
        return username ? `/${username}/${path}` : '/auth/login.html';
    }
}

// Create global auth instance
const auth = new Auth();