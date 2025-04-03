// Content Card Component - Unified with TopBar and Theme Manager
class ContentCardManager {
    constructor() {
        // Use same API base as TopBar
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.posterBase = 'https://image.tmdb.org/t/p/w500';

        // Auth state from TopBar
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;
        this.currentUser = this.getCurrentUser();

        // User data cache
        this.userWishlist = new Set();
        this.contentCache = new Map();

        // Content row configurations - Updated with correct endpoints
        this.contentRows = [
            {
                id: 'trending',
                title: 'Trending Now',
                endpoint: '/recommendations/trending',
                params: { category: 'all', limit: 20 }
            },
            {
                id: 'new-releases',
                title: 'New Releases',
                endpoint: '/recommendations/new-releases',
                params: { type: 'movie', limit: 20 }
            },
            {
                id: 'critics-choice',
                title: 'Critics Choice',
                endpoint: '/recommendations/critics-choice',
                params: { type: 'movie', limit: 20 }
            },
            {
                id: 'popular-movies',
                title: 'Popular Movies',
                endpoint: '/recommendations/trending',
                params: { category: 'movies', limit: 20 }
            },
            {
                id: 'top-tv-shows',
                title: 'Top Rated TV Shows',
                endpoint: '/recommendations/trending',
                params: { category: 'tv_shows', limit: 20 }
            },
            {
                id: 'anime-picks',
                title: 'Anime Picks',
                endpoint: '/recommendations/anime',
                params: { limit: 20 }
            }
        ];

        // Register with theme manager if available
        if (window.themeManager) {
            window.themeManager.register((theme) => this.onThemeChange(theme));
        }

        this.init();
    }

