class ErrorHandler {
    constructor() {
        this.setupGlobalErrorHandling();
        this.errors = [];
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason);
        });
    }

    handleError(error, context = 'Unknown') {
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack || '',
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.logError(errorInfo);
        this.showUserFriendlyError(errorInfo);
    }

    logError(errorInfo) {
        console.error('Error logged:', errorInfo);
        
        // Store in local storage for debugging
        this.errors.push(errorInfo);
        if (this.errors.length > 50) {
            this.errors = this.errors.slice(-25); // Keep last 25 errors
        }
        storage.set('error_logs', this.errors);

        // Send to backend if available
        this.sendErrorToBackend(errorInfo);
    }

    async sendErrorToBackend(errorInfo) {
        try {
            await fetch(`${API_BASE}/errors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorInfo)
            });
        } catch {
            // Silently fail - don't create more errors
        }
    }

    showUserFriendlyError(errorInfo) {
        const friendlyMessage = this.getFriendlyMessage(errorInfo.message);
        
        if (app && app.showToast) {
            app.showToast(friendlyMessage, 'error');
        } else {
            // Fallback notification
            this.showFallbackNotification(friendlyMessage);
        }
    }

    getFriendlyMessage(errorMessage) {
        const errorMap = {
            'Failed to fetch': 'Connection problem. Please check your internet connection.',
            'Network error': 'Network issue. Please try again.',
            'Unauthorized': 'Please log in to continue.',
            'Forbidden': 'You don\'t have permission to access this.',
            'Not found': 'The requested content was not found.',
            'Internal server error': 'Server issue. Please try again later.',
            'Timeout': 'Request timed out. Please try again.'
        };

        for (const [key, value] of Object.entries(errorMap)) {
            if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }

        return 'Something went wrong. Please try again.';
    }

    showFallbackNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    getErrorLogs() {
        return storage.get('error_logs') || [];
    }

    clearErrorLogs() {
        storage.remove('error_logs');
        this.errors = [];
    }

    // API Error Handler
    handleApiError(error, endpoint) {
        let message = 'API request failed';
        let type = 'error';

        if (error.status) {
            switch (error.status) {
                case 400:
                    message = 'Invalid request. Please check your input.';
                    break;
                case 401:
                    message = 'Please log in to continue.';
                    if (auth) auth.logout();
                    break;
                case 403:
                    message = 'Access denied.';
                    break;
                case 404:
                    message = 'Content not found.';
                    break;
                case 429:
                    message = 'Too many requests. Please wait a moment.';
                    break;
                case 500:
                    message = 'Server error. Please try again later.';
                    break;
                default:
                    message = `Request failed (${error.status})`;
            }
        }

        this.handleError(new Error(`${endpoint}: ${message}`), 'API');
        return { message, type };
    }

    // Retry mechanism
    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await this.delay(delay * Math.pow(2, i)); // Exponential backoff
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const errorHandler = new ErrorHandler();