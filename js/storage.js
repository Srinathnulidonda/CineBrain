// CineScope Storage Management
window.CineScope.Storage = {
    // Keys
    KEYS: {
        AUTH_TOKEN: 'cinescope_auth_token',
        USER_DATA: 'cinescope_user_data',
        THEME_PREFERENCE: 'cinescope_theme',
        SEARCH_HISTORY: 'cinescope_search_history',
        WATCHLIST_CACHE: 'cinescope_watchlist_cache',
        FAVORITES_CACHE: 'cinescope_favorites_cache',
        LAST_VIEWED: 'cinescope_last_viewed'
    },

    // Token Management
    token: {
        set(token) {
            try {
                localStorage.setItem(CineScope.Storage.KEYS.AUTH_TOKEN, token);
                return true;
            } catch (error) {
                console.error('Failed to save token:', error);
                return false;
            }
        },

        get() {
            try {
                return localStorage.getItem(CineScope.Storage.KEYS.AUTH_TOKEN);
            } catch (error) {
                console.error('Failed to get token:', error);
                return null;
            }
        },

        remove() {
            try {
                localStorage.removeItem(CineScope.Storage.KEYS.AUTH_TOKEN);
                return true;
            } catch (error) {
                console.error('Failed to remove token:', error);
                return false;
            }
        },

        isValid() {
            const token = this.get();
            if (!token) return false;

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.exp * 1000 > Date.now();
            } catch (error) {
                return false;
            }
        }
    },

    // User Data Management
    user: {
        set(userData) {
            try {
                localStorage.setItem(CineScope.Storage.KEYS.USER_DATA, JSON.stringify(userData));
                return true;
            } catch (error) {
                console.error('Failed to save user data:', error);
                return false;
            }
        },

        get() {
            try {
                const data = localStorage.getItem(CineScope.Storage.KEYS.USER_DATA);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                console.error('Failed to get user data:', error);
                return null;
            }
        },

        remove() {
            try {
                localStorage.removeItem(CineScope.Storage.KEYS.USER_DATA);
                return true;
            } catch (error) {
                console.error('Failed to remove user data:', error);
                return false;
            }
        },

        isLoggedIn() {
            return this.get() !== null && CineScope.Storage.token.isValid();
        }
    },

    // Search History
    searchHistory: {
        add(query) {
            try {
                const history = this.get();
                const newHistory = [query, ...history.filter(item => item !== query)].slice(0, 10);
                localStorage.setItem(CineScope.Storage.KEYS.SEARCH_HISTORY, JSON.stringify(newHistory));
                return true;
            } catch (error) {
                console.error('Failed to add to search history:', error);
                return false;
            }
        },

        get() {
            try {
                const data = localStorage.getItem(CineScope.Storage.KEYS.SEARCH_HISTORY);
                return data ? JSON.parse(data) : [];
            } catch (error) {
                console.error('Failed to get search history:', error);
                return [];
            }
        },

        clear() {
            try {
                localStorage.removeItem(CineScope.Storage.KEYS.SEARCH_HISTORY);
                return true;
            } catch (error) {
                console.error('Failed to clear search history:', error);
                return false;
            }
        }
    },

    // Cache Management
    cache: {
        set(key, data, expirationMinutes = 30) {
            try {
                const item = {
                    data: data,
                    timestamp: Date.now(),
                    expiration: expirationMinutes * 60 * 1000
                };
                localStorage.setItem(key, JSON.stringify(item));
                return true;
            } catch (error) {
                console.error('Failed to cache data:', error);
                return false;
            }
        },

        get(key) {
            try {
                const item = localStorage.getItem(key);
                if (!item) return null;

                const parsed = JSON.parse(item);
                const now = Date.now();

                if (now - parsed.timestamp > parsed.expiration) {
                    localStorage.removeItem(key);
                    return null;
                }

                return parsed.data;
            } catch (error) {
                console.error('Failed to get cached data:', error);
                return null;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Failed to remove cached data:', error);
                return false;
            }
        }
    },

    // Last Viewed Content
    lastViewed: {
        add(content) {
            try {
                const viewed = this.get();
                const newViewed = [
                    { ...content, viewedAt: new Date().toISOString() },
                    ...viewed.filter(item => item.id !== content.id)
                ].slice(0, 20);

                localStorage.setItem(CineScope.Storage.KEYS.LAST_VIEWED, JSON.stringify(newViewed));
                return true;
            } catch (error) {
                console.error('Failed to add to last viewed:', error);
                return false;
            }
        },

        get() {
            try {
                const data = localStorage.getItem(CineScope.Storage.KEYS.LAST_VIEWED);
                return data ? JSON.parse(data) : [];
            } catch (error) {
                console.error('Failed to get last viewed:', error);
                return [];
            }
        }
    },

    // Clear all data (logout)
    clearAll() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }
};