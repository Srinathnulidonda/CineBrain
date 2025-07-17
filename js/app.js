// Main application logic
class MovieApp {
    constructor() {
        this.homepageData = null;
        this.currentRegion = 'Telugu';
        this.searchTimeout = null;
        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.loadHomepageData();
        this.initSearch();
        this.initNavigation();
    }

    initEventListeners() {
        // Auth buttons
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                authManager.logout();
            });
        }

        // User menu toggle
        const userMenuToggle = document.getElementById('userMenuToggle');
        const userDropdown = document.getElementById('userDropdown');

        if (userMenuToggle && userDropdown) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                userDropdown.classList.add('hidden');
            });
        }

        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // Mobile search
        const mobileSearchBtn = document.getElementById('mobileSearchBtn');
        const mobileSearch = document.getElementById('mobileSearch');

        if (mobileSearchBtn && mobileSearch) {
            mobileSearchBtn.addEventListener('click', () => {
                mobileSearch.classList.toggle('hidden');
                if (!mobileSearch.classList.contains('hidden')) {
                    const searchInput = mobileSearch.querySelector('input');
                    if (searchInput) searchInput.focus();
                }
            });
        }

        // Region tabs
        const regionTabs = document.querySelectorAll('.region-tab');
        regionTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchRegion(tab.getAttribute('data-region'));
            });
        });

        // Hero buttons
        const exploreBtn = document.getElementById('exploreBtn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => {
                document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' });
            });
        }

        // View All buttons
        const viewAllBtns = document.querySelectorAll('.view-all-btn');
        viewAllBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('.content-section');
                if (section) {
                    const carousel = section.querySelector('.content-carousel');
                    if (carousel) {
                        carousel.scrollTo({ left: carousel.scrollWidth, behavior: 'smooth' });
                    }
                }
            });
        });
    }

    async loadHomepageData() {
        try {
            UIComponents.showLoading('loadingSpinner', 'Loading amazing content...');
            
            const data = await apiService.getHomepage();
            this.homepageData = data;
            
            this.renderHomepageContent();
            
            // Hide loading spinner
            const loadingSpinner = document.getElementById('loadingSpinner');
            if (loadingSpinner) {
                loadingSpinner.classList.add('hidden');
            }
            
        } catch (error) {
            console.error('Failed to load homepage data:', error);
            UIComponents.showToast('Failed to load content. Please refresh the page.', 'error');
            
            // Hide loading spinner and show error
            const loadingSpinner = document.getElementById('loadingSpinner');
            if (loadingSpinner) {
                loadingSpinner.innerHTML = `
                    <div class="text-center py-12">
                        <svg class="w-16 h-16 text-text-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-white mb-2">Unable to load content</h3>
                        <p class="text-text-secondary mb-4">Please check your connection and try again.</p>
                        <button onclick="window.location.reload()" class="btn-primary">Retry</button>
                    </div>
                `;
            }
        }
    }

    renderHomepageContent() {
        if (!this.homepageData) return;

        const { trending, whats_hot, critics_choice, regional, user_favorites, admin_curated } = this.homepageData;

        // What's Hot
        if (whats_hot && whats_hot.length > 0) {
            UIComponents.createCarousel('whatsHotCarousel', whats_hot);
        }

        // Trending Movies
        if (trending?.movies && trending.movies.length > 0) {
            UIComponents.createCarousel('trendingMoviesCarousel', trending.movies);
        }

        // Trending TV Shows
        if (trending?.tv && trending.tv.length > 0) {
            UIComponents.createCarousel('trendingTVCarousel', trending.tv);
        }

        // Critics' Choice
        if (critics_choice && critics_choice.length > 0) {
            UIComponents.createCarousel('criticsChoiceCarousel', critics_choice);
        }

        // Regional Content
        if (regional && regional[this.currentRegion]) {
            UIComponents.createCarousel('regionalCarousel', regional[this.currentRegion]);
        }

        // User Favorites
        if (user_favorites && user_favorites.length > 0) {
            UIComponents.createCarousel('userFavoritesCarousel', user_favorites);
        }

        // Admin Curated
        if (admin_curated && admin_curated.length > 0) {
            UIComponents.createCarousel('adminCuratedCarousel', admin_curated, { 
                cardType: 'featured',
                showGenres: false 
            });
        }

        // Update hero section with featured content
        this.updateHeroSection();
    }

    updateHeroSection() {
        const heroSection = document.getElementById('heroSection');
        if (!heroSection || !this.homepageData?.whats_hot?.[0]) return;

        const featuredContent = this.homepageData.whats_hot[0];
        const backdropUrl = featuredContent.backdrop_path;

        if (backdropUrl) {
            heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${backdropUrl})`;
            heroSection.style.backgroundSize = 'cover';
            heroSection.style.backgroundPosition = 'center';
        }
    }

    switchRegion(region) {
        this.currentRegion = region;
        
        // Update tab states
        document.querySelectorAll('.region-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-region="${region}"]`)?.classList.add('active');
        
        // Update carousel content
        if (this.homepageData?.regional?.[region]) {
            UIComponents.createCarousel('regionalCarousel', this.homepageData.regional[region]);
        }
    }

    initSearch() {
        const searchInput = document.getElementById('searchInput');
        const mobileSearchInput = document.getElementById('mobileSearchInput');
        const searchResults = document.getElementById('searchResults');
        const mobileSearchResults = document.getElementById('mobileSearchResults');

        // Desktop search
        if (searchInput && searchResults) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value, searchResults);
            });

            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim()) {
                    searchResults.classList.remove('hidden');
                }
            });

            // Hide results when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    searchResults.classList.add('hidden');
                }
            });
        }

        // Mobile search
        if (mobileSearchInput && mobileSearchResults) {
            mobileSearchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value, mobileSearchResults);
            });
        }
    }

    async handleSearch(query, resultsContainer) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (!query.trim()) {
            resultsContainer.classList.add('hidden');
            return;
        }

        // Debounce search
        this.searchTimeout = setTimeout(async () => {
            try {
                resultsContainer.innerHTML = '<div class="p-4 text-center"><div class="spinner mx-auto"></div></div>';
                resultsContainer.classList.remove('hidden');

                const results = await apiService.searchContent(query);
                
                // Combine database and TMDB results
                const allResults = [
                    ...(results.database_results || []),
                    ...(results.tmdb_results || [])
                ];

                UIComponents.createSearchResults(allResults.slice(0, 10), resultsContainer);
                
            } catch (error) {
                console.error('Search error:', error);
                resultsContainer.innerHTML = '<div class="p-4 text-center text-red-400">Search failed. Please try again.</div>';
            }
        }, 300);
    }

    initNavigation() {
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Update navigation on scroll
        window.addEventListener('scroll', () => {
            this.updateNavigationOnScroll();
        });
    }

    updateNavigationOnScroll() {
        const nav = document.querySelector('nav');
        if (!nav) return;

        if (window.scrollY > 100) {
            nav.classList.add('bg-primary');
            nav.classList.remove('bg-primary/95');
        } else {
            nav.classList.remove('bg-primary');
            nav.classList.add('bg-primary/95');
        }
    }

    // Utility methods
    async refreshHomepage() {
        await this.loadHomepageData();
        UIComponents.showToast('Content refreshed!', 'success');
    }

    goToContentDetail(contentId) {
        window.location.href = `movie-detail.html?id=${contentId}`;
    }

    async loadPersonalizedContent() {
        if (!authManager.isLoggedIn) {
            window.location.href = 'login.html';
            return;
        }

        try {
            showLoader(true, 'Loading your personalized recommendations...');
            
            const recommendations = await apiService.getPersonalizedRecommendations();
            
            // Add personalized sections to homepage
            this.renderPersonalizedSections(recommendations);
            
            showLoader(false);
            UIComponents.showToast('Personalized content loaded!', 'success');
            
        } catch (error) {
            showLoader(false);
            console.error('Failed to load personalized content:', error);
            UIComponents.showToast('Failed to load personalized content', 'error');
        }
    }

    renderPersonalizedSections(recommendations) {
        // This would add personalized sections to the homepage
        // Implementation depends on specific UI requirements
        console.log('Personalized recommendations:', recommendations);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.movieApp = new MovieApp();
    
    // Initialize auth UI
    if (window.authManager) {
        authManager.updateUI();
    }

    // Check if we need to redirect authenticated users
    const isAuthPage = window.location.pathname.includes('login.html');
    if (isAuthPage && authManager.isLoggedIn) {
        window.location.href = 'dashboard.html';
    }
});

// Global functions for template usage
window.openContentModal = openContentModal;
window.handleInteraction = handleInteraction;

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    UIComponents.showToast('An unexpected error occurred', 'error');
});

// Online/Offline handling
window.addEventListener('online', () => {
    UIComponents.showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    UIComponents.showToast('You are offline. Some features may not work.', 'warning');
});