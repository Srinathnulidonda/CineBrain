// Utility Functions
const Utils = {
    // Debounce function
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
    },

    // Format date
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Format runtime
    formatRuntime(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    },

    // Get image URL
    getImageUrl(path, type = 'poster', size = 'medium') {
        if (!path) return '/assets/images/placeholders/no-image.png';
        if (path.startsWith('http')) return path;
        return `${CONFIG.TMDB_IMAGE_BASE}/${CONFIG.IMAGE_SIZES[type][size]}${path}`;
    },

    // Check if mobile
    isMobile() {
        return window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
    },

    // Check if tablet
    isTablet() {
        return window.innerWidth >= CONFIG.MOBILE_BREAKPOINT && 
               window.innerWidth < CONFIG.TABLET_BREAKPOINT;
    },

    // Truncate text
    truncateText(text, maxLength = 150) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // Generate unique ID
    generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Parse genre names
    getGenreNames(genreIds) {
        if (!genreIds || !Array.isArray(genreIds)) return [];
        return genreIds.map(id => GENRE_MAP[id] || `Genre ${id}`);
    },

    // Smooth scroll to element
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    // Local storage helpers
    storage: {
        get(key) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                return null;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('Storage error:', e);
            }
        },
        remove(key) {
            localStorage.removeItem(key);
        }
    }
};