    /**
     * Theme change callback from Theme Manager
     */
    onThemeChange(theme) {
        // Content cards use CSS variables, so they update automatically
        // Just log for debugging
        console.log('Content cards theme updated to:', theme);

        // Re-initialize any feather icons if needed
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    async setup() {
        const container = document.getElementById('content-container');
        if (!container) return;

        // Load user wishlist if authenticated
        if (this.isAuthenticated) {
            await this.loadUserWishlist();
        }

        // Create all carousel rows
        this.contentRows.forEach(rowConfig => {
            const row = this.createCarouselRow(rowConfig);
            container.appendChild(row);
        });

        // Load content with staggered loading
        this.contentRows.forEach((rowConfig, index) => {
            setTimeout(() => {
                this.loadContentRow(rowConfig);
            }, index * 150);
        });

        // Setup event listeners
        this.setupEventListeners();

        // Initialize feather icons if available
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('cinebrain-user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    async loadUserWishlist() {
        if (!this.isAuthenticated) return;

        try {
            const response = await fetch(`${this.apiBase}/users/watchlist`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.userWishlist = new Set(data.watchlist?.map(item => item.id) || []);
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    }

    createCarouselRow(rowConfig) {
        const row = document.createElement('div');
        row.className = 'content-row';
        row.id = rowConfig.id;

        row.innerHTML = `
            <div class="row-header">
                <h2 class="row-title">${rowConfig.title}</h2>
                <a href="/browse/${rowConfig.id}" class="see-all">See All →</a>
            </div>
            <div class="carousel-container">
                <button class="carousel-nav prev" aria-label="Previous">
                    <svg viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                <div class="carousel-wrapper">
                    ${this.createSkeletons(8)}
                </div>
                <button class="carousel-nav next" aria-label="Next">
                    <svg viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            </div>
        `;

        return row;
    }

    createSkeletons(count) {
        return Array(count).fill('').map(() => `
            <div class="skeleton-card">
                <div class="skeleton skeleton-poster"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-meta"></div>
            </div>
        `).join('');
    }

    createContentCard(content) {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.dataset.contentId = content.id;

        const posterUrl = this.formatPosterUrl(content.poster_path);
        const rating = this.formatRating(content.rating);
        const year = this.extractYear(content.release_date);
        const genres = content.genres?.slice(0, 2) || [];
        const contentType = content.content_type || 'movie';
        const runtime = this.formatRuntime(content.runtime);
        const isInWishlist = this.userWishlist.has(content.id);

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
                        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                                data-content-id="${content.id}" 
                                title="Add to Wishlist"
                                aria-label="Add to Wishlist">
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
                    ${runtime ? `<span class="card-runtime">• ${runtime}</span>` : ''}
                </div>
                ${genres.length > 0 ? `
                    <div class="card-genres">
                        ${genres.map(genre => `<span class="genre-chip">${this.escapeHtml(genre)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Setup event handlers
        this.setupCardHandlers(card, content);

        // Setup lazy loading
        this.setupLazyLoading(card);

        return card;
    }

    setupCardHandlers(card, content) {
        // Card click handler
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.wishlist-btn')) {
                window.location.href = `/content/details.html?id=${content.id}`;
            }
        });

        // Wishlist button handler
        const wishlistBtn = card.querySelector('.wishlist-btn');
        wishlistBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleWishlistClick(content.id, wishlistBtn);
        });
    }

    setupLazyLoading(card) {
        const img = card.querySelector('.card-poster');
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

    async handleWishlistClick(contentId, button) {
        if (!this.isAuthenticated) {
            // Use TopBar's notification system
            if (window.topbar?.notificationSystem) {
                window.topbar.notificationSystem.show('Please login to add to wishlist', 'warning');
            }
            setTimeout(() => {
                window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
        }

        try {
            // Optimistic UI update
            const wasActive = button.classList.contains('active');
            button.classList.toggle('active');

            if (wasActive) {
                this.userWishlist.delete(contentId);
            } else {
                this.userWishlist.add(contentId);
            }

            // Send request to backend
            const response = await fetch(`${this.apiBase}/users/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    content_id: contentId,
                    interaction_type: 'watchlist'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update wishlist');
            }

            // Show notification
            if (window.topbar?.notificationSystem) {
                const message = wasActive ? 'Removed from wishlist' : 'Added to wishlist';
                window.topbar.notificationSystem.show(message, 'success', 2000);
            }

        } catch (error) {
            // Revert on error
            button.classList.toggle('active');
            if (button.classList.contains('active')) {
                this.userWishlist.add(contentId);
            } else {
                this.userWishlist.delete(contentId);
            }

            if (window.topbar?.notificationSystem) {
                window.topbar.notificationSystem.show('Failed to update wishlist', 'error');
            }
            console.error('Error updating wishlist:', error);
        }
    }

    async loadContentRow(rowConfig) {
        const row = document.getElementById(rowConfig.id);
        if (!row) return;

        const wrapper = row.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        try {
            // Check cache first
            const cacheKey = `${rowConfig.endpoint}-${JSON.stringify(rowConfig.params)}`;
            let content;

            if (this.contentCache.has(cacheKey)) {
                content = this.contentCache.get(cacheKey);
            } else {
                content = await this.fetchContent(rowConfig.endpoint, rowConfig.params);
                this.contentCache.set(cacheKey, content);
            }

            // Clear loading skeletons
            wrapper.innerHTML = '';

            if (!content || content.length === 0) {
                wrapper.innerHTML = `
                    <div class="error-message">
                        <p>No content available</p>
                    </div>
                `;
                return;
            }

            // Add content cards
            content.forEach(item => {
                const card = this.createContentCard(item);
                wrapper.appendChild(card);
            });

            // Setup navigation
            this.setupCarouselNavigation(row);

        } catch (error) {
            console.error(`Error loading ${rowConfig.title}:`, error);
            wrapper.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load content</h3>
                    <p>Please check your connection and try again</p>
                    <button class="retry-btn" data-row-id="${rowConfig.id}">Retry</button>
                </div>
            `;

            // Setup retry button
            const retryBtn = wrapper.querySelector('.retry-btn');
            retryBtn?.addEventListener('click', () => {
                wrapper.innerHTML = this.createSkeletons(8);
                this.loadContentRow(rowConfig);
            });
        }
    }

    async fetchContent(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.apiBase}${endpoint}${queryString ? '?' + queryString : ''}`;

        const headers = {};
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Handle different response structures
        if (data.recommendations) {
            return data.recommendations;
        } else if (data.categories) {
            // For trending endpoint with categories
            const allContent = [];
            Object.values(data.categories).forEach(categoryItems => {
                allContent.push(...categoryItems);
            });
            return allContent.slice(0, params.limit || 20);
        } else if (data.results) {
            return data.results;
        } else {
            return [];
        }
    }

    setupCarouselNavigation(carouselRow) {
        const wrapper = carouselRow.querySelector('.carousel-wrapper');
        const prevBtn = carouselRow.querySelector('.carousel-nav.prev');
        const nextBtn = carouselRow.querySelector('.carousel-nav.next');

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
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        // Touch events
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

        // Mouse events for desktop
        wrapper.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX;
            scrollLeft = wrapper.scrollLeft;
            wrapper.style.cursor = 'grabbing';
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX;
            const walk = (startX - x) * 2;
            wrapper.scrollLeft = scrollLeft + walk;
        });

        wrapper.addEventListener('mouseup', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
        });

        wrapper.addEventListener('mouseleave', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
        });
    }

    setupEventListeners() {
        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                document.querySelectorAll('.content-row').forEach(row => {
                    this.setupCarouselNavigation(row);
                });
            }, 250);
        });

        // Listen for auth changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'cinebrain-token') {
                this.authToken = e.newValue;
                this.isAuthenticated = !!this.authToken;
                if (this.isAuthenticated) {
                    this.loadUserWishlist();
                } else {
                    this.userWishlist.clear();
                }
                // Refresh content
                location.reload();
            }
        });
    }

    // Utility methods
    formatPosterUrl(posterPath) {
        if (!posterPath) {
            return this.getPlaceholderImage();
        }
        if (posterPath.startsWith('http')) return posterPath;
        return `${this.posterBase}${posterPath}`;
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    }

    formatRating(rating) {
        if (!rating) return 'N/A';
        return Number(rating).toFixed(1);
    }

    extractYear(dateString) {
        if (!dateString) return '';
        return new Date(dateString).getFullYear();
    }

    formatRuntime(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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
}

// Initialize Content Card Manager
const contentCardManager = new ContentCardManager();

// Export for global access if needed
window.contentCardManager = contentCardManager;