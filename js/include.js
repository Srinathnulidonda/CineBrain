// Include.js - Handle loading reusable HTML components
class IncludeLoader {
    constructor() {
        this.cache = new Map();
        this.loading = new Set();
    }

    async loadInclude(elementId, filePath, useCache = true) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with id "${elementId}" not found`);
            return;
        }

        // Check if already loading
        if (this.loading.has(filePath)) {
            await this.waitForLoad(filePath);
            return;
        }

        // Check cache first
        if (useCache && this.cache.has(filePath)) {
            element.innerHTML = this.cache.get(filePath);
            this.initializeScripts(element);
            return;
        }

        try {
            this.loading.add(filePath);
            
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.status}`);
            }

            const html = await response.text();
            
            // Cache the response
            if (useCache) {
                this.cache.set(filePath, html);
            }

            element.innerHTML = html;
            this.initializeScripts(element);

        } catch (error) {
            console.error(`Error loading include ${filePath}:`, error);
            element.innerHTML = `
                <div class="alert alert-error">
                    <span>Failed to load component: ${filePath}</span>
                </div>
            `;
        } finally {
            this.loading.delete(filePath);
        }
    }

    async waitForLoad(filePath) {
        while (this.loading.has(filePath)) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    initializeScripts(container) {
        // Execute any scripts in the loaded content
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    async loadAllIncludes() {
        const includeElements = document.querySelectorAll('[data-include]');
        const loadPromises = Array.from(includeElements).map(element => {
            const filePath = element.getAttribute('data-include');
            return this.loadInclude(element.id, filePath);
        });

        await Promise.all(loadPromises);
    }

    clearCache() {
        this.cache.clear();
    }

    // Load header and footer for all pages
    async loadCommonIncludes() {
        const headerElement = document.getElementById('header-placeholder');
        const footerElement = document.getElementById('footer-placeholder');

        const promises = [];
        
        if (headerElement) {
            promises.push(this.loadInclude('header-placeholder', '/includes/header.html'));
        }
        
        if (footerElement) {
            promises.push(this.loadInclude('footer-placeholder', '/includes/footer.html'));
        }

        await Promise.all(promises);

        // Trigger header update after loading
        if (typeof updateHeader === 'function') {
            updateHeader();
        }
    }
}

// Global include loader instance
const includeLoader = new IncludeLoader();

// Auto-load common includes when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    includeLoader.loadCommonIncludes();
});

// Make available globally
window.includeLoader = includeLoader;
