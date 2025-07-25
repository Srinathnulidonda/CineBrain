// CineScope Utility Functions

// Image optimization and lazy loading
class ImageOptimizer {
    static createOptimizedImageUrl(originalUrl, width = 300, quality = 80) {
        if (!originalUrl) return '/assets/images/placeholder.jpg';
        
        // If it's already a TMDB URL, optimize it
        if (originalUrl.includes('image.tmdb.org')) {
            return originalUrl.replace('/w500/', `/w${width}/`);
        }
        
        return originalUrl;
    }
    
    static lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            images.forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }
}

// Local storage management
class StorageManager {
    static set(key, value, ttl = null) {
        const data = {
            value: value,
            timestamp: Date.now(),
            ttl: ttl
        };
        localStorage.setItem(key, JSON.stringify(data));
    }
    
    static get(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (!data) return null;
            
            // Check if data has expired
            if (data.ttl && Date.now() > data.timestamp + data.ttl) {
                localStorage.removeItem(key);
                return null;
            }
            
            return data.value;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }
    
    static remove(key) {
        localStorage.removeItem(key);
    }
    
    static clear() {
        localStorage.clear();
    }
}

// Theme management
class ThemeManager {
    static applyTheme(theme = 'dark') {
        document.documentElement.setAttribute('data-theme', theme);
        StorageManager.set('theme', theme);
    }
    
    static getTheme() {
        return StorageManager.get('theme') || 'dark';
    }
    
    static toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        return newTheme;
    }
}

// Performance monitoring
class PerformanceMonitor {
    static measurePageLoad() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            console.log(`Page load time: ${loadTime}ms`);
        });
    }
    
    static measureApiCall(name, startTime, endTime) {
        const duration = endTime - startTime;
        console.log(`API call ${name}: ${duration}ms`);
        
        // Send to analytics if needed
        if (window.gtag) {
            gtag('event', 'api_call', {
                event_category: 'performance',
                event_label: name,
                value: Math.round(duration)
            });
        }
    }
}

// Error handling
class ErrorHandler {
    static logError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        // Send to error tracking service
        if (window.Sentry) {
            Sentry.captureException(error, {
                tags: { context: context }
            });
        }
    }
    
    static showUserFriendlyError(message = 'Something went wrong. Please try again.') {
        // Show toast notification or modal
        if (window.showToast) {
            showToast(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Export functions for use in other scripts
window.ImageOptimizer = ImageOptimizer;
window.StorageManager = StorageManager;
window.ThemeManager = ThemeManager;
window.PerformanceMonitor = PerformanceMonitor;
window.ErrorHandler = ErrorHandler;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    ImageOptimizer.lazyLoadImages();
    PerformanceMonitor.measurePageLoad();
    ThemeManager.applyTheme(ThemeManager.getTheme());
});
