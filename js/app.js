// Main Application Logic

// Page-specific initialization
function initializeHomepage() {
    loadHomepageContent();
    initializeHeroSection();
}

function initializeDashboard() {
    if (!userManager.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadDashboardContent();
    initializePreferenceTuning();
}

function initializeMovieDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    
    if (movieId) {
        loadMovieDetails(movieId);
    } else {
        window.location.href = 'index.html';
    }
}

function initializeAuth() {
    if (userManager.isLoggedIn()) {
        window.location.href = 'dashboard.html';
        return;
    }
        initializeAuthForms();
}

// Homepage Content Loading
async function loadHomepageContent() {
    try {
        UIComponents.showLoading();
        
        const data = await apiService.getHomepage();
        
        // Load trending content
        if (data.trending) {
            populateTrendingSection(data.trending);
        }
        
        // Load what's hot
        if (data.whats_hot) {
            carouselManager.populateCarousel('hot-track', data.whats_hot, UIComponents.createMovieCard);
        }
        
        // Load critics' choice
        if (data.critics_choice) {
            carouselManager.populateCarousel('critics-track', data.critics_choice, UIComponents.createMovieCard);
        }
        
        // Load regional content
        if (data.regional) {
            populateRegionalContent(data.regional);
        }
        
        // Load admin curated content
        if (data.admin_curated) {
            populateCuratedContent(data.admin_curated);
        }
        
    } catch (error) {
        handleError(error, 'Loading homepage content');
        showHomepageError();
    } finally {
        UIComponents.hideLoading();
    }
}

function populateTrendingSection(trending) {
    // Initialize with movies by default
    let currentTrendingData = trending.movies || [];
    carouselManager.populateCarousel('trending-track', currentTrendingData, UIComponents.createMovieCard);
    
    // Store trending data for tab switching
    window.trendingData = trending;
}

function populateRegionalContent(regional) {
    // Initialize with Telugu content by default
    let currentRegionalData = regional.Telugu || [];
    carouselManager.populateCarousel('regional-track', currentRegionalData, UIComponents.createMovieCard);
    
    // Store regional data for tab switching
    window.regionalData = regional;
}

function populateCuratedContent(curatedContent) {
    const container = document.getElementById('curated-content');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (curatedContent.length === 0) {
        const emptyState = UIComponents.createEmptyState(
            'No Staff Picks Available',
            'Check back later for curated recommendations from our team.'
        );
        container.appendChild(emptyState);
        return;
    }
    
    curatedContent.forEach(item => {
        const card = UIComponents.createCuratedCard(item);
        container.appendChild(card);
    });
}

function showHomepageError() {
    const main = document.querySelector('main') || document.body;
    const errorState = UIComponents.createErrorState(
        'Failed to Load Content',
        'We\'re having trouble loading the homepage. Please check your connection and try again.',
        'Reload Page',
        'location.reload()'
    );
    main.appendChild(errorState);
}

// Dashboard Content Loading
async function loadDashboardContent() {
    try {
        UIComponents.showLoading();
        
        // Load personalized recommendations
        const recommendations = await apiService.getPersonalizedRecommendations();
        
        // Populate continue watching
        if (recommendations.watch_history_based) {
            populateContinueWatching(recommendations.watch_history_based);
        }
        
        // Populate recommendation sections
        if (recommendations.hybrid_recommendations) {
            carouselManager.populateCarousel('recommended-track', recommendations.hybrid_recommendations, UIComponents.createMovieCard);
        }
        
        if (recommendations.favorites_based) {
            carouselManager.populateCarousel('recent-activity-track', recommendations.favorites_based, UIComponents.createMovieCard);
        }
        
        if (recommendations.collaborative_filtering) {
            carouselManager.populateCarousel('similar-track', recommendations.collaborative_filtering, UIComponents.createMovieCard);
        }
        
        if (recommendations.regional_suggestions) {
            carouselManager.populateCarousel('recently-added-track', recommendations.regional_suggestions, UIComponents.createMovieCard);
        }
        
        // Populate genre-based recommendations
        if (recommendations.favorites_based) {
            populateGenreRecommendations(recommendations.favorites_based);
        }
        
        // Load user stats
        await loadUserStats();
        
    } catch (error) {
        handleError(error, 'Loading dashboard content');
        showDashboardError();
    } finally {
        UIComponents.hideLoading();
    }
}

