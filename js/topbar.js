// Initialize Feather Icons first
if (typeof feather !== 'undefined') {
    feather.replace();
}

// TopBar Component Class
class TopbarComponent {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.searchDebounceTimer = null;
        this.currentUser = this.getCurrentUser();
        this.init();
    }

    init() {
        this.initTheme();
        this.initSearch();
        this.initUserMenu();
        this.initMobileSearch();
        this.setupEventListeners();
        this.handleResponsive();

        // Re-initialize Feather Icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    handleResponsive() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.adjustForScreenSize();
            }, 250);
        });
        this.adjustForScreenSize();
    }

    adjustForScreenSize() {
        const width = window.innerWidth;
        const taglineFull = document.querySelector('.tagline-full');
        const taglineMedium = document.querySelector('.tagline-medium');
        const taglineShort = document.querySelector('.tagline-short');

        if (width <= 359) {
            if (taglineFull) taglineFull.style.display = 'none';
            if (taglineMedium) taglineMedium.style.display = 'none';
            if (taglineShort) taglineShort.style.display = 'block';
        } else if (width <= 479) {
            if (taglineFull) taglineFull.style.display = 'none';
            if (taglineMedium) taglineMedium.style.display = 'block';
            if (taglineShort) taglineShort.style.display = 'none';
        } else {
            if (taglineFull) taglineFull.style.display = 'block';
            if (taglineMedium) taglineMedium.style.display = 'none';
            if (taglineShort) taglineShort.style.display = 'none';
        }

        const dropdown = document.querySelector('.dropdown-menu-cinebrain.show');
        if (dropdown) {
            const rect = dropdown.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                dropdown.style.right = '4px';
                dropdown.style.left = 'auto';
            }
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('cinebrain-theme') || 'dark';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('cinebrain-theme', theme);

        const icon = document.querySelector('#themeToggle .theme-icon');
        if (icon) {
            icon.setAttribute('data-feather', theme === 'dark' ? 'moon' : 'sun');
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    getCurrentUser() {
        const token = localStorage.getItem('cinebrain-token');
        const userStr = localStorage.getItem('cinebrain-user');

        if (token && userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    initUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        if (!dropdown) return;

        if (this.currentUser) {
            const avatarMenu = document.getElementById('avatarMenu');
            const initial = this.currentUser.username.charAt(0).toUpperCase();
            avatarMenu.innerHTML = `<span>${initial}</span>`;

            const width = window.innerWidth;
            const displayName = width <= 400
                ? this.currentUser.username.substring(0, 8) + (this.currentUser.username.length > 8 ? '...' : '')
                : this.currentUser.username;

            let menuItems = `
                <li><h6 class="dropdown-header">Hello, ${displayName}!</h6></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/${this.currentUser.username}/profile.html">
                    <i data-feather="user"></i><span>Profile</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/watchlist.html">
                    <i data-feather="bookmark"></i><span>Watchlist</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/favorites.html">
                    <i data-feather="heart"></i><span>Favorites</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/activity.html">
                    <i data-feather="activity"></i><span>Activity</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/user/settings.html">
                    <i data-feather="settings"></i><span>Settings</span>
                </a></li>`;

            if (this.currentUser.is_admin) {
                menuItems += `
                    <li><hr class="dropdown-divider"></li>
                    <li><h6 class="dropdown-header">Admin</h6></li>
                    <li><a class="dropdown-item dropdown-item-cinebrain" href="/admin/index.html">
                        <i data-feather="shield"></i><span>Dashboard</span>
                    </a></li>
                    <li><a class="dropdown-item dropdown-item-cinebrain" href="/admin/content.html">
                        <i data-feather="film"></i><span>Content</span>
                    </a></li>
                    <li><a class="dropdown-item dropdown-item-cinebrain" href="/admin/users.html">
                        <i data-feather="users"></i><span>Users</span>
                    </a></li>
                    <li><a class="dropdown-item dropdown-item-cinebrain" href="/admin/analytics.html">
                        <i data-feather="bar-chart-2"></i><span>Analytics</span>
                    </a></li>`;
            }

            menuItems += `
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="#" onclick="topbar.logout(); return false;">
                    <i data-feather="log-out"></i><span>Sign Out</span>
                </a></li>`;

            dropdown.innerHTML = menuItems;
        } else {
            dropdown.innerHTML = `
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/auth/login.html">
                    <i data-feather="log-in"></i><span>Login</span>
                </a></li>
                <li><a class="dropdown-item dropdown-item-cinebrain" href="/auth/register.html">
                    <i data-feather="user-plus"></i><span>Register</span>
                </a></li>`;
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    logout() {
        localStorage.removeItem('cinebrain-token');
        localStorage.removeItem('cinebrain-user');
        window.location.href = '/auth/login.html';
    }

    initSearch() {
        const desktopInput = document.getElementById('desktopSearchInput');
        const mobileInput = document.getElementById('mobileSearchInput');

        if (desktopInput) {
            desktopInput.addEventListener('input', (e) => this.handleSearch(e, 'desktop'));
            desktopInput.addEventListener('focus', (e) => this.handleSearchFocus(e, 'desktop'));
        }

        if (mobileInput) {
            mobileInput.addEventListener('input', (e) => this.handleSearch(e, 'mobile'));
            mobileInput.addEventListener('focus', (e) => this.handleSearchFocus(e, 'mobile'));
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.closeSearchResults();
            }
        });
    }

    handleSearch(event, mode) {
        const query = event.target.value.trim();
        clearTimeout(this.searchDebounceTimer);

        if (query.length < 2) {
            this.closeSearchResults(mode);
            return;
        }

        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        resultsContainer.innerHTML = '<div class="p-3 text-center"><div class="spinner-cinebrain mx-auto"></div></div>';
        resultsContainer.classList.add('show');

        this.searchDebounceTimer = setTimeout(() => {
            this.performSearch(query, mode);
        }, 300);
    }

    handleSearchFocus(event, mode) {
        const query = event.target.value.trim();
        if (query.length >= 2) {
            this.performSearch(query, mode);
        }
    }

    async performSearch(query, mode) {
        try {
            const response = await fetch(`${this.apiBase}/search?query=${encodeURIComponent(query)}&type=multi&limit=10`);
            const data = await response.json();
            this.displaySearchResults(data.results || [], mode);
        } catch (error) {
            console.error('Search error:', error);
            this.displaySearchError(mode);
        }
    }

    displaySearchResults(results, mode) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="p-3 text-center text-muted">No results found</div>';
            return;
        }

        const isMobile = window.innerWidth <= 480;
        let html = '';

        results.forEach(item => {
            const posterUrl = item.poster_path || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+PC9zdmc+';
            const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
            const rating = item.rating ? `⭐ ${item.rating.toFixed(1)}` : '';
            const title = isMobile && item.title.length > 30
                ? item.title.substring(0, 30) + '...'
                : item.title;

            const imgSize = window.innerWidth <= 359 ? 'width: 35px; height: 52px;' : 'width: 40px; height: 60px;';

            html += `
                <div class="search-result-item d-flex" onclick="window.location.href='/content/details.html?id=${item.id}'">
                    <img src="${posterUrl}" alt="${item.title}" style="${imgSize} object-fit: cover; border-radius: 4px;" class="me-3">
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="fw-semibold text-truncate">${title}</div>
                        <div class="small text-muted">
                            <span class="badge bg-secondary me-1">${item.content_type}</span>
                            ${year} ${rating}
                        </div>
                    </div>
                </div>`;
        });

        resultsContainer.innerHTML = html;
        resultsContainer.classList.add('show');
    }

    displaySearchError(mode) {
        const resultsContainer = document.getElementById(`${mode}SearchResults`);
        resultsContainer.innerHTML = '<div class="p-3 text-center text-danger">Search failed. Please try again.</div>';
    }

    closeSearchResults(mode = null) {
        if (mode) {
            const resultsContainer = document.getElementById(`${mode}SearchResults`);
            if (resultsContainer) {
                resultsContainer.classList.remove('show');
            }
        } else {
            document.querySelectorAll('.search-results').forEach(container => {
                container.classList.remove('show');
            });
        }
    }

    initMobileSearch() {
        const trigger = document.getElementById('mobileSearchTrigger');
        const overlay = document.getElementById('mobileSearchOverlay');
        const closeBtn = document.getElementById('closeMobileSearch');
        const input = document.getElementById('mobileSearchInput');

        if (trigger) {
            trigger.addEventListener('click', () => {
                overlay.classList.add('show');
                setTimeout(() => input?.focus(), 300);
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                overlay.classList.remove('show');
                input.value = '';
                this.closeSearchResults('mobile');
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay?.classList.contains('show')) {
                overlay.classList.remove('show');
            }
        });
    }

    setupEventListeners() {
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                this.handleSearchNavigation(e);
            }
        });

        const avatarMenu = document.getElementById('avatarMenu');
        if (avatarMenu) {
            avatarMenu.addEventListener('click', () => {
                setTimeout(() => {
                    const dropdown = document.querySelector('.dropdown-menu-cinebrain.show');
                    if (dropdown) {
                        const rect = dropdown.getBoundingClientRect();
                        if (rect.right > window.innerWidth) {
                            dropdown.style.right = '4px';
                            dropdown.style.left = 'auto';
                        }
                    }
                }, 10);
            });
        }
    }

    handleSearchNavigation(event) {
        const activeResults = document.querySelector('.search-results.show');
        if (!activeResults) return;

        const items = activeResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        event.preventDefault();

        let currentIndex = Array.from(items).findIndex(item => item.classList.contains('active'));

        if (event.key === 'ArrowDown') {
            currentIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
            currentIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        items.forEach(item => item.classList.remove('active'));
        items[currentIndex].classList.add('active');
        items[currentIndex].scrollIntoView({ block: 'nearest' });
    }
}

// Initialize TopBar Component
window.topbar = new TopbarComponent();