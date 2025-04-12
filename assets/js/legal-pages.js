/**
 * Legal Pages JavaScript
 * Handles interactions for Privacy Policy and Terms of Service pages
 */

class LegalPages {
    constructor() {
        this.init();
    }

    init() {
        this.setupTableOfContents();
        this.setupSmoothScrolling();
        this.setupPrintFunction();
        this.setupShareFunction();
        this.initializeAccordions();
        this.trackSectionViews();
    }

    /**
     * Setup table of contents active state
     */
    setupTableOfContents() {
        const sections = document.querySelectorAll('.legal-section');
        const tocLinks = document.querySelectorAll('.toc-link');

        if (!sections.length || !tocLinks.length) return;

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        };

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Remove all active classes
                    tocLinks.forEach(link => link.classList.remove('active'));

                    // Add active class to current section link
                    const activeLink = document.querySelector(`.toc-link[href="#${entry.target.id}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        sections.forEach(section => observer.observe(section));
    }

    /**
     * Setup smooth scrolling for TOC links
     */
    setupSmoothScrolling() {
        const links = document.querySelectorAll('.toc-link');

        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);

                if (targetSection) {
                    const navHeight = document.querySelector('.navbar-cinebrain')?.offsetHeight || 60;
                    const targetPosition = targetSection.offsetTop - navHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Update URL without scrolling
                    history.pushState(null, null, `#${targetId}`);
                }
            });
        });
    }

    /**
     * Setup print functionality
     */
    setupPrintFunction() {
        window.printDocument = () => {
            window.print();
        };
    }

    /**
     * Setup PDF download
     */
    setupDownloadPDF() {
        window.downloadPDF = () => {
            // Show notification
            if (window.topbar?.notificationSystem) {
                window.topbar.notificationSystem.show('PDF download will be available soon', 'info');
            }

            // In production, this would generate and download a PDF
            // For now, we'll just trigger print as a fallback
            window.print();
        };
    }

    /**
     * Setup share functionality
     */
    setupShareFunction() {
        window.sharePolicy = async () => {
            const shareData = {
                title: 'CineBrain Privacy Policy',
                text: 'Check out CineBrain\'s Privacy Policy',
                url: window.location.href
            };

            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    // Fallback: Copy to clipboard
                    await navigator.clipboard.writeText(window.location.href);
                    if (window.topbar?.notificationSystem) {
                        window.topbar.notificationSystem.show('Link copied to clipboard!', 'success');
                    }
                }
            } catch (err) {
                console.error('Error sharing:', err);
            }
        };

        window.shareTerms = async () => {
            const shareData = {
                title: 'CineBrain Terms of Service',
                text: 'Check out CineBrain\'s Terms of Service',
                url: window.location.href
            };

            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    // Fallback: Copy to clipboard
                    await navigator.clipboard.writeText(window.location.href);
                    if (window.topbar?.notificationSystem) {
                        window.topbar.notificationSystem.show('Link copied to clipboard!', 'success');
                    }
                }
            } catch (err) {
                console.error('Error sharing:', err);
            }
        };
    }

    /**
     * Initialize Bootstrap accordions
     */
    initializeAccordions() {
        // Bootstrap accordions are already initialized via data attributes
        // This is here for any custom accordion behavior if needed
    }

    /**
     * Track section views for analytics
     */
    trackSectionViews() {
        const sections = document.querySelectorAll('.legal-section');

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5
        };

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Track section view
                    console.log(`Viewed section: ${entry.target.id}`);
                    // In production, send this to analytics
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        sections.forEach(section => observer.observe(section));
    }

    /**
     * Handle responsive table of contents
     */
    handleResponsiveTOC() {
        const toc = document.querySelector('.legal-toc');
        const mobileBreakpoint = 968;

        if (!toc) return;

        const toggleTOC = () => {
            if (window.innerWidth <= mobileBreakpoint) {
                // Add collapsible behavior for mobile
                toc.addEventListener('click', this.toggleMobileTOC);
            } else {
                // Remove mobile behavior
                toc.removeEventListener('click', this.toggleMobileTOC);
            }
        };

        toggleTOC();
        window.addEventListener('resize', toggleTOC);
    }

    /**
     * Toggle mobile TOC
     */
    toggleMobileTOC(e) {
        if (e.target.closest('.toc-title')) {
            const tocList = e.currentTarget.querySelector('.toc-list');
            if (tocList) {
                tocList.classList.toggle('collapsed');
            }
        }
    }
}

// Initialize legal pages functionality
document.addEventListener('DOMContentLoaded', () => {
    new LegalPages();
});

// Export for global access
window.LegalPages = LegalPages;