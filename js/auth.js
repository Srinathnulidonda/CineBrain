// CineBrain Authentication & User Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.refreshTimer = null;

        this.initializeAuth();
    }

    // Initialize authentication state
    initializeAuth() {
        this.token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

        if (this.token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.setupTokenRefresh();
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.logout();
            }
        }
    }

    // Setup automatic token refresh
    setupTokenRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        // Refresh token every 25 days (token expires in 30 days)
        this.refreshTimer = setInterval(() => {
            this.refreshToken();
        }, 25 * 24 * 60 * 60 * 1000); // 25 days
    }

    // Login user
    async login(credentials) {
        try {
            const response = await api.login(credentials);

            if (response.token && response.user) {
                this.token = response.token;
                this.currentUser = response.user;

                // Store in localStorage
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, this.token);
                localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));

                this.setupTokenRefresh();
                this.dispatchAuthEvent('login', this.currentUser);

                return { success: true, user: this.currentUser };
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    // Register user
    async register(userData) {
        try {
            const response = await api.register(userData);

            if (response.token && response.user) {
                this.token = response.token;
                this.currentUser = response.user;

                // Store in localStorage
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, this.token);
                localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));

                this.setupTokenRefresh();
                this.dispatchAuthEvent('register', this.currentUser);

                return { success: true, user: this.currentUser };
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    // Logout user
    logout() {
        this.token = null;
        this.currentUser = null;

        // Clear localStorage
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);

        // Clear API cache
        api.clearCache();

        // Clear refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        this.dispatchAuthEvent('logout');

        // Redirect to home page
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }

    // Refresh token (placeholder - would need backend support)
    async refreshToken() {
        // Implementation would depend on backend refresh token strategy
        console.log('Token refresh would happen here');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!(this.token && this.currentUser);
    }

    // Check if user is admin
    isAdmin() {
        return this.isAuthenticated() && this.currentUser.is_admin;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get auth token
    getToken() {
        return this.token;
    }

    // Dispatch authentication events
    dispatchAuthEvent(type, data = null) {
        window.dispatchEvent(new CustomEvent('auth-state-change', {
            detail: { type, data }
        }));
    }

    // Update user preferences
    async updateUserPreferences(preferences) {
        if (!this.isAuthenticated()) {
            throw new Error('User not authenticated');
        }

        try {
            // Update local user data
            this.currentUser = { ...this.currentUser, ...preferences };
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));

            this.dispatchAuthEvent('user-updated', this.currentUser);

            return { success: true };
        } catch (error) {
            console.error('Error updating user preferences:', error);
            return { success: false, error: error.message };
        }
    }

    // Record user interaction
    async recordInteraction(contentId, interactionType, rating = null) {
        if (!this.isAuthenticated()) {
            return; // Silent fail for anonymous users
        }

        try {
            await api.recordInteraction({
                content_id: contentId,
                interaction_type: interactionType,
                rating: rating
            });
        } catch (error) {
            console.error('Error recording interaction:', error);
        }
    }

    // Add to watchlist
    async addToWatchlist(contentId) {
        return this.recordInteraction(contentId, 'watchlist');
    }

    // Add to favorites
    async addToFavorites(contentId) {
        return this.recordInteraction(contentId, 'favorite');
    }

    // Rate content
    async rateContent(contentId, rating) {
        return this.recordInteraction(contentId, 'rating', rating);
    }

    // View content (for tracking)
    async viewContent(contentId) {
        return this.recordInteraction(contentId, 'view');
    }

    // Generate profile URL
    getProfileURL(username = null) {
        const user = username || (this.currentUser && this.currentUser.username);
        return user ? `/${user}/profile` : '/auth/login.html';
    }

    // Check if current page requires authentication
    requiresAuth() {
        const protectedPaths = [
            '/user/',
            '/admin/',
            '/profile'
        ];

        return protectedPaths.some(path => window.location.pathname.includes(path));
    }

    // Check if current page requires admin access
    requiresAdmin() {
        return window.location.pathname.includes('/admin/');
    }

    // Redirect if not authenticated
    redirectIfNotAuthenticated() {
        if (this.requiresAuth() && !this.isAuthenticated()) {
            window.location.href = '/auth/login.html';
            return true;
        }
        return false;
    }

    // Redirect if not admin
    redirectIfNotAdmin() {
        if (this.requiresAdmin() && !this.isAdmin()) {
            window.location.href = '/';
            return true;
        }
        return false;
    }
}

