class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.init();
    }

    init() {
        this.createContainer();
        this.setupStyles();
    }

    createContainer() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    setupStyles() {
        if (document.getElementById('notification-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification-container {
                position: fixed;
                top: 100px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            }

            .notification {
                background-color: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 16px;
                box-shadow: var(--shadow-lg);
                display: flex;
                align-items: flex-start;
                gap: 12px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                max-width: 100%;
                word-wrap: break-word;
            }

            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .notification.success {
                border-left: 4px solid #10b981;
            }

            .notification.error {
                border-left: 4px solid #ef4444;
            }

            .notification.warning {
                border-left: 4px solid #f59e0b;
            }

            .notification.info {
                border-left: 4px solid #3b82f6;
            }

            .notification-icon {
                flex-shrink: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 2px;
            }

            .notification-content {
                flex: 1;
                min-width: 0;
            }

            .notification-title {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
                line-height: 1.4;
            }

            .notification-message {
                color: var(--text-secondary);
                font-size: 14px;
                line-height: 1.4;
            }

            .notification-close {
                flex-shrink: 0;
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.15s ease;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notification-close:hover {
                background-color: var(--bg-hover);
                color: var(--text-primary);
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background-color: var(--accent-primary);
                border-radius: 0 0 var(--radius-lg) var(--radius-lg);
                transition: width linear;
            }

            @media (max-width: 768px) {
                .notification-container {
                    left: 16px;
                    right: 16px;
                    top: 90px;
                    max-width: none;
                }

                .notification {
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    show(type = 'info', title, message, options = {}) {
        const id = this.generateId();
        const duration = options.duration ?? this.defaultDuration;
        const persistent = options.persistent ?? false;
        const actions = options.actions ?? [];

        // Remove oldest notification if at max capacity
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.hide(oldestId);
        }

        const notification = this.createNotificationElement(id, type, title, message, actions, persistent);
        this.container.appendChild(notification);
        this.notifications.set(id, { element: notification, timer: null });

        // Trigger show animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-hide if not persistent
        if (!persistent && duration > 0) {
            const timer = setTimeout(() => {
                this.hide(id);
            }, duration);
            this.notifications.get(id).timer = timer;

            // Add progress bar
            if (options.showProgress !== false) {
                this.addProgressBar(notification, duration);
            }
        }

        return id;
    }

    createNotificationElement(id, type, title, message, actions, persistent) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.dataset.id = id;

        const icon = this.getTypeIcon(type);
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${this.escapeHtml(title)}</div>
                <div class="notification-message">${this.escapeHtml(message)}</div>
                ${actions.length > 0 ? this.createActions(actions) : ''}
            </div>
            ${!persistent ? `
                <button class="notification-close" data-action="close">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        `;

        // Add event listeners
        notification.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'close') {
                this.hide(id);
            } else if (action && actions.find(a => a.id === action)) {
                const actionObj = actions.find(a => a.id === action);
                if (actionObj.callback) {
                    actionObj.callback();
                }
                if (!actionObj.persistent) {
                    this.hide(id);
                }
            }
        });

        return notification;
    }

    createActions(actions) {
        return `
            <div class="notification-actions" style="margin-top: 8px; display: flex; gap: 8px;">
                ${actions.map(action => `
                    <button class="btn btn-sm ${action.style || 'btn-outline'}" data-action="${action.id}">
                        ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    addProgressBar(notification, duration) {
        const progressBar = document.createElement('div');
        progressBar.className = 'notification-progress';
        progressBar.style.width = '100%';
        notification.style.position = 'relative';
        notification.appendChild(progressBar);

        // Animate progress bar
        requestAnimationFrame(() => {
            progressBar.style.transition = `width ${duration}ms linear`;
            progressBar.style.width = '0%';
        });
    }

    hide(id) {
        const notificationData = this.notifications.get(id);
        if (!notificationData) return;

        const { element, timer } = notificationData;
        
        // Clear timer if exists
        if (timer) {
            clearTimeout(timer);
        }

        // Animate out
        element.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    hideAll() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.hide(id));
    }

    update(id, title, message, type) {
        const notificationData = this.notifications.get(id);
        if (!notificationData) return false;

        const { element } = notificationData;
        
        if (type) {
            element.className = `notification ${type} show`;
            const icon = element.querySelector('.notification-icon i');
            if (icon) {
                icon.className = this.getTypeIcon(type);
            }
        }
        
        if (title) {
            const titleElement = element.querySelector('.notification-title');
            if (titleElement) {
                titleElement.textContent = title;
            }
        }
        
        if (message) {
            const messageElement = element.querySelector('.notification-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }

        return true;
    }

    getTypeIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    generateId() {
        return 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convenience methods
    success(title, message, options = {}) {
        return this.show('success', title, message, options);
    }

    error(title, message, options = {}) {
        return this.show('error', title, message, options);
    }

    warning(title, message, options = {}) {
        return this.show('warning', title, message, options);
    }

    info(title, message, options = {}) {
        return this.show('info', title, message, options);
    }

    // Loading notification
    loading(title, message) {
        return this.show('info', title, message, { 
            persistent: true, 
            showProgress: false 
        });
    }

    // Update loading notification to success/error
    updateLoading(id, type, title, message) {
        this.update(id, title, message, type);
        
        // Auto-hide after update
        setTimeout(() => {
            this.hide(id);
        }, 3000);
    }
}

// Create global instance
window.NotificationManager = NotificationManager;

// For compatibility
window.notification = new NotificationManager();