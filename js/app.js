// Main Application Logic
class MovieRecApp {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.carousels = new Map();
        this.searchCache = new Map();
        this.userInteractions = new Set();
        
        this.init();
    }
    
    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('dashboard.html')) return 'dashboard';
        if (path.includes('login.html')) return 'login';
        if (path.includes('movie-detail.html')) return 'movie-detail';
        if (path.includes('profile.html')) return 'profile';
        if (path.includes('admin/')) return 'admin';
        return 'home';
    }
    
    async init() {
        try {
            // Initialize based on current page
            switch (this.currentPage) {
                case 'home':
                    await this.initHomePage();
                    break;
                case 'dashboard':
                    await this.initDashboard();
                    break;
                case 'login':
                    this.initLoginPage();
                    break;
                case 'movie-detail':
                    await this.initMovieDetail();
                    break;
                case 'profile':
                    await this.initProfile();
                    break;
                case 'admin':
                    await this.initAdmin();
                    break;
            }
            
            // Setup global features
            this.setupGlobalFeatures();
            
        } catch (error) {
            console.error('App initialization error:', error);
            showToast('Failed to load application. Please refresh the page.', 'error');
        }
    }
    
    setupGlobalFeatures() {
        // Setup navigation
        this.setupNavigation();
        
        // Setup search
        this.setupGlobalSearch();
        
        // Setup user menu
        this.setupUserMenu();
        
        // Setup mobile menu
        this.setupMobileMenu();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup service worker for offline support
        this.setupServiceWorker();
    }
    
    setupNavigation() {
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Active navigation highlighting
        this.updateActiveNavigation();
        
        // Navbar background on scroll
        this.setupNavbarScroll();
    }
    
    setupNavbarScroll() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;
        
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', ui.throttle(() => {
            const currentScrollY = window.scrollY;
            
            // Add/remove background based on scroll position
            navbar.classList.toggle('scrolled', currentScrollY > 50);
            
            // Hide/show navbar based on scroll direction
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
        }, 100));
    }
    
    updateActiveNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('section[id]');
        
        window.addEventListener('scroll', ui.throttle(() => {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                
                if (window.scrollY >= sectionTop - 200) {
                    current = section.getAttribute('id');
                }
            });
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        }, 100));
    }
    
    setupGlobalSearch() {
        const searchInputs = document.querySelectorAll('#searchInput');
                searchInputs.forEach(input => {
            ui.setupSearch(input.id, 'searchResults', this.performSearch.bind(this));
        });
    }
    
    async performSearch(query) {
        // Check cache first
        if (this.searchCache.has(query)) {
            return this.searchCache.get(query);
        }
        
        try {
            const results = await api.searchContent(query);
            
            // Combine database and TMDB results
            const combinedResults = [
                ...results.database_results,
                ...results.tmdb_results.map(item => ({
                    ...item,
                    id: item.tmdb_id,
                    poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null
                }))
            ];
            
            // Cache results
            this.searchCache.set(query, combinedResults);
            
            return combinedResults;
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }
    
    setupUserMenu() {
        const userMenuContainer = document.getElementById('userMenuContainer');
        if (!userMenuContainer) return;
        
        // Update user display
        const user = getCurrentUser();
        if (user) {
            const usernameDisplay = document.getElementById('usernameDisplay');
            const welcomeUsername = document.getElementById('welcomeUsername');
            
            if (usernameDisplay) usernameDisplay.textContent = user.username;
            if (welcomeUsername) welcomeUsername.textContent = user.username;
        }
    }
    
    setupMobileMenu() {
        window.toggleMobileMenu = () => {
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.classList.toggle('hidden');
            }
        };
        
        window.toggleUserMenu = () => {
            const userMenu = document.getElementById('userMenu');
            if (userMenu) {
                userMenu.classList.toggle('hidden');
            }
        };
        
        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            const mobileMenu = document.getElementById('mobileMenu');
            const userMenu = document.getElementById('userMenu');
            
            if (mobileMenu && !e.target.closest('#mobileMenu') && !e.target.closest('[onclick*="toggleMobileMenu"]')) {
                mobileMenu.classList.add('hidden');
            }
            
            if (userMenu && !e.target.closest('#userMenuContainer')) {
                userMenu.classList.add('hidden');
            }
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('#searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Escape to close modals/menus
            if (e.key === 'Escape') {
                const mobileMenu = document.getElementById('mobileMenu');
                const userMenu = document.getElementById('userMenu');
                
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
                
                if (userMenu && !userMenu.classList.contains('hidden')) {
                    userMenu.classList.add('hidden');
                }
            }
        });
    }
    
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }
    
    // Home Page Initialization
    async initHomePage() {
        try {
            showLoading(true);
            
            // Load homepage data
            const data = await api.getHomepage();
            
            // Render sections
            this.renderTrendingSection(data.trending);
            this.renderWhatsHotSection(data.whats_hot);
            this.renderCriticsChoiceSection(data.critics_choice);
            this.renderRegionalSection(data.regional);
            this.renderUserFavorites(data.user_favorites);
            this.renderAdminCurated(data.admin_curated);
            
            // Setup category tabs
            this.setupCategoryTabs();
            this.setupLanguageTabs();
            
            // Setup hero background
            this.setupHeroBackground(data.trending.movies[0]);
            
        } catch (error) {
            console.error('Homepage initialization error:', error);
            this.showErrorState('Failed to load content. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    renderTrendingSection(trending) {
        const track = document.getElementById('trendingTrack');
        if (!track) return;
        
        // Start with movies
        this.renderContentCarousel(track, trending.movies);
        
        // Setup category switching
        this.currentTrendingData = trending;
    }
    
    setupCategoryTabs() {
        const tabs = document.querySelectorAll('.category-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update content
                const category = tab.dataset.category;
                const track = document.getElementById('trendingTrack');
                
                if (track && this.currentTrendingData) {
                    this.renderContentCarousel(track, this.currentTrendingData[category] || []);
                }
            });
        });
    }
    
    setupLanguageTabs() {
        const tabs = document.querySelectorAll('.language-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update content
                const language = tab.dataset.language;
                const container = document.getElementById('regionalContent');
                
                if (container && this.currentRegionalData) {
                    this.renderContentGrid(container, this.currentRegionalData[language] || []);
                }
            });
        });
    }
    
    renderContentCarousel(container, content) {
        container.innerHTML = '';
        
        content.forEach(item => {
            const card = createMovieCard(item, { lazy: true });
            container.appendChild(card);
        });
        
        // Initialize carousel
        const carouselId = container.closest('[id]')?.id.replace('Track', '');
        if (carouselId) {
            ui.initializeCarousel(`${carouselId}Carousel`);
        }
    }
    
    renderContentGrid(container, content) {
        container.innerHTML = '';
        
        if (content.length === 0) {
            container.appendChild(ui.createEmptyState(
                'No content available',
                'Check back later for new additions'
            ));
            return;
        }
        
        content.forEach(item => {
            const card = createMovieCard(item, { lazy: true });
            container.appendChild(card);
        });
    }
    
    renderWhatsHotSection(content) {
        const container = document.getElementById('whatsHotGrid');
        if (container) {
            this.renderContentGrid(container, content);
        }
    }
    
    renderCriticsChoiceSection(content) {
        const track = document.getElementById('criticsTrack');
        if (track) {
            this.renderContentCarousel(track, content);
        }
    }
    
    renderRegionalSection(regional) {
        const container = document.getElementById('regionalContent');
        if (container) {
            // Start with Telugu content
            this.renderContentGrid(container, regional.Telugu || []);
            this.currentRegionalData = regional;
        }
    }
    
    renderUserFavorites(favorites) {
        // This would be rendered in a dedicated section if needed
        console.log('User favorites:', favorites);
    }
    
    renderAdminCurated(curated) {
        // This could be integrated into existing sections or have its own
        console.log('Admin curated:', curated);
    }
    
    setupHeroBackground(featuredMovie) {
        const heroBackground = document.querySelector('.hero-background');
        if (heroBackground && featuredMovie?.backdrop_path) {
            const imageUrl = `https://image.tmdb.org/t/p/w1280${featuredMovie.backdrop_path}`;
            heroBackground.style.backgroundImage = `
                linear-gradient(45deg, rgba(220, 38, 38, 0.1) 0%, rgba(0, 0, 0, 0.8) 50%, rgba(220, 38, 38, 0.1) 100%),
                url('${imageUrl}')
            `;
        }
    }
    
    // Dashboard Initialization
    async initDashboard() {
        if (!requireAuth()) return;
        
        try {
            showLoading(true);
            
            // Load personalized data
            const [recommendations, userStats] = await Promise.all([
                api.getPersonalizedRecommendations(),
                this.getUserStats()
            ]);
            
            // Update user stats
            this.updateUserStats(userStats);
            
            // Render recommendation sections
            this.renderContinueWatching(recommendations.watch_history_based);
            this.renderPersonalizedRecommendations(recommendations);
            this.renderWatchlist();
            this.renderWatchHistory();
            
            // Setup preference tuner
            this.setupPreferenceTuner();
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showErrorState('Failed to load your dashboard. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    async getUserStats() {
        // This would come from the API in a real implementation
        return {
            watched: 42,
            watchlist: 15,
            favorites: 28
        };
    }
    
    updateUserStats(stats) {
        const watchedCount = document.getElementById('watchedCount');
        const watchlistCount = document.getElementById('watchlistCount');
        const favoritesCount = document.getElementById('favoritesCount');
        
        if (watchedCount) watchedCount.textContent = stats.watched;
        if (watchlistCount) watchlistCount.textContent = stats.watchlist;
        if (favoritesCount) favoritesCount.textContent = stats.favorites;
    }
    
    renderContinueWatching(content) {
        const track = document.getElementById('continueWatchingTrack');
        if (track) {
            this.renderContentCarousel(track, content);
        }
    }
    
    renderPersonalizedRecommendations(recommendations) {
        const sections = [
            { id: 'hybridRecommendations', data: recommendations.hybrid_recommendations },
            { id: 'recentActivityRecs', data: recommendations.watch_history_based },
            { id: 'genreBasedRecs', data: recommendations.favorites_based }
        ];
        
        sections.forEach(section => {
            const container = document.getElementById(section.id);
            if (container) {
                this.renderContentGrid(container, section.data);
            }
        });
    }
    
    renderWatchlist() {
        // Load watchlist from local storage or API
        const watchlist = ui.loadFromStorage('watchlist', []);
        const container = document.getElementById('watchlistGrid');
        
        if (container) {
            if (watchlist.length === 0) {
                container.appendChild(ui.createEmptyState(
                    'Your watchlist is empty',
                    'Add movies and shows you want to watch later',
                    'Browse Content',
                    () => window.location.href = 'index.html#trending'
                ));
            } else {
                this.renderContentGrid(container, watchlist);
            }
        }
    }
    
    renderWatchHistory() {
        // Load watch history from local storage or API
        const history = ui.loadFromStorage('watchHistory', []);
        const container = document.getElementById('historyGrid');
        
        if (container) {
            if (history.length === 0) {
                container.appendChild(ui.createEmptyState(
                    'No watch history yet',
                    'Start watching content to see your history here'
                ));
            } else {
                this.renderContentGrid(container, history.slice(0, 12));
            }
        }
    }
    
    setupPreferenceTuner() {
        window.openPreferenceTuner = () => {
            openModal('preferenceTunerModal');
            this.loadUserPreferences();
        };
        
        window.closePreferenceTuner = () => {
            closeModal('preferenceTunerModal');
        };
        
        window.savePreferences = () => {
            this.saveUserPreferences();
        };
    }
    
    loadUserPreferences() {
        const preferences = ui.loadFromStorage('userPreferences', {
            genres: [],
            contentTypes: [],
            languages: []
        });
        
        // Load genre preferences
        const genreContainer = document.getElementById('genrePreferences');
        if (genreContainer) {
            const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Animation'];
            genreContainer.innerHTML = genres.map(genre => `
                <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" 
                           class="form-checkbox text-red-600" 
                           value="${genre}"
                           ${preferences.genres.includes(genre) ? 'checked' : ''}>
                    <span>${genre}</span>
                </label>
            `).join('');
        }
        
        // Load other preferences
        ['prefMovies', 'prefTVShows', 'prefAnime', 'prefDocumentaries'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = preferences.contentTypes.includes(id.replace('pref', ''));
            }
        });
        
        ['langEnglish', 'langHindi', 'langTelugu', 'langTamil'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = preferences.languages.includes(id.replace('lang', ''));
            }
        });
    }
    
    saveUserPreferences() {
        const preferences = {
            genres: [],
            contentTypes: [],
            languages: []
        };
        
        // Collect genre preferences
        document.querySelectorAll('#genrePreferences input:checked').forEach(input => {
            preferences.genres.push(input.value);
        });
        
        // Collect content type preferences
        ['prefMovies', 'prefTVShows', 'prefAnime', 'prefDocumentaries'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox?.checked) {
                preferences.contentTypes.push(id.replace('pref', ''));
            }
        });
        
        // Collect language preferences
        ['langEnglish', 'langHindi', 'langTelugu', 'langTamil'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox?.checked) {
                preferences.languages.push(id.replace('lang', ''));
            }
        });
        
        // Save preferences
        ui.saveToStorage('userPreferences', preferences);
        
                // Close modal and show success message
        closeModal('preferenceTunerModal');
        showToast('Preferences saved! Your recommendations will be updated.', 'success');
        
        // Refresh recommendations
        setTimeout(() => {
            this.refreshRecommendations();
        }, 1000);
    }
    
    async refreshRecommendations() {
        try {
            showLoading(true);
            const recommendations = await api.getPersonalizedRecommendations();
            this.renderPersonalizedRecommendations(recommendations);
            showToast('Recommendations updated!', 'success');
        } catch (error) {
            console.error('Failed to refresh recommendations:', error);
            showToast('Failed to update recommendations', 'error');
        } finally {
            showLoading(false);
        }
    }
    
    // Movie Detail Page Initialization
    async initMovieDetail() {
        const urlParams = new URLSearchParams(window.location.search);
        const movieId = urlParams.get('id');
        
        if (!movieId) {
            this.showErrorState('Movie not found');
            return;
        }
        
        try {
            showLoading(true);
            
            // Load movie details
            const movieData = await api.getContentDetails(movieId);
            
            // Render movie details
            this.renderMovieHero(movieData.content, movieData.tmdb_details);
            this.renderMovieVideos(movieData.youtube_videos);
            this.renderMovieCast(movieData.tmdb_details.credits);
            this.renderMovieReviews(movieData.user_reviews);
            this.renderSimilarMovies(movieData.similar_content);
            this.renderMovieDetails(movieData.tmdb_details);
            
            // Setup interactions
            this.setupMovieInteractions(movieData.content);
            
            // Record view interaction
            this.recordInteraction(movieId, 'view');
            
        } catch (error) {
            console.error('Movie detail initialization error:', error);
            this.showErrorState('Failed to load movie details. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    renderMovieHero(content, details) {
        // Update hero background
        const heroBackground = document.getElementById('heroBackground');
        if (heroBackground && content.backdrop_path) {
            heroBackground.style.backgroundImage = `url('${content.backdrop_path}')`;
        }
        
        // Update movie info
        document.getElementById('movieTitle').textContent = content.title;
        document.getElementById('moviePoster').src = content.poster_path || '/api/placeholder/400/600';
        document.getElementById('movieOverview').textContent = content.overview || 'No overview available';
        
        // Update meta info
        if (content.release_date) {
            document.getElementById('movieYear').textContent = new Date(content.release_date).getFullYear();
        }
        
        if (content.runtime) {
            document.getElementById('movieRuntime').textContent = `${content.runtime} min`;
        }
        
        if (content.rating) {
            const ratingElement = document.getElementById('movieRating');
            ratingElement.querySelector('span').textContent = content.rating.toFixed(1);
        }
        
        // Update genres
        const genresContainer = document.getElementById('movieGenres');
        if (genresContainer && content.genre_names) {
            genresContainer.innerHTML = content.genre_names.map(genre => 
                `<span class="bg-red-600 text-white px-3 py-1 rounded-full text-sm">${genre}</span>`
            ).join('');
        }
        
        // Update tagline
        if (details?.tagline) {
            document.getElementById('movieTagline').textContent = details.tagline;
        }
    }
    
    renderMovieVideos(videos) {
        const container = document.getElementById('videosGrid');
        if (!container || !videos) return;
        
        const allVideos = [...(videos.trailers || []), ...(videos.teasers || [])];
        
        if (allVideos.length === 0) {
            container.appendChild(ui.createEmptyState(
                'No videos available',
                'Check back later for trailers and teasers'
            ));
            return;
        }
        
        container.innerHTML = '';
        allVideos.forEach(video => {
            const videoCard = createVideoCard(video);
            container.appendChild(videoCard);
        });
    }
    
    renderMovieCast(credits) {
        const track = document.getElementById('castTrack');
        if (!track || !credits?.cast) return;
        
        track.innerHTML = '';
        credits.cast.slice(0, 20).forEach(person => {
            const castCard = createCastCard(person);
            track.appendChild(castCard);
        });
        
        ui.initializeCarousel('castCarousel');
    }
    
    renderMovieReviews(reviews) {
        const container = document.getElementById('reviewsList');
        const averageRating = document.getElementById('averageRating');
        const reviewCount = document.getElementById('reviewCount');
        const ratingStars = document.getElementById('ratingStars');
        const ratingBreakdown = document.getElementById('ratingBreakdown');
        
        if (!container) return;
        
        if (!reviews || reviews.length === 0) {
            container.appendChild(ui.createEmptyState(
                'No reviews yet',
                'Be the first to review this movie!',
                'Write Review',
                () => openModal('reviewModal')
            ));
            
            if (averageRating) averageRating.textContent = '0.0';
            if (reviewCount) reviewCount.textContent = '0';
            return;
        }
        
        // Calculate average rating
        const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        
        // Update rating display
        if (averageRating) averageRating.textContent = avgRating.toFixed(1);
        if (reviewCount) reviewCount.textContent = reviews.length;
        if (ratingStars) ratingStars.innerHTML = ui.createStarRating(Math.round(avgRating), false);
        
        // Update rating breakdown
        if (ratingBreakdown) {
            const breakdown = [5, 4, 3, 2, 1].map(rating => {
                const count = reviews.filter(r => Math.round(r.rating) === rating).length;
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                
                return `
                    <div class="rating-breakdown-item">
                        <div class="rating-breakdown-stars">${'★'.repeat(rating)}</div>
                        <div class="rating-breakdown-bar">
                            <div class="rating-breakdown-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="rating-breakdown-count">${count}</div>
                    </div>
                `;
            }).join('');
            
            ratingBreakdown.innerHTML = breakdown;
        }
        
        // Render reviews
        container.innerHTML = '';
        reviews.forEach(review => {
            const reviewCard = createReviewCard(review);
            container.appendChild(reviewCard);
        });
    }
    
    renderSimilarMovies(similar) {
        const container = document.getElementById('similarGrid');
        if (container) {
            this.renderContentGrid(container, similar);
        }
    }
    
    renderMovieDetails(details) {
        if (!details) return;
        
        const detailMappings = {
            'movieDirector': details.credits?.crew?.find(person => person.job === 'Director')?.name || 'Unknown',
            'movieWriters': details.credits?.crew?.filter(person => person.job === 'Writer').map(p => p.name).join(', ') || 'Unknown',
            'movieProduction': details.production_companies?.map(c => c.name).join(', ') || 'Unknown',
            'movieBudget': details.budget ? `$${(details.budget / 1000000).toFixed(1)}M` : 'Unknown',
            'movieReleaseDate': details.release_date || 'Unknown',
            'movieLanguage': details.original_language?.toUpperCase() || 'Unknown',
            'movieCountry': details.production_countries?.map(c => c.name).join(', ') || 'Unknown',
            'movieBoxOffice': details.revenue ? `$${(details.revenue / 1000000).toFixed(1)}M` : 'Unknown'
        };
        
        Object.entries(detailMappings).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
    
    setupMovieInteractions(content) {
        // Setup review modal
        this.setupReviewModal(content.id);
        
        // Setup action buttons
        this.setupActionButtons(content.id);
        
        // Check user's existing interactions
        this.loadUserInteractions(content.id);
    }
    
    setupReviewModal(contentId) {
        window.openReviewModal = () => {
            if (!isAuthenticated()) {
                showToast('Please log in to write a review', 'info');
                return;
            }
            openModal('reviewModal');
        };
        
        window.closeReviewModal = () => {
            closeModal('reviewModal');
        };
        
        window.submitReview = async (event) => {
            event.preventDefault();
            
            const rating = document.querySelector('.rating-star.active:last-child')?.dataset.rating;
            const reviewText = document.getElementById('reviewText').value;
            
            if (!rating) {
                showToast('Please select a rating', 'error');
                return;
            }
            
            try {
                await this.recordInteraction(contentId, 'review', {
                    rating: parseInt(rating),
                    review_text: reviewText
                });
                
                closeModal('reviewModal');
                showToast('Review submitted successfully!', 'success');
                
                // Refresh reviews
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } catch (error) {
                showToast('Failed to submit review', 'error');
            }
        };
        
        // Setup rating stars
        document.querySelectorAll('#reviewRatingStars .rating-star').forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                document.querySelectorAll('#reviewRatingStars .rating-star').forEach((s, index) => {
                    s.classList.toggle('active', index < rating);
                });
            });
        });
    }
    
    setupActionButtons(contentId) {
        window.toggleWatchlist = async () => {
            if (!isAuthenticated()) {
                showToast('Please log in to use watchlist', 'info');
                return;
            }
            
            try {
                await this.recordInteraction(contentId, 'wishlist');
                const button = document.getElementById('watchlistButton');
                const icon = button.querySelector('i');
                
                if (icon.classList.contains('fa-plus')) {
                    icon.classList.replace('fa-plus', 'fa-check');
                    button.querySelector('span').textContent = 'In Watchlist';
                    showToast('Added to watchlist', 'success');
                } else {
                    icon.classList.replace('fa-check', 'fa-plus');
                    button.querySelector('span').textContent = 'Add to Watchlist';
                    showToast('Removed from watchlist', 'info');
                }
            } catch (error) {
                showToast('Failed to update watchlist', 'error');
            }
        };
        
        window.toggleFavorite = async () => {
            if (!isAuthenticated()) {
                showToast('Please log in to use favorites', 'info');
                return;
            }
            
            try {
                await this.recordInteraction(contentId, 'favorite');
                const button = document.getElementById('favoriteButton');
                const icon = button.querySelector('i');
                
                if (icon.classList.contains('far')) {
                    icon.classList.replace('far', 'fas');
                    icon.classList.add('text-red-500');
                    showToast('Added to favorites', 'success');
                } else {
                    icon.classList.replace('fas', 'far');
                    icon.classList.remove('text-red-500');
                    showToast('Removed from favorites', 'info');
                }
            } catch (error) {
                showToast('Failed to update favorites', 'error');
            }
        };
        
        window.shareMovie = () => {
            if (navigator.share) {
                navigator.share({
                    title: document.getElementById('movieTitle').textContent,
                    text: document.getElementById('movieOverview').textContent,
                    url: window.location.href
                });
            } else {
                // Fallback to clipboard
                navigator.clipboard.writeText(window.location.href);
                showToast('Link copied to clipboard', 'success');
            }
        };
    }
    
    loadUserInteractions(contentId) {
        // Load from local storage or API
        const interactions = ui.loadFromStorage('userInteractions', {});
        const userInteractions = interactions[contentId] || {};
        
        // Update button states
        if (userInteractions.wishlist) {
            const button = document.getElementById('watchlistButton');
            const icon = button.querySelector('i');
            icon.classList.replace('fa-plus', 'fa-check');
            button.querySelector('span').textContent = 'In Watchlist';
        }
        
        if (userInteractions.favorite) {
            const button = document.getElementById('favoriteButton');
            const icon = button.querySelector('i');
            icon.classList.replace('far', 'fas');
            icon.classList.add('text-red-500');
        }
    }
    
    // User Interaction Recording
    async recordInteraction(contentId, type, data = {}) {
        if (!isAuthenticated()) return;
        
        try {
            await api.recordInteraction({
                content_id: contentId,
                interaction_type: type,
                ...data
            });
            
            // Update local storage
            const interactions = ui.loadFromStorage('userInteractions', {});
            if (!interactions[contentId]) interactions[contentId] = {};
            interactions[contentId][type] = true;
            ui.saveToStorage('userInteractions', interactions);
            
            // Update local lists
            if (type === 'wishlist') {
                this.updateLocalWatchlist(contentId);
            } else if (type === 'view') {
                this.updateLocalHistory(contentId);
            }
            
        } catch (error) {
            console.error('Failed to record interaction:', error);
            throw error;
        }
    }
    
    updateLocalWatchlist(contentId) {
        const watchlist = ui.loadFromStorage('watchlist', []);
        const exists = watchlist.find(item => item.id === contentId);
        
        if (!exists) {
            // Add to watchlist (would need to fetch content details)
            // For now, just store the ID
            watchlist.push({ id: contentId, added_at: new Date().toISOString() });
            ui.saveToStorage('watchlist', watchlist);
        } else {
            // Remove from watchlist
            const filtered = watchlist.filter(item => item.id !== contentId);
            ui.saveToStorage('watchlist', filtered);
        }
    }
    
    updateLocalHistory(contentId) {
        const history = ui.loadFromStorage('watchHistory', []);
        
        // Remove if already exists
        const filtered = history.filter(item => item.id !== contentId);
        
        // Add to beginning
                filtered.unshift({ id: contentId, watched_at: new Date().toISOString() });
        
        // Keep only last 50 items
        const trimmed = filtered.slice(0, 50);
        ui.saveToStorage('watchHistory', trimmed);
    }
    
    // Login Page Initialization
    initLoginPage() {
        // Check if already authenticated
        if (isAuthenticated()) {
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Setup form validation
        this.setupFormValidation();
        
        // Setup social login buttons (placeholder)
        this.setupSocialLogin();
        
        // Setup auth background animation
        this.setupAuthBackground();
    }
    
    setupFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const validation = ui.validateForm(form);
                
                if (!validation.isValid) {
                    e.preventDefault();
                    showToast(validation.errors[0], 'error');
                }
            });
            
            // Real-time validation
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    this.validateInput(input);
                });
                
                input.addEventListener('input', () => {
                    if (input.classList.contains('error')) {
                        this.validateInput(input);
                    }
                });
            });
        });
    }
    
    validateInput(input) {
        let isValid = true;
        let message = '';
        
        if (input.hasAttribute('required') && !input.value.trim()) {
            isValid = false;
            message = `${input.name || input.id} is required`;
        } else if (input.type === 'email' && input.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value)) {
                isValid = false;
                message = 'Please enter a valid email address';
            }
        } else if (input.type === 'password' && input.value && input.value.length < 6) {
            isValid = false;
            message = 'Password must be at least 6 characters long';
        }
        
        input.classList.toggle('error', !isValid);
        
        // Show/hide error message
        let errorElement = input.parentNode.querySelector('.error-message');
        if (!isValid && message) {
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.className = 'error-message text-red-400 text-sm mt-1';
                input.parentNode.appendChild(errorElement);
            }
            errorElement.textContent = message;
        } else if (errorElement) {
            errorElement.remove();
        }
        
        return isValid;
    }
    
    setupSocialLogin() {
        // Placeholder for social login implementation
        const socialButtons = document.querySelectorAll('[onclick*="loginWith"]');
        socialButtons.forEach(button => {
            button.addEventListener('click', () => {
                showToast('Social login coming soon!', 'info');
            });
        });
    }
    
    setupAuthBackground() {
        // Add floating particles effect
        this.createFloatingParticles();
    }
    
    createFloatingParticles() {
        const background = document.querySelector('.auth-background');
        if (!background) return;
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'floating-particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: rgba(220, 38, 38, ${Math.random() * 0.5 + 0.2});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${Math.random() * 10 + 10}s infinite linear;
                pointer-events: none;
            `;
            background.appendChild(particle);
        }
        
        // Add CSS animation
        if (!document.getElementById('particleStyles')) {
            const style = document.createElement('style');
            style.id = 'particleStyles';
            style.textContent = `
                @keyframes float {
                    0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Profile Page Initialization
    async initProfile() {
        if (!requireAuth()) return;
        
        try {
            showLoading(true);
            
            // Load user profile data
            const user = getCurrentUser();
            const userStats = await this.getUserStats();
            const preferences = ui.loadFromStorage('userPreferences', {});
            
            // Render profile sections
            this.renderProfileInfo(user);
            this.renderProfileStats(userStats);
            this.renderProfilePreferences(preferences);
            this.renderProfileActivity();
            
            // Setup profile editing
            this.setupProfileEditing();
            
        } catch (error) {
            console.error('Profile initialization error:', error);
            this.showErrorState('Failed to load profile. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    renderProfileInfo(user) {
        // Update profile display elements
        const elements = {
            'profileUsername': user.username,
            'profileEmail': user.email,
            'profileJoinDate': user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
    
    renderProfileStats(stats) {
        // Create stats visualization
        const statsContainer = document.getElementById('profileStats');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="stat-card bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-red-400">${stats.watched}</div>
                    <div class="text-sm text-gray-400">Watched</div>
                </div>
                <div class="stat-card bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-blue-400">${stats.watchlist}</div>
                    <div class="text-sm text-gray-400">Watchlist</div>
                </div>
                <div class="stat-card bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-400">${stats.favorites}</div>
                    <div class="text-sm text-gray-400">Favorites</div>
                </div>
                <div class="stat-card bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-yellow-400">${stats.reviews || 0}</div>
                    <div class="text-sm text-gray-400">Reviews</div>
                </div>
            </div>
        `;
    }
    
    renderProfilePreferences(preferences) {
        const container = document.getElementById('profilePreferences');
        if (!container) return;
        
        container.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h4 class="font-semibold mb-2">Favorite Genres</h4>
                    <div class="flex flex-wrap gap-2">
                        ${(preferences.genres || []).map(genre => 
                            `<span class="bg-red-600 text-white px-3 py-1 rounded-full text-sm">${genre}</span>`
                        ).join('') || '<span class="text-gray-400">No preferences set</span>'}
                    </div>
                </div>
                <div>
                    <h4 class="font-semibold mb-2">Content Types</h4>
                    <div class="flex flex-wrap gap-2">
                        ${(preferences.contentTypes || []).map(type => 
                            `<span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">${type}</span>`
                        ).join('') || '<span class="text-gray-400">No preferences set</span>'}
                    </div>
                </div>
                <div>
                    <h4 class="font-semibold mb-2">Languages</h4>
                    <div class="flex flex-wrap gap-2">
                        ${(preferences.languages || []).map(lang => 
                            `<span class="bg-green-600 text-white px-3 py-1 rounded-full text-sm">${lang}</span>`
                        ).join('') || '<span class="text-gray-400">No preferences set</span>'}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderProfileActivity() {
        const container = document.getElementById('profileActivity');
        if (!container) return;
        
        const recentActivity = ui.loadFromStorage('watchHistory', []).slice(0, 5);
        
        if (recentActivity.length === 0) {
            container.appendChild(ui.createEmptyState(
                'No recent activity',
                'Start watching content to see your activity here'
            ));
            return;
        }
        
        container.innerHTML = `
            <div class="space-y-3">
                ${recentActivity.map(item => `
                    <div class="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                        <div class="w-12 h-16 bg-gray-700 rounded flex-shrink-0"></div>
                        <div class="flex-1">
                            <h5 class="font-medium">Movie Title</h5>
                            <p class="text-sm text-gray-400">Watched ${new Date(item.watched_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    setupProfileEditing() {
        window.editProfile = () => {
            openModal('editProfileModal');
        };
        
        window.saveProfile = async () => {
            // Implementation for saving profile changes
            showToast('Profile updated successfully!', 'success');
            closeModal('editProfileModal');
        };
        
        window.changePassword = () => {
            openModal('changePasswordModal');
        };
    }
    
    // Admin Initialization
    async initAdmin() {
        if (!requireAdmin()) return;
        
        // Admin initialization would go here
        console.log('Admin panel initialized');
    }
    
    // Utility Methods
    showErrorState(message) {
        const mainContent = document.querySelector('main') || document.body;
        mainContent.innerHTML = '';
        mainContent.appendChild(ui.createErrorState(
            message,
            'Go Home',
            () => window.location.href = 'index.html'
        ));
    }
    
    // Global utility functions
    setupGlobalUtilities() {
        // Back button functionality
        window.goBack = () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        };
        
        // Scroll to section
        window.scrollToSection = (sectionId) => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        };
        
        // Auth modal functions
        window.openAuthModal = (type = 'login') => {
            const modal = document.getElementById('authModal');
            const content = document.getElementById('authContent');
            
            if (modal && content) {
                content.innerHTML = this.getAuthModalContent(type);
                openModal('authModal');
            }
        };
        
        window.closeAuthModal = () => {
            closeModal('authModal');
        };
        
        // Quick actions
        window.exploreGenres = () => {
            window.location.href = 'index.html#genres';
        };
        
        window.viewStats = () => {
            showToast('Detailed stats coming soon!', 'info');
        };
        
        window.clearWatchlist = () => {
            if (confirm('Are you sure you want to clear your entire watchlist?')) {
                ui.removeFromStorage('watchlist');
                showToast('Watchlist cleared', 'success');
                setTimeout(() => window.location.reload(), 1000);
            }
        };
    }
    
    getAuthModalContent(type) {
        if (type === 'register') {
            return `
                <h3 class="text-2xl font-bold mb-6">Create Account</h3>
                <form onsubmit="handleRegister(event)">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Username</label>
                        <input type="text" name="username" required
                               class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                               placeholder="Choose a username">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Email</label>
                        <input type="email" name="email" required
                               class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                               placeholder="Enter your email">
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2">Password</label>
                        <input type="password" name="password" required minlength="6"
                               class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                               placeholder="Create a password">
                    </div>
                    <button type="submit" class="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-medium transition-all">
                        Create Account
                    </button>
                </form>
                <div class="text-center mt-4">
                    <button onclick="openAuthModal('login')" class="text-red-400 hover:text-red-300">
                        Already have an account? Sign In
                    </button>
                </div>
            `;
        } else {
            return `
                <h3 class="text-2xl font-bold mb-6">Sign In</h3>
                <form onsubmit="handleLogin(event)">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Email or Username</label>
                        <input type="text" name="username" required
                                                              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                               placeholder="Enter your email or username">
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2">Password</label>
                        <input type="password" name="password" required
                               class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                               placeholder="Enter your password">
                    </div>
                    <button type="submit" class="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-medium transition-all">
                        Sign In
                    </button>
                </form>
                <div class="text-center mt-4">
                    <button onclick="openAuthModal('register')" class="text-red-400 hover:text-red-300">
                        Don't have an account? Create one
                    </button>
                </div>
            `;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.movieRecApp = new MovieRecApp();
    
    // Setup global utilities
    window.movieRecApp.setupGlobalUtilities();
    
    // Performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`Page loaded in ${loadTime}ms`);
            
            // Report to analytics if needed
            if (loadTime > 3000) {
                console.warn('Slow page load detected');
            }
        });
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MovieRecApp;
}