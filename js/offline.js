class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.pendingRequests = [];
        this.setupEventListeners();
        this.setupServiceWorker();
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleOffline();
        });
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'CACHE_UPDATED') {
                    this.handleCacheUpdate();
                }
            });
        }
    }

    handleOnline() {
        this.showConnectionStatus('back online', 'success');
        this.processPendingRequests();
        this.syncOfflineData();
    }

    handleOffline() {
        this.showConnectionStatus('offline', 'warning');
        this.enableOfflineMode();
    }

    showConnectionStatus(status, type) {
        if (app && app.showToast) {
            app.showToast(`You are ${status}`, type);
        }
    }

    enableOfflineMode() {
        // Show offline indicator
        this.showOfflineIndicator();
        
        // Cache current page state
        this.cacheCurrentState();
        
        // Enable offline-first data access
        this.enableOfflineDataAccess();
    }

    showOfflineIndicator() {
        let indicator = document.getElementById('offline-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.className = 'offline-indicator';
            indicator.innerHTML = `
                <i class="fas fa-wifi-slash me-2"></i>
                You're offline. Some features may be limited.
            `;
            indicator.style.cssText = `
                position: fixed;
                top: 60px;
                left: 0;
                right: 0;
                background: #ffc107;
                color: #000;
                text-align: center;
                padding: 0.5rem;
                z-index: 1040;
            `;
            document.body.appendChild(indicator);
        }
    }

    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    cacheCurrentState() {
        const currentState = {
            url: window.location.href,
            timestamp: Date.now(),
            content: document.getElementById('mainContent')?.innerHTML
        };
        storage.setSession('offline_state', currentState);
    }

    enableOfflineDataAccess() {
        // Override API calls to use cached data when offline
        this.originalFetch = window.fetch;
        window.fetch = this.offlineFetch.bind(this);
    }

    async offlineFetch(url, options = {}) {
        if (this.isOnline) {
            return this.originalFetch(url, options);
        }

        // Check if data is cached
        const cacheKey = this.getCacheKey(url, options);
        const cachedData = storage.getCache(cacheKey);
        
        if (cachedData) {
            return new Response(JSON.stringify(cachedData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Queue request for when online
        if (options.method && options.method !== 'GET') {
            this.queueRequest(url, options);
        }

        throw new Error('Offline: No cached data available');
    }

    getCacheKey(url, options) {
        return `${url}_${JSON.stringify(options)}`;
    }

    queueRequest(url, options) {
        this.pendingRequests.push({ url, options, timestamp: Date.now() });
        storage.set('pending_requests', this.pendingRequests);
    }

    async processPendingRequests() {
        const requests = storage.get('pending_requests') || [];
        
        for (const request of requests) {
            try {
                await this.originalFetch(request.url, request.options);
            } catch (error) {
                console.warn('Failed to process pending request:', error);
            }
        }

        storage.remove('pending_requests');
        this.pendingRequests = [];
        this.hideOfflineIndicator();
    }

    async syncOfflineData() {
        // Sync any offline changes with the server
        const offlineData = storage.get('offline_data') || {};
        
        for (const [key, data] of Object.entries(offlineData)) {
            try {
                await this.syncDataItem(key, data);
                delete offlineData[key];
            } catch (error) {
                console.warn('Failed to sync offline data:', error);
            }
        }

        storage.set('offline_data', offlineData);
    }

    async syncDataItem(key, data) {
        // Implementation depends on data type
        switch (data.type) {
            case 'interaction':
                await api.recordInteraction(data.payload);
                break;
            case 'rating':
                await api.submitRating(data.payload);
                break;
            default:
                console.warn('Unknown offline data type:', data.type);
        }
    }

    storeOfflineAction(type, payload) {
        const offlineData = storage.get('offline_data') || {};
        const id = utils.generateId();
        
        offlineData[id] = {
            type,
            payload,
            timestamp: Date.now()
        };
        
        storage.set('offline_data', offlineData);
    }

    handleCacheUpdate() {
        if (app && app.showToast) {
            app.showToast('Content updated', 'info');
        }
    }

    // Get offline-capable content
    getOfflineContent() {
        return {
            homepage: storage.getCache('homepage'),
            trending: storage.getCache('trending'),
            userFavorites: storage.get('user_favorites') || [],
            watchlist: storage.get('user_watchlist') || []
        };
    }

    isContentAvailable(contentId) {
        const content = storage.getCache(`content_${contentId}`);
        return !!content;
    }
}

const offlineManager = new OfflineManager();
