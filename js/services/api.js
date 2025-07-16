/**
 * API Service for Movie Recommendation App
 * Handles all API communication with the backend
 */

class APIService {
    constructor() {
        this.baseURL = 'https://backend-app-970m.onrender.com/api';
        this.headers = {
            'Content-Type': 'application/json'
        };
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    getAuthHeaders() {
        const token = localStorage.getItem('auth_token');
        return token ? { ...this.headers, 'Authorization': `Bearer ${token}` } : this.headers;
    }

    async makeRequest(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(fullUrl, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('API Request failed:', error);
            
            if (!this.isOnline) {
                this.requestQueue.push({ url, options });
                return { success: false, error: 'Offline - request queued' };
            }
            
            return { success: false, error: error.message };
        }
    }

    async processQueue() {
        while (this.requestQueue.length > 0) {
            const { url, options } = this.requestQueue.shift();
            await this.makeRequest(url, options);
        }
    }

    // Authentication Methods
    async register(userData) {
        return this.makeRequest('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        return this.makeRequest('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    // Content Methods
    async getHomepageContent() {
        return this.makeRequest('/homepage');
    }

    async getPersonalizedRecommendations() {
        return this.makeRequest('/recommendations/personalized');
    }

    async getContentDetails(contentId) {
        return this.makeRequest(`/content/${contentId}/details`);
    }

    async searchContent(query, type = 'movie') {
        const params = new URLSearchParams({ q: query, type });
        return this.makeRequest(`/search?${params}`);
    }

    // User Interaction Methods
    async recordInteraction(contentId, interactionType, rating = null) {
        return this.makeRequest('/interact', {
            method: 'POST',
            body: JSON.stringify({
                content_id: contentId,
                interaction_type: interactionType,
                rating
            })
        });
    }

    async getUserFavorites() {
        return this.makeRequest('/user/favorites');
    }

    async getUserWatchlist() {
        return this.makeRequest('/user/watchlist');
    }

    // Utility Methods
    getImageUrl(path, size = 'w500') {
        if (!path) return 'assets/images/placeholder.jpg';
        return path.startsWith('http') ? path : `https://image.tmdb.org/t/p/${size}${path}`;
    }

    formatRating(rating) {
        return rating ? parseFloat(rating).toFixed(1) : 'N/A';
    }

    formatDate(dateString) {
        if (!dateString) return 'TBA';
        return new Date(dateString).getFullYear();
    }

    formatGenres(genres) {
        if (!genres || !Array.isArray(genres)) return [];
        return genres.slice(0, 3); // Limit to first 3 genres
    }
}

// Export singleton instance
const apiService = new APIService();