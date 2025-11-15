/**
 * CineBrain Admin Dashboard - Mobile-First Responsive
 * Real-time Analytics & Management Interface
 * Enhanced with Real-time Updates and Notification System
 */

class AdminDashboard {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.refreshInterval = 8000; // 8 seconds for real-time updates
        this.charts = {};
        this.refreshTimer = null;
        this.isRefreshing = false;
        this.currentUser = null;
        this.isMobile = window.innerWidth <= 768;
        this.touchDevice = 'ontouchstart' in window;

        // Real-time data
        this.dashboardData = {
            overview: null,
            analytics: null,
            supportDashboard: null
        };

        // System monitoring properties with faster refresh rates
        this.systemMonitoring = {
            refreshRate: 5000, // 5 seconds for critical monitoring
            healthTimer: null,
            alertsTimer: null,
            performanceTimer: null,
            notificationTimer: null
        };

        this.systemData = {
            health: null,
            alerts: [],
            performance: null,
            services: null,
            lastAlertCheck: null
        };

        // Track processed alerts to avoid duplicates
        this.processedAlerts = new Set();
        this.notificationQueue = [];

        this.realTimeConnection = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.boostTimeout = null;

        this.init();
        this.handleResize();
    }

    async init() {
        try {
            // Check admin authentication
            if (!await this.checkAdminAuth()) {
                window.location.href = '/auth/login.html';
                return;
            }

            // Initialize components
            this.initializeElements();
            this.setupEventListeners();
            this.initializeCharts();

            // Initialize system monitoring
            this.initializeSystemMonitoring();
            this.initializeSystemHealthChart();
            this.setupSystemEventListeners();

            // Load initial data
            await this.loadAllData();

            // Start real-time updates with HTTP polling
            this.startRealTimeUpdates();

            // Start system monitoring
            this.startSystemMonitoring();

            // Setup smart polling
            this.setupSmartPolling();

            console.log('✅ CineBrain Admin Dashboard Real-time System initialized');

        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
            this.showError('Failed to initialize admin dashboard');
        }
    }

    handleResize() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;

            if (wasMobile !== this.isMobile) {
                this.reinitializeForDevice();
            }

            this.resizeCharts();
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.reinitializeForDevice();
                this.resizeCharts();
            }, 100);
        });
    }

    reinitializeForDevice() {
        if (this.dashboardData.overview) {
            this.renderOverviewCards(this.dashboardData.overview);
            this.renderQuickActions();
        }

        if (this.dashboardData.analytics) {
            this.updateCharts(this.dashboardData.analytics);
        }
    }

    async checkAdminAuth() {
        try {
            const token = localStorage.getItem('cinebrain-token');
            const userStr = localStorage.getItem('cinebrain-user');

            if (!token || !userStr) {
                return false;
            }

            const user = JSON.parse(userStr);
            if (!user.is_admin) {
                return false;
            }

            this.currentUser = user;
            return true;

        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    initializeElements() {
        this.elements = {
            // Status elements
            lastUpdate: document.getElementById('lastUpdate'),
            autoRefreshStatus: document.getElementById('autoRefreshStatus'),
            liveConnectionStatus: document.getElementById('liveConnectionStatus'),

            // Status bar elements
            mainStatusDot: document.getElementById('mainStatusDot'),
            mainStatusText: document.getElementById('mainStatusText'),
            dbStatus: document.getElementById('dbStatus'),
            cacheStatus: document.getElementById('cacheStatus'),
            apiStatus: document.getElementById('apiStatus'),

            // Containers
            overviewCards: document.getElementById('overviewCards'),
            mobileOverviewCards: document.getElementById('mobileOverviewCards'),
            mobileStatsGrid: document.getElementById('mobileStatsGrid'),
            recentActivity: document.getElementById('recentActivity'),
            supportStats: document.getElementById('supportStats'),
            recentTickets: document.getElementById('recentTickets'),

            // Buttons
            refreshDashboard: document.getElementById('refreshDashboard'),
            viewAllActivity: document.getElementById('viewAllActivity'),
            viewSupportDashboard: document.getElementById('viewSupportDashboard'),

            // Charts
            userGrowthChart: document.getElementById('userGrowthChart'),
            contentDistributionChart: document.getElementById('contentDistributionChart'),
            systemPerformanceChart: document.getElementById('systemPerformanceChart'),

            // Period selector
            activityPeriod: document.getElementById('activityPeriod'),

            // System monitoring elements
            alertsSection: document.getElementById('alertsSection'),
            realTimeAlerts: document.getElementById('realTimeAlerts'),
            activeAlertsCount: document.getElementById('activeAlertsCount'),
            servicesStatusGrid: document.getElementById('servicesStatusGrid'),
            adminActivityMetrics: document.getElementById('adminActivityMetrics'),
            systemNotificationsList: document.getElementById('systemNotificationsList')
        };
    }

    setupEventListeners() {
        // Refresh button
        this.elements.refreshDashboard?.addEventListener('click', (e) => {
            e.preventDefault();
            this.refreshAllData();
            this.hapticFeedback('light');
        });

        // Navigation buttons
        this.elements.viewAllActivity?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/admin/analytics.html';
        });

        this.elements.viewSupportDashboard?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/admin/Support-Dashboard.html';
        });

        // Period selector
        this.elements.activityPeriod?.addEventListener('change', () => {
            this.updateChartsForPeriod();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshAllData();
                        break;
                }
            }
        });

        // Window focus/blur for refresh
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Immediately refresh when tab becomes visible
                this.refreshAllData();
                this.checkMissedNotifications();
            }
        });

        // Listen for notification events from other parts of the system
        window.addEventListener('cinebrain-admin-event', (e) => {
            if (e.detail.type === 'refresh') {
                this.refreshAllData();
            }
        });

        // Mobile-specific touch gestures
        if (this.touchDevice) {
            this.setupTouchGestures();
        }
    }

    setupSystemEventListeners() {
        // Quick health check
        const quickHealthCheck = document.getElementById('quickHealthCheck');
        quickHealthCheck?.addEventListener('click', () => {
            this.performQuickHealthCheck();
            this.hapticFeedback('medium');
        });

        // Monitoring refresh rate
        const monitoringRefreshRate = document.getElementById('monitoringRefreshRate');
        monitoringRefreshRate?.addEventListener('change', (e) => {
            this.updateMonitoringRefreshRate(parseInt(e.target.value));
        });

        // Dismiss all alerts
        const dismissAllAlerts = document.getElementById('dismissAllAlerts');
        dismissAllAlerts?.addEventListener('click', () => {
            this.dismissAllAlerts();
        });

        // Mark all notifications read
        const markAllNotificationsRead = document.getElementById('markAllNotificationsRead');
        markAllNotificationsRead?.addEventListener('click', () => {
            this.markAllNotificationsAsRead();
        });
    }

    setupTouchGestures() {
        let startY = 0;
        let currentY = 0;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && startY) {
                currentY = e.touches[0].pageY;
                const pullDistance = currentY - startY;

                if (pullDistance > 100 && !this.isRefreshing) {
                    this.showPullToRefreshIndicator();
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (window.scrollY === 0 && startY && currentY) {
                const pullDistance = currentY - startY;

                if (pullDistance > 100 && !this.isRefreshing) {
                    this.refreshAllData();
                    this.hapticFeedback('medium');
                }
            }

            startY = 0;
            currentY = 0;
            this.hidePullToRefreshIndicator();
        }, { passive: true });
    }

    showPullToRefreshIndicator() {
        if (!document.getElementById('pullToRefreshIndicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'pullToRefreshIndicator';
            indicator.innerHTML = '<i data-feather="refresh-cw"></i> Release to refresh';
            indicator.style.cssText = `
                position: fixed;
                top: calc(var(--topbar-height) + 10px);
                left: 50%;
                transform: translateX(-50%);
                background: var(--admin-primary);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(indicator);

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    hidePullToRefreshIndicator() {
        const indicator = document.getElementById('pullToRefreshIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    hapticFeedback(type = 'light') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 50
            };
            navigator.vibrate(patterns[type] || patterns.light);
        }
    }

    initializeCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750
            },
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
                        usePointStyle: true,
                        font: {
                            size: this.isMobile ? 11 : 12
                        },
                        padding: this.isMobile ? 10 : 15
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
                        font: {
                            size: this.isMobile ? 10 : 11
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
                        font: {
                            size: this.isMobile ? 10 : 11
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    radius: this.isMobile ? 3 : 4,
                    hoverRadius: this.isMobile ? 5 : 6
                }
            }
        };

        // User Growth Chart
        const userGrowthCtx = this.elements.userGrowthChart?.getContext('2d');
        if (userGrowthCtx) {
            this.charts.userGrowth = new Chart(userGrowthCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'New Users',
                        data: [],
                        borderColor: '#113CCF',
                        backgroundColor: 'rgba(17, 60, 207, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: this.isMobile ? 2 : 3
                    }, {
                        label: 'Active Users',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: this.isMobile ? 2 : 3
                    }]
                },
                options: chartOptions
            });
        }

        // Content Distribution Chart
        const contentDistCtx = this.elements.contentDistributionChart?.getContext('2d');
        if (contentDistCtx) {
            this.charts.contentDistribution = new Chart(contentDistCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#113CCF',
                            '#e50914',
                            '#10b981',
                            '#f59e0b',
                            '#8b5cf6',
                            '#ef4444'
                        ],
                        borderWidth: 0,
                        hoverOffset: this.isMobile ? 4 : 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: this.isMobile ? '60%' : '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
                                usePointStyle: true,
                                padding: this.isMobile ? 10 : 15,
                                font: {
                                    size: this.isMobile ? 10 : 11
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    initializeSystemMonitoring() {
        // Initialize notification system
        this.setupNotificationSystem();

        // Set up alert tracking
        this.systemData.lastAlertCheck = new Date();
    }

    setupNotificationSystem() {
        // Initialize notification queue processor
        setInterval(() => {
            this.processNotificationQueue();
        }, 1000); // Process queue every second
    }

    initializeSystemHealthChart() {
        const ctx = this.elements.systemPerformanceChart?.getContext('2d');
        if (ctx) {
            this.charts.systemPerformance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'CPU Usage',
                        data: [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: this.isMobile ? 2 : 3
                    }, {
                        label: 'Memory Usage',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: this.isMobile ? 2 : 3
                    }, {
                        label: 'Disk Usage',
                        data: [],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: this.isMobile ? 2 : 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
                                usePointStyle: true,
                                font: {
                                    size: this.isMobile ? 10 : 11
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
                                font: {
                                    size: this.isMobile ? 9 : 10
                                }
                            },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
                                font: {
                                    size: this.isMobile ? 9 : 10
                                },
                                callback: function (value) {
                                    return value + '%';
                                }
                            },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }
    }

    initializeRealTimeConnection() {
        // WebSocket disabled - using HTTP polling for real-time updates
        // This provides better compatibility and doesn't require WebSocket server setup
        console.log('✅ Using HTTP polling for real-time updates');
        this.realTimeConnection = null;
    }

    handleRealTimeUpdate(data) {
        // Process real-time updates from polling
        if (!data) return;

        try {
            switch (data.type) {
                case 'alert':
                    this.handleNewAlert(data.payload);
                    break;
                case 'notification':
                    this.handleNewNotification(data.payload);
                    break;
                case 'stats_update':
                    this.handleStatsUpdate(data.payload);
                    break;
                case 'support_update':
                    this.handleSupportUpdate(data.payload);
                    break;
                default:
                    // Handle direct data updates
                    if (data.alerts) {
                        data.alerts.forEach(alert => this.handleNewAlert(alert));
                    }
                    if (data.notifications) {
                        data.notifications.forEach(notif => this.handleNewNotification(notif));
                    }
            }
        } catch (error) {
            console.error('Error handling real-time update:', error);
        }
    }

    attemptReconnect() {
        // Not needed for HTTP polling
        console.log('✅ HTTP polling mode active - no reconnection needed');
    }

    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    async loadAllData() {
        this.showLoading(true);

        try {
            // Load all data in parallel for faster initial load
            const promises = [
                this.loadDashboardOverview(),
                this.loadAnalytics(),
                this.loadSupportDashboard()
            ];

            await Promise.allSettled(promises);

            this.updateLastRefreshTime();

            // Validate data integrity
            this.validateDataIntegrity();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load some dashboard data');
        } finally {
            this.showLoading(false);
        }
    }

    validateDataIntegrity() {
        // Ensure all critical data is present and valid
        if (!this.dashboardData.overview || !this.dashboardData.overview.general_stats) {
            console.error('Invalid overview data, reloading...');
            this.loadDashboardOverview();
        }

        if (!this.dashboardData.analytics || !this.dashboardData.analytics.user_analytics) {
            console.error('Invalid analytics data, reloading...');
            this.loadAnalytics();
        }

        if (!this.dashboardData.supportDashboard || !this.dashboardData.supportDashboard.ticket_stats) {
            console.error('Invalid support data, reloading...');
            this.loadSupportDashboard();
        }
    }

    async loadDashboardOverview() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/dashboard');
            if (response.ok) {
                const data = await response.json();

                // Validate data structure
                if (data && data.general_stats) {
                    this.dashboardData.overview = data;
                    this.renderOverviewCards(data);
                    this.renderRecentActivity(data.recent_activity);
                    this.renderQuickActions();

                    // Check for alerts in overview data
                    if (data.alerts && data.alerts.length > 0) {
                        data.alerts.forEach(alert => this.handleNewAlert(alert));
                    }
                } else {
                    throw new Error('Invalid dashboard data structure');
                }
            } else {
                throw new Error(`Dashboard request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading dashboard overview:', error);
            this.showError('Failed to load dashboard overview');
        }
    }

    async loadAnalytics() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/analytics');
            if (response.ok) {
                const data = await response.json();

                // Validate analytics data
                if (data && (data.user_analytics || data.content_analytics)) {
                    this.dashboardData.analytics = data;
                    this.updateCharts(data);
                } else {
                    throw new Error('Invalid analytics data structure');
                }
            } else {
                throw new Error(`Analytics request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Failed to load analytics');
        }
    }

    async loadSupportDashboard() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/support/dashboard');
            if (response.ok) {
                const data = await response.json();

                // Validate support data
                if (data && data.ticket_stats) {
                    this.dashboardData.supportDashboard = data;
                    this.renderSupportStats(data);
                    this.renderRecentTickets(data.recent_tickets || []);

                    // Check for urgent tickets and create alerts
                    if (data.ticket_stats.urgent > 3) {
                        this.handleNewAlert({
                            level: 'warning',
                            component: 'Support System',
                            message: `${data.ticket_stats.urgent} urgent tickets need attention`
                        });
                    }
                } else {
                    throw new Error('Invalid support data structure');
                }
            } else {
                throw new Error(`Support dashboard request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading support dashboard:', error);
            this.showError('Failed to load support dashboard');
        }
    }

    renderQuickActions() {
        let quickActionsContainer = document.getElementById('quickActionsContainer');

        if (!quickActionsContainer) {
            const overviewCardsRow = document.getElementById('overviewCards')?.closest('.row');

            if (overviewCardsRow) {
                const quickActionsRow = document.createElement('div');
                quickActionsRow.className = 'row mb-4';
                quickActionsRow.innerHTML = `
                <div class="col-12">
                    <h2 class="section-title">
                        <i data-feather="zap"></i>
                        Quick Actions
                    </h2>
                </div>
                <div class="col-12">
                    <div id="quickActionsContainer" class="quick-actions"></div>
                </div>
            `;
                overviewCardsRow.parentNode.insertBefore(quickActionsRow, overviewCardsRow.nextSibling);
                quickActionsContainer = document.getElementById('quickActionsContainer');
            }
        }

        if (quickActionsContainer) {
            const actions = [
                { href: '/admin/content.html', icon: 'film', label: 'Content' },
                { href: '/admin/users.html', icon: 'users', label: 'Users' },
                { href: '/admin/Support-Dashboard.html', icon: 'message-circle', label: 'Support' },
                { href: '/admin/analytics.html', icon: 'bar-chart-2', label: 'Analytics' },
                { href: '/admin/recommendations.html', icon: 'star', label: 'Recommendations' },
                { href: '/admin/settings.html', icon: 'settings', label: 'Settings' }
            ];

            quickActionsContainer.innerHTML = actions.map(action => `
            <a href="${action.href}" class="action-btn">
                <i data-feather="${action.icon}"></i>
                <span>${action.label}</span>
            </a>
        `).join('');

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    renderOverviewCards(data) {
        const stats = data.general_stats || {};
        const supportOverview = data.support_overview || {};

        const cards = [
            {
                title: 'Total Users',
                value: this.formatNumber(stats.total_users || 0),
                change: this.calculateChange(stats.new_users_month, stats.total_users),
                icon: 'users',
                color: '#113CCF'
            },
            {
                title: 'Total Content',
                value: this.formatNumber(stats.total_content || 0),
                change: '+' + this.formatNumber(stats.content_added_week || 0),
                icon: 'film',
                color: '#e50914'
            },
            {
                title: 'Active Users',
                value: this.formatNumber(stats.active_users_week || 0),
                change: this.calculateChange(stats.active_users_change || 0, stats.active_users_week),
                icon: 'activity',
                color: '#10b981'
            },
            {
                title: 'Support Tickets',
                value: this.formatNumber(supportOverview.open_tickets || 0),
                change: supportOverview.urgent_tickets > 0 ? `${supportOverview.urgent_tickets} urgent` : 'All handled',
                icon: 'headphones',
                color: supportOverview.urgent_tickets > 0 ? '#f59e0b' : '#10b981'
            },
            {
                title: 'Interactions',
                value: this.formatNumber(stats.total_interactions || 0),
                change: '+' + this.formatNumber(stats.interactions_today || 0) + ' today',
                icon: 'mouse-pointer',
                color: '#8b5cf6'
            },
            {
                title: 'Recommendations',
                value: this.formatNumber(stats.total_recommendations || 0),
                change: 'Active',
                icon: 'star',
                color: '#f59e0b'
            }
        ];

        // Render mobile cards (horizontal scroll)
        if (this.elements.mobileOverviewCards && this.isMobile) {
            this.elements.mobileOverviewCards.innerHTML = cards.map(card => `
                <div class="mobile-overview-card" style="--card-color: ${card.color}">
                    <div class="mobile-card-value">${card.value}</div>
                    <div class="mobile-card-label">${card.title}</div>
                </div>
            `).join('');
        }

        // Render mobile stats grid
        if (this.elements.mobileStatsGrid && this.isMobile) {
            this.elements.mobileStatsGrid.innerHTML = cards.slice(0, 4).map(card => `
                <div class="mobile-stat-item" style="--stat-color: ${card.color}">
                    <div class="mobile-stat-value">${card.value}</div>
                    <div class="mobile-stat-label">${card.title.split(' ')[0]}</div>
                </div>
            `).join('');
        }

        // Render desktop cards
        if (this.elements.overviewCards && !this.isMobile) {
            this.elements.overviewCards.innerHTML = cards.map(card => `
                <div class="col-lg-2 col-md-4 col-6">
                    <div class="overview-card fade-in" style="--card-color: ${card.color}">
                        <div class="overview-card-header">
                            <div class="overview-card-title">
                                <i data-feather="${card.icon}" class="overview-card-icon"></i>
                                ${card.title}
                            </div>
                        </div>
                        <div class="overview-card-value">${card.value}</div>
                        <div class="overview-card-change ${this.getChangeClass(card.change)}">
                            <i data-feather="${this.getChangeIcon(card.change)}" class="change-icon"></i>
                            ${card.change}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderRecentActivity(activities) {
        if (!this.elements.recentActivity || !activities) return;

        this.showTableLoading(this.elements.recentActivity);

        const allActivities = [
            ...(activities.recent_content || []).map(item => ({
                type: 'content_added',
                title: `New ${item.type}: ${item.title}`,
                subtitle: `Rating: ${item.rating || 'N/A'}/10`,
                user: 'System',
                time: this.formatTimeAgo(item.created_at),
                timestamp: new Date(item.created_at),
                status: 'success'
            })),
            ...(activities.recent_users || []).map(item => ({
                type: 'user_registered',
                title: 'New user registered',
                subtitle: item.username,
                user: item.email,
                time: this.formatTimeAgo(item.created_at),
                timestamp: new Date(item.created_at),
                status: 'info'
            })),
            ...(activities.recent_recommendations || []).map(item => ({
                type: 'recommendation_created',
                title: 'Content recommended',
                subtitle: item.content_title,
                user: item.admin_name,
                time: this.formatTimeAgo(item.created_at),
                timestamp: new Date(item.created_at),
                status: 'warning'
            }))
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, this.isMobile ? 5 : 8);

        if (allActivities.length === 0) {
            this.elements.recentActivity.innerHTML = `
                <div class="table-empty-state">
                    <i data-feather="clock"></i>
                    <p>No recent activity</p>
                </div>
            `;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            return;
        }

        let tableHtml = `
            <div class="table-responsive-mobile">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Activity</th>
                            <th class="d-none d-md-table-cell">User</th>
                            <th>Time</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        allActivities.forEach(activity => {
            tableHtml += `
                <tr class="slide-up activity-new">
                    <td>
                        <div class="activity-info">
                            <span class="activity-title">${this.truncateText(activity.title, this.isMobile ? 30 : 50)}</span>
                            <span class="activity-subtitle">${this.truncateText(activity.subtitle, this.isMobile ? 25 : 40)}</span>
                        </div>
                    </td>
                    <td class="d-none d-md-table-cell">
                        <span style="color: var(--text-secondary); font-size: var(--font-xs);">
                            ${this.truncateText(activity.user, 20)}
                        </span>
                    </td>
                    <td>
                        <span class="time-info">${activity.time}</span>
                    </td>
                    <td>
                        <span class="table-badge table-badge-${activity.status}">
                            ${activity.status}
                        </span>
                    </td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table></div>';
        this.elements.recentActivity.innerHTML = tableHtml;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderRecentTickets(tickets) {
        if (!this.elements.recentTickets || !tickets) return;

        this.showTableLoading(this.elements.recentTickets);

        if (tickets.length === 0) {
            this.elements.recentTickets.innerHTML = `
                <div class="table-empty-state">
                    <i data-feather="check-circle"></i>
                    <p>No recent tickets</p>
                </div>
            `;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            return;
        }

        const displayTickets = tickets.slice(0, this.isMobile ? 3 : 6);

        let tableHtml = `
            <div class="table-responsive-mobile">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ticket</th>
                            <th class="d-none d-md-table-cell">User</th>
                            <th>Priority</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        displayTickets.forEach(ticket => {
            const priorityBadge = {
                'urgent': 'danger',
                'high': 'warning',
                'normal': 'info',
                'low': 'success'
            }[ticket.priority] || 'info';

            tableHtml += `
                <tr class="slide-up ${ticket.is_sla_breached ? 'sla-breached' : ''}">
                    <td>
                        <div class="ticket-info">
                            <a href="/admin/support/ticket/${ticket.id || ticket.ticket_number}" class="ticket-number">
                                #${ticket.ticket_number}
                            </a>
                            <span class="ticket-subject">
                                ${this.truncateText(ticket.subject, this.isMobile ? 30 : 45)}
                                ${ticket.is_sla_breached ? '<span class="table-badge table-badge-danger" style="font-size: 10px; margin-left: 4px;">SLA</span>' : ''}
                            </span>
                        </div>
                    </td>
                    <td class="d-none d-md-table-cell">
                        <span style="color: var(--text-secondary); font-size: var(--font-xs);">
                            ${this.truncateText(ticket.user_name, 15)}
                        </span>
                    </td>
                    <td>
                        <span class="table-badge table-badge-${priorityBadge}">
                            ${ticket.priority}
                        </span>
                    </td>
                    <td>
                        <span class="time-info">${this.formatTimeAgo(ticket.created_at)}</span>
                    </td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table></div>';
        this.elements.recentTickets.innerHTML = tableHtml;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderSupportStats(data) {
        if (!this.elements.supportStats || !data.ticket_stats) return;

        const stats = data.ticket_stats;

        const statItems = [
            { label: 'Total', value: stats.total || 0, color: '#113CCF' },
            { label: 'Open', value: stats.open || 0, color: '#f59e0b' },
            { label: 'Urgent', value: stats.urgent || 0, color: '#ef4444' },
            { label: 'Today', value: stats.today_created || 0, color: '#10b981' }
        ];

        this.elements.supportStats.innerHTML = statItems.map(stat => `
            <div class="support-stat">
                <div class="support-stat-value" style="--stat-color: ${stat.color}">${stat.value}</div>
                <div class="support-stat-label">${stat.label}</div>
            </div>
        `).join('');

        // Update urgent tickets badge
        const urgentBadge = document.getElementById('urgentTicketsBadge');
        if (urgentBadge) {
            if (stats.urgent > 0) {
                urgentBadge.textContent = stats.urgent;
                urgentBadge.style.display = 'inline-block';
            } else {
                urgentBadge.style.display = 'none';
            }
        }
    }

    updateCharts(data) {
        // Update User Growth Chart with animation
        if (this.charts.userGrowth && data.user_analytics) {
            const userGrowthData = data.user_analytics.user_growth || [];
            const activeUsersData = data.user_analytics.active_users_trend || [];

            const maxLabels = this.isMobile ? 7 : 14;
            const recentGrowthData = userGrowthData.slice(-maxLabels);
            const recentActiveData = activeUsersData.slice(-maxLabels);

            this.charts.userGrowth.data.labels = recentGrowthData.map(item =>
                new Date(item.date).toLocaleDateString('en-US', {
                    month: this.isMobile ? 'numeric' : 'short',
                    day: 'numeric'
                })
            );
            this.charts.userGrowth.data.datasets[0].data = recentGrowthData.map(item => item.count);
            this.charts.userGrowth.data.datasets[1].data = recentActiveData.map(item => item.count);
            this.charts.userGrowth.update();
        }

        // Update Content Distribution Chart with animation
        if (this.charts.contentDistribution && data.content_analytics) {
            const contentDist = data.content_analytics.content_distribution || [];

            this.charts.contentDistribution.data.labels = contentDist.map(item =>
                this.isMobile ? this.capitalizeFirst(item.type) :
                    item.type.charAt(0).toUpperCase() + item.type.slice(1)
            );
            this.charts.contentDistribution.data.datasets[0].data = contentDist.map(item => item.count);
            this.charts.contentDistribution.update();
        }
    }

    // System Monitoring Methods
    startSystemMonitoring() {
        // Staggered polling to reduce server load and improve performance

        // Critical monitoring - alerts (every 5 seconds)
        this.systemMonitoring.alertsTimer = setInterval(() => {
            this.loadSystemAlerts();
        }, 5000);

        // Important monitoring - notifications and health (every 8 seconds, offset by 2s)
        setTimeout(() => {
            this.systemMonitoring.notificationTimer = setInterval(() => {
                this.loadSystemNotifications();
            }, 8000);
        }, 2000);

        setTimeout(() => {
            this.systemMonitoring.healthTimer = setInterval(() => {
                this.loadSystemHealth();
            }, 8000);
        }, 4000);

        // Performance monitoring (every 15 seconds, offset by 6s)
        setTimeout(() => {
            this.systemMonitoring.performanceTimer = setInterval(() => {
                this.loadSystemPerformance();
                this.loadServicesStatus();
                this.loadAdminActivity();
            }, 15000);
        }, 6000);

        // Load initial data
        this.loadAllSystemData();

        console.log('✅ Optimized HTTP polling monitoring started');
        console.log('   - Alerts: 5s | Health/Notifications: 8s | Performance: 15s');
    }

    async loadAllSystemData() {
        try {
            await Promise.allSettled([
                this.loadSystemHealth(),
                this.loadSystemAlerts(),
                this.loadSystemPerformance(),
                this.loadServicesStatus(),
                this.loadAdminActivity(),
                this.loadSystemNotifications()
            ]);

            this.updateSystemStatusBar();
        } catch (error) {
            console.error('Error loading system data:', error);
        }
    }

    async loadSystemHealth() {
        try {
            const response = await this.makeAuthenticatedRequest('/health/detailed');
            if (response.ok) {
                const data = await response.json();
                this.systemData.health = data;
                this.updateSystemHealthCards(data);
                this.updateSystemStatusBar(data);
            }
        } catch (error) {
            console.error('Error loading system health:', error);
            this.updateSystemStatusBar({ status: 'error' });
        }
    }

    async loadSystemAlerts() {
        try {
            const response = await this.makeAuthenticatedRequest('/system/monitoring/alerts');
            if (response.ok) {
                const data = await response.json();
                const alerts = data.alerts || [];

                // Process new alerts
                alerts.forEach(alert => {
                    const alertId = alert.id || `${alert.component}-${alert.message}`;
                    if (!this.processedAlerts.has(alertId)) {
                        this.processedAlerts.add(alertId);
                        this.handleNewAlert(alert);
                    }
                });

                this.systemData.alerts = alerts;
                this.updateSystemAlerts(alerts);
            }
        } catch (error) {
            console.error('Error loading system alerts:', error);
        }
    }

    async loadSystemPerformance() {
        try {
            const response = await this.makeAuthenticatedRequest('/performance');
            if (response.ok) {
                const data = await response.json();
                this.systemData.performance = data;
                this.updatePerformanceChart(data);
                this.updatePerformanceIndicator(data);
            }
        } catch (error) {
            console.error('Error loading system performance:', error);
        }
    }

    async loadServicesStatus() {
        try {
            const response = await this.makeAuthenticatedRequest('/system/services');
            if (response.ok) {
                const data = await response.json();
                this.systemData.services = data;
                this.updateServicesGrid(data);
            }
        } catch (error) {
            console.error('Error loading services status:', error);
        }
    }

    async loadAdminActivity() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/monitoring/activity');
            if (response.ok) {
                const data = await response.json();
                this.updateAdminActivityMetrics(data);
            }
        } catch (error) {
            console.error('Error loading admin activity:', error);
        }
    }

    async loadSystemNotifications() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/monitoring/notifications');
            if (response.ok) {
                const data = await response.json();
                this.updateSystemNotifications(data);

                // Update topbar notification count
                const notifications = data.recent_notifications || [];
                const unreadCount = notifications.filter(n => !n.is_read).length;

                const notificationBadge = document.getElementById('notificationBadge');
                if (notificationBadge) {
                    if (unreadCount > 0) {
                        notificationBadge.textContent = unreadCount;
                        notificationBadge.style.display = 'block';
                    } else {
                        notificationBadge.style.display = 'none';
                    }
                }

                // Store in localStorage for topbar
                localStorage.setItem('cinebrain-admin-notifications', JSON.stringify(notifications));

                // Trigger event for topbar to update
                window.dispatchEvent(new CustomEvent('cinebrain-notifications-updated', {
                    detail: { notifications, unreadCount }
                }));
            }
        } catch (error) {
            console.error('Error loading system notifications:', error);
        }
    }

    handleNewAlert(alert) {
        // Add to notification queue
        this.notificationQueue.push({
            type: 'alert',
            title: `System Alert: ${alert.component || 'System'}`,
            message: alert.message,
            level: alert.level,
            timestamp: alert.timestamp || new Date().toISOString(),
            data: alert
        });
    }

    handleNewNotification(notification) {
        // Add to notification queue
        this.notificationQueue.push({
            type: 'notification',
            title: notification.title,
            message: notification.message,
            level: notification.is_urgent ? 'warning' : 'info',
            timestamp: notification.created_at || new Date().toISOString(),
            data: notification
        });
    }

    handleStatsUpdate(stats) {
        // Update relevant stats in real-time
        if (stats.overview) {
            this.dashboardData.overview = { ...this.dashboardData.overview, ...stats.overview };
            this.renderOverviewCards(this.dashboardData.overview);
        }
    }

    handleSupportUpdate(support) {
        // Update support stats in real-time
        if (support.ticket_stats) {
            if (this.dashboardData.supportDashboard) {
                this.dashboardData.supportDashboard.ticket_stats = support.ticket_stats;
                this.renderSupportStats(this.dashboardData.supportDashboard);
            }
        }
    }

    processNotificationQueue() {
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            this.sendNotificationToTopbar(notification);
        }
    }

    sendNotificationToTopbar(notification) {
        // Update badge count immediately
        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
            const currentCount = parseInt(notificationBadge.textContent || '0');
            notificationBadge.textContent = currentCount + 1;
            notificationBadge.style.display = 'block';
        }

        // Store notification in localStorage
        const notifications = JSON.parse(localStorage.getItem('cinebrain-admin-notifications') || '[]');
        notifications.unshift({
            id: Date.now(),
            ...notification,
            isRead: false,
            createdAt: new Date().toISOString()
        });

        // Keep only last 50
        if (notifications.length > 50) {
            notifications.splice(50);
        }

        localStorage.setItem('cinebrain-admin-notifications', JSON.stringify(notifications));

        // Trigger event for topbar - UPDATED
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('cinebrain-notification', {
                detail: notification,
                bubbles: true
            }));
        }, 100);

        // Show toast for critical items
        if (notification.level === 'critical' || notification.level === 'error' || notification.level === 'urgent') {
            this.showToast(notification.message, notification.level === 'critical' ? 'error' : 'warning');
        }
    }

    updateSystemHealthCards(data) {
        // Update Database Health Card
        this.updateHealthCard('database', data.components?.database || {});

        // Update Cache Health Card
        this.updateHealthCard('cache', data.components?.cache || {});

        // Update Services Health Card
        this.updateHealthCard('services', data.components?.external_apis || {});

        // Update Performance Health Card
        this.updateHealthCard('performance', data.resources || {});
    }

    updateHealthCard(type, data) {
        const healthStatus = document.getElementById(`${type}HealthStatus`);
        const healthDot = healthStatus?.querySelector('.health-dot');

        if (!healthDot) return;

        // Determine health status
        let status = 'healthy';
        if (type === 'database') {
            status = data.status === 'healthy' ? 'healthy' : 'danger';
            this.updateElement(`dbConnectionStatus`, data.connection || data.status || 'Unknown');
            this.updateElement(`dbResponseTime`, data.response_time_ms ? `${data.response_time_ms}ms` : '--');
            this.updateElement(`dbConnections`, data.active_connections || '--');
        } else if (type === 'cache') {
            status = data.functional ? 'healthy' : (data.configured ? 'warning' : 'danger');
            this.updateElement(`cacheType`, data.type || 'Not configured');
            this.updateElement(`cacheHitRate`, data.hit_rate || '--');
            this.updateElement(`cacheMemory`, data.memory_usage || '--');
        } else if (type === 'services') {
            const servicesHealthy = data.tmdb?.configured && data.youtube?.configured && data.cloudinary?.configured;
            status = servicesHealthy ? 'healthy' : 'warning';
            this.updateElement(`tmdbStatus`, data.tmdb?.configured ? '✓' : '✗');
            this.updateElement(`youtubeStatus`, data.youtube?.configured ? '✓' : '✗');
            this.updateElement(`cloudinaryStatus`, data.cloudinary?.configured ? '✓' : '✗');
        } else if (type === 'performance') {
            const maxUsage = Math.max(data.memory_usage || 0, data.cpu_usage || 0, data.disk_usage || 0);
            status = maxUsage > 90 ? 'danger' : (maxUsage > 70 ? 'warning' : 'healthy');
            this.updateElement(`cpuUsage`, data.cpu_usage ? `${data.cpu_usage}%` : '--%');
            this.updateElement(`memoryUsage`, data.memory_usage ? `${data.memory_usage}%` : '--%');
            this.updateElement(`diskUsage`, data.disk_usage ? `${data.disk_usage}%` : '--%');
        }

        // Update visual status
        healthDot.className = `health-dot ${status === 'healthy' ? '' : status}`;
    }

    updateSystemStatusBar(data) {
        // Update main status
        const mainStatusDot = document.getElementById('mainStatusDot');
        const mainStatusText = document.getElementById('mainStatusText');

        if (data) {
            const status = data.status || 'unknown';
            if (mainStatusDot) {
                mainStatusDot.className = `status-dot ${status === 'healthy' ? 'pulse-green' :
                    status === 'degraded' ? 'pulse-yellow' : 'pulse-red'
                    }`;
            }
            if (mainStatusText) {
                mainStatusText.textContent = status === 'healthy' ? 'System Online' :
                    status === 'degraded' ? 'System Degraded' : 'System Issues';
            }
        }

        // Update individual service status
        this.updateElement('dbStatus', data?.database === 'connected' ? 'Connected' : 'Error');
        this.updateElement('cacheStatus', data?.cache === 'connected' ? 'Active' : 'Inactive');
        this.updateElement('apiStatus', data?.api_keys?.tmdb ? 'Online' : 'Offline');
        this.updateElement('liveConnectionStatus', 'LIVE');
    }

    updateSystemAlerts(alerts) {
        const alertsSection = document.getElementById('alertsSection');
        const realTimeAlerts = document.getElementById('realTimeAlerts');
        const activeAlertsCount = document.getElementById('activeAlertsCount');

        if (!alerts || alerts.length === 0) {
            if (alertsSection) alertsSection.style.display = 'none';
            if (activeAlertsCount) activeAlertsCount.textContent = '0';
            return;
        }

        // Show alerts section
        if (alertsSection) alertsSection.style.display = 'block';
        if (activeAlertsCount) activeAlertsCount.textContent = alerts.length;

        // Send critical alerts as notifications to topbar
        alerts.forEach(alert => {
            if (alert.level === 'critical' || alert.level === 'error') {
                this.sendNotificationToTopbar({
                    type: 'alert',
                    title: `System Alert: ${alert.component || 'System'}`,
                    message: alert.message,
                    level: alert.level,
                    timestamp: alert.timestamp || new Date().toISOString()
                });
            }
        });

        // Render alerts in dashboard
        if (realTimeAlerts) {
            realTimeAlerts.innerHTML = alerts.map(alert => `
                <div class="alert-item ${alert.level || 'info'}" data-alert-id="${alert.id || Date.now()}">
                    <div class="alert-icon">
                        <i data-feather="${this.getAlertIcon(alert.level)}"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">${alert.component || 'System'}</div>
                        <div class="alert-message">${alert.message}</div>
                    </div>
                    <div class="alert-time">${this.formatTimeAgo(alert.timestamp || new Date().toISOString())}</div>
                    <div class="alert-actions">
                        <button class="alert-dismiss" onclick="adminDashboard.dismissAlert('${alert.id || Date.now()}')">
                            <i data-feather="x"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    updatePerformanceChart(data) {
        if (!this.charts.systemPerformance || !data.resources) return;

        const chart = this.charts.systemPerformance;
        const now = new Date();

        // Add new data point
        chart.data.labels.push(now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: this.isMobile ? undefined : '2-digit'
        }));

        // Add performance data
        chart.data.datasets[0].data.push(data.resources.cpu_usage || 0);
        chart.data.datasets[1].data.push(data.resources.memory_usage || 0);
        chart.data.datasets[2].data.push(data.resources.disk_usage || 0);

        // Keep only last 20 data points
        const maxPoints = this.isMobile ? 10 : 20;
        if (chart.data.labels.length > maxPoints) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }

        chart.update();
    }

    updatePerformanceIndicator(data) {
        const performanceIndicator = document.getElementById('performanceIndicator');
        const performanceDot = performanceIndicator?.querySelector('.performance-dot');
        const performanceText = performanceIndicator?.querySelector('.performance-text');

        if (!data.resources) return;

        const maxUsage = Math.max(
            data.resources.cpu_usage || 0,
            data.resources.memory_usage || 0,
            data.resources.disk_usage || 0
        );

        let status, text;
        if (maxUsage > 90) {
            status = 'danger';
            text = 'Critical';
        } else if (maxUsage > 70) {
            status = 'warning';
            text = 'Warning';
        } else {
            status = '';
            text = 'Optimal';
        }

        if (performanceDot) {
            performanceDot.className = `performance-dot ${status}`;
        }
        if (performanceText) {
            performanceText.textContent = text;
        }
    }

    updateServicesGrid(data) {
        const servicesGrid = document.getElementById('servicesStatusGrid');
        if (!servicesGrid || !data.application_services) return;

        const services = [
            { name: 'Auth', status: data.application_services.auth_service },
            { name: 'Admin', status: data.application_services.admin_service },
            { name: 'Support', status: data.application_services.support_service },
            { name: 'Content', status: data.application_services.content_service },
            { name: 'Analytics', status: data.application_services.analytics_service || true },
            { name: 'Cache', status: data.core_services.cache }
        ];

        servicesGrid.innerHTML = services.map(service => `
            <div class="service-item">
                <div class="service-status ${service.status ? '' : 'danger'}"></div>
                <div class="service-name">${service.name}</div>
                <div class="service-info">${service.status ? 'Online' : 'Offline'}</div>
            </div>
        `).join('');
    }

    updateAdminActivityMetrics(data) {
        const adminActivityMetrics = document.getElementById('adminActivityMetrics');
        if (!adminActivityMetrics || !data.admin_users) return;

        const metrics = [
            {
                label: 'Active Admins',
                value: data.admin_users.active_24h || 0,
                change: `${data.admin_users.activity_rate_24h || 0}%`
            },
            {
                label: 'Total Admins',
                value: data.admin_users.total_admins || 0,
                change: 'All time'
            },
            {
                label: 'Recommendations',
                value: data.admin_recommendations?.recent_7d || 0,
                change: 'This week'
            },
            {
                label: 'Active Rate',
                value: `${data.admin_users.activity_rate_24h || 0}%`,
                change: '24h rate'
            }
        ];

        adminActivityMetrics.innerHTML = metrics.map(metric => `
            <div class="activity-metric">
                <div class="activity-metric-value">${metric.value}</div>
                <div class="activity-metric-label">${metric.label}</div>
                <div class="activity-metric-change">${metric.change}</div>
            </div>
        `).join('');
    }

    updateSystemNotifications(data) {
        const notificationsList = document.getElementById('systemNotificationsList');
        if (!notificationsList) return;

        const notifications = data.recent_notifications || [];

        if (notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="table-empty-state">
                    <i data-feather="bell"></i>
                    <p>No system notifications</p>
                </div>
            `;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            return;
        }

        notificationsList.innerHTML = notifications.slice(0, 5).map(notification => `
            <div class="notification-item ${notification.is_read ? '' : 'unread'} ${notification.is_urgent ? 'urgent' : ''}">
                <div class="notification-icon">
                    <i data-feather="${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${this.truncateText(notification.message, 60)}</div>
                    <div class="notification-time">${this.formatTimeAgo(notification.created_at)}</div>
                </div>
            </div>
        `).join('');

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // Action Methods
    async performQuickHealthCheck() {
        this.showToast('Running quick health check...', 'info');

        try {
            await Promise.all([
                this.loadSystemHealth(),
                this.loadServicesStatus(),
                this.loadSystemPerformance()
            ]);
            this.showToast('Health check completed', 'success');
        } catch (error) {
            this.showToast('Health check failed', 'error');
        }
    }

    updateMonitoringRefreshRate(newRate) {
        this.systemMonitoring.refreshRate = newRate;

        // Restart timers with new rate
        this.stopSystemMonitoring();
        this.startSystemMonitoring();

        this.showToast(`Monitoring refresh rate updated to ${newRate / 1000}s`, 'success');
    }

    checkMissedNotifications() {
        // Check for any missed notifications while tab was inactive
        this.loadSystemNotifications();
        this.loadSystemAlerts();
    }

    dismissAlert(alertId) {
        const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (alertElement) {
            alertElement.remove();
        }

        // Remove from system data
        this.systemData.alerts = this.systemData.alerts.filter(alert =>
            (alert.id || Date.now().toString()) !== alertId
        );
    }

    dismissAllAlerts() {
        const alertsContainer = document.getElementById('realTimeAlerts');
        const alertsSection = document.getElementById('alertsSection');

        if (alertsContainer) {
            alertsContainer.innerHTML = '';
        }
        if (alertsSection) {
            alertsSection.style.display = 'none';
        }

        this.systemData.alerts = [];
        this.processedAlerts.clear();

        this.showToast('All alerts dismissed', 'success');
    }

    async markAllNotificationsAsRead() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/notifications/mark-all-read', {
                method: 'PUT'
            });

            if (response.ok) {
                this.showToast('All notifications marked as read', 'success');
                this.loadSystemNotifications();

                // Reset notification badge
                const notificationBadge = document.getElementById('notificationBadge');
                if (notificationBadge) {
                    notificationBadge.style.display = 'none';
                    notificationBadge.textContent = '0';
                }
            }
        } catch (error) {
            this.showToast('Failed to mark notifications as read', 'error');
        }
    }

    // Real-time Updates
    startRealTimeUpdates() {
        // Optimized polling intervals for real-time experience
        this.refreshInterval = 8000; // 8 seconds for dashboard data

        this.refreshTimer = setInterval(() => {
            if (!this.isRefreshing && !document.hidden) {
                this.refreshAllData();
            }
        }, this.refreshInterval);

        console.log(`✅ HTTP polling started (${this.refreshInterval / 1000}s interval)`);
    }

    setupSmartPolling() {
        // Increase polling frequency when tab is active and visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Tab became visible - immediate refresh
                this.refreshAllData();
                this.loadAllSystemData();

                // Temporarily increase polling frequency for 30 seconds
                this.boostPollingFrequency();
            }
        });
    }

    boostPollingFrequency() {
        // Temporarily boost polling for 30 seconds after tab becomes visible
        if (this.boostTimeout) {
            clearTimeout(this.boostTimeout);
        }

        // Store original intervals
        const originalRefreshInterval = this.refreshInterval;

        // Boost frequency
        this.refreshInterval = 3000; // 3 seconds

        // Reset after 30 seconds
        this.boostTimeout = setTimeout(() => {
            this.refreshInterval = originalRefreshInterval;
            console.log('✅ Polling frequency normalized');
        }, 30000);

        console.log('⚡ Polling frequency boosted for 30s');
    }

    stopRealTimeUpdates() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('⏹ Real-time updates stopped');
        }
    }

    stopSystemMonitoring() {
        if (this.systemMonitoring.healthTimer) {
            clearInterval(this.systemMonitoring.healthTimer);
        }
        if (this.systemMonitoring.alertsTimer) {
            clearInterval(this.systemMonitoring.alertsTimer);
        }
        if (this.systemMonitoring.performanceTimer) {
            clearInterval(this.systemMonitoring.performanceTimer);
        }
        if (this.systemMonitoring.notificationTimer) {
            clearInterval(this.systemMonitoring.notificationTimer);
        }
    }

    async refreshAllData() {
        if (this.isRefreshing) return;

        this.isRefreshing = true;

        try {
            await this.loadAllData();
            await this.loadAllSystemData();
            this.showSuccess('Dashboard updated');
        } catch (error) {
            console.error('Refresh error:', error);
            this.showError('Failed to refresh dashboard');
        } finally {
            this.isRefreshing = false;
        }
    }

    // Loading state for tables
    showTableLoading(element) {
        if (!element) return;

        element.innerHTML = `
            <div class="table-loading">
                <div class="table-skeleton-row">
                    <div class="table-skeleton-cell wide"></div>
                    <div class="table-skeleton-cell medium"></div>
                    <div class="table-skeleton-cell small"></div>
                </div>
                <div class="table-skeleton-row">
                    <div class="table-skeleton-cell wide"></div>
                    <div class="table-skeleton-cell medium"></div>
                    <div class="table-skeleton-cell small"></div>
                </div>
                <div class="table-skeleton-row">
                    <div class="table-skeleton-cell wide"></div>
                    <div class="table-skeleton-cell medium"></div>
                    <div class="table-skeleton-cell small"></div>
                </div>
            </div>
        `;
    }

    // Utility Methods
    async makeAuthenticatedRequest(endpoint, options = {}) {
        const token = localStorage.getItem('cinebrain-token');

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        const response = await fetch(`${this.apiBase}${endpoint}`, mergedOptions);

        if (response.status === 401) {
            localStorage.removeItem('cinebrain-token');
            localStorage.removeItem('cinebrain-user');
            window.location.href = '/auth/login.html';
            throw new Error('Authentication failed');
        }

        return response;
    }

    getAlertIcon(level) {
        const icons = {
            'critical': 'alert-circle',
            'error': 'x-circle',
            'warning': 'alert-triangle',
            'info': 'info',
            'success': 'check-circle'
        };
        return icons[level] || 'alert-circle';
    }

    getNotificationIcon(type) {
        const icons = {
            'new_ticket': 'message-circle',
            'urgent_ticket': 'alert-circle',
            'sla_breach': 'clock',
            'feedback_received': 'message-square',
            'system_alert': 'alert-triangle',
            'user_activity': 'users',
            'content_added': 'plus-circle'
        };
        return icons[type] || 'bell';
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(this.isMobile ? 0 : 1)}K`;
        }
        return num.toString();
    }

    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Now';
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
        return `${Math.floor(diffInMinutes / 1440)}d`;
    }

    calculateChange(newValue, totalValue) {
        if (!newValue || !totalValue) return '0%';
        const percentage = ((newValue / totalValue) * 100).toFixed(1);
        return `+${percentage}%`;
    }

    getChangeClass(change) {
        if (change.includes('+')) return 'change-positive';
        if (change.includes('-')) return 'change-negative';
        return 'change-neutral';
    }

    getChangeIcon(change) {
        if (change.includes('+')) return 'trending-up';
        if (change.includes('-')) return 'trending-down';
        return 'minus';
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    updateLastRefreshTime() {
        if (this.elements.lastUpdate) {
            const now = new Date();
            const timeString = this.isMobile ?
                now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                now.toLocaleTimeString();
            this.elements.lastUpdate.textContent = timeString;
        }
    }

    showLoading(show) {
        const indicator = document.getElementById('page-loading-indicator');
        if (indicator) {
            indicator.style.transform = show ? 'scaleX(1)' : 'scaleX(0)';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Use existing notification system from topbar or create mobile-optimized toast
        if (window.topbar && window.topbar.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            // Fallback mobile-optimized toast
            this.showMobileToast(message, type);
        }
    }

    showMobileToast(message, type) {
        const toast = document.createElement('div');
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        toast.style.cssText = `
            position: fixed;
            bottom: calc(var(--mobile-nav-height, 60px) + env(safe-area-inset-bottom, 0) + 20px);
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10002;
            animation: fadeInUp 0.3s ease;
            max-width: calc(100vw - 40px);
            text-align: center;
        `;

        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOutDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);

        // Add mobile toast animations
        if (!document.getElementById('mobile-toast-animations')) {
            const style = document.createElement('style');
            style.id = 'mobile-toast-animations';
            style.textContent = `
                @keyframes fadeInUp {
                    from { transform: translate(-50%, 100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes fadeOutDown {
                    from { transform: translate(-50%, 0); opacity: 1; }
                    to { transform: translate(-50%, 100%); opacity: 0; }
                }
                .notification-pulse {
                    animation: notificationPulse 1s ease-in-out;
                }
                @keyframes notificationPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    updateChartsForPeriod() {
        // Re-load analytics data based on selected period
        this.loadAnalytics();
    }

    // Cleanup
    destroy() {
        this.stopRealTimeUpdates();
        this.stopSystemMonitoring();

        // Cleanup real-time connection (HTTP polling only)
        this.realTimeConnection = null;

        // Cleanup charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });

        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleResize);

        console.log('🗑 Admin dashboard destroyed');
    }
}

// Initialize dashboard
let adminDashboard;

document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (adminDashboard) {
        adminDashboard.destroy();
    }
});

// Export for global access
window.AdminDashboard = AdminDashboard;
window.adminDashboard = adminDashboard;