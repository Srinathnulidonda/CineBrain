// HTML Include System for Reusable Components
class HTMLIncludeSystem {
    constructor() {
        this.cache = new Map();
        this.loadIncludes();
    }

    async loadIncludes() {
        const includeElements = document.querySelectorAll('[data-include]');
        
        const loadPromises = Array.from(includeElements).map(element => 
            this.loadInclude(element)
        );

        await Promise.all(loadPromises);
        
        // Trigger custom event when all includes are loaded
        document.dispatchEvent(new CustomEvent('includesLoaded'));
    }

    async loadInclude(element) {
        const includePath = element.dataset.include;
        if (!includePath) return;

        try {
            let html;
            
            if (this.cache.has(includePath)) {
                html = this.cache.get(includePath);
            } else {
                const response = await fetch(`/includes/${includePath}.html`);
                if (!response.ok) {
                    throw new Error(`Failed to load include: ${includePath}`);
                }
                html = await response.text();
                this.cache.set(includePath, html);
            }

            element.innerHTML = html;
            
            // Process any nested includes
            const nestedIncludes = element.querySelectorAll('[data-include]');
            if (nestedIncludes.length > 0) {
                await Promise.all(
                    Array.from(nestedIncludes).map(nested => this.loadInclude(nested))
                );
            }

        } catch (error) {
            console.error(`Error loading include ${includePath}:`, error);
            element.innerHTML = `<div class="error">Failed to load ${includePath}</div>`;
        }
    }

    // Method to reload a specific include
    async reloadInclude(selector) {
        const element = document.querySelector(selector);
        if (element && element.dataset.include) {
            // Clear cache for this include
            this.cache.delete(element.dataset.include);
            await this.loadInclude(element);
        }
    }

    // Method to preload includes
    async preloadInclude(includePath) {
        if (this.cache.has(includePath)) return;

        try {
            const response = await fetch(`/includes/${includePath}.html`);
            if (response.ok) {
                const html = await response.text();
                this.cache.set(includePath, html);
            }
        } catch (error) {
            console.error(`Error preloading include ${includePath}:`, error);
        }
    }
}

// Initialize include system
document.addEventListener('DOMContentLoaded', () => {
    window.includeSystem = new HTMLIncludeSystem();
});