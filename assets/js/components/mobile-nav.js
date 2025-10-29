class MobileNavigation {
    constructor(config = {}) {
        this.config = {
            apiBase: config.apiBase || window.CineBrainConfig.apiBase,
            enableHaptic: config.enableHaptic !== false,
            swipeThreshold: config.swipeThreshold || 50,
            swipeVelocity: config.swipeVelocity || 0.3,
            ...config

        };

        this.state = {
            currentUser: null,
            isMenuOpen: false,
            watchlistCount: 0,
            currentPage: null,
            isDragging: false,
            dragStartY: 0,
            dragCurrentY: 0,
            menuHeight: 0,
            scrollPosition: 0
        };

        this.elements = {};
        this.touchStartTime = 0;
        this.touchStartY = 0;

        if (window.themeManager) {
            window.themeManager.register((theme) => this.onThemeChange(theme));
        }

        this.init();
    }

    async init() {
        if (!this.isMobile()) {
            console.log('Mobile navigation disabled on desktop');
            return;
        }

        this.cacheElements();
        this.state.currentUser = this.getCurrentUser();
        this.setupNavigation();

        setTimeout(() => {
            this.detectCurrentPage();
        }, 0);

        this.loadMenuContent();
        this.setupEventListeners();
        this.detectAndApplyTheme();
        this.setupSwipeGestures();

        if (this.state.currentUser) {
            this.loadUserData();
        }

        this.initIcons();
        this.initSpotifyAnimations();
        this.dispatchEvent('ready');
    }

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

    onThemeChange(theme) {
        this.updateThemeUI(theme);
    }

    updateThemeUI(theme) {
        this.initIcons();
        this.dispatchEvent('themeChanged', { theme });
    }

    detectAndApplyTheme() {
        if (window.themeManager) {
            const theme = window.themeManager.getCurrentTheme();
            this.updateThemeUI(theme);
        } else {
            const htmlElement = document.documentElement;
            const currentTheme = htmlElement.getAttribute('data-theme') ||
                htmlElement.getAttribute('data-bs-theme') ||
                localStorage.getItem('cinebrain-theme') ||
                'dark';
            this.applyTheme(currentTheme);
            this.observeThemeChanges();
        }
    }

    applyTheme(theme) {
        this.initIcons();
        this.dispatchEvent('themeChanged', { theme });
    }

    observeThemeChanges() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'cinebrain-theme' && window.themeManager) {
                window.themeManager.applyTheme(e.newValue || 'dark');
            }
        });
    }

    setupSwipeGestures() {
        if (!this.elements.menuOverlay) return;

        let startY = 0;
        let currentY = 0;
        let startTime = 0;
        let isSwipeValid = false;

        this.elements.menuOverlay.addEventListener('touchstart', (e) => {
            if (!this.state.isMenuOpen) return;

            startY = e.touches[0].clientY;
            currentY = startY;
            startTime = Date.now();
            this.state.isDragging = false;
            isSwipeValid = false;

            const rect = this.elements.menuOverlay.getBoundingClientRect();
            if (startY - rect.top < 100) {
                isSwipeValid = true;
            }

            this.state.menuHeight = this.elements.menuOverlay.offsetHeight;
        }, { passive: true });

        this.elements.menuOverlay.addEventListener('touchmove', (e) => {
            if (!this.state.isMenuOpen) return;

            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            if (isSwipeValid && deltaY > 0) {
                e.preventDefault();
                e.stopPropagation();

                this.state.isDragging = true;
                this.elements.menuOverlay.classList.add('dragging');

                const resistance = 1 - (deltaY / (this.state.menuHeight * 2));
                const transform = deltaY * resistance;

                this.elements.menuOverlay.style.transform = `translateY(${Math.max(0, transform)}px)`;

                const opacity = 1 - (deltaY / this.state.menuHeight);
                this.elements.backdrop.style.opacity = Math.max(0, opacity);
            }
        }, { passive: false });

        this.elements.menuOverlay.addEventListener('touchend', (e) => {
            if (!this.state.isMenuOpen || !this.state.isDragging) return;

            const deltaY = currentY - startY;
            const deltaTime = Date.now() - startTime;
            const velocity = deltaY / deltaTime;

            this.elements.menuOverlay.classList.remove('dragging');
            this.elements.menuOverlay.style.transform = '';
            this.elements.backdrop.style.opacity = '';

            if (deltaY > this.config.swipeThreshold || velocity > this.config.swipeVelocity) {
                this.closeMenu();
                this.hapticFeedback('light');
            }

            this.state.isDragging = false;
            isSwipeValid = false;
        }, { passive: true });

        if (this.elements.menuHandle) {
            let handleStartY = 0;
            let handleCurrentY = 0;

            this.elements.menuHandle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                handleStartY = e.touches[0].clientY;
                handleCurrentY = handleStartY;
                startTime = Date.now();
                this.state.isDragging = true;
            }, { passive: true });

            this.elements.menuHandle.addEventListener('touchmove', (e) => {
                if (!this.state.isMenuOpen) return;

                e.preventDefault();
                e.stopPropagation();

                handleCurrentY = e.touches[0].clientY;
                const deltaY = handleCurrentY - handleStartY;

                if (deltaY > 0) {
                    this.elements.menuOverlay.classList.add('dragging');
                    this.elements.menuOverlay.style.transform = `translateY(${deltaY}px)`;
                    const opacity = 1 - (deltaY / 300);
                    this.elements.backdrop.style.opacity = Math.max(0, opacity);
                }
            }, { passive: false });

            this.elements.menuHandle.addEventListener('touchend', (e) => {
                e.stopPropagation();
                const deltaY = handleCurrentY - handleStartY;

                this.elements.menuOverlay.classList.remove('dragging');
                this.elements.menuOverlay.style.transform = '';
                this.elements.backdrop.style.opacity = '';

                if (deltaY > 100) {
                    this.closeMenu();
                    this.hapticFeedback('light');
                }

                this.state.isDragging = false;
            }, { passive: true });
        }

        this.elements.backdrop?.addEventListener('touchmove', (e) => {
            if (this.state.isMenuOpen) {
                e.preventDefault();
            }
        }, { passive: false });

        const menuContent = this.elements.menuOverlay?.querySelector('.menu-section');
        if (menuContent) {
            let scrollStartY = 0;
            let scrollTop = 0;

            menuContent.addEventListener('touchstart', (e) => {
                scrollStartY = e.touches[0].clientY;
                scrollTop = menuContent.scrollTop;
            }, { passive: true });

            menuContent.addEventListener('touchmove', (e) => {
                if (!this.state.isMenuOpen) return;

                const currentY = e.touches[0].clientY;
                const deltaY = currentY - scrollStartY;

                if ((scrollTop === 0 && deltaY > 0) ||
                    (scrollTop >= menuContent.scrollHeight - menuContent.clientHeight && deltaY < 0)) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    }

    initSpotifyAnimations() {
        this.elements.navContainer?.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('touchstart', () => {
                this.hapticFeedback('light');
            });
        });

        if (this.state.isMenuOpen) {
            this.animateMenuItems();
        }
    }

    animateMenuItems() {
        const items = this.elements.menuOverlay?.querySelectorAll('.mobile-menu-item, .mobile-menu-list-item');
        items?.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';

            setTimeout(() => {
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 30);
        });
    }

    hapticFeedback(type = 'light') {
        if (!this.config.enableHaptic || !('vibrate' in navigator)) return;

        const patterns = {
            light: 10,
            medium: 20,
            heavy: 30,
            success: [10, 50, 10],
            warning: [30, 50, 30],
            error: [50, 100, 50],
            spotify: [5, 10, 5]
        };

        navigator.vibrate(patterns[type] || patterns.light);
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

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

    setupNavigation() {
        const isAuthenticated = !!this.state.currentUser;
        const isAdmin = this.state.currentUser?.is_admin;

        let currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath === '') {
            currentPath = '/index.html';
        }

        let navItems = [
            { id: 'home', label: 'Home', icon: 'home', route: '/index.html' },
            { id: 'trending', label: 'Trending', icon: 'trending-up', route: '/explore/trending.html' },
            { id: 'discover', label: 'Discover', icon: 'compass', route: '/explore/movies.html' }
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
                    route: '/admin/index.html'
                });
            } else {
                navItems.push({
                    id: 'profile',
                    label: 'Profile',
                    icon: 'user',
                    route: '/user/profile.html'
                });
            }
        } else {
            navItems.push(
                { id: 'anime', label: 'Anime', icon: 'tv', route: '/explore/anime.html' },
                { id: 'more', label: 'More', icon: 'grid', action: 'openMenu' }
            );
        }

        if (isAuthenticated && navItems.length === 4) {
            navItems[4] = { id: 'more', label: 'More', icon: 'grid', action: 'openMenu' };
        }

        this.elements.navContainer.innerHTML = navItems.map((item, index) => {
            let isActive = false;
            if (item.route) {
                const normalizedRoute = item.route === '/' ? '/index.html' : item.route;
                isActive = normalizedRoute === currentPath;

                if (!isActive) {
                    if (item.id === 'home' && (currentPath === '/' || currentPath === '/index.html')) {
                        isActive = true;
                    } else if (item.id === 'discover' && currentPath.includes('/explore/') &&
                        !currentPath.includes('trending') && !currentPath.includes('anime')) {
                        isActive = true;
                    }
                }
            }

            return `
                <button class="mobile-nav-item ${isActive ? 'active' : ''}" 
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
            `;
        }).join('');

        const activeItem = this.elements.navContainer.querySelector('.mobile-nav-item.active');
        if (activeItem) {
            this.state.currentPage = activeItem.dataset.nav;
        }
    }

    loadMenuContent() {
        const isAuthenticated = !!this.state.currentUser;

        if (this.elements.menuOverlay) {
            if (isAuthenticated) {
                this.elements.menuOverlay.classList.add('authenticated');
                this.elements.menuOverlay.classList.remove('non-authenticated');
            } else {
                this.elements.menuOverlay.classList.add('non-authenticated');
                this.elements.menuOverlay.classList.remove('authenticated');
            }
        }

        const gridItems = [
            { icon: 'film', label: 'Movies', route: '/explore/movies.html' },
            { icon: 'tv', label: 'Shows', route: '/explore/tv-shows.html' },
            { icon: 'play-circle', label: 'Anime', route: '/explore/anime.html' },
            { icon: 'star', label: 'Top Rated', route: '/explore/top-rated.html' },
            { icon: 'clock', label: 'New', route: '/explore/new-releases.html' },
            { icon: 'globe', label: 'Regional', route: '/explore/regional.html' },
            { icon: 'heart', label: 'Favorites', route: '/user/favorites.html' },
            { icon: 'activity', label: 'Activity', route: '/user/activity.html' }
        ];

        this.elements.menuGrid.innerHTML = gridItems.map(item => `
            <a href="${item.route}" class="mobile-menu-item">
                <i data-feather="${item.icon}"></i>
                <span>${item.label}</span>
            </a>
        `).join('');

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

        if (this.state.currentUser) {
            this.elements.userSectionTitle.textContent = `Hey ${this.state.currentUser.username}!`;
        } else {
            this.elements.userSectionTitle.textContent = 'Quick Access';
        }

        this.initIcons();
    }

    getMenuListItems() {
        if (this.state.currentUser) {
            const items = [
                {
                    icon: 'user',
                    title: 'Your Profile',
                    subtitle: 'View and edit your profile',
                    route: '/user/profile.html'
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
                    route: '/admin/index.html'
                });
            }

            items.push(
                { divider: true },
                {
                    icon: 'help-circle',
                    title: 'Help',
                    subtitle: 'Get support',
                    route: '/support/help-center.html'
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
                    route: '/support/help-center.html'
                }
            ];
        }
    }

    setupEventListeners() {
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

        this.elements.menuClose?.addEventListener('click', () => {
            this.hapticFeedback('light');
            this.closeMenu();
        });

        this.elements.backdrop?.addEventListener('click', () => {
            this.closeMenu();
        });

        window.addEventListener('resize', () => {
            if (!this.isMobile()) {
                this.destroy();
            }
        });

        window.addEventListener('popstate', (e) => {
            if (this.state.isMenuOpen) {
                e.preventDefault();
                this.closeMenu();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.detectCurrentPage();
            }
        });

        window.addEventListener('focus', () => {
            this.detectCurrentPage();
        });

        window.addEventListener('pageshow', () => {
            this.detectCurrentPage();
        });

        window.addEventListener('storage', (e) => {
            if (e.key === 'cinebrain-token') {
                this.state.currentUser = this.getCurrentUser();
                this.setupNavigation();
                this.loadMenuContent();
                if (this.state.currentUser) {
                    this.loadUserData();
                }
            }
        });

        window.addEventListener('userLoggedIn', () => {
            this.state.currentUser = this.getCurrentUser();
            this.setupNavigation();
            this.loadMenuContent();
            this.loadUserData();
        });

        window.addEventListener('userLoggedOut', () => {
            this.state.currentUser = null;
            this.state.watchlistCount = 0;
            this.setupNavigation();
            this.loadMenuContent();
        });
    }

    initIcons() {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    detectCurrentPage() {
        let currentPath = window.location.pathname;

        if (currentPath.length > 1 && currentPath.endsWith('/')) {
            currentPath = currentPath.slice(0, -1);
        }

        if (currentPath === '/' || currentPath === '') {
            currentPath = '/index.html';
        }

        this.elements.navContainer.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        this.elements.navContainer.querySelectorAll('.mobile-nav-item').forEach(item => {
            const route = item.dataset.route;
            if (!route) return;

            let normalizedRoute = route;
            if (normalizedRoute === '/') {
                normalizedRoute = '/index.html';
            }

            let isActive = false;

            if (normalizedRoute === currentPath) {
                isActive = true;
            } else if (normalizedRoute === '/index.html' && (currentPath === '/' || currentPath === '')) {
                isActive = true;
            } else if (normalizedRoute.includes('/explore/') && currentPath.includes('/explore/')) {
                const routeBaseName = normalizedRoute.split('/').pop().split('.')[0];
                const pathBaseName = currentPath.split('/').pop().split('.')[0];
                isActive = routeBaseName === pathBaseName;
            } else if (normalizedRoute.includes('/user/') && currentPath.includes('/user/')) {
                const routeSection = normalizedRoute.split('/')[2]?.split('.')[0];
                const pathSection = currentPath.split('/')[2]?.split('.')[0];
                isActive = routeSection === pathSection;
            } else if (normalizedRoute.includes('/admin/') && currentPath.includes('/admin/')) {
                const routeSection = normalizedRoute.split('/')[2]?.split('.')[0];
                const pathSection = currentPath.split('/')[2]?.split('.')[0];
                isActive = routeSection === pathSection;
            }

            if (isActive) {
                item.classList.add('active');
                this.state.currentPage = item.dataset.nav;
                console.log(`Active nav item: ${item.dataset.nav} for path: ${currentPath}`);
            }
        });

        if (!this.state.currentPage) {
            this.detectCurrentPageByContent();
        }
    }

    detectCurrentPageByContent() {
        const currentPath = window.location.pathname.toLowerCase();

        const pathMapping = {
            'trending': 'trending',
            'discover': 'discover',
            'anime': 'anime',
            'watchlist': 'watchlist',
            'profile': 'profile',
            'admin': 'admin',
            'movies': 'discover',
            'tv-shows': 'discover',
            'top-rated': 'discover',
            'new-releases': 'discover',
            'regional': 'discover',
            'genre': 'discover',
            'details': 'discover'
        };

        for (const [pathKeyword, navId] of Object.entries(pathMapping)) {
            if (currentPath.includes(pathKeyword)) {
                const navItem = this.elements.navContainer.querySelector(`[data-nav="${navId}"]`);
                if (navItem) {
                    this.elements.navContainer.querySelectorAll('.mobile-nav-item').forEach(item => {
                        item.classList.remove('active');
                    });

                    navItem.classList.add('active');
                    this.state.currentPage = navId;

                    console.log(`Fallback active nav: ${navId} for path: ${currentPath}`);
                    break;
                }
            }
        }

        if (!this.state.currentPage) {
            const homeItem = this.elements.navContainer.querySelector('[data-nav="home"]');
            if (homeItem) {
                homeItem.classList.add('active');
                this.state.currentPage = 'home';
            }
        }
    }

    async loadUserData() {
        try {
            const token = localStorage.getItem('cinebrain-token');
            if (!token) return;

            const cachedCount = sessionStorage.getItem('cinebrain-watchlist-count');
            if (cachedCount) {
                this.state.watchlistCount = parseInt(cachedCount);
                this.updateWatchlistBadge();
            }

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
            } else if (response.status === 401) {
                localStorage.removeItem('cinebrain-token');
                localStorage.removeItem('cinebrain-user');
                this.state.currentUser = null;
                this.setupNavigation();
                this.loadMenuContent();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

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

    formatBadgeCount(count) {
        return count > 99 ? '99+' : count.toString();
    }

    navigate(route) {
        const activeItem = this.elements.navContainer.querySelector(`[data-route="${route}"]`);
        if (activeItem) {
            activeItem.classList.add('loading');
        }

        setTimeout(() => {
            window.location.href = route;
        }, 100);
    }

    openMenu() {
        this.state.isMenuOpen = true;
        this.elements.menuOverlay.classList.add('show');
        this.elements.backdrop.classList.add('show');
        this.elements.menuOverlay.setAttribute('aria-hidden', 'false');

        this.state.scrollPosition = window.scrollY;
        document.body.classList.add('menu-open');
        document.body.style.top = `-${this.state.scrollPosition}px`;

        this.hapticFeedback('spotify');
        this.animateMenuItems();
        this.initIcons();

        if (window.history && window.history.pushState) {
            window.history.pushState({ menuOpen: true }, '');
        }

        this.dispatchEvent('menuOpen');
    }

    closeMenu() {
        if (!this.state.isMenuOpen) return;

        this.state.isMenuOpen = false;
        this.elements.menuOverlay.classList.remove('show');
        this.elements.backdrop.classList.remove('show');
        this.elements.menuOverlay.setAttribute('aria-hidden', 'true');

        document.body.classList.remove('menu-open');
        document.body.style.top = '';

        if (this.state.scrollPosition !== undefined) {
            window.scrollTo(0, this.state.scrollPosition);
            this.state.scrollPosition = 0;
        }

        this.dispatchEvent('menuClose');
    }

    logout() {
        const confirmDialog = document.createElement('div');
        confirmDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
            padding: 16px;
            padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
        `;

        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: var(--menu-bg, #121212);
            border-radius: clamp(16px, 4vw, 24px);
            padding: clamp(20px, 5vw, 32px);
            width: min(90vw, 400px);
            max-width: calc(100vw - 32px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: scaleIn 0.2s ease;
            text-align: center;
            position: relative;
            margin: auto;
        `;

        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const isLandscape = vw > vh;

        dialogBox.innerHTML = `
            <div class="m-dialog-content-wrapper" style="margin-bottom: clamp(12px, 3vh, 24px);">
                <div class="m-dialog-icon-section" style="${(isLandscape && vh < 400) ? 'display: none;' : ''}">
                    <div class="m-dialog-icon-wrapper" style="
                        width: clamp(44px, 13vmin, 72px);
                        height: clamp(44px, 13vmin, 72px);
                        margin: 0 auto clamp(8px, 2vh, 20px);
                        background: linear-gradient(135deg, var(--cinebrain-red, #E50914), var(--cinebrain-purple, #8B5CF6));
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        box-shadow: 0 4px 20px rgba(229, 9, 20, 0.3);
                    ">
                        <i data-feather="log-out" class="m-dialog-icon" style="
                            width: clamp(22px, 6.5vmin, 36px);
                            height: clamp(22px, 6.5vmin, 36px);
                            stroke: white;
                            stroke-width: 2.5;
                        "></i>
                    </div>
                </div>
                
                <h3 class="m-dialog-title" style="
                    margin: 0 0 clamp(4px, 1vh, 10px) 0;
                    color: var(--menu-text, #ffffff);
                    font-size: clamp(15px, 4.5vmin, 20px);
                    font-weight: 600;
                    line-height: 1.3;
                ">Sign Out?</h3>
                
                <p class="m-dialog-text" style="
                    margin: 0;
                    color: var(--menu-text-secondary, rgba(255,255,255,0.6));
                    font-size: clamp(12px, 3.5vmin, 16px);
                    line-height: 1.5;
                    padding: 0 clamp(4px, 1vw, 16px);
                    opacity: 0.9;
                ">
                    Are you sure you want to sign out?
                </p>
            </div>
            
            <div style="
                display: flex;
                gap: clamp(8px, 2vmin, 12px);
                justify-content: center;
                flex-wrap: nowrap;
            ">
                <button id="cancelLogout" class="m-dialog-button" style="
                    flex: 1;
                    min-width: 0;
                    max-width: clamp(120px, 35vw, 160px);
                    padding: clamp(8px, 2.5vmin, 14px) clamp(12px, 4vmin, 28px);
                    background: var(--menu-item-bg, rgba(255,255,255,0.05));
                    color: var(--menu-text, #ffffff);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: clamp(8px, 2vmin, 12px);
                    cursor: pointer;
                    font-weight: 600;
                    font-size: clamp(12px, 3.5vmin, 16px);
                    transition: all 0.2s;
                    min-height: clamp(36px, 10vmin, 48px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: nowrap;
                    -webkit-tap-highlight-color: transparent;
                    user-select: none;
                ">Cancel</button>
                
                <button id="confirmLogout" class="m-dialog-button" style="
                    flex: 1;
                    min-width: 0;
                    max-width: clamp(120px, 35vw, 160px);
                    padding: clamp(8px, 2.5vmin, 14px) clamp(12px, 4vmin, 28px);
                    background: linear-gradient(135deg, var(--cinebrain-red, #E50914), var(--cinebrain-purple, #8B5CF6));
                    color: white;
                    border: none;
                    border-radius: clamp(8px, 2vmin, 12px);
                    cursor: pointer;
                    font-weight: 600;
                    font-size: clamp(12px, 3.5vmin, 16px);
                    transition: all 0.2s;
                    min-height: clamp(36px, 10vmin, 48px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: nowrap;
                    position: relative;
                    overflow: hidden;
                    -webkit-tap-highlight-color: transparent;
                    user-select: none;
                    box-shadow: 0 2px 10px rgba(229, 9, 20, 0.3);
                ">Sign Out</button>
            </div>
        `;

        confirmDialog.appendChild(dialogBox);
        document.body.appendChild(confirmDialog);

        if (!document.getElementById('m-dialog-animations')) {
            const style = document.createElement('style');
            style.id = 'm-dialog-animations';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { 
                        transform: scale(0.95) translateY(10px); 
                        opacity: 0; 
                    }
                    to { 
                        transform: scale(1) translateY(0); 
                        opacity: 1; 
                    }
                }
                
                .m-dialog-button:active {
                    transform: scale(0.97);
                }
                
                #cancelLogout:active {
                    background: rgba(255, 255, 255, 0.08) !important;
                }
                
                #confirmLogout:active {
                    filter: brightness(1.1);
                    box-shadow: 0 4px 15px rgba(229, 9, 20, 0.4) !important;
                }
            `;
            document.head.appendChild(style);
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        this.hapticFeedback('medium');

        document.getElementById('cancelLogout').addEventListener('click', () => {
            this.hapticFeedback('light');
            confirmDialog.style.animation = 'fadeIn 0.2s ease reverse';
            setTimeout(() => confirmDialog.remove(), 200);
        });

        document.getElementById('confirmLogout').addEventListener('click', function () {
            if (window.mobileNav) {
                window.mobileNav.hapticFeedback('success');
            }

            const viewportWidth = window.innerWidth;
            const loadingText = viewportWidth < 320 ? 'Signing out...' : 'Signing out...';
            const spinnerSize = viewportWidth < 360 ? '14px' : '16px';

            this.innerHTML = `
                <span style="
                    display: inline-block;
                    width: ${spinnerSize}; 
                    height: ${spinnerSize}; 
                    margin-right: clamp(4px, 1vw, 6px);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                "></span>
                <span style="font-size: clamp(12px, 3.5vmin, 16px);">${loadingText}</span>
            `;
            this.disabled = true;
            this.style.opacity = '0.8';

            if (!document.getElementById('spin-animation')) {
                const style = document.createElement('style');
                style.id = 'spin-animation';
                style.textContent = `
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }

            localStorage.removeItem('cinebrain-token');
            localStorage.removeItem('cinebrain-user');
            localStorage.removeItem('cinebrain-role');
            sessionStorage.clear();

            sessionStorage.setItem('show-logout-message', 'true');

            if (window.mobileNav) {
                window.mobileNav.showToast('Signing out...', 'success');
            }

            setTimeout(() => {
                window.location.href = '/index.html';
            }, 800);
        });

        confirmDialog.addEventListener('click', (e) => {
            if (e.target === confirmDialog) {
                this.hapticFeedback('light');
                confirmDialog.style.animation = 'fadeIn 0.2s ease reverse';
                setTimeout(() => confirmDialog.remove(), 200);
            }
        });

        const handlePopState = (e) => {
            confirmDialog.style.animation = 'fadeIn 0.2s ease reverse';
            setTimeout(() => confirmDialog.remove(), 200);
            window.removeEventListener('popstate', handlePopState);
        };
        window.addEventListener('popstate', handlePopState);
    }

    showToast(message, type = 'info') {
        const screenWidth = window.innerWidth;
        const isSmallPhone = screenWidth <= 360;
        const isMediumPhone = screenWidth > 360 && screenWidth <= 414;

        const padding = isSmallPhone ? '10px 16px' : isMediumPhone ? '12px 18px' : '12px 20px';
        const fontSize = isSmallPhone ? '13px' : '14px';
        const borderRadius = isSmallPhone ? '20px' : '24px';
        const bottomOffset = `calc(var(--mobile-nav-height, 56px) + ${isSmallPhone ? '12px' : '20px'} + var(--safe-area-bottom, 0))`;

        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: ${bottomOffset};
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(0, 0, 0, 0.9)'};
            color: white;
            padding: ${padding};
            border-radius: ${borderRadius};
            font-size: ${fontSize};
            font-weight: 500;
            z-index: 10001;
            animation: slideUp 0.3s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: calc(100% - 32px);
            white-space: nowrap;
            text-align: center;
        `;
        toast.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { transform: translate(-50%, 100%); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    dispatchEvent(eventName, detail = {}) {
        window.dispatchEvent(new CustomEvent(`mobileNav:${eventName}`, { detail }));
    }

    destroy() {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('popstate', this.handlePopstate);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('focus', this.handleFocus);
        window.removeEventListener('pageshow', this.handlePageShow);

        this.elements.nav?.remove();
        this.elements.menuOverlay?.remove();
        this.elements.backdrop?.remove();

        this.state = {};

        document.body.classList.remove('menu-open');
        document.body.style.paddingBottom = '';
        document.body.style.top = '';

        this.dispatchEvent('destroyed');
    }
}

const mobileNav = new MobileNavigation({
    enableHaptic: true,
    swipeThreshold: 50,
    swipeVelocity: 0.3
});

window.mobileNav = mobileNav;

document.addEventListener('DOMContentLoaded', () => {
    const showLogoutMessage = sessionStorage.getItem('show-logout-message');

    if (showLogoutMessage) {
        sessionStorage.removeItem('show-logout-message');

        if (window.mobileNav) {
            setTimeout(() => {
                window.mobileNav.showToast('You have been signed out', 'info');
            }, 500);
        }
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileNavigation;
}