function populateContinueWatching(watchHistory) {
    const container = document.getElementById('continue-watching');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (watchHistory.length === 0) {
        const emptyState = UIComponents.createEmptyState(
            'No Recent Activity',
            'Start watching movies and TV shows to see your progress here.',
            'Browse Content',
            'window.location.href = "index.html"'
        );
        container.appendChild(emptyState);
        return;
    }
    
    // Create continue watching cards (limit to 6)
    watchHistory.slice(0, 6).forEach(item => {
        const card = UIComponents.createContinueWatchingCard(item);
        container.appendChild(card);
    });
}

function populateGenreRecommendations(recommendations) {
    const container = document.getElementById('genre-recommendations');
    if (!container) return;
    
    // Group recommendations by genre
    const genreGroups = {};
    recommendations.forEach(item => {
        if (item.genre_names) {
            item.genre_names.forEach(genre => {
                if (!genreGroups[genre]) {
                    genreGroups[genre] = [];
                }
                genreGroups[genre].push(item);
            });
        }
    });
    
    container.innerHTML = '';
    
    // Create sections for each genre
    Object.entries(genreGroups).slice(0, 3).forEach(([genre, items]) => {
        const section = document.createElement('div');
        section.className = 'genre-section';
        
        section.innerHTML = `
            <h3 class="genre-title">${genre}</h3>
            <div class="content-carousel" id="${genre.toLowerCase()}-carousel">
                <div class="carousel-container">
                    <div class="carousel-track" id="${genre.toLowerCase()}-track"></div>
                </div>
                <button class="carousel-btn carousel-prev" onclick="scrollCarousel('${genre.toLowerCase()}', -1)">‹</button>
                <button class="carousel-btn carousel-next" onclick="scrollCarousel('${genre.toLowerCase()}', 1)">›</button>
            </div>
        `;
        
        container.appendChild(section);
        
        // Populate the carousel
        carouselManager.populateCarousel(`${genre.toLowerCase()}-track`, items.slice(0, 10), UIComponents.createMovieCard);
    });
}

