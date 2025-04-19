// Simplified Hero Manager with Fixed Image Loading
class HeroManager {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.currentIndex = 0;
        this.featuredContent = [];
        this.autoRotateInterval = null;
        this.autoRotateDelay = 6000; // 6 seconds
        this.isTransitioning = false;

        // Auth state
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;

        // Image loading helpers
        this.imageCache = new Map();

        this.init();
    }

    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    async setup() {
        console.log('Initializing Hero Manager...');

        this.setupEventListeners();
        await this.loadDailyPicks();
        this.startAutoRotation();
        this.updateDateDisplay();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        console.log('Hero Manager initialized');
    }

    setupEventListeners() {
        // Navigation buttons
        const prevBtn = document.getElementById('heroPrevBtn');
        const nextBtn = document.getElementById('heroNextBtn');

        if (prevBtn) prevBtn.addEventListener('click', () => this.previousSlide());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextSlide());

        // Indicators
        document.querySelectorAll('.indicator').forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });

        // Action buttons
        this.setupActionButtons();

        // Touch events for mobile
        this.setupTouchEvents();

        // Auto-rotation pause/resume
        const heroSection = document.getElementById('heroSection');
        if (heroSection) {
            heroSection.addEventListener('mouseenter', () => this.pauseAutoRotation());
            heroSection.addEventListener('mouseleave', () => this.resumeAutoRotation());
        }

        // Back to top
        const backToTopBtn = document.getElementById('backToTopBtn');
        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Show/hide on scroll
            window.addEventListener('scroll', this.throttle(() => {
                const show = window.scrollY > 300;
                backToTopBtn.style.opacity = show ? '1' : '0';
                backToTopBtn.style.pointerEvents = show ? 'auto' : 'none';
            }, 100));
        }
    }

    setupActionButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#watchNowBtn') || e.target.closest('.btn-watch-now')) {
                e.preventDefault();
                this.handleWatchNow();
            }

            if (e.target.closest('#addWatchlistBtn') || e.target.closest('.btn-add-watchlist')) {
                e.preventDefault();
                this.handleWatchlist();
            }

            if (e.target.closest('#moreInfoBtn') || e.target.closest('.btn-more-info')) {
                e.preventDefault();
                this.handleMoreInfo();
            }
        });
    }

    setupTouchEvents() {
        const heroContent = document.querySelector('.featured-content');
        if (!heroContent) return;

        let touchStartX = 0;
        let touchEndX = 0;

        heroContent.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            this.pauseAutoRotation();
        }, { passive: true });

        heroContent.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;

            if (Math.abs(swipeDistance) > 50) {
                if (swipeDistance > 0) {
                    this.previousSlide();
                } else {
                    this.nextSlide();
                }
            }

            this.resumeAutoRotation();
        }, { passive: true });
    }

    async loadDailyPicks() {
        const loadingElement = document.getElementById('heroLoading');

        try {
            if (loadingElement) {
                loadingElement.classList.remove('hidden');
            }

            const picks = await this.fetchDailyPicks();

            if (picks && picks.length > 0) {
                this.featuredContent = picks;
                await this.displayFeaturedContent();
            } else {
                this.displayErrorState();
            }

        } catch (error) {
            console.error('Error loading daily picks:', error);
            this.displayErrorState();
        } finally {
            setTimeout(() => {
                if (loadingElement) {
                    loadingElement.classList.add('hidden');
                }
            }, 500);
        }
    }

    async fetchDailyPicks() {
        try {
            const headers = {};
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            // Try trending first
            let response = await fetch(`${this.apiBase}/recommendations/trending?category=all&limit=20`, { headers });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            let allContent = [];

            // Handle different response structures
            if (data.categories) {
                Object.values(data.categories).forEach(categoryItems => {
                    if (Array.isArray(categoryItems)) {
                        allContent.push(...categoryItems);
                    }
                });
            } else if (data.recommendations && Array.isArray(data.recommendations)) {
                allContent = data.recommendations;
            } else if (Array.isArray(data)) {
                allContent = data;
            }

            // Filter and select best content
            const filtered = this.filterContent(allContent);
            const selected = this.selectDailyPicks(filtered, 5);

            console.log(`Fetched ${selected.length} daily picks`);
            return selected;

        } catch (error) {
            console.error('Error fetching daily picks:', error);

            // Fallback to mock data for demo
            return this.getMockContent();
        }
    }

    filterContent(content) {
        return content.filter(item => {
            return item &&
                item.id &&
                item.title &&
                item.overview &&
                item.overview.length > 30 &&
                (!item.rating || parseFloat(item.rating) >= 5.0);
        }).slice(0, 15); // Limit to reduce processing
    }

    selectDailyPicks(content, count) {
        if (content.length <= count) return content;

        // Sort by popularity and rating
        const sorted = content.sort((a, b) => {
            const scoreA = (parseFloat(a.rating) || 5) * Math.log(parseFloat(a.popularity) || 1);
            const scoreB = (parseFloat(b.rating) || 5) * Math.log(parseFloat(b.popularity) || 1);
            return scoreB - scoreA;
        });

        return sorted.slice(0, count);
    }

    getMockContent() {
        // Fallback mock data with working image URLs
        return [
            {
                id: 1,
                title: "Popular Movie",
                overview: "This is a sample movie description for demonstration purposes.",
                rating: 8.5,
                release_date: "2024-01-01",
                runtime: 135,
                content_type: "movie",
                genres: ["Action", "Adventure"],
                languages: ["English"],
                poster_path: "https://via.placeholder.com/300x450/1a1f3a/ffffff?text=Movie+1",
                backdrop_path: "https://via.placeholder.com/1280x720/2a2f4a/ffffff?text=Backdrop+1",
                slug: "popular-movie-2024"
            },
            {
                id: 2,
                title: "TV Series",
                overview: "An engaging TV series with compelling storylines and great characters.",
                rating: 9.0,
                release_date: "2024-02-01",
                runtime: 45,
                content_type: "tv",
                genres: ["Drama", "Thriller"],
                languages: ["English"],
                poster_path: "https://via.placeholder.com/300x450/1a3a1f/ffffff?text=TV+Show+1",
                backdrop_path: "https://via.placeholder.com/1280x720/2a4a2f/ffffff?text=Backdrop+2",
                slug: "tv-series-2024"
            },
            {
                id: 3,
                title: "Anime Series",
                overview: "A fantastic anime with amazing animation and storytelling.",
                rating: 8.8,
                release_date: "2024-03-01",
                runtime: 24,
                content_type: "anime",
                genres: ["Animation", "Adventure"],
                languages: ["Japanese"],
                poster_path: "https://via.placeholder.com/300x450/3a1a1f/ffffff?text=Anime+1",
                backdrop_path: "https://via.placeholder.com/1280x720/4a2a2f/ffffff?text=Backdrop+3",
                slug: "anime-series-2024"
            },
            {
                id: 4,
                title: "Action Blockbuster",
                overview: "High-octane action movie with spectacular visuals and thrilling sequences.",
                rating: 7.9,
                release_date: "2024-04-01",
                runtime: 142,
                content_type: "movie",
                genres: ["Action", "Sci-Fi"],
                languages: ["English"],
                poster_path: "https://via.placeholder.com/300x450/1f1a3a/ffffff?text=Action+1",
                backdrop_path: "https://via.placeholder.com/1280x720/2f2a4a/ffffff?text=Backdrop+4",
                slug: "action-blockbuster-2024"
            },
            {
                id: 5,
                title: "Comedy Special",
                overview: "A hilarious comedy that will keep you laughing from start to finish.",
                rating: 8.2,
                release_date: "2024-05-01",
                runtime: 98,
                content_type: "movie",
                genres: ["Comedy", "Family"],
                languages: ["English"],
                poster_path: "https://via.placeholder.com/300x450/3a3a1a/ffffff?text=Comedy+1",
                backdrop_path: "https://via.placeholder.com/1280x720/4a4a2a/ffffff?text=Backdrop+5",
                slug: "comedy-special-2024"
            }
        ];
    }

    async displayFeaturedContent() {
        if (!this.featuredContent || this.featuredContent.length === 0) {
            this.displayErrorState();
            return;
        }

        const featuredContainer = document.getElementById('featuredContent');
        if (!featuredContainer) return;

        featuredContainer.innerHTML = '';

        // Create and display featured items
        for (let i = 0; i < this.featuredContent.length; i++) {
            const content = this.featuredContent[i];
            const featuredItem = await this.createFeaturedItem(content, i);
            featuredContainer.appendChild(featuredItem);
        }

        this.updateIndicators();
        this.currentIndex = 0;
        this.showSlide(0);

        console.log('Featured content displayed');
    }

    async createFeaturedItem(content, index) {
        const featuredItem = document.createElement('div');
        featuredItem.className = `featured-item ${index === 0 ? 'active' : ''}`;
        featuredItem.dataset.index = index;

        const posterUrl = await this.getPosterUrl(content);
        const backdropUrl = this.getBackdropUrl(content);
        const rating = parseFloat(content.rating || 0).toFixed(1);
        const year = this.extractYear(content.release_date);
        const runtime = this.formatRuntime(content.runtime);
        const language = this.getLanguage(content.languages);
        const contentType = (content.content_type || 'movie').toUpperCase();
        const genres = (content.genres || []).slice(0, 3);

        featuredItem.innerHTML = `
            <div class="featured-poster-section">
                <div class="featured-poster-container">
                    <img class="featured-poster" 
                         src="${posterUrl}" 
                         alt="${this.escapeHtml(content.title)}"
                         loading="lazy">
                    <div class="poster-shimmer"></div>
                    <div class="featured-badges">
                        <span class="featured-rank">#${index + 1}</span>
                        <span class="content-type-badge">${contentType}</span>
                    </div>
                </div>
            </div>
            
            <div class="featured-info-section">
                <div class="featured-meta">
                    <div class="featured-rating">
                        <i data-feather="star" class="rating-icon"></i>
                        <span class="rating-value">${rating}</span>
                    </div>
                    <div class="featured-details">
                        ${year ? `<span>${year}</span>` : ''}
                        ${runtime ? `<span>${runtime}</span>` : ''}
                        ${language ? `<span>${language}</span>` : ''}
                    </div>
                </div>
                
                <h3 class="featured-title">${this.escapeHtml(content.title)}</h3>
                <p class="featured-description">${this.escapeHtml(content.overview)}</p>
                
                ${genres.length > 0 ? `
                    <div class="featured-genres">
                        ${genres.map(genre => `<span class="genre-chip">${this.escapeHtml(genre)}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="featured-actions">
                    <button class="btn-watch-now" data-content-id="${content.id}">
                        <i data-feather="play"></i>
                        <span>Watch Trailer</span>
                    </button>
                    <button class="btn-add-watchlist" data-content-id="${content.id}">
                        <i data-feather="bookmark"></i>
                        <span>Watchlist</span>
                    </button>
                    <button class="btn-more-info" data-content-slug="${content.slug || this.generateSlug(content.title, content.release_date)}">
                        <i data-feather="info"></i>
                        <span>More Info</span>
                    </button>
                </div>
            </div>
        `;

        // Set up poster loading
        const posterImg = featuredItem.querySelector('.featured-poster');
        const shimmer = featuredItem.querySelector('.poster-shimmer');

        posterImg.onload = () => {
            posterImg.classList.add('loaded');
            if (shimmer) shimmer.style.display = 'none';
        };

        posterImg.onerror = () => {
            posterImg.src = this.getPlaceholderPoster();
            posterImg.classList.add('loaded');
            if (shimmer) shimmer.style.display = 'none';
        };

        // Store backdrop for background
        featuredItem.dataset.backdropUrl = backdropUrl;

        return featuredItem;
    }

    async getPosterUrl(content) {
        // Handle different poster URL formats
        if (content.poster_path) {
            if (content.poster_path.startsWith('http')) {
                return content.poster_path;
            }
            if (content.poster_path.startsWith('/')) {
                return `https://image.tmdb.org/t/p/w500${content.poster_path}`;
            }
        }

        // Return placeholder if no poster
        return this.getPlaceholderPoster();
    }

    getBackdropUrl(content) {
        if (content.backdrop_path) {
            if (content.backdrop_path.startsWith('http')) {
                return content.backdrop_path;
            }
            if (content.backdrop_path.startsWith('/')) {
                return `https://image.tmdb.org/t/p/w1280${content.backdrop_path}`;
            }
        }
        return null;
    }

    getPlaceholderPoster() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzJhMmYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    }

    showSlide(index) {
        if (this.isTransitioning || index === this.currentIndex) return;

        this.isTransitioning = true;
        this.currentIndex = index;

        const featuredItems = document.querySelectorAll('.featured-item');
        featuredItems.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });

        this.updateIndicators();
        this.updateHeroBackground();

        setTimeout(() => {
            this.isTransitioning = false;
        }, 400);
    }

    nextSlide() {
        if (this.featuredContent.length === 0) return;
        const nextIndex = (this.currentIndex + 1) % this.featuredContent.length;
        this.showSlide(nextIndex);
    }

    previousSlide() {
        if (this.featuredContent.length === 0) return;
        const prevIndex = (this.currentIndex - 1 + this.featuredContent.length) % this.featuredContent.length;
        this.showSlide(prevIndex);
    }

    goToSlide(index) {
        if (index >= 0 && index < this.featuredContent.length) {
            this.showSlide(index);
        }
    }

    updateIndicators() {
        const indicators = document.querySelectorAll('.indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentIndex);
        });
    }

    updateHeroBackground() {
        const currentItem = document.querySelector(`.featured-item[data-index="${this.currentIndex}"]`);
        const heroBackdrop = document.getElementById('heroBackdrop');
        const heroBackground = document.getElementById('heroBackground');

        if (currentItem && heroBackdrop) {
            const backdropUrl = currentItem.dataset.backdropUrl;
            if (backdropUrl) {
                heroBackdrop.style.backgroundImage = `url(${backdropUrl})`;
                if (heroBackground) {
                    heroBackground.classList.add('loaded');
                }
            }
        }
    }

    startAutoRotation() {
        this.stopAutoRotation();
        if (this.featuredContent.length > 1) {
            this.autoRotateInterval = setInterval(() => {
                if (!this.isTransitioning) {
                    this.nextSlide();
                }
            }, this.autoRotateDelay);
        }
    }

    stopAutoRotation() {
        if (this.autoRotateInterval) {
            clearInterval(this.autoRotateInterval);
            this.autoRotateInterval = null;
        }
    }

    pauseAutoRotation() {
        this.stopAutoRotation();
    }

    resumeAutoRotation() {
        if (!document.hidden) {
            this.startAutoRotation();
        }
    }

    async handleWatchNow() {
        const currentContent = this.featuredContent[this.currentIndex];
        if (!currentContent) return;

        const searchQuery = encodeURIComponent(`${currentContent.title} trailer`);
        const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
        window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
    }

    async handleWatchlist() {
        const currentContent = this.featuredContent[this.currentIndex];
        if (!currentContent) return;

        if (!this.isAuthenticated) {
            this.showNotification('Please login to add to watchlist', 'warning');
            return;
        }

        // Simplified watchlist handling
        const button = document.querySelector('.featured-item.active .btn-add-watchlist');
        if (button) {
            button.classList.toggle('active');
            const isActive = button.classList.contains('active');
            button.innerHTML = isActive ?
                '<i data-feather="bookmark-check"></i><span>Added</span>' :
                '<i data-feather="bookmark"></i><span>Watchlist</span>';

            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            this.showNotification(
                isActive ? 'Added to watchlist' : 'Removed from watchlist',
                'success'
            );
        }
    }

    handleMoreInfo() {
        const currentContent = this.featuredContent[this.currentIndex];
        if (!currentContent) return;

        const slug = currentContent.slug || this.generateSlug(currentContent.title, currentContent.release_date);
        if (slug) {
            window.location.href = `/content/details.html?${encodeURIComponent(slug)}`;
        }
    }

    displayErrorState() {
        const featuredContainer = document.getElementById('featuredContent');
        if (!featuredContainer) return;

        featuredContainer.innerHTML = `
            <div class="featured-item active error-state">
                <div class="featured-poster-section">
                    <div class="featured-poster-container">
                        <div class="error-poster">
                            <i data-feather="film" style="width: 32px; height: 32px; color: var(--text-secondary);"></i>
                        </div>
                    </div>
                </div>
                
                <div class="featured-info-section">
                    <h3 class="featured-title">Unable to Load Content</h3>
                    <p class="featured-description">Please check your connection and try again.</p>
                    
                    <div class="featured-actions">
                        <button class="btn-watch-now" onclick="window.location.reload()">
                            <i data-feather="refresh-cw"></i>
                            <span>Try Again</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('heroIndicators').style.display = 'none';

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    updateDateDisplay() {
        const picksDate = document.getElementById('picksDate');
        if (picksDate) {
            const today = new Date();
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            picksDate.textContent = today.toLocaleDateString('en-US', options);
        }
    }

    // Utility methods
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

    getLanguage(languages) {
        if (!languages || !Array.isArray(languages)) return '';
        return languages[0]?.toUpperCase() || '';
    }

    generateSlug(title, releaseDate) {
        if (!title) return '';
        let slug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();

        if (releaseDate) {
            const year = this.extractYear(releaseDate);
            if (year) slug += `-${year}`;
        }

        return slug;
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    throttle(func, limit) {
        let inThrottle;
        return function () {
            if (!inThrottle) {
                func.apply(this, arguments);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    showNotification(message, type = 'info') {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.heroManager) {
        if (document.hidden) {
            window.heroManager.pauseAutoRotation();
        } else {
            window.heroManager.resumeAutoRotation();
        }
    }
});

// Initialize Hero Manager
if (document.getElementById('heroSection')) {
    window.heroManager = new HeroManager();
    console.log('Hero Manager initialized');
} else {
    console.log('Hero section not found - skipping initialization');
}