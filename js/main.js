// CineScope - Main JavaScript
class CineScope {
    constructor() {
        this.currentUser = null;
        this.loadingQueue = new Set();
        this.currentLanguage = 'hindi';
        this.carouselScrollPositions = new Map();
        
        this.init();
    }

    async init() {
        // Show loading screen
        this.showLoading();
        
        // Check authentication
        await this.checkAuth();
        
        // Load includes
        await this.loadIncludes();
        
        // Initialize components
        this.initializeComponents();
        
        // Load content
        await this.loadInitialContent();
        
        // Hide loading screen
        this.hideLoading();
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Start background tasks
        this.startBackgroundTasks();
    }

    // Loading Management
    showLoading(message = 'Loading amazing content...') {
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingText = document.getElementById('loadingText');
        
        if (loadingScreen && loadingText) {
            loadingText.textContent = message;
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 1000); // Smooth transition
        }
    }

    // Authentication
    async checkAuth() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const user = await API.validateToken(token);
                if (user) {
                    this.currentUser = user;
                    Auth.updateUI(user);
                }
            } catch (error) {
                console.warn('Token validation failed:', error);
                localStorage.removeItem('authToken');
            }
        }
    }

    // Content Loading
    async loadInitialContent() {
        const loadPromises = [];

        // Load hero content
        loadPromises.push(this.loadHeroContent());

        // Load section content
        loadPromises.push(this.loadTrendingContent());
        loadPromises.push(this.loadPopularContent());
        loadPromises.push(this.loadNewReleasesContent());
        loadPromises.push(this.loadCriticsChoiceContent());
        loadPromises.push(this.loadAnimeContent());
        loadPromises.push(this.loadRegionalContent(this.currentLanguage));

        try {
            await Promise.allSettled(loadPromises);
        } catch (error) {
            console.error('Error loading initial content:', error);
        }
    }

    async loadHeroContent() {
        try {
            const trending = await API.getTrending('all', 5);
            if (trending && trending.length > 0) {
                this.renderHeroCarousel(trending);
            }
        } catch (error) {
            console.error('Error loading hero content:', error);
        }
    }

    async loadTrendingContent() {
        try {
            const trending = await API.getTrending('all', 20);
            if (trending && trending.length > 0) {
                this.renderContentCarousel('trendingCarousel', trending);
            } else {
                this.showCarouselError('trendingCarousel', 'Failed to load trending content');
            }
        } catch (error) {
            console.error('Error loading trending content:', error);
            this.showCarouselError('trendingCarousel', 'Failed to load trending content');
        }
    }

    async loadPopularContent() {
        try {
            // For anonymous users, show popular content
            // For logged-in users, show personalized recommendations
            let content;
            if (this.currentUser) {
                content = await API.getPersonalizedRecommendations(20);
            } else {
                content = await API.getAnonymousRecommendations(20);
            }
            
            if (content && content.length > 0) {
                this.renderContentCarousel('popularCarousel', content);
            } else {
                this.showCarouselError('popularCarousel', 'Failed to load popular content');
            }
        } catch (error) {
            console.error('Error loading popular content:', error);
            this.showCarouselError('popularCarousel', 'Failed to load popular content');
        }
    }

    async loadNewReleasesContent() {
        try {
            const newReleases = await API.getNewReleases('movie', 20);
            if (newReleases && newReleases.length > 0) {
                this.renderContentCarousel('newReleasesCarousel', newReleases);
            } else {
                this.showCarouselError('newReleasesCarousel', 'Failed to load new releases');
            }
        } catch (error) {
            console.error('Error loading new releases:', error);
            this.showCarouselError('newReleasesCarousel', 'Failed to load new releases');
        }
    }

    async loadCriticsChoiceContent() {
        try {
            const criticsChoice = await API.getCriticsChoice('movie', 20);
            if (criticsChoice && criticsChoice.length > 0) {
                this.renderContentCarousel('criticsChoiceCarousel', criticsChoice);
            } else {
                this.showCarouselError('criticsChoiceCarousel', 'Failed to load critics choice');
            }
        } catch (error) {
            console.error('Error loading critics choice:', error);
            this.showCarouselError('criticsChoiceCarousel', 'Failed to load critics choice');
        }
    }

    async loadAnimeContent() {
        try {
            const anime = await API.getAnime(20);
            if (anime && anime.length > 0) {
                this.renderContentCarousel('animeCarousel', anime);
            } else {
                this.showCarouselError('animeCarousel', 'Failed to load anime content');
            }
        } catch (error) {
            console.error('Error loading anime content:', error);
            this.showCarouselError('animeCarousel', 'Failed to load anime content');
        }
    }

    async loadRegionalContent(language) {
        try {
            const regional = await API.getRegionalContent(language, 'movie', 20);
            if (regional && regional.length > 0) {
                this.renderContentCarousel('regionalCarousel', regional);
            } else {
                this.showCarouselError('regionalCarousel', `Failed to load ${language} content`);
            }
        } catch (error) {
            console.error(`Error loading ${language} content:`, error);
            this.showCarouselError('regionalCarousel', `Failed to load ${language} content`);
        }
    }

    // Rendering Methods
    renderHeroCarousel(content) {
        const heroCarousel = document.getElementById('heroCarousel');
        if (!heroCarousel) return;

        const heroCard = this.createHeroCard(content[0]);
        heroCarousel.innerHTML = heroCard;

        // Auto-rotate hero content
        if (content.length > 1) {
            this.startHeroRotation(content);
        }
    }

    createHeroCard(item) {
        const backdropUrl = item.backdrop_path || item.poster_path || '/assets/images/placeholder-backdrop.jpg';
        const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
        const year = item.release_date ? new Date(item.release_date).getFullYear() : 'TBA';
        const genres = Array.isArray(item.genres) ? item.genres.slice(0, 3).join(', ') : '';

        return `
            <div class="hero-card" onclick="openContentDetails(${item.id})">
                <img src="${backdropUrl}" alt="${item.title}" class="hero-card-background" loading="eager">
                <div class="hero-card-overlay">
                    <div class="hero-card-content">
                        <h1 class="hero-card-title">${item.title}</h1>
                        <div class="hero-card-meta">
                            <span class="hero-card-rating">${rating}</span>
                            <span>${year}</span>
                            <span>${genres}</span>
                        </div>
                        <p class="hero-card-description">${item.overview || 'No description available.'}</p>
                        <div class="hero-card-actions">
                            <button class="hero-card-btn hero-card-btn-primary" onclick="event.stopPropagation(); playTrailer(${item.id})">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path d="M8 5v14l11-7z" fill="currentColor"/>
                                </svg>
                                Play Trailer
                            </button>
                            <button class="hero-card-btn hero-card-btn-secondary" onclick="event.stopPropagation(); addToWatchlist(${item.id})">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z" fill="currentColor"/>
                                </svg>
                                Add to Watchlist
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderContentCarousel(carouselId, content) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;

        // Clear loading skeleton
        carousel.innerHTML = '';

        if (!content || content.length === 0) {
            this.showCarouselError(carouselId, 'No content available');
            return;
        }

        const carouselHTML = content.map(item => this.createContentCard(item)).join('');
        carousel.innerHTML = carouselHTML;

        // Lazy load images
        this.lazyLoadImages(carousel);

        // Restore scroll position
        const savedPosition = this.carouselScrollPositions.get(carouselId);
        if (savedPosition) {
            carousel.scrollLeft = savedPosition;
        }
    }

    createContentCard(item) {
        const posterUrl = item.poster_path || '/assets/images/placeholder-poster.jpg';
        const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
        const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
        const genres = Array.isArray(item.genres) ? item.genres.slice(0, 2) : [];
        const contentType = item.content_type || 'movie';

        return `
            <div class="content-card" onclick="openContentDetails(${item.id})" data-content-id="${item.id}">
                <div class="content-card-poster">
                    <img src="${posterUrl}" alt="${item.title}" class="content-card-image" loading="lazy">
                    <div class="content-card-overlay">
                        <div class="content-card-actions">
                            <button class="card-action-btn" onclick="event.stopPropagation(); playTrailer(${item.id})" title="Play Trailer">
                                <svg viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" fill="currentColor"/>
                                </svg>
                            </button>
                            <button class="card-action-btn" onclick="event.stopPropagation(); addToWatchlist(${item.id})" title="Add to Watchlist">
                                <svg viewBox="0 0 24 24">
                                    <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z" fill="currentColor"/>
                                </svg>
                            </button>
                            <button class="card-action-btn" onclick="event.stopPropagation(); addToFavorites(${item.id})" title="Add to Favorites">
                                <svg viewBox="0 0 24 24">
                                    <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="content-card-rating">${rating}</div>
                    <div class="content-card-type">${contentType}</div>
                    ${item.youtube_trailer ? `
                        <button class="content-card-trailer" onclick="event.stopPropagation(); playTrailer(${item.id})" title="Play Trailer">
                            <svg viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" fill="currentColor"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                <div class="content-card-info">
                    <h3 class="content-card-title">${item.title}</h3>
                    <div class="content-card-meta">
                        ${year ? `<span class="content-card-year">${year}</span>` : ''}
                        ${rating !== 'N/A' ? `<span>⭐ ${rating}</span>` : ''}
                    </div>
                    <div class="content-card-genres">
                        ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    showCarouselError(carouselId, message) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;

        carousel.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">😔</div>
                <h3 class="no-results-title">Oops!</h3>
                <p class="no-results-message">${message}</p>
                <button class="retry-btn" onclick="cinescope.retryLoadContent('${carouselId}')">
                    Try Again
                </button>
            </div>
        `;
    }

    async retryLoadContent(carouselId) {
        const retryMap = {
            'trendingCarousel': () => this.loadTrendingContent(),
            'popularCarousel': () => this.loadPopularContent(),
            'newReleasesCarousel': () => this.loadNewReleasesContent(),
            'criticsChoiceCarousel': () => this.loadCriticsChoiceContent(),
            'animeCarousel': () => this.loadAnimeContent(),
            'regionalCarousel': () => this.loadRegionalContent(this.currentLanguage)
        };

        if (retryMap[carouselId]) {
            const carousel = document.getElementById(carouselId);
            if (carousel) {
                carousel.innerHTML = this.createSkeletonCards();
            }
            await retryMap[carouselId]();
        }
    }

    createSkeletonCards(count = 10) {
        return Array.from({ length: count }, () => `
            <div class="content-card-skeleton">
                <div class="skeleton-poster"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-meta"></div>
                </div>
            </div>
        `).join('');
    }

    // Language Selection
    async switchLanguage(language) {
        this.currentLanguage = language;
        
        // Update active tab
        document.querySelectorAll('.language-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-language="${language}"]`).classList.add('active');

        // Show loading skeleton
        const carousel = document.getElementById('regionalCarousel');
        if (carousel) {
            carousel.innerHTML = this.createSkeletonCards();
        }

        // Load new content
        await this.loadRegionalContent(language);
    }

    // Carousel Navigation
    scrollCarousel(carouselId, direction) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;

        const scrollAmount = 220; // Card width + gap
        const currentScroll = carousel.scrollLeft;
        
        let newScroll;
        if (direction === 'left') {
            newScroll = Math.max(0, currentScroll - scrollAmount * 3);
        } else {
            newScroll = currentScroll + scrollAmount * 3;
        }

        carousel.scrollTo({
            left: newScroll,
            behavior: 'smooth'
        });

        // Save scroll position
        this.carouselScrollPositions.set(carouselId, newScroll);
    }

    // Hero Rotation
    startHeroRotation(content) {
        let currentIndex = 0;
        const heroCarousel = document.getElementById('heroCarousel');
        
        if (!heroCarousel) return;

        const rotateHero = () => {
            currentIndex = (currentIndex + 1) % content.length;
            const heroCard = this.createHeroCard(content[currentIndex]);
            
            // Fade out
            heroCarousel.style.opacity = '0';
            
            setTimeout(() => {
                heroCarousel.innerHTML = heroCard;
                heroCarousel.style.opacity = '1';
            }, 300);
        };

        // Rotate every 8 seconds
        setInterval(rotateHero, 8000);
    }

    // Lazy Loading
    lazyLoadImages(container) {
        if (!('IntersectionObserver' in window)) {
            // Fallback for older browsers
            const images = container.querySelectorAll('img[loading="lazy"]');
            images.forEach(img => {
                img.src = img.src;
            });
            return;
        }

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        const images = container.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => imageObserver.observe(img));
    }

    // Event Listeners
    initializeEventListeners() {
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileNav = document.getElementById('mobileNav');
        const mobileSearch = document.getElementById('mobileSearch');

        if (mobileMenuBtn && mobileNav) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenuBtn.classList.toggle('active');
                mobileNav.classList.toggle('active');
                mobileSearch.classList.toggle('active');
            });
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const mobileSearchInput = document.getElementById('mobileSearchInput');

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput.value);
                }
            });
        }

        if (mobileSearchInput) {
            mobileSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(mobileSearchInput.value);
                }
            });
        }

        // Language tabs
        document.querySelectorAll('.language-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const language = tab.dataset.language;
                this.switchLanguage(language);
            });
        });

        // Scroll handling for navbar
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (!navbar) return;

            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            lastScrollY = window.scrollY;
        });

        // Save carousel scroll positions
        document.querySelectorAll('.content-carousel').forEach(carousel => {
            carousel.addEventListener('scroll', () => {
                this.carouselScrollPositions.set(carousel.id, carousel.scrollLeft);
            });
        });
    }

    // Background Tasks
    startBackgroundTasks() {
        // Preload next page content
        setTimeout(() => {
            this.preloadContent();
        }, 5000);

        // Update stats animation
        this.animateStats();

        // Periodically refresh trending content
        setInterval(() => {
            this.refreshTrendingContent();
        }, 300000); // 5 minutes
    }

    async preloadContent() {
        // Preload popular categories that user might visit
        try {
            await Promise.allSettled([
                API.getTrending('movie', 10),
                API.getTrending('tv', 10),
                API.getNewReleases('tv', 10)
            ]);
        } catch (error) {
            console.log('Preload failed:', error);
        }
    }

    animateStats() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(stat => {
            const target = parseInt(stat.dataset.count);
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const animate = () => {
                current += increment;
                if (current < target) {
                    stat.textContent = Math.floor(current).toLocaleString();
                    requestAnimationFrame(animate);
                } else {
                    stat.textContent = target.toLocaleString();
                }
            };

            // Start animation when element is visible
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    animate();
                    observer.disconnect();
                }
            });

            observer.observe(stat);
        });
    }

    async refreshTrendingContent() {
        try {
            const trending = await API.getTrending('all', 20);
            if (trending && trending.length > 0) {
                this.renderContentCarousel('trendingCarousel', trending);
            }
        } catch (error) {
            console.log('Failed to refresh trending content:', error);
        }
    }

    // Utility Methods
    async loadIncludes() {
        try {
            await Promise.all([
                includeHTML('header-container', '/includes/header.html'),
                includeHTML('footer-container', '/includes/footer.html')
            ]);
        } catch (error) {
            console.error('Failed to load includes:', error);
        }
    }

    initializeComponents() {
        // Initialize Bootstrap components
        if (typeof bootstrap !== 'undefined') {
            // Initialize tooltips
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

            // Initialize popovers
            const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
            popoverTriggerList.map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
        }
    }

    // Public API for global functions
    performSearch(query) {
        if (query.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
        }
    }
}

