// Main Application Logic
class CineScopeApp {
  constructor() {
    this.currentPage = null;
    this.isInitialized = false;
  }

  // Initialize app
  async init() {
    if (this.isInitialized) return;

    // Initialize UI components
    ui.init();

    // Set up navigation
    this.setupNavigation();

    // Set up auth guards
    this.setupAuthGuards();

    // Inject layouts
    await this.injectLayouts();

    // Mark as initialized
    this.isInitialized = true;

    // Initialize page-specific logic
    this.initPageLogic();
  }

  // Setup navigation
  setupNavigation() {
    // Handle clean URLs without .html
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && link.href.includes('.html')) {
        e.preventDefault();
        const cleanUrl = link.href.replace('.html', '');
        window.location.href = cleanUrl;
      }
    });
  }

  // Setup auth guards
  setupAuthGuards() {
    const path = window.location.pathname;
    const isLoggedIn = storage.isLoggedIn();
    const isAdmin = storage.isAdmin();

    // Protected routes
    const protectedRoutes = [
      '/user/watchlist',
      '/user/favorites',
      '/user/settings',
      '/user/activity',
      '/user/profile'
    ];

    // Admin routes
    const adminRoutes = [
      '/admin/',
      '/admin/search',
      '/admin/recommendations',
      '/admin/analytics',
      '/admin/ml'
    ];

    // Check auth
    if (protectedRoutes.some(route => path.startsWith(route)) && !isLoggedIn) {
      window.location.href = CONFIG.ROUTES.LOGIN;
      return;
    }

    if (adminRoutes.some(route => path.startsWith(route)) && !isAdmin) {
      window.location.href = CONFIG.ROUTES.HOME;
      return;
    }

    // Redirect logged-in users from auth pages
    if ((path === CONFIG.ROUTES.LOGIN || path === CONFIG.ROUTES.REGISTER) && isLoggedIn) {
      window.location.href = CONFIG.ROUTES.HOME;
      return;
    }
  }

  // Inject common layouts
  async injectLayouts() {
    // Inject topbar for desktop
    const topbarContainer = document.getElementById('topbar-container');
    if (topbarContainer) {
      topbarContainer.innerHTML = this.getTopbarHTML();
      this.setupTopbar();
    }

    // Inject mobile nav
    const mobileNavContainer = document.getElementById('mobile-nav-container');
    if (mobileNavContainer) {
      mobileNavContainer.innerHTML = this.getMobileNavHTML();
      this.setupMobileNav();
    }
  }

  // Topbar HTML
  getTopbarHTML() {
    const user = storage.getUser();
    const isAdmin = storage.isAdmin();

    return `
      <nav class="navbar navbar-expand-lg navbar-dark fixed-top topbar">
        <div class="container-fluid">
          <a class="navbar-brand fw-bold text-gradient-animated" href="/">CineScope</a>
          
          <div class="d-flex align-items-center gap-3">
            <form class="d-flex" id="topbar-search">
              <input class="form-control me-2" type="search" placeholder="Search..." aria-label="Search">
              <button class="btn btn-outline-primary" type="submit">
                <i class="bi bi-search"></i>
              </button>
            </form>
            
            <div class="dropdown">
              <button class="btn btn-link text-white dropdown-toggle" type="button" data-bs-toggle="dropdown">
                Browse
              </button>
              <ul class="dropdown-menu dropdown-menu-dark">
                <li><a class="dropdown-item" href="/content/search">All Content</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="/content/anime">Anime</a></li>
                <li><a class="dropdown-item" href="/content/genre">By Genre</a></li>
                <li><a class="dropdown-item" href="/content/regional">Regional</a></li>
              </ul>
            </div>
            
            ${user ? `
              <div class="dropdown">
                <button class="btn btn-link text-white dropdown-toggle" type="button" data-bs-toggle="dropdown">
                  <i class="bi bi-person-circle"></i> ${user.username}
                </button>
                <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark">
                  <li><a class="dropdown-item" href="/user/profile">Profile</a></li>
                  <li><a class="dropdown-item" href="/user/watchlist">Watchlist</a></li>
                  <li><a class="dropdown-item" href="/user/favorites">Favorites</a></li>
                  <li><a class="dropdown-item" href="/user/settings">Settings</a></li>
                  ${isAdmin ? '<li><a class="dropdown-item" href="/admin/">Admin Panel</a></li>' : ''}
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" id="logout-btn">Logout</a></li>
                </ul>
              </div>
            ` : `
              <a href="/auth/login" class="btn btn-primary">Login</a>
            `}
          </div>
        </div>
      </nav>
    `;
  }

  // Mobile Nav HTML
  getMobileNavHTML() {
    const user = storage.getUser();

    return `
      <nav class="bottom-nav">
        <a href="/" class="bottom-nav-item ${window.location.pathname === '/' ? 'active' : ''}">
          <i class="bi bi-house-fill"></i>
          <div class="small">Home</div>
        </a>
        <a href="/content/search" class="bottom-nav-item ${window.location.pathname.includes('/content/search') ? 'active' : ''}">
          <i class="bi bi-search"></i>
          <div class="small">Search</div>
        </a>
        <a href="/content/anime" class="bottom-nav-item ${window.location.pathname.includes('/content/anime') ? 'active' : ''}">
          <i class="bi bi-tv-fill"></i>
          <div class="small">Anime</div>
        </a>
        ${user ? `
          <a href="/user/watchlist" class="bottom-nav-item ${window.location.pathname.includes('/user/') ? 'active' : ''}">
            <i class="bi bi-person-fill"></i>
            <div class="small">Profile</div>
          </a>
        ` : `
          <a href="/auth/login" class="bottom-nav-item">
            <i class="bi bi-box-arrow-in-right"></i>
            <div class="small">Login</div>
          </a>
        `}
      </nav>
    `;
  }

  // Setup topbar interactions
  setupTopbar() {
    // Search form
    const searchForm = document.getElementById('topbar-search');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = e.target.querySelector('input').value.trim();
        if (query) {
          window.location.href = `/content/search?q=${encodeURIComponent(query)}`;
        }
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        api.logout();
      });
    }
  }

  // Setup mobile nav interactions
  setupMobileNav() {
    // Mobile nav is mostly handled by links
  }

  // Initialize page-specific logic
  initPageLogic() {
    // This will be called after inline scripts run
    // Page-specific initialization can hook into this
  }

  // Utility methods for pages
  async loadTrendingContent(containerId) {
    try {
      ui.showSkeletonGrid(containerId);
      const data = await api.getTrending();
      ui.createContentGrid(data.recommendations || [], containerId);
    } catch (error) {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
        container.appendChild(ui.createErrorState('Failed to load content', () => {
          this.loadTrendingContent(containerId);
        }));
      }
    }
  }

  async loadNewReleases(containerId, language = null) {
    try {
      ui.showSkeletonGrid(containerId);
      const params = language ? { language } : {};
      const data = await api.getNewReleases(params);
      ui.createContentGrid(data.recommendations || [], containerId);
    } catch (error) {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
        container.appendChild(ui.createErrorState('Failed to load new releases'));
      }
    }
  }

  async loadCriticsChoice(containerId) {
    try {
      ui.showSkeletonGrid(containerId);
      const data = await api.getCriticsChoice();
      ui.createContentGrid(data.recommendations || [], containerId);
    } catch (error) {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
        container.appendChild(ui.createErrorState('Failed to load critics choice'));
      }
    }
  }

  async loadGenreContent(genre, containerId) {
    try {
      ui.showSkeletonGrid(containerId);
      const data = await api.getGenreRecommendations(genre);
      ui.createContentGrid(data.recommendations || [], containerId);
    } catch (error) {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
        container.appendChild(ui.createErrorState('Failed to load genre content'));
      }
    }
  }

  // Helper to check if element is in viewport
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Setup infinite scroll
  setupInfiniteScroll(loadMoreFunction) {
    let isLoading = false;

    window.addEventListener('scroll', ui.debounce(async () => {
      if (isLoading) return;

      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollPosition >= documentHeight - 500) {
        isLoading = true;
        await loadMoreFunction();
        isLoading = false;
      }
    }, 200));
  }
}

// Create global app instance and initialize
window.app = new CineScopeApp();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});