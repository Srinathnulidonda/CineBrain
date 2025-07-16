/**
 * Home Page Logic
 * Handles homepage content loading and interactions
 */

class HomePage {
    constructor() {
        this.isLoading = false;
        this.contentSections = {};
        this.currentRegionalLanguage = 'Telugu';
        this.heroCarousel = null;
        this.init();
    }

    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.load());
        } else {
            await this.load();
        }
    }

    async load() {
        try {
            this.showLoading();
            await this.loadHomepageContent();
            await this.loadPersonalizedContent();
            this.setupEventListeners();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to load homepage:', error);
            this.showError('Failed to load content. Please refresh the page.');
            this.hideLoading();
        }
    }

    showLoading() {
        this.isLoading = true;
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoading() {
        this.isLoading = false;
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
        }
    }

    async loadHomepageContent() {
        try {
            const response = await apiService.getHomepageContent();
            
            if (response.success) {
                const data = response.data;
                
                // Load hero section
                await this.loadHeroSection(data.trending?.movies || []);
                
                // Load content sections
                await this.loadTrendingSection(data.trending || {});
                await this.loadWhatsHotSection(data.whats_hot || []);
                await this.loadCriticsChoiceSection(data.critics_choice || []);
                await this.loadRegionalSection(data.regional || {});
                await this.loadAdminCuratedSection(data.admin_curated || []);
                
                this.contentSections = data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Homepage content loading failed:', error);
            this.loadFallbackContent();
        }
    }

    async loadHeroSection(heroContent) {
        const heroCarouselInner = document.getElementById('heroCarouselInner');
        if (!heroCarouselInner) return;

        const topContent = heroContent.slice(0, 5);
        
        heroCarouselInner.innerHTML = topContent.map((content, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <div class="hero-slide" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('${apiService.getImageUrl(content.backdrop_path || content.poster_path, 'w1280')}')">
                    <div class="hero-content">
                        <h1 class="hero-title">${content.title || content.name}</h1>
                        <p class="hero-description">${(content.overview || '').substring(0, 200)}${content.overview && content.overview.length > 200 ? '...' : ''}</p>
                        <div class="hero-actions">
                            <button class="btn btn-netflix me-3" onclick="window.MovieCardComponent.handleCardClick(${JSON.stringify(content).replace(/"/g, '&quot;')})">
                                <i class="fas fa-info-circle me-2"></i>More Info
                            </button>
                            <button class="btn btn-outline-light" onclick="this.addToWatchlist(${content.id})">
                                <i class="fas fa-plus me-2"></i>My List
                            </button>
                        </div>
                        <div class="hero-meta mt-3">
                            ${content.rating ? `<span class="me-3"><i class="fas fa-star text-warning me-1"></i>${apiService.formatRating(content.rating)}</span>` : ''}
                            <span class="me-3">${apiService.formatDate(content.release_date || content.first_air_date)}</span>
                            ${content.genre_names ? `<span>${content.genre_names.slice(0, 2).join(', ')}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Initialize Bootstrap carousel
        this.heroCarousel = new bootstrap.Carousel(document.getElementById('heroCarousel'), {
            interval: 5000,
            pause: 'hover'
        });
    }

    async loadTrendingSection(trendingData) {
        const trendingContent = document.getElementById('trendingContent');
        if (!trendingContent) return;

        const allTrending = [
            ...(trendingData.movies || []).slice(0, 8),
            ...(trendingData.tv || []).slice(0, 8),
            ...(trendingData.anime || []).slice(0, 6)
        ];

        this.renderContentRow(trendingContent, allTrending);
    }

    async loadWhatsHotSection(whatsHotData) {
        const whatsHotContent = document.getElementById('whatsHotContent');
        if (!whatsHotContent) return;

        this.renderContentRow(whatsHotContent, whatsHotData.slice(0, 15));
    }

    async loadCriticsChoiceSection(criticsChoiceData) {
        const criticsChoiceContent = document.getElementById('criticsChoiceContent');
        if (!criticsChoiceContent) return;

        this.renderContentRow(criticsChoiceContent, criticsChoiceData.slice(0, 10));
    }

    async loadRegionalSection(regionalData) {
        const regionalContent = document.getElementById('regionalContent');
        if (!regionalContent) return;

        // Load Telugu content by default
        const teluguContent = regionalData.Telugu || [];
        this.renderContentRow(regionalContent, teluguContent.slice(0, 12));
        
        // Store all regional data for language switching
        this.regionalData = regionalData;
    }

    async loadAdminCuratedSection(adminCuratedData) {
        const adminCuratedContent = document.getElementById('adminCuratedContent');
        if (!adminCuratedContent) return;

        this.renderContentRow(adminCuratedContent, adminCuratedData.slice(0, 15));
    }

    async loadPersonalizedContent() {
        if (!authService.isAuthenticated()) {
            const personalizedSection = document.getElementById('personalizedSection');
            if (personalizedSection) {
                personalizedSection.style.display = 'none';
            }
            return;
        }

        try {
            const response = await apiService.getPersonalizedRecommendations();
            
            if (response.success) {
                const personalizedSection = document.getElementById('personalizedSection');
                const personalizedContent = document.getElementById('personalizedContent');
                
                if (personalizedSection && personalizedContent) {
                    personalizedSection.style.display = 'block';
                    
                    // Combine different recommendation types
                    const combinedRecommendations = [
                        ...(response.data.hybrid_recommendations || []).slice(0, 8),
                        ...(response.data.favorites_based || []).slice(0, 6),
                        ...(response.data.regional_suggestions || []).slice(0, 4)
                    ];
                    
                    this.renderContentRow(personalizedContent, combinedRecommendations);
                }
            }
        } catch (error) {
            console.error('Failed to load personalized content:', error);
        }
    }

    renderContentRow(container, contentArray) {
        if (!container || !contentArray || contentArray.length === 0) {
            container.innerHTML = '<p class="text-netflix-light-gray">No content available</p>';
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Add scroll buttons for desktop
        if (contentArray.length > 5) {
            container.parentElement.style.position = 'relative';
            this.addScrollButtons(container.parentElement);
        }

        // Create movie cards
        contentArray.forEach(content => {
            const card = window.MovieCardComponent.createCard(content);
            container.appendChild(card);
        });

        // Setup horizontal scrolling
        this.setupHorizontalScroll(container);
    }

    addScrollButtons(sectionElement) {
        // Remove existing buttons
        const existingButtons = sectionElement.querySelectorAll('.scroll-btn');
        existingButtons.forEach(btn => btn.remove());

        const leftBtn = document.createElement('button');
        leftBtn.className = 'scroll-btn scroll-left btn btn-dark';
        leftBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        leftBtn.style.cssText = `
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: none;
        `;

        const rightBtn = document.createElement('button');
        rightBtn.className = 'scroll-btn scroll-right btn btn-dark';
        rightBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        rightBtn.style.cssText = `
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
            border-radius: 50%;
            width: 50px;
            height: 50px;
        `;

        sectionElement.appendChild(leftBtn);
        sectionElement.appendChild(rightBtn);

        const contentRow = sectionElement.querySelector('.content-row');
        
        leftBtn.addEventListener('click', () => {
            contentRow.scrollBy({ left: -400, behavior: 'smooth' });
        });

        rightBtn.addEventListener('click', () => {
            contentRow.scrollBy({ left: 400, behavior: 'smooth' });
        });

        // Show/hide buttons based on scroll position
        contentRow.addEventListener('scroll', () => {
            leftBtn.style.display = contentRow.scrollLeft > 0 ? 'flex' : 'none';
            rightBtn.style.display = 
                contentRow.scrollLeft < (contentRow.scrollWidth - contentRow.clientWidth - 10) ? 'flex' : 'none';
        });

        // Initial button state
        rightBtn.style.display = contentRow.scrollWidth > contentRow.clientWidth ? 'flex' : 'none';
    }

    setupHorizontalScroll(container) {
        let isDown = false;
        let startX;
        let scrollLeft;

        container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mouseup', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });

        // Touch scrolling is handled by CSS overflow-x: auto
    }

    setupEventListeners() {
        // Regional language tabs
        document.querySelectorAll('.regional-tabs button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchRegionalLanguage(e.target.textContent.trim());
                
                // Update active tab
                document.querySelectorAll('.regional-tabs button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Intersection Observer for lazy loading
        this.setupLazyLoading();

        // Scroll to top button
        this.setupScrollToTop();

        // Keyboard navigation
        this.setupKeyboardNavigation();
    }

    switchRegionalLanguage(language) {
        if (!this.regionalData || !this.regionalData[language]) return;
        
        this.currentRegionalLanguage = language;
        const regionalContent = document.getElementById('regionalContent');
        
        if (regionalContent) {
            this.renderContentRow(regionalContent, this.regionalData[language].slice(0, 12));
        }
    }

    setupLazyLoading() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });

        // Observe all images with data-src
        document.querySelectorAll('img[data-src]').forEach(img => {
            observer.observe(img);
        });
    }

    setupScrollToTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-to-top btn btn-netflix';
        scrollBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        scrollBtn.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            z-index: 1000;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: none;
        `;
        
        document.body.appendChild(scrollBtn);

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollBtn.style.display = 'flex';
            } else {
                scrollBtn.style.display = 'none';
            }
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Space bar to pause/play hero carousel
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                if (this.heroCarousel) {
                    const carousel = bootstrap.Carousel.getInstance(document.getElementById('heroCarousel'));
                    if (carousel) {
                        carousel.cycle();
                    }
                }
            }
        });
    }

    loadFallbackContent() {
        // Load cached content if available
        const cachedContent = storageService.getCache('homepage_content');
        if (cachedContent) {
            this.loadFromCache(cachedContent);
        } else {
            this.showError('Unable to load content. Please check your internet connection.');
        }
    }

    loadFromCache(cachedData) {
        // Implementation for loading from cache
        console.log('Loading from cache:', cachedData);
    }

    showError(message) {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger m-4';
            errorDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
                <button class="btn btn-outline-danger ms-3" onclick="location.reload()">
                    <i class="fas fa-refresh me-1"></i>Retry
                </button>
            `;
            mainContent.insertBefore(errorDiv, mainContent.firstChild);
        }
    }

    // Public methods for external interactions
    addToWatchlist(contentId) {
        // This method is called from hero section buttons
        const content = this.findContentById(contentId);
        if (content) {
            storageService.addToWatchlist(contentId, content);
            authService.showToast('Added to watchlist!', 'success');
        }
    }

    findContentById(contentId) {
        // Search through all loaded content sections
        const allSections = Object.values(this.contentSections || {});
        for (const section of allSections) {
            if (Array.isArray(section)) {
                const found = section.find(item => item.id === contentId);
                if (found) return found;
            } else if (typeof section === 'object') {
                for (const subsection of Object.values(section)) {
                    if (Array.isArray(subsection)) {
                        const found = subsection.find(item => item.id === contentId);
                        if (found) return found;
                    }
                }
            }
        }
        return null;
    }

    // Refresh content
    async refresh() {
        this.showLoading();
        await this.loadHomepageContent();
        await this.loadPersonalizedContent();
        this.hideLoading();
    }
}

// Initialize homepage
window.homePage = new HomePage();
