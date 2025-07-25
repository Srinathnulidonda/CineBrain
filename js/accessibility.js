// CineScope - Accessibility Enhancements

class AccessibilityManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.setupFocusManagement();
        this.setupAnnouncements();
        this.setupReducedMotion();
    }

    setupKeyboardNavigation() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Skip if user is in an input field
            if (e.target.matches('input, textarea, select')) return;

            switch (e.key) {
                case '/':
                    e.preventDefault();
                    this.focusSearch();
                    break;
                case 'Escape':
                    this.closeModals();
                    break;
                case 'h':
                    if (e.altKey) {
                        e.preventDefault();
                        this.goHome();
                    }
                    break;
                case 's':
                    if (e.altKey) {
                        e.preventDefault();
                        this.goToSearch();
                    }
                    break;
                case '?':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.showKeyboardShortcuts();
                    }
                    break;
            }
        });

        // Arrow key navigation for content grids
        this.setupGridNavigation();
    }

    setupGridNavigation() {
        const grids = document.querySelectorAll('.content-grid');
        
        grids.forEach(grid => {
            const items = grid.querySelectorAll('.content-card');
            let currentIndex = -1;

            grid.addEventListener('keydown', (e) => {
                if (!items.length) return;

                switch (e.key) {
                    case 'ArrowRight':
                        e.preventDefault();
                        currentIndex = Math.min(currentIndex + 1, items.length - 1);
                        this.focusItem(items[currentIndex]);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        currentIndex = Math.max(currentIndex - 1, 0);
                        this.focusItem(items[currentIndex]);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        const columns = this.getGridColumns(grid);
                        currentIndex = Math.min(currentIndex + columns, items.length - 1);
                        this.focusItem(items[currentIndex]);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        const cols = this.getGridColumns(grid);
                        currentIndex = Math.max(currentIndex - cols, 0);
                        this.focusItem(items[currentIndex]);
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        if (currentIndex >= 0) {
                            items[currentIndex].click();
                        }
                        break;
                }
            });

            // Initialize first item focus
            items.forEach((item, index) => {
                item.addEventListener('focus', () => {
                    currentIndex = index;
                });
            });
        });
    }

    getGridColumns(grid) {
        const computedStyle = window.getComputedStyle(grid);
        const columns = computedStyle.getPropertyValue('grid-template-columns');
        return columns.split(' ').length;
    }

    focusItem(item) {
        if (item) {
            item.focus();
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    setupScreenReaderSupport() {
        // Add ARIA labels and descriptions
        this.addAriaLabels();
        this.setupLiveRegions();
        this.addLandmarkRoles();
    }

    addAriaLabels() {
        // Search inputs
        const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i]');
        searchInputs.forEach(input => {
            if (!input.getAttribute('aria-label')) {
                input.setAttribute('aria-label', 'Search for movies, TV shows, and anime');
            }
        });

        // Content cards
        const contentCards = document.querySelectorAll('.content-card');
        contentCards.forEach(card => {
            const title = card.querySelector('.content-card-title')?.textContent;
            const type = card.querySelector('.content-card-meta')?.textContent;
            if (title) {
                card.setAttribute('aria-label', `${title} - ${type || 'Content'}`);
                card.setAttribute('role', 'button');
            }
        });

        // Buttons without labels
        const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
        buttons.forEach(button => {
            const icon = button.querySelector('i');
            const text = button.textContent.trim();
            
            if (!text && icon) {
                const iconClass = icon.className;
                if (iconClass.includes('search')) {
                    button.setAttribute('aria-label', 'Search');
                } else if (iconClass.includes('menu')) {
                    button.setAttribute('aria-label', 'Open menu');
                } else if (iconClass.includes('close') || iconClass.includes('x')) {
                    button.setAttribute('aria-label', 'Close');
                }
            }
        });
    }

    setupLiveRegions() {
        // Create live regions for dynamic content announcements
        if (!document.getElementById('sr-announcements')) {
            const announcements = document.createElement('div');
            announcements.id = 'sr-announcements';
            announcements.setAttribute('aria-live', 'polite');
            announcements.setAttribute('aria-atomic', 'true');
            announcements.className = 'sr-only';
            document.body.appendChild(announcements);
        }

        if (!document.getElementById('sr-status')) {
            const status = document.createElement('div');
            status.id = 'sr-status';
            status.setAttribute('aria-live', 'assertive');
            status.setAttribute('aria-atomic', 'true');
            status.className = 'sr-only';
            document.body.appendChild(status);
        }
    }

    addLandmarkRoles() {
        // Add landmark roles for better navigation
        const header = document.querySelector('header, .navbar');
        if (header && !header.getAttribute('role')) {
            header.setAttribute('role', 'banner');
        }

        const main = document.querySelector('main');
        if (main && !main.getAttribute('role')) {
            main.setAttribute('role', 'main');
        }

        const footer = document.querySelector('footer');
        if (footer && !footer.getAttribute('role')) {
            footer.setAttribute('role', 'contentinfo');
        }

        const nav = document.querySelector('nav');
        if (nav && !nav.getAttribute('role')) {
            nav.setAttribute('role', 'navigation');
        }
    }

    setupFocusManagement() {
        // Focus trap for modals
        this.setupModalFocusTrap();
        
        // Skip links
        this.addSkipLinks();
        
        // Focus indicators
        this.enhanceFocusIndicators();
    }

    setupModalFocusTrap() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.trapFocus(e, modal);
                }
            });
        });
    }

    trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    addSkipLinks() {
        if (!document.getElementById('skip-links')) {
            const skipLinks = document.createElement('div');
            skipLinks.id = 'skip-links';
            skipLinks.innerHTML = `
                <a href="#main-content" class="skip-link">Skip to main content</a>
                <a href="#search" class="skip-link">Skip to search</a>
                <a href="#navigation" class="skip-link">Skip to navigation</a>
            `;
            document.body.insertBefore(skipLinks, document.body.firstChild);
        }
    }

    enhanceFocusIndicators() {
        // Add custom focus indicators
        const style = document.createElement('style');
        style.textContent = `
            .skip-link {
                position: absolute;
                top: -40px;
                left: 6px;
                background: var(--primary-600);
                color: white;
                padding: 8px;
                border-radius: 4px;
                text-decoration: none;
                transition: top 0.3s;
                z-index: 9999;
            }
            
            .skip-link:focus {
                top: 6px;
            }
            
            *:focus {
                outline: 2px solid var(--primary-500);
                outline-offset: 2px;
            }
            
            .content-card:focus {
                outline: 3px solid var(--primary-500);
                outline-offset: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    setupAnnouncements() {
        // Announce page changes
        this.announcePageChange();
        
        // Announce dynamic content updates
        this.setupContentAnnouncements();
    }

    announcePageChange() {
        const title = document.title;
        this.announce(`Page loaded: ${title}`);
    }

    setupContentAnnouncements() {
        // Announce search results
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const target = mutation.target;
                    
                    if (target.id === 'searchResults') {
                        const resultCount = target.children.length;
                        this.announce(`${resultCount} search results loaded`);
                    }
                    
                    if (target.classList.contains('content-grid') && !target.classList.contains('loading')) {
                        const itemCount = target.children.length;
                        this.announce(`${itemCount} items loaded`);
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    announce(message, priority = 'polite') {
        const announcer = document.getElementById(priority === 'assertive' ? 'sr-status' : 'sr-announcements');
        if (announcer) {
            announcer.textContent = message;
            
            // Clear after announcement
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }

    setupReducedMotion() {
        // Respect user's motion preferences
        const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (hasReducedMotion) {
            document.documentElement.classList.add('reduce-motion');
            this.disableAnimations();
        }
    }

    disableAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            .reduce-motion *,
            .reduce-motion *::before,
            .reduce-motion *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Utility methods
    focusSearch() {
        const searchInput = document.querySelector('#searchInput, #mainSearchInput, input[type="search"]');
        if (searchInput) {
            searchInput.focus();
            this.announce('Search focused');
        }
    }

    closeModals() {
        const openModals = document.querySelectorAll('.modal:not(.hidden)');
        openModals.forEach(modal => {
            const closeBtn = modal.querySelector('[onclick*="close"], .modal-close');
            if (closeBtn) {
                closeBtn.click();
            }
        });
    }

    goHome() {
        window.location.href = '/';
    }

    goToSearch() {
        window.location.href = '/search';
    }

    showKeyboardShortcuts() {
        this.announce('Keyboard shortcuts: Press / to search, Alt+H for home, Alt+S for search page, Escape to close modals');
    }
}

// Initialize accessibility manager
let accessibilityManager;
document.addEventListener('DOMContentLoaded', () => {
    accessibilityManager = new AccessibilityManager();
});

// Export for global use
window.AccessibilityManager = AccessibilityManager;