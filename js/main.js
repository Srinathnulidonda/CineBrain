// Main Application Controller
class App {
    constructor() {
        this.currentUser = null;
        this.searchTimeout = null;
        this.initializeApp();
    }

    async initializeApp() {
        // Initialize auth state
        await AuthManager.checkAuthState();
        
        // Load includes
        await this.loadIncludes();
        
        // Initialize components
        this.initializeComponents();
        
        // Load page-specific content
        this.loadPageContent();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    async loadIncludes() {
        try {
            const includes = [
                { selector: '[data-include="header"]', file: '/includes/header.html' },
                { selector: '[data-include="footer"]', file: '/includes/footer.html' },
                { selector: '[data-include="sidebar"]', file: '/includes/sidebar.html' }
            ];

            for (const include of includes) {
                const elements = document.querySelectorAll(include.selector);
                if (elements.length > 0) {
                    const response = await fetch(include.file);
                    if (response.ok) {
                        const html = await response.text();
                        elements.forEach(element => {
                            element.innerHTML = html;
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading includes:', error);
        }
    }

    initializeComponents() {
        // Initialize dropdowns
        this.initializeDropdowns();
        
        // Initialize search
        this.initializeSearch();
        
        // Initialize mobile menu
        this.initializeMobileMenu();
        
        // Initialize scroll effects
        this.initializeScrollEffects();
        
        // Initialize lazy loading
        this.initializeLazyLoading();
    }

    initializeDropdowns() {
        document.addEventListener('click', (e) => {
            // Close all dropdowns when clicking outside
            if (!e.target.closest('.nav-dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.opacity = '0';
                    menu.style.visibility = 'hidden';
                    menu.style.transform = 'translateY(-10px)';
                });
            }
        });
    }

    initializeSearch() {
        const searchInput = document.getElementById('globalSearch');
        const searchResults = document.getElementById('searchResults');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                if (this.searchTimeout) {
                    clearTimeout(this.searchTimeout);
                }

                if (query.length >= 2) {
                    this.searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 300);
                } else {
                    searchResults.classList.add('hidden');
                }
            });

            // Hide search results when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    searchResults.classList.add('hidden');
                }
            });
        }
    }

    async performSearch(query) {
        const searchResults = document.getElementById('searchResults');
        
        try {
            searchResults.innerHTML = '<div class="p-4 text-center"><div class="spinner mx-auto"></div></div>';
            searchResults.classList.remove('hidden');

            const response = await APIService.searchContent(query);
            
            if (response.results && response.results.length > 0) {
                const resultsHTML = response.results.slice(0, 6).map(item => `
                    <div class="search-result-item" onclick="window.location.href='/details?id=${item.id}'">
                        <img src="${item.poster_path || '/assets/images/placeholder.jpg'}" 
                             alt="${item.title}" 
                             class="w-12 h-16 object-cover rounded mr-3 flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-white truncate">${item.title}</div>
                            <div class="text-sm text-gray-400">${item.content_type.toUpperCase()}</div>
                            ${item.rating ? `<div class="text-xs text-yellow-400"><i class="fas fa-star"></i> ${item.rating.toFixed(1)}</div>` : ''}
                        </div>
                    </div>
                `).join('');

                searchResults.innerHTML = resultsHTML + 
                    `<div class="p-3 border-t border-gray-700">
                        <a href="/search?q=${encodeURIComponent(query)}" class="text-primary-500 hover:text-primary-400 text-sm">
                            View all results for "${query}"
                        </a>
                    </div>`;
            } else {
                searchResults.innerHTML = `
                    <div class="p-4 text-center text-gray-400">
                        No results found for "${query}"
                    </div>
                `;
            }
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = `
                <div class="p-4 text-center text-red-400">
                    Search error. Please try again.
                </div>
            `;
        }
    }

    initializeMobileMenu() {
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileNav = document.querySelector('.mobile-nav');

        if (mobileMenuToggle && mobileNav) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileNav.classList.toggle('hidden');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            });
        }
    }

    initializeScrollEffects() {
        const header = document.querySelector('.header-glass');
        
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 100) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            });
        }
    }

    initializeLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px'
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    setupEventListeners() {
        // Global error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
        });

        // Handle navigation
        window.addEventListener('popstate', () => {
            this.loadPageContent();
        });

        // Handle auth state changes
        document.addEventListener('authStateChanged', (e) => {
            this.handleAuthStateChange(e.detail);
        });
    }

    handleAuthStateChange(user) {
        this.currentUser = user;
        this.updateUserInterface();
    }

    updateUserInterface() {
        const guestMenu = document.getElementById('guestMenu');
        const authMenu = document.getElementById('authMenu');
        const adminMenu = document.getElementById('adminMenu');

        if (!guestMenu || !authMenu || !adminMenu) return;

        if (this.currentUser) {
            guestMenu.classList.add('hidden');
            
            if (this.currentUser.is_admin) {
                adminMenu.classList.remove('hidden');
                authMenu.classList.add('hidden');
            } else {
                authMenu.classList.remove('hidden');
                adminMenu.classList.add('hidden');
            }
        } else {
            guestMenu.classList.remove('hidden');
            authMenu.classList.add('hidden');
            adminMenu.classList.add('hidden');
        }
    }

    loadPageContent() {
        const path = window.location.pathname;
        const page = this.getPageFromPath(path);
        
        // Load page-specific content
        switch (page) {
            case 'home':
                this.loadHomePage();
                break;
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'details':
                this.loadDetailsPage();
                break;
            case 'category':
                this.loadCategoryPage();
                break;
            case 'language':
                this.loadLanguagePage();
                break;
            case 'admin':
                this.loadAdminPage();
                break;
            default:
                console.log('Page not handled:', page);
        }
    }

    getPageFromPath(path) {
        if (path === '/' || path === '/index.html') return 'home';
        if (path.startsWith('/dashboard')) return 'dashboard';
        if (path.startsWith('/details')) return 'details';
        if (path.startsWith('/categories/')) return 'category';
        if (path.startsWith('/languages/')) return 'language';
        if (path.startsWith('/admin/')) return 'admin';
        if (path.startsWith('/user/')) return 'user';
        return 'other';
    }

    async loadHomePage() {
        if (this.currentUser) {
            await this.loadPersonalizedHome();
        } else {
            await this.loadAnonymousHome();
        }
    }

    async loadPersonalizedHome() {
        try {
            // Load personalized recommendations
            const sections = [
                { id: 'trending', title: 'Trending Now', endpoint: '/api/recommendations/trending' },
                { id: 'personalized', title: 'Recommended For You', endpoint: '/api/recommendations/personalized' },
                { id: 'newReleases', title: 'New Releases', endpoint: '/api/recommendations/new-releases' },
                { id: 'criticsChoice', title: 'Critics Choice', endpoint: '/api/recommendations/critics-choice' }
            ];

            for (const section of sections) {
                await this.loadSection(section);
            }
        } catch (error) {
            console.error('Error loading personalized home:', error);
        }
    }

    async loadAnonymousHome() {
        try {
            // Load anonymous recommendations
            const sections = [
                { id: 'trending', title: 'Trending Now', endpoint: '/api/recommendations/trending' },
                { id: 'anonymous', title: 'Popular Content', endpoint: '/api/recommendations/anonymous' },
                { id: 'newReleases', title: 'New Releases', endpoint: '/api/recommendations/new-releases' },
                { id: 'criticsChoice', title: 'Critics Choice', endpoint: '/api/recommendations/critics-choice' }
            ];

            for (const section of sections) {
                await this.loadSection(section);
            }
        } catch (error) {
            console.error('Error loading anonymous home:', error);
        }
    }

    async loadSection(section) {
        const container = document.getElementById(section.id);
        if (!container) return;

        try {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            
            const response = await fetch(`${APIService.baseURL}${section.endpoint}`, {
                headers: AuthManager.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                const content = data.recommendations || [];
                
                container.innerHTML = this.createContentGrid(content);
                this.initializeCarousel(container);
            } else {
                throw new Error(`Failed to load ${section.title}`);
            }
        } catch (error) {
            console.error(`Error loading section ${section.id}:`, error);
            container.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Failed to load ${section.title}</p>
                </div>
            `;
        }
    }

    createContentGrid(content) {
        if (!content || content.length === 0) {
            return '<div class="text-center py-8 text-gray-400">No content available</div>';
        }

        return `
            <div class="section-carousel">
                <div class="carousel-container">
                    ${content.map(item => this.createContentCard(item)).join('')}
                </div>
                <button class="carousel-nav prev" onclick="app.slideCarousel(this, -1)">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="carousel-nav next" onclick="app.slideCarousel(this, 1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    createContentCard(item) {
        const posterUrl = item.poster_path || '/assets/images/placeholder.jpg';
        const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
        const genres = Array.isArray(item.genres) ? item.genres.slice(0, 2).join(', ') : '';

        return `
            <div class="content-card flex-shrink-0 w-48 cursor-pointer" onclick="window.location.href='/details?id=${item.id}'">
                <div class="content-card-image">
                    <img src="${posterUrl}" alt="${item.title}" loading="lazy">
                    <div class="content-card-overlay"></div>
                    <div class="content-card-actions">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); ContentManager.addToWatchlist(${item.id})">
                            <i class="fas fa-bookmark"></i>
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); ContentManager.addToFavorites(${item.id})">
                            <i class="fas fa-heart"></i>
                        </button>
                        ${item.youtube_trailer ? `
                            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); ContentManager.playTrailer('${item.youtube_trailer}')">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="content-card-info">
                    <div class="content-card-title">${item.title}</div>
                    <div class="content-card-meta">
                        <span class="rating">
                            <i class="fas fa-star"></i> ${rating}
                        </span>
                        <span class="badge">${item.content_type.toUpperCase()}</span>
                    </div>
                    ${genres ? `<div class="text-xs text-gray-400 mt-2">${genres}</div>` : ''}
                </div>
            </div>
        `;
    }

    slideCarousel(button, direction) {
        const carousel = button.closest('.section-carousel');
        const container = carousel.querySelector('.carousel-container');
        const cardWidth = 200; // Card width + gap
        const currentTransform = container.style.transform || 'translateX(0px)';
        const currentX = parseInt(currentTransform.match(/-?\d+/) || [0]);
        const newX = currentX + (direction * cardWidth * -3); // Move 3 cards at a time
        
        // Prevent sliding too far
        const maxSlide = (container.children.length - 6) * cardWidth;
        const clampedX = Math.max(Math.min(newX, 0), -maxSlide);
        
        container.style.transform = `translateX(${clampedX}px)`;
    }

    initializeCarousel(container) {
        // Initialize carousel behavior
        const carousel = container.querySelector('.section-carousel');
        if (carousel) {
            const carouselContainer = carousel.querySelector('.carousel-container');
            const prevBtn = carousel.querySelector('.prev');
            const nextBtn = carousel.querySelector('.next');
            
            // Show/hide navigation buttons based on content
            if (carouselContainer.children.length <= 6) {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }
        }
    }
}

// Content Manager
class ContentManager {
    static async addToWatchlist(contentId) {
        if (!AuthManager.isAuthenticated()) {
            AuthManager.showLoginPrompt();
            return;
        }

        try {
            const response = await APIService.recordInteraction(contentId, 'watchlist');
            if (response) {
                this.showToast('Added to watchlist', 'success');
            }
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            this.showToast('Failed to add to watchlist', 'error');
        }
    }

    static async addToFavorites(contentId) {
        if (!AuthManager.isAuthenticated()) {
            AuthManager.showLoginPrompt();
            return;
        }

        try {
            const response = await APIService.recordInteraction(contentId, 'favorite');
            if (response) {
                this.showToast('Added to favorites', 'success');
            }
        } catch (error) {
            console.error('Error adding to favorites:', error);
            this.showToast('Failed to add to favorites', 'error');
        }
    }

    static playTrailer(youtubeUrl) {
        // Open YouTube trailer in a new tab
        window.open(youtubeUrl, '_blank');
    }

    static showToast(message, type = 'info') {
        // Create and show toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Export for global access
window.App = App;
window.ContentManager = ContentManager;