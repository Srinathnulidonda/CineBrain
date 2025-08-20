// CineScope Storage Management
class StorageManager {
    constructor() {
        this.isLocalStorageAvailable = this.checkLocalStorage();
        this.isSessionStorageAvailable = this.checkSessionStorage();
        this.memoryStorage = new Map();

        // Initialize storage event listeners
        this.initStorageListeners();
    }

    // Check Local Storage availability
    checkLocalStorage() {
        try {
            const test = '__cinescope_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Check Session Storage availability
    checkSessionStorage() {
        try {
            const test = '__cinescope_test__';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Initialize storage event listeners
    initStorageListeners() {
        window.addEventListener('storage', (event) => {
            this.handleStorageChange(event);
        });

        // Listen for storage quota exceeded
        window.addEventListener('error', (event) => {
            if (event.message && event.message.includes('QuotaExceededError')) {
                this.handleQuotaExceeded();
            }
        });
    }

    // Handle storage changes from other tabs
    handleStorageChange(event) {
        if (event.key === CONFIG.STORAGE_KEYS.AUTH_TOKEN) {
            // Token changed in another tab
            const newToken = event.newValue;
            if (!newToken) {
                // Token was removed (logout)
                this.handleLogout();
            } else {
                // Token was updated
                this.handleTokenUpdate(newToken);
            }
        }
    }

    // Handle quota exceeded
    handleQuotaExceeded() {
        console.warn('Storage quota exceeded. Clearing old data...');
        this.clearOldData();
    }

    // Clear old data to free up space
    clearOldData() {
        const keys = [
            CONFIG.STORAGE_KEYS.SEARCH_HISTORY,
            CONFIG.STORAGE_KEYS.RECENTLY_VIEWED
        ];

        keys.forEach(key => {
            try {
                const data = this.getItem(key);
                if (Array.isArray(data) && data.length > 10) {
                    // Keep only the 10 most recent items
                    this.setItem(key, data.slice(-10));
                }
            } catch (e) {
                console.warn(`Failed to clean up ${key}:`, e);
            }
        });
    }

    // Generic set item with fallback
    setItem(key, value, useSession = false) {
        const serializedValue = JSON.stringify({
            value: value,
            timestamp: Date.now(),
            version: CONFIG.APP_VERSION
        });

        try {
            if (useSession && this.isSessionStorageAvailable) {
                sessionStorage.setItem(key, serializedValue);
            } else if (!useSession && this.isLocalStorageAvailable) {
                localStorage.setItem(key, serializedValue);
            } else {
                // Fallback to memory storage
                this.memoryStorage.set(key, serializedValue);
            }
            return true;
        } catch (e) {
            console.warn(`Failed to set ${key}:`, e);
            // Try memory storage as last resort
            this.memoryStorage.set(key, serializedValue);
            return false;
        }
    }

    // Generic get item with fallback
    getItem(key, useSession = false, maxAge = null) {
        let serializedValue = null;

        try {
            if (useSession && this.isSessionStorageAvailable) {
                serializedValue = sessionStorage.getItem(key);
            } else if (!useSession && this.isLocalStorageAvailable) {
                serializedValue = localStorage.getItem(key);
            } else {
                // Fallback to memory storage
                serializedValue = this.memoryStorage.get(key);
            }

            if (!serializedValue) {
                return null;
            }

            const parsed = JSON.parse(serializedValue);

            // Check version compatibility
            if (parsed.version && parsed.version !== CONFIG.APP_VERSION) {
                this.removeItem(key, useSession);
                return null;
            }

            // Check age if maxAge is specified
            if (maxAge && parsed.timestamp) {
                const age = Date.now() - parsed.timestamp;
                if (age > maxAge) {
                    this.removeItem(key, useSession);
                    return null;
                }
            }

            return parsed.value;
        } catch (e) {
            console.warn(`Failed to get ${key}:`, e);
            this.removeItem(key, useSession);
            return null;
        }
    }

    // Remove item
    removeItem(key, useSession = false) {
        try {
            if (useSession && this.isSessionStorageAvailable) {
                sessionStorage.removeItem(key);
            } else if (!useSession && this.isLocalStorageAvailable) {
                localStorage.removeItem(key);
            }
            this.memoryStorage.delete(key);
            return true;
        } catch (e) {
            console.warn(`Failed to remove ${key}:`, e);
            return false;
        }
    }

    // Clear all storage
    clear(useSession = false) {
        try {
            if (useSession && this.isSessionStorageAvailable) {
                sessionStorage.clear();
            } else if (!useSession && this.isLocalStorageAvailable) {
                localStorage.clear();
            }
            this.memoryStorage.clear();
            return true;
        } catch (e) {
            console.warn('Failed to clear storage:', e);
            return false;
        }
    }

    // Authentication token management
    setAuthToken(token) {
        return this.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    }

    getAuthToken() {
        return this.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    }

    removeAuthToken() {
        return this.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    }

    // User data management
    setUserData(userData) {
        return this.setItem(CONFIG.STORAGE_KEYS.USER_DATA, userData);
    }

    getUserData() {
        return this.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
    }

    removeUserData() {
        return this.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    }

    // User preferences
    setUserPreferences(preferences) {
        return this.setItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES, preferences);
    }

    getUserPreferences() {
        return this.getItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES) || {
            language: 'english',
            genres: [],
            autoplay: true,
            notifications: true,
            theme: 'dark'
        };
    }

    updateUserPreference(key, value) {
        const preferences = this.getUserPreferences();
        preferences[key] = value;
        return this.setUserPreferences(preferences);
    }

    // Search history management
    addToSearchHistory(query) {
        if (!query || query.trim().length < 2) return;

        const history = this.getSearchHistory();
        const trimmedQuery = query.trim().toLowerCase();

        // Remove duplicate if exists
        const filtered = history.filter(item => item.query !== trimmedQuery);

        // Add to beginning
        filtered.unshift({
            query: trimmedQuery,
            timestamp: Date.now()
        });

        // Keep only last 20 searches
        const updated = filtered.slice(0, 20);

        return this.setItem(CONFIG.STORAGE_KEYS.SEARCH_HISTORY, updated);
    }

    getSearchHistory() {
        return this.getItem(CONFIG.STORAGE_KEYS.SEARCH_HISTORY) || [];
    }

    clearSearchHistory() {
        return this.removeItem(CONFIG.STORAGE_KEYS.SEARCH_HISTORY);
    }

    // Recently viewed management
    addToRecentlyViewed(content) {
        if (!content || !content.id) return;

        const recent = this.getRecentlyViewed();

        // Remove duplicate if exists
        const filtered = recent.filter(item => item.id !== content.id);

        // Add to beginning
        filtered.unshift({
            id: content.id,
            title: content.title,
            content_type: content.content_type,
            poster_path: content.poster_path,
            rating: content.rating,
            timestamp: Date.now()
        });

        // Keep only last 50 items
        const updated = filtered.slice(0, 50);

        return this.setItem(CONFIG.STORAGE_KEYS.RECENTLY_VIEWED, updated);
    }

    getRecentlyViewed() {
        return this.getItem(CONFIG.STORAGE_KEYS.RECENTLY_VIEWED) || [];
    }

    clearRecentlyViewed() {
        return this.removeItem(CONFIG.STORAGE_KEYS.RECENTLY_VIEWED);
    }

    // Session data management
    setCurrentRoute(route) {
        return this.setItem(CONFIG.SESSION_KEYS.CURRENT_ROUTE, route, true);
    }

    getCurrentRoute() {
        return this.getItem(CONFIG.SESSION_KEYS.CURRENT_ROUTE, true);
    }

    setSearchFilters(filters) {
        return this.setItem(CONFIG.SESSION_KEYS.SEARCH_FILTERS, filters, true);
    }

    getSearchFilters() {
        return this.getItem(CONFIG.SESSION_KEYS.SEARCH_FILTERS, true) || {};
    }

    setScrollPosition(position) {
        return this.setItem(CONFIG.SESSION_KEYS.SCROLL_POSITION, position, true);
    }

    getScrollPosition() {
        return this.getItem(CONFIG.SESSION_KEYS.SCROLL_POSITION, true) || 0;
    }

    // Temporary data with TTL
    setTempData(key, value, ttl = 300000) { // 5 minutes default
        const tempData = {
            value: value,
            expires: Date.now() + ttl
        };
        return this.setItem(`temp_${key}`, tempData, true);
    }

    getTempData(key) {
        const tempData = this.getItem(`temp_${key}`, true);
        if (!tempData) return null;

        if (tempData.expires && Date.now() > tempData.expires) {
            this.removeItem(`temp_${key}`, true);
            return null;
        }

        return tempData.value;
    }

    // Cache management
    setCache(key, data, ttl = CONFIG.PERFORMANCE.CACHE_DURATION) {
        const cacheData = {
            data: data,
            expires: Date.now() + ttl,
            version: CONFIG.APP_VERSION
        };
        return this.setItem(`cache_${key}`, cacheData, true);
    }

    getCache(key) {
        const cacheData = this.getItem(`cache_${key}`, true);
        if (!cacheData) return null;

        if (cacheData.expires && Date.now() > cacheData.expires) {
            this.removeItem(`cache_${key}`, true);
            return null;
        }

        return cacheData.data;
    }

    clearCache() {
        const keys = [];

        try {
            // Get all cache keys
            if (this.isSessionStorageAvailable) {
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && key.startsWith('cache_')) {
                        keys.push(key);
                    }
                }
            }

            // Remove cache keys
            keys.forEach(key => {
                this.removeItem(key, true);
            });

            return true;
        } catch (e) {
            console.warn('Failed to clear cache:', e);
            return false;
        }
    }

