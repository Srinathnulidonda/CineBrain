class AuthService {
    constructor() {
        this.currentUser = null;
        this.checkAuthStatus();
    }

    checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');
        
        if (token && userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUIForLoggedInUser();
        } else {
            this.updateUIForLoggedOutUser();
        }
    }

    updateUIForLoggedInUser() {
        document.getElementById('loginNav').classList.add('d-none');
        document.getElementById('logoutNav').classList.remove('d-none');
        document.getElementById('profileNav').classList.remove('d-none');
        
        if (this.currentUser?.preferences?.role === 'admin') {
            document.getElementById('adminNav').classList.remove('d-none');
        }
    }

    updateUIForLoggedOutUser() {
        document.getElementById('loginNav').classList.remove('d-none');
        document.getElementById('logoutNav').classList.add('d-none');
        document.getElementById('profileNav').classList.add('d-none');
        document.getElementById('adminNav').classList.add('d-none');
    }

    showLogin() {
        const modalTitle = document.getElementById('authModalTitle');
        const modalBody = document.getElementById('authModalBody');
        
        modalTitle.textContent = 'Login';
        modalBody.innerHTML = `
            <form id="loginForm">
                <div class="mb-3">
                    <label for="loginUsername" class="form-label text-white">Username/Email</label>
                    <input type="text" class="form-control" id="loginUsername" required>
                </div>
                <div class="mb-3">
                    <label for="loginPassword" class="form-label text-white">Password</label>
                    <input type="password" class="form-control" id="loginPassword" required>
                </div>
                <button type="submit" class="btn btn-netflix w-100 mb-3">Login</button>
                <p class="text-center text-light">
                    Don't have an account? 
                    <a href="#" class="text-netflix" onclick="auth.showRegister()">Register here</a>
                </p>
            </form>
        `;

        const modal = new bootstrap.Modal(document.getElementById('authModal'));
        modal.show();

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e.target);
        });
    }

    showRegister() {
        const modalTitle = document.getElementById('authModalTitle');
        const modalBody = document.getElementById('authModalBody');
        
        modalTitle.textContent = 'Register';
        modalBody.innerHTML = `
            <form id="registerForm">
                <div class="mb-3">
                    <label for="registerUsername" class="form-label text-white">Username</label>
                    <input type="text" class="form-control" id="registerUsername" required>
                </div>
                <div class="mb-3">
                    <label for="registerEmail" class="form-label text-white">Email</label>
                    <input type="email" class="form-control" id="registerEmail" required>
                </div>
                <div class="mb-3">
                    <label for="registerPassword" class="form-label text-white">Password</label>
                    <input type="password" class="form-control" id="registerPassword" required>
                </div>
                <button type="submit" class="btn btn-netflix w-100 mb-3">Register</button>
                <p class="text-center text-light">
                    Already have an account? 
                    <a href="#" class="text-netflix" onclick="auth.showLogin()">Login here</a>
                </p>
            </form>
        `;

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(e.target);
        });
    }

    async handleLogin(form) {
        const formData = new FormData(form);
        const credentials = {
            username: formData.get('loginUsername'),
            password: formData.get('loginPassword')
        };

        try {
            const response = await api.login(credentials);
            this.currentUser = {
                id: response.user_id,
                username: response.username
            };
            
            localStorage.setItem('user_data', JSON.stringify(this.currentUser));
            this.updateUIForLoggedInUser();
            
            bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
            app.showToast('Login successful!', 'success');
            app.showHome();
        } catch (error) {
            app.showToast(error.message, 'error');
        }
    }

    async handleRegister(form) {
        const formData = new FormData(form);
        const userData = {
            username: formData.get('registerUsername'),
            email: formData.get('registerEmail'),
            password: formData.get('registerPassword')
        };

        try {
            const response = await api.register(userData);
            this.currentUser = {
                id: response.user_id,
                username: response.username
            };
            
            localStorage.setItem('user_data', JSON.stringify(this.currentUser));
            localStorage.setItem('auth_token', response.token);
            api.token = response.token;
            api.updateAuthHeaders();
            
            this.updateUIForLoggedInUser();
            bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
            app.showToast('Registration successful!', 'success');
            app.showHome();
        } catch (error) {
            app.showToast(error.message, 'error');
        }
    }

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        this.currentUser = null;
        api.token = null;
        api.updateAuthHeaders();
        this.updateUIForLoggedOutUser();
        app.showToast('Logged out successfully', 'info');
        app.showHome();
    }

    isLoggedIn() {
        return !!this.currentUser;
    }
}

const auth = new AuthService();