async function loadUserStats() {
    try {
        // Mock user stats - in real app, this would come from API
        const stats = {
            watchlist: Math.floor(Math.random() * 50) + 10,
            favorites: Math.floor(Math.random() * 30) + 5,
            watched: Math.floor(Math.random() * 100) + 20
        };
        
        updateUserStats(stats);
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
}

function updateUserStats(stats) {
    const watchlistCount = document.getElementById('watchlist-count');
    const favoritesCount = document.getElementById('favorites-count');
    const watchedCount = document.getElementById('watched-count');
    
    if (watchlistCount) watchlistCount.textContent = stats.watchlist;
    if (favoritesCount) favoritesCount.textContent = stats.favorites;
    if (watchedCount) watchedCount.textContent = stats.watched;
}

function showDashboardError() {
    const main = document.querySelector('main') || document.body;
    const errorState = UIComponents.createErrorState(
        'Failed to Load Dashboard',
        'We\'re having trouble loading your personalized content. Please try again.',
        'Reload Dashboard',
        'location.reload()'
    );
    main.appendChild(errorState);
}

// Movie Detail Loading
async function loadMovieDetails(movieId) {
    try {
        UIComponents.showLoading();
        
        const data = await apiService.getContentDetails(movieId);
        
        if (data.content) {
            populateMovieDetails(data.content, data.details);
        }
        
        if (data.youtube_videos) {
            populateVideoSection(data.youtube_videos);
        }
        
        if (data.details && data.details.credits) {
            populateCastSection(data.details.credits.cast);
        }
        
        if (data.user_reviews) {
            populateReviewsSection(data.user_reviews);
        }
        
        if (data.similar_content) {
            carouselManager.populateCarousel('similar-movies-track', data.similar_content, UIComponents.createMovieCard);
        }
        
        // Initialize movie interactions
        initializeMovieInteractions(movieId);
        
    } catch (error) {
        handleError(error, 'Loading movie details');
        showMovieDetailError();
    } finally {
        UIComponents.hideLoading();
    }
}

function populateMovieDetails(content, details) {
    // Update backdrop
    const backdropImg = document.getElementById('backdrop-image');
    if (backdropImg && content.backdrop_path) {
        backdropImg.src = content.backdrop_path;
        backdropImg.alt = content.title;
    }
    
    // Update poster
    const posterImg = document.getElementById('poster-image');
    if (posterImg && content.poster_path) {
        posterImg.src = content.poster_path;
        posterImg.alt = content.title;
    }
    
    // Update title and meta information
    const titleElement = document.getElementById('movie-title');
    if (titleElement) {
        titleElement.textContent = content.title;
    }
    
    const yearElement = document.getElementById('movie-year');
    if (yearElement && content.release_date) {
        yearElement.textContent = new Date(content.release_date).getFullYear();
    }
    
    const runtimeElement = document.getElementById('movie-runtime');
    if (runtimeElement && content.runtime) {
        runtimeElement.textContent = formatRuntime(content.runtime);
    }
    
    const ratingElement = document.getElementById('movie-rating');
    if (ratingElement && content.rating) {
        ratingElement.textContent = `${content.rating.toFixed(1)}/10`;
    }
    
    // Update genres
    const genresContainer = document.getElementById('movie-genres');
    if (genresContainer && content.genre_names) {
        genresContainer.innerHTML = '';
        content.genre_names.forEach(genre => {
            const genreTag = document.createElement('span');
            genreTag.className = 'genre-tag';
            genreTag.textContent = genre;
            genresContainer.appendChild(genreTag);
        });
    }
    
    // Update overview
    const overviewElement = document.getElementById('movie-overview');
    if (overviewElement) {
        overviewElement.textContent = content.overview || 'No overview available.';
    }
    
    // Update page title
    document.title = `${content.title} - MovieRec`;
}

function populateVideoSection(videos) {
    const videoGrid = document.getElementById('video-grid');
    if (!videoGrid) return;
    
    videoGrid.innerHTML = '';
    
    const allVideos = [...(videos.trailers || []), ...(videos.teasers || [])];
    
    if (allVideos.length === 0) {
        const emptyState = UIComponents.createEmptyState(
            'No Videos Available',
            'No trailers or teasers are currently available for this content.'
        );
        videoGrid.appendChild(emptyState);
        return;
    }
    
    allVideos.slice(0, 6).forEach(video => {
        const videoCard = UIComponents.createVideoCard(video);
        videoGrid.appendChild(videoCard);
    });
}

function populateCastSection(cast) {
    const castTrack = document.getElementById('cast-track');
    if (!castTrack || !cast) return;
    
    castTrack.innerHTML = '';
    
    cast.slice(0, 20).forEach(person => {
        const castCard = UIComponents.createCastCard(person);
        castTrack.appendChild(castCard);
    });
}

function populateReviewsSection(reviews) {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;
    
    reviewsContainer.innerHTML = '';
    
    if (reviews.length === 0) {
        const emptyState = UIComponents.createEmptyState(
            'No Reviews Yet',
            'Be the first to review this movie!',
            'Write Review',
            'openRatingModal()'
        );
        reviewsContainer.appendChild(emptyState);
        return;
    }
    
    reviews.forEach(review => {
        const reviewCard = UIComponents.createReviewCard(review);
        reviewsContainer.appendChild(reviewCard);
    });
}

function initializeMovieInteractions(movieId) {
    // Initialize rating button
    const rateBtn = document.getElementById('rate-btn');
    if (rateBtn) {
        rateBtn.onclick = () => openRatingModal(movieId);
    }
    
    // Initialize watchlist button
    const watchlistBtn = document.getElementById('watchlist-btn');
    if (watchlistBtn) {
        watchlistBtn.onclick = () => toggleWatchlist(movieId);
    }
    
    // Initialize favorite button
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.onclick = () => toggleFavorite(movieId);
    }
    
    // Initialize trailer button
    const trailerBtn = document.getElementById('play-trailer-btn');
    if (trailerBtn) {
        trailerBtn.onclick = () => playTrailer(movieId);
    }
    
    // Initialize share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.onclick = () => shareMovie(movieId);
    }
}

