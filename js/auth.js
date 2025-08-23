// CineBrain Authentication System - JWT with Refresh & User Routing
class CineBrainAuth {
  constructor() {
    this.currentUser = null;
    this.authToken = null;
    this.refreshTimer = null;
    this.initAuth();
  }

  // Initialize authentication system
  initAuth() {
    this.loadStoredAuth();
    this.setupTokenRefresh();
    this.validateCurrentSession();
  }

  // Load authentication data from storage
  loadStoredAuth() {
    try {
      this.authToken = localStorage.getItem('cinebrain_token');
      const userData = localStorage.getItem('cinebrain_user');
      
      if (userData) {
        this.currentUser = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      this.clearAuth();
    }
  }

  // Validate current session with backend
  async validateCurrentSession() {
    if (!this.authToken) {
      this.handleUnauthenticated();
      return false;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        this.currentUser = userData;
        this.updateStoredUserData(userData);
        this.handleAuthenticated();
        return true;
      } else {
        this.handleInvalidToken();
        return false;
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      this.handleUnauthenticated();
      return false;
    }
  }

  // User registration
  async register(userData) {
    try {
      const response = await window.api.fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: JSON.stringify(userData),
        cache: false
      });

      if (response.token && response.user) {
        this.setAuthData(response.token, response.user);
        this.handleSuccessfulAuth();
        return { success: true, user: response.user };
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  // User login
  async login(credentials) {
    try {
      const response = await window.api.fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify(credentials),
        cache: false
      });

      if (response.token && response.user) {
        this.setAuthData(response.token, response.user);
        this.handleSuccessfulAuth();
        return { success: true, user: response.user };
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  // User logout
  logout() {
    this.clearAuth();
    this.handleUnauthenticated();
    
    // Redirect to homepage
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }

  // Set authentication data
  setAuthData(token, user) {
    this.authToken = token;
    this.currentUser = user;
    
    // Store in localStorage
    localStorage.setItem('cinebrain_token', token);
    localStorage.setItem('cinebrain_user', JSON.stringify(user));
    
    // Setup token refresh
    this.setupTokenRefresh();
  }

  // Clear authentication data
  clearAuth() {
    this.authToken = null;
    this.currentUser = null;
    
    localStorage.removeItem('cinebrain_token');
    localStorage.removeItem('cinebrain_user');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear API cache to prevent data leaks
    window.api.clearCache();
  }

  // Update stored user data
  updateStoredUserData(userData) {
    this.currentUser = userData;
    localStorage.setItem('cinebrain_user', JSON.stringify(userData));
  }

  // Setup automatic token refresh
  setupTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.authToken) return;

    try {
      // Decode JWT to get expiration (simplified - in production use a proper JWT library)
      const tokenPayload = JSON.parse(atob(this.authToken.split('.')[1]));
      const expirationTime = tokenPayload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const refreshTime = expirationTime - currentTime - (5 * 60 * 1000); // Refresh 5 minutes before expiry

      if (refreshTime > 0) {
        this.refreshTimer = setTimeout(() => {
          this.refreshToken();
        }, refreshTime);
      } else {
        // Token already expired or about to expire
        this.refreshToken();
      }
    } catch (error) {
      console.error('Token refresh setup failed:', error);
      // Fallback: try to refresh every 30 minutes
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, 30 * 60 * 1000);
    }
  }

