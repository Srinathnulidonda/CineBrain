// Enhanced Details Page with Modern Design
class DetailsPage {
    constructor() {
        // API Configuration
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.posterBase = 'https://image.tmdb.org/t/p/w500';
        this.backdropBase = 'https://image.tmdb.org/t/p/w1280';

        // Content Data
        this.contentSlug = this.getContentSlugFromUrl();
        this.contentData = null;

        // Authentication
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;
        this.currentUser = this.getCurrentUser();

        // User Lists
        this.userWatchlist = new Set();
        this.userFavorites = new Set();

        // UI State
        this.currentTab = 'overview';
        this.expandedSynopsis = false;
        this.currentMediaType = 'backdrops';

        // Initialize
        this.init();
    }

    getContentSlugFromUrl() {
        const queryString = window.location.search.substring(1);
        return decodeURIComponent(queryString);
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('cinebrain-user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }

    async init() {
        try {
            if (!this.contentSlug) {
                this.showError('No content specified');
                this.hideLoader();
                return;
            }

            // Load user lists if authenticated
            if (this.isAuthenticated) {
                await this.loadUserLists();
            }

            // Load content details
            await this.loadContentDetails();

            // Setup UI
            this.setupEventListeners();
            this.setupTabNavigation();
            this.setupMediaTabs();
            this.setupModals();

            // Initialize icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            // Hide loader
            this.hideLoader();

            // Load additional content
            setTimeout(() => {
                this.loadRecommendations();
            }, 500);

        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(error.message);
            this.hideLoader();
        }
    }

    async loadContentDetails() {
        const url = `${this.apiBase}/details/${encodeURIComponent(this.contentSlug)}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load content (${response.status})`);
            }

            this.contentData = await response.json();
            await this.renderContent();

        } catch (error) {
            console.error('Error loading content:', error);
            throw error;
        }
    }

    async renderContent() {
        const data = this.contentData;
        if (!data) return;

        // Update page title
        document.title = `${data.title || 'Content'} - CineBrain`;

        // Hero Section
        this.renderHero(data);

        // Overview Tab
        this.renderOverview(data);

        // Cast & Crew Tab
        this.renderCastCrew(data);

        // Media Tab
        this.renderMedia(data);

        // Reviews Tab
        this.renderReviews(data);

        // Update action buttons
        this.updateActionButtons();

        // Re-initialize icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderHero(data) {
        // Backdrop
        if (data.backdrop_url) {
            const backdrop = document.getElementById('heroBackdrop');
            if (backdrop) {
                backdrop.style.backgroundImage = `url(${data.backdrop_url})`;
                // Add parallax effect on scroll
                window.addEventListener('scroll', () => {
                    const scrolled = window.pageYOffset;
                    backdrop.style.transform = `translateY(${scrolled * 0.5}px)`;
                });
            }
        }

        // Poster
        const poster = document.getElementById('posterImage');
        if (poster && data.poster_url) {
            const img = new Image();
            img.onload = () => {
                poster.src = img.src;
                poster.classList.add('loaded');
            };
            img.src = data.poster_url;
            poster.alt = data.title || 'Poster';
        }

        // Badges
        if (data.quality) {
            const qualityBadge = document.getElementById('qualityBadge');
            if (qualityBadge) {
                qualityBadge.textContent = data.quality;
                qualityBadge.style.display = 'inline-block';
            }
        }

        const typeBadge = document.getElementById('contentTypeBadge');
        if (typeBadge) {
            typeBadge.textContent = (data.content_type || 'movie').toUpperCase();
        }

        // Title
        this.updateElement('contentTitle', data.title);
        if (data.original_title && data.original_title !== data.title) {
            this.updateElement('originalTitle', data.original_title);
        }

        // Meta Pills
        if (data.metadata?.release_date) {
            const year = new Date(data.metadata.release_date).getFullYear();
            document.querySelector('#releaseYear span').textContent = year;
        }

        if (data.metadata?.runtime) {
            document.querySelector('#runtime span').textContent = this.formatRuntime(data.metadata.runtime);
        }

        if (data.ratings?.tmdb) {
            document.querySelector('#contentRating span').textContent = data.ratings.tmdb.score.toFixed(1);
        }

        if (data.metadata?.original_language) {
            document.querySelector('#originalLanguage span').textContent =
                this.getLanguageName(data.metadata.original_language);
        }

        // Genres
        this.renderGenres(data.metadata?.genres || []);

        // Quick Synopsis
        const synopsis = data.synopsis?.overview || data.overview || '';
        const quickSynopsis = document.getElementById('quickSynopsis');
        if (quickSynopsis) {
            quickSynopsis.textContent = synopsis.substring(0, 200) +
                (synopsis.length > 200 ? '...' : '');
        }

        // Stats Bar
        if (data.ratings?.tmdb) {
            this.updateElement('voteCount', this.formatNumber(data.ratings.tmdb.count));
        }

        if (data.metadata?.popularity) {
            this.updateElement('popularityValue', Math.round(data.metadata.popularity));
        }

        if (data.ratings?.imdb?.score) {
            document.getElementById('imdbStat').style.display = 'block';
            this.updateElement('imdbRating', data.ratings.imdb.score.toFixed(1));
        }

        if (data.trending_rank) {
            document.getElementById('trendingStat').style.display = 'block';
            this.updateElement('trendingRank', data.trending_rank);
        }
    }

    renderGenres(genres) {
        const container = document.getElementById('genreChips');
        if (!container) return;

        container.innerHTML = genres.map(genre => `
            <span class="genre-tag" data-genre="${this.escapeHtml(genre.toLowerCase())}">
                ${this.escapeHtml(genre)}
            </span>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.genre-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const genre = tag.dataset.genre;
                window.location.href = `/explore.html?genre=${encodeURIComponent(genre)}`;
            });
        });
    }

    renderOverview(data) {
        // Synopsis
        const overviewText = document.getElementById('overviewText');
        if (overviewText) {
            overviewText.textContent = data.synopsis?.overview || data.overview || '';
        }

        // Streaming Providers
        if (data.streaming_info) {
            this.renderStreamingProviders(data.streaming_info);
        }

        // Information
        this.updateElement('status', data.metadata?.status || 'Released');
        this.updateElement('releaseDate', this.formatDate(data.metadata?.release_date));

        if (data.metadata?.budget) {
            this.updateElement('budget', this.formatCurrency(data.metadata.budget));
        }

        if (data.metadata?.revenue) {
            this.updateElement('revenue', this.formatCurrency(data.metadata.revenue));
        }

        // TV Show specific
        if (data.seasons_episodes) {
            if (data.seasons_episodes.season_count) {
                document.getElementById('seasonsRow').style.display = 'flex';
                this.updateElement('seasonsCount', data.seasons_episodes.season_count);
            }

            if (data.seasons_episodes.episode_count) {
                document.getElementById('episodesRow').style.display = 'flex';
                this.updateElement('episodesCount', data.seasons_episodes.episode_count);
            }
        }

        // Production Companies
        if (data.metadata?.production_companies) {
            this.renderProductionCompanies(data.metadata.production_companies);
        }

        // Keywords
        if (data.keywords && data.keywords.length > 0) {
            this.renderKeywords(data.keywords);
        }
    }

    renderStreamingProviders(streamingInfo) {
        const card = document.getElementById('streamingCard');
        const container = document.getElementById('streamingProviders');

        if (!container) return;

        const allProviders = [
            ...(streamingInfo.stream || []),
            ...(streamingInfo.rent || []),
            ...(streamingInfo.buy || [])
        ];

        if (allProviders.length > 0) {
            card.style.display = 'block';

            container.innerHTML = allProviders.map(provider => `
                <div class="streaming-provider">
                    <img src="${provider.logo_path}" alt="${provider.provider_name}" class="provider-logo">
                    <span class="provider-name">${provider.provider_name}</span>
                </div>
            `).join('');
        }
    }

    renderProductionCompanies(companies) {
        const container = document.getElementById('productionCompanies');
        if (!container) return;

        container.innerHTML = companies.map(company => `
            <div class="production-item">
                ${company.logo_path ? `
                    <img src="${company.logo_path}" alt="${company.name}" class="production-logo">
                ` : ''}
                <span class="production-name">${company.name}</span>
            </div>
        `).join('');
    }

    renderKeywords(keywords) {
        const card = document.getElementById('keywordsCard');
        const container = document.getElementById('keywordsList');

        if (!container) return;

        card.style.display = 'block';

        container.innerHTML = keywords.map(keyword => `
            <span class="keyword-tag" data-keyword="${this.escapeHtml(keyword)}">
                ${this.escapeHtml(keyword)}
            </span>
        `).join('');
    }

    renderCastCrew(data) {
        if (!data.cast_crew) return;

        // Cast
        const castGrid = document.getElementById('castGrid');
        if (castGrid && data.cast_crew.cast) {
            const cast = data.cast_crew.cast.slice(0, 12); // Show first 12

            castGrid.innerHTML = cast.map(member => `
                <div class="cast-card" data-person-id="${member.id}">
                    <img class="person-photo" 
                         src="${member.profile_path || this.getPlaceholderAvatar()}" 
                         alt="${this.escapeHtml(member.name)}"
                         loading="lazy">
                    <div class="person-name">${this.escapeHtml(member.name)}</div>
                    <div class="person-role">${this.escapeHtml(member.character || '')}</div>
                </div>
            `).join('');
        }

        // Crew
        const crewGrid = document.getElementById('crewGrid');
        if (crewGrid && data.cast_crew.crew) {
            const crew = [
                ...(data.cast_crew.crew.directors || []),
                ...(data.cast_crew.crew.writers || []),
                ...(data.cast_crew.crew.producers || [])
            ].slice(0, 12);

            crewGrid.innerHTML = crew.map(member => `
                <div class="crew-card" data-person-id="${member.id}">
                    <img class="person-photo" 
                         src="${member.profile_path || this.getPlaceholderAvatar()}" 
                         alt="${this.escapeHtml(member.name)}"
                         loading="lazy">
                    <div class="person-name">${this.escapeHtml(member.name)}</div>
                    <div class="person-role">${this.escapeHtml(member.job || '')}</div>
                </div>
            `).join('');
        }
    }

    renderMedia(data) {
        // Videos
        if (data.videos && data.videos.length > 0) {
            this.renderVideos(data.videos);
        }

        // Images
        if (data.images) {
            this.renderImages(data.images);
        }
    }

    renderVideos(videos) {
        const container = document.getElementById('videosGrid');
        if (!container) return;

        container.innerHTML = videos.map(video => `
            <div class="video-card" data-video-key="${video.key}">
                <img src="https://img.youtube.com/vi/${video.key}/hqdefault.jpg" 
                     alt="${this.escapeHtml(video.name)}"
                     class="video-thumbnail">
                <div class="video-play-btn">
                    <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
                <div class="video-title">${this.escapeHtml(video.name)}</div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', () => {
                const key = card.dataset.videoKey;
                this.playVideo(key);
            });
        });
    }

    renderImages(images) {
        const container = document.getElementById('imagesGrid');
        if (!container) return;

        const renderImageType = (type) => {
            const imageList = images[type] || [];

            container.innerHTML = imageList.map(image => `
                <div class="image-card" data-image-url="${image.url}">
                    <img src="${image.thumbnail || image.url}" 
                         alt="Image"
                         loading="lazy">
                </div>
            `).join('');

            // Add click handlers
            container.querySelectorAll('.image-card').forEach(card => {
                card.addEventListener('click', () => {
                    const url = card.dataset.imageUrl;
                    this.openLightbox(url);
                });
            });
        };

        // Default to backdrops
        renderImageType('backdrops');

        // Media tab handlers
        document.querySelectorAll('.media-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderImageType(tab.dataset.media);
            });
        });
    }

    renderReviews(data) {
        const container = document.getElementById('reviewsList');
        const noReviews = document.getElementById('noReviews');

        if (!container) return;

        if (!data.reviews || data.reviews.length === 0) {
            container.style.display = 'none';
            if (noReviews) noReviews.style.display = 'flex';
            return;
        }

        container.innerHTML = data.reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div class="reviewer-info">
                        <img class="reviewer-avatar" 
                             src="${review.user.avatar || this.getPlaceholderAvatar()}" 
                             alt="${this.escapeHtml(review.user.username)}">
                        <div class="reviewer-details">
                            <div class="reviewer-name">${this.escapeHtml(review.user.username)}</div>
                            <div class="review-date">${this.formatDate(review.created_at)}</div>
                        </div>
                    </div>
                    <div class="review-rating">
                        ${this.renderStars(review.rating)}
                    </div>
                </div>
                <div class="review-content">
                    ${review.title ? `<h4 class="review-title">${this.escapeHtml(review.title)}</h4>` : ''}
                    <p class="review-text">${this.escapeHtml(review.review_text)}</p>
                </div>
                <div class="review-actions">
                    <button class="review-action-btn" data-review-id="${review.id}">
                        <i data-feather="thumbs-up"></i>
                        Helpful (${review.helpful_count || 0})
                    </button>
                </div>
            </div>
        `).join('');

        // Re-initialize icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async loadRecommendations() {
        // Load similar content
        await this.loadSimilarContent();

        // Load genre-based content
        await this.loadGenreContent();
    }

    async loadSimilarContent() {
        if (!this.contentData?.id) return;

        try {
            const response = await fetch(
                `${this.apiBase}/recommendations/similar/${this.contentData.id}?limit=20`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.similar_content) {
                    this.renderCarousel('similarContent', data.similar_content);
                }
            }
        } catch (error) {
            console.error('Error loading similar content:', error);
        }
    }

    async loadGenreContent() {
        if (!this.contentData?.metadata?.genres?.[0]) return;

        const primaryGenre = this.contentData.metadata.genres[0].toLowerCase();

        // Update title
        const genreTitle = document.getElementById('genreTitle');
        if (genreTitle) {
            genreTitle.textContent = `More ${primaryGenre.charAt(0).toUpperCase() + primaryGenre.slice(1)}`;
        }

        try {
            const response = await fetch(
                `${this.apiBase}/recommendations/genre/${primaryGenre}?type=${this.contentData.content_type}&limit=20`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.recommendations) {
                    this.renderCarousel('genreContent', data.recommendations);
                }
            }
        } catch (error) {
            console.error('Error loading genre content:', error);
        }
    }

    renderCarousel(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container || !items) return;

        // Use content card structure from content-card.js
        container.innerHTML = '';

        items.forEach(item => {
            const card = this.createContentCard(item);
            if (card) {
                container.appendChild(card);
            }
        });

        // Setup navigation
        const carouselContainer = container.closest('.carousel-container');
        if (carouselContainer) {
            this.setupCarouselNavigation(carouselContainer);
        }
    }

    createContentCard(content) {
        // Create card following content-card.js structure
        const card = document.createElement('div');
        card.className = 'content-card';
        card.dataset.contentId = content.id;

        const posterUrl = this.formatPosterUrl(content.poster_url || content.poster_path);
        const rating = content.rating ? content.rating.toFixed(1) : 'N/A';
        const year = content.year || (content.release_date ? new Date(content.release_date).getFullYear() : '');
        const isInWatchlist = this.userWatchlist.has(parseInt(content.id));

        card.innerHTML = `
            <div class="card-poster-container">
                <img class="card-poster" 
                     data-src="${posterUrl}" 
                     alt="${this.escapeHtml(content.title || 'Content')}" 
                     loading="lazy">
                <div class="content-type-badge ${content.content_type || 'movie'}">
                    ${(content.content_type || 'movie').toUpperCase()}
                </div>
                <div class="card-overlays">
                    <div class="card-top-overlay">
                        <div></div>
                        <button class="wishlist-btn ${isInWatchlist ? 'active' : ''}" 
                                data-content-id="${content.id}">
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
                <div class="card-title">${this.escapeHtml(content.title || 'Unknown')}</div>
                <div class="card-meta">
                    ${year ? `<span class="card-year">${year}</span>` : ''}
                </div>
            </div>
        `;

        // Setup lazy loading
        this.setupLazyLoading(card);

        // Add click handler
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.wishlist-btn')) {
                const slug = content.slug || `content-${content.id}`;
                window.location.href = `/content/details.html?${encodeURIComponent(slug)}`;
            }
        });

        return card;
    }

    setupEventListeners() {
        // Play trailer
        const trailerBtn = document.getElementById('watchTrailerBtn');
        if (trailerBtn) {
            trailerBtn.addEventListener('click', () => {
                if (this.contentData?.trailer) {
                    this.playTrailer(this.contentData.trailer);
                } else {
                    this.showToast('No trailer available', 'warning');
                }
            });
        }

        // Mobile play button
        const mobilePlayBtn = document.getElementById('mobilePlayBtn');
        if (mobilePlayBtn) {
            mobilePlayBtn.addEventListener('click', () => {
                if (this.contentData?.trailer) {
                    this.playTrailer(this.contentData.trailer);
                } else {
                    this.showToast('No trailer available', 'warning');
                }
            });
        }

        // Watchlist buttons
        ['watchlistBtn', 'mobileWatchlistBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.toggleWatchlist());
            }
        });

        // Favorite buttons
        ['favoriteBtn', 'mobileFavoriteBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.toggleFavorite());
            }
        });

        // Share buttons
        ['shareBtn', 'mobileShareBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.openShareModal());
            }
        });

        // Rate button
        const rateBtn = document.getElementById('rateBtn');
        if (rateBtn) {
            rateBtn.addEventListener('click', () => this.openRatingModal());
        }

        // Expand synopsis
        const expandBtn = document.getElementById('expandSynopsisBtn');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                const synopsisText = document.getElementById('overviewText');
                synopsisText.classList.toggle('expanded');
                expandBtn.classList.toggle('expanded');
                expandBtn.querySelector('span').textContent =
                    synopsisText.classList.contains('expanded') ? 'Show Less' : 'Show More';
            });
        }

        // Write review button
        const writeReviewBtn = document.getElementById('writeReviewBtn');
        if (writeReviewBtn) {
            writeReviewBtn.addEventListener('click', () => {
                if (this.isAuthenticated) {
                    window.location.href = `/review/write.html?content=${this.contentSlug}`;
                } else {
                    this.showToast('Please login to write a review', 'warning');
                    setTimeout(() => {
                        // Include current page URL as redirect parameter
                        window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.href);
                    }, 1000);
                }
            });
        }
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.nav-tab');
        const panes = document.querySelectorAll('.tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Update tabs
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update panes
                panes.forEach(pane => {
                    pane.classList.remove('active');
                    if (pane.id === `${targetTab}Tab`) {
                        pane.classList.add('active');
                    }
                });

                this.currentTab = targetTab;
            });
        });
    }

    setupMediaTabs() {
        // Handled in renderImages
    }

    setupModals() {
        // Share modal handlers
        this.setupShareHandlers();

        // Rating modal
        this.setupRatingModal();
    }

    setupShareHandlers() {
        const shareUrl = window.location.href;
        const shareTitle = this.contentData?.title || 'Check out this on CineBrain';

        // WhatsApp
        const whatsappBtn = document.getElementById('shareWhatsApp');
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', () => {
                const url = `https://wa.me/?text=${encodeURIComponent(shareTitle + '\n' + shareUrl)}`;
                window.open(url, '_blank');
            });
        }

        // Twitter
        const twitterBtn = document.getElementById('shareTwitter');
        if (twitterBtn) {
            twitterBtn.addEventListener('click', () => {
                const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
                window.open(url, '_blank');
            });
        }

        // Facebook
        const facebookBtn = document.getElementById('shareFacebook');
        if (facebookBtn) {
            facebookBtn.addEventListener('click', () => {
                const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                window.open(url, '_blank');
            });
        }

        // Copy Link
        const copyLinkBtn = document.getElementById('copyLink');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    this.showToast('Link copied to clipboard', 'success');

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('shareModal'));
                    if (modal) modal.hide();
                } catch (error) {
                    this.showToast('Failed to copy link', 'error');
                }
            });
        }
    }

    setupRatingModal() {
        const starsContainer = document.getElementById('ratingStars');
        const ratingDisplay = document.getElementById('selectedRating');
        const submitBtn = document.getElementById('submitRating');

        if (!starsContainer) return;

        let selectedRating = 0;

        // Create 10 stars
        for (let i = 1; i <= 10; i++) {
            const star = document.createElement('span');
            star.className = 'rating-star';
            star.innerHTML = '★';
            star.dataset.rating = i;

            star.addEventListener('click', () => {
                selectedRating = i;
                ratingDisplay.textContent = i;

                // Update star display
                starsContainer.querySelectorAll('.rating-star').forEach((s, index) => {
                    s.classList.toggle('active', index < i);
                });
            });

            star.addEventListener('mouseenter', () => {
                starsContainer.querySelectorAll('.rating-star').forEach((s, index) => {
                    s.classList.toggle('hover', index < i);
                });
            });

            starsContainer.appendChild(star);
        }

        starsContainer.addEventListener('mouseleave', () => {
            starsContainer.querySelectorAll('.rating-star').forEach(s => {
                s.classList.remove('hover');
            });
        });

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                if (selectedRating > 0) {
                    this.submitRating(selectedRating);
                }
            });
        }
    }

    async toggleWatchlist() {
        if (!this.isAuthenticated) {
            this.redirectToLogin('Please login to add to watchlist');
            return;
        }

        const btns = ['watchlistBtn', 'mobileWatchlistBtn'].map(id => document.getElementById(id)).filter(Boolean);

        btns.forEach(btn => btn.disabled = true);

        const isActive = btns[0]?.classList.contains('active');
        const contentId = this.contentData.id;

        try {
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
                btns.forEach(btn => {
                    btn.classList.toggle('active');
                    const icon = btn.querySelector('svg');
                    if (icon) {
                        icon.setAttribute('fill', btn.classList.contains('active') ? 'currentColor' : 'none');
                    }
                });

                if (!isActive) {
                    this.userWatchlist.add(parseInt(contentId));
                    this.showToast('Added to watchlist', 'success');
                } else {
                    this.userWatchlist.delete(parseInt(contentId));
                    this.showToast('Removed from watchlist', 'success');
                }

                // Update global state if available
                if (window.contentCardManager) {
                    if (!isActive) {
                        window.contentCardManager.userWatchlist.add(parseInt(contentId));
                    } else {
                        window.contentCardManager.userWatchlist.delete(parseInt(contentId));
                    }
                }
            } else {
                throw new Error('Failed to update watchlist');
            }
        } catch (error) {
            console.error('Error updating watchlist:', error);
            this.showToast('Failed to update watchlist', 'error');
        } finally {
            setTimeout(() => {
                btns.forEach(btn => btn.disabled = false);
            }, 500);
        }
    }

    async toggleFavorite() {
        if (!this.isAuthenticated) {
            this.redirectToLogin('Please login to add to favorites');
            return;
        }

        const btns = ['favoriteBtn', 'mobileFavoriteBtn'].map(id => document.getElementById(id)).filter(Boolean);

        btns.forEach(btn => btn.disabled = true);

        const isActive = btns[0]?.classList.contains('active');
        const contentId = this.contentData.id;

        try {
            const response = await fetch(`${this.apiBase}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    content_id: parseInt(contentId),
                    interaction_type: isActive ? 'remove_favorite' : 'favorite'
                })
            });

            if (response.ok) {
                btns.forEach(btn => {
                    btn.classList.toggle('active');
                    const icon = btn.querySelector('svg');
                    if (icon) {
                        icon.setAttribute('fill', btn.classList.contains('active') ? 'currentColor' : 'none');
                    }
                });

                if (!isActive) {
                    this.userFavorites.add(parseInt(contentId));
                    this.showToast('Added to favorites', 'success');
                } else {
                    this.userFavorites.delete(parseInt(contentId));
                    this.showToast('Removed from favorites', 'success');
                }

                // Update global state if available
                if (window.contentCardManager) {
                    if (!isActive) {
                        window.contentCardManager.userFavorites.add(parseInt(contentId));
                    } else {
                        window.contentCardManager.userFavorites.delete(parseInt(contentId));
                    }
                }
            } else {
                throw new Error('Failed to update favorites');
            }
        } catch (error) {
            console.error('Error updating favorites:', error);
            this.showToast('Failed to update favorites', 'error');
        } finally {
            setTimeout(() => {
                btns.forEach(btn => btn.disabled = false);
            }, 500);
        }
    }
    async submitRating(rating) {
        if (!this.isAuthenticated) {
            this.showToast('Please login to rate', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    content_id: this.contentData.id,
                    interaction_type: 'rating',
                    rating: rating
                })
            });

            if (response.ok) {
                this.showToast('Rating submitted', 'success');

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('ratingModal'));
                if (modal) modal.hide();
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            this.showToast('Failed to submit rating', 'error');
        }
    }

    playTrailer(trailer) {
        if (!trailer || !trailer.embed_url) {
            this.showToast('No trailer available', 'warning');
            return;
        }

        const modal = document.getElementById('trailerModal');
        const trailerFrame = document.getElementById('trailerFrame');

        if (modal && trailerFrame) {
            trailerFrame.src = trailer.embed_url;

            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

            modal.addEventListener('hidden.bs.modal', () => {
                trailerFrame.src = '';
            }, { once: true });
        }
    }

    playVideo(key) {
        const url = `https://www.youtube.com/embed/${key}?autoplay=1`;
        this.playTrailer({ embed_url: url });
    }

    openLightbox(imageUrl) {
        const lightbox = document.getElementById('imageLightbox');
        const lightboxImage = document.getElementById('lightboxImage');

        if (lightbox && lightboxImage) {
            lightboxImage.src = imageUrl;
            lightbox.classList.add('active');

            // Close button
            const closeBtn = document.getElementById('closeLightbox');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    lightbox.classList.remove('active');
                }, { once: true });
            }

            // Click outside to close
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    lightbox.classList.remove('active');
                }
            }, { once: true });
        }
    }

    openShareModal() {
        const modal = new bootstrap.Modal(document.getElementById('shareModal'));
        modal.show();
    }

    openRatingModal() {
        if (!this.isAuthenticated) {
            this.showToast('Please login to rate', 'warning');
            setTimeout(() => {
                // Include current page URL as redirect parameter
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.href);
            }, 1000);
            return;
        }

        const modal = new bootstrap.Modal(document.getElementById('ratingModal'));
        modal.show();
    }

    setupCarouselNavigation(carouselContainer) {
        const wrapper = carouselContainer.querySelector('.carousel-wrapper');
        const prevBtn = carouselContainer.querySelector('.carousel-nav.prev');
        const nextBtn = carouselContainer.querySelector('.carousel-nav.next');

        if (!wrapper) return;

        const getScrollAmount = () => {
            const containerWidth = wrapper.clientWidth;
            const cardWidth = wrapper.querySelector('.content-card')?.offsetWidth || 180;
            const gap = parseInt(getComputedStyle(wrapper).gap) || 12;
            const visibleCards = Math.floor(containerWidth / (cardWidth + gap));
            return (cardWidth + gap) * Math.max(1, visibleCards - 1);
        };

        const updateNavButtons = () => {
            if (!prevBtn || !nextBtn) return;

            const scrollLeft = wrapper.scrollLeft;
            const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;

            prevBtn.classList.toggle('disabled', scrollLeft <= 0);
            nextBtn.classList.toggle('disabled', scrollLeft >= maxScroll - 1);
        };

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

    updateActionButtons() {
        // Update watchlist buttons
        const isInWatchlist = this.userWatchlist.has(parseInt(this.contentData.id));
        ['watchlistBtn', 'mobileWatchlistBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.toggle('active', isInWatchlist);
            }
        });

        // Update favorite buttons
        const isInFavorites = this.userFavorites.has(parseInt(this.contentData.id));
        ['favoriteBtn', 'mobileFavoriteBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.toggle('active', isInFavorites);
            }
        });
    }

    async loadUserLists() {
        // Implementation to load user's watchlist and favorites
        // ... (similar to original)
    }

    // Helper methods
    hideLoader() {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, 300);
        }
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value || '';
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

    formatRuntime(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    formatNumber(num) {
        if (!num) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    formatCurrency(amount) {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    }

    getLanguageName(code) {
        const languages = {
            'en': 'EN',
            'es': 'ES',
            'fr': 'FR',
            'de': 'DE',
            'ja': 'JA',
            'ko': 'KO',
            'zh': 'ZH',
            'hi': 'HI',
            'te': 'TE'
        };
        return languages[code] || code?.toUpperCase() || 'Unknown';
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating / 2);
        const stars = [];

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push('<span style="color: var(--rating-star-color)">★</span>');
            } else {
                stars.push('<span style="color: var(--text-secondary)">★</span>');
            }
        }

        return stars.join('');
    }

    showToast(message, type = 'success') {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        }
    }

    showError(message) {
        const container = document.querySelector('#main-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px;">
                    <h2 style="color: var(--text-primary);">Error</h2>
                    <p style="color: var(--text-secondary);">${this.escapeHtml(message)}</p>
                    <a href="/" style="color: var(--cinebrain-primary);">Go Home</a>
                </div>
            `;
        }
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

    getPlaceholderAvatar() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI2MCIgY3k9IjYwIiByPSI2MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+PzwvdGV4dD48L3N2Zz4=';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    try {
        const detailsPage = new DetailsPage();
        window.detailsPage = detailsPage;
    } catch (error) {
        console.error('Failed to initialize details page:', error);
    }
});