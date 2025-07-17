// UI Components Library
class UIComponents {
    // Create movie card component
    static createMovieCard(movie, options = {}) {
        const {
            showActions = true,
            size = 'normal',
            onAction = null
        } = options;

        const cardElement = document.createElement('div');
        cardElement.className = `movie-card ${size}`;
        cardElement.dataset.movieId = movie.id;

        const posterUrl = Utils.getImageUrl(movie.poster_path);
        const rating = Utils.formatRating(movie.rating);
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        const genres = movie.genre_names?.slice(0, 3) || [];

        cardElement.innerHTML = `
            <div class="movie-card-image">
                <img src="${posterUrl}" alt="${movie.title}" loading="lazy" onerror="this.src='/assets/images/no-poster.jpg'">
                ${showActions ? `
                <div class="movie-card-overlay">
                    <div class="movie-card-actions">
                        <button class="action-btn" data-action="play" title="Play">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                        <button class="action-btn" data-action="favorite" title="Add to Favorites">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                        </button>
                        <button class="action-btn" data-action="watchlist" title="Add to Watchlist">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="movie-card-content">
                <h3 class="movie-card-title">${movie.title}</h3>
                <div class="movie-card-meta">
                    ${rating ? `
                    <div class="movie-card-rating">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span>${rating}</span>
                    </div>
                    ` : ''}
                    ${year ? `<span class="movie-card-year">${year}</span>` : ''}
                </div>
                ${genres.length > 0 ? `
                <div class="movie-card-genres">
                    ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                </div>
                ` : ''}
                ${movie.overview ? `
                <p class="movie-card-overview">${Utils.truncateText(movie.overview, 120)}</p>
                ` : ''}
            </div>
        `;

        // Add event listeners
        if (showActions && onAction) {
            const actionButtons = cardElement.querySelectorAll('.action-btn');
            actionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = button.dataset.action;
                    onAction(action, movie);
                });
            });
        }

        // Add click handler for card
        cardElement.addEventListener('click', () => {
            window.location.href = `movie-detail.html?id=${movie.id}`;
        });

        return cardElement;
    }

    // Create continue watching card
    static createContinueWatchingCard(item) {
        const cardElement = document.createElement('div');
        cardElement.className = 'continue-watching-card';
        cardElement.dataset.movieId = item.id;

        const backdropUrl = Utils.getBackdropUrl(item.backdrop_path);
        const progress = item.progress || Math.random() * 80 + 10; // Mock progress if not available

        cardElement.innerHTML = `
            <div class="continue-watching-image">
                <img src="${backdropUrl}" alt="${item.title}" loading="lazy" onerror="this.src='/assets/images/no-backdrop.jpg'">
                <div class="continue-progress">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="continue-watching-content">
                <h3 class="continue-watching-title">${item.title}</h3>
                ${item.episode ? `
                <p class="continue-watching-episode">${item.episode}</p>
                ` : ''}
                <p class="continue-watching-time">${Math.floor(progress)}% complete</p>
            </div>
        `;

        cardElement.addEventListener('click', () => {
            window.location.href = `movie-detail.html?id=${item.id}`;
        });

        return cardElement;
    }

    // Create curated content card
    static createCuratedCard(item) {
        const cardElement = document.createElement('div');
        cardElement.className = 'curated-card';
        cardElement.dataset.movieId = item.content?.id || item.id;

        const content = item.content || item;
        const backdropUrl = Utils.getBackdropUrl(content.backdrop_path);

        cardElement.innerHTML = `
            <div class="curated-card-image">
                <img src="${backdropUrl}" alt="${content.title}" loading="lazy" onerror="this.src='/assets/images/no-backdrop.jpg'">
                <div class="curated-card-badge">Staff Pick</div>
            </div>
            <div class="curated-card-content">
                <h3 class="curated-card-title">${item.admin_title || content.title}</h3>
                <p class="curated-card-description">${Utils.truncateText(item.admin_description || content.overview, 150)}</p>
                ${item.custom_tags && item.custom_tags.length > 0 ? `
                <div class="curated-card-tags">
                    ${item.custom_tags.map(tag => `<span class="curated-tag">${tag}</span>`).join('')}
                </div>
                ` : ''}
            </div>
        `;

        cardElement.addEventListener('click', () => {
            window.location.href = `movie-detail.html?id=${content.id}`;
        });

        return cardElement;
    }

    // Create search result item
    static createSearchResult(item) {
        const resultElement = document.createElement('div');
        resultElement.className = 'search-result';
        resultElement.dataset.movieId = item.id;

        const posterUrl = Utils.getImageUrl(item.poster_path);
        const rating = Utils.formatRating(item.rating || item.vote_average);
        const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
        const type = item.content_type || (item.first_air_date ? 'TV' : 'Movie');

        resultElement.innerHTML = `
            <div class="search-result-image">
                <img src="${posterUrl}" alt="${item.title || item.name}" loading="lazy" onerror="this.src='/assets/images/no-poster.jpg'">
            </div>
            <div class="search-result-content">
                <h3 class="search-result-title">${item.title || item.name}</h3>
                <div class="search-result-meta">
                    <span class="search-result-type">${type}</span>
                    ${year ? `<span class="search-result-year">${year}</span>` : ''}
                    ${rating ? `
                    <div class="search-result-rating">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span>${rating}</span>
                    </div>
                    ` : ''}
                </div>
                ${item.overview ? `
                <p class="search-result-overview">${Utils.truncateText(item.overview, 200)}</p>
                ` : ''}
            </div>
        `;

        resultElement.addEventListener('click', () => {
            window.location.href = `movie-detail.html?id=${item.id}`;
        });

        return resultElement;
    }

    // Create loading skeleton
    static createLoadingSkeleton(type = 'card', count = 1) {
        const container = document.createElement('div');
        container.className = 'skeleton-container';

        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            
            switch (type) {
                case 'card':
                    skeleton.className = 'skeleton skeleton-card';
                    break;
                case 'text':
                    skeleton.className = 'skeleton skeleton-text';
                    break;
                case 'continue-watching':
                    skeleton.className = 'skeleton continue-watching-skeleton';
                    skeleton.style.aspectRatio = '16/9';
                    break;
                default:
                    skeleton.className = 'skeleton skeleton-card';
            }
            
            container.appendChild(skeleton);
        }

        return container;
    }

    // Create tab component
    static createTabs(tabsData, activeTab = 0) {
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs-component';

        const tabButtons = document.createElement('div');
        tabButtons.className = 'tab-buttons';

        const tabContents = document.createElement('div');
        tabContents.className = 'tab-contents';

        tabsData.forEach((tab, index) => {
            // Create tab button
            const button = document.createElement('button');
            button.className = `tab-btn ${index === activeTab ? 'active' : ''}`;
            button.textContent = tab.label;
            button.dataset.tabIndex = index;
            tabButtons.appendChild(button);

            // Create tab content
            const content = document.createElement('div');
            content.className = `tab-content ${index === activeTab ? 'active' : 'hidden'}`;
            content.dataset.tabIndex = index;
            
            if (typeof tab.content === 'string') {
                content.innerHTML = tab.content;
            } else if (tab.content instanceof HTMLElement) {
                content.appendChild(tab.content);
            }
            
            tabContents.appendChild(content);
        });

        // Add event listeners
        tabButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                const newActiveIndex = parseInt(e.target.dataset.tabIndex);
                this.switchTab(tabsContainer, newActiveIndex);
            }
        });

        tabsContainer.appendChild(tabButtons);
        tabsContainer.appendChild(tabContents);

        return tabsContainer;
    }

    static switchTab(tabsContainer, activeIndex) {
        const buttons = tabsContainer.querySelectorAll('.tab-btn');
        const contents = tabsContainer.querySelectorAll('.tab-content');

        buttons.forEach((btn, index) => {
            btn.classList.toggle('active', index === activeIndex);
        });

        contents.forEach((content, index) => {
            content.classList.toggle('active', index === activeIndex);
            content.classList.toggle('hidden', index !== activeIndex);
        });
    }

    // Create modal component
    static createModal(title, content, options = {}) {
        const {
            closable = true,
            size = 'medium',
            onClose = null,
            footer = null
        } = options;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = Utils.generateId('modal');

        const modal = document.createElement('div');
        modal.className = `modal-content modal-${size}`;

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>${title}</h3>
            ${closable ? '<button class="modal-close">&times;</button>' : ''}
        `;

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        // Footer
        let footerElement = null;
        if (footer) {
            footerElement = document.createElement('div');
            footerElement.className = 'modal-footer';
            
            if (typeof footer === 'string') {
                footerElement.innerHTML = footer;
            } else if (footer instanceof HTMLElement) {
                footerElement.appendChild(footer);
            }
        }

        modal.appendChild(header);
        modal.appendChild(body);
        if (footerElement) modal.appendChild(footerElement);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Event listeners
        if (closable) {
            const closeBtn = header.querySelector('.modal-close');
            closeBtn?.addEventListener('click', () => this.closeModal(overlay.id, onClose));

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(overlay.id, onClose);
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('active')) {
                    this.closeModal(overlay.id, onClose);
                }
            });
        }

        // Show modal
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        return overlay.id;
    }

    static closeModal(modalId, onClose = null) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                if (onClose) onClose();
            }, 300);
        }
    }

    // Create carousel component
    static createCarousel(items, renderItem, options = {}) {
        const {
            infinite = false,
            autoPlay = false,
            autoPlayInterval = 5000,
            showControls = true,
            showIndicators = false
        } = options;

        const carousel = document.createElement('div');
        carousel.className = 'carousel-component';

        const track = document.createElement('div');
        track.className = 'carousel-track';

        items.forEach(item => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.appendChild(renderItem(item));
            track.appendChild(slide);
        });

        carousel.appendChild(track);

        if (showControls) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'carousel-control carousel-prev';
            prevBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15 18l-6-6 6-6"/></svg>';

            const nextBtn = document.createElement('button');
            nextBtn.className = 'carousel-control carousel-next';
            nextBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18l6-6-6-6"/></svg>';

            carousel.appendChild(prevBtn);
            carousel.appendChild(nextBtn);

            // Add control event listeners
            this.setupCarouselControls(carousel, track, items.length, infinite);
        }

        if (showIndicators) {
            const indicators = document.createElement('div');
            indicators.className = 'carousel-indicators';

            items.forEach((_, index) => {
                const indicator = document.createElement('button');
                indicator.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
                indicator.dataset.index = index;
                indicators.appendChild(indicator);
            });

            carousel.appendChild(indicators);
        }

        return carousel;
    }

    static setupCarouselControls(carousel, track, itemCount, infinite) {
        let currentIndex = 0;
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');

        const updateCarousel = () => {
            const slideWidth = track.querySelector('.carousel-slide').offsetWidth;
            track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;

            // Update indicators
            const indicators = carousel.querySelectorAll('.carousel-indicator');
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === currentIndex);
            });
        };

        prevBtn?.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
            } else if (infinite) {
                currentIndex = itemCount - 1;
            }
            updateCarousel();
        });

        nextBtn?.addEventListener('click', () => {
            if (currentIndex < itemCount - 1) {
                currentIndex++;
            } else if (infinite) {
                currentIndex = 0;
            }
            updateCarousel();
        });

        // Indicator click handlers
        const indicators = carousel.querySelectorAll('.carousel-indicator');
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                currentIndex = index;
                updateCarousel();
            });
        });
    }

    // Create rating component
    static createRatingComponent(currentRating = 0, onRate = null) {
        const ratingContainer = document.createElement('div');
        ratingContainer.className = 'rating-component';

        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('button');
            star.className = `rating-star ${i <= currentRating ? 'active' : ''}`;
            star.dataset.rating = i;
            star.innerHTML = '★';

            star.addEventListener('click', () => {
                if (onRate) onRate(i);
                this.updateRating(ratingContainer, i);
            });

            star.addEventListener('mouseenter', () => {
                this.highlightStars(ratingContainer, i);
            });

            ratingContainer.appendChild(star);
        }

        ratingContainer.addEventListener('mouseleave', () => {
            this.updateRating(ratingContainer, currentRating);
        });

        return ratingContainer;
    }

    static updateRating(container, rating) {
        const stars = container.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
    }

    static highlightStars(container, rating) {
        const stars = container.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            star.classList.toggle('highlighted', index < rating);
        });
    }

    // Progress bar component
    static createProgressBar(progress = 0, options = {}) {
        const { 
            animated = false, 
            showText = true, 
            size = 'normal',
            color = 'primary'
        } = options;

        const progressBar = document.createElement('div');
        progressBar.className = `progress-bar-component progress-${size} progress-${color}`;

        const track = document.createElement('div');
        track.className = 'progress-track';

        const fill = document.createElement('div');
        fill.className = `progress-fill ${animated ? 'animated' : ''}`;
        fill.style.width = `${progress}%`;

        track.appendChild(fill);
        progressBar.appendChild(track);

        if (showText) {
            const text = document.createElement('span');
            text.className = 'progress-text';
            text.textContent = `${Math.round(progress)}%`;
            progressBar.appendChild(text);
        }

        return progressBar;
    }

    // Update progress bar
    static updateProgressBar(progressBar, newProgress) {
        const fill = progressBar.querySelector('.progress-fill');
        const text = progressBar.querySelector('.progress-text');

        fill.style.width = `${newProgress}%`;
        if (text) {
            text.textContent = `${Math.round(newProgress)}%`;
        }
    }
}

// Lazy loading implementation
class LazyLoader {
    constructor() {
        this.imageObserver = null;
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.imageObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });
        }
    }

    observe(img) {
        if (this.imageObserver) {
            this.imageObserver.observe(img);
        } else {
            // Fallback for browsers without IntersectionObserver
            this.loadImage(img);
        }
    }

    loadImage(img) {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.add('loaded');
            
            img.onload = () => {
                img.classList.add('fade-in');
            };
        }
    }

    observeAll() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => this.observe(img));
    }
}

// Initialize lazy loader
const lazyLoader = new LazyLoader();

// Export components
export { UIComponents, LazyLoader, lazyLoader };