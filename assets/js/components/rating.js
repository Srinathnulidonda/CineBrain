class RatingComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            maxRating: 5,
            currentRating: 0,
            interactive: true,
            size: 'medium', // small, medium, large
            showValue: true,
            showCount: false,
            readonly: false,
            color: '#ffd700',
            emptyColor: '#d1d5db',
            hoverColor: '#fbbf24',
            onChange: null,
            ...options
        };
        
        this.currentRating = this.options.currentRating;
        this.hoverRating = 0;
        this.stars = [];
        
        this.init();
    }

    init() {
        this.createElement();
        this.setupEventListeners();
        this.updateDisplay();
    }

    createElement() {
        this.container.className = `rating-component rating-${this.options.size} ${this.options.readonly ? 'readonly' : ''}`;
        
        const starsContainer = document.createElement('div');
        starsContainer.className = 'rating-stars';
        
        for (let i = 1; i <= this.options.maxRating; i++) {
            const star = document.createElement('button');
            star.type = 'button';
            star.className = 'rating-star';
            star.dataset.rating = i;
            star.innerHTML = '<i class="fas fa-star"></i>';
            star.setAttribute('aria-label', `Rate ${i} out of ${this.options.maxRating}`);
            
            if (this.options.readonly) {
                star.disabled = true;
                star.style.cursor = 'default';
            }
            
            starsContainer.appendChild(star);
            this.stars.push(star);
        }
        
        this.container.appendChild(starsContainer);
        
        if (this.options.showValue || this.options.showCount) {
            const info = document.createElement('div');
            info.className = 'rating-info';
            
            if (this.options.showValue) {
                const value = document.createElement('span');
                value.className = 'rating-value';
                value.textContent = this.formatRating(this.currentRating);
                info.appendChild(value);
            }
            
            if (this.options.showCount) {
                const count = document.createElement('span');
                count.className = 'rating-count';
                count.textContent = `(${this.options.ratingCount || 0})`;
                info.appendChild(count);
            }
            
            this.container.appendChild(info);
        }
        
        this.setupStyles();
    }

    setupStyles() {
        if (document.getElementById('rating-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'rating-styles';
        styles.textContent = `
            .rating-component {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .rating-stars {
                display: flex;
                gap: 2px;
            }

            .rating-star {
                background: none;
                border: none;
                padding: 0;
                cursor: pointer;
                transition: all 0.15s ease;
                color: ${this.options.emptyColor};
                font-size: 1rem;
            }

            .rating-star:hover:not(:disabled) {
                transform: scale(1.1);
            }

            .rating-star.filled {
                color: ${this.options.color};
            }

            .rating-star.hover {
                color: ${this.options.hoverColor};
            }

            .rating-small .rating-star {
                font-size: 0.875rem;
            }

            .rating-medium .rating-star {
                font-size: 1rem;
            }

            .rating-large .rating-star {
                font-size: 1.25rem;
            }

            .rating-readonly .rating-star {
                cursor: default;
            }

            .rating-readonly .rating-star:hover {
                transform: none;
            }

            .rating-info {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .rating-value {
                font-weight: 600;
                color: var(--text-primary);
            }

            .rating-count {
                color: var(--text-secondary);
                font-size: 0.875em;
            }

            .rating-component.animate .rating-star {
                animation: starPulse 0.3s ease;
            }

            @keyframes starPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }

            .rating-component.disabled {
                opacity: 0.6;
                pointer-events: none;
            }
        `;
        document.head.appendChild(styles);
    }

    setupEventListeners() {
        if (this.options.readonly || !this.options.interactive) return;

        this.stars.forEach((star, index) => {
            const rating = index + 1;
            
            star.addEventListener('click', () => {
                this.setRating(rating);
            });
            
            star.addEventListener('mouseenter', () => {
                this.setHoverRating(rating);
            });
            
            star.addEventListener('mouseleave', () => {
                this.clearHoverRating();
            });
            
            star.addEventListener('focus', () => {
                this.setHoverRating(rating);
            });
            
            star.addEventListener('blur', () => {
                this.clearHoverRating();
            });
            
            star.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.setRating(rating);
                }
            });
        });
    }

    setRating(rating) {
        if (this.options.readonly) return;
        
        this.currentRating = rating;
        this.updateDisplay();
        this.animate();
        
        if (this.options.onChange) {
            this.options.onChange(rating);
        }
        
        // Dispatch custom event
        this.container.dispatchEvent(new CustomEvent('ratingChange', {
            detail: { rating }
        }));
    }

    setHoverRating(rating) {
        if (this.options.readonly) return;
        
        this.hoverRating = rating;
        this.updateDisplay();
    }

    clearHoverRating() {
        if (this.options.readonly) return;
        
        this.hoverRating = 0;
        this.updateDisplay();
    }

    updateDisplay() {
        const displayRating = this.hoverRating || this.currentRating;
        
        this.stars.forEach((star, index) => {
            const rating = index + 1;
            const isPartial = displayRating >= rating - 0.5 && displayRating < rating;
            const isFilled = displayRating >= rating;
            const isHover = this.hoverRating > 0 && rating <= this.hoverRating;
            
            star.classList.toggle('filled', isFilled);
            star.classList.toggle('hover', isHover);
            star.classList.toggle('partial', isPartial);
            
            // Update icon for partial ratings
            if (isPartial) {
                star.innerHTML = '<i class="fas fa-star-half-alt"></i>';
            } else {
                star.innerHTML = '<i class="fas fa-star"></i>';
            }
        });
        
        // Update value display
        const valueElement = this.container.querySelector('.rating-value');
        if (valueElement) {
            valueElement.textContent = this.formatRating(this.currentRating);
        }
    }

    animate() {
        this.container.classList.add('animate');
        setTimeout(() => {
            this.container.classList.remove('animate');
        }, 300);
    }

    formatRating(rating) {
        return rating % 1 === 0 ? rating.toString() : rating.toFixed(1);
    }

    getRating() {
        return this.currentRating;
    }

    setReadonly(readonly) {
        this.options.readonly = readonly;
        this.container.classList.toggle('readonly', readonly);
        
        this.stars.forEach(star => {
            star.disabled = readonly;
            star.style.cursor = readonly ? 'default' : 'pointer';
        });
    }

    setMaxRating(maxRating) {
        this.options.maxRating = maxRating;
        this.createElement();
    }

    setSize(size) {
        this.container.classList.remove(`rating-${this.options.size}`);
        this.options.size = size;
        this.container.classList.add(`rating-${size}`);
    }

    disable() {
        this.container.classList.add('disabled');
    }

    enable() {
        this.container.classList.remove('disabled');
    }

    destroy() {
        this.container.innerHTML = '';
        this.container.className = '';
    }
}

