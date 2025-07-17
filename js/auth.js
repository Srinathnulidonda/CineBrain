// Authentication management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.init();
    }

    init() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.isLoggedIn = true;
            this.loadUserInfo();
        }
        this.updateUI();
    }

    async loadUserInfo() {
        try {
            // In a real app, you'd make an API call to get user info
            // For now, we'll use stored data or make assumptions
            const userData = localStorage.getItem('user_data');
            if (userData) {
                this.currentUser = JSON.parse(userData);
            }
        } catch (error) {
            console.error('Failed to load user info:', error);
        }
    }

    async login(credentials) {
        try {
            showLoader(true);
            const response = await apiService.login(credentials);
            
            this.isLoggedIn = true;
            this.currentUser = {
                id: response.user_id,
                username: response.username,
                email: credentials.username.includes('@') ? credentials.username : '',
            };
            
            // Store user data
            localStorage.setItem('user_data', JSON.stringify(this.currentUser));
            
            this.updateUI();
            this.showMessage('Login successful! Welcome back.', 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
            return response;
        } catch (error) {
            this.showMessage(error.message || 'Login failed. Please try again.', 'error');
            throw error;
        } finally {
            showLoader(false);
        }
    }

    async register(userData) {
        try {
            showLoader(true);
            
            // Validate passwords match
            if (userData.password !== userData.confirmPassword) {
                throw new Error('Passwords do not match');
            }
            
            // Remove confirmPassword before sending to API
            const { confirmPassword, ...registrationData } = userData;
            
            const response = await apiService.register(registrationData);
            
            this.isLoggedIn = true;
            this.currentUser = {
                id: response.user_id,
                username: response.username,
                email: registrationData.email,
            };
            
            // Store user data
            localStorage.setItem('user_data', JSON.stringify(this.currentUser));
            
            this.updateUI();
            this.showMessage('Account created successfully! Welcome to MovieRec.', 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
            return response;
        } catch (error) {
            this.showMessage(error.message || 'Registration failed. Please try again.', 'error');
            throw error;
        } finally {
            showLoader(false);
        }
    }

    async logout() {
        try {
            await apiService.logout();
            
            this.isLoggedIn = false;
            this.currentUser = null;
            
            // Clear stored data
            localStorage.removeItem('user_data');
            
            this.updateUI();
            this.showMessage('Logged out successfully', 'success');
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    updateUI() {
        const authButtons = document.querySelector('.auth-buttons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        const adminMenuItems = document.getElementById('adminMenuItems');

        if (this.isLoggedIn && this.currentUser) {
            // Hide auth buttons, show user menu
            if (authButtons) authButtons.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            if (userName) userName.textContent = this.currentUser.username;
            
            // Show admin menu if user is admin
            if (adminMenuItems && this.isAdmin()) {
                adminMenuItems.classList.remove('hidden');
            }
        } else {
            // Show auth buttons, hide user menu
            if (authButtons) authButtons.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
        }
    }

    isAdmin() {
        return this.currentUser && this.currentUser.username === 'admin';
    }

    requireAuth() {
        if (!this.isLoggedIn) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.isLoggedIn || !this.isAdmin()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('authMessage');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'authMessage';
            messageEl.className = 'auth-message';
            
            // Try to insert after forms or at the end of main content
            const form = document.querySelector('.auth-form');
            const container = form ? form.parentNode : document.body;
            if (form) {
                container.insertBefore(messageEl, form.nextSibling);
            } else {
                container.appendChild(messageEl);
            }
        }
        
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 5000);
    }

    initLoginPage() {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        // Tab switching
        if (loginTab && registerTab) {
            loginTab.addEventListener('click', () => {
                this.switchTab('login');
            });
            
            registerTab.addEventListener('click', () => {
                this.switchTab('register');
            });
        }
        
        // Form submissions
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(loginForm);
                const credentials = {
                    username: formData.get('username'),
                    password: formData.get('password'),
                };
                await this.login(credentials);
            });
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(registerForm);
                const userData = {
                    username: formData.get('username'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    confirmPassword: formData.get('confirmPassword'),
                };
                await this.register(userData);
            });
        }
        
        // Password visibility toggles
        this.initPasswordToggles();
    }

    switchTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
        
        // Clear any existing messages
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.classList.add('hidden');
        }
    }

    initPasswordToggles() {
        const toggles = document.querySelectorAll('[id^="toggle"][id$="Password"]');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const passwordInput = toggle.previousElementSibling;
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    toggle.innerHTML = `
                        <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.172-3.172a4 4 0 015.656 0L21 21"></path>
                        </svg>
                    `;
                } else {
                    passwordInput.type = 'password';
                    toggle.innerHTML = `
                        <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    `;
                }
            });
        });
    }
}

// Global auth manager instance
window.authManager = new AuthManager();