// Movie Detail Page functionality
class MovieDetailManager {
    constructor() {
        this.movieId = null;
        this.movieData = null;
        this.userRating = 0;
        this.isInWatchlist = false;
        this.isFavorite = false;
        
        this.init();
    }
    
    init() {
        // Get movie ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.movieId = urlParams.get('id');
        
        if (!this.movieId) {
            this.showError('Movie ID not found in URL');
            return;
        }
        
        console.log('Loading movie detail for ID:', this.movieId);
        this.loadMovieData();
        this.setupInteractions();
        this.setupVideoPlayer();
        this.setupReviewSystem();
    }
    
    async loadMovieData() {
        try {
            showLoading(true);
            console.log('Fetching movie data...');
            
            // Load movie details
            this.movieData = await api.getContentDetails(this.movieId);
            console.log('Movie data loaded:', this.movieData);
            
            // Render all sections
            this.renderMovieHero();
            this.renderMovieInfo();
            this.renderVideos();
            this.renderCast();
            this.renderReviews();
            this.renderSimilarMovies();
            this.renderMovieDetails();
            
            // Load user interactions
            this.loadUserInteractions();
            
            // Record view
            this.recordView();
            
        } catch (error) {
            console.error('Movie detail loading error:', error);
            this.showError('Failed to load movie details. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    renderMovieHero() {
        const { content, tmdb_details } = this.movieData;
        console.log('Rendering movie hero for:', content.title);
        
        // Set hero background
        const heroBackground = document.getElementById('heroBackground');
        if (heroBackground && content.backdrop_path) {
            heroBackground.style.backgroundImage = `url('${content.backdrop_path}')`;
            heroBackground.style.backgroundSize = 'cover';
            heroBackground.style.backgroundPosition = 'center';
        }
        
        // Set movie poster with error handling
        const moviePoster = document.getElementById('moviePoster');
        if (moviePoster) {
            moviePoster.src = content.poster_path || 'https://via.placeholder.com/400x600/333/fff?text=No+Image';
            moviePoster.alt = content.title;
            moviePoster.onerror = function() {
                this.src = 'https://via.placeholder.com/400x600/333/fff?text=No+Image';
            };
        }
        
        // Set movie title
        const movieTitle = document.getElementById('movieTitle');
        if (movieTitle) {
            movieTitle.textContent = content.title;
        }
        
        // Set tagline
        const movieTagline = document.getElementById('movieTagline');
        if (movieTagline) {
            movieTagline.textContent = tmdb_details?.tagline || 'An amazing cinematic experience awaits';
        }
        
        // Set overview
        const movieOverview = document.getElementById('movieOverview');
        if (movieOverview) {
            movieOverview.textContent = content.overview || 'No overview available for this movie.';
        }
    }
    
    renderMovieInfo() {
        const { content, tmdb_details } = this.movieData;
        
        // Release year
        const movieYear = document.getElementById('movieYear');
        if (movieYear && content.release_date) {
            movieYear.textContent = new Date(content.release_date).getFullYear();
        }
        
        // Runtime
        const movieRuntime = document.getElementById('movieRuntime');
        if (movieRuntime) {
            const runtime = content.runtime || tmdb_details?.runtime || 120;
            movieRuntime.textContent = `${runtime} min`;
        }
        
        // Rating
        const movieRating = document.getElementById('movieRating');
        if (movieRating && content.rating) {
            const ratingSpan = movieRating.querySelector('span');
            if (ratingSpan) {
                ratingSpan.textContent = content.rating.toFixed(1);
            }
        }
        
        // Genres
        const movieGenres = document.getElementById('movieGenres');
        if (movieGenres && content.genre_names) {
            movieGenres.innerHTML = content.genre_names.map(genre => 
                `<span class="bg-red-600 text-white px-3 py-1 rounded-full text-sm">${genre}</span>`
            ).join('');
        }
    }
    
    renderVideos() {
        const videosGrid = document.getElementById('videosGrid');
        if (!videosGrid) return;
        
        const { youtube_videos } = this.movieData;
        
        videosGrid.innerHTML = '';
        
        if (!youtube_videos || (!youtube_videos.trailers?.length && !youtube_videos.teasers?.length)) {
            videosGrid.appendChild(ui.createEmptyState(
                'No videos available',
                'Check back later for trailers and teasers'
            ));
            return;
        }
        
        // Combine trailers and teasers
        const allVideos = [
            ...(youtube_videos.trailers || []),
            ...(youtube_videos.teasers || [])
        ];
        
        allVideos.forEach(video => {
            const videoCard = this.createVideoCard(video);
            videosGrid.appendChild(videoCard);
        });
    }
    
    createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card cursor-pointer';
        card.onclick = () => this.playVideo(video.video_id);
        
        card.innerHTML = `
            <img class="video-thumbnail" 
                 src="${video.thumbnail}" 
                 alt="${video.title}"
                 onerror="this.src='https://via.placeholder.com/480x270/333/fff?text=Video+Thumbnail'">
            <div class="video-overlay">
                <button class="video-play-btn">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <div class="video-info">
                <h4 class="video-title">${video.title}</h4>
                <span class="video-type">${video.type}</span>
            </div>
        `;
        
        return card;
    }
    
    renderCast() {
        const castTrack = document.getElementById('castTrack');
        if (!castTrack) return;
        
        const { tmdb_details } = this.movieData;
        
        castTrack.innerHTML = '';
        
        if (!tmdb_details?.credits?.cast?.length) {
            castTrack.innerHTML = '<div class="text-center text-gray-400 p-8">No cast information available</div>';
            return;
        }
        
        // Show top 20 cast members
        tmdb_details.credits.cast.slice(0, 20).forEach(person => {
            const castCard = this.createCastCard(person);
            castTrack.appendChild(castCard);
        });
        
        // Initialize carousel
        ui.initializeCarousel('castCarousel');
    }
    
    createCastCard(person) {
        const card = document.createElement('div');
        card.className = 'cast-card';
        
        const photoUrl = person.profile_path 
            ? `https://image.tmdb.org/t/p/w200${person.profile_path}`
            : 'https://via.placeholder.com/150x200/333/fff?text=No+Photo';
        
        card.innerHTML = `
            <img class="cast-photo" 
                 src="${photoUrl}" 
                 alt="${person.name}" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/150x200/333/fff?text=No+Photo'">
            <div class="cast-info">
                <h4 class="cast-name">${person.name}</h4>
                <p class="cast-character">${person.character || ''}</p>
            </div>
        `;
        
        return card;
    }
    
    renderReviews() {
        const { user_reviews } = this.movieData;
        
        this.updateReviewSummary(user_reviews);
        this.renderReviewsList(user_reviews);
    }
    
    updateReviewSummary(reviews) {
        const averageRating = document.getElementById('averageRating');
        const reviewCount = document.getElementById('reviewCount');
        const ratingStars = document.getElementById('ratingStars');
        const ratingBreakdown = document.getElementById('ratingBreakdown');
        
        if (!reviews || reviews.length === 0) {
            if (averageRating) averageRating.textContent = '0.0';
            if (reviewCount) reviewCount.textContent = '0';
            if (ratingStars) ratingStars.innerHTML = this.createStarDisplay(0);
            return;
        }
        
        // Calculate average rating
        const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        
        if (averageRating) averageRating.textContent = avgRating.toFixed(1);
                if (reviewCount) reviewCount.textContent = reviews.length;
        if (ratingStars) ratingStars.innerHTML = this.createStarDisplay(avgRating);
        
        // Update rating breakdown
        if (ratingBreakdown) {
            this.updateRatingBreakdown(reviews, ratingBreakdown);
        }
    }
    
    updateRatingBreakdown(reviews, container) {
        const breakdown = [5, 4, 3, 2, 1].map(rating => {
            const count = reviews.filter(r => Math.round(r.rating) === rating).length;
            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            
            return { rating, count, percentage };
        });
        
        container.innerHTML = breakdown.map(item => `
            <div class="rating-breakdown-item">
                <div class="rating-breakdown-stars">${'★'.repeat(item.rating)}</div>
                <div class="rating-breakdown-bar">
                    <div class="rating-breakdown-fill" style="width: ${item.percentage}%"></div>
                </div>
                <div class="rating-breakdown-count">${item.count}</div>
            </div>
        `).join('');
    }
    
    renderReviewsList(reviews) {
        const reviewsList = document.getElementById('reviewsList');
        if (!reviewsList) return;
        
        reviewsList.innerHTML = '';
        
        if (!reviews || reviews.length === 0) {
            reviewsList.appendChild(ui.createEmptyState(
                'No reviews yet',
                'Be the first to review this movie!',
                'Write Review',
                () => this.openReviewModal()
            ));
            return;
        }
        
        reviews.forEach(review => {
            const reviewCard = this.createReviewCard(review);
            reviewsList.appendChild(reviewCard);
        });
    }
    
    createReviewCard(review) {
        const card = document.createElement('div');
        card.className = 'review-card';
        
        const initials = review.username.substring(0, 2).toUpperCase();
        const date = new Date(review.created_at).toLocaleDateString();
        const stars = this.createStarDisplay(review.rating);
        
        card.innerHTML = `
            <div class="review-header">
                <div class="review-user">
                    <div class="review-avatar">${initials}</div>
                    <div>
                        <div class="review-username">${review.username}</div>
                        <div class="review-date">${date}</div>
                    </div>
                </div>
                <div class="review-rating">${stars}</div>
            </div>
            <p class="review-text">${review.review_text || 'No written review provided.'}</p>
            <div class="review-actions">
                <button class="review-action" onclick="movieDetailManager.toggleHelpful(${review.id}, this)">
                    <i class="far fa-thumbs-up"></i>
                    <span>Helpful (0)</span>
                </button>
                <button class="review-action" onclick="movieDetailManager.reportReview(${review.id})">
                    <i class="fas fa-flag"></i>
                    <span>Report</span>
                </button>
            </div>
        `;
        
        return card;
    }
    
    createStarDisplay(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star text-yellow-500"></i>';
        }
        
        // Half star
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt text-yellow-500"></i>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star text-gray-400"></i>';
        }
        
