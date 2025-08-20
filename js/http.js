// CineScope HTTP Client
window.CineScope.HTTP = {
    // Default options
    defaultOptions: {
        timeout: 15000,
        retries: 2,
        retryDelay: 1000
    },

    // Create request headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (includeAuth) {
            const token = CineScope.Storage.token.get();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    },

    // Handle response
    async handleResponse(response) {
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;

            // Try to get error message from response
            try {
                const errorData = await response.json();
                error.message = errorData.error || errorData.message || error.message;
            } catch (e) {
                // Use default error message
            }

            throw error;
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    },

    // Generic request method with retry logic
    async request(url, options = {}) {
        const config = {
            ...this.defaultOptions,
            ...options,
            headers: {
                ...this.getHeaders(options.includeAuth !== false),
                ...options.headers
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        let lastError;

        for (let attempt = 0; attempt <= config.retries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                return await this.handleResponse(response);
            } catch (error) {
                lastError = error;

                // Don't retry on authentication errors
                if (error.status === 401 || error.status === 403) {
                    break;
                }

                // Don't retry on client errors (4xx except 401, 403)
                if (error.status >= 400 && error.status < 500) {
                    break;
                }

                // If not the last attempt, wait before retrying
                if (attempt < config.retries) {
                    await new Promise(resolve => setTimeout(resolve, config.retryDelay * (attempt + 1)));
                }
            }
        }

        clearTimeout(timeoutId);
        throw lastError;
    },

    // GET request
    async get(endpoint, params = {}) {
        const url = new URL(CineScope.API.BASE_URL + endpoint);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString(), {
            method: 'GET'
        });
    },

    // POST request
    async post(endpoint, data = {}) {
        return await this.request(CineScope.API.BASE_URL + endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request
    async put(endpoint, data = {}) {
        return await this.request(CineScope.API.BASE_URL + endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    async delete(endpoint) {
        return await this.request(CineScope.API.BASE_URL + endpoint, {
            method: 'DELETE'
        });
    },

    // Authentication methods
    auth: {
        async login(credentials) {
            try {
                const response = await CineScope.HTTP.post(CineScope.API.ENDPOINTS.AUTH.LOGIN, credentials);

                if (response.token && response.user) {
                    CineScope.Storage.token.set(response.token);
                    CineScope.Storage.user.set(response.user);
                }

                return response;
            } catch (error) {
                throw error;
            }
        },

        async register(userData) {
            try {
                const response = await CineScope.HTTP.post(CineScope.API.ENDPOINTS.AUTH.REGISTER, userData);

                if (response.token && response.user) {
                    CineScope.Storage.token.set(response.token);
                    CineScope.Storage.user.set(response.user);
                }

                return response;
            } catch (error) {
                throw error;
            }
        },

        logout() {
            CineScope.Storage.clearAll();
            window.location.href = '/';
        }
    },

    // Content methods
    content: {
        async search(query, filters = {}) {
            const params = { query, ...filters };
            const response = await CineScope.HTTP.get(CineScope.API.ENDPOINTS.CONTENT.SEARCH, params);

            // Add to search history
            if (query.trim()) {
                CineScope.Storage.searchHistory.add(query.trim());
            }

            return response;
        },

        async getDetails(contentId) {
            const response = await CineScope.HTTP.get(`${CineScope.API.ENDPOINTS.CONTENT.DETAILS}/${contentId}`);

            // Add to last viewed
            CineScope.Storage.lastViewed.add({
                id: response.id,
                title: response.title,
                poster_path: response.poster_path,
                content_type: response.content_type,
                rating: response.rating
            });

            return response;
        },

        async getTrending(params = {}) {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.CONTENT.TRENDING, params);
        },

        async getNewReleases(params = {}) {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.CONTENT.NEW_RELEASES, params);
        },

        async getCriticsChoice(params = {}) {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.CONTENT.CRITICS_CHOICE, params);
        },

        async getByGenre(genre, params = {}) {
            return await CineScope.HTTP.get(`${CineScope.API.ENDPOINTS.CONTENT.GENRE}/${genre}`, params);
        },

        async getRegional(language, params = {}) {
            return await CineScope.HTTP.get(`${CineScope.API.ENDPOINTS.CONTENT.REGIONAL}/${language}`, params);
        },

        async getAnime(params = {}) {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.CONTENT.ANIME, params);
        },

        async getSimilar(contentId, params = {}) {
            return await CineScope.HTTP.get(`${CineScope.API.ENDPOINTS.CONTENT.SIMILAR}/${contentId}`, params);
        },

        async getAdminChoice(params = {}) {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.CONTENT.ADMIN_CHOICE, params);
        }
    },

    // User interaction methods
    user: {
        async recordInteraction(contentId, type, rating = null) {
            return await CineScope.HTTP.post(CineScope.API.ENDPOINTS.USER.INTERACTIONS, {
                content_id: contentId,
                interaction_type: type,
                rating: rating
            });
        },

        async getWatchlist() {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.USER.WATCHLIST);
        },

        async getFavorites() {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.USER.FAVORITES);
        },

        async getPersonalized(params = {}) {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.USER.PERSONALIZED, params);
        }
    },

    // Admin methods
    admin: {
        async search(query, source = 'tmdb', page = 1) {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.ADMIN.SEARCH, {
                query,
                source,
                page
            });
        },

        async saveContent(contentData) {
            return await CineScope.HTTP.post(CineScope.API.ENDPOINTS.ADMIN.CONTENT, contentData);
        },

        async createRecommendation(data) {
            return await CineScope.HTTP.post(CineScope.API.ENDPOINTS.ADMIN.RECOMMENDATIONS, data);
        },

        async getRecommendations(params = {}) {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.ADMIN.RECOMMENDATIONS, params);
        },

        async getAnalytics() {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.ADMIN.ANALYTICS);
        },

        async checkMLService() {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.ADMIN.ML_CHECK);
        },

        async updateMLService() {
            return await CineScope.HTTP.post(CineScope.API.ENDPOINTS.ADMIN.ML_UPDATE);
        },

        async getMLStats() {
            return await CineScope.HTTP.get(CineScope.API.ENDPOINTS.ADMIN.ML_STATS);
        }
    }
};