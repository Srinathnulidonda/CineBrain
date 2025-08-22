class AuthManager {
  constructor() {
    this.token = localStorage.getItem('cinebrain_token');
    this.user = JSON.parse(localStorage.getItem('cinebrain_user') || 'null');
    this.isAuthenticated = !!this.token;
  }
  
  async login(username, password) {
    try {
      const response = await fetch(`${CineBrain.API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        this.isAuthenticated = true;
        
        localStorage.setItem('cinebrain_token', this.token);
        localStorage.setItem('cinebrain_user', JSON.stringify(this.user));
        
        this.dispatchAuthEvent('login', this.user);
        return { success: true, user: this.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  }
  
  async register(userData) {
    try {
      const response = await fetch(`${CineBrain.API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        this.isAuthenticated = true;
        
        localStorage.setItem('cinebrain_token', this.token);
        localStorage.setItem('cinebrain_user', JSON.stringify(this.user));
        
        this.dispatchAuthEvent('register', this.user);
        return { success: true, user: this.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error' };
    }
  }
  
  logout() {
    this.token = null;
    this.user = null;
    this.isAuthenticated = false;
    
    localStorage.removeItem('cinebrain_token');
    localStorage.removeItem('cinebrain_user');
    
    this.dispatchAuthEvent('logout');
    
    if (window.location.pathname !== '/' && !window.location.pathname.includes('auth')) {
      window.location.href = '/';
    }
  }
  
  getAuthHeaders() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }
  
  checkAuthStatus() {
    if (!this.token) {
      this.logout();
      return false;
    }
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp < currentTime) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      this.logout();
      return false;
    }
  }
  
  requireAuth() {
    if (!this.checkAuthStatus()) {
      window.location.href = '/auth/login.html';
      return false;
    }
    return true;
  }
  
  requireAdmin() {
    if (!this.requireAuth()) return false;
    
    if (!this.user?.is_admin) {
      window.location.href = '/';
      return false;
    }
    return true;
  }
  
  getUserAvatarUrl() {
    if (!this.user) return null;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.username)}&background=3b82f6&color=fff&size=40&rounded=true`;
  }
  
  dispatchAuthEvent(type, user = null) {
    window.dispatchEvent(new CustomEvent('auth:' + type, {
      detail: { user, timestamp: Date.now() }
    }));
  }
}

// Global auth instance
window.Auth = new AuthManager();

// Auto-check auth status on page load
document.addEventListener('DOMContentLoaded', () => {
  Auth.checkAuthStatus();
});