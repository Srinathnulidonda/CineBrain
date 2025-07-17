// Authentication management

class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.refreshTimer = null;
        this.init();
    }

    init() {
        this.loadStoredAuth();
        this.setupAuthUI();
        this.setupFormValidation();
        this.checkAuthStatus();
    }

    loadStoredAuth() {
        this.token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');
        
        if (userData) {
            try {
                this.user = JSON.parse(userData);
            } catch (error) {
                console.error('Failed to parse user data:', error);
                this.clearAuth();
            }
        }
        
        if (this.token) {
            api.token = this.token;
        }
    }

    setupAuthUI() {
        const userMenu = document.getElementById('userMenu');
        const authButtons = document.getElementById('authButtons');
        const personalizedSection = document.getElementById('personalizedSection');
        const userRatingSection = document.getElementById('userRatingSection');
        
        if (this.isAuthenticated()) {
            if (userMenu) userMenu.classList.remove('d-none');
            if (authButtons) authButtons.classList.add('d-none');
            if (personalizedSection) personalizedSection.classList.remove('d-none');
            if (userRatingSection) userRatingSection.classList.remove('d-none');
            
            this.updateUserInfo();
        } else {
            if (userMenu) userMenu.classList.add('d-none');
            if (authButtons) authButtons.classList.remove('d-none');
            if (personalizedSection) personalizedSection.classList.add('d-none');
            if (userRatingSection) userRatingSection.classList.add('d-none');
        }
    }

    updateUserInfo() {
        if (this.user) {
            const usernameElements = document.querySelectorAll('[data-username]');
            usernameElements.forEach(el => {
                el.textContent = this.user.username;
            });
        }
    }

    setupFormValidation() {
        // Login form validation
        const loginForm = document.getElementById('loginFormElement');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.validateLoginForm(loginForm)) {
                    this.handleLogin(loginForm);
                }
            });
        }

        // Register form validation
        const registerForm = document.getElementById('registerFormElement');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.validateRegisterForm(registerForm)) {
                    this.handleRegister(registerForm);
                }
            });
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgotPasswordFormElement');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword(forgotForm);
            });
        }

        // Real-time validation
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        // Username validation
        const usernameInput = document.getElementById('registerUsername');
        if (usernameInput) {
            usernameInput.addEventListener('input', debounce(() => {
                this.validateUsername(usernameInput.value);
            }, 500));
        }

        // Email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
                emailInputs.forEach(input => {
            input.addEventListener('input', debounce(() => {
                this.validateEmail(input.value, input);
            }, 300));
        });

        // Password validation
        const passwordInput = document.getElementById('registerPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                this.validatePassword(passwordInput.value, passwordInput);
            });
        }

        // Confirm password validation
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput && passwordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch(passwordInput.value, confirmPasswordInput.value, confirmPasswordInput);
            });
        }
    }

    validateLoginForm(form) {
        const username = form.querySelector('#loginUsername').value.trim();
        const password = form.querySelector('#loginPassword').value;

        let isValid = true;

        if (!username) {
            this.showFieldError('loginUsername', 'Username or email is required');
            isValid = false;
        } else {
            this.clearFieldError('loginUsername');
        }

        if (!password) {
            this.showFieldError('loginPassword', 'Password is required');
            isValid = false;
        } else {
            this.clearFieldError('loginPassword');
        }

        return isValid;
    }

    validateRegisterForm(form) {
        const username = form.querySelector('#registerUsername').value.trim();
        const email = form.querySelector('#registerEmail').value.trim();
        const password = form.querySelector('#registerPassword').value;
        const confirmPassword = form.querySelector('#confirmPassword').value;
        const agreeTerms = form.querySelector('#agreeTerms').checked;

        let isValid = true;

        // Username validation
        if (!this.validateUsername(username)) {
            isValid = false;
        }

        // Email validation
        if (!this.validateEmail(email, form.querySelector('#registerEmail'))) {
            isValid = false;
        }

        // Password validation
        if (!this.validatePassword(password, form.querySelector('#registerPassword'))) {
            isValid = false;
        }

        // Confirm password validation
        if (!this.validatePasswordMatch(password, confirmPassword, form.querySelector('#confirmPassword'))) {
            isValid = false;
        }

        // Terms agreement
        if (!agreeTerms) {
            this.showFieldError('agreeTerms', 'You must agree to the terms and conditions');
            isValid = false;
        } else {
            this.clearFieldError('agreeTerms');
        }

        return isValid;
    }

    validateUsername(username) {
        const usernameInput = document.getElementById('registerUsername');
        
        if (!username) {
            this.showFieldError('registerUsername', 'Username is required');
            return false;
        }

        if (username.length < 3) {
            this.showFieldError('registerUsername', 'Username must be at least 3 characters long');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showFieldError('registerUsername', 'Username can only contain letters, numbers, and underscores');
            return false;
        }

        this.clearFieldError('registerUsername');
        return true;
    }

    validateEmail(email, inputElement = null) {
        const emailInput = inputElement || document.getElementById('registerEmail');
        
        if (!email) {
            this.showFieldError(emailInput.id, 'Email is required');
            return false;
        }

        if (!Utils.isEmail(email)) {
            this.showFieldError(emailInput.id, 'Please enter a valid email address');
            return false;
        }

        this.clearFieldError(emailInput.id);
        return true;
    }

    validatePassword(password, inputElement = null) {
        const passwordInput = inputElement || document.getElementById('registerPassword');
        
        if (!password) {
            this.showFieldError(passwordInput.id, 'Password is required');
            return false;
        }

        if (password.length < 6) {
            this.showFieldError(passwordInput.id, 'Password must be at least 6 characters long');
            return false;
        }

        // Check password strength
        const strength = this.getPasswordStrength(password);
        this.updatePasswordStrengthIndicator(strength);

        if (strength.score < 2) {
            this.showFieldError(passwordInput.id, 'Password is too weak. Please use a stronger password.');
            return false;
        }

        this.clearFieldError(passwordInput.id);
        return true;
    }

    validatePasswordMatch(password, confirmPassword, inputElement) {
        if (!confirmPassword) {
            this.showFieldError(inputElement.id, 'Please confirm your password');
            return false;
        }

        if (password !== confirmPassword) {
            this.showFieldError(inputElement.id, 'Passwords do not match');
            return false;
        }

        this.clearFieldError(inputElement.id);
        return true;
    }

    getPasswordStrength(password) {
        let score = 0;
        const feedback = [];

        // Length check
        if (password.length >= 8) score++;
        else feedback.push('Use at least 8 characters');

        // Lowercase check
        if (/[a-z]/.test(password)) score++;
        else feedback.push('Add lowercase letters');

        // Uppercase check
        if (/[A-Z]/.test(password)) score++;
        else feedback.push('Add uppercase letters');

        // Number check
        if (/\d/.test(password)) score++;
        else feedback.push('Add numbers');

        // Special character check
        if (/[^A-Za-z0-9]/.test(password)) score++;
        else feedback.push('Add special characters');

        const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
        const color = ['#ff4444', '#ff8800', '#ffaa00', '#88cc00', '#00cc44'][score];

        return { score, strength, color, feedback };
    }

    updatePasswordStrengthIndicator(strengthData) {
        let indicator = document.getElementById('passwordStrengthIndicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'passwordStrengthIndicator';
            indicator.className = 'password-strength mt-2';
            
            const passwordInput = document.getElementById('registerPassword');
            if (passwordInput) {
                passwordInput.parentNode.appendChild(indicator);
            }
        }

        const percentage = (strengthData.score / 5) * 100;
        
        indicator.innerHTML = `
            <div class="strength-bar bg-gray-600 rounded" style="height: 4px;">
                <div class="strength-fill rounded" style="width: ${percentage}%; height: 100%; background-color: ${strengthData.color}; transition: all 0.3s ease;"></div>
            </div>
            <div class="strength-text d-flex justify-content-between mt-1">
                <small style="color: ${strengthData.color};">${strengthData.strength}</small>
                ${strengthData.feedback.length > 0 ? `<small class="text-gray-400">${strengthData.feedback[0]}</small>` : ''}
            </div>
        `;
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.classList.add('is-invalid');
        
        let feedback = field.parentNode.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            field.parentNode.appendChild(feedback);
        }
        
        feedback.textContent = message;
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.classList.remove('is-invalid');
        
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = '';
        }
    }

    async handleLogin(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        try {
            this.setButtonLoading(submitBtn, btnText, btnSpinner, true);

            const formData = new FormData(form);
            const credentials = {
                username: formData.get('username') || document.getElementById('loginUsername').value,
                password: formData.get('password') || document.getElementById('loginPassword').value
            };

            const response = await api.login(credentials);
            
            if (response.token) {
                this.setAuth(response.token, {
                    id: response.user_id,
                    username: response.username
                });

                Toast.success('Welcome back! Login successful.');
                
                // Redirect to intended page or home
                const redirectUrl = Utils.getUrlParam('redirect') || 'index.html';
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1000);
            }

        } catch (error) {
            console.error('Login error:', error);
            
            if (error.message.includes('Invalid credentials')) {
                Toast.error('Invalid username or password. Please try again.');
            } else if (error.message.includes('Offline')) {
                Toast.warning('You are offline. Please check your connection and try again.');
            } else {
                Toast.error('Login failed. Please try again.');
            }
        } finally {
            this.setButtonLoading(submitBtn, btnText, btnSpinner, false);
        }
    }

    async handleRegister(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        try {
            this.setButtonLoading(submitBtn, btnText, btnSpinner, true);

            const formData = new FormData(form);
            const userData = {
                username: formData.get('username') || document.getElementById('registerUsername').value,
                email: formData.get('email') || document.getElementById('registerEmail').value,
                password: formData.get('password') || document.getElementById('registerPassword').value
            };

            const response = await api.register(userData);
            
            if (response.token) {
                this.setAuth(response.token, {
                    id: response.user_id,
                    username: response.username
                });

                Toast.success('Account created successfully! Welcome to MovieRec.');
                
                // Track registration
                Utils.trackEvent('user_register', {
                    method: 'email',
                    username: response.username
                });

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }

        } catch (error) {
            console.error('Registration error:', error);
            
            if (error.message.includes('Username already exists')) {
                this.showFieldError('registerUsername', 'This username is already taken');
                Toast.error('Username already exists. Please choose a different one.');
            } else if (error.message.includes('Email already exists')) {
                this.showFieldError('registerEmail', 'This email is already registered');
                Toast.error('Email already registered. Please use a different email or try logging in.');
            } else if (error.message.includes('Offline')) {
                Toast.warning('You are offline. Please check your connection and try again.');
            } else {
                Toast.error('Registration failed. Please try again.');
            }
        } finally {
            this.setButtonLoading(submitBtn, btnText, btnSpinner, false);
        }
    }

    async handleForgotPassword(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        try {
            this.setButtonLoading(submitBtn, btnText, btnSpinner, true);

            const email = document.getElementById('forgotEmail').value;
            
            // Simulate API call (implement actual forgot password endpoint)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            Toast.success('Password reset instructions have been sent to your email.');
            showLoginForm();

        } catch (error) {
            console.error('Forgot password error:', error);
            Toast.error('Failed to send reset instructions. Please try again.');
        } finally {
            this.setButtonLoading(submitBtn, btnText, btnSpinner, false);
        }
    }

    setButtonLoading(button, textElement, spinnerElement, isLoading) {
        if (isLoading) {
            button.disabled = true;
            textElement.classList.add('d-none');
            spinnerElement.classList.remove('d-none');
        } else {
            button.disabled = false;
            textElement.classList.remove('d-none');
            spinnerElement.classList.add('d-none');
        }
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        api.token = token;
        this.setupAuthUI();
        this.startTokenRefresh();
        
        // Track login
        Utils.trackEvent('user_login', {
            method: 'email',
            user_id: user.id
        });
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        api.token = null;
        this.setupAuthUI();
        this.stopTokenRefresh();
    }

    async logout() {
        try {
            // Track logout
            if (this.user) {
                Utils.trackEvent('user_logout', {
                    user_id: this.user.id
                });
            }

            await api.logout();
            this.clearAuth();
            
            Toast.success('You have been logged out successfully.');
            
            // Redirect to home page
            if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                window.location.href = 'index.html';
            }

        } catch (error) {
            console.error('Logout error:', error);
            // Clear auth anyway
            this.clearAuth();
        }
    }

    isAuthenticated() {
        return !!(this.token && this.user);
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            const currentUrl = encodeURIComponent(window.location.href);
            window.location.href = `login.html?redirect=${currentUrl}`;
            return false;
        }
        return true;
    }

    checkAuthStatus() {
        // Check if token is expired (basic check)
        if (this.token) {
            try {
                const payload = JSON.parse(atob(this.token.split('.')[1]));
                const now = Date.now() / 1000;
                
                if (payload.exp && payload.exp < now) {
                    console.log('Token expired, clearing auth');
                    this.clearAuth();
                }
            } catch (error) {
                console.error('Token validation error:', error);
                this.clearAuth();
            }
        }
    }

    startTokenRefresh() {
        // Refresh token every 25 minutes (assuming 30 min expiry)
        this.refreshTimer = setInterval(() => {
            this.refreshToken();
        }, 25 * 60 * 1000);
    }

    stopTokenRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    async refreshToken() {
        try {
            // Implement token refresh endpoint
            // const response = await api.refreshToken();
                        // if (response.token) {
            //     this.token = response.token;
            //     localStorage.setItem('authToken', response.token);
            //     api.token = response.token;
            // }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuth();
        }
    }

    // Social login methods (for future implementation)
    async loginWithGoogle() {
        try {
            // Implement Google OAuth
            Toast.info('Google login coming soon!');
        } catch (error) {
            console.error('Google login error:', error);
            Toast.error('Google login failed. Please try again.');
        }
    }

    async loginWithFacebook() {
        try {
            // Implement Facebook OAuth
            Toast.info('Facebook login coming soon!');
        } catch (error) {
            console.error('Facebook login error:', error);
            Toast.error('Facebook login failed. Please try again.');
        }
    }

    // Biometric authentication (for supported devices)
    async loginWithBiometric() {
        if (!window.PublicKeyCredential) {
            Toast.error('Biometric authentication not supported on this device.');
            return;
        }

        try {
            // Implement WebAuthn
            Toast.info('Biometric login coming soon!');
        } catch (error) {
            console.error('Biometric login error:', error);
            Toast.error('Biometric login failed. Please try again.');
        }
    }

    // Session management
    extendSession() {
        if (this.isAuthenticated()) {
            const extendedExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes
            localStorage.setItem('sessionExpiry', extendedExpiry.toString());
        }
    }

    checkSessionExpiry() {
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        if (sessionExpiry && Date.now() > parseInt(sessionExpiry)) {
            this.clearAuth();
            Toast.warning('Your session has expired. Please log in again.');
            return false;
        }
        return true;
    }

    // User activity tracking
    trackUserActivity() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, debounce(() => {
                this.extendSession();
            }, 60000)); // Extend session every minute of activity
        });
    }

    // Account management
    async updateProfile(profileData) {
        try {
            // Implement profile update endpoint
            // const response = await api.updateProfile(profileData);
            
            // Update local user data
            this.user = { ...this.user, ...profileData };
            localStorage.setItem('user', JSON.stringify(this.user));
            
            Toast.success('Profile updated successfully!');
            return true;
        } catch (error) {
            console.error('Profile update error:', error);
            Toast.error('Failed to update profile. Please try again.');
            return false;
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            // Implement change password endpoint
            // const response = await api.changePassword({
            //     current_password: currentPassword,
            //     new_password: newPassword
            // });
            
            Toast.success('Password changed successfully!');
            return true;
        } catch (error) {
            console.error('Password change error:', error);
            
            if (error.message.includes('Invalid current password')) {
                Toast.error('Current password is incorrect.');
            } else {
                Toast.error('Failed to change password. Please try again.');
            }
            return false;
        }
    }

    async deleteAccount() {
        const confirmed = await this.showConfirmDialog(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            'Delete Account',
            'btn-danger'
        );

        if (!confirmed) return false;

        try {
            // Implement account deletion endpoint
            // await api.deleteAccount();
            
            this.clearAuth();
            Toast.success('Account deleted successfully.');
            window.location.href = 'index.html';
            return true;
        } catch (error) {
            console.error('Account deletion error:', error);
            Toast.error('Failed to delete account. Please try again.');
            return false;
        }
    }

    // Helper methods
    showConfirmDialog(title, message, confirmText = 'Confirm', confirmClass = 'btn-netflix-red') {
        return new Promise((resolve) => {
            const modal = new Modal({
                title: title,
                content: `<p class="text-gray-300">${message}</p>`,
                buttons: [
                    {
                        text: 'Cancel',
                        className: 'btn-outline-light',
                        action: 'cancel'
                    },
                    {
                        text: confirmText,
                        className: `btn ${confirmClass}`,
                        action: 'confirm'
                    }
                ],
                onAction: (action, modalInstance) => {
                    modalInstance.hide();
                    resolve(action === 'confirm');
                }
            });
            modal.show();
        });
    }

    // Privacy and security
    async enableTwoFactor() {
        try {
            // Implement 2FA setup
            Toast.info('Two-factor authentication setup coming soon!');
        } catch (error) {
            console.error('2FA setup error:', error);
            Toast.error('Failed to setup two-factor authentication.');
        }
    }

    async getLoginHistory() {
        try {
            // Implement login history endpoint
            // const response = await api.getLoginHistory();
            // return response.history;
            return [];
        } catch (error) {
            console.error('Login history error:', error);
            return [];
        }
    }

    async getActiveDevices() {
        try {
            // Implement active devices endpoint
            // const response = await api.getActiveDevices();
            // return response.devices;
            return [];
        } catch (error) {
            console.error('Active devices error:', error);
            return [];
        }
    }

    async revokeDevice(deviceId) {
        try {
            // Implement device revocation endpoint
            // await api.revokeDevice(deviceId);
            Toast.success('Device access revoked successfully.');
            return true;
        } catch (error) {
            console.error('Device revocation error:', error);
            Toast.error('Failed to revoke device access.');
            return false;
        }
    }
}

