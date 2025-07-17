// Main Application Class
class MovieRecApp {
    constructor() {
        this.api = API;
        this.auth = Auth;
        this.currentPage = this.getCurrentPage();
        this.isLoading = false;
        this.cache = new Map();
        
        this.init();
    }

    // Initialize the application
    async init() {
        try {
            this.setupGlobalEventListeners();
            await this.loadPageContent();
            this.setupNavigation();
            this.setupSearch();
            this.hideLoadingScreen();
        } catch (error) {
            console.error('App initialization error:', error);
            this.handleError(error);
        }
    }

    // Get current page from URL
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'index';
        return page;
    }

    // Setup global event listeners
    setupGlobalEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        this.openSearch();
                        break;
                    case '/':
                        e.preventDefault();
                        this.openSearch();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Handle network status changes
        window.addEventListener('online', () => {
            Toast.show('Connection restored', 'success');
            this.retryFailedRequests();
        });

        window.addEventListener('offline', () => {
            Toast.show('Connection lost. Some features may be limited.', 'warning', 0);
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.auth.isAuthenticated()) {
                this.refreshUserData();
            }
        });

        // Smooth scroll for anchor links
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
                e.preventDefault();
                const targetId = e.target.getAttribute('href').slice(1);
                Utils.scrollToElement(targetId, 80);
            }
        });
    }

    // Load page-specific content
    async loadPageContent() {
        Utils.performanceTimer.start('pageLoad');
        
        switch (this.currentPage) {
            case 'index':
                await this.loadHomepage();
                break;
            case 'dashboard':
                if (!this.auth.requireAuth()) return;
                await this.loadDashboard();
                break;
            case 'movie-detail':
                await this.loadMovieDetail();
                break;
            case 'profile':
                if (!this.auth.requireAuth()) return;
                await this.loadProfile();
                break;
            case 'admin':
                if (!this.auth.requireAdmin()) return;
                await this.loadAdminDashboard();
                break;
        }
        
        Utils.performanceTimer.end('pageLoad');
    }

    // Load homepage content
    async loadHomepage() {
        try {
            this.showLoadingState();
            
            const data = await this.api.getCachedRequest('homepage', 
                () => this.api.getHomepage(), 
                300000 // 5 minutes cache
            );

            this.renderTrendingContent(data.trending);
            this.renderWhatsHot(data.whats_hot);
            this.renderCriticsChoice(data.critics_choice);
            this.renderRegionalContent(data.regional);
            this.renderUserFavorites(data.user_favorites);
            this.renderAdminCurated(data.admin_curated);

            this.setupContentTabs();
            this.setupRegionalTabs();
            
        } catch (error) {
            console.error('Homepage load error:', error);
            this.showErrorState('Failed to load content. Please try again.');
        } finally {
            this.hideLoadingState();
        }
    }

    // Load dashboard content
    async loadDashboard() {
        try {
            this.showLoadingState();
            
            // Load personalized recommendations
            const recommendations = await this.api.getPersonalizedRecommendations();
            
            this.renderPersonalizedRecommendations(recommendations);
            this.updateUserStats();
            this.setupPreferenceTuning();
            
        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showErrorState('Failed to load your recommendations.');
        } finally {
            this.hideLoadingState();
        }
    }

    // Render trending content
    renderTrendingContent(trending) {
        const containers = {
            'trending-movies': trending.movies || [],
            'trending-tv': trending.tv || [],
            'trending-anime': trending.anime || []
        };

        Object.entries(containers).forEach(([containerId, items]) => {
            const container = document.getElementById(containerId);
            if (!container || !items.length) return;

            container.innerHTML = '';
            
            items.forEach(item => {
                const movieCard = UIComponents.createMovieCard(item, {
                    showActions: false,
                    onAction: (action, movie) => this.handleMovieAction(action, movie)
                });
                container.appendChild(movieCard);
            });
        });
    }

    // Render what's hot section
    renderWhatsHot(items) {
        const container = document.getElementById('whats-hot');
        if (!container || !items?.length) return;

        container.innerHTML = '';
        
        items.forEach(item => {
            const movieCard = UIComponents.createMovieCard(item, {
                showActions: false
            });
            container.appendChild(movieCard);
        });
    }

    // Render critics' choice
    renderCriticsChoice(items) {
        const container = document.getElementById('critics-choice');
        if (!container || !items?.length) return;

        container.innerHTML = '';
        
        items.forEach(item => {
            const movieCard = UIComponents.createMovieCard(item, {
                showActions: false
            });
            container.appendChild(movieCard);
        });
    }

    // Render regional content
    renderRegionalContent(regional) {
        const container = document.getElementById('regional-content');
        if (!container || !regional) return;

        // Start with Telugu content
        const teluguContent = regional.Telugu || [];
        this.renderMovieGrid(container, teluguContent);
    }

    // Render user favorites
    renderUserFavorites(items) {
        const container = document.getElementById('user-favorites');
        if (!container || !items?.length) return;

        container.innerHTML = '';
        
        items.forEach(item => {
            const movieCard = UIComponents.createMovieCard(item, {
                showActions: false
            });
            container.appendChild(movieCard);
        });
    }

    // Render admin curated content
    renderAdminCurated(items) {
        const container = document.getElementById('admin-curated');
        if (!container || !items?.length) return;

        container.innerHTML = '';
        
        items.forEach(item => {
            const curatedCard = UIComponents.createCuratedCard(item);
            container.appendChild(curatedCard);
        });
    }

    // Render personalized recommendations
    renderPersonalizedRecommendations(recommendations) {
        const sections = [
            { id: 'personalized-recs', data: recommendations.hybrid_recommendations, title: 'Recommended For You' },
            { id: 'recent-activity-recs', data: recommendations.watch_history_based, title: 'Based on Your Recent Activity' },
            { id: 'genre-based-recs', data: recommendations.favorites_based, title: 'More Like What You Love' },
            { id: 'favorites-based-recs', data: recommendations.wishlist_influenced, title: 'Similar to Your Favorites' },
            { id: 'collaborative-recs', data: recommendations.collaborative_filtering, title: 'People with Similar Taste Also Liked' }
        ];

        sections.forEach(section => {
            const container = document.getElementById(section.id);
            if (!container || !section.data?.length) return;

            this.renderMovieGrid(container, section.data);
        });
    }

    // Generic method to render movie grid
    renderMovieGrid(container, items) {
        container.innerHTML = '';
        
        items.forEach(item => {
            const movieCard = UIComponents.createMovieCard(item, {
                showActions: this.auth.isAuthenticated(),
                onAction: (action, movie) => this.handleMovieAction(action, movie)
            });
            container.appendChild(movieCard);
        });

        // Initialize lazy loading for new images
        lazyLoader.observeAll();
    }

    // Handle movie card actions
    async handleMovieAction(action, movie) {
        if (!this.auth.isAuthenticated()) {
            this.showAuthPrompt();
            return;
        }

        try {
            switch (action) {
                case 'play':
                    window.location.href = `movie-detail.html?id=${movie.id}`;
                    break;
                    
                case 'favorite':
                    await this.api.addToFavorites(movie.id);
                    Toast.show(`Added "${movie.title}" to favorites`, 'success');
                    break;
                    
                case 'watchlist':
                    await this.api.addToWatchlist(movie.id);
                    Toast.show(`Added "${movie.title}" to watchlist`, 'success');
                    break;
            }
        } catch (error) {
            console.error(`Action ${action} failed:`, error);
            Toast.show('Action failed. Please try again.', 'error');
        }
    }

    // Setup content tabs
    setupContentTabs() {
        const tabButtons = document.querySelectorAll('.content-tabs .tab-btn');
        const tabContents = document.querySelectorAll('.content-carousel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Update button states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update content visibility
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                    if (content.id === targetTab) {
                        content.classList.remove('hidden');
                    }
                });
            });
        });
    }

    // Setup regional tabs
    setupRegionalTabs() {
        const regionalTabs = document.querySelectorAll('.regional-tabs .tab-btn');
        const regionalContainer = document.getElementById('regional-content');

        regionalTabs.forEach(button => {
            button.addEventListener('click', async () => {
                const language = button.dataset.lang;
                
                // Update button states
                regionalTabs.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Load regional content
                try {
                    const data = await this.api.getCachedRequest(`homepage`, 
                        () => this.api.getHomepage()
                    );
                    
                    const regionalContent = data.regional[language] || [];
                    this.renderMovieGrid(regionalContainer, regionalContent);
                } catch (error) {
                    console.error('Regional content load error:', error);
                    Toast.show('Failed to load regional content', 'error');
                }
            });
        });
    }

    // Setup navigation
    setupNavigation() {
        // Mobile menu toggle
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('nav-menu');

        hamburger?.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu?.classList.toggle('active');
        });

        // User menu toggle
        const userMenuToggle = document.getElementById('user-menu-toggle');
        const userDropdown = document.getElementById('user-dropdown');

        userMenuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown?.classList.toggle('active');
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            userDropdown?.classList.remove('active');
            navMenu?.classList.remove('active');
            hamburger?.classList.remove('active');
        });

        // Navbar scroll effect
        let lastScrollY = window.scrollY;
        const navbar = document.querySelector('.navbar');

        window.addEventListener('scroll', Utils.throttle(() => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 100) {
                navbar?.classList.add('scrolled');
            } else {
                navbar?.classList.remove('scrolled');
            }

            // Hide/show navbar on scroll
            if (currentScrollY > lastScrollY && currentScrollY > 200) {
                navbar?.style.setProperty('transform', 'translateY(-100%)');
            } else {
                navbar?.style.setProperty('transform', 'translateY(0)');
            }

            lastScrollY = currentScrollY;
        }, 100));
    }

    // Setup search functionality
    setupSearch() {
        const searchToggle = document.getElementById('search-toggle');
        const searchOverlay = document.getElementById('search-overlay');
        const searchInput = document.getElementById('search-input');
        const searchClose = document.getElementById('search-close');
        const searchResults = document.getElementById('search-results');

        searchToggle?.addEventListener('click', () => {
            this.openSearch();
        });

        searchClose?.addEventListener('click', () => {
            this.closeSearch();
        });

        searchOverlay?.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                this.closeSearch();
            }
        });

        // Search input with debouncing
        searchInput?.addEventListener('input', Utils.debounce(async (e) => {
            const query = e.target.value.trim();
            
            if (query.length >= 2) {
                await this.performSearch(query);
            } else {
                searchResults.innerHTML = '';
            }
        }, 300));

        // Search keyboard navigation
        searchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSearch();
            }
        });
    }

    // Open search overlay
    openSearch() {
        const searchOverlay = document.getElementById('search-overlay');
        const searchInput = document.getElementById('search-input');
        
        searchOverlay?.classList.add('active');
        searchInput?.focus();
    }

    // Close search overlay
    closeSearch() {
        const searchOverlay = document.getElementById('search-overlay');
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        searchOverlay?.classList.remove('active');
        searchInput.value = '';
        searchResults.innerHTML = '';
    }

    // Perform search
    async performSearch(query) {
        const searchResults = document.getElementById('search-results');
        
        try {
            searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
            
            const results = await this.api.searchContent(query);
            
            searchResults.innerHTML = '';
            
            if (results.database_results?.length > 0 || results.tmdb_results?.length > 0) {
                const allResults = [...(results.database_results || []), ...(results.tmdb_results || [])];
                const uniqueResults = this.deduplicateResults(allResults);
                
                uniqueResults.forEach(result => {
                    const resultElement = UIComponents.createSearchResult(result);
                    searchResults.appendChild(resultElement);
                });
            } else {
                searchResults.innerHTML = '<div class="search-empty">No results found</div>';
            }
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
        }
    }

    // Deduplicate search results
    deduplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = `${result.title || result.name}_${result.release_date || result.first_air_date}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    // Update user stats
    async updateUserStats() {
        // This would typically come from an API call
        // For now, we'll use placeholder data
        const stats = {
            watched: 42,
            wishlist: 15,
            favorites: 8
        };

        document.getElementById('watched-count').textContent = stats.watched;
        document.getElementById('wishlist-count').textContent = stats.wishlist;
        document.getElementById('favorites-count').textContent = stats.favorites;
    }

    // Setup preference tuning
    setupPreferenceTuning() {
        const tuneBtn = document.getElementById('tune-preferences');
        const modal = document.getElementById('preferences-modal');
        const closeBtn = document.getElementById('preferences-close');
        const saveBtn = document.getElementById('preferences-save');

        tuneBtn?.addEventListener('click', () => {
            modal?.classList.add('active');
            this.loadUserPreferences();
        });

        closeBtn?.addEventListener('click', () => {
            modal?.classList.remove('active');
        });

        saveBtn?.addEventListener('click', () => {
            this.saveUserPreferences();
        });
    }

    // Load user preferences
    loadUserPreferences() {
        const preferences = Utils.getStorage('user_preferences', {
            genres: [],
            languages: ['English'],
            types: ['Movie', 'TV Show']
        });

        // Populate genre preferences
        const genreGrid = document.getElementById('genre-preferences');
        if (genreGrid) {
            const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Animation', 'Documentary', 'Fantasy'];
            
            genreGrid.innerHTML = '';
            genres.forEach(genre => {
                const genreOption = document.createElement('div');
                genreOption.className = `genre-option ${preferences.genres.includes(genre) ? 'selected' : ''}`;
                genreOption.textContent = genre;
                genreOption.addEventListener('click', () => {
                    genreOption.classList.toggle('selected');
                });
                genreGrid.appendChild(genreOption);
            });
        }

        // Populate language preferences
        const languageOptions = document.getElementById('language-preferences');
        if (languageOptions) {
            const languages = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada'];
            
            languageOptions.innerHTML = '';
            languages.forEach(language => {
                const langOption = document.createElement('div');
                langOption.className = `language-option ${preferences.languages.includes(language) ? 'selected' : ''}`;
                langOption.textContent = language;
                langOption.addEventListener('click', () => {
                    langOption.classList.toggle('selected');
                });
                languageOptions.appendChild(langOption);
            });
        }

        // Populate type preferences
        const typeOptions = document.getElementById('type-preferences');
        if (typeOptions) {
            const types = ['Movie', 'TV Show', 'Anime', 'Documentary'];
            
            typeOptions.innerHTML = '';
            types.forEach(type => {
                const typeOption = document.createElement('div');
                typeOption.className = `type-option ${preferences.types.includes(type) ? 'selected' : ''}`;
                typeOption.textContent = type;
                typeOption.addEventListener('click', () => {
                    typeOption.classList.toggle('selected');
                });
                typeOptions.appendChild(typeOption);
            });
        }
    }

    // Save user preferences
    saveUserPreferences() {
        const selectedGenres = Array.from(document.querySelectorAll('.genre-option.selected'))
            .map(el => el.textContent);
        const selectedLanguages = Array.from(document.querySelectorAll('.language-option.selected'))
            .map(el => el.textContent);
        const selectedTypes = Array.from(document.querySelectorAll('.type-option.selected'))
            .map(el => el.textContent);

        const preferences = {
            genres: selectedGenres,
            languages: selectedLanguages,
            types: selectedTypes
        };

        Utils.setStorage('user_preferences', preferences);
        
        const modal = document.getElementById('preferences-modal');
        modal?.classList.remove('active');
        
        Toast.show('Preferences saved! Your recommendations will be updated.', 'success');
        
        // Refresh recommendations
        if (this.currentPage === 'dashboard') {
            this.loadDashboard();
        }
    }

    // Show authentication prompt
    showAuthPrompt() {
        const modal = UIComponents.createModal(
            'Sign In Required',
            `
            <p>Please sign in to add movies to your favorites and watchlist.</p>
            <div style="text-align: center; margin-top: 20px;">
                <a href="login.html" class="btn btn-primary">Sign In</a>
            </div>
            `,
            { closable: true }
        );
    }

    // Loading states
    showLoadingState() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen?.classList.remove('hidden');
    }

    hideLoadingState() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen?.classList.add('hidden');
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 300);
            }, 1000);
        }
    }

    // Error handling
    showErrorState(message) {
        Toast.show(message, 'error');
    }

    handleError(error) {
        console.error('Application error:', error);
        Toast.show('Something went wrong. Please refresh the page.', 'error');
    }

    // Close all modals
    closeAllModals() {
        const modals = document.querySelectorAll('.modal-overlay.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });

        const searchOverlay = document.getElementById('search-overlay');
        if (searchOverlay?.classList.contains('active')) {
            this.closeSearch();
        }
    }

    // Refresh user data
    async refreshUserData() {
        if (this.auth.isAuthenticated() && this.currentPage === 'dashboard') {
            try {
                await this.updateUserStats();
            } catch (error) {
                console.error('User data refresh error:', error);
            }
        }
    }

    // Retry failed requests
    async retryFailedRequests() {
        // Implement retry logic for failed requests
        // This could involve re-executing the last failed API calls
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MovieRecApp();
});

// Initialize dashboard-specific functionality
async function initializeDashboard() {
    if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    Auth.updateUserDisplay();
    await window.app.loadDashboard();
}

// Export for global access
export default MovieRecApp;