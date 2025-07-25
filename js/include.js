// CineScope - Include Management
function initializeIncludes() {
    loadIncludes();
}

async function loadIncludes() {
    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        try {
            const headerResponse = await fetch('/includes/header.html');
            if (headerResponse.ok) {
                const headerHTML = await headerResponse.text();
                headerPlaceholder.innerHTML = headerHTML;
                initializeHeader();
            } else {
                // Fallback header
                headerPlaceholder.innerHTML = createFallbackHeader();
                initializeHeader();
            }
        } catch (error) {
            console.warn('Could not load header include, using fallback');
            headerPlaceholder.innerHTML = createFallbackHeader();
            initializeHeader();
        }
    }

    // Load footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        try {
            const footerResponse = await fetch('/includes/footer.html');
            if (footerResponse.ok) {
                const footerHTML = await footerResponse.text();
                footerPlaceholder.innerHTML = footerHTML;
            } else {
                footerPlaceholder.innerHTML = createFallbackFooter();
            }
        } catch (error) {
            console.warn('Could not load footer include, using fallback');
            footerPlaceholder.innerHTML = createFallbackFooter();
        }
    }
}

function createFallbackHeader() {
    const isAuthenticated = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    return `
        <nav class="navbar">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between h-16">
                    <!-- Logo -->
                    <div class="flex items-center">
                        <a href="/" class="text-2xl font-bold gradient-text">
                            CineScope
                        </a>
                    </div>

                    <!-- Desktop Navigation -->
                    <div class="hidden md:flex items-center space-x-8">
                        <a href="/" class="nav-link">Home</a>
                        <a href="/categories/movies" class="nav-link">Movies</a>
                        <a href="/categories/tv-shows" class="nav-link">TV Shows</a>
                        <a href="/categories/anime" class="nav-link">Anime</a>
                        <a href="/categories/trending" class="nav-link">Trending</a>
                    </div>

                    <!-- Search and User -->
                    <div class="flex items-center space-x-4">
                        <!-- Search -->
                        <div class="search-container hidden md:block">
                            <input type="text" id="searchInput" class="search-input" placeholder="Search movies, shows, anime...">
                            <i class="bi bi-search search-icon"></i>
                            <div id="searchResults" class="search-results hidden"></div>
                        </div>

                        <!-- User Menu -->
                        ${isAuthenticated ? `
                            <div class="dropdown">
                                <button id="userMenuBtn" class="flex items-center space-x-2 text-gray-300 hover:text-white">
                                    <i class="bi bi-person-circle text-2xl"></i>
                                    <span class="hidden lg:block">${user.username || 'User'}</span>
                                    <i class="bi bi-chevron-down"></i>
                                </button>
                                <div class="dropdown-content">
                                    ${user.is_admin ? '<a href="/admin/dashboard" class="dropdown-item"><i class="bi bi-shield-check mr-2"></i>Admin Dashboard</a>' : ''}
                                    <a href="/dashboard" class="dropdown-item"><i class="bi bi-speedometer2 mr-2"></i>Dashboard</a>
                                    <a href="/user/watchlist" class="dropdown-item"><i class="bi bi-bookmark mr-2"></i>Watchlist</a>
                                    <a href="/user/favorites" class="dropdown-item"><i class="bi bi-heart mr-2"></i>Favorites</a>
                                    <a href="/profile" class="dropdown-item"><i class="bi bi-person mr-2"></i>Profile</a>
                                    <button onclick="logout()" class="dropdown-item w-full text-left"><i class="bi bi-box-arrow-right mr-2"></i>Logout</button>
                                </div>
                            </div>
                        ` : `
                            <a href="/login" class="btn-primary text-sm">
                                <i class="bi bi-person-circle mr-1"></i>
                                Sign In
                            </a>
                        `}

                        <!-- Mobile Menu Button -->
                        <button id="mobileMenuBtn" class="md:hidden text-2xl">
                            <i class="bi bi-list"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Mobile Menu -->
            <div id="mobileMenu" class="mobile-menu">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold gradient-text">CineScope</h2>
                    <button id="closeMobileMenu" class="text-2xl">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                
                <!-- Mobile Search -->
                <div class="search-container mb-6">
                    <input type="text" id="mobileSearchInput" class="search-input" placeholder="Search...">
                    <i class="bi bi-search search-icon"></i>
                </div>

                <div class="space-y-4">
                    <a href="/" class="nav-link block">Home</a>
                    <a href="/categories/movies" class="nav-link block">Movies</a>
                    <a href="/categories/tv-shows" class="nav-link block">TV Shows</a>
                    <a href="/categories/anime" class="nav-link block">Anime</a>
                    <a href="/categories/trending" class="nav-link block">Trending</a>
                    
                    ${isAuthenticated ? `
                        <hr class="border-gray-600 my-4">
                        ${user.is_admin ? '<a href="/admin/dashboard" class="nav-link block"><i class="bi bi-shield-check mr-2"></i>Admin Dashboard</a>' : ''}
                        <a href="/dashboard" class="nav-link block"><i class="bi bi-speedometer2 mr-2"></i>Dashboard</a>
                        <a href="/user/watchlist" class="nav-link block"><i class="bi bi-bookmark mr-2"></i>Watchlist</a>
                        <a href="/user/favorites" class="nav-link block"><i class="bi bi-heart mr-2"></i>Favorites</a>
                        <a href="/profile" class="nav-link block"><i class="bi bi-person mr-2"></i>Profile</a>
                        <button onclick="logout()" class="nav-link block w-full text-left"><i class="bi bi-box-arrow-right mr-2"></i>Logout</button>
                    ` : `
                        <hr class="border-gray-600 my-4">
                        <a href="/login" class="btn-primary block text-center">Sign In</a>
                    `}
                </div>
            </div>
            <div id="mobileMenuOverlay" class="mobile-menu-overlay"></div>
        </nav>
    `;
}

