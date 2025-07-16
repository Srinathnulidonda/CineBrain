/**
 * Header Component
 * Handles navigation, search, and user authentication UI
 */

class HeaderComponent {
    constructor() {
        this.isScrolled = false;
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.updateAuthState();
    }

    render() {
        const header = document.getElementById('mainHeader');
        header.innerHTML = `
            <nav class="navbar navbar-expand-lg app-header">
                <div class="container-fluid">
                    <!-- Brand -->
                    <a class="navbar-brand" href="/">
                        <i class="fas fa-film me-2"></i>MovieFlix
                    </a>

                    <!-- Mobile Toggle -->
                    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <i class="fas fa-bars text-white"></i>
                    </button>

                    <!-- Navigation -->
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto">
                            <li class="nav-item">
                                <a class="nav-link active" href="/" data-page="home">
                                    <i class="fas fa-home me-1"></i>Home
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/pages/search.html" data-page="search">
                                    <i class="fas fa-search me-1"></i>Browse
                                </a>
                            </li>
                            <li class="nav-item d-none" id="favoritesNavItem">
                                <a class="nav-link" href="/pages/favorites.html" data-page="favorites">
                                    <i class="fas fa-heart me-1"></i>My List
                                </a>
                            </li>
                        </ul>

                        <!-- Search Bar -->
                        <div class="search-container me-3 d-none d-md-block">
                            <input type="text" class="search-input" placeholder="Search movies, TV shows..." id="headerSearch">
                            <i class="fas fa-search search-icon"></i>
                            <div class="search-suggestions" id="searchSuggestions" style="display: none;"></div>
                        </div>

                        <!-- User Actions -->
                        <div class="d-flex align-items-center">
                            <!-- Notifications -->
                            <div class="dropdown me-3 d-none" id="notificationsDropdown">
                                <button class="btn btn-link text-white p-1" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-bell"></i>
                                    <span class="badge bg-netflix-red rounded-pill" id="notificationCount">0</span>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end bg-netflix-gray border-0">
                                    <li><h6 class="dropdown-header text-white">Notifications</h6></li>
                                    <li><div id="notificationsList" class="px-3 py-2 text-white">No new notifications</div></li>
                                </ul>
                            </div>

                            <!-- Auth Buttons / User Menu -->
                            <div id="authContainer">
                                <!-- Will be populated by updateAuthState -->
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }

    setupEventListeners() {
        // Scroll detection
        window.addEventListener('scroll', this.handleScroll.bind(this));

        // Navigation links
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                this.setActiveNav(e.target.closest('.nav-link'));
            });
        });

        // Search functionality
        const searchInput = document.getElementById('headerSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
            searchInput.addEventListener('focus', this.showSearchSuggestions.bind(this));
            searchInput.addEventListener('blur', this.hideSearchSuggestions.bind(this));
        }

        // Click outside to close search
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchSuggestions();
            }
        });
    }

    handleScroll() {
        const scrolled = window.scrollY > 50;
        if (scrolled !== this.isScrolled) {
            this.isScrolled = scrolled;
            const header = document.querySelector('.app-header');
            header.classList.toggle('scrolled', scrolled);
        }
    }

    setActiveNav(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    async handleSearch(e) {
        const query = e.target.value.trim();
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (query.length < 2) {
            this.hideSearchSuggestions();
            return;
        }

        this.searchTimeout = setTimeout(async () => {
            try {
                const response = await apiService.searchContent(query);
                if (response.success) {
                    this.showSearchResults(response.data);
                }
            } catch (error) {
                console.error('Search failed:', error);
            }
        }, 300);
    }

    showSearchResults(data) {
        const suggestions = document.getElementById('searchSuggestions');
        const results = [...(data.database_results || []), ...(data.tmdb_results || [])];
        
        if (results.length === 0) {
            suggestions.innerHTML = '<div class="search-suggestion">No results found</div>';
        } else {
            suggestions.innerHTML = results.slice(0, 5).map(item => `
                <div class="search-suggestion" data-content-id="${item.id}" data-tmdb-id="${item.tmdb_id || item.id}">
                    <div class="d-flex align-items-center">
                        <img src="${apiService.getImageUrl(item.poster_path)}" 
                             alt="${item.title || item.name}" 
                             class="me-2" 
                             style="width: 40px; height: 60px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <div class="fw-bold">${item.title || item.name}</div>
                            <small class="text-muted">${apiService.formatDate(item.release_date || item.first_air_date)}</small>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            suggestions.querySelectorAll('.search-suggestion').forEach(suggestion => {
                suggestion.addEventListener('click', (e) => {
                    const contentId = e.currentTarget.dataset.contentId;
                    const tmdbId = e.currentTarget.dataset.tmdbId;
                    this.openContentDetails(contentId, tmdbId);
                    this.hideSearchSuggestions();
                });
            });
        }

        this.showSearchSuggestions();
    }

    showSearchSuggestions() {
        const suggestions = document.getElementById('searchSuggestions');
        suggestions.style.display = 'block';
    }

    hideSearchSuggestions() {
        setTimeout(() => {
            const suggestions = document.getElementById('searchSuggestions');
            suggestions.style.display = 'none';
        }, 200);
    }

    openContentDetails(contentId, tmdbId) {
        if (window.ModalComponent) {
            window.ModalComponent.showContentDetails(contentId, tmdbId);
        }
    }

    updateAuthState() {
        const authContainer = document.getElementById('authContainer');
        const favoritesNavItem = document.getElementById('favoritesNavItem');
        
        if (authService.isAuthenticated()) {
            const user = authService.getCurrentUser();
            
            authContainer.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-link text-white p-1 d-flex align-items-center" type="button" data-bs-toggle="dropdown">
                        <div class="profile-avatar me-2" style="width: 32px; height: 32px; font-size: 0.8rem;">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <span class="d-none d-lg-inline">${user.username}</span>
                        <i class="fas fa-chevron-down ms-2"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end bg-netflix-gray border-0">
                        <li>
                            <a class="dropdown-item text-white" href="/pages/profile.html">
                                <i class="fas fa-user me-2"></i>Profile
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item text-white" href="/pages/favorites.html">
                                <i class="fas fa-heart me-2"></i>My List
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <button class="dropdown-item text-white" onclick="authService.logout()">
                                <i class="fas fa-sign-out-alt me-2"></i>Sign Out
                            </button>
                        </li>
                    </ul>
                </div>
            `;
            
            favoritesNavItem.classList.remove('d-none');
        } else {
            authContainer.innerHTML = `
                <div class="d-flex gap-2">
                    <a href="/pages/login.html" class="btn btn-outline-netflix btn-sm">
                        <i class="fas fa-sign-in-alt me-1"></i>Sign In
                    </a>
                    <a href="/pages/register.html" class="btn btn-netflix btn-sm">
                        <i class="fas fa-user-plus me-1"></i>Join Now
                    </a>
                </div>
            `;
            
            favoritesNavItem.classList.add('d-none');
        }
    }

    // Public methods
    showNotification(message, type = 'info') {
        const notificationsList = document.getElementById('notificationsList');
        const notificationCount = document.getElementById('notificationCount');
        
        // Implementation for notifications
        // This would integrate with a real-time notification system
    }

    setSearchQuery(query) {
        const searchInput = document.getElementById('headerSearch');
        if (searchInput) {
            searchInput.value = query;
        }
    }
}

// Initialize and export
window.HeaderComponent = new HeaderComponent();
