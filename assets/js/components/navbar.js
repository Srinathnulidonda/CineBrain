class NavbarManager {
    constructor(app) {
        this.app = app;
        this.navbar = document.getElementById('main-navbar');
        this.mobileNav = document.getElementById('mobile-nav');
        this.userMenu = document.getElementById('user-menu');
        this.isMobileMenuOpen = false;
        this.isUserMenuOpen = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupScrollBehavior();
        this.setupThemeToggle();
        this.updateAuthState();
    }

    setupEventListeners() {
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Mobile menu close
        const mobileClose = document.getElementById('mobile-nav-close');
        if (mobileClose) {
            mobileClose.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }

        // User menu toggle
        const userAvatar = document.getElementById('user-avatar-btn');
        if (userAvatar) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#user-menu')) {
                this.closeUserMenu();
            }
            
            if (!e.target.closest('#mobile-nav') && !e.target.closest('#mobile-menu-toggle')) {
                this.closeMobileMenu();
            }
        });

        // Navigation links
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('[data-page]');
            if (navLink) {
                e.preventDefault();
                const page = navLink.dataset.page;
                this.app.navigateTo(page);
                this.closeMobileMenu();
            }
        });

        // Auth buttons
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.app.navigateTo('login');
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this.app.navigateTo('register');
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.app.logout();
                this.closeUserMenu();
            });
        }

        // Escape key to close menus
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeUserMenu();
                this.closeMobileMenu();
            }
        });
    }

    setupScrollBehavior() {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateNavbar = () => {
            const scrollY = window.scrollY;
            
            if (scrollY > 100) {
                this.navbar.classList.add('scrolled');
            } else {
                this.navbar.classList.remove('scrolled');
            }

            // Hide/show navbar on scroll
            if (scrollY > lastScrollY && scrollY > 200) {
                this.navbar.classList.add('hidden');
            } else {
                this.navbar.classList.remove('hidden');
            }

            lastScrollY = scrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNavbar);
                ticking = true;
            }
        });
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;

        const updateThemeIcon = (theme) => {
            const icon = themeToggle.querySelector('i');
            if (theme === 'dark') {
                icon.className = 'fas fa-sun';
                themeToggle.title = 'Switch to light theme';
            } else {
                icon.className = 'fas fa-moon';
                themeToggle.title = 'Switch to dark theme';
            }
        };

        // Set initial icon
        const currentTheme = StorageManager.getTheme();
        updateThemeIcon(currentTheme);

        themeToggle.addEventListener('click', () => {
            const currentTheme = StorageManager.getTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            StorageManager.setTheme(newTheme);
            updateThemeIcon(newTheme);
            
            // Add transition effect
            document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
            setTimeout(() => {
                document.body.style.transition = '';
            }, 300);
        });
    }

    toggleMobileMenu() {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
        this.mobileNav.classList.toggle('active', this.isMobileMenuOpen);
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
        
        // Update mobile toggle animation
        const toggle = document.getElementById('mobile-menu-toggle');
        if (toggle) {
            toggle.classList.toggle('active', this.isMobileMenuOpen);
        }
    }

    closeMobileMenu() {
        this.isMobileMenuOpen = false;
        this.mobileNav.classList.remove('active');
        document.body.style.overflow = '';
        
        const toggle = document.getElementById('mobile-menu-toggle');
        if (toggle) {
            toggle.classList.remove('active');
        }
    }

    toggleUserMenu() {
        this.isUserMenuOpen = !this.isUserMenuOpen;
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('active', this.isUserMenuOpen);
        }
    }

    closeUserMenu() {
        this.isUserMenuOpen = false;
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    }

    updateAuthState() {
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const adminLink = document.getElementById('admin-link');
        
        if (this.app.isAuthenticated()) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            
            // Update user name
            const userName = document.getElementById('user-name');
            if (userName && this.app.currentUser) {
                userName.textContent = this.app.currentUser.username;
            }
            
            // Show admin link if user is admin
            if (adminLink) {
                adminLink.style.display = this.app.isAdmin() ? 'block' : 'none';
            }
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    updateActiveNavLink(currentPage) {
        // Update desktop nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const page = link.dataset.page;
            link.classList.toggle('active', page === currentPage);
        });
        
        // Update mobile nav links
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => {
            const page = link.dataset.page;
            link.classList.toggle('active', page === currentPage);
        });
    }

    showNotificationBadge(count) {
        let badge = this.navbar.querySelector('.notification-badge');
        
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                
                // Find a suitable parent (could be a notification icon)
                const notificationBtn = this.navbar.querySelector('.notification-btn');
                if (notificationBtn) {
                    notificationBtn.style.position = 'relative';
                    notificationBtn.appendChild(badge);
                }
            }
            
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.style.display = 'block';
        } else if (badge) {
            badge.style.display = 'none';
        }
    }

    // Search functionality in navbar
    initializeNavbarSearch() {
        const searchInput = this.navbar.querySelector('.navbar-search input');
        const searchResults = this.navbar.querySelector('.navbar-search-results');
        
        if (!searchInput || !searchResults) return;
        
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(searchTimeout);
            
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                try {
                    const results = await api.searchContent(query);
                    this.displaySearchResults(results.tmdb_results.slice(0, 5), searchResults);
                } catch (error) {
                    console.error('Search error:', error);
                }
            }, 300);
        });
        
        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar-search')) {
                searchResults.style.display = 'none';
            }
        });
    }

    displaySearchResults(results, container) {
        if (results.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.innerHTML = results.map(item => `
            <div class="search-result-item" data-id="${item.id}">
                <img src="${IMAGE_CONFIG.TMDB_BASE_URL}w92${item.poster_path}" alt="${item.title || item.name}">
                <div class="result-info">
                    <div class="result-title">${item.title || item.name}</div>
                    <div class="result-year">${new Date(item.release_date || item.first_air_date).getFullYear()}</div>
                </div>
            </div>
        `).join('');
        
        container.style.display = 'block';
        
        // Add click handlers
        container.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                const id = resultItem.dataset.id;
                window.app.navigateTo(`movie-detail?id=${id}`);
                container.style.display = 'none';
            }
        });
    }
}

// Add navbar styles
const navbarStyles = `
.navbar.scrolled {
    background-color: rgba(15, 15, 15, 0.98);
    backdrop-filter: blur(20px);
}

.navbar.hidden {
    transform: translateY(-100%);
}

.mobile-menu-toggle.active span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
}

.mobile-menu-toggle.active span:nth-child(2) {
    opacity: 0;
}

.mobile-menu-toggle.active span:nth-child(3) {
    transform: rotate(-45deg) translate(7px, -6px);
}

.notification-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: var(--accent-primary);
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
}

.navbar-search {
    position: relative;
    max-width: 300px;
}

.navbar-search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
}

.search-result-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    cursor: pointer;
    transition: background-color 0.15s ease;
}

.search-result-item:hover {
    background-color: var(--bg-hover);
}

.search-result-item img {
    width: 40px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
}

.result-title {
    font-weight: 500;
    color: var(--text-primary);
}

.result-year {
    font-size: 12px;
    color: var(--text-secondary);
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = navbarStyles;
document.head.appendChild(styleSheet);

window.NavbarManager = NavbarManager;