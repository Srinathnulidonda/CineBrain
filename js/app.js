// CineScope Application Core
window.CineScope.App = {
  // Application state
  state: {
    isInitialized: false,
    currentUser: null,
    currentRoute: null,
    isLoading: false
  },

  // Initialize application
  async init() {
    try {
      console.log('🎬 Initializing CineScope...');

      // Check if already initialized
      if (this.state.isInitialized) {
        console.log('✅ CineScope already initialized');
        return;
      }

      // Set loading state
      this.state.isLoading = true;

      // Initialize user session
      await this.initUserSession();

      // Load layout components
      await this.loadLayouts();

      // Setup navigation
      this.setupNavigation();

      // Setup route guards
      this.setupRouteGuards();

      // Initialize UI components
      this.initUIComponents();

      // Setup error handling
      this.setupErrorHandling();

      // Mark as initialized
      this.state.isInitialized = true;
      this.state.isLoading = false;

      console.log('✅ CineScope initialized successfully');

      // Trigger custom event
      document.dispatchEvent(new CustomEvent('cinescope:ready'));

    } catch (error) {
      console.error('❌ CineScope initialization failed:', error);
      this.state.isLoading = false;
      CineScope.UI.toast.error('Application failed to initialize: ' + error.message);
    }
  },

  // Initialize user session
  async initUserSession() {
    try {
      // Check if user is logged in
      if (CineScope.Storage.user.isLoggedIn()) {
        this.state.currentUser = CineScope.Storage.user.get();
        console.log('✅ User session restored:', this.state.currentUser.username);
      } else {
        console.log('ℹ️ No active user session');
      }
    } catch (error) {
      console.error('❌ User session initialization failed:', error);
      // Clear potentially corrupted session data
      CineScope.Storage.clearAll();
    }
  },

  // Load layout components
  async loadLayouts() {
    try {
      const layoutPromises = [];

      // Load topbar for desktop
      if (window.innerWidth >= CineScope.NAV.DESKTOP_BREAKPOINT) {
        layoutPromises.push(this.loadComponent('layouts/topbar.html', '#topbar-container'));
      }

      // Load mobile navigation for mobile
      if (window.innerWidth < CineScope.NAV.DESKTOP_BREAKPOINT) {
        layoutPromises.push(this.loadComponent('layouts/mobile-nav.html', '#mobile-nav-container'));
      }

      // Load common components
      layoutPromises.push(this.loadComponent('layouts/offcanvas-filters.html', 'body'));

      await Promise.all(layoutPromises);
      console.log('✅ Layout components loaded');
    } catch (error) {
      console.error('❌ Layout loading failed:', error);
    }
  },

  // Load component from file
  async loadComponent(path, targetSelector) {
    try {
      const response = await fetch(`/${path}`);
      if (!response.ok) throw new Error(`Failed to load ${path}`);

      const html = await response.text();
      const target = document.querySelector(targetSelector);

      if (target) {
        if (targetSelector === 'body') {
          target.insertAdjacentHTML('beforeend', html);
        } else {
          target.innerHTML = html;
        }
      }
    } catch (error) {
      console.warn(`Component ${path} not found or failed to load:`, error);
    }
  },

  // Setup navigation
  setupNavigation() {
    try {
      // Update navigation based on user state
      this.updateNavigation();

      // Handle responsive navigation
      window.addEventListener('resize', CineScope.utils.throttle(() => {
        this.handleResponsiveNav();
      }, 250));

      // Setup search functionality if search elements exist
      this.setupSearchNavigation();

      console.log('✅ Navigation setup complete');
    } catch (error) {
      console.error('❌ Navigation setup failed:', error);
    }
  },

  // Update navigation based on user state
  updateNavigation() {
    const isLoggedIn = this.state.currentUser !== null;
    const username = this.state.currentUser?.username;

    // Update desktop navigation
    const userMenu = document.querySelector('#user-menu');
    const authButtons = document.querySelector('#auth-buttons');
    const searchForm = document.querySelector('#search-form');

    if (isLoggedIn && username) {
      // Show user menu, hide auth buttons
      if (userMenu) {
        userMenu.classList.remove('d-none');
        userMenu.querySelector('.username')?.textContent = username;
      }
      if (authButtons) authButtons.classList.add('d-none');

      // Update search form action
      if (searchForm) {
        searchForm.action = `/${username}/search`;
      }

      // Update navigation links with username
      this.updateNavigationLinks(username);
    } else {
      // Show auth buttons, hide user menu
      if (userMenu) userMenu.classList.add('d-none');
      if (authButtons) authButtons.classList.remove('d-none');

      // Reset search form
      if (searchForm) {
        searchForm.action = '/search';
      }
    }

    // Update mobile navigation
    this.updateMobileNavigation(isLoggedIn, username);
  },

  // Update navigation links with username
  updateNavigationLinks(username) {
    const links = document.querySelectorAll('[data-user-route]');
    links.forEach(link => {
      const route = link.getAttribute('data-user-route');
      link.href = CineScope.utils.buildUserRoute(username, route);
    });
  },

  // Update mobile navigation
  updateMobileNavigation(isLoggedIn, username) {
    const mobileNav = document.querySelector('#mobile-nav');
    if (!mobileNav) return;

    const navItems = mobileNav.querySelectorAll('[data-user-route]');
    navItems.forEach(item => {
      if (isLoggedIn && username) {
        const route = item.getAttribute('data-user-route');
        item.href = CineScope.utils.buildUserRoute(username, route);
        item.classList.remove('d-none');
      } else {
        item.classList.add('d-none');
      }
    });

    // Show/hide login nav item
    const loginItem = mobileNav.querySelector('[href="/login"]');
    if (loginItem) {
      loginItem.classList.toggle('d-none', isLoggedIn);
    }
  },

  // Handle responsive navigation
  handleResponsiveNav() {
    const width = window.innerWidth;
    const isDesktop = width >= CineScope.NAV.DESKTOP_BREAKPOINT;

    // Toggle navigation visibility
    const topbar = document.querySelector('#topbar-container');
    const mobileNav = document.querySelector('#mobile-nav-container');

    if (topbar) topbar.style.display = isDesktop ? 'block' : 'none';
    if (mobileNav) mobileNav.style.display = isDesktop ? 'none' : 'block';
  },

  // Setup search navigation
  setupSearchNavigation() {
    const searchInput = document.querySelector('#nav-search-input');
    const searchForm = document.querySelector('#search-form');

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput?.value.trim();
        if (query) {
          this.navigateToSearch(query);
        }
      });
    }
  },

  // Navigate to search page
  navigateToSearch(query) {
    const username = this.state.currentUser?.username;
    const searchUrl = username ?
      CineScope.utils.buildUserRoute(username, 'search', `?query=${encodeURIComponent(query)}`) :
      `/search?query=${encodeURIComponent(query)}`;

    window.location.href = searchUrl;
  },

  // Setup route guards
  setupRouteGuards() {
    // Check if current route requires authentication
    if (CineScope.utils.isProtectedRoute()) {
      const username = CineScope.utils.getCurrentUsername();
      const currentUser = this.state.currentUser;

      // If not logged in, redirect to login
      if (!currentUser) {
        console.log('🚫 Protected route access denied - redirecting to login');
        this.redirectToLogin();
        return;
      }

      // If username doesn't match current user, redirect to correct route
      if (username !== currentUser.username) {
        console.log('🚫 Username mismatch - redirecting to correct route');
        const path = window.location.pathname;
        const segments = path.split('/');
        segments[1] = currentUser.username; // Replace username
        window.location.href = segments.join('/');
        return;
      }
    }

    console.log('✅ Route guards passed');
  },

  // Redirect to login
  redirectToLogin() {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?return=${returnUrl}`;
  },

  // Initialize UI components
  initUIComponents() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Initialize lazy loading
    CineScope.UI.lazyLoadImages();

    // Setup theme handling
    this.setupTheme();

    console.log('✅ UI components initialized');
  },

  // Setup theme
  setupTheme() {
    // Apply saved theme or default to dark
    const savedTheme = localStorage.getItem(CineScope.Storage.KEYS.THEME_PREFERENCE) || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
  },

  // Setup global error handling
  setupErrorHandling() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      CineScope.UI.toast.error('An unexpected error occurred');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      CineScope.UI.toast.error('A network error occurred');
    });

    // Handle offline/online status
    window.addEventListener('offline', () => {
      CineScope.UI.toast.warning('You are now offline. Some features may not work.');
    });

    window.addEventListener('online', () => {
      CineScope.UI.toast.success('You are back online.');
    });

    console.log('✅ Error handling setup complete');
  },

  // User authentication methods
  async login(credentials) {
    try {
      const response = await CineScope.HTTP.auth.login(credentials);
      this.state.currentUser = response.user;
      this.updateNavigation();

      // Redirect to user profile
      const returnUrl = new URLSearchParams(window.location.search).get('return');
      const redirectUrl = returnUrl || CineScope.utils.buildUserRoute(response.user.username, 'profile');

      window.location.href = redirectUrl;

      return response;
    } catch (error) {
      throw error;
    }
  },

  async register(userData) {
    try {
      const response = await CineScope.HTTP.auth.register(userData);
      this.state.currentUser = response.user;
      this.updateNavigation();

      // Redirect to user profile
      window.location.href = CineScope.utils.buildUserRoute(response.user.username, 'profile');

      return response;
    } catch (error) {
      throw error;
    }
  },

  logout() {
    CineScope.HTTP.auth.logout();
    this.state.currentUser = null;
    this.updateNavigation();
  },

  // Utility methods
  getCurrentUser() {
    return this.state.currentUser;
  },

  isLoggedIn() {
    return this.state.currentUser !== null;
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      this.redirectToLogin();
      return false;
    }
    return true;
  },

  // Content interaction shortcuts
  async viewContent(contentId) {
    if (this.isLoggedIn()) {
      try {
        await CineScope.HTTP.user.recordInteraction(contentId, 'view');
      } catch (error) {
        console.warn('Failed to record view interaction:', error);
      }
    }
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CineScope.App.init();
});

// Additional initialization for pages that load after navigation
window.addEventListener('load', () => {
  if (!CineScope.App.state.isInitialized) {
    CineScope.App.init();
  }
});