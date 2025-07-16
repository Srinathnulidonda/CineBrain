/**
 * Local Storage Service
 * Handles offline data storage, caching, and data persistence
 */

class StorageService {
    constructor() {
        this.prefix = 'movieflix_';
        this.version = '1.0';
        this.init();
    }

    init() {
        this.checkVersion();
        this.setupQuotaManagement();
    }

    checkVersion() {
        const storedVersion = this.get('app_version');
        if (storedVersion !== this.version) {
            this.clearOldData();
            this.set('app_version', this.version);
        }
    }

    setupQuotaManagement() {
        // Monitor storage usage
        this.checkStorageQuota();
    }

    async checkStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                const usagePercentage = (estimate.usage / estimate.quota) * 100;
                
                if (usagePercentage > 80) {
                    this.cleanupOldData();
                }
            } catch (error) {
                console.warn('Storage quota check failed:', error);
            }
        }
    }

    // Core storage methods
    set(key, value, expiration = null) {
        try {
            const data = {
                value,
                timestamp: Date.now(),
                expiration: expiration ? Date.now() + expiration : null
            };
            
            localStorage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            // Try to free up space
            this.cleanupOldData();
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify(data));
                return true;
            } catch (retryError) {
                console.error('Storage failed even after cleanup:', retryError);
                return false;
            }
        }
    }

    get(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return null;

            const data = JSON.parse(item);
            
            // Check expiration
            if (data.expiration && Date.now() > data.expiration) {
                this.remove(key);
                return null;
            }

            return data.value;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return null;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    }

    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }

    // Cache management
    setCache(key, data, duration = 3600000) { // Default 1 hour
        return this.set(`cache_${key}`, data, duration);
    }

    getCache(key) {
        return this.get(`cache_${key}`);
    }

    removeCache(key) {
        return this.remove(`cache_${key}`);
    }

    clearCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix + 'cache_')) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return false;
        }
    }

    // User preferences
    setUserPreference(key, value) {
        const preferences = this.get('user_preferences') || {};
        preferences[key] = value;
        return this.set('user_preferences', preferences);
    }

    getUserPreference(key, defaultValue = null) {
        const preferences = this.get('user_preferences') || {};
        return preferences[key] !== undefined ? preferences[key] : defaultValue;
    }

    // Favorites management
    addToFavorites(contentId, contentData) {
        const favorites = this.getFavorites();
        const existingIndex = favorites.findIndex(fav => fav.id === contentId);
        
        if (existingIndex === -1) {
            favorites.push({
                id: contentId,
                ...contentData,
                addedAt: Date.now()
            });
            this.set('favorites', favorites);
            return true;
        }
        return false;
    }

    removeFromFavorites(contentId) {
        const favorites = this.getFavorites();
        const filtered = favorites.filter(fav => fav.id !== contentId);
        this.set('favorites', filtered);
        return true;
    }

    getFavorites() {
        return this.get('favorites') || [];
    }

    isFavorite(contentId) {
        const favorites = this.getFavorites();
        return favorites.some(fav => fav.id === contentId);
    }

    // Watchlist management
    addToWatchlist(contentId, contentData) {
        const watchlist = this.getWatchlist();
        const existingIndex = watchlist.findIndex(item => item.id === contentId);
        
        if (existingIndex === -1) {
            watchlist.push({
                id: contentId,
                ...contentData,
                addedAt: Date.now()
            });
            this.set('watchlist', watchlist);
            return true;
        }
        return false;
    }

    removeFromWatchlist(contentId) {
        const watchlist = this.getWatchlist();
        const filtered = watchlist.filter(item => item.id !== contentId);
        this.set('watchlist', filtered);
        return true;
    }

    getWatchlist() {
        return this.get('watchlist') || [];
    }

    isInWatchlist(contentId) {
        const watchlist = this.getWatchlist();
        return watchlist.some(item => item.id === contentId);
    }

    // Watch history
    addToWatchHistory(contentId, contentData) {
        const history = this.getWatchHistory();
        const existingIndex = history.findIndex(item => item.id === contentId);
        
        if (existingIndex !== -1) {
            // Remove existing entry
            history.splice(existingIndex, 1);
        }
        
        // Add to beginning
        history.unshift({
            id: contentId,
            ...contentData,
            watchedAt: Date.now()
        });
        
        // Keep only last 50 items
        if (history.length > 50) {
            history.splice(50);
        }
        
        this.set('watch_history', history);
        return true;
    }

    getWatchHistory() {
        return this.get('watch_history') || [];
    }

    clearWatchHistory() {
        return this.remove('watch_history');
    }

    // Search history
    addToSearchHistory(query) {
        const history = this.getSearchHistory();
        const filtered = history.filter(item => item.query !== query);
        
        filtered.unshift({
            query,
            timestamp: Date.now()
        });
        
        // Keep only last 20 searches
        if (filtered.length > 20) {
            filtered.splice(20);
        }
        
        this.set('search_history', filtered);
        return true;
    }

    getSearchHistory() {
        return this.get('search_history') || [];
    }

    clearSearchHistory() {
        return this.remove('search_history');
    }

    // Cleanup methods
    cleanupOldData() {
        try {
            const keys = Object.keys(localStorage);
            const now = Date.now();
            const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
            
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        if (item && item.timestamp && item.timestamp < oneWeekAgo) {
                            localStorage.removeItem(key);
                        }
                    } catch (error) {
                        // Remove corrupted items
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }

    clearOldData() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix) && !key.includes('user_preferences')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Clear old data failed:', error);
        }
    }

    // Storage stats
    getStorageStats() {
        try {
            const keys = Object.keys(localStorage);
            const appKeys = keys.filter(key => key.startsWith(this.prefix));
            const totalSize = appKeys.reduce((size, key) => {
                return size + localStorage.getItem(key).length;
            }, 0);
            
            return {
                totalKeys: appKeys.length,
                totalSize: totalSize,
                totalSizeKB: Math.round(totalSize / 1024),
                favorites: this.getFavorites().length,
                watchlist: this.getWatchlist().length,
                watchHistory: this.getWatchHistory().length
            };
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            return null;
        }
    }
}

// Export singleton instance
const storageService = new StorageService();
