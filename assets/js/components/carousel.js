class CarouselComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemsPerView: 6,
            gap: 20,
            autoplay: false,
            autoplayDelay: 5000,
            infinite: true,
            responsive: {
                768: { itemsPerView: 4 },
                480: { itemsPerView: 2 }
            },
            ...options
        };
        
        this.currentIndex = 0;
        this.itemWidth = 0;
        this.maxIndex = 0;
        this.items = [];
        this.isAnimating = false;
        this.autoplayTimer = null;
        
        this.init();
    }

    init() {
        this.setupElements();
        this.calculateDimensions();
        this.setupEventListeners();
        this.setupResponsive();
        
        if (this.options.autoplay) {
            this.startAutoplay();
        }
    }

    setupElements() {
        this.track = this.container.querySelector('.carousel-track');
        this.prevBtn = this.container.querySelector('.carousel-btn[id$="prev"]');
        this.nextBtn = this.container.querySelector('.carousel-btn[id$="next"]');
        this.items = Array.from(this.track.children);
        
        if (!this.track) {
            console.error('Carousel track not found');
            return;
        }
    }

    calculateDimensions() {
        const containerWidth = this.container.offsetWidth;
        const totalGap = (this.options.itemsPerView - 1) * this.options.gap;
        this.itemWidth = (containerWidth - totalGap) / this.options.itemsPerView;
        
        // Set item widths
        this.items.forEach(item => {
            item.style.width = `${this.itemWidth}px`;
            item.style.marginRight = `${this.options.gap}px`;
        });
        
        // Remove margin from last item
        if (this.items.length > 0) {
            this.items[this.items.length - 1].style.marginRight = '0';
        }
        
        this.maxIndex = Math.max(0, this.items.length - this.options.itemsPerView);
        this.updateButtons();
    }

    setupEventListeners() {
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prev());
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.next());
        }
        
        // Touch/swipe support
        let startX = 0;
        let isDragging = false;
        
        this.track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            this.stopAutoplay();
        });
        
        this.track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
        });
        
        this.track.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            }
            
            isDragging = false;
            if (this.options.autoplay) {
                this.startAutoplay();
            }
        });
        
        // Mouse events for desktop
        let mouseStartX = 0;
        let isMouseDragging = false;
        
        this.track.addEventListener('mousedown', (e) => {
            mouseStartX = e.clientX;
            isMouseDragging = true;
            this.track.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isMouseDragging) return;
            e.preventDefault();
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!isMouseDragging) return;
            
            const endX = e.clientX;
            const diff = mouseStartX - endX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            }
            
            isMouseDragging = false;
            this.track.style.cursor = 'grab';
        });
        
        // Hover to pause autoplay
        this.container.addEventListener('mouseenter', () => {
            this.stopAutoplay();
        });
        
        this.container.addEventListener('mouseleave', () => {
            if (this.options.autoplay) {
                this.startAutoplay();
            }
        });
    }

    setupResponsive() {
        const handleResize = throttle(() => {
            const width = window.innerWidth;
            
            for (const [breakpoint, settings] of Object.entries(this.options.responsive)) {
                if (width <= parseInt(breakpoint)) {
                    this.options.itemsPerView = settings.itemsPerView;
                    break;
                }
            }
            
            this.calculateDimensions();
            this.updatePosition();
        }, 250);
        
        window.addEventListener('resize', handleResize);
    }

    next() {
        if (this.isAnimating) return;
        
        if (this.currentIndex < this.maxIndex) {
            this.currentIndex++;
        } else if (this.options.infinite) {
            this.currentIndex = 0;
        } else {
            return;
        }
        
        this.updatePosition();
    }

    prev() {
        if (this.isAnimating) return;
        
        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else if (this.options.infinite) {
            this.currentIndex = this.maxIndex;
        } else {
            return;
        }
        
        this.updatePosition();
    }

    goTo(index) {
        if (this.isAnimating || index < 0 || index > this.maxIndex) return;
        
        this.currentIndex = index;
        this.updatePosition();
    }

    updatePosition() {
        if (!this.track) return;
        
        this.isAnimating = true;
        const translateX = -(this.currentIndex * (this.itemWidth + this.options.gap));
        
        this.track.style.transform = `translateX(${translateX}px)`;
        this.track.style.transition = 'transform 0.3s ease';
        
        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
        
        this.updateButtons();
    }

    updateButtons() {
        if (!this.prevBtn || !this.nextBtn) return;
        
        if (this.options.infinite) {
            this.prevBtn.disabled = false;
            this.nextBtn.disabled = false;
        } else {
            this.prevBtn.disabled = this.currentIndex === 0;
            this.nextBtn.disabled = this.currentIndex === this.maxIndex;
        }
    }

    startAutoplay() {
        if (!this.options.autoplay) return;
        
        this.stopAutoplay();
        this.autoplayTimer = setInterval(() => {
            this.next();
        }, this.options.autoplayDelay);
    }

    stopAutoplay() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    }

    addItem(item) {
        this.track.appendChild(item);
        this.items.push(item);
        this.calculateDimensions();
    }

    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            this.items[index].remove();
            this.items.splice(index, 1);
            this.calculateDimensions();
            
            if (this.currentIndex >= this.maxIndex) {
                this.currentIndex = Math.max(0, this.maxIndex);
                this.updatePosition();
            }
        }
    }

    destroy() {
        this.stopAutoplay();
        window.removeEventListener('resize', this.handleResize);
        
        if (this.prevBtn) {
            this.prevBtn.removeEventListener('click', this.prev);
        }
        
        if (this.nextBtn) {
            this.nextBtn.removeEventListener('click', this.next);
        }
    }
}

// Utility function for throttling
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Auto-initialize carousels
document.addEventListener('DOMContentLoaded', () => {
    const carousels = document.querySelectorAll('.carousel-container');
    carousels.forEach(carousel => {
        new CarouselComponent(carousel);
    });
});

window.CarouselComponent = CarouselComponent;