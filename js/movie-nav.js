class MobileNavigation {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.currentUser = null;
        this.currentRoute = window.location.pathname;
        this.watchlistCount = 0;
        this.searchDebounceTimer = null;
        this.longPressTimer = null;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupNavigation();
        this.setupSearch();
        this.setupProfileMenu();
        this.setupGestures();
        this.highlightActiveTab();
        this.startRealtimeUpdates();
        this.initTheme();
    }

    // Theme Management
    initTheme() {
        const savedTheme = localStorage.getItem('cinebrain-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Authentication
    async checkAuthentication() {
        const token = localStorage.getItem('cinebrain-token');
        const userStr = localStorage.getItem('cinebrain-user');

        if (token && userStr) {
            try {
                this.currentUser = JSON.parse(userStr);
                this.updateProfileIcon();
                await this.loadWatchlistCount();
            } catch (e) {
                console.error('Failed to parse user data:', e);
                this.currentUser = null;
            }
        }
    }

    updateProfileIcon() {
        const profileIcon = document.getElementById('profileIcon');
        if (this.currentUser && this.currentUser.username) {
            const initial = this.currentUser.username.charAt(0).toUpperCase();
            profileIcon.innerHTML = `
                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    ${initial}
                </div>
            `;
        }
    }

    // Navigation Setup
    setupNavigation() {
        const tabs = document.querySelectorAll('.nav-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleTabClick(tab);
            });

            // Add haptic feedback for mobile
            tab.addEventListener('touchstart', () => {
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            });
        });
    }

    handleTabClick(tab) {
        const tabType = tab.dataset.tab;
        const route = tab.dataset.route;

        // Handle special cases
        if (tabType === 'search') {
            this.openSearchOverlay();
        } else if (tabType === 'profile') {
            this.toggleProfileMenu();
        } else if (tabType === 'watchlist' && !this.currentUser) {
            this.redirectToLogin();
        } else if (route) {
            this.navigateTo(route);
        }

        // Update active state
        this.setActiveTab(tab);
    }

    setActiveTab(activeTab) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active', 'text-white');
            tab.classList.add('text-gray-400');
            tab.setAttribute('aria-selected', 'false');
        });

        activeTab.classList.add('active', 'text-white');
        activeTab.classList.remove('text-gray-400');
        activeTab.setAttribute('aria-selected', 'true');
    }

    highlightActiveTab() {
        const currentPath = window.location.pathname;
        let activeTab = null;

        if (currentPath === '/' || currentPath === '/index.html' || currentPath === '/home.html' || currentPath === '') {
            activeTab = document.querySelector('[data-tab="home"]');
        } else if (currentPath.includes('/trending')) {
            activeTab = document.querySelector('[data-tab="discover"]');
        } else if (currentPath.includes('/search')) {
            activeTab = document.querySelector('[data-tab="search"]');
        } else if (currentPath.includes('/watchlist')) {
            activeTab = document.querySelector('[data-tab="watchlist"]');
        } else if (currentPath.includes('/profile') || currentPath.includes('/user')) {
            activeTab = document.querySelector('[data-tab="profile"]');
        }

        // Default to home if no match
        if (!activeTab) {
            activeTab = document.querySelector('[data-tab="home"]');
        }

        if (activeTab) {
            this.setActiveTab(activeTab);
        }
    }

    navigateTo(route) {
        // If using SPA routing
        if (window.app && window.app.navigate) {
            window.app.navigate(route);
        } else {
            // Fallback to regular navigation
            window.location.href = route;
        }
    }

    redirectToLogin() {
        this.navigateTo('/auth/login.html');
    }

    // Search Functionality
    setupSearch() {
        const searchTab = document.querySelector('[data-tab="search"]');
        const searchOverlay = document.getElementById('searchOverlay');
        const closeSearch = document.getElementById('closeSearch');
        const searchInput = document.getElementById('searchInput');

        if (!searchTab || !searchOverlay || !closeSearch || !searchInput) return;

        // Long press detection for search tab
        searchTab.addEventListener('touchstart', (e) => {
            this.longPressTimer = setTimeout(() => {
                this.openSearchOverlay();
                if (navigator.vibrate) {
                    navigator.vibrate(20);
                }
            }, 500);
        });

        searchTab.addEventListener('touchend', () => {
            clearTimeout(this.longPressTimer);
        });

        searchTab.addEventListener('touchmove', () => {
            clearTimeout(this.longPressTimer);
        });

        // Close search
        closeSearch.addEventListener('click', () => {
            this.closeSearchOverlay();
        });

        // Search input
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
                this.closeSearchOverlay();
            }
        });
    }

    openSearchOverlay() {
        const overlay = document.getElementById('searchOverlay');
        if (overlay) {
            overlay.classList.add('active');
            setTimeout(() => {
                const input = document.getElementById('searchInput');
                if (input) input.focus();
            }, 300);
        }
    }

    closeSearchOverlay() {
        const overlay = document.getElementById('searchOverlay');
        const input = document.getElementById('searchInput');
        const results = document.getElementById('searchResults');

        if (overlay) overlay.classList.remove('active');
        if (input) input.value = '';
        if (results) results.innerHTML = '';
    }

    handleSearch(query) {
        clearTimeout(this.searchDebounceTimer);

        const results = document.getElementById('searchResults');
        if (!results) return;

        if (query.length < 2) {
            results.innerHTML = '';
            return;
        }

        // Show loading state
        results.innerHTML = this.getLoadingSkeleton();

        this.searchDebounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    async performSearch(query) {
        try {
            const response = await fetch(`${this.apiBase}/search?query=${encodeURIComponent(query)}&type=multi&limit=8`);
            const data = await response.json();
            this.displaySearchResults(data.results || []);
        } catch (error) {
            console.error('Search error:', error);
            this.displaySearchError();
        }
    }

    displaySearchResults(results) {
        const container = document.getElementById('searchResults');
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 mt-8">
                    <p>No results found</p>
                </div>
            `;
            return;
        }

        const html = results.map(item => {
            const posterUrl = item.poster_path || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjcyIiBmaWxsPSIjMjIyIi8+PC9zdmc+';
            const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
            const rating = item.rating ? `⭐ ${item.rating.toFixed(1)}` : '';

            return `
                <div class="search-result" onclick="mobileNav.navigateTo('/content/details.html?id=${item.id}')">
                    <img src="${posterUrl}" alt="${item.title}">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-white truncate">${item.title}</h3>
                        <p class="text-sm text-gray-400">
                            <span class="inline-block px-2 py-0.5 bg-gray-800 rounded text-xs mr-2">${item.content_type}</span>
                            ${year} ${rating}
                        </p>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    displaySearchError() {
        const container = document.getElementById('searchResults');
        if (container) {
            container.innerHTML = `
                <div class="text-center text-red-400 mt-8">
                    <p>Search failed. Please try again.</p>
                </div>
            `;
        }
    }

    getLoadingSkeleton() {
        return Array(3).fill(0).map(() => `
            <div class="search-result">
                <div class="skeleton" style="width: 48px; height: 72px;"></div>
                <div class="flex-1">
                    <div class="skeleton h-4 w-3/4 mb-2"></div>
                    <div class="skeleton h-3 w-1/2"></div>
                </div>
            </div>
        `).join('');
    }

    // Profile Menu
    setupProfileMenu() {
        const profileTab = document.querySelector('[data-tab="profile"]');
        const overlay = document.getElementById('profileMenuOverlay');
        const menu = document.getElementById('profileMenu');

        if (!overlay || !menu) return;

        overlay.addEventListener('click', () => {
            this.closeProfileMenu();
        });

        // Swipe down to close
        let startY = 0;
        menu.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });

        menu.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 0) {
                menu.style.transform = `translateY(${diff}px)`;
            }
        });

        menu.addEventListener('touchend', (e) => {
            const currentY = e.changedTouches[0].clientY;
            const diff = currentY - startY;

            if (diff > 100) {
                this.closeProfileMenu();
            } else {
                menu.style.transform = '';
            }
        });
    }

    toggleProfileMenu() {
        const menu = document.getElementById('profileMenu');

        if (menu && menu.classList.contains('active')) {
            this.closeProfileMenu();
        } else {
            this.openProfileMenu();
        }
    }

    openProfileMenu() {
        const menu = document.getElementById('profileMenu');
        const overlay = document.getElementById('profileMenuOverlay');
        const content = document.getElementById('profileMenuContent');

        if (!menu || !overlay || !content) return;

        // Build menu content
        if (this.currentUser) {
            content.innerHTML = this.buildUserMenu();
        } else {
            content.innerHTML = this.buildGuestMenu();
        }

        overlay.classList.add('active');
        menu.classList.add('active');
    }

    closeProfileMenu() {
        const menu = document.getElementById('profileMenu');
        const overlay = document.getElementById('profileMenuOverlay');

        if (menu) {
            menu.classList.remove('active');
            menu.style.transform = '';
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    buildUserMenu() {
        let html = `
            <div class="px-4 pb-3">
                <div class="flex items-center">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold mr-3">
                        ${this.currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 class="font-semibold text-white">${this.currentUser.username}</h3>
                        <p class="text-sm text-gray-400">${this.currentUser.email}</p>
                    </div>
                </div>
            </div>
            
            <div class="menu-divider"></div>
            
            <a href="/user/${this.currentUser.username}/profile.html" class="menu-item">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <span>View Profile</span>
            </a>
            
            <a href="/user/watchlist.html" class="menu-item">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
                <span>My Watchlist</span>
            </a>
            
            <a href="/user/favorites.html" class="menu-item">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
                <span>Favorites</span>
            </a>
            
            <a href="/user/activity.html" class="menu-item">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <span>Activity</span>
            </a>
            
            <a href="/user/settings.html" class="menu-item">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Settings</span>
            </a>
            
            <div class="menu-item" onclick="mobileNav.toggleTheme()">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
                <span>Dark/Light Mode</span>
            </div>
        `;

        // Add admin section if user is admin
        if (this.currentUser.is_admin) {
            html += `
                <div class="menu-divider"></div>
                <div class="menu-header">Admin Tools</div>
                
                <a href="/admin/index.html" class="menu-item">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    <span>Dashboard</span>
                </a>
                
                <a href="/admin/content.html" class="menu-item">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4"/>
                    </svg>
                    <span>Content Management</span>
                </a>
                
                <a href="/admin/users.html" class="menu-item">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                    </svg>
                    <span>User Management</span>
                </a>
                
                <a href="/admin/analytics.html" class="menu-item">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <span>Analytics</span>
                </a>
            `;
        }

        html += `
            <div class="menu-divider"></div>
            
            <div class="menu-item text-red-400" onclick="mobileNav.logout()">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                <span>Sign Out</span>
            </div>
        `;

        return html;
    }

    buildGuestMenu() {
        return `
            <div class="px-4 pb-3">
                <h3 class="text-lg font-semibold text-white">Welcome to CineBrain</h3>
                <p class="text-sm text-gray-400 mt-1">Sign in to access all features</p>
            </div>
            
            <div class="menu-divider"></div>
            
            <a href="/auth/login.html" class="menu-item">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                </svg>
                <span>Sign In</span>
            </a>
            
            <a href="/auth/register.html" class="menu-item">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
                <span>Create Account</span>
            </a>
            
            <div class="menu-divider"></div>
            
            <div class="menu-item" onclick="mobileNav.continueAsGuest()">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <span>Continue as Guest</span>
            </div>
            
            <div class="menu-item" onclick="mobileNav.toggleTheme()">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
                <span>Dark/Light Mode</span>
            </div>
        `;
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('cinebrain-theme', newTheme);
    }

    logout() {
        localStorage.removeItem('cinebrain-token');
        localStorage.removeItem('cinebrain-user');
        this.currentUser = null;
        this.closeProfileMenu();
        this.navigateTo('/auth/login.html');
    }

    continueAsGuest() {
        this.closeProfileMenu();
        this.navigateTo('/content/trending.html');
    }

    // Watchlist Management
    async loadWatchlistCount() {
        if (!this.currentUser) return;

        try {
            const token = localStorage.getItem('cinebrain-token');
            const response = await fetch(`${this.apiBase}/user/watchlist`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateWatchlistBadge(data.watchlist?.length || 0);
            }
        } catch (error) {
            console.error('Failed to load watchlist count:', error);
        }
    }

    updateWatchlistBadge(count) {
        const badge = document.getElementById('watchlistBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 3000);
            } else {
                badge.style.display = 'none';
            }
        }
        this.watchlistCount = count;
    }

    // Gesture Support
    setupGestures() {
        // Swipe up on bottom nav to show quick actions
        const nav = document.querySelector('.mobile-nav');
        if (!nav) return;

        let startY = 0;

        nav.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });

        nav.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const diff = startY - endY;

            if (diff > 50) {
                // Swipe up detected - could show quick actions
                if (navigator.vibrate) {
                    navigator.vibrate(20);
                }
            }
        });
    }

    // Real-time Updates
    startRealtimeUpdates() {
        // Update watchlist count every 30 seconds
        setInterval(() => {
            if (this.currentUser) {
                this.loadWatchlistCount();
            }
        }, 30000);

        // Listen for authentication changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'cinebrain-token' || e.key === 'cinebrain-user') {
                this.checkAuthentication();
            }
        });

        // Listen for route changes
        window.addEventListener('popstate', () => {
            this.highlightActiveTab();
        });
    }
}

// Initialize Mobile Navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileNav = new MobileNavigation();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileNavigation;
}