// Real-time WebSocket communication
class RealTimeManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.subscribers = new Map();
        this.isConnected = false;
        this.init();
    }

    init() {
        this.connect();
        this.setupEventListeners();
    }

    connect() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = this.onOpen.bind(this);
            this.ws.onmessage = this.onMessage.bind(this);
            this.ws.onclose = this.onClose.bind(this);
            this.ws.onerror = this.onError.bind(this);

        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    onOpen() {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Send authentication if user is logged in
        if (appState.authToken) {
            this.send({
                type: 'auth',
                token: appState.authToken
            });
        }

        // Start heartbeat
        this.startHeartbeat();

        // Notify subscribers
        this.notify('connection', { status: 'connected' });

        // Show connection indicator
        this.showConnectionStatus(true);
    }

    onMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    onClose() {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.stopHeartbeat();

        // Show connection indicator
        this.showConnectionStatus(false);

        // Notify subscribers
        this.notify('connection', { status: 'disconnected' });

        // Schedule reconnect
        this.scheduleReconnect();
    }

    onError(error) {
        console.error('WebSocket error:', error);
        this.notify('error', { error });
    }

    handleMessage(data) {
        switch (data.type) {
            case 'heartbeat':
                this.send({ type: 'heartbeat_ack' });
                break;

            case 'notification':
                this.handleNotification(data.payload);
                break;

            case 'content_update':
                this.handleContentUpdate(data.payload);
                break;

            case 'trending_update':
                this.handleTrendingUpdate(data.payload);
                break;

            case 'user_activity':
                this.handleUserActivity(data.payload);
                break;

            case 'system_alert':
                this.handleSystemAlert(data.payload);
                break;

            case 'recommendation_update':
                this.handleRecommendationUpdate(data.payload);
                break;

            default:
                // Notify specific subscribers
                this.notify(data.type, data.payload);
        }
    }

    handleNotification(payload) {
        // Show real-time notification
        UIComponents.showToast(payload.message, payload.type || 'info');

        // Notify subscribers
        this.notify('notification', payload);
    }

    handleContentUpdate(payload) {
        // Update content in real-time
        console.log('Content update received:', payload);

        // Update content cards if visible
        this.updateContentCards(payload);

        // Notify subscribers
        this.notify('content_update', payload);
    }

    handleTrendingUpdate(payload) {
        // Update trending indicators
        if (window.location.pathname.includes('trending')) {
            this.updateTrendingIndicators(payload);
        }

        this.notify('trending_update', payload);
    }

    handleUserActivity(payload) {
        // Update activity feeds
        if (window.location.pathname === '/admin/dashboard') {
            this.updateActivityFeed(payload);
        }

        this.notify('user_activity', payload);
    }

    handleSystemAlert(payload) {
        // Show system alerts for admins
        if (appState.user?.is_admin) {
            this.showSystemAlert(payload);
        }

        this.notify('system_alert', payload);
    }

    handleRecommendationUpdate(payload) {
        // Update recommendation sections
        this.updateRecommendations(payload);

        this.notify('recommendation_update', payload);
    }

    updateContentCards(payload) {
        // Find and update content cards with new data
        const contentCards = document.querySelectorAll(`[data-content-id="${payload.content_id}"]`);
        contentCards.forEach(card => {
            if (payload.rating) {
                const ratingElement = card.querySelector('.content-card-rating');
                if (ratingElement) {
                    ratingElement.textContent = payload.rating.toFixed(1);
                }
            }

            if (payload.view_count) {
                const viewElement = card.querySelector('.view-count');
                if (viewElement) {
                    viewElement.textContent = payload.view_count.toLocaleString();
                }
            }
        });
    }

    updateTrendingIndicators(payload) {
        // Update trending badges and indicators
        payload.trending_items.forEach(item => {
            const element = document.querySelector(`[data-content-id="${item.id}"]`);
            if (element) {
                const badge = element.querySelector('.trending-badge') ||
                    this.createTrendingBadge();
                badge.textContent = `#${item.rank}`;
                element.appendChild(badge);
            }
        });
    }

    updateActivityFeed(payload) {
        const activityContainer = document.getElementById('recent-activity');
        if (activityContainer) {
            const activityItem = document.createElement('div');
            activityItem.className = 'flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg opacity-0 transform translate-x-4';
            activityItem.innerHTML = `
                <div class="w-8 h-8 bg-primary-blue rounded-full flex items-center justify-center text-xs font-bold">
                    ${payload.user.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <div class="text-sm">
                        <strong>${payload.user}</strong> ${payload.action} 
                        <em>"${payload.content}"</em>
                    </div>
                    <div class="text-xs text-muted">Just now</div>
                </div>
            `;

            activityContainer.insertBefore(activityItem, activityContainer.firstChild);

            // Animate in
            setTimeout(() => {
                activityItem.classList.remove('opacity-0', 'translate-x-4');
            }, 100);

            // Remove old items (keep only 10)
            const items = activityContainer.children;
            if (items.length > 10) {
                for (let i = 10; i < items.length; i++) {
                    items[i].remove();
                }
            }
        }
    }

    showSystemAlert(payload) {
        const alertsContainer = document.getElementById('system-alerts');
        if (alertsContainer) {
            const alertElement = document.createElement('div');
            alertElement.className = 'flex items-start gap-3 p-3 bg-bg-tertiary rounded-lg opacity-0 transform translate-x-4';
            alertElement.innerHTML = `
                <div class="w-6 h-6 flex items-center justify-center text-sm">
                    ${this.getAlertIcon(payload.type)}
                </div>
                <div class="flex-1">
                    <div class="text-sm">${payload.message}</div>
                    <div class="text-xs text-muted">Just now</div>
                </div>
            `;

            alertsContainer.insertBefore(alertElement, alertsContainer.firstChild);

            // Animate in
            setTimeout(() => {
                alertElement.classList.remove('opacity-0', 'translate-x-4');
            }, 100);
        }
    }

    updateRecommendations(payload) {
        // Update recommendation carousels with new data
        if (payload.type === 'personalized' && window.location.pathname === '/dashboard') {
            // Refresh personalized recommendations
            if (window.DashboardManager) {
                window.DashboardManager.loadPersonalizedContent();
            }
        }
    }

    createTrendingBadge() {
        const badge = document.createElement('div');
        badge.className = 'trending-badge absolute top-2 left-2 bg-warning text-black px-2 py-1 rounded text-xs font-bold';
        return badge;
    }

    getAlertIcon(type) {
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            success: '✅'
        };
        return icons[type] || 'ℹ️';
    }

    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    }

    unsubscribe(event, callback) {
        if (this.subscribers.has(event)) {
            const callbacks = this.subscribers.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    notify(event, data) {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Subscriber callback error:', error);
                }
            });
        }
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.send({ type: 'heartbeat' });
        }, 30000); // Every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('Max reconnect attempts reached');
            this.notify('connection', { status: 'failed' });
        }
    }

    showConnectionStatus(connected) {
        // Show/hide connection indicator
        let indicator = document.getElementById('connection-indicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connection-indicator';
            indicator.className = 'fixed top-4 right-4 z-50 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300';
            document.body.appendChild(indicator);
        }

        if (connected) {
            indicator.className = indicator.className.replace(/bg-\w+-\w+/, 'bg-success');
            indicator.textContent = '🟢 Connected';

            // Auto-hide after 3 seconds
            setTimeout(() => {
                indicator.style.opacity = '0';
                indicator.style.transform = 'translateY(-10px)';
            }, 3000);
        } else {
            indicator.className = indicator.className.replace(/bg-\w+-\w+/, 'bg-error');
            indicator.textContent = '🔴 Disconnected';
            indicator.style.opacity = '1';
            indicator.style.transform = 'translateY(0)';
        }
    }

    setupEventListeners() {
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden, reduce activity
                this.stopHeartbeat();
            } else {
                // Page is visible, resume activity
                if (this.isConnected) {
                    this.startHeartbeat();
                } else {
                    this.connect();
                }
            }
        });

        // Listen for online/offline events
        window.addEventListener('online', () => {
            if (!this.isConnected) {
                this.connect();
            }
        });

        window.addEventListener('offline', () => {
            this.notify('connection', { status: 'offline' });
        });
    }

    // Public API methods
    sendUserActivity(activity) {
        this.send({
            type: 'user_activity',
            payload: activity
        });
    }

    sendContentInteraction(contentId, interactionType) {
        this.send({
            type: 'content_interaction',
            payload: {
                content_id: contentId,
                interaction_type: interactionType,
                timestamp: new Date().toISOString()
            }
        });
    }

    requestTrendingUpdate() {
        this.send({
            type: 'request_trending_update'
        });
    }

    joinRoom(roomId) {
        this.send({
            type: 'join_room',
            payload: { room_id: roomId }
        });
    }

    leaveRoom(roomId) {
        this.send({
            type: 'leave_room',
            payload: { room_id: roomId }
        });
    }
}

// Initialize real-time manager
let realTimeManager;
document.addEventListener('DOMContentLoaded', () => {
    realTimeManager = new RealTimeManager();
    window.realTimeManager = realTimeManager;

    // Subscribe to auth changes
    appState.subscribe('authChanged', (isAuthenticated) => {
        if (isAuthenticated && realTimeManager.isConnected) {
            realTimeManager.send({
                type: 'auth',
                token: appState.authToken
            });
        }
    });
});

// Export for use in other modules
window.RealTimeManager = RealTimeManager;