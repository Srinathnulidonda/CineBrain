class CineBrainGoogleAds {
    constructor() {
        this.adUnits = new Map();
        this.loadedAds = new Set();
        this.adPositions = new Map();
        this.adQueue = [];
        this.isGoogleAdsLoaded = false;
        this.intersectionObserver = null;
        this.contentObserver = null;

        // Configuration
        this.config = {
            publisherId: 'ca-pub-8281321841090139', // Set your Google AdSense publisher ID
            adFrequency: {
                carousel: 6, // Show ad every 6 cards in carousel
                sections: 2  // Show ad every 2 content sections
            },
            adTypes: {
                carousel: {
                    sizes: [[300, 250], [250, 250], [200, 200]],
                    slot: '2815420858', // Your ad slot ID
                    responsive: true
                },
                section: {
                    sizes: [[728, 90], [970, 250], [300, 250]],
                    slot: '2815420858', // Your ad slot ID
                    responsive: true
                },
                article: {
                    sizes: [[728, 90], [300, 250], [336, 280]],
                    slot: '9908454570', // Your ad slot ID
                    responsive: true
                }
            },
            lazyLoadOffset: '100px',
            refreshInterval: 30000, // 30 seconds for viewable ads
            maxAdsPerPage: 8
        };

        this.activeAds = 0;
        this.viewableAds = new Set();
        this.refreshTimer = null;

        this.init();
    }

    async init() {
        try {
            // Wait for content manager to be ready
            if (window.contentCardManager) {
                await this.setupIntegration();
            } else {
                // Wait for content manager to initialize
                const waitForContentManager = () => {
                    if (window.contentCardManager) {
                        this.setupIntegration();
                    } else {
                        setTimeout(waitForContentManager, 100);
                    }
                };
                waitForContentManager();
            }

            await this.loadGoogleAds();
            this.setupIntersectionObserver();
            this.setupContentObserver();
            this.setupEventListeners();

            console.log('CineBrain Google Ads initialized successfully');
        } catch (error) {
            console.error('CineBrain Google Ads initialization failed:', error);
        }
    }

    async setupIntegration() {
        // Integrate with existing content card manager
        const originalDisplayContent = window.contentCardManager.displayContent.bind(window.contentCardManager);

        window.contentCardManager.displayContent = (rowId, content) => {
            originalDisplayContent(rowId, content);

            // Add ads to carousel after content is displayed
            setTimeout(() => {
                this.addCarouselAds(rowId);
            }, 100);
        };

        // Hook into section completion
        const originalSetRowLoadingState = window.contentCardManager.setRowLoadingState.bind(window.contentCardManager);

        window.contentCardManager.setRowLoadingState = (rowId, state) => {
            originalSetRowLoadingState(rowId, state);

            if (state === 'loaded') {
                setTimeout(() => {
                    this.addSectionEndAd(rowId);
                }, 200);
            }
        };
    }

    async loadGoogleAds() {
        if (this.isGoogleAdsLoaded) return;

        return new Promise((resolve, reject) => {
            try {
                // Load Google AdSense script
                const script = document.createElement('script');
                script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
                script.async = true;
                script.crossOrigin = 'anonymous';

                if (this.config.publisherId) {
                    script.setAttribute('data-ad-client', this.config.publisherId);
                }

                script.onload = () => {
                    this.isGoogleAdsLoaded = true;
                    console.log('CineBrain: Google Ads script loaded');

                    // Initialize AdSense
                    if (window.adsbygoogle) {
                        try {
                            (window.adsbygoogle = window.adsbygoogle || []).push({
                                google_ad_client: this.config.publisherId,
                                enable_page_level_ads: true,
                                overlays: { bottom: true }
                            });
                        } catch (e) {
                            console.warn('CineBrain: AdSense auto ads initialization failed:', e);
                        }
                    }

                    resolve();
                };

                script.onerror = () => {
                    console.error('CineBrain: Failed to load Google Ads script');
                    reject(new Error('Failed to load Google Ads'));
                };

                document.head.appendChild(script);

                // Fallback timeout
                setTimeout(() => {
                    if (!this.isGoogleAdsLoaded) {
                        console.warn('CineBrain: Google Ads loading timeout');
                        reject(new Error('Google Ads loading timeout'));
                    }
                }, 10000);

            } catch (error) {
                console.error('CineBrain: Error loading Google Ads:', error);
                reject(error);
            }
        });
    }

    addCarouselAds(rowId) {
        if (this.activeAds >= this.config.maxAdsPerPage) return;

        const row = document.getElementById(rowId);
        if (!row) return;

        const wrapper = row.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        const cards = wrapper.querySelectorAll('.content-card');
        if (cards.length < this.config.adFrequency.carousel) return;

        // Calculate ad positions
        const adPositions = [];
        for (let i = this.config.adFrequency.carousel - 1; i < cards.length; i += this.config.adFrequency.carousel) {
            adPositions.push(i);
        }

        adPositions.forEach((position, index) => {
            if (this.activeAds >= this.config.maxAdsPerPage) return;

            const adId = `carousel-ad-${rowId}-${index}`;

            // Skip if ad already exists
            if (this.adUnits.has(adId)) return;

            const adContainer = this.createCarouselAd(adId);

            // Insert ad after the specified card
            const targetCard = cards[position];
            if (targetCard && targetCard.nextSibling) {
                wrapper.insertBefore(adContainer, targetCard.nextSibling);
            } else if (targetCard) {
                wrapper.appendChild(adContainer);
            }

            this.adUnits.set(adId, {
                type: 'carousel',
                container: adContainer,
                loaded: false,
                viewed: false
            });

            this.activeAds++;
        });
    }

    addSectionEndAd(rowId) {
        if (this.activeAds >= this.config.maxAdsPerPage) return;

        const sectionsWithAds = document.querySelectorAll('.section-end-ad').length;
        const totalSections = document.querySelectorAll('.content-row').length;

        // Add section end ad every N sections
        if ((totalSections - sectionsWithAds) % this.config.adFrequency.sections !== 0) {
            return;
        }

        const row = document.getElementById(rowId);
        if (!row) return;

        const adId = `section-end-ad-${rowId}`;

        // Skip if ad already exists
        if (this.adUnits.has(adId)) return;

        const adContainer = this.createSectionEndAd(adId);

        // Insert ad after the row
        row.parentNode.insertBefore(adContainer, row.nextSibling);

        this.adUnits.set(adId, {
            type: 'section',
            container: adContainer,
            loaded: false,
            viewed: false
        });

        this.activeAds++;
    }

    addArticleEndAd(articleContainer) {
        if (this.activeAds >= this.config.maxAdsPerPage) return;

        const adId = `article-end-ad-${Date.now()}`;
        const adContainer = this.createArticleEndAd(adId);

        articleContainer.appendChild(adContainer);

        this.adUnits.set(adId, {
            type: 'article',
            container: adContainer,
            loaded: false,
            viewed: false
        });

        this.activeAds++;
        return adContainer;
    }

    createCarouselAd(adId) {
        const container = document.createElement('div');
        container.className = 'cinebrain-ad-container carousel-ad-container';
        container.id = adId;
        container.innerHTML = `
            <div class="ad-label">Sponsored</div>
            <div class="ad-content">
                <div class="ad-loading">Loading ad</div>
            </div>
        `;

        return container;
    }

    createSectionEndAd(adId) {
        const container = document.createElement('div');
        container.className = 'cinebrain-ad-container section-end-ad';
        container.id = adId;
        container.innerHTML = `
            <div class="ad-label">Advertisement</div>
            <div class="ad-content">
                <div class="ad-loading">Loading content</div>
            </div>
        `;

        return container;
    }

    createArticleEndAd(adId) {
        const container = document.createElement('div');
        container.className = 'cinebrain-ad-container article-end-ad';
        container.id = adId;
        container.innerHTML = `
            <div class="ad-label">Sponsored</div>
            <div class="ad-content">
                <div class="ad-loading">Loading ad</div>
            </div>
        `;

        return container;
    }

    setupIntersectionObserver() {
        const options = {
            rootMargin: this.config.lazyLoadOffset,
            threshold: [0.1, 0.5, 0.9]
        };

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const adId = entry.target.id;
                const adUnit = this.adUnits.get(adId);

                if (!adUnit) return;

                if (entry.isIntersecting) {
                    if (entry.intersectionRatio >= 0.1 && !adUnit.loaded) {
                        this.loadAd(adId);
                    }

                    if (entry.intersectionRatio >= 0.5) {
                        this.markAdAsViewed(adId);
                    }
                }
            });
        }, options);

        // Observe existing ads
        this.adUnits.forEach((adUnit, adId) => {
            this.intersectionObserver.observe(adUnit.container);
        });
    }

    setupContentObserver() {
        // Observe for new content being added
        this.contentObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if new ads were added
                            const newAds = node.querySelectorAll('.cinebrain-ad-container');
                            newAds.forEach(adContainer => {
                                if (this.intersectionObserver && adContainer.id) {
                                    this.intersectionObserver.observe(adContainer);
                                }
                            });
                        }
                    });
                }
            });
        });

        this.contentObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async loadAd(adId) {
        const adUnit = this.adUnits.get(adId);
        if (!adUnit || adUnit.loaded) return;

        try {
            const adContent = adUnit.container.querySelector('.ad-content');
            const adConfig = this.config.adTypes[adUnit.type];

            if (!this.isGoogleAdsLoaded || !window.adsbygoogle) {
                this.showAdPlaceholder(adContent, 'Ads temporarily unavailable');
                return;
            }

            // Create responsive ad unit
            const adElement = document.createElement('ins');
            adElement.className = 'adsbygoogle responsive-ad';
            adElement.style.display = 'block';

            if (adConfig.slot) {
                adElement.setAttribute('data-ad-slot', adConfig.slot);
            }

            if (this.config.publisherId) {
                adElement.setAttribute('data-ad-client', this.config.publisherId);
            }

            // Set responsive attributes
            if (adConfig.responsive) {
                adElement.setAttribute('data-ad-format', 'auto');
                adElement.setAttribute('data-full-width-responsive', 'true');
            } else if (adConfig.sizes && adConfig.sizes.length > 0) {
                const [width, height] = adConfig.sizes[0];
                adElement.style.width = `${width}px`;
                adElement.style.height = `${height}px`;
            }

            adContent.innerHTML = '';
            adContent.appendChild(adElement);

            // Load the ad
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});

                adUnit.loaded = true;
                adUnit.container.classList.add('loaded');

                console.log(`CineBrain: Ad ${adId} loaded successfully`);

                // Check if ad loaded properly
                setTimeout(() => {
                    if (adElement.dataset.adsbygoogleStatus !== 'done') {
                        this.showAdPlaceholder(adContent, 'Unable to load ad');
                    }
                }, 3000);

            } catch (adError) {
                console.warn(`CineBrain: Ad ${adId} failed to load:`, adError);
                this.showAdPlaceholder(adContent, 'Ad unavailable');
            }

        } catch (error) {
            console.error(`CineBrain: Error loading ad ${adId}:`, error);
            this.showAdPlaceholder(adUnit.container.querySelector('.ad-content'), 'Ad error');
        }
    }

    showAdPlaceholder(adContent, message) {
        adContent.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100px;
                color: var(--ad-label-text);
                font-size: 0.9rem;
                text-align: center;
                padding: 20px;
            ">
                ${message}
            </div>
        `;
    }

    markAdAsViewed(adId) {
        const adUnit = this.adUnits.get(adId);
        if (!adUnit || adUnit.viewed) return;

        adUnit.viewed = true;
        this.viewableAds.add(adId);

        console.log(`CineBrain: Ad ${adId} viewed`);

        // Start refresh timer for viewable ads
        this.scheduleAdRefresh();
    }

    scheduleAdRefresh() {
        if (this.refreshTimer || this.viewableAds.size === 0) return;

        this.refreshTimer = setTimeout(() => {
            this.refreshViewableAds();
            this.refreshTimer = null;
        }, this.config.refreshInterval);
    }

    refreshViewableAds() {
        if (!window.adsbygoogle || this.viewableAds.size === 0) return;

        try {
            // Refresh ads that are still viewable
            const stillViewable = [];

            this.viewableAds.forEach(adId => {
                const adUnit = this.adUnits.get(adId);
                if (adUnit && this.isElementInViewport(adUnit.container)) {
                    stillViewable.push(adId);
                }
            });

            if (stillViewable.length > 0) {
                console.log(`CineBrain: Refreshing ${stillViewable.length} viewable ads`);

                // Google Ad Manager refresh would go here
                // For AdSense, we rely on their automatic refresh
            }

        } catch (error) {
            console.error('CineBrain: Ad refresh error:', error);
        }
    }

    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    setupEventListeners() {
        // Handle theme changes
        if (window.themeManager) {
            window.themeManager.register((theme) => {
                console.log('CineBrain ads: Theme updated to', theme);
            });
        }

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAdOperations();
            } else {
                this.resumeAdOperations();
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Handle responsive breakpoint changes
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResponsiveChanges();
            }, 250);
        });
    }

    pauseAdOperations() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
    }

    resumeAdOperations() {
        if (this.intersectionObserver) {
            this.adUnits.forEach((adUnit) => {
                this.intersectionObserver.observe(adUnit.container);
            });
        }

        this.scheduleAdRefresh();
    }

    handleResponsiveChanges() {
        // Re-evaluate ad sizes for responsive ads
        this.adUnits.forEach((adUnit, adId) => {
            if (adUnit.loaded) {
                const adElement = adUnit.container.querySelector('.adsbygoogle');
                if (adElement && adElement.dataset.adFormat === 'auto') {
                    // Responsive ads should handle this automatically
                    console.log(`CineBrain: Responsive ad ${adId} will auto-adjust`);
                }
            }
        });
    }

    // Public API
    addCustomAd(containerId, type = 'article') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`CineBrain: Container ${containerId} not found`);
            return null;
        }

        return this.addArticleEndAd(container);
    }

    removeAd(adId) {
        const adUnit = this.adUnits.get(adId);
        if (!adUnit) return false;

        if (this.intersectionObserver) {
            this.intersectionObserver.unobserve(adUnit.container);
        }

        adUnit.container.remove();
        this.adUnits.delete(adId);
        this.viewableAds.delete(adId);
        this.activeAds--;

        return true;
    }

    getAdStats() {
        return {
            totalAds: this.adUnits.size,
            loadedAds: Array.from(this.adUnits.values()).filter(ad => ad.loaded).length,
            viewedAds: this.viewableAds.size,
            activeAds: this.activeAds
        };
    }

    cleanup() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        if (this.contentObserver) {
            this.contentObserver.disconnect();
        }

        this.adUnits.clear();
        this.viewableAds.clear();
    }
}

// Initialize Google Ads when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cineBrainGoogleAds = new CineBrainGoogleAds();
    });
} else {
    window.cineBrainGoogleAds = new CineBrainGoogleAds();
}

// Export for global access
window.CineBrainGoogleAds = CineBrainGoogleAds;