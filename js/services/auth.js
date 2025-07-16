/**
 * Authentication Service
 * Handles user authentication, token management, and user session
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('auth_token');
        this.init();
    }

    init() {
        if (this.token) {
            this.validateToken();
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for storage changes (multi-tab support)
        window.addEventListener('storage', (e) => {
            if (e.key === 'auth_token') {
                this.token = e.newValue;
                if (this.token) {
                    this.validateToken();
                } else {
                    this.logout();
                }
            }
        });
    }

    async validateToken() {
        if (!this.token) return false;

        try {
            // Decode JWT to check expiration
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            
            if (payload.exp < currentTime) {
                this.logout();
                return false;
            }

            this.currentUser = {
                id: payload.sub,
                username: localStorage.getItem('username')
            };
            
            this.updateUI();
            return true;
        } catch (error) {
            console.error('Token validation failed:', error);
            this.logout();
            return false;
        }
    }

    async login(credentials) {
        try {
            const response = await apiService.login(credentials);
            
            if (response.success) {
                this.token = response.data.token;
                this.currentUser = {
                    id: response.data.user_id,
                    username: response.data.username
                };
                
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('username', this.currentUser.username);
                
                this.updateUI();
                this.showToast('Welcome back!', 'success');
                
                return { success: true };
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            this.showToast(error.message || 'Login failed', 'error');
            return { success: false, error: error.message };
        }
    }

    async register(userData) {
        try {
            const response = await apiService.register(userData);
            
            if (response.success) {
                this.token = response.data.token;
                this.currentUser = {
                    id: response.data.user_id,
                    username: response.data.username
                };
                
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('username', this.currentUser.username);
                
                this.updateUI();
                this.showToast('Account created successfully!', 'success');
                
                return { success: true };
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            this.showToast(error.message || 'Registration failed', 'error');
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        
        this.updateUI();
        this.showToast('You have been logged out', 'info');
        
        // Redirect to home if on protected page
        if (window.location.pathname.includes('profile') || 
            window.location.pathname.includes('favorites')) {
            window.location.href = '/';
        }
    }

    isAuthenticated() {
        return this.token && this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateUI() {
        // Update header
        const headerComponent = document.getElementById('mainHeader');
        if (headerComponent && window.HeaderComponent) {
            window.HeaderComponent.updateAuthState();
        }

        // Update personalized sections
        const personalizedSection = document.getElementById('personalizedSection');
        if (personalizedSection) {
            personalizedSection.style.display = this.isAuthenticated() ? 'block' : 'none';
        }

        // Update bottom navigation
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav && window.BottomNavComponent) {
            window.BottomNavComponent.updateAuthState();
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        const container = document.getElementById('toastContainer');
        container.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            container.removeChild(toast);
        });
    }

    // Social login methods (placeholder for future implementation)
    async loginWithGoogle() {
        // Implementation for Google OAuth
        this.showToast('Google login coming soon!', 'info');
    }

    async loginWithFacebook() {
        // Implementation for Facebook OAuth
        this.showToast('Facebook login coming soon!', 'info');
    }
}

// Export singleton instance
const authService = new AuthService();
