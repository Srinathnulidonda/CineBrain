// Details Page Controller
class DetailsPageController {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.posterBase = 'https://image.tmdb.org/t/p/w500';
        this.backdropBase = 'https://image.tmdb.org/t/p/w1280';

        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;

        this.contentId = null;
        this.contentData = null;
        this.isInWatchlist = false;
        this.isInFavorites = false;

        this.init();
    }

    async init() {
        // Extract content ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.contentId = urlParams.get('id');

        if (!this.contentId) {
            this.showError();
            return;
        }

        // Load content details
        await this.loadContentDetails();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize Feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async loadContentDetails() {
        try {
            // Show loading state
            document.getElementById('detailsLoading').style.display = 'flex';

            // Fetch content details
            const response = await fetch(`${this.apiBase}/content/${this.contentId}`, {
                headers: this.authToken ? {
                    'Authorization': `Bearer ${this.authToken}`
                } : {}
            });

            if (!response.ok) {
                throw new Error('Content not found');
            }

            this.contentData = await response.json();

            // Update page meta
            this.updatePageMeta();

            // Render content
            this.renderHeroSection();
            this.renderOverview();
            this.renderCast();
            await this.loadSimilarContent();
            await this.loadRecommendations();

            // Check user interactions if authenticated
            if (this.isAuthenticated) {
                await this.checkUserInteractions();
            }

            // Hide loading, show content
            document.getElementById('detailsLoading').style.display = 'none';
            document.getElementById('heroSection').style.display = 'block';
            document.getElementById('overviewSection').style.display = 'block';

            if (this.contentData.cast && this.contentData.cast.length > 0) {
                document.getElementById('castSection').style.display = 'block';
            }

        } catch (error) {
            console.error('Error loading content:', error);
            this.showError();
        }
    }

    updatePageMeta() {
        const title = `${this.contentData.title} - CineBrain`;
        const description = this.contentData.overview || 'Watch on CineBrain';

        document.getElementById('pageTitle').textContent = title;
        document.getElementById('pageDescription').content = description;
        document.getElementById('ogTitle').content = title;
        document.getElementById('ogDescription').content = description;
        document.getElementById('ogImage').content = this.formatPosterUrl(this.contentData.poster_path);

        const currentUrl = window.location.href;
        document.getElementById('canonicalUrl').href = currentUrl;
        document.getElementById('ogUrl').content = currentUrl;
    }

    renderHeroSection() {
        // Backdrop
        if (this.contentData.backdrop_path) {
            const backdropUrl = this.formatBackdropUrl(this.contentData.backdrop_path);
            document.getElementById('heroBackdrop').style.backgroundImage = `url(${backdropUrl})`;
        }

        // Poster
        const posterEl = document.getElementById('heroPoster');
        posterEl.src = this.formatPosterUrl(this.contentData.poster_path);
        posterEl.alt = this.contentData.title;

        // Content type badge
        document.getElementById('contentTypeBadge').textContent =
            this.contentData.content_type.toUpperCase();

        // Title and meta
        document.getElementById('heroTitle').textContent = this.contentData.title;
        document.getElementById('metaYear').textContent =
            this.extractYear(this.contentData.release_date);
        document.getElementById('metaRuntime').textContent =
            this.formatRuntime(this.contentData.runtime);
        document.getElementById('metaRating').textContent =
            this.formatRating(this.contentData.rating);

        // Genres
        const genreList = document.getElementById('genreList');
        if (this.contentData.genres && this.contentData.genres.length > 0) {
            genreList.innerHTML = this.contentData.genres.map(genre =>
                `<span class="genre-tag">${genre}</span>`
            ).join('');
        }

        // Languages
        if (this.contentData.languages) {
            document.getElementById('infoLanguages').textContent =
                this.contentData.languages.join(', ');
        }

        // Release date
        if (this.contentData.release_date) {
            document.getElementById('infoReleaseDate').textContent =
                this.formatDate(this.contentData.release_date);
        }

        // Check OTT availability
        if (this.contentData.ott_availability) {
            this.renderOTTSection(this.contentData.ott_availability);
        }
    }

    renderOverview() {
        if (!this.contentData.overview) return;

        const overviewText = document.getElementById('overviewText');
        const showMoreBtn = document.getElementById('showMoreBtn');

        overviewText.textContent = this.contentData.overview;

        // Check if text needs truncation
        if (this.contentData.overview.length > 300) {
            overviewText.classList.add('collapsed');
            showMoreBtn.style.display = 'block';
        }
    }

    renderCast() {
        if (!this.contentData.cast || this.contentData.cast.length === 0) return;

        const castWrapper = document.getElementById('castWrapper');
        castWrapper.innerHTML = this.contentData.cast.slice(0, 20).map(person => `
            <div class="cast-card">
                <img class="cast-image" 
                     src="${person.profile_path ? this.formatPosterUrl(person.profile_path) : '/assets/images/no-avatar.svg'}" 
                     alt="${person.name}">
                <div class="cast-name">${person.name}</div>
                <div class="cast-character">${person.character || person.job || ''}</div>
            </div>
        `).join('');

        // Setup cast carousel navigation
        this.setupCastCarousel();
    }

    renderOTTSection(ottData) {
        const ottSection = document.getElementById('ottSection');
        const ottPlatforms = document.getElementById('ottPlatforms');

        if (ottData.platforms && ottData.platforms.length > 0) {
            ottSection.style.display = 'block';

            // Show first 4 platforms
            const platformsToShow = ottData.platforms.slice(0, 4);

            ottPlatforms.innerHTML = platformsToShow.map(platform => `
                <a href="${platform.url}" target="_blank" class="ott-platform">
                    <img src="${this.getPlatformLogo(platform.name)}" 
                         alt="${platform.name}" 
                         class="ott-platform-logo">
                    <span class="ott-platform-name">${platform.name}</span>
                    <span class="ott-platform-type">${platform.type}</span>
                </a>
            `).join('');
        }
    }

    async loadSimilarContent() {
        try {
            const response = await fetch(
                `${this.apiBase}/recommendations/similar/${this.contentId}?limit=20`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.similar_content && data.similar_content.length > 0) {
                    this.renderCarousel('similarCarousel', data.similar_content);
                    document.getElementById('similarSection').style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error loading similar content:', error);
        }
    }

    async loadRecommendations() {
        try {
            // Get genre-based recommendations
            if (this.contentData.genres && this.contentData.genres.length > 0) {
                const genre = this.contentData.genres[0].toLowerCase();
                const response = await fetch(
                    `${this.apiBase}/recommendations/genre/${genre}?limit=20`
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.recommendations && data.recommendations.length > 0) {
                        this.renderCarousel('recommendationsCarousel', data.recommendations);
                        document.getElementById('recommendationsSection').style.display = 'block';
                    }
                }
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    renderCarousel(carouselId, items) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;

        carousel.innerHTML = items.map(item => {
            const card = document.createElement('div');
            card.className = 'content-card';
            card.innerHTML = `
                <div class="card-poster-container">
                    <img class="card-poster loaded" 
                         src="${this.formatPosterUrl(item.poster_path)}" 
                         alt="${item.title}">
                    <div class="content-type-badge ${item.content_type}">
                        ${item.content_type.toUpperCase()}
                    </div>
                    <div class="card-overlays">
                        <div class="card-bottom-overlay">
                            <div class="rating-badge">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                                <span>${this.formatRating(item.rating)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title">${item.title}</div>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href = `/content/details.html?id=${item.id}`;
            });

            return card.outerHTML;
        }).join('');

        // Setup carousel navigation
        const container = carousel.closest('.content-row');
        if (window.contentCardManager) {
            window.contentCardManager.setupCarouselNavigation(container);
        }
    }

    async checkUserInteractions() {
        // This would check if content is in user's watchlist/favorites
        // Implementation depends on your backend API
        try {
            const response = await fetch(`${this.apiBase}/user/watchlist`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.watchlist) {
                    this.isInWatchlist = data.watchlist.some(item =>
                        item.id === parseInt(this.contentId)
                    );
                    this.updateWatchlistButton();
                }
            }
        } catch (error) {
            console.error('Error checking user interactions:', error);
        }
    }

    setupEventListeners() {
        // Trailer button
        document.getElementById('watchTrailerBtn')?.addEventListener('click', () => {
            this.openTrailerModal();
        });

        // Watchlist button
        document.getElementById('watchlistBtn')?.addEventListener('click', () => {
            this.toggleWatchlist();
        });

        // Favorite button
        document.getElementById('favoriteBtn')?.addEventListener('click', () => {
            this.toggleFavorite();
        });

        // OTT button
        document.getElementById('ottBtn')?.addEventListener('click', () => {
            this.openOTTModal();
        });

        // Show more button
        document.getElementById('showMoreBtn')?.addEventListener('click', (e) => {
            const overviewText = document.getElementById('overviewText');
            overviewText.classList.toggle('collapsed');
            e.target.textContent = overviewText.classList.contains('collapsed') ?
                'Show More' : 'Show Less';
        });

        // Modal close buttons
        document.getElementById('modalClose')?.addEventListener('click', () => {
            this.closeTrailerModal();
        });

        document.getElementById('modalBackdrop')?.addEventListener('click', () => {
            this.closeTrailerModal();
        });

        document.getElementById('ottModalClose')?.addEventListener('click', () => {
            this.closeOTTModal();
        });

        document.getElementById('ottModalBackdrop')?.addEventListener('click', () => {
            this.closeOTTModal();
        });
    }

    openTrailerModal() {
        if (!this.contentData.youtube_trailer) {
            if (window.topbar?.notificationSystem) {
                window.topbar.notificationSystem.show('Trailer not available', 'info');
            }
            return;
        }

        const modal = document.getElementById('trailerModal');
        const container = document.getElementById('trailerContainer');

        // Extract YouTube ID
        const videoId = this.extractYouTubeId(this.contentData.youtube_trailer);

        if (videoId) {
            container.innerHTML = `
                <iframe 
                    src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            `;
            modal.style.display = 'block';
        }
    }

    closeTrailerModal() {
        const modal = document.getElementById('trailerModal');
        const container = document.getElementById('trailerContainer');
        container.innerHTML = '';
        modal.style.display = 'none';
    }

    async openOTTModal() {
        const modal = document.getElementById('ottModal');
        const body = document.getElementById('ottModalBody');

        modal.style.display = 'block';

        // Show loading
        body.innerHTML = `
            <div class="ott-loading">
                <div class="loading-spinner"></div>
                <p>Checking availability...</p>
            </div>
        `;

        try {
            // Fetch OTT availability
            const response = await fetch(
                `${this.apiBase}/ott/content/${this.contentId}`
            );

            if (response.ok) {
                const data = await response.json();
                this.renderOTTModalContent(data);
            } else {
                body.innerHTML = `
                    <div class="ott-error">
                        <p>Unable to fetch streaming information</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error fetching OTT data:', error);
            body.innerHTML = `
                <div class="ott-error">
                    <p>Unable to fetch streaming information</p>
                </div>
            `;
        }
    }

    renderOTTModalContent(data) {
        const body = document.getElementById('ottModalBody');

        if (!data.is_available) {
            body.innerHTML = `
                <div class="ott-not-available">
                    <p>This content is currently not available for streaming.</p>
                    <p>Check back later for updates.</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Render by category
        if (data.availability) {
            if (data.availability.free && data.availability.free.length > 0) {
                html += this.renderOTTCategory('Free', data.availability.free);
            }
            if (data.availability.subscription && data.availability.subscription.length > 0) {
                html += this.renderOTTCategory('Subscription', data.availability.subscription);
            }
            if (data.availability.rental && data.availability.rental.length > 0) {
                html += this.renderOTTCategory('Rent', data.availability.rental);
            }
            if (data.availability.purchase && data.availability.purchase.length > 0) {
                html += this.renderOTTCategory('Buy', data.availability.purchase);
            }
        }

        body.innerHTML = html || '<p>No streaming options available</p>';
    }

    renderOTTCategory(title, platforms) {
        return `
            <div class="ott-category">
                <h4 class="ott-category-title">${title}</h4>
                <div class="ott-category-platforms">
                    ${platforms.map(platform => `
                        <a href="${platform.direct_url}" target="_blank" class="ott-platform-card">
                            <div class="ott-platform-header">
                                <img src="${this.getPlatformLogo(platform.platform)}" 
                                     alt="${platform.platform}" 
                                     class="ott-platform-logo">
                                <div class="ott-platform-info">
                                    <div class="ott-platform-name">${platform.platform}</div>
                                    ${platform.price ?
                `<div class="ott-platform-price">${platform.price}</div>` : ''}
                                </div>
                            </div>
                            ${platform.quality && platform.quality.length > 0 ? `
                                <div class="ott-platform-quality">
                                    ${platform.quality.map(q =>
                    `<span class="quality-badge">${q}</span>`
                ).join('')}
                                </div>
                            ` : ''}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    closeOTTModal() {
        document.getElementById('ottModal').style.display = 'none';
    }

    async toggleWatchlist() {
        if (!this.isAuthenticated) {
            if (window.topbar?.notificationSystem) {
                window.topbar.notificationSystem.show('Please login to add to watchlist', 'warning');
            }
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' +
                    encodeURIComponent(window.location.href);
            }, 1000);
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
                    content_id: parseInt(this.contentId),
                    interaction_type: this.isInWatchlist ? 'remove_watchlist' : 'watchlist'
                })
            });

            if (response.ok) {
                this.isInWatchlist = !this.isInWatchlist;
                this.updateWatchlistButton();

                if (window.topbar?.notificationSystem) {
                    window.topbar.notificationSystem.show(
                        this.isInWatchlist ? 'Added to watchlist' : 'Removed from watchlist',
                        'success'
                    );
                }
            }
        } catch (error) {
            console.error('Error updating watchlist:', error);
            if (window.topbar?.notificationSystem) {
                window.topbar.notificationSystem.show('Failed to update watchlist', 'error');
            }
        }
    }

    async toggleFavorite() {
        if (!this.isAuthenticated) {
            if (window.topbar?.notificationSystem) {
                window.topbar.notificationSystem.show('Please login to add to favorites', 'warning');
            }
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' +
                    encodeURIComponent(window.location.href);
            }, 1000);
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
                    content_id: parseInt(this.contentId),
                    interaction_type: this.isInFavorites ? 'unfavorite' : 'favorite'
                })
            });

            if (response.ok) {
                this.isInFavorites = !this.isInFavorites;
                this.updateFavoriteButton();

                if (window.topbar?.notificationSystem) {
                    window.topbar.notificationSystem.show(
                        this.isInFavorites ? 'Added to favorites' : 'Removed from favorites',
                        'success'
                    );
                }
            }
        } catch (error) {
            console.error('Error updating favorites:', error);
            if (window.topbar?.notificationSystem) {
                window.topbar.notificationSystem.show('Failed to update favorites', 'error');
            }
        }
    }

    updateWatchlistButton() {
        const btn = document.getElementById('watchlistBtn');
        if (btn) {
            btn.classList.toggle('active', this.isInWatchlist);
            btn.querySelector('span').textContent =
                this.isInWatchlist ? 'In Watchlist' : 'Watchlist';
        }
    }

    updateFavoriteButton() {
        const btn = document.getElementById('favoriteBtn');
        if (btn) {
            btn.classList.toggle('active', this.isInFavorites);
            btn.querySelector('span').textContent =
                this.isInFavorites ? 'Favorited' : 'Favorite';
        }
    }

    setupCastCarousel() {
        const wrapper = document.getElementById('castWrapper');
        const prevBtn = document.getElementById('castPrevBtn');
        const nextBtn = document.getElementById('castNextBtn');

        if (!wrapper || !prevBtn || !nextBtn) return;

        const scrollAmount = 240; // 2 cast cards

        prevBtn.addEventListener('click', () => {
            wrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
            wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });

        // Update button states
        const updateButtons = () => {
            prevBtn.style.display = wrapper.scrollLeft > 0 ? 'flex' : 'none';
            nextBtn.style.display =
                wrapper.scrollLeft < wrapper.scrollWidth - wrapper.clientWidth ? 'flex' : 'none';
        };

        wrapper.addEventListener('scroll', updateButtons);
        updateButtons();
    }

    showError() {
        document.getElementById('detailsLoading').style.display = 'none';
        document.getElementById('detailsError').style.display = 'flex';
    }

    // Utility methods
    formatPosterUrl(path) {
        if (!path) return '/assets/images/no-poster.svg';
        if (path.startsWith('http')) return path;
        return `${this.posterBase}${path}`;
    }

    formatBackdropUrl(path) {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${this.backdropBase}${path}`;
    }

    formatRating(rating) {
        if (!rating) return 'N/A';
        return Number(rating).toFixed(1);
    }

    formatRuntime(minutes) {
        if (!minutes) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    extractYear(dateString) {
        if (!dateString) return '';
        return new Date(dateString).getFullYear();
    }

    extractYouTubeId(url) {
        if (!url) return null;
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    getPlatformLogo(platformName) {
        const logos = {
            'Netflix': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
            'Amazon Prime Video': 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png',
            'Disney+ Hotstar': 'https://secure-media.hotstarext.com/web-assets/prod/images/brand-logos/disney-hotstar-logo-dark.svg',
            'JioCinema': 'https://www.jiocinema.com/images/jc-logo.svg',
            'ZEE5': 'https://www.zee5.com/images/ZEE5_logo.svg',
            'SonyLIV': 'https://images.slivcdn.com/UI_icons/sonyliv_new_revised_header_logo.png',
            'MX Player': 'https://www.mxplayer.in/public/images/logo.svg',
            'YouTube': 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
            'Apple TV+': 'https://tv.apple.com/assets/brands/Apple_TV+_logo.svg'
        };

        return logos[platformName] || '/assets/images/ott-generic.svg';
    }
}

// Initialize controller when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DetailsPageController();
    });
} else {
    new DetailsPageController();
}