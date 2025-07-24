// Include Management System
const IncludeManager = {
    cache: new Map(),
    
    async loadInclude(path) {
        // Check cache first
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }
        
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.status}`);
            }
            
            const content = await response.text();
            this.cache.set(path, content);
            return content;
        } catch (error) {
            console.error('Include load error:', error);
            return this.getFallbackContent(path);
        }
    },
    
    getFallbackContent(path) {
        if (path.includes('header')) {
            return this.getHeaderFallback();
        } else if (path.includes('footer')) {
            return this.getFooterFallback();
        }
        return '';
    },
    
    getHeaderFallback() {
        return `
            <header class="main-header">
                <nav class="navbar navbar-expand-lg">
                    <div class="container">
                        <a class="navbar-brand" href="/">
                            <i class="fas fa-film me-2"></i>
                            <span class="brand-text">CineScope</span>
                        </a>
                        
                        <button class="btn btn-outline-primary d-lg-none me-2" id="mobileSearchToggle">
                            <i class="fas fa-search"></i>
                        </button>
                        
                        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                            <span class="navbar-toggler-icon"></span>
                        </button>
                        
                        <div class="collapse navbar-collapse" id="navbarNav">
                            <div class="search-container d-none d-lg-flex mx-auto">
                                <div class="search-input-group">
                                    <input type="text" id="searchInput" class="form-control" placeholder="Search movies, TV shows, anime...">
                                    <button class="btn btn-primary" id="searchBtn">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                                <div id="searchSuggestions" class="search-suggestions"></div>
                            </div>
                            
                            <ul class="navbar-nav ms-auto">
                                <li class="nav-item">
                                    <a class="nav-link" href="/">Home</a>
                                </li>
                                <li class="nav-item dropdown">
                                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                        Categories
                                    </a>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item" href="/categories/trending">Trending</a></li>
                                        <li><a class="dropdown-item" href="/categories/popular">Popular</a></li>
                                        <li><a class="dropdown-item" href="/categories/new-releases">New Releases</a></li>
                                        <li><a class="dropdown-item" href="/categories/critic-choices">Critics Choice</a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item" href="/categories/movies">Movies</a></li>
                                        <li><a class="dropdown-item" href="/categories/tv-shows">TV Shows</a></li>
                                        <li><a class="dropdown-item" href="/categories/anime">Anime</a></li>
                                    </ul>
                                </li>
                                <li class="nav-item dropdown">
                                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                        Languages
                                    </a>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item" href="/languages/english">English</a></li>
                                        <li><a class="dropdown-item" href="/languages/hindi">Hindi</a></li>
                                        <li><a class="dropdown-item" href="/languages/telugu">Telugu</a></li>
                                        <li><a class="dropdown-item" href="/languages/tamil">Tamil</a></li>
                                        <li><a class="dropdown-item" href="/languages/kannada">Kannada</a></li>
                                        <li><a class="dropdown-item" href="/languages/malayalam">Malayalam</a></li>
                                    </ul>
                                </li>
                                <li class="nav-item" id="userNavItem" style="display: none;">
                                    <div class="dropdown">
                                        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                            <i class="fas fa-user-circle me-1"></i>
                                            <span id="userNameDisplay"></span>
                                        </a>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item" href="/dashboard">Dashboard</a></li>
                                            <li><a class="dropdown-item" href="/user/watchlist">Watchlist</a></li>
                                            <li><a class="dropdown-item" href="/user/favorites">Favorites</a></li>
                                            <li><a class="dropdown-item" href="/profile">Profile</a></li>
                                            <li><hr class="dropdown-divider"></li>
                                            <li><a class="dropdown-item" href="#" id="logoutBtn">Logout</a></li>
                                        </ul>
                                    </div>
                                </li>
                                <li class="nav-item" id="loginNavItem">
                                    <a class="nav-link btn btn-primary px-3" href="/login">Login</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>
                
                <div id="mobileSearchBar" class="mobile-search-bar d-lg-none">
                    <div class="container">
                        <div class="search-input-group">
                            <input type="text" id="mobileSearchInput" class="form-control" placeholder="Search...">
                            <button class="btn btn-primary" id="mobileSearchBtn">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        `;
    },
    
    getFooterFallback() {
        return `
            <footer class="main-footer">
                <div class="container">
                    <div class="row">
                        <div class="col-lg-4 mb-4">
                            <div class="footer-brand">
                                <i class="fas fa-film me-2"></i>
                                <span>CineScope</span>
                            </div>
                            <p class="footer-description">
                                Your ultimate destination for discovering amazing movies, TV shows, and anime from around the world.
                            </p>
                            <div class="social-links">
                                <a href="#"><i class="fab fa-twitter"></i></a>
                                <a href="#"><i class="fab fa-facebook"></i></a>
                                <a href="#"><i class="fab fa-instagram"></i></a>
                                <a href="#"><i class="fab fa-youtube"></i></a>
                            </div>
                        </div>
                        <div class="col-lg-2 col-md-6 mb-4">
                            <h6 class="footer-title">Categories</h6>
                            <ul class="footer-links">
                                <li><a href="/categories/movies">Movies</a></li>
                                <li><a href="/categories/tv-shows">TV Shows</a></li>
                                <li><a href="/categories/anime">Anime</a></li>
                                <li><a href="/categories/trending">Trending</a></li>
                            </ul>
                        </div>
                        <div class="col-lg-2 col-md-6 mb-4">
                            <h6 class="footer-title">Languages</h6>
                            <ul class="footer-links">
                                <li><a href="/languages/english">English</a></li>
                                <li><a href="/languages/hindi">Hindi</a></li>
                                <li><a href="/languages/telugu">Telugu</a></li>
                                <li><a href="/languages/tamil">Tamil</a></li>
                            </ul>
                        </div>
                        <div class="col-lg-2 col-md-6 mb-4">
                            <h6 class="footer-title">Support</h6>
                            <ul class="footer-links">
                                <li><a href="/help">Help Center</a></li>
                                <li><a href="/contact">Contact Us</a></li>
                                <li><a href="/privacy">Privacy Policy</a></li>
                                <li><a href="/terms">Terms of Service</a></li>
                            </ul>
                        </div>
                        <div class="col-lg-2 col-md-6 mb-4">
                            <h6 class="footer-title">Account</h6>
                            <ul class="footer-links">
                                <li><a href="/login">Login</a></li>
                                <li><a href="/dashboard">Dashboard</a></li>
                                <li><a href="/user/watchlist">Watchlist</a></li>
                                <li><a href="/user/favorites">Favorites</a></li>
                            </ul>
                        </div>
                    </div>
                    <hr class="footer-divider">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <p class="footer-copyright">
                                &copy; 2024 CineScope. All rights reserved.
                            </p>
                        </div>
                        <div class="col-md-6 text-md-end">
                            <p class="footer-credits">
                                Made with <i class="fas fa-heart text-danger"></i> for movie lovers
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }
};

// Global functions for easy use
async function loadHeader() {
    try {
        const headerContent = await IncludeManager.loadInclude('../includes/header.html');
        const headerContainer = document.getElementById('headerContainer');
        if (headerContainer) {
            headerContainer.innerHTML = headerContent;
            
            // Re-initialize search and auth after loading
            setTimeout(() => {
                SearchManager.init();
                AuthManager.init();
            }, 100);
        }
    } catch (error) {
        console.error('Failed to load header:', error);
        // Use fallback
        const headerContainer = document.getElementById('headerContainer');
        if (headerContainer) {
            headerContainer.innerHTML = IncludeManager.getHeaderFallback();
            SearchManager.init();
            AuthManager.init();
        }
    }
}

async function loadFooter() {
    try {
        const footerContent = await IncludeManager.loadInclude('../includes/footer.html');
        const footerContainer = document.getElementById('footerContainer');
        if (footerContainer) {
            footerContainer.innerHTML = footerContent;
        }
    } catch (error) {
        console.error('Failed to load footer:', error);
        // Use fallback
        const footerContainer = document.getElementById('footerContainer');
        if (footerContainer) {
            footerContainer.innerHTML = IncludeManager.getFooterFallback();
        }
    }
}