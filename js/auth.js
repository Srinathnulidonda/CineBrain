// Authentication Manager
class AuthManager {
    static currentUser = null;
    static token = null;

    static async checkAuthState() {
        // Check if user is already authenticated (in memory only)
        if (this.token && this.currentUser) {
            document.dispatchEvent(new CustomEvent('authStateChanged', { 
                detail: this.currentUser 
            }));
            return this.currentUser;
        }
        return null;
    }

    static async login(username, password) {
        try {
            const response = await fetch(`${APIService.baseURL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                
                // Dispatch auth state change event
                document.dispatchEvent(new CustomEvent('authStateChanged', { 
                    detail: this.currentUser 
                }));

                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Login failed. Please try again.' };
        }
    }

    static async register(userData) {
        try {
            const response = await fetch(`${APIService.baseURL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                
                // Dispatch auth state change event
                document.dispatchEvent(new CustomEvent('authStateChanged', { 
                    detail: this.currentUser 
                }));

                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Registration failed. Please try again.' };
        }
    }

    static logout() {
        this.token = null;
        this.currentUser = null;
        
        // Dispatch auth state change event
        document.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: null 
        }));

        // Redirect to home page
        window.location.href = '/';
    }

    static isAuthenticated() {
        return this.token !== null && this.currentUser !== null;
    }

    static isAdmin() {
        return this.isAuthenticated() && this.currentUser?.is_admin === true;
    }

    static getAuthHeaders() {
        if (this.token) {
            return {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            };
        }
        return {
            'Content-Type': 'application/json'
        };
    }

    static requireAuth() {
        if (!this.isAuthenticated()) {
            this.showLoginPrompt();
            return false;
        }
        return true;
    }

    static requireAdmin() {
        if (!this.isAdmin()) {
            window.location.href = '/';
            return false;
        }
        return true;
    }

    static showLoginPrompt() {
        if (confirm('You need to login to perform this action. Would you like to login now?')) {
            window.location.href = '/login';
        }
    }

    static redirectBasedOnRole(user) {
        if (user.is_admin) {
            window.location.href = '/admin/dashboard';
        } else {
            window.location.href = '/dashboard';
        }
    }
}

// Export for global access
window.AuthManager = AuthManager;