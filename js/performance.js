// CineScope - Performance Optimization

class PerformanceOptimizer {
    constructor() {
        this.init();
    }

    init() {
        this.setupImageOptimization();
        this.setupLazyLoading();
        this.setupInfiniteScroll();
        this.setupCaching();
        this.monitorPerformance();
    }

    setupImageOptimization() {
        // Convert images to WebP if supported
        this.supportsWebP = this.checkWebPSupport();
        
        // Optimize image loading
        this.setupResponsiveImages();
        this.setupImagePreloading();
    }

    checkWebPSupport() {
        return new Promise(resolve => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                resolve(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    setupResponsiveImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        images.forEach(img => {
            const src = img.dataset.src;
            if (src && src.includes('image.tmdb.org')) {
                // Create responsive URLs for TMDB images
                const sizes = [300, 500, 780];
                const srcSet = sizes.map(size => `${src.replace('/w500/', `/w${size}/`)} ${size}w`).join(', ');
                img.setAttribute('srcset', srcSet);
                img.setAttribute('sizes', '(max-width: 640px) 300px, (max-width: 1024px) 500px, 780px');
            }
        });
    }

    setupImagePreloading() {
        // Preload critical images
        const heroImages = document.querySelectorAll('.hero-section img, .details-hero img');
        heroImages.forEach(img => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = img.src || img.dataset.src;
            document.head.appendChild(link);
        });
    }

    setupLazyLoading() {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.loadImage(img);
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });

        // Observe all lazy images
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));

        // Setup for dynamically added images
        this.setupDynamicLazyLoading();
    }

    loadImage(img) {
        return new Promise((resolve, reject) => {
            const tempImg = new Image();
            
            tempImg.onload = () => {
                img.src = tempImg.src;
                img.classList.remove('lazy');
                img.classList.add('loaded');
                resolve();
            };
            
            tempImg.onerror = reject;
            tempImg.src = img.dataset.src;
        });
    }

    setupDynamicLazyLoading() {
        const contentObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const lazyImages = node.querySelectorAll ? 
                            node.querySelectorAll('img[data-src]') : [];
                        lazyImages.forEach(img => this.imageObserver?.observe(img));
                    }
                });
            });
        });

        contentObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupInfiniteScroll() {
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const loadMoreBtn = entry.target;
                    if (loadMoreBtn && !loadMoreBtn.disabled) {
                        loadMoreBtn.click();
                    }
                }
            });
        }, {
            rootMargin: '100px'
        });

        // Observe load more buttons
        const loadMoreButtons = document.querySelectorAll('[id*="loadMore"]');
        loadMoreButtons.forEach(btn => scrollObserver.observe(btn));
    }

    setupCaching() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        // Cache API responses
        this.interceptFetch();
    }

    interceptFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            // Only cache GET requests
            if (options.method && options.method !== 'GET') {
                return originalFetch(url, options);
            }

            const cacheKey = this.getCacheKey(url, options);
            const cached = this.getFromCache(cacheKey);

            if (cached) {
                return new Response(JSON.stringify(cached.data), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            try {
                const response = await originalFetch(url, options);
                
                if (response.ok && url.includes('/api/')) {
                    const data = await response.clone().json();
                    this.addToCache(cacheKey, data);
                }

                return response;
            } catch (error) {
                // Return cached data if available on error
                if (cached) {
                    return new Response(JSON.stringify(cached.data), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                throw error;
            }
        };
    }

    getCacheKey(url, options) {
        return `${url}_${JSON.stringify(options)}`;
    }

    addToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // Clean up old cache entries
        this.cleanCache();
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached;
        }

        if (cached) {
            this.cache.delete(key);
        }

        return null;
    }

    cleanCache() {
        const now = Date.now();
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    monitorPerformance() {
        // Monitor Core Web Vitals
        this.monitorLCP();
        this.monitorFID();
        this.monitorCLS();
        
        // Monitor custom metrics
        this.monitorPageLoad();
        this.monitorApiCalls();
    }

    monitorLCP() {
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            
            console.log('LCP:', lastEntry.startTime);
            this.reportMetric('LCP', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
    }

    monitorFID() {
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                console.log('FID:', entry.processingStart - entry.startTime);
                this.reportMetric('FID', entry.processingStart - entry.startTime);
            });
        }).observe({ entryTypes: ['first-input'] });
    }

    monitorCLS() {
        let clsValue = 0;
        
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            
            console.log('CLS:', clsValue);
            this.reportMetric('CLS', clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
    }

    monitorPageLoad() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            
            console.log('Page Load Time:', loadTime);
            this.reportMetric('PageLoad', loadTime);
        });
    }

    monitorApiCalls() {
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (entry.name.includes('/api/')) {
                    console.log('API Call:', entry.name, entry.duration);
                    this.reportMetric('APICall', entry.duration, entry.name);
                }
            });
        }).observe({ entryTypes: ['resource'] });
    }

    reportMetric(name, value, url = '') {
        // Send to analytics
        if (window.gtag) {
            gtag('event', 'performance_metric', {
                event_category: 'Performance',
                event_label: `${name}${url ? ` - ${url}` : ''}`,
                value: Math.round(value)
            });
        }

        // Send to custom analytics endpoint
        if (window.analytics) {
            analytics.track('Performance Metric', {
                metric: name,
                value: value,
                url: url,
                timestamp: Date.now()
            });
        }
    }

    // Utility methods
    preloadRoute(href) {
        // Preload route resources
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
    }

    optimizeScrollPerformance() {
        // Use passive event listeners for scroll
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            if (scrollTimeout) return;
            
            scrollTimeout = setTimeout(() => {
                this.handleScroll();
                scrollTimeout = null;
            }, 16); // ~60fps
        }, { passive: true });
    }

    handleScroll() {
        // Implement scroll-based optimizations
        const scrollY = window.scrollY;
        
        // Update navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', scrollY > 100);
        }

        // Show/hide scroll to top button
        const scrollTopBtn = document.getElementById('scrollTopBtn');
        if (scrollTopBtn) {
            scrollTopBtn.style.display = scrollY > 500 ? 'block' : 'none';
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize performance optimizer
let performanceOptimizer;
document.addEventListener('DOMContentLoaded', () => {
    performanceOptimizer = new PerformanceOptimizer();
});

// Export for global use
window.PerformanceOptimizer = PerformanceOptimizer;