// API Service
class APIService {
    static baseURL = 'https://backend-app-970m.onrender.com';

    // Search
    static async searchContent(query, type = 'multi', page = 1) {
        try {
            const response = await fetch(`${this.baseURL}/api/search?query=${encodeURIComponent(query)}&type=${type}&page=${page}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Search failed: ${response.status}`);
        } catch (error) {
            console.error('Search API error:', error);
            throw error;
        }
    }

    // Content Details
    static async getContentDetails(contentId) {
        try {
            const response = await fetch(`${this.baseURL}/api/content/${contentId}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Content details failed: ${response.status}`);
        } catch (error) {
            console.error('Content details API error:', error);
            throw error;
        }
    }

    // Recommendations
    static async getTrending(type = 'all', limit = 20) {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/trending?type=${type}&limit=${limit}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Trending failed: ${response.status}`);
        } catch (error) {
            console.error('Trending API error:', error);
            throw error;
        }
    }

    static async getNewReleases(language = null, type = 'movie', limit = 20) {
        try {
            let url = `${this.baseURL}/api/recommendations/new-releases?type=${type}&limit=${limit}`;
            if (language) {
                url += `&language=${language}`;
            }
            
            const response = await fetch(url, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`New releases failed: ${response.status}`);
        } catch (error) {
            console.error('New releases API error:', error);
            throw error;
        }
    }

    static async getCriticsChoice(type = 'movie', limit = 20) {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/critics-choice?type=${type}&limit=${limit}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Critics choice failed: ${response.status}`);
        } catch (error) {
            console.error('Critics choice API error:', error);
            throw error;
        }
    }

    static async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/genre/${genre}?type=${type}&limit=${limit}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Genre recommendations failed: ${response.status}`);
        } catch (error) {
            console.error('Genre recommendations API error:', error);
            throw error;
        }
    }

    static async getRegionalContent(language, type = 'movie', limit = 20) {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/regional/${language}?type=${type}&limit=${limit}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Regional content failed: ${response.status}`);
        } catch (error) {
            console.error('Regional content API error:', error);
            throw error;
        }
    }

    static async getAnimeRecommendations(genre = null, limit = 20) {
        try {
            let url = `${this.baseURL}/api/recommendations/anime?limit=${limit}`;
            if (genre) {
                url += `&genre=${genre}`;
            }
            
            const response = await fetch(url, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Anime recommendations failed: ${response.status}`);
        } catch (error) {
            console.error('Anime recommendations API error:', error);
            throw error;
        }
    }

    static async getSimilarContent(contentId, limit = 20) {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/similar/${contentId}?limit=${limit}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Similar content failed: ${response.status}`);
        } catch (error) {
            console.error('Similar content API error:', error);
            throw error;
        }
    }

    static async getPersonalizedRecommendations(limit = 20) {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/personalized?limit=${limit}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Personalized recommendations failed: ${response.status}`);
        } catch (error) {
            console.error('Personalized recommendations API error:', error);
            throw error;
        }
    }

    static async getAnonymousRecommendations(limit = 20) {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/anonymous?limit=${limit}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Anonymous recommendations failed: ${response.status}`);
        } catch (error) {
            console.error('Anonymous recommendations API error:', error);
            throw error;
        }
    }

    // User Interactions
    static async recordInteraction(contentId, interactionType, rating = null) {
        try {
            const response = await fetch(`${this.baseURL}/api/interactions`, {
                method: 'POST',
                headers: AuthManager.getAuthHeaders(),
                body: JSON.stringify({
                    content_id: contentId,
                    interaction_type: interactionType,
                    rating: rating
                })
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Record interaction failed: ${response.status}`);
        } catch (error) {
            console.error('Record interaction API error:', error);
            throw error;
        }
    }

    static async getWatchlist() {
        try {
            const response = await fetch(`${this.baseURL}/api/user/watchlist`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Get watchlist failed: ${response.status}`);
        } catch (error) {
            console.error('Get watchlist API error:', error);
            throw error;
        }
    }

    static async getFavorites() {
        try {
            const response = await fetch(`${this.baseURL}/api/user/favorites`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Get favorites failed: ${response.status}`);
        } catch (error) {
            console.error('Get favorites API error:', error);
            throw error;
        }
    }

    // Admin APIs
    static async adminSearch(query, source = 'tmdb', page = 1) {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/search?query=${encodeURIComponent(query)}&source=${source}&page=${page}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Admin search failed: ${response.status}`);
        } catch (error) {
            console.error('Admin search API error:', error);
            throw error;
        }
    }

    static async saveExternalContent(contentData) {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/content`, {
                method: 'POST',
                headers: AuthManager.getAuthHeaders(),
                body: JSON.stringify(contentData)
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Save content failed: ${response.status}`);
        } catch (error) {
            console.error('Save content API error:', error);
            throw error;
        }
    }

    static async createAdminRecommendation(data) {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/recommendations`, {
                method: 'POST',
                headers: AuthManager.getAuthHeaders(),
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Create recommendation failed: ${response.status}`);
        } catch (error) {
            console.error('Create recommendation API error:', error);
            throw error;
        }
    }

    static async getAdminRecommendations(page = 1, perPage = 20) {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/recommendations?page=${page}&per_page=${perPage}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Get admin recommendations failed: ${response.status}`);
        } catch (error) {
            console.error('Get admin recommendations API error:', error);
            throw error;
        }
    }

    static async getAnalytics() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/analytics`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Get analytics failed: ${response.status}`);
        } catch (error) {
            console.error('Get analytics API error:', error);
            throw error;
        }
    }
}

// Export for global access
window.APIService = APIService;