        return stars;
    }
    
    renderSimilarMovies() {
        const similarGrid = document.getElementById('similarGrid');
        if (!similarGrid) return;
        
        const { similar_content } = this.movieData;
        
        similarGrid.innerHTML = '';
        
        if (!similar_content || similar_content.length === 0) {
            similarGrid.appendChild(ui.createEmptyState(
                'No similar content found',
                'Check back later for recommendations'
            ));
            return;
        }
        
        similar_content.forEach(item => {
            const card = createMovieCard(item, { lazy: true });
            similarGrid.appendChild(card);
        });
    }
    
    renderMovieDetails() {
        const { tmdb_details } = this.movieData;
        if (!tmdb_details) return;
        
        const detailMappings = {
            'movieDirector': this.getDirector(tmdb_details.credits),
            'movieWriters': this.getWriters(tmdb_details.credits),
            'movieProduction': this.getProductionCompanies(tmdb_details.production_companies),
            'movieBudget': this.formatCurrency(tmdb_details.budget),
            'movieReleaseDate': this.formatDate(tmdb_details.release_date),
            'movieLanguage': tmdb_details.original_language?.toUpperCase() || 'Unknown',
            'movieCountry': this.getCountries(tmdb_details.production_countries),
            'movieBoxOffice': this.formatCurrency(tmdb_details.revenue)
        };
        
        Object.entries(detailMappings).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || 'Unknown';
            }
        });
    }
    
    getDirector(credits) {
        return credits?.crew?.find(person => person.job === 'Director')?.name || 'Unknown';
    }
    
    getWriters(credits) {
        const writers = credits?.crew?.filter(person => 
            person.job === 'Writer' || person.job === 'Screenplay'
        ) || [];
        return writers.map(w => w.name).join(', ') || 'Unknown';
    }
    
    getProductionCompanies(companies) {
        return companies?.map(c => c.name).join(', ') || 'Unknown';
    }
    
    getCountries(countries) {
        return countries?.map(c => c.name).join(', ') || 'Unknown';
    }
    
    formatCurrency(amount) {
        if (!amount || amount === 0) return 'Unknown';
        return `$${(amount / 1000000).toFixed(1)}M`;
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    setupInteractions() {
        // Watchlist toggle
        window.toggleWatchlist = async () => {
            if (!isAuthenticated()) {
                showToast('Please log in to use watchlist', 'info');
                return;
            }
            
            try {
                await this.toggleWatchlist();
            } catch (error) {
                showToast('Failed to update watchlist', 'error');
            }
        };
        
        // Favorite toggle
        window.toggleFavorite = async () => {
            if (!isAuthenticated()) {
                showToast('Please log in to use favorites', 'info');
                return;
            }
            
            try {
                await this.toggleFavorite();
            } catch (error) {
                showToast('Failed to update favorites', 'error');
            }
        };
        
        // Share movie
        window.shareMovie = () => {
            this.shareMovie();
        };
    }
    
    async toggleWatchlist() {
        try {
            await api.recordInteraction({
                content_id: this.movieId,
                interaction_type: 'wishlist'
            });
            
            this.isInWatchlist = !this.isInWatchlist;
            this.updateWatchlistButton();
            
            // Update local storage
            const watchlist = ui.loadFromStorage('watchlist', []);
            
            if (this.isInWatchlist) {
                if (!watchlist.find(item => item.id == this.movieId)) {
                    watchlist.unshift({
                        ...this.movieData.content,
                        added_at: new Date().toISOString()
                    });
                    ui.saveToStorage('watchlist', watchlist);
                }
                showToast('Added to watchlist', 'success');
            } else {
                const filtered = watchlist.filter(item => item.id != this.movieId);
                ui.saveToStorage('watchlist', filtered);
                showToast('Removed from watchlist', 'info');
            }
            
        } catch (error) {
            console.error('Watchlist toggle error:', error);
            throw error;
        }
    }
    
    updateWatchlistButton() {
        const button = document.getElementById('watchlistButton');
        if (!button) return;
        
        const icon = button.querySelector('i');
        const textSpan = button.querySelector('span');
        
        if (this.isInWatchlist) {
            if (icon) {
                icon.classList.remove('fa-plus');
                icon.classList.add('fa-check');
            }
            if (textSpan) textSpan.textContent = 'In Watchlist';
            button.classList.add('bg-green-600');
            button.classList.remove('bg-gray-800');
        } else {
            if (icon) {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-plus');
            }
            if (textSpan) textSpan.textContent = 'Add to Watchlist';
            button.classList.remove('bg-green-600');
            button.classList.add('bg-gray-800');
        }
    }
    
    async toggleFavorite() {
        try {
            await api.recordInteraction({
                content_id: this.movieId,
                interaction_type: 'favorite'
            });
            
            this.isFavorite = !this.isFavorite;
            this.updateFavoriteButton();
            
            // Update local storage
            const favorites = ui.loadFromStorage('favorites', []);
            
            if (this.isFavorite) {
                if (!favorites.find(item => item.id == this.movieId)) {
                    favorites.unshift({
                        ...this.movieData.content,
                        added_at: new Date().toISOString()
                    });
                    ui.saveToStorage('favorites', favorites);
                }
                showToast('Added to favorites', 'success');
            } else {
                const filtered = favorites.filter(item => item.id != this.movieId);
                ui.saveToStorage('favorites', filtered);
                showToast('Removed from favorites', 'info');
            }
            
        } catch (error) {
            console.error('Favorite toggle error:', error);
            throw error;
        }
    }
    
    updateFavoriteButton() {
        const button = document.getElementById('favoriteButton');
        if (!button) return;
        
        const icon = button.querySelector('i');
        
        if (this.isFavorite) {
            if (icon) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.classList.add('text-red-500');
            }
            button.classList.add('bg-red-600');
            button.classList.remove('bg-gray-800');
        } else {
            if (icon) {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.classList.remove('text-red-500');
            }
            button.classList.remove('bg-red-600');
            button.classList.add('bg-gray-800');
        }
    }
    
    shareMovie() {
        const movieTitle = document.getElementById('movieTitle')?.textContent || 'Check out this movie!';
        const movieOverview = document.getElementById('movieOverview')?.textContent || '';
        
        if (navigator.share) {
            navigator.share({
                title: movieTitle,
                text: movieOverview,
                url: window.location.href
            }).catch(error => {
                console.log('Share failed:', error);
                this.fallbackShare();
            });
        } else {
            this.fallbackShare();
        }
    }
    
    fallbackShare() {
        // Copy link to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('Link copied to clipboard', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Link copied to clipboard', 'success');
        });
    }
    
    setupVideoPlayer() {
        window.playVideo = (videoId) => {
            this.playVideo(videoId);
        };
        
        window.closeVideoModal = () => {
            this.closeVideoModal();
        };
    }
    
    playVideo(videoId) {
        const modal = document.getElementById('videoModal');
        const player = document.getElementById('videoPlayer');
        
        if (modal && player) {
            player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            openModal('videoModal');
            
            // Track video play
            this.trackVideoPlay(videoId);
        }
    }
    
    closeVideoModal() {
        const player = document.getElementById('videoPlayer');
        if (player) {
            player.src = '';
        }
        closeModal('videoModal');
    }
    
    trackVideoPlay(videoId) {
        // Track video play for analytics
        console.log(`Video played: ${videoId}`);
    }
    
    setupReviewSystem() {
        window.openReviewModal = () => {
            this.openReviewModal();
        };
        
        window.closeReviewModal = () => {
            this.closeReviewModal();
        };
        
        window.submitReview = (event) => {
            this.submitReview(event);
        };
        
        // Setup rating stars
        this.setupRatingStars();
    }
    
    openReviewModal() {
        if (!isAuthenticated()) {
            showToast('Please log in to write a review', 'info');
            return;
        }
        
        openModal('reviewModal');
        this.resetReviewForm();
    }
    
    closeReviewModal() {
        closeModal('reviewModal');
    }
    
    resetReviewForm() {
        this.userRating = 0;
        const reviewText = document.getElementById('reviewText');
        if (reviewText) reviewText.value = '';
        this.updateRatingStars(0);
    }
    
    setupRatingStars() {
        const stars = document.querySelectorAll('#reviewRatingStars .rating-star');
        
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                this.userRating = index + 1;
                this.updateRatingStars(this.userRating);
            });
            
                        star.addEventListener('mouseenter', () => {
                this.updateRatingStars(index + 1, true);
            });
        });
        
        const container = document.getElementById('reviewRatingStars');
        if (container) {
            container.addEventListener('mouseleave', () => {
                this.updateRatingStars(this.userRating);
            });
        }
    }
    
    updateRatingStars(rating, isHover = false) {
        const stars = document.querySelectorAll('#reviewRatingStars .rating-star');
        
        stars.forEach((star, index) => {
            const icon = star.querySelector('i');
            
            if (index < rating) {
                if (icon) {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                }
                star.classList.add('active');
            } else {
                if (icon) {
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                }
                star.classList.remove('active');
            }
            
            if (isHover) {
                star.classList.toggle('hover', index < rating);
            } else {
                star.classList.remove('hover');
            }
        });
    }
    
    async submitReview(event) {
        event.preventDefault();
        
        if (this.userRating === 0) {
            showToast('Please select a rating', 'error');
            return;
        }
        
        const reviewTextElement = document.getElementById('reviewText');
        const reviewText = reviewTextElement ? reviewTextElement.value.trim() : '';
        
        try {
            showLoading(true);
            
            await api.recordInteraction({
                content_id: this.movieId,
                interaction_type: 'review',
                rating: this.userRating,
                review_text: reviewText
            });
            
            // Store review locally
            const userReviews = ui.loadFromStorage('userReviews', {});
            userReviews[this.movieId] = {
                rating: this.userRating,
                review_text: reviewText,
                created_at: new Date().toISOString()
            };
            ui.saveToStorage('userReviews', userReviews);
            
            this.closeReviewModal();
            showToast('Review submitted successfully!', 'success');
            
            // Add the new review to the current reviews
            this.addNewReviewToDisplay();
            
        } catch (error) {
            console.error('Submit review error:', error);
            showToast('Failed to submit review', 'error');
        } finally {
            showLoading(false);
        }
    }
    
    addNewReviewToDisplay() {
        const user = getCurrentUser();
        if (!user) return;
        
        const newReview = {
            id: Date.now(),
            username: user.username,
            rating: this.userRating,
            review_text: document.getElementById('reviewText')?.value.trim() || '',
            created_at: new Date().toISOString()
        };
        
        // Add to the beginning of reviews array
        if (!this.movieData.user_reviews) {
            this.movieData.user_reviews = [];
        }
        this.movieData.user_reviews.unshift(newReview);
        
        // Re-render reviews
        this.renderReviews();
    }
    
    toggleHelpful(reviewId, buttonElement) {
        const span = buttonElement.querySelector('span');
        const icon = buttonElement.querySelector('i');
        
        const isHelpful = buttonElement.classList.contains('active');
        
        if (isHelpful) {
            buttonElement.classList.remove('active');
            if (icon) {
                icon.classList.replace('fas', 'far');
            }
            if (span) span.textContent = 'Helpful (0)';
            showToast('Removed helpful vote', 'info');
        } else {
            buttonElement.classList.add('active');
            if (icon) {
                icon.classList.replace('far', 'fas');
            }
            if (span) span.textContent = 'Helpful (1)';
            showToast('Marked as helpful', 'success');
        }
        
        // In a real app, this would make an API call
        console.log(`Toggle helpful for review ${reviewId}: ${!isHelpful}`);
    }
    
    reportReview(reviewId) {
        if (confirm('Are you sure you want to report this review?')) {
            showToast('Review reported. Thank you for your feedback.', 'success');
            
            // In a real app, this would make an API call
            console.log(`Report review ${reviewId}`);
        }
    }
    
    loadUserInteractions() {
        if (!isAuthenticated()) return;
        
        // Load from local storage
        const interactions = ui.loadFromStorage('userInteractions', {});
        const movieInteractions = interactions[this.movieId] || {};
        
        // Check watchlist
        const watchlist = ui.loadFromStorage('watchlist', []);
        this.isInWatchlist = watchlist.some(item => item.id == this.movieId);
        this.updateWatchlistButton();
        
        // Check favorites
        const favorites = ui.loadFromStorage('favorites', []);
        this.isFavorite = favorites.some(item => item.id == this.movieId);
        this.updateFavoriteButton();
        
        // Load user's existing review
        this.loadUserReview();
    }
    
    loadUserReview() {
        // Check if user has already reviewed
        const userReviews = ui.loadFromStorage('userReviews', {});
        const userReview = userReviews[this.movieId];
        
        if (userReview) {
            // Update review button to show "Edit Review"
            const reviewButton = document.querySelector('[onclick*="openReviewModal"]');
            if (reviewButton) {
                reviewButton.innerHTML = '<i class="fas fa-edit mr-2"></i>Edit Review';
            }
        }
    }
    
    async recordView() {
        if (!isAuthenticated()) return;
        
        try {
            await api.recordInteraction({
                content_id: this.movieId,
                interaction_type: 'view'
            });
            
            // Update local watch history
            const history = ui.loadFromStorage('watchHistory', []);
            
            // Remove if already exists
            const filtered = history.filter(item => item.id != this.movieId);
            
            // Add to beginning
            filtered.unshift({
                ...this.movieData.content,
                watched_at: new Date().toISOString()
            });
            
            // Keep only last 100 items
            const trimmed = filtered.slice(0, 100);
            ui.saveToStorage('watchHistory', trimmed);
            
        } catch (error) {
            console.error('Record view error:', error);
        }
    }
    
    showError(message) {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = '';
            main.appendChild(ui.createErrorState(
                message,
                'Go Back',
                () => {
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.href = 'index.html';
                    }
                }
            ));
        }
    }
    
    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Space to play/pause video
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                const videoModal = document.getElementById('videoModal');
                if (videoModal && !videoModal.classList.contains('hidden')) {
                    // Toggle video play/pause
                    const iframe = document.getElementById('videoPlayer');
                    if (iframe) {
                        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                    }
                }
            }
            
            // Escape to close video
            if (e.key === 'Escape') {
                this.closeVideoModal();
            }
            
            // W to toggle watchlist
            if (e.key === 'w' || e.key === 'W') {
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    window.toggleWatchlist();
                }
            }
            
            // F to toggle favorite
            if (e.key === 'f' || e.key === 'F') {
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    window.toggleFavorite();
                }
            }
            
            // R to open review modal
            if (e.key === 'r' || e.key === 'R') {
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    this.openReviewModal();
                }
            }
        });
    }
    
    // Cleanup
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        
        // Clear any intervals or timeouts
        // (none in this implementation)
    }
}

// Initialize movie detail manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('movie-detail.html')) {
        window.movieDetailManager = new MovieDetailManager();
        window.movieDetailManager.setupKeyboardShortcuts();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.movieDetailManager) {
        window.movieDetailManager.destroy();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MovieDetailManager;
}