  // Refresh authentication token
  async refreshToken() {
    if (!this.authToken) {
      this.handleUnauthenticated();
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          this.authToken = data.token;
          localStorage.setItem('cinebrain_token', data.token);
          this.setupTokenRefresh();
        }
      } else {
        this.handleInvalidToken();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.handleInvalidToken();
    }
  }

  // Handle successful authentication
  handleSuccessfulAuth() {
    this.updateUIForAuthenticatedUser();
    this.redirectAfterAuth();
  }

  // Handle authenticated state
  handleAuthenticated() {
    this.updateUIForAuthenticatedUser();
  }

  // Handle unauthenticated state
  handleUnauthenticated() {
    this.updateUIForUnauthenticatedUser();
  }

  // Handle invalid token
  handleInvalidToken() {
    console.warn('Invalid or expired token detected');
    this.clearAuth();
    this.handleUnauthenticated();
  }

  // Update UI for authenticated user
  updateUIForAuthenticatedUser() {
    // Update topbar
    const userSection = document.getElementById('userSection');
    const authSection = document.getElementById('authSection');
    const userAvatar = document.getElementById('userAvatar');
    const mobileUserAvatar = document.getElementById('mobileUserAvatar');
    const mobileProfileIcon = document.getElementById('mobileProfileIcon');

    if (userSection && authSection && this.currentUser) {
      userSection.classList.remove('d-none');
      authSection.classList.add('d-none');
      
      // Set avatar
      const avatarUrl = this.getUserAvatarUrl(this.currentUser.username);
      if (userAvatar) {
        userAvatar.src = avatarUrl;
        userAvatar.alt = this.currentUser.username;
      }
      
      // Set mobile avatar
      if (mobileUserAvatar && mobileProfileIcon) {
        mobileUserAvatar.src = avatarUrl;
        mobileUserAvatar.classList.remove('d-none');
        mobileProfileIcon.classList.add('d-none');
      }
    }

    // Update any admin-specific UI
    if (this.currentUser?.is_admin) {
      this.showAdminFeatures();
    }
  }

  // Update UI for unauthenticated user
  updateUIForUnauthenticatedUser() {
    const userSection = document.getElementById('userSection');
    const authSection = document.getElementById('authSection');
    const mobileUserAvatar = document.getElementById('mobileUserAvatar');
    const mobileProfileIcon = document.getElementById('mobileProfileIcon');

    if (userSection && authSection) {
      userSection.classList.add('d-none');
      authSection.classList.remove('d-none');
    }

    if (mobileUserAvatar && mobileProfileIcon) {
      mobileUserAvatar.classList.add('d-none');
      mobileProfileIcon.classList.remove('d-none');
    }

    this.hideAdminFeatures();
  }

  // Show admin features
  showAdminFeatures() {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
      element.classList.remove('d-none');
    });
  }

  // Hide admin features
  hideAdminFeatures() {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
      element.classList.add('d-none');
    });
  }

  // Get user avatar URL
  getUserAvatarUrl(username) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=3b82f6&color=fff&size=40&bold=true`;
  }

  // Redirect after authentication
  redirectAfterAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect') || this.getDefaultRedirectPath();
    
    // Small delay to ensure UI updates complete
    setTimeout(() => {
      window.location.href = redirectTo;
    }, 100);
  }

  // Get default redirect path based on user
  getDefaultRedirectPath() {
    if (!this.currentUser) return '/';
    
    if (this.currentUser.is_admin) {
      return '/admin/index.html';
    }
    
    return `/${this.currentUser.username}/profile`;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!(this.authToken && this.currentUser);
  }

  // Check if user is admin
  isAdmin() {
    return this.currentUser?.is_admin || false;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get auth token
  getAuthToken() {
    return this.authToken;
  }

  // Require authentication for protected pages
  requireAuth() {
    if (!this.isAuthenticated()) {
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/auth/login.html?redirect=${encodeURIComponent(currentPath)}`;
      return false;
    }
    return true;
  }

  // Require admin access
  requireAdmin() {
    if (!this.requireAuth()) return false;
    
    if (!this.isAdmin()) {
      alert('Admin access required');
      window.location.href = '/';
      return false;
    }
    return true;
  }

  // Generate username-based profile URL
  getUserProfileUrl(username = null) {
    const user = username || this.currentUser?.username;
    return user ? `/${user}/profile` : '/auth/login.html';
  }
}

// Global authentication instance
window.auth = new CineBrainAuth();

// Global helper functions
window.requireAuth = () => window.auth.requireAuth();
window.requireAdmin = () => window.auth.requireAdmin();
window.getCurrentUser = () => window.auth.getCurrentUser();
window.isAuthenticated = () => window.auth.isAuthenticated();
window.isAdmin = () => window.auth.isAdmin();
window.logout = () => window.auth.logout();