// Global Functions (called from HTML)
function scrollToContent() {
    document.getElementById('contentSections').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

function openContentDetails(contentId) {
    window.location.href = `/details?id=${contentId}`;
}

function playTrailer(contentId) {
    // This will be implemented in the details page
    console.log('Playing trailer for content:', contentId);
    window.location.href = `/details?id=${contentId}&autoplay=trailer`;
}

function addToWatchlist(contentId) {
    if (cinescope.currentUser) {
        API.addToWatchlist(contentId).then(() => {
            showNotification('Added to watchlist!', 'success');
        }).catch(error => {
            showNotification('Failed to add to watchlist', 'error');
        });
    } else {
        showLogin();
    }
}

function addToFavorites(contentId) {
    if (cinescope.currentUser) {
        API.addToFavorites(contentId).then(() => {
            showNotification('Added to favorites!', 'success');
        }).catch(error => {
            showNotification('Failed to add to favorites', 'error');
        });
    } else {
        showLogin();
    }
}

function showLogin() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

function logout() {
    Auth.logout();
    location.reload();
}

function scrollCarousel(carouselId, direction) {
    cinescope.scrollCarousel(carouselId, direction);
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        cinescope.performSearch(searchInput.value);
    }
}

function performMobileSearch() {
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if (mobileSearchInput) {
        cinescope.performSearch(mobileSearchInput.value);
    }
}

function closeSearch() {
    const searchOverlay = document.getElementById('searchOverlay');
    if (searchOverlay) {
        searchOverlay.classList.remove('active');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Animate out and remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Page initialization
function initializePage() {
    window.cinescope = new CineScope();
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Show user-friendly error message for critical errors
    if (event.error && event.error.message.includes('Failed to fetch')) {
        showNotification('Connection error. Please check your internet connection.', 'error');
    }
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}