    // Handle logout
    handleLogout() {
        this.removeAuthToken();
        this.removeUserData();
        this.clearCache();

        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('user-logout'));
    }

    // Handle token update
    handleTokenUpdate(token) {
        // Dispatch token update event
        window.dispatchEvent(new CustomEvent('token-update', {
            detail: { token: token }
        }));
    }

    // Export data for backup
    exportData() {
        const data = {};

        Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
            const value = this.getItem(key);
            if (value !== null) {
                data[key] = value;
            }
        });

        return {
            data: data,
            timestamp: Date.now(),
            version: CONFIG.APP_VERSION
        };
    }

    // Import data from backup
    importData(backup) {
        if (!backup || !backup.data) {
            throw new Error('Invalid backup data');
        }

        // Check version compatibility
        if (backup.version && backup.version !== CONFIG.APP_VERSION) {
            console.warn('Backup version mismatch. Some data may not be imported.');
        }

        let imported = 0;
        Object.entries(backup.data).forEach(([key, value]) => {
            try {
                this.setItem(key, value);
                imported++;
            } catch (e) {
                console.warn(`Failed to import ${key}:`, e);
            }
        });

        return imported;
    }

    // Get storage usage statistics
    getStorageStats() {
        const stats = {
            localStorage: { used: 0, available: false },
            sessionStorage: { used: 0, available: false },
            memoryStorage: { used: this.memoryStorage.size, available: true }
        };

        try {
            if (this.isLocalStorageAvailable) {
                stats.localStorage.available = true;
                let localUsed = 0;
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        localUsed += localStorage[key].length;
                    }
                }
                stats.localStorage.used = localUsed;
            }

            if (this.isSessionStorageAvailable) {
                stats.sessionStorage.available = true;
                let sessionUsed = 0;
                for (let key in sessionStorage) {
                    if (sessionStorage.hasOwnProperty(key)) {
                        sessionUsed += sessionStorage[key].length;
                    }
                }
                stats.sessionStorage.used = sessionUsed;
            }
        } catch (e) {
            console.warn('Failed to calculate storage stats:', e);
        }

        return stats;
    }
}

// Create global storage instance
const Storage = new StorageManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}

// Global access
window.Storage = Storage;