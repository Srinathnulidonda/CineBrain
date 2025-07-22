// Authentication Management
class AuthManager {
    constructor() {
        this.user = null;
        this.loadUser();
        this.setupAuthCheck();
    }

    loadUser() {
        const userData = sessionStorage.getItem('userData') || localStorage.getItem('userData');
        if (userData) {
            try {
                this.user = JSON.parse(userData);
            } catch (e) {
                console.error('Failed to parse user data:', e);
                this.clearAuth();
            }
        }
    }

    saveUser(user, remember = false) {
        this.user = user;
        const userStr = JSON.stringify(user);
        
        if (remember) {
            localStorage.setItem('userData', userStr);
        } else {
            sessionStorage.setItem('userData', userStr);
        }
    }

    clearAuth() {
        this.user = null;
        sessionStorage.removeItem('userData');
        localStorage.removeItem('userData');
        API.clearToken();
    }

    isAuthenticated() {
        return this.user !== null && API.token !== null;
    }

    isAdmin() {
        return this.user && this.user.is_admin === true;
    }

    getUser() {
        return this.user;
    }

    async login(credentials, remember = false) {
        try {
            const response = await ApiService.login(credentials);
            
            if (response.success) {
                const { token, user } = response.data;
                
                API.saveToken(token, remember);
                this.saveUser(user, remember);
                
                // Redirect based on user role
                if (user.is_admin) {
                    window.location.href = '/admin/dashboard';
                } else {
                    window.location.href = '/dashboard';
                }
                
                return { success: true };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async register(userData, remember = false) {
        try {
            const response = await ApiService.register(userData);
            
            if (response.success) {
                const { token, user } = response.data;
                
                API.saveToken(token, remember);
                this.saveUser(user, remember);
                
                window.location.href = '/dashboard';
                return { success: true };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.clearAuth();
        window.location.href = '/';
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login';
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.requireAuth()) return false;
        
        if (!this.isAdmin()) {
            showToast('Admin access required', 'error');
            window.location.href = '/dashboard';
            return false;
        }
        return true;
    }

    setupAuthCheck() {
        // Check authentication status periodically
        setInterval(() => {
            if (this.isAuthenticated() && !API.token) {
                this.clearAuth();
                window.location.href = '/login';
            }
        }, 60000); // Check every minute
    }

    updateUserProfile(userData) {
        if (this.user) {
            this.user = { ...this.user, ...userData };
            const remember = localStorage.getItem('userData') !== null;
            this.saveUser(this.user, remember);
        }
    }
}

// Initialize auth manager
const Auth = new AuthManager();

// Utility functions
window.requireAuth = function() {
    return Auth.requireAuth();
};

window.requireAdmin = function() {
    return Auth.requireAdmin();
};

window.isAuthenticated = function() {
    return Auth.isAuthenticated();
};

window.isAdmin = function() {
    return Auth.isAdmin();
};

window.getCurrentUser = function() {
    return Auth.getUser();
};

window.logout = function() {
    Auth.logout();
};

// Export Auth manager
window.Auth = Auth;