function showMovieDetailError() {
    const main = document.querySelector('main') || document.body;
    const errorState = UIComponents.createErrorState(
        'Movie Not Found',
        'The movie you\'re looking for doesn\'t exist or has been removed.',
        'Go Back Home',
        'window.location.href = "index.html"'
    );
    main.appendChild(errorState);
}

// Authentication Forms
function initializeAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authTabs = document.querySelectorAll('.auth-tab');
    
    // Tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.dataset.tab;
            switchAuthTab(tabType);
        });
    });
    
    // Form submissions
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

function switchAuthTab(tabType) {
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Update tab states
    authTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabType);
    });
    
    // Show/hide forms
        if (tabType === 'login') {
        loginForm?.classList.remove('hidden');
        registerForm?.classList.add('hidden');
    } else {
        loginForm?.classList.add('hidden');
        registerForm?.classList.remove('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        UIComponents.showToast('Please fill in all fields', 'warning');
        return;
    }
    
    await userManager.login({ username, password });
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    if (!username || !email || !password || !confirmPassword) {
        UIComponents.showToast('Please fill in all fields', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        UIComponents.showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        UIComponents.showToast('Password must be at least 6 characters', 'warning');
        return;
    }
    
    await userManager.register({ username, email, password });
}

// Tab Switching Handlers
function handleTabSwitch(tabType) {
    if (window.trendingData) {
        let data = [];
        switch (tabType) {
            case 'movies':
                data = window.trendingData.movies || [];
                break;
            case 'tv':
                data = window.trendingData.tv || [];
                break;
            case 'anime':
                data = window.trendingData.anime || [];
                break;
        }
        carouselManager.populateCarousel('trending-track', data, UIComponents.createMovieCard);
    }
}

function handleRegionalSwitch(region) {
    if (window.regionalData && window.regionalData[region]) {
        carouselManager.populateCarousel('regional-track', window.regionalData[region], UIComponents.createMovieCard);
    }
}

// Movie Interaction Functions
async function toggleWatchlist(movieId) {
    if (!userManager.isLoggedIn()) {
        UIComponents.showToast('Please log in to add to watchlist', 'warning');
        return;
    }
    
    try {
        await userManager.recordInteraction(movieId, 'wishlist');
        
        const btn = document.getElementById('watchlist-btn');
        if (btn) {
            btn.classList.toggle('active');
            const isActive = btn.classList.contains('active');
            btn.innerHTML = isActive ? 
                '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> In Watchlist' :
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Watchlist';
        }
        
        UIComponents.showToast(
            btn?.classList.contains('active') ? 'Added to watchlist' : 'Removed from watchlist',
            'success'
        );
    } catch (error) {
        handleError(error, 'Updating watchlist');
    }
}

async function toggleFavorite(movieId) {
    if (!userManager.isLoggedIn()) {
        UIComponents.showToast('Please log in to add to favorites', 'warning');
        return;
    }
    
    try {
        await userManager.recordInteraction(movieId, 'favorite');
        
        const btn = document.getElementById('favorite-btn');
        if (btn) {
            btn.classList.toggle('active');
            const isActive = btn.classList.contains('active');
            btn.innerHTML = isActive ?
                '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> Favorited' :
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg> Favorite';
        }
        
        UIComponents.showToast(
            btn?.classList.contains('active') ? 'Added to favorites' : 'Removed from favorites',
            'success'
        );
    } catch (error) {
        handleError(error, 'Updating favorites');
    }
}

function playTrailer(movieId) {
    // Find the first trailer video
    const videoCards = document.querySelectorAll('.video-card');
    if (videoCards.length > 0) {
        videoCards[0].click();
    } else {
        UIComponents.showToast('No trailer available', 'info');
    }
}

function shareMovie(movieId) {
    const url = window.location.href;
    const title = document.getElementById('movie-title')?.textContent || 'Check out this movie';
    
    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        }).catch(console.error);
    } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(url).then(() => {
            UIComponents.showToast('Link copied to clipboard', 'success');
        }).catch(() => {
            UIComponents.showToast('Failed to copy link', 'error');
        });
    }
}

