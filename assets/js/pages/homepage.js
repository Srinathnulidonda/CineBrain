class HomePage {
    constructor() {
        this.carousels = new Map();
        this.currentRegionalLanguage = 'Telugu';
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadContent();
            this.setupEventListeners();
            this.initializeCarousels();
            this.hideLoading();
        } catch (error) {
            console.error('Homepage initialization error:', error);
            this.showError();
        }
    }

    async loadContent() {
        try {
            const data = await api.getHomepage();
            
            // Load hero content
            this.setupHeroSection(data.trending?.movies?.[0] || data.whats_hot?.[0]);
            
            // Load content sections
            this.loadTrendingMovies(data.trending?.movies || []);
            this.loadTrendingTV(data.trending?.tv || []);
            this.loadWhatsHot(data.whats_hot || []);
            this.loadCriticsChoice(data.critics_choice || []);
            this.loadRegionalContent(data.regional || {});
            this.loadAdminCurated(data.admin_curated || []);
            
            // Load personalized content if user is authenticated
            if (window.app.isAuthenticated()) {
                await this.loadPersonalizedContent();
            }
            
        } catch (error) {
            console.error('Error loading homepage content:', error);
            throw error;
        }
    }

    setupHeroSection(featuredContent) {
        if (!featuredContent) return;
        
        const heroSection = document.getElementById('hero-section');
        const heroBackground = document.getElementById('hero-background');
        const heroTitle = document.getElementById('hero-title');
        const heroDescription = document.getElementById('hero-description');
        
        if (featuredContent.backdrop_path) {
            const backdropUrl = featuredContent.backdrop_path.startsWith('http')
                ? featuredContent.backdrop_path
                : `${IMAGE_CONFIG.TMDB_BASE_URL}original${featuredContent.backdrop_path}`;
            
            heroBackground.style.backgroundImage = `url(${backdropUrl})`;
        }
        
        const title = featuredContent.title || featuredContent.name;
        const overview = featuredContent.overview;
        
        if (heroTitle && title) {
            heroTitle.textContent = title;
        }
        
        if (heroDescription && overview) {
            heroDescription.textContent = overview.length > 200 
                ? overview.substring(0, 200) + '...' 
                : overview;
        }
    }

    setupEventListeners() {
        // Quick action cards
        document.addEventListener('click', (e) => {
            const actionCard = e.target.closest('[data-action]');
            if (!actionCard) return;
            
            const action = actionCard.dataset.action;
            this.handleQuickAction(action);
        });
        
        // Hero action buttons
        const exploreBtn = document.getElementById('explore-btn');
        const learnMoreBtn = document.getElementById('learn-more-btn');
        
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => {
                window.app.navigateTo('search');
            });
        }
        
        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', () => {
                this.showAboutModal();
            });
        }
        
        // Regional tabs
        document.addEventListener('click', (e) => {
            const regionalTab = e.target.closest('.regional-tab');
            if (!regionalTab) return;
            
            const language = regionalTab.dataset.language;
            this.switchRegionalContent(language);
        });
    }

    initializeCarousels() {
        const carouselSelectors = [
            '#trending-movies',
            '#trending-tv', 
            '#whats-hot',
            '#critics-choice',
            '#admin-curated',
            '#personalized-recs'
        ];
        
        carouselSelectors.forEach(selector => {
            const container = document.querySelector(selector);
            if (container && container.querySelector('.carousel-track').children.length > 0) {
                const carousel = new CarouselComponent(container, {
                    itemsPerView: 6,
                    gap: 20,
                    responsive: {
                        768: { itemsPerView: 4 },
                        480: { itemsPerView: 2 }
                    }
                });
                
                this.carousels.set(selector, carousel);
            }
        });
        
        // Regional carousel
        const regionalContainer = document.querySelector('#regional-content .regional-content-wrapper');
        if (regionalContainer) {
            const regionalCarousel = new CarouselComponent(regionalContainer, {
                itemsPerView: 6,
                gap: 20,
                responsive: {
                    768: { itemsPerView: 4 },
                    480: { itemsPerView: 2 }
                }
            });
            
            this.carousels.set('#regional-content', regionalCarousel);
        }
    }

    loadTrendingMovies(movies) {
        const track = document.querySelector('#trending-movies-track');
        if (!track) return;
        
        track.innerHTML = '';
        
        movies.forEach(movie => {
            const card = createMovieCard(movie, { size: 'medium' });
            track.appendChild(card.getElement());
        });
    }

    loadTrendingTV(shows) {
        const track = document.querySelector('#trending-tv-track');
        if (!track) return;
        
        track.innerHTML = '';
        
        shows.forEach(show => {
            const card = createMovieCard(show, { size: 'medium' });
            track.appendChild(card.getElement());
        });
    }

    loadWhatsHot(content) {
        const track = document.querySelector('#whats-hot-track');
        if (!track) return;
        
        track.innerHTML = '';
        
        content.forEach(item => {
            const card = createMovieCard(item, { size: 'medium' });
            track.appendChild(card.getElement());
        });
    }

    loadCriticsChoice(content) {
        const track = document.querySelector('#critics-choice-track');
        if (!track) return;
        
        track.innerHTML = '';
        
        content.forEach(item => {
            const card = createMovieCard(item, { size: 'medium' });
            track.appendChild(card.getElement());
        });
    }

    loadRegionalContent(regionalData) {
        const track = document.querySelector('#regional-track');
        if (!track) return;
        
        // Load initial content (Telugu by default)
        const teluguContent = regionalData['Telugu'] || [];
        this.updateRegionalTrack(teluguContent);
    }

    updateRegionalTrack(content) {
        const track = document.querySelector('#regional-track');
        if (!track) return;
        
        track.innerHTML = '';
        
        content.forEach(item => {
            const card = createMovieCard(item, { size: 'medium' });
            track.appendChild(card.getElement());
        });
        
        // Reinitialize carousel
        const carousel = this.carousels.get('#regional-content');
        if (carousel) {
            carousel.calculateDimensions();
            carousel.goTo(0);
        }
    }

    loadAdminCurated(content) {
        if (content.length === 0) return;
        
        const section = document.querySelector('#admin-curated');
        const track = document.querySelector('#admin-curated-track');
        
        if (!section || !track) return;
        
        section.style.display = 'block';
        track.innerHTML = '';
        
        content.forEach(item => {
            const card = createMovieCard(item.content || item, { 
                size: 'medium',
                showInfo: true
            });
            
            // Add admin info overlay
            if (item.admin_title || item.custom_tags) {
                const cardElement = card.getElement();
                const overlay = document.createElement('div');
                overlay.className = 'admin-overlay';
                overlay.innerHTML = `
                    <div class="admin-badge">Staff Pick</div>
                    ${item.admin_title ? `<div class="admin-title">${item.admin_title}</div>` : ''}
                `;
                
                cardElement.querySelector('.movie-card-inner').appendChild(overlay);
            }
            
            track.appendChild(card.getElement());
        });
    }

    async loadPersonalizedContent() {
        try {
            const data = await api.getPersonalizedRecommendations();
            
            if (data.hybrid_recommendations && data.hybrid_recommendations.length > 0) {
                const section = document.querySelector('#personalized-recs');
                const track = document.querySelector('#personalized-track');
                
                if (section && track) {
                    section.style.display = 'block';
                    track.innerHTML = '';
                    
                    data.hybrid_recommendations.forEach(item => {
                        const card = createMovieCard(item, { size: 'medium' });
                        track.appendChild(card.getElement());
                    });
                }
            }
        } catch (error) {
            console.error('Error loading personalized content:', error);
        }
    }

    handleQuickAction(action) {
        switch (action) {
            case 'search':
                window.app.navigateTo('search');
                break;
            case 'trending':
                this.scrollToSection('#whats-hot');
                break;
            case 'personalized':
                if (window.app.isAuthenticated()) {
                    this.scrollToSection('#personalized-recs');
                } else {
                    notification.show('info', 'Login Required', 'Please login to see personalized recommendations.');
                }
                break;
            case 'regional':
                this.scrollToSection('#regional-content');
                break;
        }
    }

    switchRegionalContent(language) {
        // Update active tab
        document.querySelectorAll('.regional-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.language === language);
        });
        
        this.currentRegionalLanguage = language;
        
        // Load content for selected language
        this.loadRegionalContentByLanguage(language);
    }

    async loadRegionalContentByLanguage(language) {
        try {
            const languageCode = this.getLanguageCode(language);
            const response = await api.get('/api/homepage'); // This should be updated to support language-specific requests
            
            if (response.regional && response.regional[language]) {
                this.updateRegionalTrack(response.regional[language]);
            }
        } catch (error) {
            console.error('Error loading regional content:', error);
        }
    }

    getLanguageCode(language) {
        const codes = {
            'Telugu': 'te',
            'Hindi': 'hi',
            'Tamil': 'ta',
            'Kannada': 'kn'
        };
        
        return codes[language] || 'en';
    }

    scrollToSection(selector) {
        const section = document.querySelector(selector);
        if (section) {
            section.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    showAboutModal() {
        modal.show({
            title: 'About MovieRec',
            content: `
                <div class="about-content">
                    <p>MovieRec is your personalized movie and TV show recommendation platform powered by advanced AI algorithms.</p>
                    
                    <h4>Features:</h4>
                    <ul>
                        <li>🎯 Personalized recommendations based on your preferences</li>
                        <li>🔥 Trending content from around the world</li>
                        <li>🌏 Regional content in multiple languages</li>
                        <li>⭐ Expert-curated collections</li>
                        <li>📱 Works seamlessly across all devices</li>
                        <li>🎬 Trailers and detailed information</li>
                    </ul>
                    
                    <p>Join thousands of movie enthusiasts and discover your next favorite film!</p>
                </div>
            `,
            size: 'md',
            footer: `
                <button class="btn btn-primary" data-action="close">Get Started</button>
            `
        });
    }

    showLoading() {
        const loading = document.getElementById('homepage-loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hideLoading() {
        const loading = document.getElementById('homepage-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showError() {
        notification.show('error', 'Loading Error', 'Failed to load homepage content. Please refresh the page.');
    }

    destroy() {
        // Clean up carousels
        this.carousels.forEach(carousel => {
            carousel.destroy();
        });
        this.carousels.clear();
    }
}

// Add homepage-specific styles
const homepageStyles = `
.admin-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background: linear-gradient(to bottom, rgba(229, 9, 20, 0.9), transparent);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.movie-card:hover .admin-overlay {
    opacity: 1;
}

.admin-badge {
    background-color: rgba(255, 255, 255, 0.9);
    color: var(--accent-primary);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    display: inline-block;
    margin-bottom: 4px;
}

.admin-title {
    color: white;
    font-size: 12px;
    font-weight: 500;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.about-content ul {
    list-style: none;
    padding-left: 0;
}

.about-content li {
    margin-bottom: 8px;
    padding-left: 0;
}

.about-content h4 {
    margin-top: 24px;
    margin-bottom: 16px;
    color: var(--text-primary);
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = homepageStyles;
document.head.appendChild(styleSheet);

window.HomePage = HomePage;

