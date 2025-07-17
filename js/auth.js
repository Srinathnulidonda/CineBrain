class AuthService {
    constructor() {
        this.api = API;
        this.isLoading = false;
        this.currentUser = null;
        this.initializeAuth();
    }

    initializeAuth() {
        const userData = localStorage.getItem('user_data');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!localStorage.getItem('auth_token') && !!this.currentUser;
    }

    // Get current user data
    getCurrentUser() {
        return this.currentUser;
    }

    // Login method
    async login(credentials) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const loginBtn = document.getElementById('login-btn');
        const btnText = loginBtn?.querySelector('.btn-text');
        const btnLoader = loginBtn?.querySelector('.btn-loader');

        try {
            // Show loading state
            if (loginBtn) {
                loginBtn.disabled = true;
                btnText?.classList.add('hidden');
                btnLoader?.classList.remove('hidden');
            }

            const response = await this.api.login(credentials);
            
            if (response.token) {
                this.currentUser = {
                    id: response.user_id,
                    username: response.username
                };

                this.showMessage('Login successful! Redirecting...', 'success');
                
                // Small delay for UX
                await this.delay(1000);
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
                return response;
            }
        } catch (error) {
            this.showMessage(error.message || 'Login failed. Please try again.', 'error');
            throw error;
        } finally {
            this.isLoading = false;
            
            // Reset button state
            if (loginBtn) {
                loginBtn.disabled = false;
                btnText?.classList.remove('hidden');
                btnLoader?.classList.add('hidden');
            }
        }
    }

    // Register method
    async register(userData) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const registerBtn = document.getElementById('register-btn');
        const btnText = registerBtn?.querySelector('.btn-text');
        const btnLoader = registerBtn?.querySelector('.btn-loader');

        try {
            // Validate password confirmation
            if (userData.password !== userData.confirmPassword) {
                throw new Error('Passwords do not match');
            }

            // Show loading state
            if (registerBtn) {
                registerBtn.disabled = true;
                btnText?.classList.add('hidden');
                btnLoader?.classList.remove('hidden');
            }

            const response = await this.api.register({
                username: userData.username,
                email: userData.email,
                password: userData.password
            });

            if (response.token) {
                this.currentUser = {
                    id: response.user_id,
                    username: response.username
                };

                this.showMessage('Account created successfully! Redirecting...', 'success');
                
                // Small delay for UX
                await this.delay(1000);
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
                return response;
            }
        } catch (error) {
            this.showMessage(error.message || 'Registration failed. Please try again.', 'error');
            throw error;
        } finally {
            this.isLoading = false;
            
            // Reset button state
            if (registerBtn) {
                registerBtn.disabled = false;
                btnText?.classList.remove('hidden');
                btnLoader?.classList.add('hidden');
            }
        }
    }

    // Logout method
    logout() {
        this.currentUser = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_preferences');
        
        // Clear any cached data
        if (window.API) {
            window.API.clearCache();
        }

        this.showMessage('Logged out successfully', 'success');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    // Check auth status and redirect if needed
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // Redirect authenticated users away from auth pages
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = 'dashboard.html';
            return true;
        }
        return false;
    }

    // Show message to user
    showMessage(message, type) {
        const messageContainer = document.getElementById('message-container');
        if (!messageContainer) return;

        // Clear existing messages
        messageContainer.innerHTML = '';

        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;

        messageContainer.appendChild(messageElement);

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageElement.remove();
            }, 3000);
        }
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Password strength checker
    checkPasswordStrength(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const score = Object.values(requirements).filter(Boolean).length;
        
        let strength = 'weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 3) strength = 'medium';

        return { requirements, score, strength };
    }

    // Form validation
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateUsername(username) {
        // Username should be 3-20 characters, alphanumeric and underscores
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }

    // Setup real-time form validation
    setupFormValidation() {
        const forms = ['login-form', 'register-form'];
        
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (!form) return;

            const inputs = form.querySelectorAll('.form-input');
            inputs.forEach(input => {
                input.addEventListener('blur', (e) => this.validateField(e.target));
                input.addEventListener('input', (e) => this.clearFieldError(e.target));
            });
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.type) {
            case 'email':
                if (value && !this.validateEmail(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
            case 'password':
                if (value && value.length < 6) {
                    isValid = false;
                    errorMessage = 'Password must be at least 6 characters';
                }
                break;
            case 'text':
                if (field.id.includes('username') && value && !this.validateUsername(value)) {
                    isValid = false;
                    errorMessage = 'Username must be 3-20 characters (letters, numbers, underscores only)';
                }
                break;
        }

        this.showFieldError(field, isValid ? '' : errorMessage);
        return isValid;
    }

    showFieldError(field, message) {
        // Remove existing error
        this.clearFieldError(field);

        if (message) {
            field.classList.add('error');
            const errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.textContent = message;
            field.parentNode.appendChild(errorElement);
        }
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    // Setup password visibility toggle
    setupPasswordToggle() {
        const toggleButtons = document.querySelectorAll('.password-toggle');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const input = button.previousElementSibling;
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                
                // Update icon
                const icon = button.querySelector('svg path');
                if (type === 'text') {
                    // Show "eye-off" icon
                    icon.setAttribute('d', 'M9.88 9.88a3 3 0 1 0 4.24 4.24m-4.24-4.24L7.76 7.76a9 9 0 0 1 4.24-1.76c3.87 0 7 4 7 4s-.82 1.34-2.3 2.7M9.88 9.88l8.12 8.12m-8.12-8.12L12 12m0 0l2.12 2.12M15 12a3 3 0 0 0-3-3m0 0a3 3 0 0 0-3 3');
                } else {
                    // Show "eye" icon
                    icon.setAttribute('d', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z');
                }
            });
        });
    }

    // Initialize auth page functionality
    initializeAuthPage() {
        if (this.redirectIfAuthenticated()) return;

        this.setupFormValidation();
        this.setupPasswordToggle();
        this.setupFormSwitching();
        this.setupFormSubmission();
    }

    setupFormSwitching() {
        const showRegisterBtn = document.getElementById('show-register');
        const showLoginBtn = document.getElementById('show-login');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        showRegisterBtn?.addEventListener('click', () => {
            loginForm?.classList.add('hidden');
            registerForm?.classList.remove('hidden');
        });

        showLoginBtn?.addEventListener('click', () => {
            registerForm?.classList.add('hidden');
            loginForm?.classList.remove('hidden');
        });
    }

    setupFormSubmission() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const credentials = {
                username: document.getElementById('login-username').value.trim(),
                password: document.getElementById('login-password').value
            };

            if (!credentials.username || !credentials.password) {
                this.showMessage('Please fill in all fields', 'error');
                return;
            }

            try {
                await this.login(credentials);
            } catch (error) {
                console.error('Login error:', error);
            }
        });

        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userData = {
                username: document.getElementById('register-username').value.trim(),
                email: document.getElementById('register-email').value.trim(),
                password: document.getElementById('register-password').value,
                confirmPassword: document.getElementById('confirm-password').value
            };

            // Validate all fields
            if (!userData.username || !userData.email || !userData.password || !userData.confirmPassword) {
                this.showMessage('Please fill in all fields', 'error');
                return;
            }

            if (!this.validateEmail(userData.email)) {
                this.showMessage('Please enter a valid email address', 'error');
                return;
            }

            if (!this.validateUsername(userData.username)) {
                this.showMessage('Username must be 3-20 characters (letters, numbers, underscores only)', 'error');
                return;
            }

            if (userData.password.length < 6) {
                this.showMessage('Password must be at least 6 characters', 'error');
                return;
            }

            try {
                await this.register(userData);
            } catch (error) {
                console.error('Registration error:', error);
            }
        });
    }

    // Update user display in navigation
    updateUserDisplay() {
        if (!this.currentUser) return;

        const userInitial = document.getElementById('user-initial');
        const usernameDisplays = document.querySelectorAll('[data-username]');

        if (userInitial) {
            userInitial.textContent = this.currentUser.username.charAt(0).toUpperCase();
        }

        usernameDisplays.forEach(element => {
            element.textContent = this.currentUser.username;
        });

        // Update welcome message
        const welcomeUsername = document.getElementById('username');
        if (welcomeUsername) {
            welcomeUsername.textContent = this.currentUser.username;
        }
    }

    // Setup logout functionality
    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (confirm('Are you sure you want to sign out?')) {
                this.logout();
            }
        });
    }

    // Check for admin role
    isAdmin() {
        const userData = localStorage.getItem('user_data');
        if (!userData) return false;
        
        const user = JSON.parse(userData);
        return user.role === 'admin' || user.username === 'admin';
    }

    // Require admin access
    requireAdmin() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        
        if (!this.isAdmin()) {
            window.location.href = 'dashboard.html';
            return false;
        }
        
        return true;
    }
}

// Create global Auth instance
const Auth = new AuthService();

// Auto-initialize on auth pages
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('login.html')) {
        Auth.initializeAuthPage();
    } else if (Auth.isAuthenticated()) {
        Auth.updateUserDisplay();
        Auth.setupLogout();
    }
});

export default Auth;