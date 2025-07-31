// Include HTML functionality
class IncludeManager {
    static async loadIncludes() {
        const includes = document.querySelectorAll('[id$="-include"]');

        for (const element of includes) {
            const includeName = element.id.replace('-include', '');
            try {
                const response = await fetch(`/includes/${includeName}.html`);
                if (response.ok) {
                    const html = await response.text();
                    element.innerHTML = html;

                    // Initialize components after include
                    if (includeName === 'header') {
                        this.initHeaderComponents();
                    }
                }
            } catch (error) {
                console.error(`Failed to load include: ${includeName}`, error);
            }
        }
    }

    static initHeaderComponents() {
        // Re-initialize search after header is loaded
        SearchManager.init();
        MobileNav.init();

        // Update auth state in header
        AuthManager.updateUI(!!appState.authToken);
    }
}

// Auto-load includes when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    IncludeManager.loadIncludes();
});