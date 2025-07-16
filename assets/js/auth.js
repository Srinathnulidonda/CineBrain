// Authentication Module
class Auth {
    constructor() {
        this.isAuthenticated = !!localStorage.getItem('authToken');
        this.userId = localStorage.getItem('userId');
        this.username = localStorage.getItem('username');
        this.isAdmin = this.checkAdminStatus();
    }
    
    checkAdminStatus() {
        // In a real app, this would be determined by the backend
        // For now, check if username is 'admin'
        return this.username === 'admin';
    }
    
    async login(credentials) {
        try {
            const response = await api.login(credentials);
            this.isAuthenticated = true;
            this.userId = response.user_id;
            this.username = response.username;
            this.isAdmin = this.checkAdminStatus();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async register(userData) {
        try {
            const response = await api.register(userData);
            this.isAuthenticated = true;
            this.userId = response.user_id;
            this.username = response.username;
            this.isAdmin = false;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    logout() {
        api.logout();
        this.isAuthenticated = false;
        this.userId = null;
        this.username = null;
        this.isAdmin = false;
    }
    
    requireAuth() {
        if (!this.isAuthenticated) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }
    
    requireAdmin() {
        if (!this.isAuthenticated || !this.isAdmin) {
            window.location.href = '/';
            return false;
        }
        return true;
    }
}

// Initialize auth
const auth = new Auth();

// Auth form handlers
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        // Show loading
        btnText.style.display = 'none';
        btnLoading.style.display = 'block';
        submitBtn.disabled = true;
        
        const credentials = {
            username: form.username.value,
            password: form.password.value
        };
        
        const result = await auth.login(credentials);
        
        if (result.success) {
            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showAlert(result.error || 'Login failed', 'error');
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    });
}

if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        // Validate passwords match
        if (form.password.value !== form.confirmPassword.value) {
            showAlert('Passwords do not match', 'error');
            return;
        }
        
        // Show loading
        btnText.style.display = 'none';
        btnLoading.style.display = 'block';
        submitBtn.disabled = true;
        
        const userData = {
            username: form.username.value,
            email: form.email.value,
            password: form.password.value
        };
        
        const result = await auth.register(userData);
        
        if (result.success) {
            showAlert('Registration successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showAlert(result.error || 'Registration failed', 'error');
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    });
}

// Alert helper
function showAlert(message, type) {
    const errorAlert = document.getElementById('authError');
    const successAlert = document.getElementById('authSuccess');
    
    if (type === 'error') {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        successAlert.style.display = 'none';
    } else {
        successAlert.textContent = message;
        successAlert.style.display = 'block';
        errorAlert.style.display = 'none';
    }
    
    setTimeout(() => {
        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';
    }, 5000);
}
