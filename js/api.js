// API Configuration and Methods
const API_BASE_URL = process.env.API_URL || 'https://your-backend.onrender.com/api';

class API {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('authToken');
    }
    
    // Set auth token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }
    
    // Base request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        // Add auth token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }
    
    // Auth endpoints
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (response.access_token) {
            this.setToken(response.access_token);
        }
        
        return response;
    }
    
    async register(username, email, password, preferences = {}) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ 
                username, 
                email, 
                password,
                preferred_genres: preferences.genres || [],
                preferred_languages: preferences.languages || []
            })
        });
        
        if (response.access_token) {
            this.setToken(response.access_token);
        }
        
        return response;
    }
    
    async logout() {
        this.setToken(null);
    }
    
    // Content endpoints
    async getHomepageRecommendations() {
        return await this.request('/recommendations/homepage');
    }
    
    async getPersonalizedRecommendations() {
        return await this.request('/recommendations/personalized');
    }
    
    async getContentDetails(contentId) {
        return await this.request(`/content/${contentId}/details`);
    }
    
    async search(query, type = 'all', source = 'all') {
        const params = new URLSearchParams({ q: query, type, source });
        return await this.request(`/search?${params}`);
    }
    
    async getTrending(region = 'global') {
        const params = new URLSearchParams({ region });
        return await this.request(`/trending?${params}`);
    }
    
    // User interactions
    async addToWatchlist(contentId, priority = 0) {
        return await this.request('/user/interactions', {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_wishlist',
                content_id: contentId,
                priority
            })
        });
    }
    
    async removeFromWatchlist(contentId) {
        return await this.request('/user/interactions', {
            method: 'POST',
            body: JSON.stringify({
                action: 'remove_wishlist',
                content_id: contentId
            })
        });
    }
    
    async addToFavorites(contentId) {
        return await this.request('/user/interactions', {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_favorite',
                content_id: contentId
            })
        });
    }
    
    async removeFromFavorites(contentId) {
        return await this.request('/user/interactions', {
            method: 'POST',
            body: JSON.stringify({
                action: 'remove_favorite',
                content_id: contentId
            })
        });
    }
    
    async rateContent(contentId, rating) {
        return await this.request('/user/interactions', {
            method: 'POST',
            body: JSON.stringify({
                action: 'rate',
                content_id: contentId,
                rating
            })
        });
    }
    
    async addToHistory(contentId, duration, completed = false) {
        return await this.request('/user/interactions', {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_history',
                content_id: contentId,
                duration,
                completed
            })
        });
    }
    
    // Additional content methods
    async getPopular(page = 1) {
        // Simulate popular content endpoint
        return await this.getTrending();
    }
    
    async getTopRated(page = 1) {
        // Simulate top rated endpoint
        const data = await this.getHomepageRecommendations();
        return { results: data.user_favorites || [] };
    }
    
    async getNewReleases(page = 1) {
        // Simulate new releases endpoint
        const data = await this.getHomepageRecommendations();
        return { results: data.whats_hot || [] };
    }
    
    async getByGenre(genre, page = 1) {
        const params = new URLSearchParams({ q: genre, type: 'all' });
        return await this.request(`/search?${params}`);
    }
    
    async getRegionalContent(region, page = 1) {
        const params = new URLSearchParams({ region });
        return await this.request(`/trending?${params}`);
    }
    
    async getContentPage(tab, page) {
        switch (tab) {
            case 'popular':
                return await this.getPopular(page);
            case 'topRated':
                return await this.getTopRated(page);
            case 'newReleases':
                return await this.getNewReleases(page);
            default:
                return await this.getHomepageRecommendations();
        }
    }
}

// Create and export API instance
const api = new API();
window.api = api;