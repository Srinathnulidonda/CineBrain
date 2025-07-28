// Include.js - Frontend HTML includes system for CineScope
// Loads reusable HTML components dynamically

class IncludeManager {
    constructor() {
        this.cache = new Map();
        this.loading = new Set();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * Initialize includes on page load
     */
    async init() {
        await this.processIncludes();
        this.setupObserver();
    }

    /**
     * Process all includes on the page
     */
    async processIncludes() {
        const includeElements = document.querySelectorAll('[data-include]');
        const promises = Array.from(includeElements).map(element => 
            this.loadInclude(element)
        );
        
        await Promise.allSettled(promises);
    }

    /**
     * Load a single include element
     */
    async loadInclude(element, attempt = 1) {
        const src = element.getAttribute('data-include');
        const loading = element.getAttribute('data-loading');
        const fallback = element.getAttribute('data-fallback');
        
        if (!src) {
            console.warn('Include element missing data-include attribute:', element);
            return;
        }

        // Prevent duplicate loading
        const loadingKey = `${src}-${element.outerHTML}`;
        if (this.loading.has(loadingKey)) {
            return;
        }

        this.loading.add(loadingKey);

        try {
            // Show loading state
            if (loading) {
                element.innerHTML = loading;
            } else {
                element.innerHTML = this.getDefaultLoadingHTML();
            }

            // Load content
            const content = await this.fetchInclude(src);
            
            // Replace element content
            element.innerHTML = content;
            
            // Process nested includes
            const nestedIncludes = element.querySelectorAll('[data-include]');
            if (nestedIncludes.length > 0) {
                await Promise.allSettled(
                    Array.from(nestedIncludes).map(nested => this.loadInclude(nested))
                );
            }

            // Execute any scripts in the included content
            this.executeScripts(element);
            
            // Trigger custom event
            element.dispatchEvent(new CustomEvent('include:loaded', {
                detail: { src, element }
            }));

        } catch (error) {
            console.error(`Failed to load include: ${src}`, error);
            
            // Retry logic
            if (attempt < this.retryAttempts) {
                setTimeout(() => {
                    this.loadInclude(element, attempt + 1);
                }, this.retryDelay * attempt);
                return;
            }
            
            // Show fallback or error
            if (fallback) {
                element.innerHTML = fallback;
            } else {
                element.innerHTML = this.getErrorHTML(src);
            }
            
            // Trigger error event
            element.dispatchEvent(new CustomEvent('include:error', {
                detail: { src, element, error }
            }));
        } finally {
            this.loading.delete(loadingKey);
        }
    }

    /**
     * Fetch include content with caching
     */
    async fetchInclude(src) {
        // Check cache first
        if (this.cache.has(src)) {
            return this.cache.get(src);
        }

        // Fetch from server
        const response = await fetch(src, {
            method: 'GET',
            headers: {
                'Accept': 'text/html',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();
        
        // Cache the content
        this.cache.set(src, content);
        
        return content;
    }

    /**
     * Execute scripts in included content
     */
    executeScripts(container) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            
            // Copy attributes
            Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            // Copy content
            newScript.textContent = script.textContent;
            
            // Replace old script with new one
            script.parentNode.replaceChild(newScript, script);
        });
    }

    /**
     * Setup mutation observer for dynamic includes
     */
    setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node itself has data-include
                        if (node.hasAttribute && node.hasAttribute('data-include')) {
                            this.loadInclude(node);
                        }
                        
                        // Check for child elements with data-include
                        const includes = node.querySelectorAll && node.querySelectorAll('[data-include]');
                        if (includes && includes.length > 0) {
                            includes.forEach(element => this.loadInclude(element));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Reload a specific include
     */
    async reloadInclude(selector) {
        const elements = document.querySelectorAll(selector);
        const promises = Array.from(elements).map(element => {
            // Clear cache for this include
            const src = element.getAttribute('data-include');
            if (src) {
                this.cache.delete(src);
            }
            return this.loadInclude(element);
        });
        
        await Promise.allSettled(promises);
    }

    /**
     * Clear all cached includes
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Preload includes for faster loading
     */
    async preloadIncludes(sources) {
        const promises = sources.map(src => this.fetchInclude(src));
        await Promise.allSettled(promises);
    }

    /**
     * Get default loading HTML
     */
    getDefaultLoadingHTML() {
        return `
            <div class="include-loading" style="padding: 1rem; text-align: center;">
                <div class="spinner" style="
                    width: 1.5rem; 
                    height: 1.5rem; 
                    border: 2px solid #374151; 
                    border-top: 2px solid #3b82f6; 
                    border-radius: 50%; 
                    animation: spin 1s linear infinite; 
                    margin: 0 auto;
                "></div>
                <div style="margin-top: 0.5rem; color: #9ca3af; font-size: 0.875rem;">
                    Loading...
                </div>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    /**
     * Get error HTML
     */
    getErrorHTML(src) {
        return `
            <div class="include-error" style="
                padding: 1rem; 
                text-align: center; 
                color: #ef4444; 
                background: rgba(239, 68, 68, 0.1); 
                border: 1px solid rgba(239, 68, 68, 0.2); 
                border-radius: 0.5rem;
            ">
                <div style="font-weight: 600; margin-bottom: 0.25rem;">
                    Failed to load component
                </div>
                <div style="font-size: 0.75rem; color: #9ca3af;">
                    ${src}
                </div>
                <button onclick="includeManager.reloadInclude('[data-include=&quot;${src}&quot;]')" 
                        style="
                            margin-top: 0.5rem; 
                            padding: 0.25rem 0.75rem; 
                            background: #ef4444; 
                            color: white; 
                            border: none; 
                            border-radius: 0.25rem; 
                            cursor: pointer; 
                            font-size: 0.75rem;
                        ">
                    Retry
                </button>
            </div>
        `;
    }
}

// Template helpers for common includes
class IncludeTemplates {
    /**
     * Create header include with dynamic content
     */
    static createHeader(options = {}) {
        const {
            title = 'CineScope',
            showSearch = true,
            showAuth = true,
            activeLink = '',
            customClass = ''
        } = options;

        return `
            <header class="header ${customClass}" data-include="/includes/header.html" 
                    data-title="${title}"
                    data-show-search="${showSearch}"
                    data-show-auth="${showAuth}"
                    data-active-link="${activeLink}">
            </header>
        `;
    }

    /**
     * Create footer include
     */
    static createFooter(options = {}) {
        const { customClass = '' } = options;
        
        return `
            <footer class="footer ${customClass}" data-include="/includes/footer.html">
            </footer>
        `;
    }

    /**
     * Create sidebar include
     */
    static createSidebar(options = {}) {
        const { 
            type = 'default',
            customClass = ''
        } = options;
        
        return `
            <aside class="sidebar ${customClass}" 
                   data-include="/includes/sidebar.html"
                   data-sidebar-type="${type}">
            </aside>
        `;
    }
}

// Conditional includes based on authentication state
class ConditionalIncludes {
    /**
     * Load different includes based on auth state
     */
    static setupAuthConditionals() {
        document.addEventListener('DOMContentLoaded', () => {
            const authElements = document.querySelectorAll('[data-include-auth]');
            
            authElements.forEach(element => {
                const authRequired = element.getAttribute('data-include-auth') === 'true';
                const authSrc = element.getAttribute('data-include-auth-src');
                const noAuthSrc = element.getAttribute('data-include-no-auth-src');
                
                if (window.app && window.app.isAuthenticated()) {
                    if (authRequired && authSrc) {
                        element.setAttribute('data-include', authSrc);
                    }
                } else {
                    if (!authRequired && noAuthSrc) {
                        element.setAttribute('data-include', noAuthSrc);
                    }
                }
            });
        });
    }

    /**
     * Load different includes based on user role
     */
    static setupRoleConditionals() {
        document.addEventListener('DOMContentLoaded', () => {
            const roleElements = document.querySelectorAll('[data-include-role]');
            
            roleElements.forEach(element => {
                const requiredRole = element.getAttribute('data-include-role');
                const roleSrc = element.getAttribute('data-include-role-src');
                const defaultSrc = element.getAttribute('data-include-default-src');
                
                if (window.app && window.app.user && window.app.user.is_admin && requiredRole === 'admin') {
                    if (roleSrc) {
                        element.setAttribute('data-include', roleSrc);
                    }
                } else if (defaultSrc) {
                    element.setAttribute('data-include', defaultSrc);
                }
            });
        });
    }
}

// Performance optimization for includes
class IncludePerformance {
    /**
     * Lazy load includes when they come into viewport
     */
    static setupLazyLoading() {
        const lazyIncludes = document.querySelectorAll('[data-include-lazy]');
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const src = element.getAttribute('data-include-lazy');
                        
                        element.setAttribute('data-include', src);
                        element.removeAttribute('data-include-lazy');
                        
                        includeManager.loadInclude(element);
                        observer.unobserve(element);
                    }
                });
            });
            
            lazyIncludes.forEach(element => observer.observe(element));
        } else {
            // Fallback for older browsers
            lazyIncludes.forEach(element => {
                const src = element.getAttribute('data-include-lazy');
                element.setAttribute('data-include', src);
                element.removeAttribute('data-include-lazy');
            });
        }
    }

    /**
     * Prefetch includes on hover
     */
    static setupHoverPrefetch() {
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-include-hover]');
            if (target) {
                const src = target.getAttribute('data-include-hover');
                includeManager.fetchInclude(src).catch(() => {
                    // Silent fail for prefetch
                });
            }
        });
    }
}

// Initialize the include manager
const includeManager = new IncludeManager();

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    includeManager.init();
    ConditionalIncludes.setupAuthConditionals();
    ConditionalIncludes.setupRoleConditionals();
    IncludePerformance.setupLazyLoading();
    IncludePerformance.setupHoverPrefetch();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IncludeManager,
        IncludeTemplates,
        ConditionalIncludes,
        IncludePerformance
    };
}

// Global access
window.includeManager = includeManager;
window.IncludeTemplates = IncludeTemplates;
