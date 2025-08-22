import { api } from './api.js';

// Authentication Manager
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.refreshTimer = null;
    this.initAuth();
  }

  initAuth() {
    if (this.token) {
      this.scheduleTokenRefresh();
      this.validateToken();
    }
  }

  async login(username, password) {
    try {
      const response = await api.post('LOGIN', { username, password });
      
      if (response.token) {
        this.setAuth(response.token, response.user);
        return { success: true, user: response.user };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      const response = await api.post('REGISTER', userData);
      
      if (response.token) {
        this.setAuth(response.token, response.user);
        return { success: true, user: response.user };
      } else {
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Dispatch auth change event
    window.dispatchEvent(new CustomEvent('auth-changed', { 
      detail: { user, authenticated: true } 
    }));
    
    this.scheduleTokenRefresh();
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Clear API cache
    api.clearCache();
    
    // Dispatch auth change event
    window.dispatchEvent(new CustomEvent('auth-changed', { 
      detail: { authenticated: false } 
    }));
    
    // Redirect to home
    window.location.href = '/';
  }

  async validateToken() {
    try {
      // Try to fetch user data to validate token
      const response = await api.get('WATCHLIST');
      return true;
    } catch (error) {
      if (error.message.includes('401')) {
        this.logout();
      }
      return false;
    }
  }

  scheduleTokenRefresh() {
    // Refresh token every 25 days (token expires in 30)
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    this.refreshTimer = setTimeout(() => {
      this.validateToken();
    }, 25 * 24 * 60 * 60 * 1000);
  }

  isAuthenticated() {
    return !!this.token;
  }

  getUser() {
    return this.user;
  }

  requireAuth(redirectTo = '/auth/login.html') {
    if (!this.isAuthenticated()) {
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('redirectAfterLogin', currentPath);
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  requireAdmin(redirectTo = '/') {
    if (!this.isAuthenticated() || !this.user?.is_admin) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  handleAuthRedirect() {
    const redirectPath = localStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      localStorage.removeItem('redirectAfterLogin');
      window.location.href = redirectPath;
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const auth = new AuthManager();

// Make auth available globally
window.auth = auth;