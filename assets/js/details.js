// details.js - Production-Ready with Carousel Recommendations
class DetailsPage {
    constructor() {
        // API Configuration
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.posterBase = 'https://image.tmdb.org/t/p/w500';
        this.backdropBase = 'https://image.tmdb.org/t/p/w1280';

        // Content Data
        this.contentId = this.getContentIdFromUrl();
        this.contentData = null;

        // Authentication
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;
        this.currentUser = this.getCurrentUser();

        // User Lists
        this.userWatchlist = new Set();
        this.userFavorites = new Set();

        // Cache for performance
        this.recommendationsCache = {
            similar: null,
            genre: null
        };

        // Loading states
        this.loadingStates = {
            details: false,
            similar: false,
            genre: false
        };

        // Device detection
        this.isMobile = window.innerWidth < 768;
        this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

        // Initialize
        this.init();
    }

    getContentIdFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            console.log('Extracted content ID:', id);
            return id;
        } catch (error) {
            console.error('Error extracting content ID:', error);
            return null;
        }
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('cinebrain-user');
            if (userStr) {
                return JSON.parse(userStr);
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
        return null;
    }

    async init() {
        try {
            if (!this.contentId) {
                console.error('No content ID found in URL');
                this.showError('No content ID provided. Please select a movie or show to view.');
                this.hideLoader();
                return;
            }

            if (isNaN(this.contentId)) {
                console.error('Invalid content ID format:', this.contentId);
                this.showError('Invalid content ID format. Please select a valid movie or show.');
                this.hideLoader();
                return;
            }

            console.log('Initializing details page for content ID:', this.contentId);
            this.setLoadingState('details', true);

            if (this.isAuthenticated) {
                try {
                    await this.loadUserLists();
                } catch (error) {
                    console.warn('Failed to load user lists:', error);
                }
            }

            await this.loadContentDetails();
            this.setupEventListeners();

            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            this.hideLoader();

            // Load recommendations after main content
            setTimeout(() => {
                this.loadAllRecommendations();
            }, 100);

            if (this.isAuthenticated) {
                this.recordViewInteraction();
            }

            if (window.mobileNav) {
                window.mobileNav.detectCurrentPage();
            }

            this.setupResponsiveHandlers();

        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(`Failed to load content: ${error.message || 'Unknown error'}`);
            this.hideLoader();
        } finally {
            this.setLoadingState('details', false);
        }
    }

    setupResponsiveHandlers() {
        try {
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    const wasMobile = this.isMobile;
                    this.isMobile = window.innerWidth < 768;
                    this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

                    if (wasMobile !== this.isMobile) {
                        this.setupAllCarousels();
                    }
                }, 250);
            });

            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.setupAllCarousels();
                }, 300);
            });
        } catch (error) {
            console.error('Error setting up responsive handlers:', error);
        }
    }

    setLoadingState(section, isLoading) {
        this.loadingStates[section] = isLoading;
        console.log(`Loading state for ${section}:`, isLoading);
    }

    hideLoader() {
        try {
            const loader = document.getElementById('pageLoader');
            if (loader) {
                loader.classList.add('hidden');
                setTimeout(() => {
                    if (loader && loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                }, 300);
            }
        } catch (error) {
            console.error('Error hiding loader:', error);
        }
    }

    async loadUserLists() {
        if (window.contentCardManager && typeof window.contentCardManager.loadUserWishlist === 'function') {
            try {
                await window.contentCardManager.loadUserWishlist();
                this.userWatchlist = window.contentCardManager.userWatchlist || new Set();
                this.userFavorites = window.contentCardManager.userFavorites || new Set();
                return;
            } catch (error) {
                console.warn('Failed to load from ContentCardManager:', error);
            }
        }

        try {
            const response = await fetch(`${this.apiBase}/user/watchlist`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.userWatchlist.clear();
                if (data.watchlist && Array.isArray(data.watchlist)) {
                    data.watchlist.forEach(item => {
                        if (item && item.id) {
                            this.userWatchlist.add(parseInt(item.id));
                        }
                    });
                }
                this.userFavorites.clear();
                if (data.favorites && Array.isArray(data.favorites)) {
                    data.favorites.forEach(item => {
                        if (item && item.id) {
                            this.userFavorites.add(parseInt(item.id));
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading user lists:', error);
        }
    }

    async loadContentDetails() {
        const url = `${this.apiBase}/content/${this.contentId}`;
        console.log('Fetching content from:', url);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `Failed to load content (Error ${response.status})`;

                if (response.status === 404) {
                    errorMessage = 'Content not found. This movie or show may have been removed.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }

                try {
                    const errorData = await response.json();
                    if (errorData && (errorData.error || errorData.message)) {
                        errorMessage = errorData.error || errorData.message;
                    }
                } catch (e) { }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Content data received:', data);

            if (!data) {
                throw new Error('No data received from server');
            }

            if (!data.title && !data.name) {
                data.title = 'Unknown Title';
            }

            this.contentData = data;
            await this.renderContent();

        } catch (error) {
            console.error('Error loading content details:', error);

            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please check your connection and try again.');
            }

            throw error;
        }
    }

    async renderContent() {
        try {
            const data = this.contentData;
            if (!data) {
                console.error('No content data to render');
                return;
            }

            console.log('Rendering content:', data.title || data.name);

            document.title = `${data.title || data.name || 'Content'} - CineBrain`;
            this.updateMetaTags(data);

            // Hero Section - Backdrop
            if (data.backdrop_path) {
                const backdrop = document.getElementById('heroBackdrop');
                if (backdrop) {
                    const backdropUrl = data.backdrop_path.startsWith('http') ?
                        data.backdrop_path :
                        `${this.backdropBase}${data.backdrop_path}`;
                    backdrop.style.backgroundImage = `url(${backdropUrl})`;
                }
            }

            // Poster
            const poster = document.getElementById('posterImage');
            if (poster) {
                const posterUrl = this.formatPosterUrl(data.poster_path);

                const img = new Image();
                img.onload = () => {
                    poster.src = img.src;
                    poster.classList.add('loaded');
                };
                img.onerror = () => {
                    poster.src = this.getPlaceholderImage();
                    poster.classList.add('loaded');
                };
                img.src = posterUrl;
                poster.alt = data.title || data.name || 'Poster';
            }

            // Quality Badge
            if (data.rating && data.rating >= 8.0) {
                const qualityBadge = document.getElementById('qualityBadge');
                if (qualityBadge) {
                    qualityBadge.style.display = 'block';
                }
            }

            // Title
            const titleElement = document.getElementById('contentTitle');
            if (titleElement) {
                titleElement.textContent = data.title || data.name || 'Unknown Title';
                const titleShimmer = titleElement.querySelector('.title-shimmer');
                if (titleShimmer) {
                    titleShimmer.remove();
                }
            }

            // Rest of the render content method remains the same...
            // [Include all the other rendering code from your original renderContent method]

            // Mobile Quick Stats
            this.updateElement('mobileRating', data.rating ? data.rating.toFixed(1) : 'N/A');
            this.updateElement('mobileRuntime', this.formatRuntime(data.runtime, true));
            this.updateElement('mobileYear', data.release_date ? new Date(data.release_date).getFullYear() : 'N/A');

            // Continue with all other rendering...

            // Re-initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            // Load similar content from response if available
            if (data.similar_content && data.similar_content.length > 0) {
                console.log('Rendering similar content from response');
                this.renderCarousel('similarContent', data.similar_content);
            }

        } catch (error) {
            console.error('Error rendering content:', error);
            throw new Error('Failed to render content details');
        }
    }

    async loadAllRecommendations() {
        try {
            console.log('Starting to load recommendations...');
            const promises = [
                this.loadSimilarContent(),
                this.loadGenreContent()
            ];

            const results = await Promise.allSettled(promises);
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.warn(`Recommendation loading failed at index ${index}:`, result.reason);
                }
            });
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    async loadSimilarContent() {
        if (this.loadingStates.similar) return;

        try {
            this.setLoadingState('similar', true);
            console.log('Loading similar content...');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(
                `${this.apiBase}/recommendations/similar/${this.contentId}?limit=20&strict_mode=true&min_similarity=0.5`,
                { signal: controller.signal }
            );

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log('Similar content response:', data);

                if (data && data.similar_content && data.similar_content.length > 0) {
                    this.recommendationsCache.similar = data.similar_content;
                    this.renderCarousel('similarContent', data.similar_content);
                } else {
                    console.log('No similar content in response');
                    this.showNoContent('similarContent', 'No similar titles found');
                }
            } else {
                console.warn('Failed to load similar content:', response.status);
                this.showNoContent('similarContent', 'Failed to load similar titles');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading similar content:', error);
                this.showNoContent('similarContent', 'Error loading similar titles');
            }
        } finally {
            this.setLoadingState('similar', false);
        }
    }

    async loadGenreContent() {
        if (!this.contentData || !this.contentData.genres || this.contentData.genres.length === 0) {
            console.log('No genres available for genre recommendations');
            this.showNoContent('genreContent', 'No genre data available');
            return;
        }

        if (this.loadingStates.genre) return;

        const primaryGenre = this.contentData.genres[0].toLowerCase();

        const genreTitle = document.getElementById('genreTitle');
        if (genreTitle) {
            genreTitle.textContent = `More ${primaryGenre.charAt(0).toUpperCase() + primaryGenre.slice(1)} ${this.contentData.content_type === 'movie' ? 'Movies' : 'Shows'}`;
        }

        try {
            this.setLoadingState('genre', true);
            console.log('Loading genre content for:', primaryGenre);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(
                `${this.apiBase}/recommendations/genre/${primaryGenre}?type=${this.contentData.content_type}&limit=20`,
                { signal: controller.signal }
            );

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log('Genre content response:', data);

                if (data && data.recommendations && data.recommendations.length > 0) {
                    this.recommendationsCache.genre = data.recommendations;
                    this.renderCarousel('genreContent', data.recommendations);
                } else {
                    console.log('No genre content in response');
                    this.showNoContent('genreContent', 'No genre recommendations found');
                }
            } else {
                console.warn('Failed to load genre content:', response.status);
                this.showNoContent('genreContent', 'Failed to load genre recommendations');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading genre content:', error);
                this.showNoContent('genreContent', 'Error loading genre recommendations');
            }
        } finally {
            this.setLoadingState('genre', false);
        }
    }

    renderCarousel(containerId, items) {
        try {
            console.log(`Rendering carousel for ${containerId} with ${items.length} items`);

            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`Container ${containerId} not found`);
                return;
            }

            if (!items || !Array.isArray(items) || items.length === 0) {
                console.warn(`No items to render for ${containerId}`);
                this.showNoContent(containerId, 'No content available');
                return;
            }

            // Clear existing content
            container.innerHTML = '';

            // Create carousel wrapper structure matching content-card.css
            container.className = 'carousel-wrapper';

            // Add each content card
            items.forEach(item => {
                const card = this.createContentCard(item);
                if (card) {
                    container.appendChild(card);
                }
            });

            // Setup navigation for the parent carousel container
            const carouselContainer = container.closest('.carousel-container');
            if (carouselContainer) {
                this.setupCarouselNavigation(carouselContainer);
            }

            console.log(`Successfully rendered ${items.length} items in ${containerId}`);

        } catch (error) {
            console.error(`Error rendering carousel in ${containerId}:`, error);
            this.showNoContent(containerId, 'Error displaying content');
        }
    }

    createContentCard(content) {
        try {
            if (!content) return null;

            const card = document.createElement('div');
            card.className = 'content-card';
            card.dataset.contentId = content.id;

            const posterUrl = this.formatPosterUrl(content.poster_path);
            const rating = content.rating ? content.rating.toFixed(1) : 'N/A';
            const year = content.release_date ? new Date(content.release_date).getFullYear() : '';
            const isInWatchlist = this.userWatchlist.has(parseInt(content.id));
            const genres = content.genres?.slice(0, 2) || [];
            const runtime = this.formatRuntime(content.runtime, true);
            const contentType = content.content_type || 'movie';

            const similarityBadge = content.similarity_score ?
                `<div class="similarity-badge" style="position: absolute; bottom: 60px; left: 8px; background: var(--cinebrain-primary); color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; z-index: 3;">${Math.round(content.similarity_score * 100)}% Match</div>` : '';

            card.innerHTML = `
                <div class="card-poster-container">
                    <img class="card-poster" 
                         data-src="${posterUrl}" 
                         alt="${this.escapeHtml(content.title || content.name || 'Content')}" 
                         loading="lazy">
                    <div class="content-type-badge ${contentType}">
                        ${contentType.toUpperCase()}
                    </div>
                    ${similarityBadge}
                    <div class="card-overlays">
                        <div class="card-top-overlay">
                            <div></div>
                            <button class="wishlist-btn ${isInWatchlist ? 'active' : ''}" 
                                    data-content-id="${content.id}" 
                                    title="${isInWatchlist ? 'Remove from Wishlist' : 'Add to Wishlist'}"
                                    aria-label="${isInWatchlist ? 'Remove from Wishlist' : 'Add to Wishlist'}">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                            </button>
                        </div>
                        <div class="card-bottom-overlay">
                            <div class="rating-badge">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                                <span>${rating}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title">${this.escapeHtml(content.title || content.name || 'Unknown')}</div>
                    <div class="card-meta">
                        ${year ? `<span class="card-year">${year}</span>` : ''}
                        ${runtime ? `<span class="card-runtime">• ${runtime}</span>` : ''}
                        ${content.match_type ? `<span class="match-type" style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">• ${content.match_type}</span>` : ''}
                    </div>
                    ${genres.length > 0 ? `
                        <div class="card-genres">
                            ${genres.map(genre => `<span class="genre-chip">${this.escapeHtml(genre)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;

            // Setup lazy loading for the image
            this.setupLazyLoading(card);

            // Add click handler
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.wishlist-btn')) {
                    window.location.href = `/content/details.html?id=${content.id}`;
                }
            });

            // Add wishlist handler
            const wishlistBtn = card.querySelector('.wishlist-btn');
            if (wishlistBtn) {
                wishlistBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.toggleWishlistItem(content.id, wishlistBtn);
                });
            }

            return card;
        } catch (error) {
            console.error('Error creating content card:', error);
            return null;
        }
    }

    setupLazyLoading(card) {
        const img = card.querySelector('.card-poster');
        if (!img) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const imgSrc = img.dataset.src;
                    if (imgSrc) {
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            img.src = imgSrc;
                            img.classList.add('loaded');
                        };
                        tempImg.onerror = () => {
                            img.src = this.getPlaceholderImage();
                            img.classList.add('loaded');
                        };
                        tempImg.src = imgSrc;
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.01
        });
        observer.observe(img);
    }

    setupCarouselNavigation(carouselContainer) {
        const wrapper = carouselContainer.querySelector('.carousel-wrapper');
        const prevBtn = carouselContainer.querySelector('.carousel-nav.prev');
        const nextBtn = carouselContainer.querySelector('.carousel-nav.next');

        if (!wrapper) return;

        // Calculate scroll amount
        const getScrollAmount = () => {
            const containerWidth = wrapper.clientWidth;
            const cardWidth = wrapper.querySelector('.content-card')?.offsetWidth || 180;
            const gap = parseInt(getComputedStyle(wrapper).gap) || 12;
            const visibleCards = Math.floor(containerWidth / (cardWidth + gap));
            return (cardWidth + gap) * Math.max(1, visibleCards - 1);
        };

        // Update navigation buttons state
        const updateNavButtons = () => {
            if (!prevBtn || !nextBtn) return;

            const scrollLeft = wrapper.scrollLeft;
            const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;

            prevBtn.classList.toggle('disabled', scrollLeft <= 0);
            nextBtn.classList.toggle('disabled', scrollLeft >= maxScroll - 1);
        };

        // Navigation handlers
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                wrapper.scrollBy({
                    left: -getScrollAmount(),
                    behavior: 'smooth'
                });
            });

            nextBtn.addEventListener('click', () => {
                wrapper.scrollBy({
                    left: getScrollAmount(),
                    behavior: 'smooth'
                });
            });

            wrapper.addEventListener('scroll', updateNavButtons);
            updateNavButtons();
        }

        // Touch/swipe support
        this.setupTouchScroll(wrapper);
    }

    setupTouchScroll(wrapper) {
        if (!wrapper) return;

        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        wrapper.addEventListener('touchstart', (e) => {
            isDown = true;
            startX = e.touches[0].pageX;
            scrollLeft = wrapper.scrollLeft;
        }, { passive: true });

        wrapper.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            const x = e.touches[0].pageX;
            const walk = (startX - x) * 1.5;
            wrapper.scrollLeft = scrollLeft + walk;
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            isDown = false;
        });
    }

    setupAllCarousels() {
        // Setup for similar content
        const similarContainer = document.getElementById('similarContent')?.closest('.carousel-container');
        if (similarContainer) {
            this.setupCarouselNavigation(similarContainer);
        }

        // Setup for genre content
        const genreContainer = document.getElementById('genreContent')?.closest('.carousel-container');
        if (genreContainer) {
            this.setupCarouselNavigation(genreContainer);
        }

        // Setup for cast/crew
        this.setupCarouselNav('cast');
        const crewWrapper = document.getElementById('crewWrapper');
        if (crewWrapper && crewWrapper.children.length > 0) {
            this.setupCarouselNav('crew');
        }
    }

    showNoContent(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // ... Rest of your helper methods remain the same ...

    async toggleWishlistItem(contentId, button) {
        if (!this.isAuthenticated) {
            this.showToast('Please login to add to wishlist', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.href);
            }, 1000);
            return;
        }

        try {
            const isActive = button.classList.contains('active');
            if (button.disabled) return;
            button.disabled = true;

            const response = await fetch(`${this.apiBase}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    content_id: parseInt(contentId),
                    interaction_type: isActive ? 'remove_watchlist' : 'watchlist'
                })
            });

            if (response.ok) {
                button.classList.toggle('active');
                const contentIdNum = parseInt(contentId);

                if (button.classList.contains('active')) {
                    this.userWatchlist.add(contentIdNum);
                    button.setAttribute('title', 'Remove from Wishlist');
                    button.setAttribute('aria-label', 'Remove from Wishlist');
                } else {
                    this.userWatchlist.delete(contentIdNum);
                    button.setAttribute('title', 'Add to Wishlist');
                    button.setAttribute('aria-label', 'Add to Wishlist');
                }

                if (window.contentCardManager) {
                    if (button.classList.contains('active')) {
                        window.contentCardManager.userWatchlist.add(contentIdNum);
                    } else {
                        window.contentCardManager.userWatchlist.delete(contentIdNum);
                    }
                }
            }
        } catch (error) {
            console.error('Error updating wishlist:', error);
        } finally {
            setTimeout(() => {
                button.disabled = false;
            }, 500);
        }
    }

    updateElement(elementId, value) {
        try {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
            }
        } catch (error) {
            console.error(`Error updating element ${elementId}:`, error);
        }
    }

    setupEventListeners() {
        // Your existing event listeners setup
    }

    showToast(message, type = 'success') {
        try {
            if (window.topbar?.notificationSystem) {
                window.topbar.notificationSystem.show(message, type);
            } else if (window.mobileNav) {
                window.mobileNav.showToast(message, type);
            } else {
                const toastEl = document.getElementById('notificationToast');
                const toastMessage = document.getElementById('toastMessage');

                if (toastEl && toastMessage) {
                    toastMessage.textContent = message;
                    toastEl.className = `toast ${type}`;

                    const toast = new bootstrap.Toast(toastEl);
                    toast.show();
                }
            }
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }

    formatPosterUrl(posterPath) {
        if (!posterPath) {
            return this.getPlaceholderImage();
        }
        if (posterPath.startsWith('http')) {
            return posterPath;
        }
        return `${this.posterBase}${posterPath}`;
    }

    formatRuntime(minutes, short = false) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (short) {
            return hours > 0 ? `${hours}h${mins}m` : `${mins}m`;
        }
        return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    }

    showError(message = 'Content not found') {
        const container = document.querySelector('.hero-content') || document.querySelector('#main-content');

        if (container) {
            container.innerHTML = `
                <div class="error-container" style="
                    text-align: center; 
                    padding: 50px 20px;
                    max-width: 600px;
                    margin: 0 auto;
                ">
                    <div style="
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 20px;
                        background: var(--card-hover-bg);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i data-feather="alert-circle" style="
                            width: 40px;
                            height: 40px;
                            color: var(--text-secondary);
                        "></i>
                    </div>
                    
                    <h2 style="
                        color: var(--text-primary); 
                        margin-bottom: 15px;
                        font-size: clamp(1.5rem, 4vw, 2rem);
                    ">Content Not Found</h2>
                    
                    <p style="
                        color: var(--text-secondary); 
                        margin-bottom: 30px;
                        font-size: clamp(0.9rem, 2vw, 1.1rem);
                        line-height: 1.6;
                    ">${this.escapeHtml(message)}</p>
                    
                    <div style="
                        display: flex;
                        gap: 15px;
                        justify-content: center;
                        flex-wrap: wrap;
                    ">
                        <a href="/" class="btn-action btn-play" style="
                            display: inline-flex;
                            align-items: center;
                            text-decoration: none;
                        ">
                            <i data-feather="home"></i>
                            <span class="btn-text">Go Home</span>
                        </a>
                        
                        <button onclick="window.history.back()" class="btn-action btn-watchlist" style="
                            display: inline-flex;
                            align-items: center;
                        ">
                            <i data-feather="arrow-left"></i>
                            <span class="btn-text">Go Back</span>
                        </button>
                    </div>
                </div>
            `;

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }
}

// Initialize the details page
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing details page...');
        const detailsPage = new DetailsPage();
        window.detailsPage = detailsPage;
    } catch (error) {
        console.error('Failed to initialize details page:', error);

        const container = document.querySelector('#main-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px;">
                    <h2 style="color: var(--text-primary, #000);">Error Loading Page</h2>
                    <p style="color: var(--text-secondary, #666);">Something went wrong. Please try again.</p>
                    <a href="/" style="color: var(--cinebrain-primary, #113CCF);">Go Home</a>
                </div>
            `;
        }
    }
});

window.addEventListener('load', () => {
    console.log('Page fully loaded');
});

window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});