class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        this.checkAuthState();
        this.setupEventListeners();
    }

    checkAuthState() {
        const token = StorageManager.get('token');
        const user = StorageManager.get('user');
        
        if (token && user) {
            this.setUser(user);
            this.setAuthHeaders(token);
        }
    }

    setupEventListeners() {
        // Logout button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
                this.logout();
            }
        });
    }

    async login(credentials) {
        try {
            const response = await api.login(credentials);
            
            if (response.token) {
                this.setUser({
                    id: response.user_id,
                    username: response.username
                });
                
                StorageManager.set('token', response.token);
                StorageManager.set('user', {
                    id: response.user_id,
                    username: response.username
                });
                
                this.setAuthHeaders(response.token);
                
                notification.show('success', 'Welcome back!', `Hello ${response.username}!`);
                
                // Redirect to home page
                window.app.navigateTo('home');
                
                return true;
            }
        } catch (error) {
            const message = error.data?.error || 'Login failed. Please try again.';
            notification.show('error', 'Login Failed', message);
            return false;
        }
    }

    async register(userData) {
        try {
            const response = await api.register(userData);
            
            if (response.token) {
                this.setUser({
                    id: response.user_id,
                    username: response.username
                });
                
                StorageManager.set('token', response.token);
                StorageManager.set('user', {
                    id: response.user_id,
                    username: response.username
                });
                
                this.setAuthHeaders(response.token);
                
                notification.show('success', 'Welcome to MovieRec!', `Account created successfully for ${response.username}!`);
                
                // Redirect to home page
                window.app.navigateTo('home');
                
                return true;
            }
        } catch (error) {
            const message = error.data?.error || 'Registration failed. Please try again.';
            notification.show('error', 'Registration Failed', message);
            return false;
        }
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        StorageManager.remove('token');
        StorageManager.remove('user');
        
        // Clear auth headers
        delete api.defaultHeaders.Authorization;
        
        notification.show('success', 'Logged out', 'You have been logged out successfully.');
        
        // Update UI
        window.app.updateAuthState();
        
        // Redirect to home page
        window.app.navigateTo('home');
    }

    setUser(user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Update app state
        if (window.app) {
            window.app.setCurrentUser(user);
        }
    }

    setAuthHeaders(token) {
        if (window.api) {
            api.defaultHeaders.Authorization = `Bearer ${token}`;
        }
    }

    getUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }
}

// Initialize login form
function initializeLoginForm() {
    const form = document.getElementById('login-form');
    const submitBtn = document.getElementById('login-submit');
    const passwordToggle = document.getElementById('login-password-toggle');
    const passwordInput = document.getElementById('login-password');

    if (!form) return;

    // Password toggle functionality
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = passwordToggle.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const credentials = {
            username: formData.get('email'),
            password: formData.get('password')
        };

        // Validate inputs
        if (!credentials.username || !credentials.password) {
            notification.show('warning', 'Missing Information', 'Please fill in all required fields.');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loader').classList.remove('hidden');

        try {
            const success = await window.auth.login(credentials);
            
            if (success) {
                // Remember me functionality
                const rememberMe = formData.get('remember');
                if (rememberMe) {
                    StorageManager.set('remember_me', true);
                }
            }
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').style.display = 'inline';
            submitBtn.querySelector('.btn-loader').classList.add('hidden');
        }
    });
}

// Initialize register form
function initializeRegisterForm() {
    const form = document.getElementById('register-form');
    const submitBtn = document.getElementById('register-submit');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordStrength = document.getElementById('password-strength');

    if (!form) return;

    // Password toggle functionality
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = toggle.parentElement.querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            const icon = toggle.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    });

    // Password strength checker
    if (passwordInput && passwordStrength) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = calculatePasswordStrength(password);
            updatePasswordStrength(passwordStrength, strength);
        });
    }

    // Password confirmation checker
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            if (confirmPassword && password !== confirmPassword) {
                confirmPasswordInput.setCustomValidity('Passwords do not match');
            } else {
                confirmPasswordInput.setCustomValidity('');
            }
        });
    }

    // Username validation
    const usernameInput = document.getElementById('register-username');
    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            const username = e.target.value;
            const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
            
            if (username && !isValid) {
                usernameInput.setCustomValidity('Username must be 3-20 characters and contain only letters, numbers, and underscores');
            } else {
                usernameInput.setCustomValidity('');
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        const confirmPassword = formData.get('confirmPassword');
        const termsAccepted = formData.get('terms');

        // Validate inputs
        if (!userData.username || !userData.email || !userData.password) {
            notification.show('warning', 'Missing Information', 'Please fill in all required fields.');
            return;
        }

        if (userData.password !== confirmPassword) {
            notification.show('error', 'Password Mismatch', 'Passwords do not match.');
            return;
        }

        if (!termsAccepted) {
            notification.show('warning', 'Terms Required', 'Please accept the Terms of Service to continue.');
            return;
        }

        // Check password strength
        const strength = calculatePasswordStrength(userData.password);
        if (strength < 2) {
            notification.show('warning', 'Weak Password', 'Please choose a stronger password.');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loader').classList.remove('hidden');

        try {
            await window.auth.register(userData);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').style.display = 'inline';
            submitBtn.querySelector('.btn-loader').classList.add('hidden');
        }
    });
}

function calculatePasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return Math.min(strength, 4);
}

function updatePasswordStrength(strengthElement, strength) {
    const fill = strengthElement.querySelector('.strength-fill');
    const text = strengthElement.querySelector('.strength-text');
    
    const levels = ['weak', 'fair', 'good', 'strong'];
    const texts = ['Weak', 'Fair', 'Good', 'Strong'];
    
    // Remove all strength classes
    levels.forEach(level => fill.classList.remove(level));
    
    if (strength > 0) {
        const level = levels[strength - 1];
        fill.classList.add(level);
        text.textContent = `Password strength: ${texts[strength - 1]}`;
    } else {
        text.textContent = 'Password strength';
    }
}

// Initialize auth manager
window.auth = new AuthManager();

// Export functions for use in page scripts
window.initializeLoginForm = initializeLoginForm;
window.initializeRegisterForm = initializeRegisterForm;