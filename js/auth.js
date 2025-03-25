// Authentication Logic
let authMode = 'login';

// Show login modal
function showLoginModal() {
    authMode = 'login';
    updateAuthModal();
    document.getElementById('authModal').classList.add('show');
    document.body.classList.add('no-scroll');
}

// Show signup modal
function showSignupModal() {
    authMode = 'signup';
    updateAuthModal();
    document.getElementById('authModal').classList.add('show');
    document.body.classList.add('no-scroll');
}

// Close auth modal
function closeAuthModal() {
    document.getElementById('authModal').classList.remove('show');
    document.body.classList.remove('no-scroll');
}

// Toggle between login and signup
function toggleAuthMode() {
    authMode = authMode === 'login' ? 'signup' : 'login';
    updateAuthModal();
}

// Update auth modal UI
function updateAuthModal() {
    const title = document.getElementById('authTitle');
    const emailGroup = document.getElementById('emailGroup');
    const submitBtn = document.getElementById('authSubmitBtn');
    const switchText = document.getElementById('authSwitchText');
    const switchLink = document.getElementById('authSwitchLink');
    
    if (authMode === 'login') {
        title.textContent = 'Sign In';
        emailGroup.style.display = 'none';
        submitBtn.textContent = 'Sign In';
        switchText.textContent = "Don't have an account?";
        switchLink.textContent = 'Sign Up';
    } else {
        title.textContent = 'Create Account';
        emailGroup.style.display = 'block';
        submitBtn.textContent = 'Sign Up';
        switchText.textContent = 'Already have an account?';
        switchLink.textContent = 'Sign In';
    }
}

// Handle authentication form submission
async function handleAuth(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;
    
    try {
        let response;
        
        if (authMode === 'login') {
            response = await api.login(username, password);
        } else {
            response = await api.register(username, email, password);
        }
        
        if (response.user) {
            // Set current user
            window.app.setCurrentUser(response.user);
            
            // Update UI
            updateAuthUI(true);
            closeAuthModal();
            
            // Show success message
            window.app.showToast(`Welcome ${response.user.username}!`, 'success');
            
            // Reload content for personalized experience
            window.app.loadInitialContent();
        }
    } catch (error) {
        console.error('Authentication error:', error);
        window.app.showToast(
            authMode === 'login' ? 'Invalid credentials' : 'Registration failed',
            'error'
        );
    }
}

// Update authentication UI
function updateAuthUI(isLoggedIn) {
    const authButtons = document.getElementById('authButtons');
    
    if (isLoggedIn) {
        authButtons.innerHTML = `
            <div class="dropdown">
                <button class="icon-btn" onclick="toggleUserMenu()">
                    <i class="fas fa-user-circle text-2xl"></i>
                </button>
                <div id="userMenu" class="dropdown-menu hidden">
                    <a href="/profile.html" class="dropdown-item">
                        <i class="fas fa-user mr-2"></i> Profile
                    </a>
                    <a href="/watchlist.html" class="dropdown-item">
                        <i class="fas fa-list mr-2"></i> Watchlist
                    </a>
                    <a href="/favorites.html" class="dropdown-item">
                        <i class="fas fa-heart mr-2"></i> Favorites
                    </a>
                    <hr class="dropdown-divider">
                    <a href="#" onclick="logout()" class="dropdown-item">
                        <i class="fas fa-sign-out-alt mr-2"></i> Logout
                    </a>
                </div>
            </div>
        `;
    } else {
        authButtons.innerHTML = `
            <button class="btn-secondary btn-sm" onclick="showLoginModal()">
                Sign In
            </button>
            <button class="btn-primary btn-sm" onclick="showSignupModal()">
                Sign Up
            </button>
        `;
    }
}

// Toggle user menu
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.classList.toggle('hidden');
    
    // Close menu when clicking outside
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeUserMenu);
        }, 100);
    }
}

// Close user menu
function closeUserMenu(event) {
    const menu = document.getElementById('userMenu');
    if (!event.target.closest('.dropdown')) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeUserMenu);
    }
}

// Logout
async function logout() {
    api.logout();
    window.app.setCurrentUser(null);
    updateAuthUI(false);
    window.app.showToast('Logged out successfully', 'success');
    window.app.loadInitialContent();
}

// Validate token on page load
async function validateToken() {
    try {
        // Try to get user profile with current token
        const response = await api.getPersonalizedRecommendations();
        if (response) {
            updateAuthUI(true);
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        // Token is invalid, clear it
        api.logout();
        updateAuthUI(false);
    }
}