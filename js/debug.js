// Debug and Error Handling Utilities
class DebugManager {
    constructor() {
        this.isDebugMode = localStorage.getItem('debugMode') === 'true' || 
                          window.location.search.includes('debug=true');
        this.errorLog = [];
        this.setupErrorHandling();
        this.setupConsoleCommands();
    }
    
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.logError('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Promise Rejection', {
                reason: event.reason,
                promise: event.promise
            });
        });
        
        // API error handler
        this.setupAPIErrorHandling();
    }
    
    setupAPIErrorHandling() {
        // Override fetch to add error logging
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                if (!response.ok) {
                    this.logError('API Error', {
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText
                    });
                }
                
                return response;
            } catch (error) {
                this.logError('Network Error', {
                    url: args[0],
                    error: error.message
                });
                throw error;
            }
        };
    }
    
    logError(type, details) {
        const errorEntry = {
            type,
            details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.errorLog.push(errorEntry);
        
        // Keep only last 50 errors
        if (this.errorLog.length > 50) {
            this.errorLog.shift();
        }
        
        // Log to console in debug mode
        if (this.isDebugMode) {
            console.error(`[${type}]`, details);
        }
        
        // Store in localStorage
        localStorage.setItem('errorLog', JSON.stringify(this.errorLog));
        
        // Show user-friendly error message
        this.showUserError(type, details);
    }
    
    showUserError(type, details) {
        let message = 'Something went wrong. Please try again.';
        
        switch (type) {
            case 'Network Error':
                message = 'Network connection failed. Please check your internet connection.';
                break;
            case 'API Error':
                if (details.status === 401) {
                    message = 'Session expired. Please log in again.';
                } else if (details.status === 403) {
                    message = 'Access denied. You don\'t have permission for this action.';
                } else if (details.status === 404) {
                    message = 'The requested content was not found.';
                } else if (details.status >= 500) {
                    message = 'Server error. Please try again later.';
                }
                break;
            case 'JavaScript Error':
                if (this.isDebugMode) {
                    message = `JavaScript Error: ${details.message}`;
                }
                break;
        }
        
        if (window.showToast) {
            showToast(message, 'error');
        }
    }
    
    setupConsoleCommands() {
        if (this.isDebugMode) {
            // Debug commands
            window.debugCommands = {
                enableDebug: () => {
                    localStorage.setItem('debugMode', 'true');
                    window.location.reload();
                },
                disableDebug: () => {
                    localStorage.removeItem('debugMode');
                    window.location.reload();
                },
                clearErrors: () => {
                    this.errorLog = [];
                    localStorage.removeItem('errorLog');
                    console.log('Error log cleared');
                },
                showErrors: () => {
                    console.table(this.errorLog);
                },
                testAPI: async () => {
                    try {
                        const response = await api.getHomepage();
                        console.log('API Test Success:', response);
                    } catch (error) {
                        console.error('API Test Failed:', error);
                    }
                },
                clearCache: () => {
                    api.clearCache();
                    localStorage.clear();
                    console.log('Cache cleared');
                },
                showUserData: () => {
                    console.log('Current User:', getCurrentUser());
                    console.log('Auth Token:', auth.getToken() ? 'Present' : 'Missing');
                    console.log('Watchlist:', ui.loadFromStorage('watchlist', []));
                    console.log('Favorites:', ui.loadFromStorage('favorites', []));
                }
            };
            
            console.log('Debug mode enabled. Available commands:', Object.keys(window.debugCommands));
        }
    }
    
    getErrorReport() {
        return {
            errors: this.errorLog,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            localStorage: this.getLocalStorageData(),
            apiCache: api.getCacheSize()
        };
    }
    
    getLocalStorageData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            try {
                data[key] = JSON.parse(localStorage.getItem(key));
            } catch {
                data[key] = localStorage.getItem(key);
            }
        }
        return data;
    }
    
    exportErrorReport() {
        const report = this.getErrorReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `movierec-error-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize debug manager
const debugManager = new DebugManager();

// Export for global access
window.debugManager = debugManager;