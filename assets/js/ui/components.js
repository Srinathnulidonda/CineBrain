// UI Component Management
class UIComponents {
    // Initialize all UI components
    static init() {
        this.initTooltips();
        this.initModals();
        this.initDropdowns();
        this.initLazyLoading();
        this.initScrollReveal();
    }

    // Tooltips
    static initTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const text = e.target.dataset.tooltip;
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip animate-fadeIn';
                tooltip.textContent = text;

                document.body.appendChild(tooltip);

                const rect = e.target.getBoundingClientRect();
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;
            });

            element.addEventListener('mouseleave', () => {
                document.querySelectorAll('.tooltip').forEach(t => t.remove());
            });
        });
    }

    // Modals
    static initModals() {
        // Close modals on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal--open').forEach(modal => {
                    modal.classList.remove('modal--open');
                });
            }
        });

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('modal--open');
                }
            });
        });
    }

    // Dropdowns
    static initDropdowns() {
        document.querySelectorAll('[data-dropdown]').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdownId = trigger.dataset.dropdown;
                const dropdown = document.getElementById(dropdownId);

                // Close other dropdowns
                document.querySelectorAll('.dropdown--open').forEach(d => {
                    if (d !== dropdown) d.classList.remove('dropdown--open');
                });

                dropdown.classList.toggle('dropdown--open');
            });
        });

        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown--open').forEach(dropdown => {
                dropdown.classList.remove('dropdown--open');
            });
        });
    }

    // Lazy Loading
    static initLazyLoading() {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Scroll Reveal
    static initScrollReveal() {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach(element => {
            revealObserver.observe(element);
        });
    }

    // Create toast notification
    static showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type} animate-slideInRight`;

        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        toast.innerHTML = `
            <i class="bi bi-${icons[type]} toast__icon"></i>
            <span class="toast__message">${message}</span>
            <i class="bi bi-x toast__close" onclick="this.parentElement.remove()"></i>
        `;

        const container = document.getElementById('toastContainer') || this.createToastContainer();
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('toast--visible'), 10);
        setTimeout(() => toast.remove(), duration);
    }

    // Create toast container if it doesn't exist
    static createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.id = 'toastContainer';
        document.body.appendChild(container);
        return container;
    }

    // Create loading spinner
    static showLoading(container, message = '') {
        const loading = document.createElement('div');
        loading.className = 'loading-state';
        loading.innerHTML = `
            <div class="spinner"></div>
            ${message ? `<p class="text-muted mt-md">${message}</p>` : ''}
        `;

        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        container.innerHTML = '';
        container.appendChild(loading);
    }

    // Create empty state
    static showEmptyState(container, icon, title, description, action = null) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="bi bi-${icon} empty-state__icon"></i>
            <h2 class="empty-state__title">${title}</h2>
            <p class="empty-state__description">${description}</p>
            ${action ? `<button class="btn btn-primary" onclick="${action.onclick}">${action.text}</button>` : ''}
        `;

        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        container.innerHTML = '';
        container.appendChild(emptyState);
    }
}

// Initialize components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UIComponents.init();
});

// Export for global use
window.UIComponents = UIComponents;