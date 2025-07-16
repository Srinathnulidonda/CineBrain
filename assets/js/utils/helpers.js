// Utility Helper Functions for MovieRec App

/**
 * Format numbers with proper separators
 */
function formatNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(1) + 'B';
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(1) + 'M';
    }
    if (num >= 1e3) {
        return (num / 1e3).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Format duration in minutes to human readable format
 */
function formatDuration(minutes) {
    if (!minutes) return 'Unknown';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

/**
 * Format date to human readable format
 */
function formatDate(dateString, options = {}) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    const timeIntervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
        { label: 'second', seconds: 1 }
    ];
    
    for (const interval of timeIntervals) {
        const count = Math.floor(diffInSeconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'Just now';
}

/**
 * Debounce function calls
 */
function debounce(func, wait, immediate = false) {
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

/**
 * Throttle function calls
 */
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

/**
 * Deep clone object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Generate random ID
 */
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text, maxLength, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Get dominant color from image
 */
async function getDominantColor(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            let r = 0, g = 0, b = 0;
            const pixelCount = data.length / 4;
            
            for (let i = 0; i < data.length; i += 4) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
            }
            
            r = Math.floor(r / pixelCount);
            g = Math.floor(g / pixelCount);
            b = Math.floor(b / pixelCount);
            
            resolve(`rgb(${r}, ${g}, ${b})`);
        };
        
        img.onerror = () => resolve('#333333');
        img.src = imageUrl;
    });
}

/**
 * Check if element is in viewport
 */
function isInViewport(element, offset = 0) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= -offset &&
        rect.left >= -offset &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) + offset
    );
}

/**
 * Smooth scroll to element
 */
function scrollToElement(element, offset = 0, behavior = 'smooth') {
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;
    
    window.scrollTo({
        top: offsetPosition,
        behavior: behavior
    });
}

/**
 * Get URL parameters
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

/**
 * Update URL without page reload
 */
function updateUrl(params, replace = false) {
    const url = new URL(window.location);
    
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });
    
    if (replace) {
        window.history.replaceState({}, '', url);
    } else {
        window.history.pushState({}, '', url);
    }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        return success;
    }
}

/**
 * Load image with promise
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Preload images
 */
async function preloadImages(urls) {
    const promises = urls.map(url => loadImage(url));
    return Promise.allSettled(promises);
}

/**
 * Get device type
 */
function getDeviceType() {
    const userAgent = navigator.userAgent;
    
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
        return 'tablet';
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
        return 'mobile';
    }
    
    return 'desktop';
}

/**
 * Check if device supports touch
 */
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get browser info
 */
function getBrowserInfo() {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get contrast ratio between two colors
 */
function getContrastRatio(color1, color2) {
    const getLuminance = (color) => {
        const rgb = color.match(/\d+/g);
        const [r, g, b] = rgb.map(c => {
            c = parseInt(c) / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

/**
 * Random number between min and max
 */
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Shuffle array
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Group array by property
 */
function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
}

/**
 * Remove duplicates from array
 */
function removeDuplicates(array, key) {
    if (key) {
        return array.filter((item, index, self) => 
            index === self.findIndex(t => t[key] === item[key])
        );
    }
    return [...new Set(array)];
}

/**
 * Sort array by multiple criteria
 */
function sortBy(array, ...criteria) {
    return array.sort((a, b) => {
        for (const criterion of criteria) {
            let key, order = 'asc';
            
            if (typeof criterion === 'string') {
                key = criterion;
            } else {
                key = criterion.key;
                order = criterion.order || 'asc';
            }
            
            const aVal = a[key];
            const bVal = b[key];
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

/**
 * Create element with attributes and children
 */
function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });
    
    return element;
}

/**
 * Local storage with expiration
 */
const localStorageWithExpiry = {
    set(key, value, ttl) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    },
    
    get(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        
        const item = JSON.parse(itemStr);
        const now = new Date();
        
        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        
        return item.value;
    }
};

/**
 * Performance monitoring
 */
const performance = {
    marks: new Map(),
    
    mark(name) {
        this.marks.set(name, performance.now());
    },
    
    measure(name, startMark) {
        const startTime = this.marks.get(startMark);
        if (!startTime) return null;
        
        const duration = performance.now() - startTime;
        console.log(`${name}: ${duration.toFixed(2)}ms`);
        return duration;
    }
};

// Export functions for global use
window.MovieRecHelpers = {
    formatNumber,
    formatDuration,
    formatDate,
    formatRelativeTime,
    debounce,
    throttle,
    deepClone,
    generateId,
    escapeHtml,
    truncateText,
    getDominantColor,
    isInViewport,
    scrollToElement,
    getUrlParams,
    updateUrl,
    formatFileSize,
    copyToClipboard,
    loadImage,
    preloadImages,
    getDeviceType,
    isTouchDevice,
    getBrowserInfo,
    prefersReducedMotion,
    getContrastRatio,
    randomBetween,
    shuffleArray,
    groupBy,
    removeDuplicates,
    sortBy,
    createElement,
    localStorageWithExpiry,
    performance
};

// Make individual functions available globally
Object.assign(window, window.MovieRecHelpers);
