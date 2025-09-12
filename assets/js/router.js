// router.js - Client-side routing for SEO-friendly URLs
class CineBrainRouter {
    constructor() {
        this.routes = {
            '/': '/index.html',
            '/movie/:slug': '/content/details.html',
            '/tv/:slug': '/content/details.html',
            '/anime/:slug': '/content/details.html',
            '/browse/:category': '/browse/category.html',
            '/search': '/search.html',
            '/auth/login': '/auth/login.html',
            '/auth/signup': '/auth/signup.html',
            '/user/profile': '/user/profile.html',
            '/user/watchlist': '/user/watchlist.html'
        };

        this.init();
    }

    /**
     * Extract content ID from slug
     * @param {string} slug - URL slug like "avengers-endgame-123"
     * @returns {string|null} - Content ID
     */
    extractIdFromSlug(slug) {
        if (!slug) return null;

        // The ID is the last part after the final hyphen
        const parts = slug.split('-');
        const id = parts[parts.length - 1];

        // Validate that it's a number
        if (/^\d+$/.test(id)) {
            return id;
        }

        return null;
    }

    /**
     * Parse the current URL and extract parameters
     */
    parseUrl() {
        const path = window.location.pathname;
        const contentTypeMatch = path.match(/^\/(movie|tv|anime)\/(.+)$/);

        if (contentTypeMatch) {
            const contentType = contentTypeMatch[1];
            const slug = contentTypeMatch[2];
            const id = this.extractIdFromSlug(slug);

            return {
                type: 'content',
                contentType,
                slug,
                id
            };
        }

        const browseMatch = path.match(/^\/browse\/(.+)$/);
        if (browseMatch) {
            return {
                type: 'browse',
                category: browseMatch[1]
            };
        }

        return {
            type: 'page',
            path
        };
    }

    /**
     * Handle navigation for content details
     */
    handleContentNavigation() {
        const urlData = this.parseUrl();

        if (urlData.type === 'content' && urlData.id) {
            // Store the ID in sessionStorage for the details page to retrieve
            sessionStorage.setItem('cinebrain-content-id', urlData.id);
            sessionStorage.setItem('cinebrain-content-type', urlData.contentType);
            sessionStorage.setItem('cinebrain-content-slug', urlData.slug);

            // If we're not already on the details page, navigate to it
            if (!window.location.pathname.includes('/content/details.html')) {
                window.location.href = `/content/details.html?id=${urlData.id}`;
            }
        }
    }

    /**
     * Initialize the router
     */
    init() {
        // Handle initial load
        this.handleContentNavigation();

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.handleContentNavigation();
        });
    }

    /**
     * Navigate to a content page with SEO-friendly URL
     * @param {string} contentType - movie, tv, or anime
     * @param {string} title - Content title
     * @param {number} id - Content ID
     */
    static navigateToContent(contentType, title, id) {
        const slug = CineBrainRouter.generateSlug(title, id);
        const url = `/${contentType}/${slug}`;

        // Update the URL without reloading
        window.history.pushState({ id, contentType, title }, title, url);

        // Navigate to details page
        window.location.href = `/content/details.html?id=${id}`;
    }

    /**
     * Generate SEO-friendly slug
     */
    static generateSlug(title, id) {
        if (!title) return `content-${id}`;

        const slug = title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 60);

        return `${slug}-${id}`;
    }
}

// Initialize router
const cineBrainRouter = new CineBrainRouter();
window.cineBrainRouter = cineBrainRouter;