// Rating Modal Functions
function openRatingModal(movieId) {
    if (!userManager.isLoggedIn()) {
        UIComponents.showToast('Please log in to rate movies', 'warning');
        return;
    }
    
    // Store movie ID for submission
    window.currentRatingMovieId = movieId;
    
    // Reset rating stars
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.classList.remove('active');
        star.onclick = () => setRating(index + 1);
    });
    
    // Clear review text
    const reviewText = document.getElementById('review-text');
    if (reviewText) {
        reviewText.value = '';
    }
    
    ModalManager.openModal('rating-modal');
}

function setRating(rating) {
    window.currentRating = rating;
    
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}

async function submitRating() {
    const movieId = window.currentRatingMovieId;
    const rating = window.currentRating;
    const reviewText = document.getElementById('review-text')?.value;
    
    if (!rating) {
        UIComponents.showToast('Please select a rating', 'warning');
        return;
    }
    
    try {
        await userManager.recordInteraction(movieId, 'rating', rating);
        
        ModalManager.closeModal('rating-modal');
        UIComponents.showToast('Rating submitted successfully', 'success');
        
        // Refresh reviews section
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        handleError(error, 'Submitting rating');
    }
}

// Preference Tuning
function initializePreferenceTuning() {
    const genreContainer = document.getElementById('genre-preferences');
    const languageContainer = document.getElementById('language-preferences');
    
    if (genreContainer) {
        populateGenrePreferences(genreContainer);
    }
    
    if (languageContainer) {
        populateLanguagePreferences(languageContainer);
    }
}

function populateGenrePreferences(container) {
    const genres = [
        'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
        'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music',
        'Mystery', 'Romance', 'Science Fiction', 'Thriller', 'War', 'Western'
    ];
    
    container.innerHTML = '';
    
    genres.forEach(genre => {
        const tag = document.createElement('span');
        tag.className = 'preference-tag';
        tag.textContent = genre;
        tag.onclick = () => togglePreferenceTag(tag);
        container.appendChild(tag);
    });
}

function populateLanguagePreferences(container) {
    const languages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'te', name: 'Telugu' },
        { code: 'ta', name: 'Tamil' },
        { code: 'kn', name: 'Kannada' },
        { code: 'ml', name: 'Malayalam' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' }
    ];
    
    container.innerHTML = '';
    
    languages.forEach(lang => {
        const tag = document.createElement('span');
        tag.className = 'preference-tag';
        tag.textContent = lang.name;
        tag.dataset.code = lang.code;
        tag.onclick = () => togglePreferenceTag(tag);
        container.appendChild(tag);
    });
}

function togglePreferenceTag(tag) {
    tag.classList.toggle('active');
}

async function updatePreferences() {
    if (!userManager.isLoggedIn()) {
        UIComponents.showToast('Please log in to update preferences', 'warning');
        return;
    }
    
    const activeGenres = Array.from(document.querySelectorAll('#genre-preferences .preference-tag.active'))
        .map(tag => tag.textContent);
    
    const activeLanguages = Array.from(document.querySelectorAll('#language-preferences .preference-tag.active'))
        .map(tag => tag.dataset.code);
    
    try {
        // In a real app, this would call an API to update user preferences
        console.log('Updating preferences:', { genres: activeGenres, languages: activeLanguages });
        
        UIComponents.showToast('Preferences updated successfully', 'success');
        
        // Refresh recommendations
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        handleError(error, 'Updating preferences');
    }
}

// Hero Section Initialization
function initializeHeroSection() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;
    
    // Add parallax effect on scroll
    window.addEventListener('scroll', throttle(() => {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.5;
        
        const heroBackground = heroSection.querySelector('.hero-background');
        if (heroBackground) {
            heroBackground.style.transform = `translateY(${parallax}px)`;
        }
    }, 16));
    
    // Add typing effect to hero title
    const heroTitle = heroSection.querySelector('.hero-title');
    if (heroTitle) {
        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                heroTitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        
        // Start typing effect after a short delay
        setTimeout(typeWriter, 500);
    }
}

