/**
 * CineBrain Mobile Navigation Component
 * Enhanced with Spotify-like interactions and theme support
 */

class MobileNavigation {
    constructor(config = {}) {
        // Configuration
        this.config = {
            apiBase: config.apiBase || 'https://backend-app-970m.onrender.com/api',
            enableHaptic: config.enableHaptic !== false,
            autoHideOnScroll: config.autoHideOnScroll !== false,
            swipeThreshold: config.swipeThreshold || 50,
            swipeVelocity: config.swipeVelocity || 0.3,
            ...config
        };

        // State
        this.state = {
            currentUser: null,
            isMenuOpen: false,
            watchlistCount: 0,
            currentPage: null,
            lastScrollY: 0,
            isNavHidden: false,
            isDragging: false,
            dragStartY: 0,
            dragCurrentY: 0,
            menuHeight: 0
        };

        // Cache DOM elements
        this.elements = {};

        // Touch tracking
        this.touchStartTime = 0;
        this.touchStartY = 0;

        // Initialize
        this.init();
    }

    /**
     * Initialize the mobile navigation
     */
    async init() {
        // Check if mobile
        if (!this.isMobile()) {
            console.log('Mobile navigation disabled on desktop');
            return;
        }

        // Cache elements
        this.cacheElements();

        // Get current user
        this.state.currentUser = this.getCurrentUser();

        // Setup navigation
        this.setupNavigation();

        // Load menu content
        this.loadMenuContent();

        // Setup event listeners
        this.setupEventListeners();

        // Detect current page
        this.detectCurrentPage();

        // Initialize theme
        this.detectAndApplyTheme();

        // Setup swipe gestures
        this.setupSwipeGestures();

        // Load user data if authenticated
        if (this.state.currentUser) {
            this.loadUserData();
        }

        if (this.config.autoHideOnScroll) {
            this.initScrollHide();
        }

        // Initialize Feather icons
        this.initIcons();

        // Add Spotify-like animations
        this.initSpotifyAnimations();

        // Dispatch ready event
        this.dispatchEvent('ready');
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            nav: document.getElementById('mobileBottomNav'),
            navContainer: document.getElementById('mobileNavContainer'),
            menuOverlay: document.getElementById('mobileMenuOverlay'),
            menuClose: document.getElementById('mobileMenuClose'),
            backdrop: document.getElementById('mobileBackdrop'),
            menuGrid: document.getElementById('mobileMenuGrid'),
            menuList: document.getElementById('mobileMenuList'),
            userSectionTitle: document.getElementById('userSectionTitle'),
            menuHandle: document.querySelector('.menu-handle')
        };
    }

    /**
     * Detect and apply current theme
     */
    detectAndApplyTheme() {
        // Check for either attribute (data-theme or data-bs-theme)
        const htmlElement = document.documentElement;
        const currentTheme = htmlElement.getAttribute('data-theme') ||
            htmlElement.getAttribute('data-bs-theme') ||
            localStorage.getItem('cinebrain-theme') ||
            'dark';

        // Apply theme to navigation
        this.applyTheme(currentTheme);

        // Listen for theme changes
        this.observeThemeChanges();
    }

    /**
     * Apply theme to navigation
     */
    applyTheme(theme) {
        // The CSS already handles this via [data-bs-theme] attribute
        // Just ensure icons are updated
        this.initIcons();

        // Dispatch theme change event
        this.dispatchEvent('themeChanged', { theme });
    }

    /**
     * Observe theme changes
     */
    observeThemeChanges() {
        // Watch for attribute changes on html element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'data-theme' ||
                        mutation.attributeName === 'data-bs-theme')) {
                    const newTheme = document.documentElement.getAttribute('data-theme') ||
                        document.documentElement.getAttribute('data-bs-theme') ||
                        'dark';
                    this.applyTheme(newTheme);
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme', 'data-bs-theme']
        });

        // Listen for custom theme change events from topbar
        window.addEventListener('themeChanged', (e) => {
            if (e.detail && e.detail.theme) {
                this.applyTheme(e.detail.theme);
            }
        });

        // Listen for storage events (theme changes from other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'cinebrain-theme') {
                const newTheme = e.newValue || 'dark';
                this.applyTheme(newTheme);
            }
        });
    }

    /**
     * Setup swipe gestures for menu
     */
    setupSwipeGestures() {
        if (!this.elements.menuOverlay) return;

        let startY = 0;
        let currentY = 0;
        let startTime = 0;

        // Touch start
        this.elements.menuOverlay.addEventListener('touchstart', (e) => {
            if (!this.state.isMenuOpen) return;

            startY = e.touches[0].clientY;
            startTime = Date.now();
            this.state.isDragging = false;

            // Store initial menu height
            this.state.menuHeight = this.elements.menuOverlay.offsetHeight;
        }, { passive: true });

        // Touch move
        this.elements.menuOverlay.addEventListener('touchmove', (e) => {
            if (!this.state.isMenuOpen) return;

            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            // Only allow dragging down
            if (deltaY > 0) {
                this.state.isDragging = true;
                this.elements.menuOverlay.classList.add('dragging');

                // Apply transform with resistance
                const resistance = 1 - (deltaY / (this.state.menuHeight * 2));
                const transform = deltaY * resistance;

                this.elements.menuOverlay.style.transform = `translateY(${Math.max(0, transform)}px)`;

                // Adjust backdrop opacity
                const opacity = 1 - (deltaY / this.state.menuHeight);
                this.elements.backdrop.style.opacity = Math.max(0, opacity);
            }
        }, { passive: true });

        // Touch end
        this.elements.menuOverlay.addEventListener('touchend', (e) => {
            if (!this.state.isMenuOpen || !this.state.isDragging) return;

            const deltaY = currentY - startY;
            const deltaTime = Date.now() - startTime;
            const velocity = deltaY / deltaTime;

            this.elements.menuOverlay.classList.remove('dragging');
            this.elements.menuOverlay.style.transform = '';
            this.elements.backdrop.style.opacity = '';

            // Close if swiped down enough or with enough velocity
            if (deltaY > this.config.swipeThreshold || velocity > this.config.swipeVelocity) {
                this.closeMenu();
                this.hapticFeedback('light');
            }

            this.state.isDragging = false;
        }, { passive: true });

        // Handle swipe on menu handle specifically
        if (this.elements.menuHandle) {
            this.elements.menuHandle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                startY = e.touches[0].clientY;
                startTime = Date.now();
            }, { passive: true });

            this.elements.menuHandle.addEventListener('touchmove', (e) => {
                e.stopPropagation();
                currentY = e.touches[0].clientY;
                const deltaY = currentY - startY;

                if (deltaY > 0) {
                    this.elements.menuOverlay.style.transform = `translateY(${deltaY}px)`;
                    const opacity = 1 - (deltaY / 300);
                    this.elements.backdrop.style.opacity = Math.max(0, opacity);
                }
            }, { passive: true });

            this.elements.menuHandle.addEventListener('touchend', (e) => {
                e.stopPropagation();
                const deltaY = currentY - startY;

                this.elements.menuOverlay.style.transform = '';
                this.elements.backdrop.style.opacity = '';

                if (deltaY > 100) {
                    this.closeMenu();
                    this.hapticFeedback('light');
                }
            }, { passive: true });
        }
    }

    /**
     * Initialize Spotify-like animations
     */
    initSpotifyAnimations() {
        // Add micro-interactions to nav items
        this.elements.navContainer?.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('touchstart', () => {
                this.hapticFeedback('light');
            });
        });

        // Add animations to menu items
        if (this.state.isMenuOpen) {
            this.animateMenuItems();
        }
    }

    /**
     * Animate menu items on open
     */
    animateMenuItems() {
        const items = this.elements.menuOverlay?.querySelectorAll('.mobile-menu-item, .mobile-menu-list-item');
        items?.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';

            setTimeout(() => {
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 30); // Stagger animation
        });
    }

    /**
     * Enhanced haptic feedback
     */
    hapticFeedback(type = 'light') {
        if (!this.config.enableHaptic || !('vibrate' in navigator)) return;

        const patterns = {
            light: 10,
            medium: 20,
            heavy: 30,
            success: [10, 50, 10],
            warning: [30, 50, 30],
            error: [50, 100, 50],
            spotify: [5, 10, 5] // Quick double tap
        };

        navigator.vibrate(patterns[type] || patterns.light);
    }

    /**
     * Check if device is mobile
     */
    isMobile() {
        return window.innerWidth <= 768;
    }

    /**
     * Get current user from localStorage
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('cinebrain-user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('Error parsing user data:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Setup navigation items
     */
    setupNavigation() {
        const isAuthenticated = !!this.state.currentUser;
        const isAdmin = this.state.currentUser?.is_admin;

        let navItems = [
            { id: 'home', label: 'Home', icon: 'home', route: '/index.html' },
            { id: 'trending', label: 'Trending', icon: 'trending-up', route: '/content/trending.html' },
            { id: 'discover', label: 'Discover', icon: 'compass', route: '/content/discover.html' }
        ];

        if (isAuthenticated) {
            navItems.push({
                id: 'watchlist',
                label: 'Watchlist',
                icon: 'bookmark',
                route: '/user/watchlist.html',
                badge: true
            });

            if (isAdmin) {
                navItems.push({
                    id: 'admin',
                    label: 'Admin',
                    icon: 'shield',
                    route: '/admin/dashboard.html'
                });
            } else {
                navItems.push({
                    id: 'profile',
                    label: 'Profile',
                    icon: 'user',
                    route: `/user/${this.state.currentUser.username}/profile.html`
                });
            }
        } else {
            navItems.push(
                { id: 'anime', label: 'Anime', icon: 'tv', route: '/content/anime.html' },
                { id: 'more', label: 'More', icon: 'grid', action: 'openMenu' }
            );
        }

        // Always add more menu for authenticated users
        if (isAuthenticated && navItems.length === 4) {
            navItems[4] = { id: 'more', label: 'More', icon: 'grid', action: 'openMenu' };
        }

        // Render navigation with Spotify-style animations
        this.elements.navContainer.innerHTML = navItems.map((item, index) => `
            <button class="mobile-nav-item" 
                    data-nav="${item.id}"
                    data-route="${item.route || ''}"
                    data-action="${item.action || ''}"
                    aria-label="${item.label}"
                    role="button"
                    style="animation-delay: ${index * 50}ms">
                ${item.badge && this.state.watchlistCount > 0 ? `
                    <span class="mobile-nav-badge">${this.formatBadgeCount(this.state.watchlistCount)}</span>
                ` : ''}
                <i data-feather="${item.icon}" class="mobile-nav-icon"></i>
                <span class="mobile-nav-label">${item.label}</span>
            </button>
        `).join('');
    }

    loadMenuContent() {
        const isAuthenticated = !!this.state.currentUser;

        // Add class to menu overlay based on auth state
        if (this.elements.menuOverlay) {
            if (isAuthenticated) {
                this.elements.menuOverlay.classList.add('authenticated');
                this.elements.menuOverlay.classList.remove('non-authenticated');
            } else {
                this.elements.menuOverlay.classList.add('non-authenticated');
                this.elements.menuOverlay.classList.remove('authenticated');
            }
        }

        // Grid items with clean, professional design
        const gridItems = [
            { icon: 'film', label: 'Movies', route: '/content/movies.html' },
            { icon: 'tv', label: 'Shows', route: '/content/tv-shows.html' },
            { icon: 'play-circle', label: 'Anime', route: '/content/anime.html' },
            { icon: 'star', label: 'Top Rated', route: '/content/top-rated.html' },
            { icon: 'clock', label: 'New', route: '/content/new-releases.html' },
            { icon: 'globe', label: 'Regional', route: '/content/regional.html' },
            { icon: 'heart', label: 'Favorites', route: '/user/favorites.html' },
            { icon: 'activity', label: 'Activity', route: '/user/activity.html' }
        ];

        // Render clean circular icons for all users
        this.elements.menuGrid.innerHTML = gridItems.map(item => `
        <a href="${item.route}" class="mobile-menu-item">
            <i data-feather="${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');

        // Rest of the method remains the same...
        // List items
        const listItems = this.getMenuListItems();

        this.elements.menuList.innerHTML = listItems.map(item => {
            if (item.divider) {
                return '<div class="menu-list-divider"></div>';
            }

            const element = item.action ? 'button' : 'a';
            const actionAttr = item.action ? `onclick="mobileNav.${item.action}()"` : '';
            const hrefAttr = item.route ? `href="${item.route}"` : '';

            return `
            <${element} class="mobile-menu-list-item" ${actionAttr} ${hrefAttr}>
                <div class="mobile-menu-list-icon">
                    <i data-feather="${item.icon}"></i>
                </div>
                <div class="mobile-menu-list-content">
                    <h4>${item.title}</h4>
                    <p>${item.subtitle}</p>
                </div>
            </${element}>
        `;
        }).join('');

        // Update section title
        if (this.state.currentUser) {
            this.elements.userSectionTitle.textContent = `Hey ${this.state.currentUser.username}!`;
        } else {
            this.elements.userSectionTitle.textContent = 'Quick Access';
        }

        // Initialize icons after content is loaded
        this.initIcons();
    }

    /**
     * Get menu list items based on user state
     */
    getMenuListItems() {
        if (this.state.currentUser) {
            const items = [
                {
                    icon: 'user',
                    title: 'Your Profile',
                    subtitle: 'View and edit your profile',
                    route: `/user/${this.state.currentUser.username}/profile.html`
                },
                {
                    icon: 'settings',
                    title: 'Settings',
                    subtitle: 'Preferences and privacy',
                    route: '/user/settings.html'
                },
                {
                    icon: 'download',
                    title: 'Downloads',
                    subtitle: 'Watch offline',
                    route: '/user/downloads.html'
                }
            ];

            if (this.state.currentUser.is_admin) {
                items.push({
                    icon: 'shield',
                    title: 'Admin Panel',
                    subtitle: 'Manage CineBrain',
                    route: '/admin/dashboard.html'
                });
            }

            items.push(
                { divider: true },
                {
                    icon: 'help-circle',
                    title: 'Help',
                    subtitle: 'Get support',
                    route: '/help.html'
                },
                {
                    icon: 'log-out',
                    title: 'Log Out',
                    subtitle: `Signed in as ${this.state.currentUser.username}`,
                    action: 'logout'
                }
            );

            return items;
        } else {
            return [
                {
                    icon: 'log-in',
                    title: 'Log In',
                    subtitle: 'Access your account',
                    route: '/auth/login.html'
                },
                {
                    icon: 'user-plus',
                    title: 'Sign Up',
                    subtitle: 'Create new account',
                    route: '/auth/register.html'
                },
                { divider: true },
                {
                    icon: 'help-circle',
                    title: 'Help',
                    subtitle: 'Get support',
                    route: '/help.html'
                }
            ];
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation clicks with haptic feedback
        this.elements.navContainer.addEventListener('click', (e) => {
            const navItem = e.target.closest('.mobile-nav-item');
            if (!navItem) return;

            const action = navItem.dataset.action;
            const route = navItem.dataset.route;

            this.hapticFeedback('spotify');

            if (action) {
                this[action]?.();
            } else if (route) {
                this.navigate(route);
            }
        });

        // Menu close button
        this.elements.menuClose?.addEventListener('click', () => {
            this.hapticFeedback('light');
            this.closeMenu();
        });

        // Backdrop click
        this.elements.backdrop?.addEventListener('click', () => {
            this.closeMenu();
        });

        // Handle resize
        window.addEventListener('resize', () => {
            if (!this.isMobile()) {
                this.destroy();
            }
        });

        // Listen for storage events (theme changes from other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'theme') {
                this.detectAndApplyTheme();
            }
        });
    }

    /**
     * Initialize scroll hide
     */
    initScrollHide() {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;

                    if (currentScrollY > this.state.lastScrollY && currentScrollY > 100) {
                        // Scrolling down
                        this.hideNav();
                    } else {
                        // Scrolling up
                        this.showNav();
                    }

                    this.state.lastScrollY = currentScrollY;
                    ticking = false;
                });

                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    /**
     * Initialize icons
     */
    initIcons() {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    /**
     * Detect current page
     */
    detectCurrentPage() {
        const currentPath = window.location.pathname;

        this.elements.navContainer.querySelectorAll('.mobile-nav-item').forEach(item => {
            const route = item.dataset.route;
            if (route && currentPath.includes(route)) {
                item.classList.add('active');
                this.state.currentPage = item.dataset.nav;
            }
        });
    }

    /**
     * Load user data
     */
    async loadUserData() {
        try {
            const token = localStorage.getItem('cinebrain-token');
            if (!token) return;

            // Try cache first
            const cachedCount = sessionStorage.getItem('cinebrain-watchlist-count');
            if (cachedCount) {
                this.state.watchlistCount = parseInt(cachedCount);
                this.updateWatchlistBadge();
            }

            // Fetch fresh data
            const response = await fetch(`${this.config.apiBase}/user/watchlist`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.state.watchlistCount = data.watchlist?.length || 0;
                sessionStorage.setItem('cinebrain-watchlist-count', this.state.watchlistCount);
                this.updateWatchlistBadge();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    /**
     * Update watchlist badge
     */
    updateWatchlistBadge() {
        const watchlistItem = this.elements.navContainer.querySelector('[data-nav="watchlist"]');
        if (!watchlistItem) return;

        let badge = watchlistItem.querySelector('.mobile-nav-badge');

        if (this.state.watchlistCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'mobile-nav-badge';
                watchlistItem.insertBefore(badge, watchlistItem.firstChild);
            }
            badge.textContent = this.formatBadgeCount(this.state.watchlistCount);
        } else if (badge) {
            badge.remove();
        }
    }

    /**
     * Format badge count
     */
    formatBadgeCount(count) {
        return count > 99 ? '99+' : count.toString();
    }

    /**
     * Navigate to route
     */
    navigate(route) {
        // Add loading state
        const activeItem = this.elements.navContainer.querySelector(`[data-route="${route}"]`);
        if (activeItem) {
            activeItem.classList.add('loading');
        }

        // Navigate after small delay for feedback
        setTimeout(() => {
            window.location.href = route;
        }, 100);
    }

    /**
     * Open menu with Spotify-style animation
     */
    openMenu() {
        this.state.isMenuOpen = true;
        this.elements.menuOverlay.classList.add('show');
        this.elements.backdrop.classList.add('show');
        this.elements.menuOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        this.hapticFeedback('spotify');
        this.animateMenuItems();
        this.initIcons();

        this.dispatchEvent('menuOpen');
    }

    /**
     * Close menu
     */
    closeMenu() {
        this.state.isMenuOpen = false;
        this.elements.menuOverlay.classList.remove('show');
        this.elements.backdrop.classList.remove('show');
        this.elements.menuOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        this.dispatchEvent('menuClose');
    }

    /**
     * Hide navigation
     */
    hideNav() {
        if (this.state.isNavHidden || this.state.isMenuOpen) return;

        this.state.isNavHidden = true;
        this.elements.nav.classList.add('hidden');
    }

    /**
     * Show navigation
     */
    showNav() {
        if (!this.state.isNavHidden) return;

        this.state.isNavHidden = false;
        this.elements.nav.classList.remove('hidden');
    }

    /**
     * Logout
     */
    logout() {
        localStorage.removeItem('cinebrain-token');
        localStorage.removeItem('cinebrain-user');
        sessionStorage.clear();

        this.hapticFeedback('medium');

        setTimeout(() => {
            window.location.href = '/auth/login.html';
        }, 200);
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        window.dispatchEvent(new CustomEvent(`mobileNav:${eventName}`, { detail }));
    }

    /**
     * Destroy component
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);

        // Remove DOM elements
        this.elements.nav?.remove();
        this.elements.menuOverlay?.remove();
        this.elements.backdrop?.remove();

        // Clear state
        this.state = {};

        // Remove body padding
        document.body.style.paddingBottom = '';

        this.dispatchEvent('destroyed');
    }
}

// Initialize mobile navigation
const mobileNav = new MobileNavigation({
    enableHaptic: true,
    autoHideOnScroll: true,
    swipeThreshold: 50,
    swipeVelocity: 0.3
});

// Make it globally available
window.mobileNav = mobileNav;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileNavigation;
}