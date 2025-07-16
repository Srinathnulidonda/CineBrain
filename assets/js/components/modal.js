class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.zIndexBase = 1050;
        this.init();
    }

    init() {
        this.createContainer();
        this.setupStyles();
        this.setupEventListeners();
    }

    createContainer() {
        if (!document.getElementById('modals-container')) {
            const container = document.createElement('div');
            container.id = 'modals-container';
            document.body.appendChild(container);
        }
    }

    setupStyles() {
        if (document.getElementById('modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: var(--z-modal);
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                padding: 20px;
            }

            .modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .modal {
                background-color: var(--bg-secondary);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                max-width: 90vw;
                max-height: 90vh;
                overflow: hidden;
                transform: scale(0.9);
                transition: transform 0.3s ease;
                display: flex;
                flex-direction: column;
            }

            .modal-overlay.active .modal {
                transform: scale(1);
            }

            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 24px;
                border-bottom: 1px solid var(--border-color);
                flex-shrink: 0;
            }

            .modal-title {
                font-size: var(--font-size-xl);
                font-weight: 600;
                color: var(--text-primary);
                margin: 0;
            }

            .modal-close {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: transparent;
                color: var(--text-secondary);
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.15s ease;
                font-size: 18px;
            }

            .modal-close:hover {
                background-color: var(--bg-hover);
                color: var(--text-primary);
            }

            .modal-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .modal-footer {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 12px;
                padding: 24px;
                border-top: 1px solid var(--border-color);
                flex-shrink: 0;
            }

            .modal-sm {
                max-width: 400px;
            }

            .modal-md {
                max-width: 600px;
            }

            .modal-lg {
                max-width: 800px;
            }

            .modal-xl {
                max-width: 1200px;
            }

            .modal-fullscreen {
                max-width: 100vw;
                max-height: 100vh;
                height: 100vh;
                border-radius: 0;
            }

            @media (max-width: 768px) {
                .modal {
                    max-width: 95vw;
                    max-height: 95vh;
                }

                .modal-header,
                .modal-body,
                .modal-footer {
                    padding: 16px;
                }

                .modal-footer {
                    flex-direction: column-reverse;
                    align-items: stretch;
                }

                .modal-footer .btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    setupEventListeners() {
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTop();
            }
        });

        // Handle clicks on overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                const modalId = e.target.dataset.modalId;
                if (modalId) {
                    this.close(modalId);
                }
            }
        });
    }

    show(config) {
        const id = this.generateId();
        const modal = this.createModal(id, config);
        
        const container = document.getElementById('modals-container');
        container.appendChild(modal);

        // Store modal data
        this.activeModals.set(id, {
            element: modal,
            config: config,
            zIndex: this.zIndexBase + this.activeModals.size
        });

        // Set z-index
        modal.style.zIndex = this.zIndexBase + this.activeModals.size;

        // Trigger animation
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        // Focus management
        this.trapFocus(modal);

        // Callback
        if (config.onShow) {
            config.onShow(id);
        }

        return id;
    }

    createModal(id, config) {
        const {
            title = 'Modal',
            content = '',
            size = 'md',
            closable = true,
            footer = null,
            className = ''
        } = config;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.dataset.modalId = id;

        const modal = document.createElement('div');
        modal.className = `modal modal-${size} ${className}`;

        let modalHTML = '';

        // Header
        if (title || closable) {
            modalHTML += `
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    ${closable ? `
                        <button class="modal-close" data-action="close">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        }

        // Body
        modalHTML += `
            <div class="modal-body">
                ${content}
            </div>
        `;

        // Footer
        if (footer) {
            modalHTML += `
                <div class="modal-footer">
                    ${footer}
                </div>
            `;
        }

        modal.innerHTML = modalHTML;
        overlay.appendChild(modal);

        // Add event listeners
        overlay.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'close') {
                this.close(id);
            }
        });

        return overlay;
    }

    close(id) {
        const modalData = this.activeModals.get(id);
        if (!modalData) return false;

        const { element, config } = modalData;

        // Callback
        if (config.onClose) {
            const shouldClose = config.onClose(id);
            if (shouldClose === false) return false;
        }

        // Animate out
        element.classList.remove('active');

        // Remove from DOM
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.activeModals.delete(id);
        }, 300);

        return true;
    }

    closeTop() {
        if (this.activeModals.size === 0) return false;
        
        const ids = Array.from(this.activeModals.keys());
        const topId = ids[ids.length - 1];
        return this.close(topId);
    }

    closeAll() {
        const ids = Array.from(this.activeModals.keys());
        ids.forEach(id => this.close(id));
    }

    update(id, newConfig) {
        const modalData = this.activeModals.get(id);
        if (!modalData) return false;

        const { element, config } = modalData;
        const updatedConfig = { ...config, ...newConfig };

        // Update title
        if (newConfig.title !== undefined) {
            const titleElement = element.querySelector('.modal-title');
            if (titleElement) {
                titleElement.textContent = newConfig.title;
            }
        }

        // Update content
        if (newConfig.content !== undefined) {
            const bodyElement = element.querySelector('.modal-body');
            if (bodyElement) {
                bodyElement.innerHTML = newConfig.content;
            }
        }

        // Update footer
        if (newConfig.footer !== undefined) {
            let footerElement = element.querySelector('.modal-footer');
            if (newConfig.footer) {
                if (!footerElement) {
                    footerElement = document.createElement('div');
                    footerElement.className = 'modal-footer';
                    element.querySelector('.modal').appendChild(footerElement);
                }
                footerElement.innerHTML = newConfig.footer;
            } else if (footerElement) {
                footerElement.remove();
            }
        }

        // Update stored config
        modalData.config = updatedConfig;

        return true;
    }

    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Focus first element
        firstFocusable.focus();

        // Handle tab navigation
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    generateId() {
        return 'modal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Convenience methods
    alert(title, message, options = {}) {
        return this.show({
            title,
            content: `<p>${message}</p>`,
            size: 'sm',
            footer: `
                <button class="btn btn-primary" data-action="close">
                    OK
                </button>
            `,
            ...options
        });
    }

    confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const id = this.show({
                title,
                content: `<p>${message}</p>`,
                size: 'sm',
                footer: `
                    <button class="btn btn-outline" data-action="cancel">
                        Cancel
                    </button>
                    <button class="btn btn-primary" data-action="confirm">
                        Confirm
                    </button>
                `,
                onClose: () => {
                    resolve(false);
                },
                ...options
            });

            // Handle button clicks
            const modal = this.activeModals.get(id).element;
            modal.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'confirm') {
                    resolve(true);
                    this.close(id);
                } else if (action === 'cancel') {
                    resolve(false);
                    this.close(id);
                }
            });
        });
    }

    loading(title = 'Loading...', message = 'Please wait...') {
        return this.show({
            title,
            content: `
                <div style="text-align: center; padding: 20px;">
                    <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
                    <p>${message}</p>
                </div>
            `,
            size: 'sm',
            closable: false
        });
    }
}

// Create global instance
window.ModalManager = ModalManager;
window.modal = new ModalManager();