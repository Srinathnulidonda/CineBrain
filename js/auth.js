
// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.loginModal = null;
        this.initializeAuth();
    }

    initializeAuth() {
        // Initialize login modal
        this.setupLoginModal();
        
        // Check for existing session
        this.checkExistingSession();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupLoginModal() {
        document.addEventListener('DOMContentLoaded', () => {
            const modalElement = document.getElementById('loginModal');
            if (modalElement && typeof bootstrap !== 'undefined') {
                this.loginModal = new bootstrap.Modal(modalElement);
            }
        });
    }

    async checkExistingSession() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const user = await API.validateToken(token);
                if (user) {
                    this.currentUser = user;
                    this.updateUI(user);
                    return true;
                }
            } catch (error) {
                console.warn('Session validation failed:', error);
                this.logout();
            }
        }
        return false;
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Auth tab switching
            const authTabs = document.querySelectorAll('.auth-tab');
            authTabs.forEach(tab => {
                tab.addEventListener('click', () => this.switchAuthTab(tab));
            });

            // Form submissions
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');

            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            }

            if (registerForm) {
                registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            }

            // Guest sign-in button
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.addEventListener('click', () => this.showLoginModal());
            }
        });
    }

    switchAuthTab(clickedTab) {
        const tabType = clickedTab.dataset.tab;
        
        // Update tab active states
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        clickedTab.classList.add('active');

        // Update form visibility
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });

        const targetForm = document.getElementById(`${tabType}Form`);
        if (targetForm) {
            targetForm.classList.add('active');
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        this.setLoading(true, 'loginForm');

        try {
            const response = await API.login(username, password);
            
            if (response.user) {
                this.currentUser = response.user;
                this.updateUI(response.user);
                this.hideLoginModal();
                this.showSuccess('Welcome back!');
                
                // Redirect to dashboard if on login page
                if (window.location.pathname === '/login') {
                    window.location.href = '/dashboard';
                } else {
                    // Reload current page to show personalized content
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Invalid username or password');
        } finally {
            this.setLoading(false, 'loginForm');
        }
    }

    async handleRegister(event) {
        event.preventDefault();

        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        if (!username || !email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        this.setLoading(true, 'registerForm');

        try {
            const response = await API.register({
                username,
                email,
                password,
                preferred_languages: this.getPreferredLanguages(),
                preferred_genres: this.getPreferredGenres()
            });

            if (response.user) {
                this.currentUser = response.user;
                this.updateUI(response.user);
                this.hideLoginModal();
                this.showSuccess('Account created successfully!');
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            }
        } catch (error) {
            console.error('Registration error:', error);
            if (error.message.includes('already exists')) {
                this.showError('Username or email already exists');
            } else {
                this.showError('Registration failed. Please try again.');
            }
        } finally {
            this.setLoading(false, 'registerForm');
        }
    }

    getPreferredLanguages() {
        // Default to user's locale or popular languages
        const userLang = navigator.language.toLowerCase();
        if (userLang.includes('hi')) return ['hindi'];
        if (userLang.includes('te')) return ['telugu'];
        if (userLang.includes('ta')) return ['tamil'];
        if (userLang.includes('kn')) return ['kannada'];
        if (userLang.includes('ml')) return ['malayalam'];
        return ['english'];
    }

    getPreferredGenres() {
        // Default popular genres
        return ['Action', 'Drama', 'Comedy', 'Thriller'];
    }

    updateUI(user) {
        const userMenu = document.getElementById('userMenu');
        const loginBtn = document.getElementById('loginBtn');
        const userDropdown = document.getElementById('userDropdown');
        const userAvatar = document.getElementById('userAvatar');
        const userInitial = document.getElementById('userInitial');

        if (user && userMenu) {
            // Hide login button
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }

            // Show user dropdown
            if (userDropdown) {
                userDropdown.style.display = 'block';
            }

            // Update user avatar
            if (userInitial && user.username) {
                userInitial.textContent = user.username.charAt(0).toUpperCase();
            }

            // Update username in navbar if exists
            const usernameElements = document.querySelectorAll('.username');
            usernameElements.forEach(el => {
                el.textContent = user.username;
            });

            // Show admin menu items if user is admin
            if (user.is_admin) {
                this.showAdminUI();
            }
        } else {
            // Show login button
            if (loginBtn) {
                loginBtn.style.display = 'block';
            }

            // Hide user dropdown
            if (userDropdown) {
                userDropdown.style.display = 'none';
            }
        }
    }

    showAdminUI() {
        // Add admin menu items
        const userDropdownMenu = document.querySelector('.user-dropdown-menu');
        if (userDropdownMenu && !document.querySelector('.admin-menu-item')) {
            const adminDivider = document.createElement('div');
            adminDivider.className = 'dropdown-divider';
            
            const adminDashboard = document.createElement('a');
            adminDashboard.href = '/admin/dashboard';
            adminDashboard.className = 'dropdown-item admin-menu-item';
            adminDashboard.innerHTML = `
                <svg class="item-icon" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Admin Dashboard
            `;

            const adminContent = document.createElement('a');
            adminContent.href = '/admin/content-browser';
            adminContent.className = 'dropdown-item admin-menu-item';
            adminContent.innerHTML = `
                <svg class="item-icon" viewBox="0 0 24 24">
                    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/>
                </svg>
                Content Management
            `;

            // Insert before logout button
            const logoutBtn = userDropdownMenu.querySelector('.logout-btn');
            if (logoutBtn) {
                userDropdownMenu.insertBefore(adminDivider, logoutBtn);
                userDropdownMenu.insertBefore(adminDashboard, logoutBtn);
                userDropdownMenu.insertBefore(adminContent, logoutBtn);
            }
        }
    }

    logout() {
        this.currentUser = null;
        API.logout();
        
        // Update UI
        this.updateUI(null);
        
        // Redirect to home if on protected page
        const protectedPaths = ['/dashboard', '/profile', '/admin'];
        const currentPath = window.location.pathname;
        
        if (protectedPaths.some(path => currentPath.startsWith(path))) {
            window.location.href = '/';
        } else {
            // Just reload to show public content
            window.location.reload();
        }
    }

    showLoginModal() {
        if (this.loginModal) {
            this.loginModal.show();
        }
    }

    hideLoginModal() {
        if (this.loginModal) {
            this.loginModal.hide();
        }
    }

    setLoading(isLoading, formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const submitBtn = form.querySelector('[type="submit"]');
        const inputs = form.querySelectorAll('input');

        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="loading-spinner"></span>
                ${formId === 'loginForm' ? 'Signing In...' : 'Creating Account...'}
            `;
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = formId === 'loginForm' ? 'Sign In' : 'Sign Up';
            inputs.forEach(input => input.disabled = false);
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.auth-notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `auth-notification alert alert-${type === 'error' ? 'danger' : 'success'}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            min-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Route Protection
    requireAuth() {
        if (!this.currentUser) {
            this.showLoginModal();
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.currentUser || !this.currentUser.is_admin) {
            window.location.href = '/';
            return false;
        }
        return true;
    }

    // Check if user has required permissions
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        switch (permission) {
            case 'admin':
                return this.currentUser.is_admin;
            case 'user':
                return true; // Any logged-in user
            default:
                return false;
        }
    }
}

// Global auth instance
window.Auth = new AuthManager();

// CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .auth-notification {
        border: none;
        border-radius: 0.5rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-weight: 500;
    }
`;
document.head.appendChild(notificationStyles);