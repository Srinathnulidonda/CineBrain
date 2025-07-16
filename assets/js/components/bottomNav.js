/**
 * Bottom Navigation Component
 * Mobile-focused navigation for touch devices
 */

class BottomNavComponent {
    constructor() {
        this.currentPage = 'home';
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.setActivePage();
    }

    render() {
        const bottomNav = document.getElementById('bottomNav');
        bottomNav.innerHTML = `
            <div class="bottom-nav-items">
                <a href="/" class="bottom-nav-item" data-page="home">
                    <i class="fas fa-home bottom-nav-icon"></i>
                    <span class="bottom-nav-label">Home</span>
                </a>
                
                <a href="/pages/search.html" class="bottom-nav-item" data-page="search">
                    <i class="fas fa-search bottom-nav-icon"></i>
                    <span class="bottom-nav-label">Search</span>
                </a>
                
                <a href="/pages/favorites.html" class="bottom-nav-item auth-required" data-page="favorites">
                    <i class="fas fa-heart bottom-nav-icon"></i>
                    <span class="bottom-nav-label">My List</span>
                </a>
                
                <a href="/pages/profile.html" class="bottom-nav-item auth-required" data-page="profile">
                    <i class="fas fa-user bottom-nav-icon"></i>
                    <span class="bottom-nav-label">Profile</span>
                </a>
                
                <button class="bottom-nav-item auth-guest" data-action="login">
                    <i class="fas fa-sign-in-alt bottom-nav-icon"></i>
                    <span class="bottom-nav-label">Login</span>
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        // Navigation items
        document.querySelectorAll('.bottom-nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't prevent default for actual navigation
                this.setActivePage(e.target.closest('.bottom-nav-item').dataset.page);
            });
        });

        // Action buttons
        document.querySelectorAll('.bottom-nav-item[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAction(e.target.closest('.bottom-nav-item').dataset.action);
            });
        });

        // Update on auth state changes
        document.addEventListener('authStateChanged', () => {
            this.updateAuthState();
        });
    }

    setActivePage(page = null) {
        // Determine current page from URL
        if (!page) {
            const path = window.location.pathname;
            if (path === '/' || path === '/index.html') {
                page = 'home';
            } else if (path.includes('search')) {
                page = 'search';
            } else if (path.includes('favorites')) {
                page = 'favorites';
            } else if (path.includes('profile')) {
                page = 'profile';
            } else {
                page = 'home';
            }
        }

        this.currentPage = page;

        // Update active states
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`.bottom-nav-item[data-page="${page}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    handleAction(action) {
        switch (action) {
            case 'login':
                window.location.href = '/pages/login.html';
                break;
            case 'logout':
                authService.logout();
                break;
        }
    }

    updateAuthState() {
        const authRequired = document.querySelectorAll('.auth-required');
        const authGuest = document.querySelectorAll('.auth-guest');
        
        if (authService.isAuthenticated()) {
            // Show authenticated user items
            authRequired.forEach(item => {
                item.style.display = 'flex';
            });
            
            // Hide guest items
            authGuest.forEach(item => {
                item.style.display = 'none';
            });
        } else {
            // Hide authenticated user items
            authRequired.forEach(item => {
                item.style.display = 'none';
            });
            
            // Show guest items
            authGuest.forEach(item => {
                item.style.display = 'flex';
            });
        }
    }

    // Public methods for external use
    showNotificationBadge(count) {
        // Add notification badge to profile icon
        const profileItem = document.querySelector('.bottom-nav-item[data-page="profile"]');
        if (profileItem && count > 0) {
            const icon = profileItem.querySelector('.bottom-nav-icon');
            icon.style.position = 'relative';
            
            let badge = icon.querySelector('.notification-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.style.cssText = `
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: var(--netflix-red);
                    color: white;
                    border-radius: 50%;
                    width: 18px;
                    height: 18px;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                `;
                icon.appendChild(badge);
            }
            
            badge.textContent = count > 99 ? '99+' : count.toString();
        }
    }

    hideNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.remove();
        }
    }

    // Accessibility improvements
    setupAccessibility() {
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            // Add ARIA labels
            const label = item.querySelector('.bottom-nav-label').textContent;
            item.setAttribute('aria-label', label);
            
            // Add role
            item.setAttribute('role', 'button');
            
            // Add keyboard navigation
            item.setAttribute('tabindex', '0');
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });
    }

    // Touch gestures for enhanced mobile experience
    setupTouchGestures() {
        let startY = 0;
        let currentY = 0;
        let isScrolling = false;

        const bottomNav = document.getElementById('bottomNav');

        bottomNav.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isScrolling = false;
        }, { passive: true });

        bottomNav.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const deltaY = Math.abs(currentY - startY);
            
            if (deltaY > 10) {
                isScrolling = true;
            }
        }, { passive: true });

        bottomNav.addEventListener('touchend', () => {
            if (!isScrolling && Math.abs(currentY - startY) < 10) {
                // It was a tap, not a scroll
                // Handle tap if needed
            }
            isScrolling = false;
        }, { passive: true });
    }

    // Auto-hide on scroll (optional feature)
    setupAutoHide() {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateNavVisibility = () => {
            const currentScrollY = window.scrollY;
            const bottomNav = document.getElementById('bottomNav');
            
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down
                bottomNav.style.transform = 'translateY(100%)';
            } else {
                // Scrolling up
                bottomNav.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNavVisibility);
                ticking = true;
            }
        }, { passive: true });
    }
}

// Initialize and export
window.BottomNavComponent = new BottomNavComponent();