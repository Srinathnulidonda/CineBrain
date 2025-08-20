// Main application initialization and layout management
const App = {
    // Initialize app
    async init() {
        // Set up viewport
        this.setupViewport();

        // Initialize theme
        this.initTheme();

        // Set up auth state
        this.checkAuth();

        // Inject layout components
        await this.injectLayouts();

        // Set up navigation
        this.setupNavigation();

        // Initialize page-specific features
        this.initCurrentPage();

        // Set up global event listeners
        this.setupEventListeners();
    },

    setupViewport() {
        // Prevent zoom on mobile
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('touchmove', (e) => {
            if (e.scale !== 1) e.preventDefault();
        }, { passive: false });
    },

    initTheme() {
        const theme = Storage.getTheme();
        document.documentElement.setAttribute('data-theme', theme);
    },

    checkAuth() {
        const user = Storage.getUser();
        const token = Storage.getToken();
        const currentPath = window.location.pathname;

        // Redirect to login if accessing protected routes without auth
        const protectedRoutes = ['/user/', '/admin/'];
        const isProtected = protectedRoutes.some(route => currentPath.startsWith(route));

        if (isProtected && !token) {
            window.location.href = CONFIG.ROUTES.LOGIN;
            return;
        }

        // Redirect admin routes if not admin
        if (currentPath.startsWith('/admin/') && (!user || !user.is_admin)) {
            window.location.href = CONFIG.ROUTES.HOME;
            return;
        }

        // Update UI based on auth state
        this.updateAuthUI(user);
    },

    updateAuthUI(user) {
        const authElements = document.querySelectorAll('[data-auth]');
        authElements.forEach(el => {
            const authType = el.dataset.auth;
            if (authType === 'guest' && user) {
                el.style.display = 'none';
            } else if (authType === 'user' && !user) {
                el.style.display = 'none';
            } else if (authType === 'admin' && (!user || !user.is_admin)) {
                el.style.display = 'none';
            }
        });

        // Update user info
        const userNameElements = document.querySelectorAll('[data-user-name]');
        userNameElements.forEach(el => {
            el.textContent = user ? user.username : 'Guest';
        });
    },

    async injectLayouts() {
        // Inject sidebar for desktop
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer && !UI.isMobile()) {
            sidebarContainer.innerHTML = await this.loadLayout('sidebar');
        }

        // Inject mobile nav
        const mobileNavContainer = document.getElementById('mobile-nav-container');
        if (mobileNavContainer && UI.isMobile()) {
            mobileNavContainer.innerHTML = await this.loadLayout('mobile-nav');
        }

        // Inject other common layouts
        const containerLayouts = document.querySelectorAll('[data-layout]');
        for (const container of containerLayouts) {
            const layoutName = container.dataset.layout;
            container.innerHTML = await this.loadLayout(layoutName);
        }
    },

    async loadLayout(name) {
        try {
            // For production, these would be bundled, but for development we'll return the HTML directly
            const layouts = {
                'sidebar': this.getSidebarHTML(),
                'mobile-nav': this.getMobileNavHTML(),
                'offcanvas-filters': this.getOffcanvasFiltersHTML()
            };
            return layouts[name] || '';
        } catch (error) {
            console.error(`Failed to load layout ${name}:`, error);
            return '';
        }
    },

    getSidebarHTML() {
        const user = Storage.getUser();
        return `
      <nav class="sidebar">
        <div class="sidebar-header">
          <a href="/" class="logo">
            <i class="bi bi-film"></i>
            <span>CineScope</span>
          </a>
        </div>
        
        <div class="sidebar-menu">
          <div class="menu-section">
            <h6 class="menu-title">Discover</h6>
            <ul class="menu-list">
              <li><a href="/" class="${this.isActive('/')}"><i class="bi bi-house"></i> Home</a></li>
              <li><a href="/content/search" class="${this.isActive('/content/search')}"><i class="bi bi-search"></i> Search</a></li>
              <li><a href="/content/genre" class="${this.isActive('/content/genre')}"><i class="bi bi-grid"></i> Genres</a></li>
              <li><a href="/content/regional" class="${this.isActive('/content/regional')}"><i class="bi bi-globe"></i> Regional</a></li>
              <li><a href="/content/anime" class="${this.isActive('/content/anime')}"><i class="bi bi-stars"></i> Anime</a></li>
            </ul>
          </div>
          
          ${user ? `
            <div class="menu-section">
              <h6 class="menu-title">My Library</h6>
              <ul class="menu-list">
                <li><a href="/user/watchlist" class="${this.isActive('/user/watchlist')}"><i class="bi bi-bookmark"></i> Watchlist</a></li>
                <li><a href="/user/favorites" class="${this.isActive('/user/favorites')}"><i class="bi bi-heart"></i> Favorites</a></li>
                <li><a href="/user/activity" class="${this.isActive('/user/activity')}"><i class="bi bi-clock-history"></i> Activity</a></li>
              </ul>
            </div>
          ` : ''}
          
          ${user && user.is_admin ? `
            <div class="menu-section">
              <h6 class="menu-title">Admin</h6>
              <ul class="menu-list">
                <li><a href="/admin/" class="${this.isActive('/admin/')}"><i class="bi bi-speedometer2"></i> Dashboard</a></li>
                <li><a href="/admin/search" class="${this.isActive('/admin/search')}"><i class="bi bi-database"></i> Content</a></li>
                <li><a href="/admin/recommendations" class="${this.isActive('/admin/recommendations')}"><i class="bi bi-megaphone"></i> Recommendations</a></li>
                <li><a href="/admin/analytics" class="${this.isActive('/admin/analytics')}"><i class="bi bi-graph-up"></i> Analytics</a></li>
                <li><a href="/admin/ml" class="${this.isActive('/admin/ml')}"><i class="bi bi-cpu"></i> ML Service</a></li>
              </ul>
            </div>
          ` : ''}
        </div>
        
        <div class="sidebar-footer">
          ${user ? `
            <div class="user-menu">
              <a href="/user/profile" class="user-info">
                <i class="bi bi-person-circle"></i>
                <span>${user.username}</span>
              </a>
              <a href="/user/settings"><i class="bi bi-gear"></i></a>
              <a href="#" onclick="App.logout()"><i class="bi bi-box-arrow-right"></i></a>
            </div>
          ` : `
            <a href="/auth/login" class="btn btn-primary w-100">Sign In</a>
          `}
        </div>
      </nav>
    `;
    },

    getMobileNavHTML() {
        const user = Storage.getUser();
        return `
      <nav class="mobile-nav">
        <a href="/" class="${this.isActive('/')}">
          <i class="bi bi-house"></i>
          <span>Home</span>
        </a>
        <a href="/content/search" class="${this.isActive('/content/search')}">
          <i class="bi bi-search"></i>
          <span>Search</span>
        </a>
        <a href="/content/genre" class="${this.isActive('/content/genre')}">
          <i class="bi bi-grid"></i>
          <span>Browse</span>
        </a>
        ${user ? `
          <a href="/user/watchlist" class="${this.isActive('/user/watchlist')}">
            <i class="bi bi-bookmark"></i>
            <span>Watchlist</span>
          </a>
          <a href="/user/profile" class="${this.isActive('/user/profile')}">
            <i class="bi bi-person"></i>
            <span>Profile</span>
          </a>
        ` : `
          <a href="/auth/login" class="${this.isActive('/auth/login')}">
            <i class="bi bi-person"></i>
            <span>Sign In</span>
          </a>
        `}
      </nav>
    `;
    },

    getOffcanvasFiltersHTML() {
        return `
      <div class="offcanvas offcanvas-end" tabindex="-1" id="filtersOffcanvas">
        <div class="offcanvas-header">
          <h5 class="offcanvas-title">Filters</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body">
          <!-- Filter content will be injected by page-specific code -->
        </div>
      </div>
    `;
    },

    isActive(path) {
        return window.location.pathname === path ? 'active' : '';
    },

    setupNavigation() {
        // Handle active states
        const currentPath = window.location.pathname;
        document.querySelectorAll('.sidebar a, .mobile-nav a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    },

    initCurrentPage() {
        // This will be called by page-specific inline scripts
        const pageInit = window.pageInit;
        if (pageInit && typeof pageInit === 'function') {
            pageInit();
        }
    },

    setupEventListeners() {
        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });

        // Handle online/offline
        window.addEventListener('online', () => {
            UI.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            UI.showToast('No internet connection', 'error');
        });

        // Handle back button
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.modal) {
                // Close any open modals
                const modals = document.querySelectorAll('.modal.show');
                modals.forEach(modal => {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) bsModal.hide();
                });
            }
        });
    },

    handleResize() {
        // Re-inject layouts if switching between mobile/desktop
        this.injectLayouts();
    },

    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            api.auth.logout();
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});