// Utility function to create rating display (readonly)
function createRatingDisplay(container, rating, options = {}) {
    return new RatingComponent(container, {
        currentRating: rating,
        readonly: true,
        interactive: false,
        ...options
    });
}

// Utility function to create interactive rating
function createRatingInput(container, options = {}) {
    return new RatingComponent(container, {
        interactive: true,
        readonly: false,
        ...options
    });
}

// Auto-initialize ratings
document.addEventListener('DOMContentLoaded', () => {
    // Initialize readonly ratings
    document.querySelectorAll('[data-rating]').forEach(element => {
        const rating = parseFloat(element.dataset.rating);
        const maxRating = parseInt(element.dataset.maxRating) || 5;
        const size = element.dataset.size || 'medium';
        
        new RatingComponent(element, {
            currentRating: rating,
            maxRating: maxRating,
            size: size,
            readonly: true,
            interactive: false
        });
    });
    
    // Initialize interactive ratings
    document.querySelectorAll('[data-rating-input]').forEach(element => {
        const currentRating = parseFloat(element.dataset.currentRating) || 0;
        const maxRating = parseInt(element.dataset.maxRating) || 5;
        const size = element.dataset.size || 'medium';
        
        new RatingComponent(element, {
            currentRating: currentRating,
            maxRating: maxRating,
            size: size,
            interactive: true,
            readonly: false
        });
    });
});

window.RatingComponent = RatingComponent;
window.createRatingDisplay = createRatingDisplay;
window.createRatingInput = createRatingInput;