// Storage Management
class StorageManager {
    constructor() {
        this.cache = new Map();
    }

    // Token Management
    getToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    }

    setToken(token) {
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
    }

    removeToken() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
    }

    // User Management
    getUser() {
        const userStr = localStorage.getItem(CONFIG.USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    }

    setUser(user) {
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    }

    removeUser() {
        localStorage.removeItem(CONFIG.USER_KEY);
    }

    // Session Storage
    getSessionData(key) {
        const data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    setSessionData(key, value) {
        sessionStorage.setItem(key, JSON.stringify(value));
    }

    removeSessionData(key) {
        sessionStorage.removeItem(key);
    }

    // Cache Management
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    // Preferences
    getPreferences() {
        const prefs = localStorage.getItem('cinescope_preferences');
        return prefs ? JSON.parse(prefs) : {
            theme: 'dark',
            language: 'en',
            autoplay: true,
            notifications: true
        };
    }

    setPreferences(preferences) {
        localStorage.setItem('cinescope_preferences', JSON.stringify(preferences));
    }

    // Recent Searches
    getRecentSearches() {
        const searches = localStorage.getItem('cinescope_recent_searches');
        return searches ? JSON.parse(searches) : [];
    }

    addRecentSearch(query) {
        let searches = this.getRecentSearches();
        // Remove if exists and add to beginning
        searches = searches.filter(s => s !== query);
        searches.unshift(query);
        // Keep only last 10
        searches = searches.slice(0, 10);
        localStorage.setItem('cinescope_recent_searches', JSON.stringify(searches));
    }

    clearRecentSearches() {
        localStorage.removeItem('cinescope_recent_searches');
    }

    // Watchlist & Favorites (local cache)
    getLocalWatchlist() {
        const watchlist = localStorage.getItem('cinescope_watchlist');
        return watchlist ? JSON.parse(watchlist) : [];
    }

    setLocalWatchlist(items) {
        localStorage.setItem('cinescope_watchlist', JSON.stringify(items));
    }

    getLocalFavorites() {
        const favorites = localStorage.getItem('cinescope_favorites');
        return favorites ? JSON.parse(favorites) : [];
    }

    setLocalFavorites(items) {
        localStorage.setItem('cinescope_favorites', JSON.stringify(items));
    }

    // Clear All Data
    clearAll() {
        localStorage.clear();
        sessionStorage.clear();
        this.cache.clear();
    }

    // Check if user is logged in
    isLoggedIn() {
        return !!this.getToken() && !!this.getUser();
    }

    // Check if user is admin
    isAdmin() {
        const user = this.getUser();
        return user && user.is_admin === true;
    }
}

// Create global instance
window.storage = new StorageManager();