function createFallbackFooter() {
    return `
        <footer class="bg-gray-800 border-t border-gray-700 py-12">
            <div class="container mx-auto px-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div class="col-span-1 md:col-span-2">
                        <h3 class="text-2xl font-bold gradient-text mb-4">CineScope</h3>
                        <p class="text-gray-400 mb-4">
                            Discover your next favorite movie, TV show, or anime with personalized recommendations and trending content.
                        </p>
                        <div class="flex space-x-4">
                            <a href="#" class="text-gray-400 hover:text-primary-400 transition-colors">
                                <i class="bi bi-facebook text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-400 hover:text-primary-400 transition-colors">
                                <i class="bi bi-twitter text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-400 hover:text-primary-400 transition-colors">
                                <i class="bi bi-instagram text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-400 hover:text-primary-400 transition-colors">
                                <i class="bi bi-youtube text-xl"></i>
                            </a>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-bold text-lg mb-4">Categories</h4>
                        <ul class="space-y-2">
                            <li><a href="/categories/movies" class="text-gray-400 hover:text-white transition-colors">Movies</a></li>
                            <li><a href="/categories/tv-shows" class="text-gray-400 hover:text-white transition-colors">TV Shows</a></li>
                            <li><a href="/categories/anime" class="text-gray-400 hover:text-white transition-colors">Anime</a></li>
                            <li><a href="/categories/trending" class="text-gray-400 hover:text-white transition-colors">Trending</a></li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="font-bold text-lg mb-4">Languages</h4>
                        <ul class="space-y-2">
                            <li><a href="/languages/english" class="text-gray-400 hover:text-white transition-colors">English</a></li>
                            <li><a href="/languages/hindi" class="text-gray-400 hover:text-white transition-colors">Hindi</a></li>
                            <li><a href="/languages/telugu" class="text-gray-400 hover:text-white transition-colors">Telugu</a></li>
                            <li><a href="/languages/tamil" class="text-gray-400 hover:text-white transition-colors">Tamil</a></li>
                        </ul>
                    </div>
                </div>
                
                <hr class="border-gray-700 my-8">
                
                <div class="flex flex-col md:flex-row items-center justify-between">
                    <p class="text-gray-400 mb-4 md:mb-0">
                        © 2024 CineScope. All rights reserved.
                    </p>
                    <div class="flex space-x-6">
                        <a href="#" class="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" class="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" class="text-gray-400 hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </div>
        </footer>
    `;
}

function initializeHeader() {
    // Initialize search functionality
    initializeSearch();
    
    // Initialize mobile menu
    initializeMobileMenu();
    
    // Initialize user dropdown
    initializeUserDropdown();
    
    // Initialize scroll effect
    initializeScrollEffect();
}

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    const searchResults = document.getElementById('searchResults');
    
    let searchTimeout;
    
    function performSearch(query) {
        if (query.length < 2) {
            hideSearchResults();
            return;
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    displaySearchResults(data.results || []);
                }
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    }
    
    function displaySearchResults(results) {
        if (!searchResults) return;
        
        if (results.length === 0) {
            hideSearchResults();
            return;
        }
        
        const resultsHTML = results.map(item => `
            <div class="search-result-item" onclick="goToDetails(${item.id})">
                <img src="${item.poster_path || '/assets/images/placeholder.jpg'}" 
                     alt="${item.title}" class="search-result-poster">
                <div>
                    <div class="font-semibold">${item.title}</div>
                    <div class="text-sm text-gray-400">
                        ${item.content_type.toUpperCase()} 
                        ${item.rating ? `• ${item.rating}/10` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        searchResults.innerHTML = resultsHTML;
        searchResults.classList.remove('hidden');
    }
    
    function hideSearchResults() {
        if (searchResults) {
            searchResults.classList.add('hidden');
        }
    }
    
    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', (e) => performSearch(e.target.value));
        searchInput.addEventListener('blur', () => setTimeout(hideSearchResults, 200));
    }
    
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('input', (e) => performSearch(e.target.value));
    }
    
    // Click outside to hide results
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSearchResults();
        }
    });
}

function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const closeMobileMenu = document.getElementById('closeMobileMenu');
    
    function showMobileMenu() {
        mobileMenu?.classList.add('active');
        mobileMenuOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function hideMobileMenu() {
        mobileMenu?.classList.remove('active');
        mobileMenuOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    mobileMenuBtn?.addEventListener('click', showMobileMenu);
    closeMobileMenu?.addEventListener('click', hideMobileMenu);
    mobileMenuOverlay?.addEventListener('click', hideMobileMenu);
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideMobileMenu();
        }
    });
}

function initializeUserDropdown() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const dropdown = userMenuBtn?.closest('.dropdown');
    
    if (userMenuBtn && dropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });
    }
}

function initializeScrollEffect() {
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
}

// Global navigation functions
function goToDetails(contentId) {
    window.location.href = `/details?id=${contentId}`;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}