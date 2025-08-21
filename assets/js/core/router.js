// Client-side Router
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.init();
    }

    // Initialize router
    init() {
        // Listen for back/forward navigation
        window.addEventListener('popstate', () => this.handleRouteChange());

        // Intercept link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.startsWith(window.location.origin)) {
                const url = new URL(link.href);
                if (url.pathname !== window.location.pathname) {
                    e.preventDefault();
                    this.navigate(url.pathname);
                }
            }
        });
    }

    // Register a route
    route(path, handler) {
        this.routes.set(path, handler);
        return this;
    }

    // Navigate to a path
    navigate(path, replace = false) {
        if (replace) {
            history.replaceState(null, '', path);
        } else {
            history.pushState(null, '', path);
        }
        this.handleRouteChange();
    }

    // Handle route changes
    handleRouteChange() {
        const path = window.location.pathname;

        // Check for username-based routes
        const userRouteMatch = path.match(/^\/([^\/]+)\/(profile|watchlist|favorites|settings|activity|subscription)$/);
        if (userRouteMatch) {
            const [, username, page] = userRouteMatch;
            this.handleUserRoute(username, page);
            return;
        }

        // Check registered routes
        const handler = this.routes.get(path);
        if (handler) {
            this.currentRoute = path;
            handler();
        }
    }

    // Handle user-specific routes
    handleUserRoute(username, page) {
        // Verify user is logged in and username matches
        if (!auth.isAuthenticated() || auth.getUsername() !== username) {
            this.navigate('/auth/login.html');
            return;
        }

        // Route to appropriate page
        const userPages = {
            'profile': '/user/profile.html',
            'watchlist': '/user/watchlist.html',
            'favorites': '/user/favorites.html',
            'settings': '/user/settings.html',
            'activity': '/user/activity.html',
            'subscription': '/user/subscription.html'
        };

        const targetPage = userPages[page];
        if (targetPage && window.location.pathname !== targetPage) {
            window.location.href = targetPage;
        }
    }

    // Get current route
    getCurrentRoute() {
        return this.currentRoute || window.location.pathname;
    }

    // Get route params
    getParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    // Update query params without navigation
    updateParams(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        history.replaceState(null, '', url.toString());
    }
}

// Create global router instance
const router = new Router();

// Common navigation helpers
function navigateToProfile() {
    const username = auth.getUsername();
    if (username) {
        router.navigate(`/${username}/profile`);
    } else {
        router.navigate('/auth/login.html');
    }
}

function navigateToWatchlist() {
    const username = auth.getUsername();
    if (username) {
        router.navigate(`/${username}/watchlist`);
    } else {
        router.navigate('/auth/login.html');
    }
}

function navigateToFavorites() {
    const username = auth.getUsername();
    if (username) {
        router.navigate(`/${username}/favorites`);
    } else {
        router.navigate('/auth/login.html');
    }
}

function navigateToSettings() {
    const username = auth.getUsername();
    if (username) {
        router.navigate(`/${username}/settings`);
    } else {
        router.navigate('/auth/login.html');
    }
}

function navigateToContentDetails(contentId) {
    router.navigate(`/content/details.html?id=${contentId}`);
}

function navigateToSearch(query = '') {
    const params = query ? `?query=${encodeURIComponent(query)}` : '';
    router.navigate(`/content/search.html${params}`);
}

function navigateToGenre(genre) {
    router.navigate(`/content/genre.html?genre=${encodeURIComponent(genre)}`);
}

function navigateToRegional(language) {
    router.navigate(`/content/regional.html?language=${encodeURIComponent(language)}`);
}