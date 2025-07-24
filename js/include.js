// HTML Include System for reusable components
class HTMLInclude {
    static async loadIncludes() {
        const includes = document.querySelectorAll('[data-include]');
        const promises = Array.from(includes).map(element => this.loadInclude(element));
        await Promise.all(promises);
    }

    static async loadInclude(element) {
        const includePath = element.dataset.include;
        try {
            const response = await fetch(`/includes/${includePath}.html`);
            if (response.ok) {
                const html = await response.text();
                element.outerHTML = html;
            } else {
                console.error(`Failed to load include: ${includePath}`);
            }
        } catch (error) {
            console.error(`Error loading include ${includePath}:`, error);
        }
    }

    static init() {
        // Load includes when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.loadIncludes());
        } else {
            this.loadIncludes();
        }
    }
}

// Initialize HTML includes
HTMLInclude.init();