// Infinite Scroll Implementation
function initializeInfiniteScroll() {
    let isLoading = false;
    let currentPage = 1;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading) {
                loadMoreContent();
            }
        });
    });
    
    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    sentinel.style.height = '1px';
    
    const main = document.querySelector('main');
    if (main) {
        main.appendChild(sentinel);
        observer.observe(sentinel);
    }
    
    async function loadMoreContent() {
        isLoading = true;
        currentPage++;
        
        try {
            // Load more content based on current page
            const data = await apiService.getHomepage(); // In real app, pass page parameter
            
            // Append new content to existing carousels
            // Implementation depends on specific requirements
            
        } catch (error) {
            console.error('Failed to load more content:', error);
        } finally {
            isLoading = false;
        }
    }
}

// Keyboard Navigation
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // ESC key closes modals
        if (e.key === 'Escape') {
            ModalManager.closeAllModals();
        }
        
        // Arrow keys for carousel navigation
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const focusedCarousel = document.querySelector('.content-carousel:hover');
            if (focusedCarousel) {
                const carouselId = focusedCarousel.id;
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                carouselManager.scrollCarousel(carouselId, direction);
            }
        }
        
        // Enter key for search
        if (e.key === 'Enter' && e.target.id === 'search-input') {
            performSearch();
        }
    });
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}

// Progressive Web App Features
function initializePWA() {
    // Add to home screen prompt
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button
                const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.style.display = 'block';
            installBtn.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the A2HS prompt');
                    }
                    deferredPrompt = null;
                });
            });
        }
    });
    
    // Handle app installation
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        UIComponents.showToast('App installed successfully!', 'success');
    });
}

// Analytics and Tracking
function initializeAnalytics() {
    // Track page views
    const trackPageView = (page) => {
        console.log(`Page view: ${page}`);
        // In real app, send to analytics service
    };
    
    // Track user interactions
    const trackInteraction = (action, category, label) => {
        console.log(`Interaction: ${action} - ${category} - ${label}`);
        // In real app, send to analytics service
    };
    
    // Track current page
    trackPageView(window.location.pathname);
    
    // Track movie card clicks
    document.addEventListener('click', (e) => {
        if (e.target.closest('.movie-card')) {
            trackInteraction('click', 'movie_card', 'view_details');
        }
        
        if (e.target.closest('.btn-primary')) {
            trackInteraction('click', 'button', e.target.textContent);
        }
    });
    
    // Track search usage
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            if (searchInput.value.length > 2) {
                trackInteraction('search', 'content', searchInput.value);
            }
        }, 1000));
    }
}

// Error Boundary
function initializeErrorBoundary() {
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        
        // Show user-friendly error message
        UIComponents.showToast('Something went wrong. Please refresh the page.', 'error');
        
        // In real app, send error to logging service
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        
        // Show user-friendly error message
        UIComponents.showToast('Network error. Please check your connection.', 'error');
        
        // Prevent the default browser error handling
        e.preventDefault();
    });
}

// Performance Optimization
function initializePerformanceOptimizations() {
    // Preload critical resources
    const preloadCriticalResources = () => {
        const criticalImages = [
            '/images/logo.png',
            '/images/hero-bg.jpg'
        ];
        
        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    };
    
    // Lazy load non-critical resources
    const lazyLoadResources = () => {
        const lazyElements = document.querySelectorAll('[data-lazy]');
        
        const lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const src = element.dataset.lazy;
                    
                    if (element.tagName === 'IMG') {
                        element.src = src;
                    } else {
                        element.style.backgroundImage = `url(${src})`;
                    }
                    
                    element.removeAttribute('data-lazy');
                    lazyObserver.unobserve(element);
                }
            });
        });
        
        lazyElements.forEach(element => lazyObserver.observe(element));
    };
    
    // Optimize carousel performance
    const optimizeCarousels = () => {
        const carousels = document.querySelectorAll('.carousel-track');
        
        carousels.forEach(carousel => {
            // Use transform3d for hardware acceleration
            carousel.style.transform = 'translate3d(0, 0, 0)';
            
            // Add will-change for better performance
            carousel.style.willChange = 'transform';
        });
    };
    
    preloadCriticalResources();
    lazyLoadResources();
    optimizeCarousels();
}