// Initialize global auth manager
const auth = new AuthManager();

// Form validation utilities
const FormValidator = {
    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate username
    isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    },

    // Validate password
    isValidPassword(password) {
        return password.length >= 6;
    },

    // Show validation error
    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);

        if (field) {
            field.classList.add('is-invalid', 'border-red-500');
            field.classList.remove('is-valid', 'border-green-500');
        }

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('d-none', 'hidden');
        }
    },

    // Show validation success
    showSuccess(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);

        if (field) {
            field.classList.add('is-valid', 'border-green-500');
            field.classList.remove('is-invalid', 'border-red-500');
        }

        if (errorElement) {
            errorElement.classList.add('d-none', 'hidden');
        }
    },

    // Clear validation
    clearValidation(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);

        if (field) {
            field.classList.remove('is-invalid', 'is-valid', 'border-red-500', 'border-green-500');
        }

        if (errorElement) {
            errorElement.classList.add('d-none', 'hidden');
        }
    },

    // Validate login form
    validateLoginForm(formData) {
        const errors = {};

        if (!formData.username) {
            errors.username = 'Username is required';
        }

        if (!formData.password) {
            errors.password = 'Password is required';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    // Validate registration form
    validateRegistrationForm(formData) {
        const errors = {};

        if (!formData.username) {
            errors.username = 'Username is required';
        } else if (!this.isValidUsername(formData.username)) {
            errors.username = 'Username must be 3-20 characters (letters, numbers, underscore only)';
        }

        if (!formData.email) {
            errors.email = 'Email is required';
        } else if (!this.isValidEmail(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (!this.isValidPassword(formData.password)) {
            errors.password = 'Password must be at least 6 characters';
        }

        if (formData.confirmPassword !== formData.password) {
            errors.confirmPassword = 'Passwords do not match';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

// Handle authentication state changes globally
window.addEventListener('auth-state-change', (event) => {
    const { type, data } = event.detail;

    switch (type) {
        case 'login':
        case 'register':
            // Update UI for authenticated user
            updateUIForAuthenticatedUser(data);
            break;
        case 'logout':
            // Update UI for anonymous user
            updateUIForAnonymousUser();
            break;
        case 'user-updated':
            // Update user info in UI
            updateUserInfo(data);
            break;
    }
});

// Update UI for authenticated users
function updateUIForAuthenticatedUser(user) {
    // Update navigation
    const authLinks = document.querySelectorAll('.auth-required');
    authLinks.forEach(link => link.classList.remove('d-none', 'hidden'));

    const guestLinks = document.querySelectorAll('.guest-only');
    guestLinks.forEach(link => link.classList.add('d-none', 'hidden'));

    // Update user avatar and dropdown
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar) {
        userAvatar.textContent = user.username.charAt(0).toUpperCase();
    }

    const usernameElements = document.querySelectorAll('.username');
    usernameElements.forEach(el => el.textContent = user.username);

    // Show admin links if user is admin
    if (user.is_admin) {
        const adminLinks = document.querySelectorAll('.admin-only');
        adminLinks.forEach(link => link.classList.remove('d-none', 'hidden'));
    }
}

// Update UI for anonymous users
function updateUIForAnonymousUser() {
    // Update navigation
    const authLinks = document.querySelectorAll('.auth-required');
    authLinks.forEach(link => link.classList.add('d-none', 'hidden'));

    const guestLinks = document.querySelectorAll('.guest-only');
    guestLinks.forEach(link => link.classList.remove('d-none', 'hidden'));

    const adminLinks = document.querySelectorAll('.admin-only');
    adminLinks.forEach(link => link.classList.add('d-none', 'hidden'));
}

// Update user info
function updateUserInfo(user) {
    const usernameElements = document.querySelectorAll('.username');
    usernameElements.forEach(el => el.textContent = user.username);

    const emailElements = document.querySelectorAll('.user-email');
    emailElements.forEach(el => el.textContent = user.email);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, auth, FormValidator };
}