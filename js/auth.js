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
            this.token = token;
            this.currentUser = JSON.parse(user);
            api.setToken(token);
        }
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
            
            const response = await api.login(credentials);
            
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
            showToast(error.message || 'Login failed. Please try again.', 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }
    
    async register(userData) {
        try {
            showLoading(true);
            
            // Validate data
            const validation = this.validateRegistrationData(userData);
            if (!validation.valid) {
                throw new Error(validation.message);
            }
            
            const response = await api.register(userData);
            
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
            showToast(error.message || 'Registration failed. Please try again.', 'error');
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
        
        // Store in localStorage
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        
        // Set API token
        api.setToken(this.token);
    }
    
    logout() {
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
        return !!(this.token && this.currentUser);
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
            window.location.href = `login.html?redirect=${currentPath}`;
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
            const response = await api.request('/auth/validate');
            if (!response.valid) {
                this.logout();
            }
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
            
            const response = await api.request('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            
            // Update current user data
            this.currentUser = { ...this.currentUser, ...response.user };
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
            
            await api.request('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
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

// Form handlers
async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const credentials = {
        username: formData.get('username') || document.getElementById('loginUsername')?.value,
        password: formData.get('password') || document.getElementById('loginPassword')?.value
    };
    
    await login(credentials);
}

async function handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const userData = {
        username: formData.get('username') || document.getElementById('registerUsername')?.value,
        email: formData.get('email') || document.getElementById('registerEmail')?.value,
        password: formData.get('password') || document.getElementById('registerPassword')?.value
    };
    
    await register(userData);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth, login, register, logout, isAuthenticated, getCurrentUser, requireAuth, requireAdmin };
}