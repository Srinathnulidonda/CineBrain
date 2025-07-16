/**
 * Utility Helper Functions
 */

// Debounce function for search and scroll events
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Throttle function for performance-sensitive events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Format date for display
function formatDate(dateString, format = 'short') {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (format === 'relative') {
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }
    
    const options = format === 'long' 
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' };
    
    return date.toLocaleDateString('en-US', options);
}

// Format runtime (minutes to hours and minutes)
function formatRuntime(minutes) {
    if (!minutes) return 'Unknown';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

// Format rating for display
function formatRating(rating, maxRating = 10) {
    if (!rating) return 'N/A';
    
    const normalized = (rating / maxRating) * 10;
    return normalized.toFixed(1);
}

// Get image URL with fallback
function getImageUrl(path, size = 'w500', type = 'poster') {
    if (!path) return IMAGE_CONFIG.PLACEHOLDER;
    
    // Handle different image types
    const baseSize = type === 'backdrop' 
        ? IMAGE_CONFIG.SIZES.BACKDROP_LARGE 
        : size;
    
    return `${IMAGE_CONFIG.TMDB_BASE}/${baseSize}${path}`;
}

// Get responsive image URLs for different screen sizes
function getResponsiveImageUrls(path, type = 'poster') {
    if (!path) return {
        small: IMAGE_CONFIG.PLACEHOLDER,
        medium: IMAGE_CONFIG.PLACEHOLDER,
        large: IMAGE_CONFIG.PLACEHOLDER
    };
    
    const base = IMAGE_CONFIG.TMDB_BASE;
    
    if (type === 'backdrop') {
        return {
            small: `${base}/${IMAGE_CONFIG.SIZES.BACKDROP_SMALL}${path}`,
            large: `${base}/${IMAGE_CONFIG.SIZES.BACKDROP_LARGE}${path}`
        };
    }
    
    return {
        small: `${base}/${IMAGE_CONFIG.SIZES.POSTER_SMALL}${path}`,
        medium: `${base}/${IMAGE_CONFIG.SIZES.POSTER_MEDIUM}${path}`,
        large: `${base}/${IMAGE_CONFIG.SIZES.POSTER_LARGE}${path}`
    };
}

// Create srcset for responsive images
function createSrcSet(path, type = 'poster') {
    const urls = getResponsiveImageUrls(path, type);
    
    if (type === 'backdrop') {
        return `${urls.small} 780w, ${urls.large} 1280w`;
    }
    
    return `${urls.small} 200w, ${urls.medium} 342w, ${urls.large} 500w`;
}

// Sanitize text for display
function sanitizeText(text, maxLength = null) {
    if (!text) return '';
    
    // Remove HTML tags
    const sanitized = text.replace(/<[^>]*>/g, '');
    
    if (maxLength && sanitized.length > maxLength) {
        return sanitized.substring(0, maxLength).trim() + '...';
    }
    
    return sanitized;
}

// Generate initials from name
function getInitials(name) {
    if (!name) return '?';
    
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

// Check if device is mobile
function isMobile() {
    return window.innerWidth <= UI_CONFIG.MOBILE_BREAKPOINT;
}

// Check if device supports touch
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Get device type
function getDeviceType() {
    const width = window.innerWidth;
    
    if (width < 576) return 'mobile';
    if (width < 768) return 'tablet-portrait';
    if (width < 992) return 'tablet-landscape';
    if (width < 1200) return 'desktop';
    return 'desktop-large';
}

// Scroll to element smoothly
function scrollToElement(element, offset = 0) {
    if (!element) return;
    
    const elementPosition = element.offsetTop;
    const offsetPosition = elementPosition - offset;
    
    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

// Show loading state
function showLoading(element, text = 'Loading...') {
    if (!element) return;
    
    element.innerHTML = `
        <div class="d-flex justify-content-center align-items-center p-4">
            <div class="spinner-border text-danger me-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span>${text}</span>
        </div>
    `;
}

// Show error state
function showError(element, message = 'Something went wrong') {
    if (!element) return;
    
    element.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Oops!</h4>
            <p>${message}</p>
            <button class="btn btn-primary mt-2" onclick="location.reload()">
                <i class="fas fa-redo me-1"></i>
                Try Again
            </button>
        </div>
    `;
}

// Show empty state
function showEmpty(element, title = 'No content found', description = '') {
    if (!element) return;
    
    element.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-film"></i>
            <h3>${title}</h3>
            ${description ? `<p>${description}</p>` : ''}
        </div>
    `;
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        return true;
    } catch (err) {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy to clipboard', 'error');
        return false;
    }
}

// Share content
async function shareContent(title, text, url) {
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
            return true;
        } catch (err) {
            console.error('Error sharing:', err);
        }
    }
    
    // Fallback to copy to clipboard
    const shareText = `${title}\n${text}\n${url}`;
    return await copyToClipboard(shareText);
}

// Validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const score = [
        password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
    ].filter(Boolean).length;
    
    return {
        score,
        isValid: score >= 3,
        strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong',
        feedback: {
            length: password.length >= minLength,
            upperCase: hasUpperCase,
            lowerCase: hasLowerCase,
            numbers: hasNumbers,
            specialChar: hasSpecialChar
        }
    };
}

// Generate random ID
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Convert to slug
function toSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

// Parse URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    
    for (const [key, value] of params) {
        result[key] = value;
    }
    
    return result;
}

// Update URL without refresh
function updateUrl(params, replace = false) {
    const url = new URL(window.location);
    
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });
    
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', url);
}

// Event emitter functionality
const EventEmitter = {
    events: {},
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    },
    
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    },
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
};

// Error handler
function handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    
    // Track errors for analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'exception', {
            description: `${context}: ${error.message}`,
            fatal: false
        });
    }
    
    // Show user-friendly error message
    const userMessage = error.message.includes('fetch') 
        ? ERROR_MESSAGES.NETWORK_ERROR
        : ERROR_MESSAGES.SERVER_ERROR;
    
    showToast(userMessage, 'error');
}

// Performance monitoring
const Performance = {
    marks: {},
    
    mark(name) {
        this.marks[name] = performance.now();
    },
    
    measure(name, startMark) {
        if (this.marks[startMark]) {
            const duration = performance.now() - this.marks[startMark];
            console.log(`${name}: ${duration.toFixed(2)}ms`);
            return duration;
        }
        return 0;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        formatDate,
        formatRuntime,
        formatRating,
        getImageUrl,
        getResponsiveImageUrls,
        createSrcSet,
        sanitizeText,
        getInitials,
        isMobile,
        isTouchDevice,
        getDeviceType,
        scrollToElement,
        showLoading,
        showError,
        showEmpty,
        copyToClipboard,
        shareContent,
        isValidEmail,
        validatePassword,
        generateId,
        toSlug,
        getUrlParams,
        updateUrl,
        EventEmitter,
        handleError,
        Performance
    };
}