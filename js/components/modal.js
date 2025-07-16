/**
 * Modal Component
 * Handles content details modal, trailers, and other modal interactions
 */

class ModalComponent {
    constructor() {
        this.currentModal = null;
        this.currentContent = null;
        this.init();
    }

    init() {
        this.createModalContainer();
        this.setupEventListeners();
    }

    createModalContainer() {
        const container = document.getElementById('modalContainer');
        if (!container) {
            const modalContainer = document.createElement('div');
            modalContainer.id = 'modalContainer';
            document.body.appendChild(modalContainer);
        }
    }

    setupEventListeners() {
        // Listen for modal close events
        document.addEventListener('hidden.bs.modal', (e) => {
            if (e.target.id === 'contentDetailsModal') {
                this.currentModal = null;
                this.currentContent = null;
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.currentModal && e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async showContentDetails(contentId, tmdbId) {
        try {
            this.showLoadingModal();
            
            // Fetch content details
            const response = await apiService.getContentDetails(contentId);
            
            if (!response.success) {
                throw new Error(response.error);
            }

            this.currentContent = response.data;
            this.renderContentDetailsModal(response.data);
            
        } catch (error) {
            console.error('Failed to load content details:', error);
            this.showErrorModal('Failed to load content details. Please try again.');
        }
    }

    showLoadingModal() {
        const modalHtml = `
            <div class="modal fade" id="contentDetailsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-body text-center p-5">
                            <div class="spinner-border text-netflix-red" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <h5 class="mt-3">Loading details...</h5>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderModal(modalHtml);
    }

    renderContentDetailsModal(data) {
        const { content, tmdb_details, youtube_videos, user_reviews, similar_content } = data;
        
        const modalHtml = `
            <div class="modal fade" id="contentDetailsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header border-0">
                            <h5 class="modal-title">${content.title || content.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-0">
                            ${this.renderContentHeader(content, tmdb_details)}
                            ${this.renderContentTabs(content, tmdb_details, youtube_videos, user_reviews, similar_content)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderModal(modalHtml);
        this.setupContentModalEventListeners(content);
    }

    renderContentHeader(content, tmdbDetails) {
        const backdrop = content.backdrop_path || content.poster_path;
        const overview = content.overview || tmdbDetails.overview || 'No description available.';
        const genres = content.genre_names || [];
        const rating = content.rating || tmdbDetails.vote_average;
        const runtime = content.runtime || tmdbDetails.runtime;
        const releaseDate = content.release_date || tmdbDetails.release_date || tmdbDetails.first_air_date;

        return `
            <div class="content-header position-relative">
                ${backdrop ? `
                    <img src="${apiService.getImageUrl(backdrop, 'w1280')}" 
                         alt="${content.title}" 
                         class="movie-details-backdrop">
                ` : ''}
                
                <div class="content-header-overlay position-absolute bottom-0 start-0 end-0 p-4" 
                     style="background: linear-gradient(transparent, rgba(0,0,0,0.9));">
                    
                    <div class="row">
                        <div class="col-md-3">
                            <img src="${apiService.getImageUrl(content.poster_path)}" 
                                 alt="${content.title}" 
                                 class="img-fluid rounded shadow"
                                 style="max-height: 300px;">
                        </div>
                        
                        <div class="col-md-9">
                            <h2 class="text-white mb-3">${content.title}</h2>
                            
                            <div class="movie-details-meta mb-3">
                                ${rating ? `
                                    <div class="me-4">
                                        <span class="text-gold">
                                            <i class="fas fa-star"></i> ${apiService.formatRating(rating)}
                                        </span>
                                    </div>
                                ` : ''}
                                
                                ${releaseDate ? `
                                    <div class="me-4">
                                        <i class="fas fa-calendar text-netflix-light-gray"></i>
                                        <span class="ms-1">${apiService.formatDate(releaseDate)}</span>
                                    </div>
                                ` : ''}
                                
                                ${runtime ? `
                                    <div class="me-4">
                                        <i class="fas fa-clock text-netflix-light-gray"></i>
                                        <span class="ms-1">${runtime} min</span>
                                    </div>
                                ` : ''}
                                
                                <div>
                                    <i class="fas fa-tag text-netflix-light-gray"></i>
                                    <span class="ms-1">${content.content_type || 'Movie'}</span>
                                </div>
                            </div>

                            ${genres.length > 0 ? `
                                <div class="movie-genres mb-3">
                                    ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                                </div>
                            ` : ''}

                            <p class="text-netflix-light-gray mb-4">${overview}</p>

                            <div class="action-buttons">
                                ${this.renderActionButtons(content)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderActionButtons(content) {
        const isFavorite = storageService.isFavorite(content.id);
        const isInWatchlist = storageService.isInWatchlist(content.id);

        return `
            <button class="btn btn-netflix me-2" data-action="play">
                <i class="fas fa-play me-2"></i>Watch Trailer
            </button>
            
            <button class="btn btn-outline-light me-2 ${isFavorite ? 'active' : ''}" 
                    data-action="favorite" data-content-id="${content.id}">
                <i class="fas fa-heart me-2"></i>
                ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>
            
            <button class="btn btn-outline-light me-2 ${isInWatchlist ? 'active' : ''}" 
                    data-action="watchlist" data-content-id="${content.id}">
                <i class="fas fa-plus me-2"></i>
                ${isInWatchlist ? 'Remove from List' : 'Add to List'}
            </button>
            
            <button class="btn btn-outline-light" data-action="share">
                <i class="fas fa-share-alt me-2"></i>Share
            </button>
        `;
    }

    renderContentTabs(content, tmdbDetails, youtubeVideos, userReviews, similarContent) {
        return `
            <div class="container-fluid p-4">
                <ul class="nav nav-tabs border-0 mb-4" id="contentTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active bg-transparent text-white border-0" 
                                id="overview-tab" data-bs-toggle="tab" data-bs-target="#overview" 
                                type="button" role="tab">Overview</button>
                    </li>
                    
                    ${youtubeVideos && (youtubeVideos.trailers?.length > 0 || youtubeVideos.teasers?.length > 0) ? `
                        <li class="nav-item" role="presentation">
                            <button class="nav-link bg-transparent text-white border-0" 
                                    id="videos-tab" data-bs-toggle="tab" data-bs-target="#videos" 
                                    type="button" role="tab">Videos</button>
                        </li>
                    ` : ''}
                    
                    ${tmdbDetails && tmdbDetails.credits ? `
                        <li class="nav-item" role="presentation">
                            <button class="nav-link bg-transparent text-white border-0" 
                                    id="cast-tab" data-bs-toggle="tab" data-bs-target="#cast" 
                                    type="button" role="tab">Cast</button>
                        </li>
                    ` : ''}
                    
                    ${userReviews && userReviews.length > 0 ? `
                        <li class="nav-item" role="presentation">
                            <button class="nav-link bg-transparent text-white border-0" 
                                    id="reviews-tab" data-bs-toggle="tab" data-bs-target="#reviews" 
                                    type="button" role="tab">Reviews</button>
                        </li>
                    ` : ''}
                    
                    ${similarContent && similarContent.length > 0 ? `
                        <li class="nav-item" role="presentation">
                            <button class="nav-link bg-transparent text-white border-0" 
                                    id="similar-tab" data-bs-toggle="tab" data-bs-target="#similar" 
                                    type="button" role="tab">More Like This</button>
                        </li>
                    ` : ''}
                </ul>

                <div class="tab-content" id="contentTabsContent">
                    <div class="tab-pane fade show active" id="overview" role="tabpanel">
                        ${this.renderOverviewTab(content, tmdbDetails)}
                    </div>
                    
                    ${youtubeVideos ? `
                        <div class="tab-pane fade" id="videos" role="tabpanel">
                            ${this.renderVideosTab(youtubeVideos)}
                        </div>
                    ` : ''}
                    
                    ${tmdbDetails && tmdbDetails.credits ? `
                        <div class="tab-pane fade" id="cast" role="tabpanel">
                            ${this.renderCastTab(tmdbDetails.credits)}
                        </div>
                    ` : ''}
                    
                    ${userReviews ? `
                        <div class="tab-pane fade" id="reviews" role="tabpanel">
                            ${this.renderReviewsTab(userReviews)}
                        </div>
                    ` : ''}
                    
                    ${similarContent ? `
                        <div class="tab-pane fade" id="similar" role="tabpanel">
                            ${this.renderSimilarTab(similarContent)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderOverviewTab(content, tmdbDetails) {
        const productionCompanies = tmdbDetails?.production_companies || [];
        const spokenLanguages = tmdbDetails?.spoken_languages || [];
        const budget = tmdbDetails?.budget;
        const revenue = tmdbDetails?.revenue;

        return `
            <div class="row">
                <div class="col-md-8">
                    <h5 class="text-white mb-3">Storyline</h5>
                    <p class="text-netflix-light-gray mb-4">
                        ${content.overview || tmdbDetails?.overview || 'No storyline available.'}
                    </p>
                    
                    ${tmdbDetails?.tagline ? `
                        <blockquote class="blockquote text-netflix-red mb-4">
                            <p class="mb-0">"${tmdbDetails.tagline}"</p>
                        </blockquote>
                    ` : ''}
                </div>
                
                <div class="col-md-4">
                    <div class="details-sidebar">
                        ${productionCompanies.length > 0 ? `
                            <div class="mb-3">
                                <h6 class="text-white">Production Companies</h6>
                                <p class="text-netflix-light-gray small">
                                    ${productionCompanies.map(company => company.name).join(', ')}
                                </p>
                            </div>
                        ` : ''}
                        
                        ${spokenLanguages.length > 0 ? `
                            <div class="mb-3">
                                <h6 class="text-white">Languages</h6>
                                <p class="text-netflix-light-gray small">
                                    ${spokenLanguages.map(lang => lang.english_name).join(', ')}
                                </p>
                            </div>
                        ` : ''}
                        
                        ${budget ? `
                            <div class="mb-3">
                                <h6 class="text-white">Budget</h6>
                                <p class="text-netflix-light-gray small">
                                    $${budget.toLocaleString()}
                                </p>
                            </div>
                        ` : ''}
                        
                        ${revenue ? `
                            <div class="mb-3">
                                <h6 class="text-white">Revenue</h6>
                                <p class="text-netflix-light-gray small">
                                    $${revenue.toLocaleString()}
                                </p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderVideosTab(youtubeVideos) {
        const allVideos = [...(youtubeVideos.trailers || []), ...(youtubeVideos.teasers || [])];
        
        return `
            <div class="row">
                ${allVideos.map(video => `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="video-card">
                            <div class="video-thumbnail position-relative">
                                <img src="${video.thumbnail}" 
                                     alt="${video.title}" 
                                     class="img-fluid rounded">
                                <div class="video-overlay position-absolute top-50 start-50 translate-middle">
                                    <button class="btn btn-netflix rounded-circle" 
                                            data-video-url="${video.url}"
                                            onclick="window.open('${video.url}', '_blank')">
                                        <i class="fas fa-play"></i>
                                    </button>
                                </div>
                            </div>
                            <h6 class="text-white mt-2">${video.title}</h6>
                            <small class="text-netflix-light-gray">${video.type}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCastTab(credits) {
        const cast = credits.cast?.slice(0, 12) || [];
        const crew = credits.crew?.filter(person => 
            ['Director', 'Producer', 'Writer', 'Screenplay'].includes(person.job)
        ).slice(0, 6) || [];

        return `
            <div class="row">
                <div class="col-12">
                    <h5 class="text-white mb-3">Cast</h5>
                    <div class="row mb-4">
                        ${cast.map(person => `
                            <div class="col-md-3 col-sm-4 col-6 mb-3">
                                <div class="cast-card text-center">
                                    <img src="${person.profile_path ? 
                                        apiService.getImageUrl(person.profile_path, 'w185') : 
                                        'assets/images/placeholder.jpg'}" 
                                         alt="${person.name}" 
                                         class="img-fluid rounded-circle mb-2"
                                         style="width: 80px; height: 80px; object-fit: cover;">
                                    <h6 class="text-white small mb-1">${person.name}</h6>
                                    <small class="text-netflix-light-gray">${person.character}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${crew.length > 0 ? `
                        <h5 class="text-white mb-3">Crew</h5>
                        <div class="row">
                            ${crew.map(person => `
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <div class="crew-card">
                                        <h6 class="text-white mb-1">${person.name}</h6>
                                        <small class="text-netflix-light-gray">${person.job}</small>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderReviewsTab(reviews) {
        return `
            <div class="reviews-container">
                ${reviews.map(review => `
                    <div class="review-card mb-4 p-3 rounded" style="background: rgba(255,255,255,0.05);">
                        <div class="d-flex align-items-center mb-2">
                            <div class="review-avatar me-3">
                                <div class="bg-netflix-red rounded-circle d-flex align-items-center justify-content-center" 
                                     style="width: 40px; height: 40px;">
                                    ${review.username.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div>
                                <h6 class="text-white mb-0">${review.username}</h6>
                                <div class="rating">
                                    ${[1,2,3,4,5].map(star => `
                                        <i class="fas fa-star ${star <= review.rating ? 'text-gold' : 'text-muted'}"></i>
                                    `).join('')}
                                </div>
                            </div>
                            <small class="text-netflix-light-gray ms-auto">
                                ${new Date(review.created_at).toLocaleDateString()}
                            </small>
                        </div>
                    </div>
                `).join('')}
                
                ${authService.isAuthenticated() ? `
                    <div class="add-review-card mt-4 p-3 rounded" style="background: rgba(255,255,255,0.05);">
                        <h6 class="text-white mb-3">Rate this ${this.currentContent?.content?.content_type || 'movie'}</h6>
                        <div class="rating-input mb-3">
                            ${[1,2,3,4,5].map(star => `
                                <i class="fas fa-star rating-star" data-rating="${star}"></i>
                            `).join('')}
                        </div>
                        <button class="btn btn-netflix" id="submitRating">Submit Rating</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderSimilarTab(similarContent) {
        return `
            <div class="similar-content">
                <div class="row">
                    ${similarContent.map(content => `
                        <div class="col-md-3 col-sm-4 col-6 mb-4">
                            <div class="similar-card cursor-pointer" data-content-id="${content.id}">
                                <img src="${apiService.getImageUrl(content.poster_path)}" 
                                     alt="${content.title}" 
                                     class="img-fluid rounded mb-2">
                                <h6 class="text-white small mb-1">${content.title}</h6>
                                <small class="text-netflix-light-gray">
                                    ${apiService.formatDate(content.release_date)} • 
                                    ${apiService.formatRating(content.rating)}⭐
                                </small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupContentModalEventListeners(content) {
        // Action buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleModalAction(e.target, content);
            });
        });

        // Rating stars
        document.querySelectorAll('.rating-star').forEach(star => {
            star.addEventListener('click', (e) => {
                this.handleRatingClick(e.target);
            });
        });

        // Submit rating
        const submitBtn = document.getElementById('submitRating');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitRating(content);
            });
        }

        // Similar content clicks
        document.querySelectorAll('.similar-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const contentId = e.currentTarget.dataset.contentId;
                this.showContentDetails(contentId);
            });
        });
    }

    async handleModalAction(button, content) {
        const action = button.dataset.action;
        
        try {
            switch (action) {
                case 'favorite':
                    await this.toggleFavorite(button, content);
                    break;
                case 'watchlist':
                    await this.toggleWatchlist(button, content);
                    break;
                case 'share':
                    await this.shareContent(content);
                    break;
                case 'play':
                    this.playTrailer(content);
                    break;
            }
        } catch (error) {
            console.error(`Modal action ${action} failed:`, error);
        }
    }

    async toggleFavorite(button, content) {
        const isFavorite = button.classList.contains('active');
        
        if (isFavorite) {
            storageService.removeFromFavorites(content.id);
            button.classList.remove('active');
            button.innerHTML = '<i class="fas fa-heart me-2"></i>Add to Favorites';
        } else {
            storageService.addToFavorites(content.id, content);
            button.classList.add('active');
            button.innerHTML = '<i class="fas fa-heart me-2"></i>Remove from Favorites';
        }

        if (authService.isAuthenticated()) {
            await apiService.recordInteraction(content.id, isFavorite ? 'unfavorite' : 'favorite');
        }
    }

    async toggleWatchlist(button, content) {
        const isInWatchlist = button.classList.contains('active');
        
        if (isInWatchlist) {
            storageService.removeFromWatchlist(content.id);
            button.classList.remove('active');
            button.innerHTML = '<i class="fas fa-plus me-2"></i>Add to List';
        } else {
            storageService.addToWatchlist(content.id, content);
            button.classList.add('active');
            button.innerHTML = '<i class="fas fa-plus me-2"></i>Remove from List';
        }

        if (authService.isAuthenticated()) {
            await apiService.recordInteraction(content.id, isInWatchlist ? 'unwatchlist' : 'watchlist');
        }
    }

    async shareContent(content) {
        const shareData = {
            title: content.title,
            text: `Check out "${content.title}" on MovieFlix!`,
            url: `${window.location.origin}/?content=${content.id}`
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.fallbackShare(shareData);
                }
            }
        } else {
            this.fallbackShare(shareData);
        }
    }

    fallbackShare(shareData) {
        navigator.clipboard.writeText(shareData.url).then(() => {
            this.showToast('Link copied to clipboard!', 'success');
        });
    }

    playTrailer(content) {
        // This would integrate with the videos tab or external player
        const videosTab = document.getElementById('videos-tab');
        if (videosTab) {
            videosTab.click();
        }
    }

    handleRatingClick(star) {
        const rating = parseInt(star.dataset.rating);
        const stars = document.querySelectorAll('.rating-star');
        
        stars.forEach((s, index) => {
            if (index < rating) {
                s.classList.add('text-gold');
                s.classList.remove('text-muted');
            } else {
                s.classList.add('text-muted');
                s.classList.remove('text-gold');
            }
        });
        
        this.selectedRating = rating;
    }

    async submitRating(content) {
        if (!this.selectedRating) {
            this.showToast('Please select a rating', 'error');
            return;
        }

        try {
            await apiService.recordInteraction(content.id, 'rating', this.selectedRating);
            this.showToast('Rating submitted successfully!', 'success');
            
            // Refresh the modal to show the new rating
            setTimeout(() => {
                this.showContentDetails(content.id);
            }, 1000);
            
        } catch (error) {
            this.showToast('Failed to submit rating', 'error');
        }
    }

    showErrorModal(message) {
        const modalHtml = `
            <div class="modal fade" id="contentDetailsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-body text-center p-5">
                            <i class="fas fa-exclamation-circle text-danger mb-3" style="font-size: 3rem;"></i>
                            <h5 class="text-white mb-3">Error</h5>
                            <p class="text-netflix-light-gray">${message}</p>
                            <button type="button" class="btn btn-netflix" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderModal(modalHtml);
    }

    renderModal(html) {
        const container = document.getElementById('modalContainer');
        container.innerHTML = html;
        
        const modal = new bootstrap.Modal(document.getElementById('contentDetailsModal'));
        modal.show();
        
        this.currentModal = modal;
    }

    closeModal() {
        if (this.currentModal) {
            this.currentModal.hide();
        }
    }

    showToast(message, type) {
        if (authService.showToast) {
            authService.showToast(message, type);
        }
    }
}

// Export singleton instance
window.ModalComponent = new ModalComponent();