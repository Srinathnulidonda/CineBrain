// CineScope - Animation and Interaction Library

class AnimationController {
    constructor() {
        this.initializeAnimations();
        this.setupIntersectionObserver();
        this.setupGestureHandlers();
    }

    initializeAnimations() {
        // Fade in animations
        this.fadeInElements = document.querySelectorAll('.fade-in');
        this.slideInElements = document.querySelectorAll('.slide-in');
        this.scaleInElements = document.querySelectorAll('.scale-in');
    }

    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                }
            });
        }, options);

        // Observe all animated elements
        [...this.fadeInElements, ...this.slideInElements, ...this.scaleInElements]
            .forEach(el => this.observer.observe(el));
    }

    animateElement(element) {
        element.classList.add('animate');
        this.observer.unobserve(element);
    }

    setupGestureHandlers() {
        // Touch gestures for mobile
        let startX, startY, currentX, currentY;
        let isGesturing = false;

        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isGesturing = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (isGesturing && e.touches.length === 1) {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (isGesturing) {
                this.handleGesture(startX, startY, currentX, currentY);
                isGesturing = false;
            }
        }, { passive: true });
    }

    handleGesture(startX, startY, endX, endY) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;

        // Horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                this.handleSwipeRight();
            } else {
                this.handleSwipeLeft();
            }
        }
        // Vertical swipe
        else if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0) {
                this.handleSwipeDown();
            } else {
                this.handleSwipeUp();
            }
        }
    }

    handleSwipeRight() {
        // Open sidebar or go back
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('show')) {
            this.openSidebar();
        }
    }

    handleSwipeLeft() {
        // Close sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('show')) {
            this.closeSidebar();
        }
    }

    handleSwipeDown() {
        // Refresh or show search
        if (window.scrollY === 0) {
            location.reload();
        }
    }

    handleSwipeUp() {
        // Scroll to top if at bottom
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    openSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar) {
            sidebar.classList.add('show');
            overlay?.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar) {
            sidebar.classList.remove('show');
            overlay?.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // Content card hover effects
    setupContentCardAnimations() {
        const cards = document.querySelectorAll('.content-card');
        
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.animateCardHover(card, true);
            });
            
            card.addEventListener('mouseleave', () => {
                this.animateCardHover(card, false);
            });
        });
    }

    animateCardHover(card, isHovering) {
        const overlay = card.querySelector('.content-card-overlay');
        const image = card.querySelector('.content-card-image');
        
        if (isHovering) {
            card.style.transform = 'translateY(-8px) scale(1.02)';
            if (overlay) overlay.style.opacity = '1';
            if (image) image.style.transform = 'scale(1.05)';
        } else {
            card.style.transform = '';
            if (overlay) overlay.style.opacity = '';
            if (image) image.style.transform = '';
        }
    }

    // Loading animations
    showSkeletonLoader(container) {
        const skeletonHTML = this.generateSkeletonHTML();
        container.innerHTML = skeletonHTML;
        container.classList.add('skeleton-loading');
    }

    hideSkeletonLoader(container) {
        container.classList.remove('skeleton-loading');
    }

    generateSkeletonHTML() {
        return Array(8).fill().map(() => `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-meta"></div>
                    <div class="skeleton-genres"></div>
                </div>
            </div>
        `).join('');
    }

    // Page transition animations
    pageTransition(fromPage, toPage) {
        return new Promise((resolve) => {
            if (fromPage) {
                fromPage.style.animation = 'fadeOut 0.3s ease-out forwards';
            }
            
            setTimeout(() => {
                if (toPage) {
                    toPage.style.animation = 'fadeIn 0.3s ease-in forwards';
                }
                resolve();
            }, 300);
        });
    }
}

// Initialize animations when DOM is loaded
let animationController;
document.addEventListener('DOMContentLoaded', () => {
    animationController = new AnimationController();
});

// Export for global use
window.AnimationController = AnimationController;
