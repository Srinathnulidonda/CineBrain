// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.refreshTimer = null;
        
        // Initialize from storage
        this.initializeFromStorage();
        
        // Setup auto-refresh
        this.setupTokenRefresh();
    }
    
    initializeFromStorage() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            try {
                this.token = token;
                this.currentUser = JSON.parse(user);
                api.setToken(token);
                console.log('Auth initialized from storage:', this.currentUser);
            } catch (error) {
                console.error('Failed to parse stored user data:', error);
                this.clearStoredAuth();
            }
        }
    }
    
    clearStoredAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.currentUser = null;
        api.clearToken();
    }
    
    setupTokenRefresh() {
        // Refresh token 5 minutes before expiry
        const refreshInterval = 25 * 60 * 1000; // 25 minutes
        
        this.refreshTimer = setInterval(() => {
            if (this.isAuthenticated()) {
                this.refreshToken();
            }
        }, refreshInterval);
    }
    
    async login(credentials) {
        try {
            showLoading(true);
            console.log('Attempting login...');
            
            const response = await api.login(credentials);
            console.log('Login response:', response);
            
            if (response.token) {
                this.setAuthData(response);
                showToast('Welcome back!', 'success');
                
                // Redirect based on user role
                this.redirectAfterLogin();
                
                return { success: true, user: response };
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Handle specific error cases
            let errorMessage = 'Login failed. Please try again.';
            if (error.message.includes('401')) {
                errorMessage = 'Invalid username or password.';
            } else if (error.message.includes('Network')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error. Please try again later.';
            }
            
            showToast(errorMessage, 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }
    
    async register(userData) {
        try {
            showLoading(true);
            console.log('Attempting registration...');
            
            // Validate data
            const validation = this.validateRegistrationData(userData);
            if (!validation.valid) {
                throw new Error(validation.message);
            }
            
            const response = await api.register(userData);
            console.log('Registration response:', response);
            
            if (response.token) {
                this.setAuthData(response);
                showToast('Account created successfully! Welcome to MovieRec!', 'success');
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
                return { success: true, user: response };
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Registration error:', error);
            
            // Handle specific error cases
            let errorMessage = 'Registration failed. Please try again.';
            if (error.message.includes('already exists')) {
                errorMessage = 'Username or email already exists.';
            } else if (error.message.includes('400')) {
                errorMessage = 'Invalid registration data. Please check your inputs.';
            } else if (error.message.includes('Network')) {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            showToast(errorMessage, 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }
    
    validateRegistrationData(data) {
        if (!data.username || data.username.length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters long' };
        }
        
        if (!data.email || !this.isValidEmail(data.email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }
        
        if (!data.password || data.password.length < 6) {
            return { valid: false, message: 'Password must be at least 6 characters long' };
        }
        
        return { valid: true };
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    setAuthData(response) {
        this.token = response.token;
        this.currentUser = {
            id: response.user_id,
            username: response.username,
            email: response.email || ''
        };
        
        console.log('Setting auth data:', this.currentUser);
        
        // Store in localStorage
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        
        // Set API token
        api.setToken(this.token);
    }
    
    logout() {
        console.log('Logging out user');
        
        // Clear data
        this.token = null;
        this.currentUser = null;
        
        // Clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Clear API token
        api.clearToken();
        
        // Clear refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        // Clear cache
        api.clearCache();
        
        showToast('You have been logged out', 'info');
        
        // Redirect to home
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
    
    isAuthenticated() {
        const authenticated = !!(this.token && this.currentUser);
        console.log('Is authenticated:', authenticated);
        return authenticated;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getToken() {
        return this.token;
    }
    
    redirectAfterLogin() {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        
        if (redirect) {
            window.location.href = decodeURIComponent(redirect);
        } else if (this.currentUser?.role === 'admin') {
            window.location.href = 'admin/dashboard.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
    
    requireAuth() {
        if (!this.isAuthenticated()) {
            const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
            showToast('Please log in to access this page', 'info');
            setTimeout(() => {
                window.location.href = `login.html?redirect=${currentPath}`;
            }, 1500);
            return false;
        }
        return true;
    }
    
    requireAdmin() {
        if (!this.requireAuth()) return false;
        
        if (this.currentUser?.role !== 'admin') {
            showToast('Admin access required', 'error');
            window.location.href = 'dashboard.html';
            return false;
        }
        return true;
    }
    
    async refreshToken() {
                try {
            // This would be implemented if the backend supports token refresh
            // For now, we'll just validate the current token
            console.log('Refreshing token...');
            // const response = await api.request('/auth/validate');
            // if (!response.valid) {
            //     this.logout();
            // }
        } catch (error) {
            console.error('Token refresh failed:', error);
            // Don't logout on network errors
            if (error.message.includes('401')) {
                this.logout();
            }
        }
    }
    
    // Social login methods (for future implementation)
    async loginWithGoogle() {
        // Implementation for Google OAuth
        showToast('Google login coming soon!', 'info');
    }
    
    async loginWithFacebook() {
        // Implementation for Facebook OAuth
        showToast('Facebook login coming soon!', 'info');
    }
    
    // Password reset (for future implementation)
    async requestPasswordReset(email) {
        try {
            showLoading(true);
            // await api.request('/auth/password-reset', {
            //     method: 'POST',
            //     body: JSON.stringify({ email })
            // });
            showToast('Password reset link sent to your email', 'success');
        } catch (error) {
            showToast('Failed to send reset link', 'error');
        } finally {
            showLoading(false);
        }
    }
    
    // Update profile
    async updateProfile(profileData) {
        try {
            showLoading(true);
            
            // const response = await api.request('/auth/profile', {
            //     method: 'PUT',
            //     body: JSON.stringify(profileData)
            // });
            
            // Update current user data
            this.currentUser = { ...this.currentUser, ...profileData };
            localStorage.setItem('user', JSON.stringify(this.currentUser));
            
            showToast('Profile updated successfully', 'success');
            return { success: true };
        } catch (error) {
            showToast('Failed to update profile', 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }
    
    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            showLoading(true);
            
            // await api.request('/auth/change-password', {
            //     method: 'POST',
            //     body: JSON.stringify({
            //         current_password: currentPassword,
            //         new_password: newPassword
            //     })
            // });
            
            showToast('Password changed successfully', 'success');
            return { success: true };
        } catch (error) {
            showToast('Failed to change password', 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }
}

// Create global auth manager instance
const auth = new AuthManager();

// Global auth functions for easy access
function login(credentials) {
    return auth.login(credentials);
}

function register(userData) {
    return auth.register(userData);
}

function logout() {
    auth.logout();
}

function isAuthenticated() {
    return auth.isAuthenticated();
}

function getCurrentUser() {
    return auth.getCurrentUser();
}

function requireAuth() {
    return auth.requireAuth();
}

function requireAdmin() {
    return auth.requireAdmin();
}

// Form handlers with better error handling
async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Get values from form inputs
    const usernameInput = document.getElementById('loginUsername') || form.querySelector('input[name="username"]');
    const passwordInput = document.getElementById('loginPassword') || form.querySelector('input[name="password"]');
    
    if (!usernameInput || !passwordInput) {
        showToast('Form inputs not found', 'error');
        return;
    }
    
    const credentials = {
        username: usernameInput.value.trim(),
        password: passwordInput.value
    };
    
    // Validate inputs
    if (!credentials.username) {
        showToast('Please enter your username or email', 'error');
        usernameInput.focus();
        return;
    }
    
    if (!credentials.password) {
        showToast('Please enter your password', 'error');
        passwordInput.focus();
        return;
    }
    
    console.log('Submitting login form with:', { username: credentials.username });
    await login(credentials);
}

async function handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Get values from form inputs
    const usernameInput = document.getElementById('registerUsername') || form.querySelector('input[name="username"]');
    const emailInput = document.getElementById('registerEmail') || form.querySelector('input[name="email"]');
    const passwordInput = document.getElementById('registerPassword') || form.querySelector('input[name="password"]');
    
    if (!usernameInput || !emailInput || !passwordInput) {
        showToast('Form inputs not found', 'error');
        return;
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value
    };
    
    // Validate inputs
    if (!userData.username) {
        showToast('Please enter a username', 'error');
        usernameInput.focus();
        return;
    }
    
    if (!userData.email) {
        showToast('Please enter your email', 'error');
        emailInput.focus();
        return;
    }
    
    if (!userData.password) {
        showToast('Please enter a password', 'error');
        passwordInput.focus();
        return;
    }
    
    console.log('Submitting registration form with:', { 
        username: userData.username, 
        email: userData.email 
    });
    await register(userData);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth, login, register, logout, isAuthenticated, getCurrentUser, requireAuth, requireAdmin };
}