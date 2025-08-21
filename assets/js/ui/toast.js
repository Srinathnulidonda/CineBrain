// Toast Notification System
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // Create or get toast container
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.id = 'toastContainer';
            document.body.appendChild(this.container);
        }
    }

    // Show toast notification
    show(message, options = {}) {
        const {
            type = 'info',
            duration = 5000,
            position = 'top-right',
            closable = true,
            action = null,
            icon = null,
            progress = true
        } = options;

        // Create toast element
        const toast = document.createElement('div');
        const id = `toast-${Date.now()}`;
        toast.id = id;
        toast.className = `toast toast--${type} animate-slideInRight`;

        // Determine icon
        const icons = {
            success: 'check-circle-fill',
            error: 'x-circle-fill',
            warning: 'exclamation-triangle-fill',
            info: 'info-circle-fill'
        };

        const toastIcon = icon || icons[type] || 'info-circle';

        // Build toast HTML
        toast.innerHTML = `
            <i class="bi bi-${toastIcon} toast__icon"></i>
            <div class="toast__content">
                <span class="toast__message">${message}</span>
                ${action ? `
                    <button class="toast__action" onclick="${action.handler}">
                        ${action.text}
                    </button>
                ` : ''}
            </div>
            ${closable ? `
                <i class="bi bi-x toast__close" onclick="toastManager.close('${id}')"></i>
            ` : ''}
            ${progress ? `
                <div class="toast__progress">
                    <div class="toast__progress-bar" style="animation-duration: ${duration}ms"></div>
                </div>
            ` : ''}
        `;

        // Position container
        this.setPosition(position);

        // Add to container
        this.container.appendChild(toast);

        // Track toast
        this.toasts.push({ id, toast, timeout: null });

        // Animate in
        setTimeout(() => toast.classList.add('toast--visible'), 10);

        // Auto close
        if (duration > 0) {
            const toastData = this.toasts.find(t => t.id === id);
            if (toastData) {
                toastData.timeout = setTimeout(() => this.close(id), duration);
            }
        }

        return id;
    }

    // Close specific toast
    close(id) {
        const toastData = this.toasts.find(t => t.id === id);
        if (!toastData) return;

        // Clear timeout
        if (toastData.timeout) {
            clearTimeout(toastData.timeout);
        }

        // Animate out
        toastData.toast.classList.remove('toast--visible');

        // Remove from DOM after animation
        setTimeout(() => {
            toastData.toast.remove();
            this.toasts = this.toasts.filter(t => t.id !== id);
        }, 300);
    }

    // Close all toasts
    closeAll() {
        this.toasts.forEach(({ id }) => this.close(id));
    }

    // Success toast
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    }

    // Error toast
    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error' });
    }

    // Warning toast
    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    }

    // Info toast
    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }

    // Loading toast
    loading(message = 'Loading...', options = {}) {
        return this.show(message, {
            ...options,
            type: 'info',
            duration: 0,
            closable: false,
            icon: 'arrow-repeat spin',
            progress: false
        });
    }

    // Promise toast
    async promise(promise, messages) {
        const {
            loading = 'Loading...',
            success = 'Success!',
            error = 'Something went wrong'
        } = messages;

        const loadingId = this.loading(loading);

        try {
            const result = await promise;
            this.close(loadingId);
            this.success(success);
            return result;
        } catch (err) {
            this.close(loadingId);
            this.error(error);
            throw err;
        }
    }

    // Set container position
    setPosition(position) {
        const positions = {
            'top-left': { top: '20px', left: '20px', right: 'auto', bottom: 'auto' },
            'top-right': { top: '20px', right: '20px', left: 'auto', bottom: 'auto' },
            'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)', right: 'auto', bottom: 'auto' },
            'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' },
            'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
            'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)', top: 'auto', right: 'auto' }
        };

        const pos = positions[position] || positions['top-right'];
        Object.assign(this.container.style, pos);
    }
}

// Create global instance
const toastManager = new ToastManager();

// Export for global use
window.toastManager = toastManager;
window.showToast = (message, type = 'info') => toastManager[type](message);