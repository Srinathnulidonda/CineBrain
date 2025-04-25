class DetailsPage {
    constructor() {
        this.apiBase = 'https://cinebrain.onrender.com/api';
        this.posterBase = 'https://image.tmdb.org/t/p/w500';
        this.backdropBase = 'https://image.tmdb.org/t/p/w1280';
        this.contentSlug = this.getContentSlugFromUrl();
        this.contentData = null;
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;
        this.currentUser = this.getCurrentUser();
        this.userWatchlist = new Set();
        this.userFavorites = new Set();
        this.currentTab = 'overview';
        this.currentImageIndex = 0;
        this.currentImageSet = [];
        this.currentImageType = 'backdrops';
        this.setupSmoothScrolling();
        this.init();
    }

    setupSmoothScrolling() {
        if (!CSS.supports('scroll-behavior', 'smooth')) {
            const style = document.createElement('style');
            style.textContent = `* { scroll-behavior: smooth !important; }`;
            document.head.appendChild(style);
        }
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

            if (this.isAuthenticated) {
                await this.loadUserLists();
            }

            await this.loadContentDetails();
            this.setupEventListeners();
            this.setupTabNavigation();
            this.setupModals();

            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            this.hideLoader();

            setTimeout(() => {
                this.loadRecommendations();
            }, 300);

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

        this.updatePageMeta(data);
        this.renderHero(data);
        this.renderOverview(data);
        this.renderCastCrew(data);
        this.renderMedia(data);
        this.renderReviews(data);
        this.updateActionButtons();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    updatePageMeta(data) {
        const title = `${data.title || 'Content'} - CineBrain`;
        const description = data.synopsis?.overview || data.overview || 'Watch detailed information, trailers, cast & crew on CineBrain.';

        document.title = title;

        this.updateMetaTag('meta-title', 'content', title);
        this.updateMetaTag('meta-description', 'content', description);
        this.updateMetaTag('og-title', 'content', title);
        this.updateMetaTag('og-description', 'content', description);

        if (data.poster_url) {
            this.updateMetaTag('og-image', 'content', data.poster_url);
        }

        const canonicalUrl = window.location.href;
        this.updateMetaTag('canonical-url', 'href', canonicalUrl);
        this.updateMetaTag('og-url', 'content', canonicalUrl);
    }

    updateMetaTag(id, attribute, value) {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute(attribute, value);
        }
    }

    renderHero(data) {
        if (data.backdrop_url) {
            const backdrop = document.getElementById('heroBackdrop');
            if (backdrop) {
                backdrop.style.backgroundImage = `url(${data.backdrop_url})`;

                let ticking = false;
                const handleScroll = () => {
                    if (!ticking) {
                        requestAnimationFrame(() => {
                            const scrolled = window.pageYOffset;
                            const rate = scrolled * -0.3;
                            backdrop.style.transform = `translate3d(0, ${rate}px, 0) scale(1.05)`;
                            ticking = false;
                        });
                        ticking = true;
                    }
                };

                window.addEventListener('scroll', handleScroll, { passive: true });
            }
        }

        const poster = document.getElementById('posterImage');
        if (poster && data.poster_url) {
            const img = new Image();
            img.onload = () => {
                poster.src = img.src;
                poster.classList.add('loaded');
            };
            img.onerror = () => {
                poster.src = this.getPlaceholderImage();
                poster.classList.add('loaded');
            };
            img.src = data.poster_url;
            poster.alt = data.title || 'Content Poster';
        }

        const typeBadge = document.getElementById('contentTypeBadge');
        if (typeBadge) {
            typeBadge.textContent = (data.content_type || 'movie').toUpperCase();
        }

        this.updateElement('contentTitle', data.title);
        if (data.original_title && data.original_title !== data.title) {
            this.updateElement('originalTitle', data.original_title);
        }

        if (data.metadata?.release_date) {
            const year = new Date(data.metadata.release_date).getFullYear();
            const yearSpan = document.querySelector('#releaseYear span');
            if (yearSpan) yearSpan.textContent = year;
        }

        if (data.metadata?.runtime) {
            const runtimeSpan = document.querySelector('#runtime span');
            if (runtimeSpan) runtimeSpan.textContent = this.formatRuntime(data.metadata.runtime);
        }

        if (data.ratings?.tmdb) {
            const ratingSpan = document.querySelector('#contentRating span');
            if (ratingSpan) ratingSpan.textContent = data.ratings.tmdb.score.toFixed(1);
        }

        if (data.metadata?.original_language) {
            const langSpan = document.querySelector('#originalLanguage span');
            if (langSpan) langSpan.textContent = this.getLanguageName(data.metadata.original_language);
        }

        this.renderGenres(data.metadata?.genres || []);

        const synopsis = data.synopsis?.overview || data.overview || '';
        const quickSynopsis = document.getElementById('quickSynopsis');
        if (quickSynopsis) {
            quickSynopsis.textContent = synopsis.substring(0, 200) + (synopsis.length > 200 ? '...' : '');
        }

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
    }

    renderGenres(genres) {
        const container = document.getElementById('genreChips');
        if (!container || !Array.isArray(genres)) return;

        container.innerHTML = genres.slice(0, 4).map(genre => {
            const genreName = typeof genre === 'string' ? genre : genre.name;
            return `
                <span class="genre-tag" data-genre="${this.escapeHtml(genreName.toLowerCase())}">
                    ${this.escapeHtml(genreName)}
                </span>
            `;
        }).join('');

        container.querySelectorAll('.genre-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                tag.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    tag.style.transform = '';
                    const genre = tag.dataset.genre;
                    window.location.href = `/explore.html?genre=${encodeURIComponent(genre)}`;
                }, 100);
            });
        });
    }

    renderOverview(data) {
        const overviewText = document.getElementById('overviewText');
        if (overviewText) {
            overviewText.textContent = data.synopsis?.overview || data.overview || 'No synopsis available.';
        }

        if (data.streaming_info) {
            this.renderStreamingProviders(data.streaming_info);
        }

        this.updateElement('status', data.metadata?.status || 'Released');
        this.updateElement('releaseDate', this.formatDate(data.metadata?.release_date));

        if (data.metadata?.budget) {
            this.updateElement('budget', this.formatCurrency(data.metadata.budget));
        } else {
            this.updateElement('budget', 'N/A');
        }

        if (data.metadata?.revenue) {
            this.updateElement('revenue', this.formatCurrency(data.metadata.revenue));
        } else {
            this.updateElement('revenue', 'N/A');
        }

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

        if (data.metadata?.production_companies) {
            this.renderProductionCompanies(data.metadata.production_companies);
        }

        if (data.synopsis?.keywords && data.synopsis.keywords.length > 0) {
            this.renderKeywords(data.synopsis.keywords);
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
        container.innerHTML = keywords.slice(0, 20).map(keyword => `
            <span class="keyword-tag" data-keyword="${this.escapeHtml(keyword)}">
                ${this.escapeHtml(keyword)}
            </span>
        `).join('');
    }

    renderCastCrew(data) {
        if (!data.cast_crew) return;

        const castGrid = document.getElementById('castGrid');
        const noCast = document.getElementById('noCast');

        if (castGrid && data.cast_crew.cast && data.cast_crew.cast.length > 0) {
            const cast = data.cast_crew.cast.slice(0, 20);

            castGrid.innerHTML = cast.map(member => `
                <div class="cast-card" data-person-slug="${member.slug}" tabindex="0" role="button">
                    <img class="person-photo" 
                         src="${member.profile_path || this.getPlaceholderAvatar()}" 
                         alt="${this.escapeHtml(member.name)}"
                         loading="lazy">
                    <div class="person-name">${this.escapeHtml(member.name)}</div>
                    <div class="person-role">${this.escapeHtml(member.character || 'Unknown Character')}</div>
                </div>
            `).join('');

            castGrid.querySelectorAll('.cast-card').forEach(card => {
                const clickHandler = () => {
                    card.style.transform = 'scale(0.98)';
                    setTimeout(() => {
                        card.style.transform = '';
                        const personSlug = card.dataset.personSlug;
                        if (personSlug) {
                            window.location.href = `/content/person.html?${personSlug}`;
                        }
                    }, 100);
                };

                card.addEventListener('click', clickHandler);
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        clickHandler();
                    }
                });
            });

            noCast.style.display = 'none';
        } else {
            castGrid.innerHTML = '';
            noCast.style.display = 'flex';
        }

        const crewGrid = document.getElementById('crewGrid');
        const noCrew = document.getElementById('noCrew');

        if (crewGrid && data.cast_crew.crew) {
            const crew = [
                ...(data.cast_crew.crew.directors || []),
                ...(data.cast_crew.crew.writers || []),
                ...(data.cast_crew.crew.producers || [])
            ].slice(0, 20);

            if (crew.length > 0) {
                crewGrid.innerHTML = crew.map(member => `
                    <div class="crew-card" data-person-slug="${member.slug}" tabindex="0" role="button">
                        <img class="person-photo" 
                             src="${member.profile_path || this.getPlaceholderAvatar()}" 
                             alt="${this.escapeHtml(member.name)}"
                             loading="lazy">
                        <div class="person-name">${this.escapeHtml(member.name)}</div>
                        <div class="person-role">${this.escapeHtml(member.job || 'Unknown Job')}</div>
                    </div>
                `).join('');

                crewGrid.querySelectorAll('.crew-card').forEach(card => {
                    const clickHandler = () => {
                        card.style.transform = 'scale(0.98)';
                        setTimeout(() => {
                            card.style.transform = '';
                            const personSlug = card.dataset.personSlug;
                            if (personSlug) {
                                window.location.href = `/content/person.html?${personSlug}`;
                            }
                        }, 100);
                    };

                    card.addEventListener('click', clickHandler);
                    card.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            clickHandler();
                        }
                    });
                });

                noCrew.style.display = 'none';
            } else {
                crewGrid.innerHTML = '';
                noCrew.style.display = 'flex';
            }
        }
    }

    renderMedia(data) {
        const videos = this.getVideosFromData(data);
        if (videos && videos.length > 0) {
            this.renderVideos(videos);
            document.getElementById('noVideos').style.display = 'none';
        } else {
            document.getElementById('videosGrid').innerHTML = '';
            document.getElementById('noVideos').style.display = 'flex';
        }

        if (data.gallery && (data.gallery.backdrops?.length > 0 || data.gallery.posters?.length > 0)) {
            this.renderImages(data.gallery);
            document.getElementById('noImages').style.display = 'none';
        } else {
            document.getElementById('imagesGrid').innerHTML = '';
            document.getElementById('noImages').style.display = 'flex';
        }
    }

    getVideosFromData(data) {
        const videos = [];

        if (data.trailer && data.trailer.youtube_id) {
            videos.push({
                key: data.trailer.youtube_id,
                name: data.trailer.title || 'Official Trailer',
                type: 'Trailer'
            });
        }

        if (data.videos && Array.isArray(data.videos)) {
            videos.push(...data.videos);
        }

        return videos;
    }

    renderVideos(videos) {
        const container = document.getElementById('videosGrid');
        if (!container) return;

        container.innerHTML = videos.map(video => `
            <div class="video-card" data-video-key="${video.key}" tabindex="0" role="button">
                <img src="https://img.youtube.com/vi/${video.key}/hqdefault.jpg" 
                     alt="${this.escapeHtml(video.name)}"
                     class="video-thumbnail"
                     loading="lazy">
                <div class="video-play-btn">
                    <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
                <div class="video-title">${this.escapeHtml(video.name)}</div>
            </div>
        `).join('');

        container.querySelectorAll('.video-card').forEach(card => {
            const clickHandler = () => {
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';
                    const key = card.dataset.videoKey;
                    this.playVideo(key);
                }, 100);
            };

            card.addEventListener('click', clickHandler);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clickHandler();
                }
            });
        });

        this.setupHorizontalScroll(container);
    }

    renderImages(gallery) {
        const container = document.getElementById('imagesGrid');
        if (!container) return;

        const renderImageType = (type) => {
            this.currentImageType = type;
            const imageList = gallery[type] || [];
            this.currentImageSet = imageList;

            if (imageList.length > 0) {
                container.innerHTML = imageList.map((image, index) => {
                    const imageUrl = image.url || image.file_path || image;
                    const thumbnailUrl = image.thumbnail || imageUrl;

                    return `
                        <div class="image-card" 
                             data-image-url="${imageUrl}" 
                             data-image-index="${index}"
                             tabindex="0" 
                             role="button"
                             title="Click to view full size">
                            <img src="${thumbnailUrl}" 
                                 alt="Image ${index + 1}"
                                 loading="lazy">
                        </div>
                    `;
                }).join('');

                container.querySelectorAll('.image-card').forEach((card, index) => {
                    const clickHandler = () => {
                        card.style.transform = 'scale(0.98)';
                        setTimeout(() => {
                            card.style.transform = '';
                            this.openLightbox(index);
                        }, 100);
                    };

                    card.addEventListener('click', clickHandler);
                    card.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            clickHandler();
                        }
                    });
                });

                document.getElementById('noImages').style.display = 'none';
            } else {
                container.innerHTML = '';
                this.currentImageSet = [];
                document.getElementById('noImages').style.display = 'flex';
            }
        };

        renderImageType('backdrops');

        document.querySelectorAll('.media-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                container.style.opacity = '0.5';
                setTimeout(() => {
                    renderImageType(tab.dataset.media);
                    container.style.opacity = '1';
                }, 150);
            });
        });

        this.setupHorizontalScroll(container);
    }

    setupHorizontalScroll(container) {
        container.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY > 0 ? 100 : -100;
            }
        }, { passive: false });

        let isScrolling = false;
        let startX = 0;
        let scrollLeft = 0;

        container.addEventListener('touchstart', (e) => {
            isScrolling = true;
            startX = e.touches[0].pageX;
            scrollLeft = container.scrollLeft;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isScrolling) return;
            const x = e.touches[0].pageX;
            const walk = (startX - x) * 1.5;
            container.scrollLeft = scrollLeft + walk;
        }, { passive: true });

        container.addEventListener('touchend', () => {
            isScrolling = false;
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

        container.style.display = 'flex';
        if (noReviews) noReviews.style.display = 'none';

        // Sort reviews by creation date (newest first)
        const sortedReviews = [...data.reviews].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        container.innerHTML = sortedReviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="reviewer-info">
                    <img class="reviewer-avatar" 
                         src="${review.user?.avatar || this.getPlaceholderAvatar()}" 
                         alt="${this.escapeHtml(review.user?.username || 'Anonymous')}"
                         loading="lazy">
                    <div class="reviewer-details">
                        <div class="reviewer-name">${this.escapeHtml(review.user?.username || 'Anonymous')}</div>
                        <div class="review-date">${this.formatDate(review.created_at)}</div>
                        ${review.has_spoilers ? '<div class="spoiler-warning">⚠️ Contains Spoilers</div>' : ''}
                    </div>
                </div>
                <div class="review-rating">
                    ${this.renderStars(review.rating || 0)}
                    <span class="rating-value">${(review.rating || 0).toFixed(1)}</span>
                </div>
            </div>
            <div class="review-content">
                ${review.title ? `<h4 class="review-title">${this.escapeHtml(review.title)}</h4>` : ''}
                <p class="review-text ${review.has_spoilers ? 'spoiler-content' : ''}">${this.escapeHtml(review.review_text || review.content)}</p>
                ${review.has_spoilers ? '<button class="show-spoiler-btn" onclick="this.previousElementSibling.classList.toggle(\'revealed\'); this.textContent = this.textContent === \'Show Spoilers\' ? \'Hide Spoilers\' : \'Show Spoilers\'">Show Spoilers</button>' : ''}
            </div>
            <div class="review-actions">
                <button class="review-action-btn" data-review-id="${review.id}" onclick="detailsPage.voteReviewHelpful(${review.id}, true)">
                    <i data-feather="thumbs-up"></i>
                    Helpful (${review.helpful_count || 0})
                </button>
                ${this.currentUser?.id === review.user?.id ? `
                    <button class="review-action-btn edit-review" data-review-id="${review.id}">
                        <i data-feather="edit"></i>
                        Edit
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // Add method to refresh reviews after submission
    async refreshReviews() {
        try {
            const response = await fetch(`${this.apiBase}/details/${encodeURIComponent(this.contentSlug)}`, {
                headers: {
                    'Accept': 'application/json',
                    ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.contentData.reviews = data.reviews;
                this.renderReviews(data);
                console.log('Reviews refreshed');
            }
        } catch (error) {
            console.error('Error refreshing reviews:', error);
        }
    }

    // Add method to vote on review helpfulness
    async voteReviewHelpful(reviewId, isHelpful = true) {
        if (!this.isAuthenticated) {
            this.showToast('Please login to vote on reviews', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/reviews/${reviewId}/helpful`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({ is_helpful: isHelpful })
            });

            if (response.ok) {
                this.showToast('Thank you for your feedback!', 'success');
                // Refresh reviews to show updated helpful count
                this.refreshReviews();
            } else {
                throw new Error('Failed to vote on review');
            }
        } catch (error) {
            console.error('Error voting on review:', error);
            this.showToast('Failed to submit vote', 'error');
        }
    }

    async loadRecommendations() {
        await this.loadSimilarContent();
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
                if (data.similar_content && data.similar_content.length > 0) {
                    this.renderCarousel('similarContent', data.similar_content);
                    document.getElementById('noSimilar').style.display = 'none';
                } else {
                    document.getElementById('noSimilar').style.display = 'flex';
                }
            }
        } catch (error) {
            console.error('Error loading similar content:', error);
            document.getElementById('noSimilar').style.display = 'flex';
        }
    }

    async loadGenreContent() {
        if (!this.contentData?.metadata?.genres?.[0]) return;

        const primaryGenre = typeof this.contentData.metadata.genres[0] === 'string'
            ? this.contentData.metadata.genres[0]
            : this.contentData.metadata.genres[0].name;

        const genreTitle = document.getElementById('genreTitle');
        if (genreTitle) {
            genreTitle.textContent = `More ${primaryGenre}`;
        }

        try {
            const response = await fetch(
                `${this.apiBase}/recommendations/genre/${encodeURIComponent(primaryGenre.toLowerCase())}?type=${this.contentData.content_type}&limit=20`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.recommendations && data.recommendations.length > 0) {
                    this.renderCarousel('genreContent', data.recommendations);
                    document.getElementById('noGenre').style.display = 'none';
                } else {
                    document.getElementById('noGenre').style.display = 'flex';
                }
            }
        } catch (error) {
            console.error('Error loading genre content:', error);
            document.getElementById('noGenre').style.display = 'flex';
        }
    }

    renderCarousel(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container || !items) return;

        container.innerHTML = '';

        items.forEach(item => {
            const card = this.createContentCard(item);
            if (card) {
                container.appendChild(card);
            }
        });

        const carouselContainer = container.closest('.carousel-container');
        if (carouselContainer) {
            this.setupCarouselNavigation(carouselContainer);
        }
    }

    createContentCard(content) {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.dataset.contentId = content.id;

        if (content.slug) {
            card.dataset.contentSlug = content.slug;
        }

        const posterUrl = this.formatPosterUrl(content.poster_url || content.poster_path);
        const rating = this.formatRating(content.rating);
        const ratingValue = parseFloat(content.rating) || 0;
        const year = this.extractYear(content.release_date);
        const genres = content.genres?.slice(0, 2) || [];
        const contentType = content.content_type || 'movie';
        const runtime = this.formatRuntime(content.runtime);
        const isInWatchlist = this.userWatchlist.has(parseInt(content.id));

        card.innerHTML = `
            <div class="card-poster-container">
                <img 
                    class="card-poster" 
                    data-src="${posterUrl}" 
                    alt="${this.escapeHtml(content.title || 'Content')}"
                    loading="lazy"
                >
                <div class="content-type-badge ${contentType}">
                    ${contentType.toUpperCase()}
                </div>
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
                        <div class="rating-badge" ${ratingValue >= 8.0 ? 'data-high-rating="true"' : ''}>
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
                    ${runtime ? `<span class="card-runtime">• ${runtime}</span>` : ''}
                </div>
                ${genres.length > 0 ? `
                    <div class="card-genres">
                        ${genres.map(genre => `<span class="genre-chip">${this.escapeHtml(genre)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        this.setupLazyLoading(card);
        this.setupCardHandlers(card, content);

        return card;
    }

    setupCardHandlers(card, content) {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.wishlist-btn')) {
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';

                    let slug = content.slug;

                    if (!slug && content.title) {
                        slug = this.generateSlug(content.title, content.release_date);
                    }

                    if (slug) {
                        window.location.href = `/content/details.html?${encodeURIComponent(slug)}`;
                    } else {
                        console.error('No slug available for content:', content);
                        this.showToast('Unable to view details', 'error');
                    }
                }, 100);
            }
        });

        const wishlistBtn = card.querySelector('.wishlist-btn');
        wishlistBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleWishlistClick(content.id, wishlistBtn);
        });
    }

    generateSlug(title, releaseDate) {
        if (!title) return '';

        let slug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .trim();

        if (releaseDate) {
            const year = this.extractYear(releaseDate);
            if (year) {
                slug += `-${year}`;
            }
        }

        if (slug.length > 100) {
            slug = slug.substring(0, 100).replace(/-[^-]*$/, '');
        }

        return slug;
    }

    setupEventListeners() {
        ['watchTrailerBtn', 'mobilePlayBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    btn.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        btn.style.transform = '';
                        if (this.contentData?.trailer) {
                            this.playTrailer(this.contentData.trailer);
                        } else {
                            this.showToast('No trailer available', 'warning');
                        }
                    }, 100);
                });
            }
        });

        ['watchlistBtn', 'mobileWatchlistBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.toggleWatchlist());
            }
        });

        ['favoriteBtn', 'mobileFavoriteBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.toggleFavorite());
            }
        });

        ['shareBtn', 'mobileShareBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.openShareModal());
            }
        });

        const rateBtn = document.getElementById('rateBtn');
        if (rateBtn) {
            rateBtn.addEventListener('click', () => this.openRatingModal());
        }

        const expandBtn = document.getElementById('expandSynopsisBtn');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                const synopsisText = document.getElementById('overviewText');
                const isExpanded = synopsisText.classList.contains('expanded');

                synopsisText.classList.toggle('expanded');
                expandBtn.classList.toggle('expanded');
                expandBtn.querySelector('span').textContent = isExpanded ? 'Show More' : 'Show Less';

                if (!isExpanded) {
                    setTimeout(() => {
                        synopsisText.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 200);
                }
            });
        }

        const writeReviewBtn = document.getElementById('writeReviewBtn');
        if (writeReviewBtn) {
            writeReviewBtn.addEventListener('click', () => {
                if (this.isAuthenticated) {
                    window.location.href = `/content/review-write.html?content=${this.contentSlug}`;
                } else {
                    this.showToast('Please login to write a review', 'warning');
                    setTimeout(() => {
                        window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.href);
                    }, 1000);
                }
            });
        }
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.nav-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                const currentPane = document.querySelector('.tab-pane.active');
                if (currentPane) {
                    currentPane.style.opacity = '0';
                    setTimeout(() => {
                        currentPane.classList.remove('active');

                        tabs.forEach(t => {
                            t.classList.remove('active');
                            t.setAttribute('aria-selected', 'false');
                        });

                        tab.classList.add('active');
                        tab.setAttribute('aria-selected', 'true');

                        const newPane = document.getElementById(`${targetTab}Tab`);
                        if (newPane) {
                            newPane.classList.add('active');
                            newPane.style.opacity = '0';
                            setTimeout(() => {
                                newPane.style.opacity = '1';
                            }, 50);
                        }

                        this.currentTab = targetTab;

                        if (typeof feather !== 'undefined') {
                            feather.replace();
                        }
                    }, 150);
                }
            });
        });
    }

    setupModals() {
        this.setupShareHandlers();
        this.setupRatingModal();
    }

    setupShareHandlers() {
        const shareUrl = window.location.href;
        const shareTitle = this.contentData?.title || 'Check this out on CineBrain';
        const shareText = `${shareTitle}\n\n${this.contentData?.synopsis?.overview?.substring(0, 100) || 'Discover amazing content on CineBrain'}...`;

        const whatsappBtn = document.getElementById('shareWhatsApp');
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', () => {
                const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
                window.open(url, '_blank');
            });
        }

        const twitterBtn = document.getElementById('shareTwitter');
        if (twitterBtn) {
            twitterBtn.addEventListener('click', () => {
                const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
                window.open(url, '_blank');
            });
        }

        const facebookBtn = document.getElementById('shareFacebook');
        if (facebookBtn) {
            facebookBtn.addEventListener('click', () => {
                const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                window.open(url, '_blank');
            });
        }

        const linkedinBtn = document.getElementById('shareLinkedIn');
        if (linkedinBtn) {
            linkedinBtn.addEventListener('click', () => {
                const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                window.open(url, '_blank');
            });
        }

        const copyLinkBtn = document.getElementById('copyLink');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(shareUrl);

                    copyLinkBtn.classList.add('copied');
                    const originalHTML = copyLinkBtn.innerHTML;
                    copyLinkBtn.innerHTML = `
                        <i data-feather="check"></i>
                        <span>Copied!</span>
                    `;

                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }

                    setTimeout(() => {
                        copyLinkBtn.classList.remove('copied');
                        copyLinkBtn.innerHTML = originalHTML;
                        if (typeof feather !== 'undefined') {
                            feather.replace();
                        }
                    }, 2000);

                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('shareModal'));
                        if (modal) modal.hide();
                    }, 1500);
                } catch (error) {
                    this.showToast('Failed to copy link', 'error');
                }
            });
        }

        const shareMoreBtn = document.getElementById('shareMore');
        if (shareMoreBtn) {
            shareMoreBtn.addEventListener('click', async () => {
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            url: shareUrl
                        });
                    } catch (error) {
                        console.log('Share cancelled or failed');
                    }
                } else {
                    this.showToast('Native sharing not supported', 'warning');
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

        starsContainer.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const star = document.createElement('span');
            star.className = 'rating-star';
            star.innerHTML = '★';
            star.dataset.rating = i;
            star.setAttribute('role', 'radio');
            star.setAttribute('aria-label', `${i} stars`);
            star.setAttribute('tabindex', '0');

            const selectStar = () => {
                selectedRating = i;
                if (ratingDisplay) ratingDisplay.textContent = i;

                starsContainer.querySelectorAll('.rating-star').forEach((s, index) => {
                    s.classList.toggle('active', index < i);
                });
            };

            star.addEventListener('click', selectStar);
            star.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectStar();
                }
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
                } else {
                    this.showToast('Please select a rating', 'warning');
                }
            });
        }
    }

    openLightbox(imageIndex = 0) {
        if (!this.currentImageSet || this.currentImageSet.length === 0) return;

        this.currentImageIndex = imageIndex;
        const lightbox = document.getElementById('imageLightbox');
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxCounter = document.getElementById('lightboxCounter');
        const prevBtn = document.getElementById('lightboxPrev');
        const nextBtn = document.getElementById('lightboxNext');

        if (!lightbox || !lightboxImage) return;

        this.updateLightboxImage();

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateLightbox(-1), { once: false });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateLightbox(1), { once: false });
        }

        const closeBtn = document.getElementById('closeLightbox');
        const closeLightbox = () => {
            lightbox.style.opacity = '0';
            setTimeout(() => {
                lightbox.classList.remove('active');
                lightbox.style.opacity = '1';
                document.body.style.overflow = '';
                document.removeEventListener('keydown', this.handleLightboxKeyboard);
            }, 200);
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeLightbox, { once: true });
        }

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        }, { once: true });

        this.handleLightboxKeyboard = (e) => {
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    closeLightbox();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateLightbox(-1);
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateLightbox(1);
                    break;
                case 'Home':
                    e.preventDefault();
                    this.currentImageIndex = 0;
                    this.updateLightboxImage();
                    break;
                case 'End':
                    e.preventDefault();
                    this.currentImageIndex = this.currentImageSet.length - 1;
                    this.updateLightboxImage();
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    this.navigateLightbox(1);
                    break;
                case 'Backspace':
                    e.preventDefault();
                    this.navigateLightbox(-1);
                    break;
                default:
                    if (e.key >= '1' && e.key <= '9') {
                        e.preventDefault();
                        const targetIndex = parseInt(e.key) - 1;
                        if (targetIndex < this.currentImageSet.length) {
                            this.currentImageIndex = targetIndex;
                            this.updateLightboxImage();
                        }
                    }
                    break;
            }
        };

        document.addEventListener('keydown', this.handleLightboxKeyboard);

        this.updateLightboxImage();
    }

    updateLightboxImage() {
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxCounter = document.getElementById('lightboxCounter');
        const prevBtn = document.getElementById('lightboxPrev');
        const nextBtn = document.getElementById('lightboxNext');

        if (!lightboxImage || !this.currentImageSet.length) return;

        const currentImage = this.currentImageSet[this.currentImageIndex];
        const imageUrl = currentImage.url || currentImage.file_path || currentImage;

        lightboxImage.style.opacity = '0.5';
        lightboxImage.src = imageUrl;
        lightboxImage.alt = `Image ${this.currentImageIndex + 1} of ${this.currentImageSet.length}`;

        lightboxImage.onload = () => {
            lightboxImage.style.opacity = '1';
        };

        if (lightboxCounter) {
            lightboxCounter.textContent = `${this.currentImageIndex + 1} / ${this.currentImageSet.length}`;
        }

        if (prevBtn) {
            prevBtn.classList.toggle('disabled', this.currentImageIndex === 0);
            prevBtn.disabled = this.currentImageIndex === 0;
        }

        if (nextBtn) {
            nextBtn.classList.toggle('disabled', this.currentImageIndex === this.currentImageSet.length - 1);
            nextBtn.disabled = this.currentImageIndex === this.currentImageSet.length - 1;
        }
    }

    navigateLightbox(direction) {
        if (!this.currentImageSet.length) return;

        const newIndex = this.currentImageIndex + direction;

        if (newIndex >= 0 && newIndex < this.currentImageSet.length) {
            this.currentImageIndex = newIndex;
            this.updateLightboxImage();

            const lightboxContent = document.querySelector('.lightbox-content');
            if (lightboxContent) {
                lightboxContent.style.transform = `translateX(${direction > 0 ? '10px' : '-10px'})`;
                setTimeout(() => {
                    lightboxContent.style.transform = '';
                }, 150);
            }
        }
    }

    async handleWishlistClick(contentId, button) {
        if (!this.isAuthenticated) {
            this.showToast('Please login to add to watchlist', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.href);
            }, 1000);
            return;
        }

        try {
            const isCurrentlyInWishlist = button.classList.contains('active');
            button.disabled = true;
            button.style.transform = 'scale(0.9)';

            const response = await fetch(`${this.apiBase}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    content_id: parseInt(contentId),
                    interaction_type: isCurrentlyInWishlist ? 'remove_watchlist' : 'watchlist'
                })
            });

            if (response.ok) {
                button.classList.toggle('active');
                const icon = button.querySelector('svg path');
                if (icon) {
                    icon.setAttribute('fill', button.classList.contains('active') ? 'currentColor' : 'none');
                }

                if (!isCurrentlyInWishlist) {
                    this.userWatchlist.add(parseInt(contentId));
                    this.showToast('Added to watchlist', 'success');
                } else {
                    this.userWatchlist.delete(parseInt(contentId));
                    this.showToast('Removed from watchlist', 'success');
                }
            } else {
                throw new Error('Failed to update watchlist');
            }
        } catch (error) {
            console.error('Error updating watchlist:', error);
            this.showToast('Failed to update watchlist', 'error');
        } finally {
            setTimeout(() => {
                button.disabled = false;
                button.style.transform = '';
            }, 200);
        }
    }

    async toggleWatchlist() {
        const btns = ['watchlistBtn', 'mobileWatchlistBtn'].map(id => document.getElementById(id)).filter(Boolean);
        if (btns.length > 0) {
            await this.handleWishlistClick(this.contentData.id, btns[0]);

            const isActive = btns[0].classList.contains('active');
            btns.forEach(btn => {
                btn.classList.toggle('active', isActive);
            });
        }
    }

    async toggleFavorite() {
        if (!this.isAuthenticated) {
            this.showToast('Please login to add to favorites', 'warning');
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.href);
            }, 1000);
            return;
        }

        const btns = ['favoriteBtn', 'mobileFavoriteBtn'].map(id => document.getElementById(id)).filter(Boolean);

        btns.forEach(btn => {
            btn.disabled = true;
            btn.style.transform = 'scale(0.9)';
        });

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
                    const icon = btn.querySelector('svg path');
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
            } else {
                throw new Error('Failed to update favorites');
            }
        } catch (error) {
            console.error('Error updating favorites:', error);
            this.showToast('Failed to update favorites', 'error');
        } finally {
            setTimeout(() => {
                btns.forEach(btn => {
                    btn.disabled = false;
                    btn.style.transform = '';
                });
            }, 200);
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
                this.showToast('Rating submitted successfully!', 'success');

                const modal = bootstrap.Modal.getInstance(document.getElementById('ratingModal'));
                if (modal) modal.hide();
            } else {
                throw new Error('Failed to submit rating');
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
        const trailerTitle = document.getElementById('trailerTitle');

        if (modal && trailerFrame) {
            trailerFrame.src = trailer.embed_url;
            if (trailerTitle) {
                trailerTitle.textContent = trailer.name || 'Trailer';
            }

            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

            modal.addEventListener('hidden.bs.modal', () => {
                trailerFrame.src = '';
            }, { once: true });
        }
    }

    playVideo(key) {
        const url = `https://www.youtube.com/embed/${key}?autoplay=1&rel=0`;
        this.playTrailer({ embed_url: url, name: 'Video' });
    }

    openShareModal() {
        const modal = new bootstrap.Modal(document.getElementById('shareModal'));
        modal.show();
    }

    openRatingModal() {
        if (!this.isAuthenticated) {
            this.showToast('Please login to rate content', 'warning');
            setTimeout(() => {
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
            const cardWidth = wrapper.querySelector('.content-card')?.offsetWidth || 200;
            const gap = parseInt(getComputedStyle(wrapper).gap) || 16;
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

        this.setupTouchScroll(wrapper);
    }

    setupTouchScroll(wrapper) {
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        wrapper.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
            wrapper.style.cursor = 'grabbing';
            wrapper.style.scrollBehavior = 'auto';
        });

        wrapper.addEventListener('mouseleave', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
            wrapper.style.scrollBehavior = 'smooth';
        });

        wrapper.addEventListener('mouseup', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
            wrapper.style.scrollBehavior = 'smooth';
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - wrapper.offsetLeft;
            const walk = (x - startX) * 1.5;
            wrapper.scrollLeft = scrollLeft - walk;
        });

        wrapper.addEventListener('touchstart', (e) => {
            isDown = true;
            startX = e.touches[0].pageX;
            scrollLeft = wrapper.scrollLeft;
            wrapper.style.scrollBehavior = 'auto';
        }, { passive: true });

        wrapper.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            const x = e.touches[0].pageX;
            const walk = (startX - x) * 1.2;
            wrapper.scrollLeft = scrollLeft + walk;
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            isDown = false;
            wrapper.style.scrollBehavior = 'smooth';
        });
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
                            img.style.opacity = '1';
                        };
                        tempImg.onerror = () => {
                            img.src = this.getPlaceholderImage();
                            img.classList.add('loaded');
                            img.style.opacity = '1';
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
        const isInWatchlist = this.userWatchlist.has(parseInt(this.contentData.id));
        ['watchlistBtn', 'mobileWatchlistBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.toggle('active', isInWatchlist);
                btn.setAttribute('title', isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist');
            }
        });

        const isInFavorites = this.userFavorites.has(parseInt(this.contentData.id));
        ['favoriteBtn', 'mobileFavoriteBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.toggle('active', isInFavorites);
                btn.setAttribute('title', isInFavorites ? 'Remove from Favorites' : 'Add to Favorites');
            }
        });
    }

    async loadUserLists() {
        if (!this.authToken) return;

        try {
            const watchlistResponse = await fetch(`${this.apiBase}/user/watchlist`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (watchlistResponse.ok) {
                const watchlistData = await watchlistResponse.json();
                this.userWatchlist.clear();
                if (watchlistData.watchlist && Array.isArray(watchlistData.watchlist)) {
                    watchlistData.watchlist.forEach(item => {
                        this.userWatchlist.add(parseInt(item.id));
                    });
                }
            }

            const favoritesResponse = await fetch(`${this.apiBase}/user/favorites`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (favoritesResponse.ok) {
                const favoritesData = await favoritesResponse.json();
                this.userFavorites.clear();
                if (favoritesData.favorites && Array.isArray(favoritesData.favorites)) {
                    favoritesData.favorites.forEach(item => {
                        this.userFavorites.add(parseInt(item.id));
                    });
                }
            }
        } catch (error) {
            console.error('Error loading user lists:', error);
        }
    }

    hideLoader() {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.classList.add('hidden');
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                }, 300);
            }, 200);
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

    formatRating(rating) {
        if (!rating) return 'N/A';
        return Number(rating).toFixed(1);
    }

    extractYear(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).getFullYear();
        } catch {
            return '';
        }
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
            'en': 'EN', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'ja': 'JA',
            'ko': 'KO', 'zh': 'ZH', 'hi': 'HI', 'te': 'TE', 'ta': 'TA',
            'ml': 'ML', 'kn': 'KN', 'bn': 'BN', 'gu': 'GU', 'mr': 'MR'
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
        } else {
            console.log(`Toast: ${message} (${type})`);
        }
    }

    showError(message) {
        const container = document.querySelector('#main-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px; min-height: 400px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <i data-feather="alert-circle" style="width: 64px; height: 64px; color: var(--text-secondary); margin-bottom: 16px;"></i>
                    <h2 style="color: var(--text-primary); margin-bottom: 8px;">Error</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">${this.escapeHtml(message)}</p>
                    <a href="/" style="color: var(--cinebrain-primary); text-decoration: none; padding: 12px 24px; border: 1px solid var(--cinebrain-primary); border-radius: 8px;">Go Home</a>
                </div>
            `;

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
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
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI2MCIgY3k9IjYwIiByPSI2MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Pz8vdGV4dD48L3N2Zz4=';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const detailsPage = new DetailsPage();
        window.detailsPage = detailsPage;
    } catch (error) {
        console.error('Failed to initialize details page:', error);
    }
});