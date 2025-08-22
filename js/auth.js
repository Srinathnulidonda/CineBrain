// Authentication System with Real Backend JWT Integration
import { API_ENDPOINTS, CACHE_KEYS } from './config.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem(CACHE_KEYS.AUTH_TOKEN);
    this.refreshTimer = null;
    
    // Initialize auth state
    this.initializeAuth();
  }

  async initializeAuth() {
    if (this.token) {
      try {
        // Validate token with backend
        await this.validateToken();
      } catch (error) {
        console.warn('Token validation failed:', error);
        this.clearAuth();
      }
    }
    
    // Dispatch auth state ready event
    window.dispatchEvent(new CustomEvent('authStateReady', {
      detail: { isAuthenticated: this.isAuthenticated(), user: this.currentUser }
    }));
  }

  async validateToken() {
    if (!this.token) return false;
    
    try {
      // Try to fetch user profile to validate token
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        this.currentUser = userData.user || userData;
        this.updateUserDisplay();
        return true;
      } else {
        throw new Error('Token validation failed');
      }
    } catch (error) {
      return false;
    }
  }

  async login(username, password) {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      // Store auth data
      this.token = data.token;
      this.currentUser = data.user;
      
      localStorage.setItem(CACHE_KEYS.AUTH_TOKEN, this.token);
      localStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
      
      // Update UI
      this.updateUserDisplay();
      
      // Dispatch login event
      window.dispatchEvent(new CustomEvent('userLoggedIn', {
        detail: { user: this.currentUser }
      }));
      
      return {
        success: true,
        user: this.currentUser,
        redirect: `/${this.currentUser.username}/profile`
      };
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      
      // Store auth data
      this.token = data.token;
      this.currentUser = data.user;
      
      localStorage.setItem(CACHE_KEYS.AUTH_TOKEN, this.token);
      localStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
      
      // Update UI
      this.updateUserDisplay();
      
      // Dispatch registration event
      window.dispatchEvent(new CustomEvent('userRegistered', {
        detail: { user: this.currentUser }
      }));
      
      return {
        success: true,
        user: this.currentUser,
        redirect: `/${this.currentUser.username}/profile`
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  logout() {
    // Clear auth data
    this.clearAuth();
    
    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    // Redirect to home
    window.location.href = '/';
  }

  clearAuth() {
    this.token = null;
    this.currentUser = null;
    
    localStorage.removeItem(CACHE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CACHE_KEYS.USER_DATA);
    
    // Clear API cache to prevent auth issues
    if (window.API) {
      window.API.clearCache();
    }
    
    this.updateUserDisplay();
  }

  isAuthenticated() {
    return !!(this.token && this.currentUser);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getToken() {
    return this.token;
  }

  updateUserDisplay() {
    // Update topbar avatar
    if (window.updateTopbarUser) {
      window.updateTopbarUser();
    }
    
    // Update any other auth-dependent UI elements
    this.updateAuthElements();
  }

  updateAuthElements() {
    const authElements = document.querySelectorAll('[data-auth]');
    const nonAuthElements = document.querySelectorAll('[data-no-auth]');
    
    authElements.forEach(element => {
      element.style.display = this.isAuthenticated() ? '' : 'none';
    });
    
    nonAuthElements.forEach(element => {
      element.style.display = this.isAuthenticated() ? 'none' : '';
    });
    
    // Update username displays
    const usernameElements = document.querySelectorAll('[data-username]');
    usernameElements.forEach(element => {
      if (this.currentUser) {
        element.textContent = this.currentUser.username;
      }
    });
  }

  // Require authentication for protected pages
  requireAuth(redirectTo = '/auth/login.html') {
    if (!this.isAuthenticated()) {
      // Store intended destination
      sessionStorage.setItem('auth_redirect', window.location.pathname);
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  // Handle auth redirect after login
  handleAuthRedirect() {
    const intendedDestination = sessionStorage.getItem('auth_redirect');
    if (intendedDestination) {
      sessionStorage.removeItem('auth_redirect');
      window.location.href = intendedDestination;
    }
  }

  // Route to user profile with username
  navigateToProfile() {
    if (this.isAuthenticated()) {
      return `/${this.currentUser.username}/profile`;
    }
    return '/auth/login.html';
  }

  // Admin check
  isAdmin() {
    return this.currentUser && this.currentUser.is_admin;
  }

  // User interaction recording
  async recordInteraction(contentId, interactionType, rating = null) {
    if (!this.isAuthenticated()) {
      console.warn('Cannot record interaction: not authenticated');
      return false;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USER_RATINGS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content_id: contentId,
          interaction_type: interactionType,
          rating: rating
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Interaction recording error:', error);
      return false;
    }
  }

  // Get user's watchlist
  async getUserWatchlist() {
    if (!this.isAuthenticated()) return [];

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WATCHLIST}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.watchlist || [];
      }
    } catch (error) {
      console.error('Watchlist fetch error:', error);
    }
    
    return [];
  }

  // Get user's favorites
  async getUserFavorites() {
    if (!this.isAuthenticated()) return [];

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.FAVORITES}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.favorites || [];
      }
    } catch (error) {
      console.error('Favorites fetch error:', error);
    }
    
    return [];
  }

  // Get personalized recommendations
  async getPersonalizedRecommendations() {
    if (!this.isAuthenticated()) {
      // Fallback to anonymous recommendations
      return window.API.get(API_ENDPOINTS.ANONYMOUS_RECS);
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.RECOMMENDATIONS}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Personalized recommendations error:', error);
    }
    
    // Fallback to trending if personal recommendations fail
    return window.API.get(API_ENDPOINTS.TRENDING);
  }

  // ML-powered personalized recommendations
  async getMLRecommendations() {
    if (!this.isAuthenticated()) {
      return this.getPersonalizedRecommendations();
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.ML_RECOMMENDATIONS}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('ML recommendations error:', error);
    }
    
    // Fallback to regular personalized recommendations
    return this.getPersonalizedRecommendations();
  }
}

// Create singleton instance
const Auth = new AuthManager();

// Global exports
window.Auth = Auth;
export default Auth;

// Form helpers for auth pages
export const AuthForms = {
  // Login form submission
  handleLoginForm: async (formElement, options = {}) => {
    const formData = new FormData(formElement);
    const username = formData.get('username');
    const password = formData.get('password');
    
    try {
      const result = await Auth.login(username, password);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      } else {
        // Default redirect behavior
        Auth.handleAuthRedirect();
        window.location.href = result.redirect;
      }
      
      return result;
    } catch (error) {
      if (options.onError) {
        options.onError(error);
      } else {
        // Default error handling
        showToast(error.message, 'error');
      }
      throw error;
    }
  },

  // Registration form submission
  handleRegisterForm: async (formElement, options = {}) => {
    const formData = new FormData(formElement);
    const userData = {
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password'),
      preferred_languages: formData.getAll('languages') || [],
      preferred_genres: formData.getAll('genres') || []
    };
    
    try {
      const result = await Auth.register(userData);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      } else {
        // Default redirect behavior
        window.location.href = result.redirect;
      }
      
      return result;
    } catch (error) {
      if (options.onError) {
        options.onError(error);
      } else {
        // Default error handling
        showToast(error.message, 'error');
      }
      throw error;
    }
  },

  // Password validation
  validatePassword: (password) => {
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    return true;
  },

  // Email validation
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    return true;
  }
};

// Export form helpers
window.AuthForms = AuthForms;