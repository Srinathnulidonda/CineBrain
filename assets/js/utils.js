// Utility Functions for CineBrain
class Utils {
    // Format rating with color coding
    static formatRating(rating) {
        if (!rating) return 'N/A';
        const num = parseFloat(rating);
        const rounded = Math.round(num * 10) / 10;

        let className = 'rating-badge ';
        if (num >= 7) className += 'high';
        else if (num >= 5) className += 'medium';
        else className += 'low';

        return { value: rounded, className };
    }

    // Format release date
    static formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.getFullYear();
    }

    // Get optimized image URL
    static getImageUrl(path, size = 'w300') {
        if (!path) return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"%3E%3Crect width="300" height="450" fill="%23374151"/%3E%3Ctext x="150" y="225" text-anchor="middle" fill="%23fff" font-size="24"%3ENo Image%3C/text%3E%3C/svg%3E';

        if (path.startsWith('http')) return path;
        return `https://image.tmdb.org/t/p/${size}${path}`;
    }

    // Truncate text
    static truncateText(text, maxLength = 150) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    // Debounce function for search
    static debounce(func, wait) {
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

    // Format content type
    static formatContentType(type) {
        const types = {
            'movie': 'Movie',
            'tv': 'TV Series',
            'anime': 'Anime'
        };
        return types[type] || type.toUpperCase();
    }

    // Generate YouTube thumbnail URL
    static getYouTubeThumbnail(videoId) {
        if (!videoId) return null;
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    // Extract YouTube video ID from URL
    static extractYouTubeId(url) {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        return match ? match[1] : null;
    }

    // Show toast notification
    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
                <span>${message}</span>
            </div>
        `;

        // Add toast styles if not already added
        if (!document.getElementById('toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'toast-styles';
            styles.textContent = `
                .toast-notification {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    z-index: 9999;
                    background: rgba(31, 41, 55, 0.95);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border-left: 4px solid;
                    backdrop-filter: blur(10px);
                    animation: slideInRight 0.3s ease-out;
                    max-width: 300px;
                }
                .toast-success { border-left-color: #10B981; }
                .toast-error { border-left-color: #EF4444; }
                .toast-info { border-left-color: #3B82F6; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Local storage helpers
    static setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('localStorage not available');
        }
    }

    static getStorage(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.warn('localStorage not available');
            return null;
        }
    }

    // Performance monitoring
    static measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    }

    // Generate unique session ID
    static generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // Check if user is on mobile
    static isMobile() {
        return window.innerWidth <= 768;
    }

    // Smooth scroll to element
    static scrollToElement(elementId, offset = 0) {
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    // Format genres for display
    static formatGenres(genres, maxCount = 3) {
        if (!genres || !Array.isArray(genres)) return '';
        const displayGenres = genres.slice(0, maxCount);
        return displayGenres.join(', ');
    }

    // Check if element is in viewport
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});