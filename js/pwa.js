// Progressive Web App functionality
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.updateAvailable = false;
        this.init();
    }

    init() {
        this.checkInstallation();
        this.setupInstallPrompt();
        this.setupUpdatePrompt();
        this.setupOfflineHandling();
        this.setupNotifications();
        this.setupBackgroundSync();
    }

    checkInstallation() {
        // Check if app is already installed
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');

        if (this.isInstalled) {
            console.log('PWA is installed');
            this.hideInstallButton();
        }
    }

    setupInstallPrompt() {
        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        // Listen for app installation
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.isInstalled = true;
            this.hideInstallButton();
            this.deferredPrompt = null;

            // Track installation
            this.trackEvent('pwa_installed');

            // Show success message
            UIComponents.showToast('App installed successfully!', 'success');
        });
    }

    setupUpdatePrompt() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (this.refreshing) return;
                this.refreshing = true;
                window.location.reload();
            });

            navigator.serviceWorker.ready.then((registration) => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            this.showUpdatePrompt();
                        }
                    });
                });
            });
        }
    }

    setupOfflineHandling() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });

        // Check initial status
        if (!navigator.onLine) {
            this.handleOffline();
        }
    }

    setupNotifications() {
        // Request notification permission
        if ('Notification' in window && 'serviceWorker' in navigator) {
            this.requestNotificationPermission();
        }
    }

    setupBackgroundSync() {
        // Register background sync for offline actions
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then((registration) => {
                // Register sync events
                registration.sync.register('sync-user-interactions');
                registration.sync.register('sync-search-queries');
            });
        }
    }

    showInstallButton() {
        let installButton = document.getElementById('install-pwa-btn');

        if (!installButton) {
            installButton = document.createElement('button');
            installButton.id = 'install-pwa-btn';
            installButton.className = 'btn btn-primary fixed bottom-4 right-4 z-50 shadow-xl';
            installButton.innerHTML = '📱 Install App';
            installButton.addEventListener('click', () => this.installApp());
            document.body.appendChild(installButton);
        }

        installButton.style.display = 'block';

        // Animate in
        setTimeout(() => {
            installButton.style.transform = 'translateY(0)';
            installButton.style.opacity = '1';
        }, 100);
    }

    hideInstallButton() {
        const installButton = document.getElementById('install-pwa-btn');
        if (installButton) {
            installButton.style.display = 'none';
        }
    }

    async installApp() {
        if (!this.deferredPrompt) return;

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await this.deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            this.trackEvent('pwa_install_accepted');
        } else {
            console.log('User dismissed the install prompt');
            this.trackEvent('pwa_install_dismissed');
        }

        // Clear the saved prompt
        this.deferredPrompt = null;
        this.hideInstallButton();
    }

    showUpdatePrompt() {
        const updateBar = document.createElement('div');
        updateBar.id = 'update-bar';
        updateBar.className = 'fixed top-0 left-0 right-0 bg-primary-blue text-white p-3 text-center z-50 transform -translate-y-full transition-transform duration-300';
        updateBar.innerHTML = `
            <div class="flex justify-between items-center max-w-4xl mx-auto">
                <span>🚀 A new version is available!</span>
                <div class="flex gap-2">
                    <button onclick="PWAManager.updateApp()" class="bg-white text-primary-blue px-3 py-1 rounded text-sm font-medium">
                        Update Now
                    </button>
                    <button onclick="PWAManager.dismissUpdate()" class="text-white/80 hover:text-white px-2">
                        ✕
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(updateBar);

        // Animate in
        setTimeout(() => {
            updateBar.style.transform = 'translateY(0)';
        }, 100);

        this.updateAvailable = true;
    }

    updateApp() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((registration) => {
                if (registration && registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        }

        this.dismissUpdate();
    }

    dismissUpdate() {
        const updateBar = document.getElementById('update-bar');
        if (updateBar) {
            updateBar.style.transform = 'translateY(-100%)';
            setTimeout(() => updateBar.remove(), 300);
        }
        this.updateAvailable = false;
    }

    handleOnline() {
        console.log('App is online');

        // Hide offline indicator
        this.hideOfflineIndicator();

        // Sync offline data
        this.syncOfflineData();

        // Show online message briefly
        UIComponents.showToast('Connection restored!', 'success', 2000);

        // Retry failed requests
        this.retryFailedRequests();
    }

    handleOffline() {
        console.log('App is offline');

        // Show offline indicator
        this.showOfflineIndicator();

        // Show offline message
        UIComponents.showToast('You are offline. Some features may be limited.', 'warning', 5000);
    }

    showOfflineIndicator() {
        let indicator = document.getElementById('offline-indicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.className = 'fixed top-16 left-1/2 transform -translate-x-1/2 bg-warning text-black px-4 py-2 rounded-lg text-sm font-medium z-50 shadow-lg';
            indicator.innerHTML = '⚠️ Offline Mode';
            document.body.appendChild(indicator);
        }

        indicator.style.display = 'block';
    }

    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    async syncOfflineData() {
        try {
            // Trigger background sync
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if ('sync' in registration) {
                    await registration.sync.register('sync-offline-data');
                }
            }
        } catch (error) {
            console.error('Background sync failed:', error);
        }
    }

    async retryFailedRequests() {
        // Retry any failed API requests that were cached
        const failedRequests = this.getFailedRequests();

        for (const request of failedRequests) {
            try {
                await fetch(request.url, request.options);
                this.removeFailedRequest(request.id);
            } catch (error) {
                console.error('Retry failed for request:', request.url);
            }
        }
    }

    getFailedRequests() {
        // Get failed requests from localStorage (fallback storage)
        try {
            const requests = localStorage.getItem('failed_requests');
            return requests ? JSON.parse(requests) : [];
        } catch {
            return [];
        }
    }

    removeFailedRequest(requestId) {
        try {
            const requests = this.getFailedRequests();
            const filteredRequests = requests.filter(req => req.id !== requestId);
            localStorage.setItem('failed_requests', JSON.stringify(filteredRequests));
        } catch (error) {
            console.error('Failed to remove failed request:', error);
        }
    }

    async requestNotificationPermission() {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('Notification permission granted');
                this.trackEvent('notification_permission_granted');

                // Subscribe to push notifications
                this.subscribeToPush();
            } else {
                console.log('Notification permission denied');
                this.trackEvent('notification_permission_denied');
            }
        }
    }

    async subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready;

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.getVapidPublicKey())
            });

            // Send subscription to server
            await ApiService.post('/push-subscription', {
                subscription: subscription.toJSON()
            });

            console.log('Push subscription successful');
        } catch (error) {
            console.error('Push subscription failed:', error);
        }
    }

    getVapidPublicKey() {
        // Replace with your actual VAPID public key
        return 'BOYd1MFt3mJC4MFHA-2Z2CnxDCJQ_QJM0BfmCQ7YcRb-mVGnqz5p7qHxhkF9H7G0QzGhQJ8BVKNc4Qz9Z5sCq3w';
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    showNotification(title, options = {}) {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/badge.png',
                ...options
            });

            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                notification.close();

                if (options.url) {
                    window.location.href = options.url;
                }
            };

            return notification;
        }
    }

    trackEvent(eventName, data = {}) {
        // Track PWA events for analytics
        console.log('PWA Event:', eventName, data);

        // Send to analytics service
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                app_name: 'CineScope',
                ...data
            });
        }
    }

    // Public API
    static updateApp() {
        if (window.pwaManager) {
            window.pwaManager.updateApp();
        }
    }

    static dismissUpdate() {
        if (window.pwaManager) {
            window.pwaManager.dismissUpdate();
        }
    }

    static showNotification(title, options) {
        if (window.pwaManager) {
            return window.pwaManager.showNotification(title, options);
        }
    }

    // App shortcuts handling
    handleAppShortcuts() {
        // Handle app shortcuts when PWA is launched
        const urlParams = new URLSearchParams(window.location.search);
        const shortcut = urlParams.get('shortcut');

        if (shortcut) {
            switch (shortcut) {
                case 'search':
                    window.location.href = '/search';
                    break;
                case 'trending':
                    window.location.href = '/categories/trending';
                    break;
                case 'watchlist':
                    window.location.href = '/user/watchlist';
                    break;
            }
        }
    }

    // Share target handling
    handleShareTarget() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedText = urlParams.get('text');
        const sharedUrl = urlParams.get('url');

        if (sharedText || sharedUrl) {
            // Handle shared content
            console.log('Shared content received:', { text: sharedText, url: sharedUrl });

            // Show share success message
            UIComponents.showToast('Content shared to CineScope!', 'success');
        }
    }
}

// Initialize PWA manager
let pwaManager;
document.addEventListener('DOMContentLoaded', () => {
    pwaManager = new PWAManager();
    window.pwaManager = pwaManager;
    window.PWAManager = PWAManager;

    // Handle app shortcuts
    pwaManager.handleAppShortcuts();

    // Handle share target
    pwaManager.handleShareTarget();
});
