class StorageManager {
    constructor() {
        this.localStorage = window.localStorage;
        this.sessionStorage = window.sessionStorage;
        this.prefix = 'movieapp_';
    }

    // Local Storage methods
    set(key, value, persistent = true) {
        try {
            const storage = persistent ? this.localStorage : this.sessionStorage;
            const prefixedKey = this.prefix + key;
            
            if (typeof value === 'object') {
                storage.setItem(prefixedKey, JSON.stringify(value));
            } else {
                storage.setItem(prefixedKey, value);
            }
            
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    }

    get(key, defaultValue = null) {
        try {
            const prefixedKey = this.prefix + key;
            
            // Try localStorage first
            let value = this.localStorage.getItem(prefixedKey);
            
            // Fall back to sessionStorage
            if (value === null) {
                value = this.sessionStorage.getItem(prefixedKey);
            }
            
            if (value === null) {
                return defaultValue;
            }
            
            // Try to parse JSON
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    }

    remove(key) {
        try {
            const prefixedKey = this.prefix + key;
            this.localStorage.removeItem(prefixedKey);
            this.sessionStorage.removeItem(prefixedKey);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    }

    clear() {
        try {
            const keys = [...this.localStorage.keys(), ...this.sessionStorage.keys()];
            const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));
            
            prefixedKeys.forEach(key => {
                this.localStorage.removeItem(key);
                this.sessionStorage.removeItem(key);
            });
            
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }

    // Specific data methods
    setUserPreferences(preferences) {
        return this.set('preferences', preferences);
    }

    getUserPreferences() {
        return this.get('preferences', {
            theme: 'dark',
            language: 'en',
            autoplay: true,
            notifications: true
        });
    }

    addRecentSearch(query) {
        const recent = this.getRecentSearches();
        const filtered = recent.filter(item => item.query !== query);
        filtered.unshift({
            query,
            timestamp: Date.now()
        });
        
        // Keep only last 10 searches
        const limited = filtered.slice(0, 10);
        return this.set('recent_searches', limited);
    }

    getRecentSearches() {
        return this.get('recent_searches', []);
    }

    clearRecentSearches() {
        return this.remove('recent_searches');
    }

    setWatchlistCache(watchlist) {
        return this.set('watchlist_cache', {
            data: watchlist,
            timestamp: Date.now()
        });
    }

    getWatchlistCache() {
        const cache = this.get('watchlist_cache');
        if (!cache) return null;
        
        // Cache expires after 5 minutes
        const fiveMinutes = 5 * 60 * 1000;
        if (Date.now() - cache.timestamp > fiveMinutes) {
            this.remove('watchlist_cache');
            return null;
        }
        
        return cache.data;
    }

    setFavoritesCache(favorites) {
        return this.set('favorites_cache', {
            data: favorites,
            timestamp: Date.now()
        });
    }

    getFavoritesCache() {
        const cache = this.get('favorites_cache');
        if (!cache) return null;
        
        // Cache expires after 5 minutes
        const fiveMinutes = 5 * 60 * 1000;
        if (Date.now() - cache.timestamp > fiveMinutes) {
            this.remove('favorites_cache');
            return null;
        }
        
        return cache.data;
    }

    // Theme management
    setTheme(theme) {
        this.set('theme', theme);
        this.applyTheme(theme);
    }

    getTheme() {
        return this.get('theme', 'dark');
    }

    applyTheme(theme) {
        document.body.className = document.body.className.replace(/\w*-theme/g, '');
        document.body.classList.add(`${theme}-theme`);
    }

    // Language management
    setLanguage(language) {
        return this.set('language', language);
    }

    getLanguage() {
        return this.get('language', 'en');
    }

    // Cache management
    setCacheData(key, data, expirationMinutes = 60) {
        const cacheData = {
            data: data,
            timestamp: Date.now(),
            expiration: expirationMinutes * 60 * 1000
        };
        
        return this.set(`cache_${key}`, cacheData);
    }

    getCacheData(key) {
        const cache = this.get(`cache_${key}`);
        if (!cache) return null;
        
        if (Date.now() - cache.timestamp > cache.expiration) {
            this.remove(`cache_${key}`);
            return null;
        }
        
        return cache.data;
    }

    clearExpiredCache() {
        try {
            const keys = Object.keys(this.localStorage).filter(key => 
                key.startsWith(this.prefix + 'cache_')
            );
            
            keys.forEach(key => {
                const cache = this.get(key.replace(this.prefix, ''));
                if (cache && Date.now() - cache.timestamp > cache.expiration) {
                    this.remove(key.replace(this.prefix, ''));
                }
            });
            
            return true;
        } catch (error) {
            console.error('Cache cleanup error:', error);
            return false;
        }
    }

    // Storage info
    getStorageInfo() {
        try {
            const local = JSON.stringify(this.localStorage).length;
            const session = JSON.stringify(this.sessionStorage).length;
            
            return {
                localStorage: {
                    used: local,
                    percentage: (local / (5 * 1024 * 1024)) * 100 // Assuming 5MB limit
                },
                sessionStorage: {
                    used: session,
                    percentage: (session / (5 * 1024 * 1024)) * 100
                }
            };
        } catch (error) {
            console.error('Storage info error:', error);
            return null;
        }
    }

    // Initialize storage
    init() {
        // Apply saved theme
        const theme = this.getTheme();
        this.applyTheme(theme);
        
        // Clear expired cache on initialization
        this.clearExpiredCache();
        
        // Setup periodic cache cleanup
        setInterval(() => {
            this.clearExpiredCache();
        }, 60 * 60 * 1000); // Every hour
    }
}

// Create global instance
window.StorageManager = new StorageManager();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    StorageManager.init();
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}