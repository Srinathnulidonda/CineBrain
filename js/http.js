// HTTP client with token handling and error management
const api = {
    // Base request method
    async request(url, options = {}) {
        const token = Storage.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${CONFIG.API_BASE}${url}`, config);

            // Handle unauthorized
            if (response.status === 401) {
                Storage.removeToken();
                Storage.removeUser();
                window.location.href = CONFIG.ROUTES.LOGIN;
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // GET request
    async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;

        // Check cache first
        const cacheKey = fullUrl;
        const cached = Storage.getCache(cacheKey);
        if (cached) {
            return cached;
        }

        const data = await this.request(fullUrl, {
            method: 'GET'
        });

        // Cache successful GET requests
        Storage.setCache(cacheKey, data);
        return data;
    },

    // POST request
    async post(url, body = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    // PUT request
    async put(url, body = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    // DELETE request
    async delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    },

    // Auth endpoints
    auth: {
        async login(username, password) {
            const data = await api.post('/login', { username, password });
            if (data.token) {
                Storage.setToken(data.token);
                Storage.setUser(data.user);
            }
            return data;
        },

        async register(userData) {
            const data = await api.post('/register', userData);
            if (data.token) {
                Storage.setToken(data.token);
                Storage.setUser(data.user);
            }
            return data;
        },

        logout() {
            Storage.clearAll();
            window.location.href = CONFIG.ROUTES.LOGIN;
        }
    },

    // Content endpoints
    content: {
        search: (query, type = 'multi', page = 1) =>
            api.get('/search', { query, type, page }),

        getDetails: (id) =>
            api.get(`/content/${id}`),

        getTrending: (type = 'all', limit = 20) =>
            api.get('/recommendations/trending', { type, limit }),

        getNewReleases: (language = null, type = 'movie', limit = 20) =>
            api.get('/recommendations/new-releases', { language, type, limit }),

        getCriticsChoice: (type = 'movie', limit = 20) =>
            api.get('/recommendations/critics-choice', { type, limit }),

        getByGenre: (genre, type = 'movie', limit = 20) =>
            api.get(`/recommendations/genre/${genre}`, { type, limit }),

        getRegional: (language, type = 'movie', limit = 20) =>
            api.get(`/recommendations/regional/${language}`, { type, limit }),

        getAnime: (genre = null, limit = 20) =>
            api.get('/recommendations/anime', { genre, limit }),

        getSimilar: (contentId, limit = 20) =>
            api.get(`/recommendations/similar/${contentId}`, { limit }),

        getAnonymousRecommendations: (limit = 20) =>
            api.get('/recommendations/anonymous', { limit }),

        getPersonalized: (limit = 20) =>
            api.get('/recommendations/personalized', { limit })
    },

    // User endpoints
    user: {
        recordInteraction: (contentId, interactionType, rating = null) =>
            api.post('/interactions', { content_id: contentId, interaction_type: interactionType, rating }),

        getWatchlist: () =>
            api.get('/user/watchlist'),

        getFavorites: () =>
            api.get('/user/favorites')
    },

    // Admin endpoints
    admin: {
        search: (query, source = 'tmdb', page = 1) =>
            api.get('/admin/search', { query, source, page }),

        saveContent: (contentData) =>
            api.post('/admin/content', contentData),

        createRecommendation: (data) =>
            api.post('/admin/recommendations', data),

        getRecommendations: (page = 1, perPage = 20) =>
            api.get('/admin/recommendations', { page, per_page: perPage }),

        getAnalytics: () =>
            api.get('/admin/analytics'),

        checkMLService: () =>
            api.get('/admin/ml-service-check'),

        updateMLService: () =>
            api.post('/admin/ml-service-update'),

        getMLStats: () =>
            api.get('/admin/ml-stats')
    }
};