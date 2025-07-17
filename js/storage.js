class StorageManager {
    constructor() {
        this.prefix = 'movieapp_';
        this.isLocalStorageAvailable = this.checkLocalStorage();
    }

    checkLocalStorage() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    set(key, value, expiration = null) {
        if (!this.isLocalStorageAvailable) return false;
        
        const item = {
            value,
            timestamp: Date.now(),
            expiration: expiration ? Date.now() + expiration : null
        };
        
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(item));
            return true;
        } catch {
            return false;
        }
    }

    get(key) {
        if (!this.isLocalStorageAvailable) return null;
        
        try {
            const item = JSON.parse(localStorage.getItem(this.prefix + key));
            if (!item) return null;
            
            if (item.expiration && Date.now() > item.expiration) {
                this.remove(key);
                return null;
            }
            
            return item.value;
        } catch {
            return null;
        }
    }

    remove(key) {
        if (!this.isLocalStorageAvailable) return false;
        
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch {
            return false;
        }
    }

    clear() {
        if (!this.isLocalStorageAvailable) return false;
        
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch {
            return false;
        }
    }

    getAll() {
        if (!this.isLocalStorageAvailable) return {};
        
        const items = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                const cleanKey = key.replace(this.prefix, '');
                items[cleanKey] = this.get(cleanKey);
            }
        });
        return items;
    }

    // User preferences management
    setUserPreference(key, value) {
        const preferences = this.get('user_preferences') || {};
        preferences[key] = value;
        this.set('user_preferences', preferences);
    }

    getUserPreference(key, defaultValue = null) {
        const preferences = this.get('user_preferences') || {};
        return preferences[key] !== undefined ? preferences[key] : defaultValue;
    }

    // Cache management
    setCache(key, data, ttl = 3600000) { // 1 hour default
        this.set(`cache_${key}`, data, ttl);
    }

    getCache(key) {
        return this.get(`cache_${key}`);
    }

    clearCache() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix + 'cache_')) {
                localStorage.removeItem(key);
            }
        });
    }

    // Session management
    setSession(key, value) {
        if (typeof sessionStorage !== 'undefined') {
            try {
                sessionStorage.setItem(this.prefix + key, JSON.stringify(value));
            } catch {}
        }
    }

    getSession(key) {
        if (typeof sessionStorage !== 'undefined') {
            try {
                const item = sessionStorage.getItem(this.prefix + key);
                return item ? JSON.parse(item) : null;
            } catch {
                return null;
            }
        }
        return null;
    }

    clearSession() {
        if (typeof sessionStorage !== 'undefined') {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    sessionStorage.removeItem(key);
                }
            });
        }
    }
}

const storage = new StorageManager();