// Accessibility Enhancements
function initializeAccessibility() {
    // Add skip links
    const addSkipLinks = () => {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--accent-red);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 10000;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    };
    
    // Enhance focus management
    const enhanceFocusManagement = () => {
        // Add focus indicators
        const style = document.createElement('style');
        style.textContent = `
            .focus-visible {
                outline: 2px solid var(--accent-red);
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);
        
        // Manage focus for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const modal = document.querySelector('.modal:not(.hidden)');
                if (modal) {
                    const focusableElements = modal.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    };
    
    // Add ARIA labels and descriptions
    const enhanceARIA = () => {
        // Add ARIA labels to buttons without text
        const iconButtons = document.querySelectorAll('button:not([aria-label])');
        iconButtons.forEach(button => {
            if (!button.textContent.trim()) {
                const svg = button.querySelector('svg');
                if (svg) {
                    button.setAttribute('aria-label', 'Action button');
                }
            }
        });
        
        // Add ARIA descriptions to movie cards
        const movieCards = document.querySelectorAll('.movie-card');
        movieCards.forEach(card => {
            const title = card.querySelector('.movie-card-title')?.textContent;
            const year = card.querySelector('.movie-card-year')?.textContent;
            const rating = card.querySelector('.movie-card-rating')?.textContent;
            
            if (title) {
                const description = `${title}${year ? `, ${year}` : ''}${rating ? `, rated ${rating}` : ''}`;
                card.setAttribute('aria-label', description);
                card.setAttribute('role', 'button');
                card.setAttribute('tabindex', '0');
                
                // Add keyboard support
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        card.click();
                    }
                });
            }
        });
    };
    
    // Announce dynamic content changes
    const announceChanges = () => {
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(announcer);
        
        window.announceToScreenReader = (message) => {
            announcer.textContent = message;
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        };
    };
    
    addSkipLinks();
    enhanceFocusManagement();
    enhanceARIA();
    announceChanges();
}

// Network Status Monitoring
function initializeNetworkMonitoring() {
    const updateNetworkStatus = () => {
        if (navigator.onLine) {
            UIComponents.showToast('Connection restored', 'success');
        } else {
            UIComponents.showToast('You are offline. Some features may not work.', 'warning');
        }
    };
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // Check initial network status
    if (!navigator.onLine) {
        UIComponents.showToast('You are offline. Some features may not work.', 'warning');
    }
}

// Theme Management
function initializeThemeManagement() {
    const getPreferredTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };
    
    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };
    
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };
    
    // Initialize theme
    setTheme(getPreferredTheme());
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
    
    // Add theme toggle button if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// Initialize all features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Core initialization
    initializeKeyboardNavigation();
    initializeInfiniteScroll();
    initializePWA();
    initializeAnalytics();
    initializeErrorBoundary();
    initializePerformanceOptimizations();
    initializeAccessibility();
    initializeNetworkMonitoring();
    initializeThemeManagement();
    
    // Register service worker
    registerServiceWorker();
    
    // Page-specific initialization based on current page
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    switch (page) {
        case 'index.html':
        case '':
            initializeHomepage();
            break;
        case 'dashboard.html':
            initializeDashboard();
            break;
        case 'movie-detail.html':
            initializeMovieDetail();
            break;
        case 'login.html':
            initializeAuth();
            break;
        default:
            console.log('Unknown page:', page);
    }
});

// Export functions for global use
window.navigateToMovie = navigateToMovie;
window.scrollToSection = scrollToSection;
window.scrollCarousel = scrollCarousel;
window.performSearch = performSearch;
window.openModal = openModal;
window.closeModal = closeModal;
window.openVideoModal = openVideoModal;
window.logout = logout;
window.handleTabSwitch = handleTabSwitch;
window.handleRegionalSwitch = handleRegionalSwitch;
window.toggleWatchlist = toggleWatchlist;
window.toggleFavorite = toggleFavorite;
window.playTrailer = playTrailer;
window.shareMovie = shareMovie;
window.openRatingModal = openRatingModal;
window.setRating = setRating;
window.submitRating = submitRating;
window.updatePreferences = updatePreferences;
window.togglePreferenceTag = togglePreferenceTag;