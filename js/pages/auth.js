class AuthController {
    constructor(mode = 'login') {
        this.mode = mode; // 'login' or 'register'
        this.isLoading = false;
        this.currentStep = 1;
        this.maxSteps = 3;
        this.formData = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupValidation();
        this.checkRedirect();
        this.initializeForm();
    }

    setupEventListeners() {
        // Main form submission
        const form = document.getElementById(`${this.mode}-form`);
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Password toggle
        const passwordToggle = document.getElementById('password-toggle');
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => this.togglePassword());
        }

        // Confirm password toggle (for register)
        const confirmPasswordToggle = document.getElementById('confirm-password-toggle');
        if (confirmPasswordToggle) {
            confirmPasswordToggle.addEventListener('click', () => this.toggleConfirmPassword());
        }

        // Social login buttons
        document.getElementById('google-login')?.addEventListener('click', () => {
            this.handleSocialLogin('google');
        });

        document.getElementById('facebook-login')?.addEventListener('click', () => {
            this.handleSocialLogin('facebook');
        });

        // Demo access
        document.getElementById('demo-access')?.addEventListener('click', () => {
            this.handleDemoAccess();
        });

        // Forgot password
        document.getElementById('forgot-password')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotPasswordModal();
        });

        // Forgot password modal
        this.setupForgotPasswordModal();

        // Real-time validation
        this.setupRealTimeValidation();

        // Form navigation (for multi-step registration)
        this.setupFormNavigation();
    }

    setupValidation() {
        this.validators = {
            username: {
                required: true,
                minLength: 3,
                pattern: /^[a-zA-Z0-9_]+$/,
                message: 'Username must be at least 3 characters and contain only letters, numbers, and underscores'
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            password: {
                required: true,
                minLength: 6,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Password must be at least 6 characters with uppercase, lowercase, and number'
            },
            confirmPassword: {
                required: true,
                match: 'password',
                message: 'Passwords do not match'
            }
        };
    }

    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('.form-control');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    setupFormNavigation() {
        // For multi-step registration form
        document.getElementById('next-step')?.addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('prev-step')?.addEventListener('click', () => {
            this.prevStep();
        });
    }

    setupForgotPasswordModal() {
        const modal = document.getElementById('forgot-password-modal');
        const closeBtn = document.getElementById('forgot-password-close');
        const form = document.getElementById('forgot-password-form');

        closeBtn?.addEventListener('click', () => {
            modal.classList.remove('show');
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                modal.classList.remove('show');
            }
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword(e);
        });
    }

    checkRedirect() {
        // Check if user is already logged in
        if (window.authService?.isAuthenticated()) {
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect') || 'index';
            window.location.href = `../${redirect}.html`;
            return;
        }

        // Auto-fill demo credentials if demo parameter is present
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true') {
            this.fillDemoCredentials();
        }
    }

    initializeForm() {
        // Add entrance animation
        const authCard = document.querySelector('.auth-card');
        if (authCard) {
            authCard.classList.add('fade-in');
        }

        // Focus first input
        const firstInput = document.querySelector('.form-control');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 500);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Validate all fields
        if (!this.validateForm(data)) {
            this.showFormError('Please fix the errors above');
            return;
        }

        this.setLoading(true);
        this.clearAlerts();

        try {
            let result;
            if (this.mode === 'login') {
                result = await this.handleLogin(data);
            } else {
                result = await this.handleRegister(data);
            }

            if (result.success) {
                this.showSuccess(
                    this.mode === 'login' ? 'Login successful!' : 'Account created successfully!'
                );
                
                // Redirect after short delay
                setTimeout(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirect = urlParams.get('redirect') || 'index';
                    window.location.href = `../${redirect}.html`;
                }, 1500);
            } else {
                this.showError(result.error || 'Authentication failed');
                this.shakeForm();
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showError('Network error. Please try again.');
            this.shakeForm();
        } finally {
            this.setLoading(false);
        }
    }

    async handleLogin(data) {
        return await window.authService.login({
            username: data.username,
            password: data.password
        });
    }

    async handleRegister(data) {
        return await window.authService.register({
            username: data.username,
            email: data.email,
            password: data.password
        });
    }

    handleSocialLogin(provider) {
        this.showWarning(`${provider} login coming soon!`);
        
        // TODO: Implement actual social login
        // This would typically redirect to OAuth provider
        console.log(`Initiating ${provider} login...`);
    }

    handleDemoAccess() {
        // Set demo mode in localStorage
        window.storageService?.set('demo_mode', true);
        
        // Redirect to home page
        window.location.href = '../index.html#demo';
    }

    fillDemoCredentials() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (usernameInput && passwordInput) {
            usernameInput.value = 'demo@cinestream.com';
            passwordInput.value = 'demo123';
        }
    }

    validateForm(data) {
        let isValid = true;
        
        Object.keys(this.validators).forEach(field => {
            if (data.hasOwnProperty(field)) {
                const input = document.getElementById(field);
                if (input && !this.validateField(input)) {
                    isValid = false;
                }
            }
        });

        return isValid;
    }

    validateField(input) {
        const field = input.name || input.id;
        const value = input.value;
        const validator = this.validators[field];
        
        if (!validator) return true;

        let isValid = true;
        let errorMessage = '';

        // Required validation
        if (validator.required && (!value || value.trim() === '')) {
            isValid = false;
            errorMessage = `${this.getFieldLabel(field)} is required`;
        }

        // Minimum length validation
        if (isValid && validator.minLength && value.length < validator.minLength) {
            isValid = false;
            errorMessage = `${this.getFieldLabel(field)} must be at least ${validator.minLength} characters`;
        }

        // Pattern validation
        if (isValid && validator.pattern && !validator.pattern.test(value)) {
            isValid = false;
            errorMessage = validator.message || `${this.getFieldLabel(field)} format is invalid`;
        }

        // Match validation (for confirm password)
        if (isValid && validator.match) {
            const matchInput = document.getElementById(validator.match);
            if (matchInput && value !== matchInput.value) {
                isValid = false;
                errorMessage = validator.message || `${this.getFieldLabel(field)} does not match`;
            }
        }

        // Show/hide error
        if (isValid) {
            this.clearFieldError(input);
        } else {
            this.showFieldError(input, errorMessage);
        }

        return isValid;
    }

    getFieldLabel(field) {
        const labels = {
            username: 'Username',
            email: 'Email',
            password: 'Password',
            confirmPassword: 'Confirm Password'
        };
        return labels[field] || field;
    }

    showFieldError(input, message) {
        input.classList.add('error');
        const errorElement = document.getElementById(`${input.id}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearFieldError(input) {
        input.classList.remove('error');
        const errorElement = document.getElementById(`${input.id}-error`);
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    showForgotPasswordModal() {
        const modal = document.getElementById('forgot-password-modal');
        if (modal) {
            modal.classList.add('show');
            const emailInput = document.getElementById('reset-email');
            if (emailInput) {
                setTimeout(() => emailInput.focus(), 300);
            }
        }
    }

    async handleForgotPassword(e) {
        const formData = new FormData(e.target);
        const email = formData.get('email');

        if (!email || !this.validators.email.pattern.test(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        try {
            // TODO: Implement actual password reset
            console.log('Sending password reset for:', email);
            
            this.showSuccess('Password reset link sent to your email!');
            
            // Close modal after delay
            setTimeout(() => {
                document.getElementById('forgot-password-modal').classList.remove('show');
            }, 2000);
            
        } catch (error) {
            this.showError('Failed to send reset email. Please try again.');
        }
    }

    togglePassword() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('#password-toggle i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }

    toggleConfirmPassword() {
        const passwordInput = document.getElementById('confirm-password');
        const toggleIcon = document.querySelector('#confirm-password-toggle i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }

    nextStep() {
        if (this.currentStep < this.maxSteps) {
            // Validate current step
            if (this.validateCurrentStep()) {
                this.currentStep++;
                this.updateStepDisplay();
                this.showStep(this.currentStep);
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
            this.showStep(this.currentStep);
        }
    }

    validateCurrentStep() {
        // Implement step-specific validation
        return true;
    }

    updateStepDisplay() {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
            } else if (index + 1 < this.currentStep) {
                step.classList.add('completed');
            }
        });
    }

    showStep(step) {
        const stepElements = document.querySelectorAll('.form-step');
        stepElements.forEach((element, index) => {
            element.style.display = index + 1 === step ? 'block' : 'none';
        });
    }

    setLoading(loading) {
        this.isLoading = loading;
        const submitBtn = document.getElementById(`${this.mode}-submit`);
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoading = submitBtn?.querySelector('.btn-loading');
        
        if (submitBtn) {
            submitBtn.disabled = loading;
            if (btnText && btnLoading) {
                btnText.style.display = loading ? 'none' : 'block';
                btnLoading.style.display = loading ? 'flex' : 'none';
            }
        }
    }

    clearAlerts() {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)}"></i>
            <span>${message}</span>
        `;

        alertContainer.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    showError(message) {
        this.showAlert(message, 'error');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showWarning(message) {
        this.showAlert(message, 'warning');
    }

    showFormError(message) {
        this.showError(message);
    }

    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    shakeForm() {
        const authCard = document.querySelector('.auth-card');
        if (authCard) {
            authCard.classList.add('shake');
            setTimeout(() => {
                authCard.classList.remove('shake');
            }, 500);
        }
    }

    // Utility methods for enhanced UX
    showPasswordStrength(password) {
        // TODO: Implement password strength indicator
        console.log('Password strength for:', password);
    }

    enableBiometricLogin() {
        // TODO: Implement biometric login if supported
        if (window.PublicKeyCredential) {
            console.log('Biometric login supported');
        }
    }

    setupAutoComplete() {
        // TODO: Implement smart autocomplete
        console.log('Setting up autocomplete');
    }
}

// Export for use in other modules
window.AuthController = AuthController;