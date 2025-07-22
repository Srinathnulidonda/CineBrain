// HTML Include System for Reusable Components
class IncludeManager {
    constructor() {
        this.cache = new Map();
        this.loading = new Set();
    }

    async loadIncludes() {
        const includes = document.querySelectorAll('[data-include]');
        const promises = Array.from(includes).map(element => this.loadInclude(element));
        await Promise.all(promises);
        
        // Re-initialize components after includes are loaded
        this.initializeIncludedComponents();
    }

    async loadInclude(element) {
        const src = element.getAttribute('data-include');
        const fallback = element.getAttribute('data-fallback');
        
        if (this.loading.has(src)) {
            return;
        }
        
        this.loading.add(src);
        
        try {
            let html = this.cache.get(src);
            
            if (!html) {
                const response = await fetch(`/includes/${src}.html`);
                if (response.ok) {
                    html = await response.text();
                    this.cache.set(src, html);
                } else if (fallback) {
                    html = fallback;
                } else {
                    console.warn(`Failed to load include: ${src}`);
                    return;
                }
            }
            
            element.innerHTML = html;
            element.removeAttribute('data-include');
            
            // Process nested includes
            const nestedIncludes = element.querySelectorAll('[data-include]');
            if (nestedIncludes.length > 0) {
                const nestedPromises = Array.from(nestedIncludes).map(nested => this.loadInclude(nested));
                await Promise.all(nestedPromises);
            }
            
        } catch (error) {
            console.error(`Error loading include ${src}:`, error);
            if (fallback) {
                element.innerHTML = fallback;
            }
        } finally {
            this.loading.delete(src);
        }
    }

    initializeIncludedComponents() {
        // Re-run initialization for components that were included
        updateUserMenu();
        initializeHeader();
        
        // Dispatch custom event for other components to listen to
        document.dispatchEvent(new CustomEvent('includesLoaded'));
    }
}

const includeManager = new IncludeManager();

// Auto-load includes when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    includeManager.loadIncludes();
});

// Export for manual usage
window.includeManager = includeManager;