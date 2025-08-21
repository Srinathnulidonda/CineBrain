// Local Storage Management
class Storage {
    // Token management
    static getToken() {
        return localStorage.getItem(Config.TOKEN_KEY);
    }

    static setToken(token) {
        localStorage.setItem(Config.TOKEN_KEY, token);
    }

    static removeToken() {
        localStorage.removeItem(Config.TOKEN_KEY);
    }

    // User management
    static getUser() {
        const userStr = localStorage.getItem(Config.USER_KEY);
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }

    static setUser(user) {
        localStorage.setItem(Config.USER_KEY, JSON.stringify(user));
    }

    static removeUser() {
        localStorage.removeItem(Config.USER_KEY);
    }

    // Combined auth management
    static setAuth(token, user) {
        this.setToken(token);
        this.setUser(user);
    }

    static clearAuth() {
        this.removeToken();
        this.removeUser();
    }

    // Theme management
    static getTheme() {
        return localStorage.getItem(Config.THEME_KEY) || 'dark';
    }

    static setTheme(theme) {
        localStorage.setItem(Config.THEME_KEY, theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    // Watchlist cache
    static getWatchlistCache() {
        const cache = localStorage.getItem('cinescope_watchlist_cache');
        try {
            return cache ? JSON.parse(cache) : [];
        } catch {
            return [];
        }
    }

    static setWatchlistCache(items) {
        localStorage.setItem('cinescope_watchlist_cache', JSON.stringify(items));
    }

    // Favorites cache
    static getFavoritesCache() {
        const cache = localStorage.getItem('cinescope_favorites_cache');
        try {
            return cache ? JSON.parse(cache) : [];
        } catch {
            return [];
        }
    }

    static setFavoritesCache(items) {
        localStorage.setItem('cinescope_favorites_cache', JSON.stringify(items));
    }

    // Search history
    static getSearchHistory() {
        const history = localStorage.getItem('cinescope_search_history');
        try {
            return history ? JSON.parse(history) : [];
        } catch {
            return [];
        }
    }

    static addToSearchHistory(query) {
        let history = this.getSearchHistory();

        // Remove if already exists
        history = history.filter(item => item !== query);

        // Add to beginning
        history.unshift(query);

        // Keep only last 10
        history = history.slice(0, 10);

        localStorage.setItem('cinescope_search_history', JSON.stringify(history));
    }

    static clearSearchHistory() {
        localStorage.removeItem('cinescope_search_history');
    }

    // Recently viewed
    static getRecentlyViewed() {
        const recent = localStorage.getItem('cinescope_recently_viewed');
        try {
            return recent ? JSON.parse(recent) : [];
        } catch {
            return [];
        }
    }

    static addToRecentlyViewed(content) {
        let recent = this.getRecentlyViewed();

        // Remove if already exists
        recent = recent.filter(item => item.id !== content.id);

        // Add to beginning
        recent.unshift({
            id: content.id,
            title: content.title,
            poster_path: content.poster_path,
            content_type: content.content_type,
            viewed_at: new Date().toISOString()
        });

        // Keep only last 20
        recent = recent.slice(0, 20);

        localStorage.setItem('cinescope_recently_viewed', JSON.stringify(recent));
    }

    // Session storage for temporary data
    static getSessionData(key) {
        const data = sessionStorage.getItem(key);
        try {
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

    static setSessionData(key, value) {
        sessionStorage.setItem(key, JSON.stringify(value));
    }

    static removeSessionData(key) {
        sessionStorage.removeItem(key);
    }

    // Clear all app data
    static clearAll() {
        // Clear all cinescope keys
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cinescope_')) {
                localStorage.removeItem(key);
            }
        });

        // Clear session storage
        sessionStorage.clear();
    }
}