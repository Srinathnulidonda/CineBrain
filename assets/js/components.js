// Reusable Component Classes

class MovieCard {
    constructor(movie, options = {}) {
        this.movie = movie;
        this.options = {
            showRating: true,
            showGenres: true,
            showYear: true,
            size: 'medium',
            enhanced: false,
            ...options
        };
    }
    
    render() {
        const year = this.movie.release_date ? new Date(this.movie.release_date).getFullYear() : '';
        const rating = this.movie.rating ? this.movie.rating.toFixed(1) : 'N/A';
        const posterUrl = this.movie.poster_path || '/assets/images/placeholder.jpg';
        
        if (this.options.enhanced) {
            return this.renderEnhanced();
        }
        
        return `
            <div class="movie-card ${this.options.size}" data-movie-id="${this.movie.id}">
                <div class="movie-poster">
                    <img src="${posterUrl}" alt="${this.movie.title}" loading="lazy" onerror="this.src='/assets/images/placeholder.jpg'">
                    <div class="movie-overlay">
                        <button class="play-btn" onclick="movieActions.play(${this.movie.id})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="wishlist-btn" onclick="movieActions.toggleWishlist(${this.movie.id})">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
                <div class="movie-info">
                    <h3 class="movie-title" title="${this.movie.title}">${this.movie.title}</h3>
                    <div class="movie-meta">
                        ${this.options.showRating ? `
                            <div class="movie-rating">
                                <i class="fas fa-star star"></i>
                                <span>${rating}</span>
                            </div>
                        ` : ''}
                        ${this.options.showYear && year ? `<span>${year}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderEnhanced() {
        const year = this.movie.release_date ? new Date(this.movie.release_date).getFullYear() : '';
        const rating = this.movie.rating ? this.movie.rating.toFixed(1) : 'N/A';
        const posterUrl = this.movie.poster_path || '/assets/images/placeholder.jpg';
        const genres = this.movie.genre_names || [];
        
        return `
            <div class="enhanced-movie-card" data-movie-id="${this.movie.id}">
                ${this.movie.admin_title ? `
                    <div class="card-badge">Editor's Pick</div>
                ` : ''}
                <div class="card-actions">
                    <button class="action-btn" onclick="movieActions.toggleFavorite(${this.movie.id})" title="Add to Favorites">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="action-btn" onclick="movieActions.toggleWishlist(${this.movie.id})" title="Add to Wishlist">
                        <i class="fas fa-bookmark"></i>
                    </button>
                    <button class="action-btn" onclick="movieActions.share(${this.movie.id})" title="Share">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
                <div class="movie-poster">
                    <img src="${posterUrl}" alt="${this.movie.title}" loading="lazy" onerror="this.src='/assets/images/placeholder.jpg'">
                </div>
                <div class="movie-info">
                    <h3 class="movie-title" title="${this.movie.title}">${this.movie.title}</h3>
                    ${this.movie.admin_description ? `
                        <p class="admin-description">${this.movie.admin_description}</p>
                    ` : ''}
                    <div class="movie-meta">
                        <div class="movie-rating">
                            <i class="fas fa-star star"></i>
                            <span>${rating}</span>
                        </div>
                        ${year ? `<span>${year}</span>` : ''}
                    </div>
                    ${genres.length > 0 ? `
                        <div class="movie-genres">
                            ${genres.slice(0, 2).map(g => `<span class="genre-tag">${g}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${this.movie.custom_tags ? `
                        <div class="admin-card-tags">
                            ${this.movie.custom_tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

class Carousel {
    constructor(containerId, items, itemRenderer) {
        this.container = document.getElementById(containerId);
        this.items = items;
        this.itemRenderer = itemRenderer;
        this.currentIndex = 0;
        this.itemsPerPage = this.calculateItemsPerPage();
    }
    
    calculateItemsPerPage() {
        const containerWidth = window.innerWidth;
        if (containerWidth < 576) return 2;
        if (containerWidth < 768) return 3;
        if (containerWidth < 992) return 4;
        if (containerWidth < 1200) return 5;
        return 6;
    }
    
    render() {
        if (!this.container || !this.items.length) return;
        
        const totalPages = Math.ceil(this.items.length / this.itemsPerPage);
        const showNavigation = totalPages > 1;
        
        const carouselHTML = `
            <div class="carousel-wrapper">
                ${showNavigation ? `
                    <button class="carousel-nav prev" onclick="carousels['${this.container.id}'].navigate(-1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                ` : ''}
                <div class="carousel-track">
                    ${this.items.map(item => this.itemRenderer(item)).join('')}
                </div>
                ${showNavigation ? `
                    <button class="carousel-nav next" onclick="carousels['${this.container.id}'].navigate(1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        this.container.innerHTML = carouselHTML;
        
        // Store reference for navigation
        if (!window.carousels) window.carousels = {};
        window.carousels[this.container.id] = this;
    }
    
    navigate(direction) {
        const track = this.container.querySelector('.carousel-track');
        const totalPages = Math.ceil(this.items.length / this.itemsPerPage);
        
        this.currentIndex += direction;
        
        if (this.currentIndex < 0) {
            this.currentIndex = totalPages - 1;
        } else if (this.currentIndex >= totalPages) {
            this.currentIndex = 0;
        }
        
        const translateX = -this.currentIndex * 100;
        track.style.transform = `translateX(${translateX}%)`;
    }
}

class Modal {
    constructor(options = {}) {
        this.options = {
            title: '',
            content: '',
            size: 'medium',
            closeOnBackdrop: true,
            onClose: null,
            ...options
        };
        this.isOpen = false;
    }
    
    render() {
        return `
            <div class="modal-backdrop" onclick="modals.handleBackdropClick(event)">
                <div class="modal ${this.options.size}" onclick="event.stopPropagation()">
                    ${this.options.title ? `
                        <div class="modal-header">
                            <h3 class="modal-title">${this.options.title}</h3>
                            <button class="modal-close" onclick="modals.close()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ` : ''}
                    <div class="modal-body">
                        ${this.options.content}
                    </div>
                    ${this.options.footer ? `
                        <div class="modal-footer">
                            ${this.options.footer}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    show() {
        if (this.isOpen) return;
        
        document.body.insertAdjacentHTML('beforeend', this.render());
        document.body.classList.add('modal-open');
        this.isOpen = true;
        
        // Store reference
        if (!window.modals) window.modals = {};
        window.modals.current = this;
        window.modals.close = () => this.hide();
        window.modals.handleBackdropClick = (e) => {
            if (this.options.closeOnBackdrop && e.target.classList.contains('modal-backdrop')) {
                this.hide();
            }
        };
    }
    
    hide() {
        const modal = document.querySelector('.modal-backdrop');
        if (modal) {
            modal.remove();
            document.body.classList.remove('modal-open');
            this.isOpen = false;
            
            if (this.options.onClose) {
                this.options.onClose();
            }
        }
    }
}

class Toast {
    constructor(message, type = 'info', duration = 3000) {
        this.message = message;
        this.type = type;
        this.duration = duration;
    }
    
    show() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${this.type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getIcon()}"></i>
                <span>${this.message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, this.duration);
    }
    
    getIcon() {
        switch (this.type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Movie Actions
window.movieActions = {
    async play(movieId) {
        try {
            const details = await api.getContentDetails(movieId);
            
            if (details.youtube_videos && details.youtube_videos.trailers.length > 0) {
                const trailer = details.youtube_videos.trailers[0];
                const modal = new Modal({
                    title: details.content.title,
                    content: `
                        <div class="video-container">
                            <iframe src="https://www.youtube.com/embed/${trailer.video_id}" 
                                    frameborder="0" 
                                    allowfullscreen></iframe>
                        </div>
                    `,
                    size: 'large'
                });
                modal.show();
            } else {
                new Toast('No trailer available', 'warning').show();
            }
            
            // Record interaction
            if (auth.isAuthenticated) {
                api.recordInteraction({
                    content_id: movieId,
                    interaction_type: 'view'
                });
            }
        } catch (error) {
            new Toast('Failed to load video', 'error').show();
        }
    },
    
    async toggleWishlist(movieId) {
        if (!auth.requireAuth()) return;
        
        try {
            await api.recordInteraction({
                content_id: movieId,
                interaction_type: 'wishlist'
            });
            new Toast('Added to wishlist', 'success').show();
        } catch (error) {
            new Toast('Failed to update wishlist', 'error').show();
        }
    },
    
    async toggleFavorite(movieId) {
        if (!auth.requireAuth()) return;
        
        try {
            await api.recordInteraction({
                content_id: movieId,
                interaction_type: 'favorite'
            });
            new Toast('Added to favorites', 'success').show();
        } catch (error) {
            new Toast('Failed to update favorites', 'error').show();
        }
    },
    
    async share(movieId) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this movie!',
                    url: `${window.location.origin}/movie-detail.html?id=${movieId}`
                });
            } catch (error) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback - copy to clipboard
            const url = `${window.location.origin}/movie-detail.html?id=${movieId}`;
            navigator.clipboard.writeText(url);
            new Toast('Link copied to clipboard', 'success').show();
        }
    },
    
    showDetails(movieId) {
        window.location.href = `/movie-detail.html?id=${movieId}`;
    }
};

// Loading Skeleton
class LoadingSkeleton {
    static movieCard() {
        return `
            <div class="skeleton-card">
                <div class="skeleton-poster"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-meta"></div>
                </div>
            </div>
        `;
    }
    
    static hero() {
        return `
            <div class="skeleton-hero">
                <div class="skeleton-hero-content">
                    <div class="skeleton-hero-title"></div>
                    <div class="skeleton-hero-description"></div>
                    <div class="skeleton-hero-actions">
                        <div class="skeleton-button"></div>
                        <div class="skeleton-button"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    static grid(count = 6) {
        return Array(count).fill(null).map(() => this.movieCard()).join('');
    }
}