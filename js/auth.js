import apiClient from './api.js';
import { APP_CONFIG } from './config.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('cinescope_token');
    this.refreshTimer = null;
    this.loginCallbacks = [];
    this.logoutCallbacks = [];
    this.init();
  }

  init() {
    if (this.token) {
      this.validateToken();
    }
    this.updateUI();
  }

  async validateToken() {
    try {
      const userData = this.parseJWT(this.token);
      if (userData && userData.exp > Date.now() / 1000) {
        this.currentUser = userData;
        return true;
      } else {
        this.logout();
        return false;
      }
    } catch (error) {
      this.logout();
      return false;
    }
  }

  parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  async login(credentials) {
    try {
      const response = await apiClient.login(credentials);
      
      if (response.token && response.user) {
        this.token = response.token;
        this.currentUser = response.user;
        
        localStorage.setItem('cinescope_token', this.token);
        localStorage.setItem('cinescope_user', JSON.stringify(this.currentUser));
        
        apiClient.clearUserCache();
        this.updateUI();
        this.notifyLoginCallbacks();
        
        // Redirect to user profile
        this.redirectToProfile();
        
        return { success: true, user: this.currentUser };
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      const response = await apiClient.register(userData);
      
      if (response.token && response.user) {
        this.token = response.token;
        this.currentUser = response.user;
        
        localStorage.setItem('cinescope_token', this.token);
        localStorage.setItem('cinescope_user', JSON.stringify(this.currentUser));
        
        this.updateUI();
        this.notifyLoginCallbacks();
        
        // Redirect to user profile
        this.redirectToProfile();
        
        return { success: true, user: this.currentUser };
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    
    localStorage.removeItem('cinescope_token');
    localStorage.removeItem('cinescope_user');
    
    apiClient.clearUserCache();
    this.updateUI();
    this.notifyLogoutCallbacks();
    
    // Redirect to home
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
      if (window.app && window.app.router) {
        window.app.router.navigate('/');
      }
    }
  }

  isLoggedIn() {
    return !!this.token && !!this.currentUser;
  }

  isAdmin() {
    return this.isLoggedIn() && this.currentUser.is_admin;
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.currentUser;
  }

  redirectToProfile() {
    if (this.currentUser) {
      const profileUrl = `/${this.currentUser.username}/profile`;
      window.history.pushState({}, '', profileUrl);
      if (window.app && window.app.router) {
        window.app.router.navigate(profileUrl);
      }
    }
  }

  updateUI() {
    this.updateTopBar();
    this.updateNavigation();
  }

  updateTopBar() {
    const userAvatar = document.querySelector('.user-avatar');
    const loginBtn = document.querySelector('.login-btn');
    const userMenu = document.querySelector('.user-menu');
    
    if (this.isLoggedIn()) {
      if (userAvatar) {
        const avatarUrl = `${APP_CONFIG.AVATAR_API}?name=${encodeURIComponent(this.currentUser.username)}&background=3b82f6&color=fff&size=40`;
        userAvatar.src = avatarUrl;
        userAvatar.style.display = 'block';
      }
      if (loginBtn) loginBtn.style.display = 'none';
      if (userMenu) userMenu.style.display = 'block';
    } else {
      if (userAvatar) userAvatar.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'block';
      if (userMenu) userMenu.style.display = 'none';
    }
  }

  updateNavigation() {
    const adminLinks = document.querySelectorAll('.admin-only');
    const userLinks = document.querySelectorAll('.user-only');
    
    adminLinks.forEach(link => {
      link.style.display = this.isAdmin() ? 'block' : 'none';
    });
    
    userLinks.forEach(link => {
      link.style.display = this.isLoggedIn() ? 'block' : 'none';
    });
  }

  onLogin(callback) {
    this.loginCallbacks.push(callback);
  }

  onLogout(callback) {
    this.logoutCallbacks.push(callback);
  }

  notifyLoginCallbacks() {
    this.loginCallbacks.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (error) {
        console.error('Login callback error:', error);
      }
    });
  }

  notifyLogoutCallbacks() {
    this.logoutCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Logout callback error:', error);
      }
    });
  }

  requireAuth() {
    if (!this.isLoggedIn()) {
      this.showLoginModal();
      return false;
    }
    return true;
  }

  requireAdmin() {
    if (!this.isAdmin()) {
      this.showToast('Admin access required', 'error');
      return false;
    }
    return true;
  }

  showLoginModal() {
    if (window.app && window.app.showModal) {
      window.app.showModal('login');
    } else {
      window.location.href = '/auth/login.html';
    }
  }

  showToast(message, type = 'info') {
    if (window.app && window.app.showToast) {
      window.app.showToast(message, type);
    } else {
      alert(message);
    }
  }

  // Route protection
  protectRoute() {
    const path = window.location.pathname;
    const username = this.currentUser?.username;
    
    // Check if this is a user-specific route
    if (path.includes('/profile') || path.includes('/watchlist') || 
        path.includes('/favorites') || path.includes('/settings') || 
        path.includes('/activity')) {
      
      if (!this.isLoggedIn()) {
        this.showLoginModal();
        return false;
      }
      
      // Check if accessing own profile
      if (path.startsWith('/') && path.includes('/')) {
        const pathUsername = path.split('/')[1];
        if (pathUsername !== username && pathUsername !== 'auth' && 
            pathUsername !== 'content' && pathUsername !== 'admin') {
          // Redirect to own profile
          this.redirectToProfile();
          return false;
        }
      }
    }
    
    // Check admin routes
    if (path.startsWith('/admin/')) {
      if (!this.requireAdmin()) {
        return false;
      }
    }
    
    return true;
  }
}

// Create global instance
const authManager = new AuthManager();

// Export both class and instance
export { AuthManager };
export default authManager;