// Form switching functions
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('d-none');
    document.getElementById('registerForm').classList.add('d-none');
    document.getElementById('forgotPasswordForm').classList.add('d-none');
    
    // Clear form errors
    clearAllFormErrors();
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('d-none');
    document.getElementById('registerForm').classList.remove('d-none');
    document.getElementById('forgotPasswordForm').classList.add('d-none');
    
    // Clear form errors
    clearAllFormErrors();
}

function showForgotPassword() {
    document.getElementById('loginForm').classList.add('d-none');
    document.getElementById('registerForm').classList.add('d-none');
    document.getElementById('forgotPasswordForm').classList.remove('d-none');
    
    // Clear form errors
    clearAllFormErrors();
}

function clearAllFormErrors() {
    const invalidFields = document.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => {
        field.classList.remove('is-invalid');
    });
    
    const feedbacks = document.querySelectorAll('.invalid-feedback');
    feedbacks.forEach(feedback => {
        feedback.textContent = '';
    });
}

// Password visibility toggle
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentNode.querySelector('.password-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.classList.remove('fa-eye');
        button.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        button.classList.remove('fa-eye-slash');
        button.classList.add('fa-eye');
    }
}

// Form validation initialization
function initializeFormValidation() {
    // Bootstrap form validation
    const forms = document.querySelectorAll('.needs-validation');
    
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

// Global auth instance
const auth = new AuthManager();

// Global auth functions
function login() {
    window.location.href = 'login.html';
}

function logout() {
    auth.logout();
}

function showProfile() {
    // Implement profile modal or page
    Toast.info('Profile page coming soon!');
}

function requireAuth() {
    return auth.requireAuth();
}

// Auto-logout on tab visibility change (security feature)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && auth.isAuthenticated()) {
        // Start logout timer when tab becomes hidden
        setTimeout(() => {
            if (document.hidden) {
                auth.logout();
                Toast.warning('You have been logged out due to inactivity.');
            }
        }, 30 * 60 * 1000); // 30 minutes
    }
});

// Initialize user activity tracking
document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        auth.trackUserActivity();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, auth };
}