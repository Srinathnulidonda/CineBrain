// API Configuration and Communication
class API {
    constructor() {
        this.baseURL = 'https://backend-app-970m.onrender.com/api';
        this.token = null;
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Setup network monitoring
        this.setupNetworkMonitoring();
        
        // Setup request interceptors
        this.setupInterceptors();
    }
    
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processRequestQueue();
            this.showToast('Connection restored', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('You are offline. Some features may be limited.', 'info');
        });
    }
    
    setupInterceptors() {
        // Add auth token to requests
        this.addRequestInterceptor((config) => {
            if (this.token) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${this.token}`
                };
            }
            return config;
        });
        
        // Handle response errors
        this.addResponseInterceptor(
            (response) => response,
            (error) => {
                if (error.status === 401) {
                    this.handleAuthError();
                }
                return Promise.reject(error);
            }
        );
    }
    
    addRequestInterceptor(interceptor) {
        this.requestInterceptor = interceptor;
    }
    
    addResponseInterceptor(successHandler, errorHandler) {
        this.responseSuccessHandler = successHandler;
        this.responseErrorHandler = errorHandler;
    }
    
    async request(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Apply request interceptor
        if (this.requestInterceptor) {
            Object.assign(config, this.requestInterceptor(config));
        }
        
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `${config.method}:${url}:${JSON.stringify(config.body || {})}`;
        
        // Check cache for GET requests
        if (config.method === 'GET' && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        // Handle offline requests
        if (!this.isOnline && config.method !== 'GET') {
            return this.queueRequest(endpoint, config);
        }
        
        try {
            console.log(`Making API request to: ${url}`);
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error ${response.status}:`, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`API Response from ${endpoint}:`, data);
            
            // Cache GET requests
            if (config.method === 'GET') {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }
            
            // Apply response interceptor
            if (this.responseSuccessHandler) {
                return this.responseSuccessHandler(data);
            }
            
            return data;
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            
            // Apply error interceptor
            if (this.responseErrorHandler) {
                return this.responseErrorHandler(error);
            }
            
            // Return cached data if available for GET requests
            if (config.method === 'GET' && this.cache.has(cacheKey)) {
                console.log('Returning cached data due to network error');
                return this.cache.get(cacheKey).data;
            }
            
            throw error;
        }
    }
    
    queueRequest(endpoint, config) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                endpoint,
                config,
                resolve,
                reject
            });
        });
    }
    
    async processRequestQueue() {
        while (this.requestQueue.length > 0) {
            const { endpoint, config, resolve, reject } = this.requestQueue.shift();
            try {
                const result = await this.request(endpoint, config);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }
    
    handleAuthError() {
        this.token = null;
        localStorage.removeItem('token');
        this.showToast('Session expired. Please log in again.', 'error');
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('login.html')) {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    }
    
    setToken(token) {
        this.token = token;
        console.log('Token set:', token ? 'Yes' : 'No');
    }
    
    clearToken() {
        this.token = null;
        console.log('Token cleared');
    }
    
    // Authentication endpoints
    async login(credentials) {
        console.log('Attempting login with:', { username: credentials.username });
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }
    
    async register(userData) {
        console.log('Attempting registration with:', { 
            username: userData.username, 
            email: userData.email 
        });
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    // Content endpoints with fallback data
    async getHomepage() {
        try {
            return await this.request('/homepage');
        } catch (error) {
            console.warn('Failed to fetch homepage data, using fallback');
            return this.getFallbackHomepageData();
        }
    }
    
    async getPersonalizedRecommendations() {
        try {
            return await this.request('/recommendations/personalized');
        } catch (error) {
            console.warn('Failed to fetch personalized recommendations, using fallback');
            return this.getFallbackRecommendations();
        }
    }
    
    async getRecommendations() {
        try {
            return await this.request('/recommendations');
        } catch (error) {
            console.warn('Failed to fetch recommendations, using fallback');
            return this.getFallbackRecommendations();
        }
    }
    
    async getContentDetails(contentId) {
        try {
            return await this.request(`/content/${contentId}/details`);
        } catch (error) {
            console.warn('Failed to fetch content details, using fallback');
            return this.getFallbackContentDetails(contentId);
        }
    }
    
    async searchContent(query, type = 'movie') {
        try {
            const params = new URLSearchParams({ q: query, type });
            return await this.request(`/search?${params}`);
        } catch (error) {
            console.warn('Search failed, using fallback');
            return this.getFallbackSearchResults(query);
        }
    }
    
    // User interaction endpoints
    async recordInteraction(data) {
        try {
            return await this.request('/interact', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.warn('Failed to record interaction:', error);
            // Store locally for later sync
            this.storeOfflineInteraction(data);
            return { success: true, offline: true };
        }
    }
    
    storeOfflineInteraction(data) {
        const offlineInteractions = JSON.parse(localStorage.getItem('offlineInteractions') || '[]');
        offlineInteractions.push({
            ...data,
            timestamp: Date.now()
        });
        localStorage.setItem('offlineInteractions', JSON.stringify(offlineInteractions));
    }
    
    // Fallback data methods
    getFallbackHomepageData() {
        return {
            trending: {
                movies: this.getSampleMovies(),
                tv: this.getSampleTVShows(),
                anime: this.getSampleAnime()
            },
            whats_hot: this.getSampleMovies().slice(0, 15),
            critics_choice: this.getSampleMovies().slice(5, 15),
            regional: {
                Telugu: this.getSampleMovies().slice(0, 10),
                Hindi: this.getSampleMovies().slice(2, 12),
                Tamil: this.getSampleMovies().slice(4, 14),
                Kannada: this.getSampleMovies().slice(6, 16)
            },
            user_favorites: this.getSampleMovies().slice(0, 10),
            admin_curated: this.getSampleMovies().slice(0, 15)
        };
    }
    
    getFallbackRecommendations() {
        const sampleMovies = this.getSampleMovies();
        return {
            hybrid_recommendations: sampleMovies.slice(0, 15),
            watch_history_based: sampleMovies.slice(5, 20),
            favorites_based: sampleMovies.slice(10, 25),
            wishlist_influenced: sampleMovies.slice(15, 25),
            regional_suggestions: sampleMovies.slice(0, 10),
            collaborative_filtering: sampleMovies.slice(8, 23)
        };
    }
    
    getFallbackContentDetails(contentId) {
        const movie = this.getSampleMovies().find(m => m.id == contentId) || this.getSampleMovies()[0];
        return {
            content: movie,
            tmdb_details: {
                tagline: "An epic adventure awaits",
                runtime: 120,
                budget: 50000000,
                revenue: 150000000,
                production_companies: [{ name: "Sample Studios" }],
                production_countries: [{ name: "United States" }],
                credits: {
                    cast: this.getSampleCast(),
                    crew: this.getSampleCrew()
                }
            },
            youtube_videos: {
                trailers: this.getSampleVideos(),
                teasers: this.getSampleVideos()
            },
            user_reviews: this.getSampleReviews(),
            similar_content: this.getSampleMovies().slice(0, 8)
        };
    }
    
    getFallbackSearchResults(query) {
        const allContent = this.getSampleMovies();
        const filtered = allContent.filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase())
        );
        
        return {
            database_results: filtered,
            tmdb_results: filtered
        };
    }
    
    getSampleMovies() {
        return [
            {
                id: 1,
                title: "The Dark Knight",
                overview: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.",
                poster_path: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/hqkIcbrOHL86UncnHIsHVcVmzue.jpg",
                release_date: "2008-07-18",
                rating: 9.0,
                genre_names: ["Action", "Crime", "Drama"],
                genres: [28, 80, 18],
                content_type: "movie",
                popularity: 85.5
            },
            {
                id: 2,
                title: "Inception",
                overview: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.",
                poster_path: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
                release_date: "2010-07-16",
                rating: 8.8,
                genre_names: ["Action", "Science Fiction", "Thriller"],
                genres: [28, 878, 53],
                content_type: "movie",
                popularity: 82.3
            },
            {
                id: 3,
                title: "Interstellar",
                overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
                poster_path: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/pbrkL804c8yAv3zBZR4QPWZAAn8.jpg",
                release_date: "2014-11-07",
                rating: 8.6,
                genre_names: ["Adventure", "Drama", "Science Fiction"],
                genres: [12, 18, 878],
                content_type: "movie",
                popularity: 79.1
            },
            {
                id: 4,
                title: "The Matrix",
                overview: "A computer hacker learns from mysterious rebels about the true nature of his reality.",
                poster_path: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
                release_date: "1999-03-31",
                rating: 8.7,
                genre_names: ["Action", "Science Fiction"],
                genres: [28, 878],
                content_type: "movie",
                popularity: 76.8
            },
            {
                id: 5,
                title: "Pulp Fiction",
                overview: "The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.",
                poster_path: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/4cDFJr4HnXN5AdPw4AKrmLlMWdO.jpg",
                release_date: "1994-10-14",
                rating: 8.9,
                genre_names: ["Crime", "Drama"],
                genres: [80, 18],
                content_type: "movie",
                popularity: 74.2
            },
            {
                id: 6,
                title: "Avatar",
                                overview: "A paraplegic Marine dispatched to the moon Pandora on a unique mission becomes torn between following orders and protecting an alien civilization.",
                poster_path: "https://image.tmdb.org/t/p/w500/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/Yc9q6QuWrMp9nuDm5R8ExNqbEWU.jpg",
                release_date: "2009-12-18",
                rating: 7.8,
                genre_names: ["Action", "Adventure", "Fantasy", "Science Fiction"],
                genres: [28, 12, 14, 878],
                content_type: "movie",
                popularity: 88.9
            },
            {
                id: 7,
                title: "Avengers: Endgame",
                overview: "After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos' actions.",
                poster_path: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
                release_date: "2019-04-26",
                rating: 8.4,
                genre_names: ["Adventure", "Science Fiction", "Action"],
                genres: [12, 878, 28],
                content_type: "movie",
                popularity: 92.1
            },
            {
                id: 8,
                title: "Spider-Man: No Way Home",
                overview: "With Spider-Man's identity now revealed, Peter asks Doctor Strange for help.",
                poster_path: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg",
                release_date: "2021-12-17",
                rating: 8.2,
                genre_names: ["Action", "Adventure", "Science Fiction"],
                genres: [28, 12, 878],
                content_type: "movie",
                popularity: 95.3
            }
        ];
    }
    
    getSampleTVShows() {
        return [
            {
                id: 101,
                title: "Breaking Bad",
                overview: "A high school chemistry teacher turned methamphetamine manufacturer.",
                poster_path: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
                release_date: "2008-01-20",
                rating: 9.5,
                genre_names: ["Crime", "Drama", "Thriller"],
                genres: [80, 18, 53],
                content_type: "tv",
                popularity: 89.7
            },
            {
                id: 102,
                title: "Stranger Things",
                overview: "When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces.",
                poster_path: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
                release_date: "2016-07-15",
                rating: 8.7,
                genre_names: ["Drama", "Fantasy", "Horror"],
                genres: [18, 14, 27],
                content_type: "tv",
                popularity: 87.4
            }
        ];
    }
    
    getSampleAnime() {
        return [
            {
                id: 201,
                title: "Attack on Titan",
                overview: "Humanity fights for survival against giant humanoid Titans.",
                poster_path: "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
                backdrop_path: "https://image.tmdb.org/t/p/w1280/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg",
                release_date: "2013-04-07",
                rating: 9.0,
                genre_names: ["Action", "Animation", "Drama"],
                genres: [28, 16, 18],
                content_type: "anime",
                popularity: 91.2
            }
        ];
    }
    
    getSampleCast() {
        return [
            {
                name: "Christian Bale",
                character: "Bruce Wayne / Batman",
                profile_path: "/3qx2QFUbG6t6IlzR0F9k3Z6Yhf7.jpg"
            },
            {
                name: "Heath Ledger",
                character: "Joker",
                profile_path: "/5Y9HnYYa9jF4NunY9lSgJGjSe8E.jpg"
            },
            {
                name: "Aaron Eckhart",
                character: "Harvey Dent / Two-Face",
                profile_path: "/kOMsxKr9JdoGeiUe5QBFGGdZnUz.jpg"
            }
        ];
    }
    
    getSampleCrew() {
        return [
            {
                name: "Christopher Nolan",
                job: "Director"
            },
            {
                name: "Jonathan Nolan",
                job: "Writer"
            }
        ];
    }
    
    getSampleVideos() {
        return [
            {
                video_id: "EXeTwQWrcwY",
                title: "Official Trailer",
                thumbnail: "https://img.youtube.com/vi/EXeTwQWrcwY/maxresdefault.jpg",
                type: "trailer"
            }
        ];
    }
    
    getSampleReviews() {
        return [
            {
                id: 1,
                username: "MovieFan123",
                rating: 5,
                review_text: "Absolutely incredible movie! The cinematography and story are top-notch.",
                created_at: "2024-01-15T10:30:00Z"
            },
            {
                id: 2,
                username: "CinemaLover",
                rating: 4,
                review_text: "Great film with amazing performances. Highly recommended!",
                created_at: "2024-01-10T15:45:00Z"
            }
        ];
    }
    
    // Utility methods
    showToast(message, type = 'info') {
        if (typeof window !== 'undefined' && window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`Toast: ${type.toUpperCase()} - ${message}`);
        }
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    getCacheSize() {
        return this.cache.size;
    }
}

// Create global API instance
const api = new API();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}