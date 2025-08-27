// Main Application Logic for CineBrain
class CineBrainApp {
    constructor() {
        this.isInitialized = false;
        this.sections = new Map();
        this.loadingStates = new Map();
        this.intersectionObserver = null;

        this.init();
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // Register service worker
            await this.registerServiceWorker();

            // Preload critical data
            await this.preloadCriticalData();

            // Initialize intersection observer for lazy loading
            this.initializeIntersectionObserver();

            // Initialize performance monitoring
            this.initializePerformanceMonitoring();

            this.isInitialized = true;
            console.log('CineBrain app initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }

    // Register service worker for caching
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('assets/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    // Preload critical data for faster initial load
    async preloadCriticalData() {
        try {
            // Preload trending content for hero section
            const trendingPromise = apiClient.getTrending('all', 5);

            // Start loading other critical sections
            const promises = [
                trendingPromise,
                apiClient.getCriticsChoice('movie', 8),
                apiClient.getAdminChoiceRecommendations('admin_choice', 6)
            ];

            const results = await Promise.allSettled(promises);

            // Cache successful results
            if (results[0].status === 'fulfilled') {
                Utils.setStorage('preload_trending', {
                    data: results[0].value,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.warn('Preload failed:', error);
        }
    }

    // Initialize intersection observer for lazy loading
    initializeIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        };

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target;
                    const sectionType = section.dataset.section;

                    if (sectionType && !this.sections.has(sectionType)) {
                        this.loadSection(sectionType, section);
                        this.intersectionObserver.unobserve(section);
                    }
                }
            });
        }, options);
    }

    // Load specific content section
    async loadSection(sectionType, sectionElement) {
        if (this.loadingStates.get(sectionType)) return;

        this.loadingStates.set(sectionType, true);
        const container = sectionElement.querySelector('.horizontal-scroll');

        if (!container) return;

        try {
            let data;

            switch (sectionType) {
                case 'trending':
                    data = await apiClient.getTrending('all', 20);
                    break;
                case 'popular':
                    data = await apiClient.getNewReleases(null, 'movie', 20);
                    break;
                case 'critics':
                    data = await apiClient.getCriticsChoice('movie', 20);
                    break;
                case 'action':
                    data = await apiClient.getGenreRecommendations('action', 'movie', 20);
                    break;
                case 'comedy':
                    data = await apiClient.getGenreRecommendations('comedy', 'movie', 20);
                    break;
                case 'hindi':
                    data = await apiClient.getRegionalRecommendations('hindi', 'movie', 20);
                    break;
                case 'telugu':
                    data = await apiClient.getRegionalRecommendations('telugu', 'movie', 20);
                    break;
                case 'anime':
                    data = await apiClient.getAnimeRecommendations(null, 20);
                    break;
                case 'admin-choice':
                    data = await apiClient.getAdminChoiceRecommendations('admin_choice', 20);
                    break;
                default:
                    console.warn('Unknown section type:', sectionType);
                    return;
            }

            this.renderContentSection(container, data.recommendations || []);
            this.sections.set(sectionType, data);

        } catch (error) {
            console.error(`Error loading section ${sectionType}:`, error);
            container.innerHTML = Components.createErrorState(`Failed to load ${sectionType} content`);
        } finally {
            this.loadingStates.set(sectionType, false);
        }
    }

    // Render content section with cards
    renderContentSection(container, content) {
        if (!content || content.length === 0) {
            container.innerHTML = Components.createEmptyState();
            return;
        }

        const cardsHtml = content.map(item => Components.createContentCard(item)).join('');
        container.innerHTML = cardsHtml;

        // Add fade-in animation
        container.classList.add('fade-in-up');
    }

    // Initialize homepage
    async initializeHomepage() {
        try {
            // Load hero section first (critical path)
            await this.loadHeroSection();

            // Set up intersection observers for content sections
            const contentSections = document.querySelectorAll('.content-section[data-section]');
            contentSections.forEach(section => {
                this.intersectionObserver.observe(section);
            });

            // Load visible sections immediately
            const visibleSections = Array.from(contentSections).filter(section =>
                Utils.isInViewport(section)
            );

            visibleSections.forEach(section => {
                const sectionType = section.dataset.section;
                this.loadSection(sectionType, section);
            });

        } catch (error) {
            console.error('Homepage initialization error:', error);
        }
    }

    // Load hero carousel section
    async loadHeroSection() {
        const heroContainer = document.getElementById('hero-content');
        if (!heroContainer) return;

        try {
            // Try to get from cache first
            const cached = Utils.getStorage('preload_trending');
            let trendingData;

            if (cached && (Date.now() - cached.timestamp < 300000)) { // 5 min cache
                trendingData = cached.data;
            } else {
                trendingData = await apiClient.getTrending('all', 5);
            }

            const heroItems = trendingData.recommendations || [];

            if (heroItems.length === 0) {
                heroContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><h3 class="text-white">No trending content available</h3></div>';
                return;
            }

            const heroHtml = heroItems.map((item, index) =>
                Components.createHeroItem(item, index)
            ).join('');

            heroContainer.innerHTML = heroHtml;

            // Initialize carousel
            const carousel = new bootstrap.Carousel(document.getElementById('hero-carousel'), {
                interval: 5000,
                wrap: true
            });

        } catch (error) {
            console.error('Hero section error:', error);
            heroContainer.innerHTML = Components.createErrorState('Failed to load trending content');
        }
    }

    // Performance monitoring
    initializePerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('Page load performance:', {
                    loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                    domReady: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    totalTime: perfData.loadEventEnd - perfData.fetchStart
                });
            }, 0);
        });

        // Monitor API performance
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            const start = performance.now();
            return originalFetch.apply(this, args).then(response => {
                const end = performance.now();
                const url = args[0];
                if (url.includes('backend-app-970m.onrender.com')) {
                    console.log(`API call to ${url} took ${end - start}ms`);
                }
                return response;
            });
        };
    }

    // Search functionality
    async performSearch(query, type = 'multi', page = 1) {
        if (!query || query.length < 2) return null;

        try {
            const results = await apiClient.searchContent(query, type, page);

            // Record search interaction for anonymous users
            if (!Utils.getStorage('auth_token')) {
                // This will be handled by the backend automatically
            }

            return results;
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    // User authentication check
    isAuthenticated() {
        const token = Utils.getStorage('auth_token');
        const userData = Utils.getStorage('user_data');
        return !!(token && userData);
    }

    // Get recommendations based on user status
    async getRecommendations(type, limit = 20) {
        try {
            if (this.isAuthenticated()) {
                // Get personalized recommendations for logged-in users
                return await apiClient.getPersonalizedRecommendations(limit);
            } else {
                // Get anonymous recommendations
                return await apiClient.getAnonymousRecommendations(limit);
            }
        } catch (error) {
            console.error('Recommendations error:', error);
            // Fallback to trending
            return await apiClient.getTrending('all', limit);
        }
    }

    // Handle content interaction
    async handleContentInteraction(contentId, interactionType, rating = null) {
        try {
            if (this.isAuthenticated()) {
                await apiClient.recordInteraction(contentId, interactionType, rating);
                Utils.showToast(`${interactionType} recorded`, 'success');
            } else {
                // For anonymous users, we can show a login prompt
                Utils.showToast('Login to save your preferences', 'info');
            }
        } catch (error) {
            console.error('Interaction error:', error);
            Utils.showToast('Failed to record interaction', 'error');
        }
    }

    // Cleanup and destroy
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        this.sections.clear();
        this.loadingStates.clear();
        this.isInitialized = false;
    }
}

// Global app instance
window.cineBrainApp = new CineBrainApp();

// Global function to initialize homepage (called from HTML)
async function initializeHomepage() {
    await window.cineBrainApp.initializeHomepage();
}

// Performance optimization: Preload next page content
function preloadNextPage(url) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
}

// Handle page visibility changes for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause heavy operations
        console.log('Page hidden, pausing operations');
    } else {
        // Page is visible, resume operations
        console.log('Page visible, resuming operations');
    }
});