/**
 * Movie Card Component
 * Handles individual movie/TV show card rendering and interactions
 */

class MovieCardComponent {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouch = false;
    }

    createCard(content, options = {}) {
        const {
            showActions = true,
            showRating = true,
            size = 'normal', // normal, large, small
            layout = 'vertical' // vertical, horizontal
        } = options;

        const cardClass = this.getCardClass(size, layout);
        const posterHeight = this.getPosterHeight(size);
        
        const card = document.createElement('div');
        card.className = `movie-card ${cardClass}`;
        card.dataset.contentId = content.id;
        card.dataset.tmdbId = content.tmdb_id;

        card.innerHTML = `
            <div class="movie-card-inner">
                <img src="${apiService.getImageUrl(content.poster_path)}" 
                     alt="${content.title || content.name}"
                     class="movie-poster" 
                     style="height: ${posterHeight}px"
                     loading="lazy"
                     onerror="this.src='assets/images/placeholder.jpg'">
                
                <div class="movie-info">
                    <h3 class="movie-title">${content.title || content.name}</h3>
                    
                    <div class="movie-meta">
                        <span class="release-year">${apiService.formatDate(content.release_date || content.first_air_date)}</span>
                        ${content.content_type ? `<span class="content-type">${content.content_type.toUpperCase()}</span>` : ''}
                    </div>

                    ${showRating && content.rating ? `
                        <div class="movie-rating">
                            <i class="fas fa-star"></i>
                            <span>${apiService.formatRating(content.rating)}</span>
                        </div>
                    ` : ''}

                    ${content.genre_names && content.genre_names.length > 0 ? `
                        <div class="movie-genres">
                            ${content.genre_names.slice(0, 2).map(genre => 
                                `<span class="genre-tag">${genre}</span>`
                            ).join('')}
                        </div>
                    ` : ''}

                    ${showActions ? this.createActionButtons(content) : ''}
                </div>

                <div class="movie-overlay">
                    <button class="btn btn-netflix btn-sm play-btn" data-action="play">
                        <i class="fas fa-play me-1"></i>Details
                    </button>
                </div>
            </div>
        `;

        this.setupCardEventListeners(card, content);
        return card;
    }

    createActionButtons(content) {
        const isFavorite = storageService.isFavorite(content.id);
        const isInWatchlist = storageService.isInWatchlist(content.id);

        return `
            <div class="movie-actions">
                <button class="action-btn ${isFavorite ? 'active' : ''}" 
                        data-action="favorite" 
                        title="Add to Favorites"
                        aria-label="Add to Favorites">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="action-btn ${isInWatchlist ? 'active' : ''}" 
                        data-action="watchlist" 
                        title="Add to Watchlist"
                        aria-label="Add to Watchlist">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="action-btn" 
                        data-action="share" 
                        title="Share"
                        aria-label="Share">
                    <i class="fas fa-share-alt"></i>
                </button>
                <button class="action-btn" 
                        data-action="info" 
                        title="More Info"
                        aria-label="More Info">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        `;
    }

    setupCardEventListeners(card, content) {
        // Click handler for card
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn') && !e.target.closest('.play-btn')) {
                this.handleCardClick(content);
            }
        });

        // Touch handling for mobile
        card.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        card.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

        // Action button handlers
        card.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleActionClick(e.target.closest('.action-btn'), content);
            });
        });

        // Play button handler
        const playBtn = card.querySelector('.play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleCardClick(content);
            });
        }

        // Keyboard navigation
        card.setAttribute('tabindex', '0');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleCardClick(content);
            }
        });
    }

    handleTouchStart(e) {
        this.isTouch = true;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        if (!this.isTouch) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = Math.abs(touchEndX - this.touchStartX);
        const deltaY = Math.abs(touchEndY - this.touchStartY);

        // If it's a tap (not a swipe)
        if (deltaX < 10 && deltaY < 10) {
            // Let the click handler manage it
        }

        this.isTouch = false;
    }

    handleCardClick(content) {
        // Record view interaction
        if (authService.isAuthenticated()) {
            apiService.recordInteraction(content.id, 'view');
        }

        // Add to watch history
        storageService.addToWatchHistory(content.id, content);

        // Show content details modal
        if (window.ModalComponent) {
            window.ModalComponent.showContentDetails(content.id, content.tmdb_id);
        }
    }

    async handleActionClick(button, content) {
        const action = button.dataset.action;
        button.classList.add('loading');

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
                case 'info':
                    this.handleCardClick(content);
                    break;
            }
        } catch (error) {
            console.error(`Action ${action} failed:`, error);
            this.showToast('Action failed. Please try again.', 'error');
        } finally {
            button.classList.remove('loading');
        }
    }

    async toggleFavorite(button, content) {
        const isFavorite = button.classList.contains('active');
        
        if (isFavorite) {
            storageService.removeFromFavorites(content.id);
            button.classList.remove('active');
            this.showToast('Removed from favorites', 'info');
        } else {
            storageService.addToFavorites(content.id, content);
            button.classList.add('active');
            this.showToast('Added to favorites', 'success');
        }

        // Record interaction with backend
        if (authService.isAuthenticated()) {
            const interactionType = isFavorite ? 'unfavorite' : 'favorite';
            await apiService.recordInteraction(content.id, interactionType);
        }

        // Trigger animation
        this.animateButton(button);
    }

    async toggleWatchlist(button, content) {
        const isInWatchlist = button.classList.contains('active');
        
        if (isInWatchlist) {
            storageService.removeFromWatchlist(content.id);
            button.classList.remove('active');
            this.showToast('Removed from watchlist', 'info');
        } else {
            storageService.addToWatchlist(content.id, content);
            button.classList.add('active');
            this.showToast('Added to watchlist', 'success');
        }

        // Record interaction with backend
        if (authService.isAuthenticated()) {
            const interactionType = isInWatchlist ? 'unwatchlist' : 'watchlist';
            await apiService.recordInteraction(content.id, interactionType);
        }

        // Trigger animation
        this.animateButton(button);
    }

    async shareContent(content) {
        const shareData = {
            title: content.title || content.name,
            text: `Check out "${content.title || content.name}" on MovieFlix!`,
            url: `${window.location.origin}/?content=${content.id}`
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                this.showToast('Content shared successfully!', 'success');
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
        // Copy link to clipboard
        navigator.clipboard.writeText(shareData.url).then(() => {
            this.showToast('Link copied to clipboard!', 'success');
        }).catch(() => {
            // Manual copy fallback
            const textArea = document.createElement('textarea');
            textArea.value = shareData.url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Link copied to clipboard!', 'success');
        });
    }

    animateButton(button) {
        button.style.transform = 'scale(1.2)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
    }

    getCardClass(size, layout) {
        let classes = '';
        
        if (size === 'large') classes += 'movie-card-large ';
        if (size === 'small') classes += 'movie-card-small ';
        if (layout === 'horizontal') classes += 'movie-card-horizontal ';
        
        return classes.trim();
    }

    getPosterHeight(size) {
        switch (size) {
            case 'large': return 400;
            case 'small': return 200;
            default: return 300;
        }
    }

    createLoadingSkeleton(count = 5) {
        const container = document.createElement('div');
        container.className = 'content-row';
        
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'movie-card-skeleton loading-skeleton';
            container.appendChild(skeleton);
        }
        
        return container;
    }

    showToast(message, type) {
        if (authService.showToast) {
            authService.showToast(message, type);
        }
    }

    // Utility methods for different card types
    createHorizontalCard(content) {
        return this.createCard(content, { layout: 'horizontal' });
    }

    createLargeCard(content) {
        return this.createCard(content, { size: 'large' });
    }

    createSmallCard(content) {
        return this.createCard(content, { size: 'small', showActions: false });
    }
}

// Export singleton instance
window.MovieCardComponent = new MovieCardComponent();
