// CineScope Authentication Module - JWT & User Management
class AuthManager {
  constructor() {
    this.user = null;
    this.token = null;
    this.refreshTimer = null;
    this.init();
  }

  init() {
    // Load stored auth data
    this.token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (e) {
        console.error('Failed to parse user data:', e);
        this.logout();
      }
    }

    // Setup token refresh
    if (this.token) {
      this.scheduleTokenRefresh();
    }
  }

  async login(username, password) {
    try {
      const response = await API.request(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        data: { username, password },
        useCache: false
      });

      if (response.token && response.user) {
        this.token = response.token;
        this.user = response.user;
        
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        this.scheduleTokenRefresh();
        API.clearCache(); // Clear cache on login
        
        return { success: true, user: this.user };
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      const response = await API.request(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        data: userData,
        useCache: false
      });

      if (response.token && response.user) {
        this.token = response.token;
        this.user = response.user;
        
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        this.scheduleTokenRefresh();
        
        return { success: true, user: this.user };
      }

      return { success: false, error: response.error || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    API.clearCache();
    window.location.href = '/';
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  isAdmin() {
    return this.isAuthenticated() && this.user.is_admin === true;
  }

  getUser() {
    return this.user;
  }

  getUsername() {
    return this.user?.username || null;
  }

  getUserRoute(path = '') {
    if (!this.isAuthenticated()) return '/auth/login.html';
    return `/${this.user.username}${path}`;
  }

  scheduleTokenRefresh() {
    // Schedule refresh 5 minutes before expiry (assuming 30 day tokens)
    const refreshIn = 29 * 24 * 60 * 60 * 1000; // 29 days
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshIn);
  }

  async refreshToken() {
    // In a real implementation, this would call a refresh endpoint
    // For now, we'll just log a warning
    console.warn('Token refresh not implemented - user will need to login again');
  }

  // Route protection
  requireAuth(redirectTo = '/auth/login.html') {
    if (!this.isAuthenticated()) {
      // Store intended destination
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  requireAdmin(redirectTo = '/') {
    if (!this.isAdmin()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  // User preferences
  async updatePreferences(preferences) {
    if (!this.isAuthenticated()) return false;

    try {
      // Update local user object
      this.user = {
        ...this.user,
        ...preferences
      };
      
      localStorage.setItem('user', JSON.stringify(this.user));
      
      // In a real app, this would sync with backend
      return true;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  }

  // Check if current route matches user route pattern
  isUserRoute() {
    const path = window.location.pathname;
    return this.isAuthenticated() && path.startsWith(`/${this.user.username}/`);
  }

  // Redirect after login
  handlePostLoginRedirect() {
    const redirectTo = sessionStorage.getItem('redirectAfterLogin');
    if (redirectTo) {
      sessionStorage.removeItem('redirectAfterLogin');
      window.location.href = redirectTo;
    } else {
      window.location.href = this.getUserRoute('/profile');
    }
  }
}

// Create global auth instance
const Auth = new AuthManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}