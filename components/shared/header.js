// Header Component
class Header {
    constructor() {
        this.isMenuOpen = false;
    }

    render() {
        const isAuth = AuthService.isAuthenticated();
        const user = AuthService.getUser();
        const isAdmin = AuthService.isAdmin();

        return `
            <header class="sticky top-0 z-50 bg-primary-bg border-b border-border-color">
                <nav class="container mx-auto px-4 py-3">
                    <div class="flex items-center justify-between">
                        <!-- Logo -->
                        <a href="/" class="flex items-center space-x-2">
                            <i class="fas fa-film text-netflix-red text-2xl"></i>
                            <span class="text-xl font-bold">MovieRec</span>
                        </a>

                        <!-- Desktop Navigation -->
                        <div class="hidden md:flex items-center space-x-6">
                            <a href="/" class="hover:text-netflix-red transition">Home</a>
                            ${isAuth ? `
                                <a href="/favorites" class="hover:text-netflix-red transition">My List</a>
                                ${isAdmin ? `
                                    <a href="/admin" class="hover:text-netflix-red transition">Admin</a>
                                ` : ''}
                            ` : ''}
                        </div>

                        <!-- Right Section -->
                        <div class="flex items-center space-x-4">
                            <!-- Search -->
                            <button onclick="HeaderInstance.openSearch()" class="hover:text-netflix-red transition">
                                <i class="fas fa-search text-lg"></i>
                            </button>

                            ${isAuth ? `
                                <!-- User Menu -->
                                <div class="relative">
                                    <button onclick="HeaderInstance.toggleUserMenu()" class="flex items-center space-x-2 hover:text-netflix-red transition">
                                        <i class="fas fa-user-circle text-lg"></i>
                                        <span class="hidden md:inline">${user.username}</span>
                                        <i class="fas fa-chevron-down text-xs"></i>
                                    </button>
                                    
                                    <!-- Dropdown -->
                                    <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-secondary-bg rounded-lg shadow-lg overflow-hidden">
                                        <a href="/profile" class="block px-4 py-2 hover:bg-hover-bg transition">Profile</a>
                                        ${isAdmin ? `
                                            <a href="/admin" class="block px-4 py-2 hover:bg-hover-bg transition">Admin Panel</a>
                                        ` : ''}
                                        <hr class="border-border-color">
                                        <button onclick="AuthService.logout()" class="w-full text-left px-4 py-2 hover:bg-hover-bg transition">
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            ` : `
                                <!-- Login Button -->
                                <button onclick="HeaderInstance.openLoginModal()" class="bg-netflix-red hover:bg-hover-red px-4 py-2 rounded transition">
                                    Sign In
                                </button>
                            `}

                            <!-- Mobile Menu Toggle -->
                            <button onclick="HeaderInstance.toggleMobileMenu()" class="md:hidden">
                                <i class="fas fa-bars text-lg"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Mobile Menu -->
                    <div id="mobile-menu" class="hidden md:hidden mt-4 pb-4">
                        <a href="/" class="block py-2 hover:text-netflix-red transition">Home</a>
                        ${isAuth ? `
                            <a href="/favorites" class="block py-2 hover:text-netflix-red transition">My List</a>
                            ${isAdmin ? `
                                <a href="/admin" class="block py-2 hover:text-netflix-red transition">Admin</a>
                            ` : ''}
                        ` : ''}
                    </div>
                </nav>

                <!-- Search Bar -->
                <div id="search-bar" class="hidden bg-secondary-bg">
                    <div class="container mx-auto px-4 py-3">
                        <form onsubmit="HeaderInstance.handleSearch(event)" class="flex">
                            <input 
                                type="text" 
                                id="search-input"
                                placeholder="Search movies, TV shows, anime..."
                                class="flex-1 bg-primary-bg border border-border-color rounded-l px-4 py-2 focus:outline-none focus:border-netflix-red"
                            >
                            <button type="submit" class="bg-netflix-red hover:bg-hover-red px-6 py-2 rounded-r transition">
                                <i class="fas fa-search"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </header>
        `;
    }

    toggleUserMenu() {
        const menu = document.getElementById('user-menu');
        menu.classList.toggle('hidden');
    }

    toggleMobileMenu() {
        const menu = document.getElementById('mobile-menu');
        menu.classList.toggle('hidden');
    }

    openSearch() {
        const searchBar = document.getElementById('search-bar');
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden')) {
            document.getElementById('search-input').focus();
        }
    }

    handleSearch(event) {
        event.preventDefault();
        const query = document.getElementById('search-input').value.trim();
        if (query) {
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
    }

    openLoginModal() {
        const modal = new Modal({
            title: 'Sign In',
            content: new LoginForm().render(),
            size: 'small'
        });
        modal.show();
    }

    init() {
        document.getElementById('header').innerHTML = this.render();
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.relative')) {
                const userMenu = document.getElementById('user-menu');
                if (userMenu) userMenu.classList.add('hidden');
            }
        });
    }
}

// Create global instance
const HeaderInstance = new Header();
