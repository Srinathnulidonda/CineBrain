// Main Application
class MovieRecApp {
    constructor() {
        this.currentTab = 'movies';
        this.currentRegion = 'Telugu';
        this.homePageData = null;
        this.personalizedData = null;
        this.init();
    }
    
    async init() {
        // Setup navigation
        this.setupNavigation();
        
        // Setup search
        this.setupSearch();
        
        // Setup user menu
        this.setupUserMenu();
        
        // Load homepage data
        await this.loadHomePage();
        
        // Load personalized content if authenticated
        if (auth.isAuthenticated) {
            await this.loadPersonalizedContent();
        }
        
        // Setup scroll effects
        this.setupScrollEffects();
        
        // Setup tab handlers
        this.setupTabHandlers();
        
        // Register service worker
        this.registerServiceWorker();
    }
    
    setupNavigation() {
        // Update auth buttons
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const myListLink = document.getElementById('myListLink');
        const adminLink = document.getElementById('adminLink');
        
        if (auth.isAuthenticated) {
            authButtons.style.display = 'none';
            userMenu.style.display = 'block';
            myListLink.style.display = 'block';
            
            if (auth.isAdmin) {
                adminLink.style.display = 'block';
                adminLink.href = '/admin/';
            }
        }
        
        // Logout handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                auth.logout();
            });
        }
        
        // Dropdown toggle
        const userDropdown = document.getElementById('userDropdown');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        if (userDropdown) {
            userDropdown.addEventListener('click', () => {
                dropdownMenu.classList.toggle('show');
            });
            
            document.addEventListener('click', (e) => {
                if (!userDropdown.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.remove('show');
                }
            });
        }
    }
    
    setupSearch() {
        const searchTrigger = document.getElementById('searchTrigger');
        const searchOverlay = document.getElementById('searchOverlay');
        const searchClose = document.getElementById('searchClose');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        searchTrigger.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            searchInput.focus();
        });
        
        searchClose.addEventListener('click', () => {
            searchOverlay.classList.remove('active');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });
        
        // Search functionality
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                await this.performSearch(query);
            }, 300);
        });
    }
    
    async performSearch(query) {
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = '<div class="text-center p-4">Searching...</div>';
        
        try {
            const results = await api.searchContent(query);
            const allResults = [
                ...results.database_results,
                ...results.tmdb_results
            ];
            
            if (allResults.length === 0) {
                searchResults.innerHTML = '<div class="text-center p-4">No results found</div>';
                return;
            }
            
            searchResults.innerHTML = allResults.map(item => `
                <div class="search-result-item" onclick="movieActions.showDetails(${item.id || item.tmdb_id})">
                    <div class="search-result-poster">
                        <img src="${item.poster_path || '/assets/images/placeholder.jpg'}" 
                             alt="${item.title}" 
                             onerror="this.src='/assets/images/placeholder.jpg'">
                    </div>
                    <div class="search-result-info">
                        <div class="search-result-title">${item.title}</div>
                        <div class="search-result-meta">
                            ${item.release_date ? new Date(item.release_date).getFullYear() : ''}
                            ${item.rating ? `• ⭐ ${item.rating.toFixed(1)}` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            searchResults.innerHTML = '<div class="text-center p-4 text-danger">Search failed</div>';
        }
    }
    
    setupUserMenu() {
        // Already handled in setupNavigation
    }
    
    async loadHomePage() {
        try {
            this.homePageData = await api.getHomepage();
            
            // Render hero section
            this.renderHeroSection();
            
            // Render trending section
            this.renderTrendingSection();
            
            // Render What's Hot
            this.renderWhatsHot();
            
            // Render Critics' Choice
            this.renderCriticsChoice();
            
            // Render Regional Content
            this.renderRegionalContent();
            
            // Render Admin Curated
            this.renderAdminCurated();
            
        } catch (error) {
            console.error('Failed to load homepage:', error);
            new Toast('Failed to load content', 'error').show();
        }
    }
    
    renderHeroSection() {
        const heroSection = document.getElementById('heroSection');
        const featured = this.homePageData.trending.movies[0];
        
        if (!featured) return;
        
        heroSection.innerHTML = `
            <div class="hero-item">
                <div class="hero-backdrop">
                    <img src="${featured.backdrop_path ? `https://image.tmdb.org/t/p/w1280${featured.backdrop_path}` : featured.poster_path}" 
                         alt="${featured.title}">
                </div>
                <div class="hero-content">
                    <div class="container-fluid">
                        <h1 class="hero-title">${featured.title}</h1>
                        <p class="hero-overview">${featured.overview}</p>
                        <div class="hero-actions">
                            <button class="btn btn-primary hero-btn" onclick="movieActions.play(${featured.id})">
                                <i class="fas fa-play"></i> Play Trailer
                            </button>
                            <button class="btn btn-outline hero-btn" onclick="movieActions.showDetails(${featured.id})">
                                <i class="fas fa-info-circle"></i> More Info
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderTrendingSection() {
        const activeTab = this.homePageData.trending[this.currentTab];
        const carousel = new Carousel(
            'trendingCarousel',
            activeTab,
            (item) => new MovieCard(item, { size: 'medium' }).render()
        );
        carousel.render();
    }
    
    renderWhatsHot() {
        const carousel = new Carousel(
            'whatsHotCarousel',
            this.homePageData.whats_hot,
            (item) => new MovieCard(item, { size: 'medium' }).render()
        );
        carousel.render();
    }
    
    renderCriticsChoice() {
        const carousel = new Carousel(
            'criticsChoiceCarousel',
            this.homePageData.critics_choice,
            (item) => new MovieCard(item, { size: 'medium', showRating: true }).render()
        );
        carousel.render();
    }
    
    renderRegionalContent() {
        const regionalData = this.homePageData.regional[this.currentRegion] || [];
        const carousel = new Carousel(
            'regionalCarousel',
            regionalData,
            (item) => new MovieCard(item, { size: 'medium' }).render()
        );
        carousel.render();
    }
    
    renderAdminCurated() {
        const grid = document.getElementById('adminCuratedGrid');
        const curated = this.homePageData.admin_curated;
        
        if (!curated || curated.length === 0) {
            document.getElementById('adminCuratedSection').style.display = 'none';
            return;
        }
        
        grid.innerHTML = curated.map(item => 
            new MovieCard(item, { enhanced: true }).render()
        ).join('');
    }
    
    async loadPersonalizedContent() {
        const personalizedSection = document.getElementById('personalizedSection');
        personalizedSection.style.display = 'block';
        
        try {
            this.personalizedData = await api.getPersonalizedRecommendations();
            
            // Render personalized carousel
            const recommendations = this.personalizedData.hybrid_recommendations || [];
            const carousel = new Carousel(
                'personalizedCarousel',
                recommendations,
                (item) => new MovieCard(item, { size: 'medium' }).render()
            );
            carousel.render();
        } catch (error) {
            console.error('Failed to load personalized content:', error);
        }
    }
    
    setupScrollEffects() {
        const navbar = document.querySelector('.navbar');
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
    setupTabHandlers() {
        // Trending tabs
        document.querySelectorAll('.content-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.content-tabs .tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.renderTrendingSection();
            });
        });
        
        // Regional tabs
        document.querySelectorAll('.regional-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.regional-tabs .tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentRegion = tab.dataset.region;
                this.renderRegionalContent();
            });
        });
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MovieRecApp();
});

// Add movie card click handlers
document.addEventListener('click', (e) => {
    const movieCard = e.target.closest('.movie-card, .enhanced-movie-card');
    if (movieCard && !e.target.closest('button')) {
        const movieId = movieCard.dataset.movieId;
        movieActions.showDetails(movieId);
    }
});