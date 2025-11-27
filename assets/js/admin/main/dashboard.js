/**
 * CineBrain Admin Dashboard - Main Controller (Updated for Backend v3.0)
 * Mobile-First Responsive Dashboard Management
 */

class AdminDashboard {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.refreshInterval = 8000;
        this.refreshTimer = null;
        this.isRefreshing = false;
        this.currentUser = null;
        this.isMobile = window.innerWidth <= 768;
        this.touchDevice = 'ontouchstart' in window;

        // Updated dashboard data structure to match backend v3.0
        this.dashboardData = {
            systemMonitoring: null,    // NEW: /system-monitoring
            overview: null,            // NEW: /overview  
            serviceStatus: null,       // NEW: /service-status
            adminActivity: null,       // NEW: /admin-activity
            analytics: null,           // /admin/analytics
            supportData: null,         // /admin/support/real-time
            systemHealth: null         // /admin/system-health
        };

        this.boostTimeout = null;

        // Initialize component classes
        this.systemMonitor = null;
        this.statisticsManager = null;
        this.emailPreferences = null;

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

            // Initialize system monitoring
            this.systemMonitor = new SystemMonitor(this);
            await this.systemMonitor.init();

            // Initialize statistics manager
            this.statisticsManager = new StatisticsManager(this);
            await this.statisticsManager.init();

            // Initialize email preferences manager
            this.emailPreferences = new EmailPreferencesManager(this);
            await this.emailPreferences.init();

            // Load initial data using NEW endpoints
            await this.loadAllDataNew();

            // Start real-time updates with NEW endpoints
            this.startRealTimeUpdatesNew();

            // Setup smart polling
            this.setupSmartPolling();

            console.log('✅ CineBrain Admin Dashboard v3.0 initialized');

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

            if (this.statisticsManager) {
                this.statisticsManager.resizeCharts();
            }
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.reinitializeForDevice();
                if (this.statisticsManager) {
                    this.statisticsManager.resizeCharts();
                }
            }, 100);
        });
    }

    // FIXED: Update reinitializeForDevice method to handle Quick Actions
    reinitializeForDevice() {
        if (this.dashboardData.overview) {
            this.renderOverviewCardsNew(this.dashboardData.overview);

            // FIXED: Always render Quick Actions after overview cards
            this.renderQuickActions();
        }

        if (this.dashboardData.analytics && this.statisticsManager) {
            this.statisticsManager.updateCharts(this.dashboardData.analytics);
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

            // Main status elements
            mainStatusDot: document.getElementById('mainStatusDot'),
            mainStatusText: document.getElementById('mainStatusText'),
            dbStatus: document.getElementById('dbStatus'),
            cacheStatus: document.getElementById('cacheStatus'),
            apiStatus: document.getElementById('apiStatus'),

            // System health elements
            dbConnectionStatus: document.getElementById('dbConnectionStatus'),
            dbResponseTime: document.getElementById('dbResponseTime'),
            dbConnections: document.getElementById('dbConnections'),
            cacheType: document.getElementById('cacheType'),
            cacheHitRate: document.getElementById('cacheHitRate'),
            cacheMemory: document.getElementById('cacheMemory'),
            tmdbStatus: document.getElementById('tmdbStatus'),
            youtubeStatus: document.getElementById('youtubeStatus'),
            cloudinaryStatus: document.getElementById('cloudinaryStatus'),
            cpuUsage: document.getElementById('cpuUsage'),
            memoryUsage: document.getElementById('memoryUsage'),
            diskUsage: document.getElementById('diskUsage'),

            // Containers
            overviewCards: document.getElementById('overviewCards'),
            mobileOverviewCards: document.getElementById('mobileOverviewCards'),
            mobileStatsGrid: document.getElementById('mobileStatsGrid'),
            recentActivity: document.getElementById('recentActivity'),
            supportStats: document.getElementById('supportStats'),
            recentTickets: document.getElementById('recentTickets'),
            adminActivityMetrics: document.getElementById('adminActivityMetrics'),
            systemNotificationsList: document.getElementById('systemNotificationsList'),

            // Buttons
            refreshDashboard: document.getElementById('refreshDashboard'),
            viewAllActivity: document.getElementById('viewAllActivity'),
            viewSupportDashboard: document.getElementById('viewSupportDashboard'),
            toggleEmailPreferences: document.getElementById('toggleEmailPreferences'),

            // Period selector
            activityPeriod: document.getElementById('activityPeriod')
        };
    }

    setupEventListeners() {
        // Refresh button
        this.elements.refreshDashboard?.addEventListener('click', (e) => {
            e.preventDefault();
            this.refreshAllDataNew();
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

        // NEW: Email preferences toggle
        this.elements.toggleEmailPreferences?.addEventListener('click', () => {
            this.toggleEmailPreferences();
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
                        this.refreshAllDataNew();
                        break;
                    case 'h':
                        e.preventDefault();
                        this.loadSystemHealth();
                        break;
                }
            }
        });

        // Window focus/blur for refresh
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshAllDataNew();
                if (this.systemMonitor) {
                    this.systemMonitor.checkMissedNotifications();
                }
            }
        });

        // Listen for notification events
        window.addEventListener('cinebrain-admin-event', (e) => {
            if (e.detail.type === 'refresh') {
                this.refreshAllDataNew();
            }
        });

        // Mobile touch gestures
        if (this.touchDevice) {
            this.setupTouchGestures();
        }
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
                    this.refreshAllDataNew();
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

    // FIXED: Update loadAllDataNew method to ensure Quick Actions are rendered
    async loadAllDataNew() {
        this.showLoading(true);

        try {
            const promises = [
                this.loadSystemMonitoring(),
                this.loadOverviewStats(),
                this.loadServiceStatus(),
                this.loadAdminActivity(),
                this.loadAnalytics(),
                this.loadSupportRealTime(),
                this.loadSystemHealth()
            ];

            const results = await Promise.allSettled(promises);

            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Data loading failed for promise ${index}:`, result.reason);
                }
            });

            await this.loadRecentActivity();

            // FIXED: Ensure Quick Actions are rendered after data loads
            this.renderQuickActions();

            this.updateLastRefreshTime();
            this.validateDataIntegrityNew();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load some dashboard data');
        } finally {
            this.showLoading(false);
        }
    }

    // NEW: System Monitoring endpoint
    async loadSystemMonitoring() {
        try {
            const response = await this.makeAuthenticatedRequest('/system-monitoring');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.dashboardData.systemMonitoring = data.data;
                    this.updateSystemMonitoringDisplay(data.data);
                } else {
                    throw new Error('Invalid system monitoring data structure');
                }
            } else {
                throw new Error(`System monitoring request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading system monitoring:', error);
            this.showError('Failed to load system monitoring');
        }
    }

    // NEW: Overview Stats endpoint  
    async loadOverviewStats() {
        try {
            const response = await this.makeAuthenticatedRequest('/overview');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.dashboardData.overview = data.data;
                    this.renderOverviewCardsNew(data.data);
                } else {
                    throw new Error('Invalid overview data structure');
                }
            } else {
                throw new Error(`Overview request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading overview stats:', error);
            this.showError('Failed to load overview statistics');
        }
    }

    // NEW: Service Status endpoint
    async loadServiceStatus() {
        try {
            const response = await this.makeAuthenticatedRequest('/service-status');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.dashboardData.serviceStatus = data.data;
                    if (this.systemMonitor) {
                        this.systemMonitor.updateServicesDisplay(data.data);
                    }
                } else {
                    throw new Error('Invalid service status data structure');
                }
            } else {
                throw new Error(`Service status request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading service status:', error);
            this.showError('Failed to load service status');
        }
    }

    // NEW: Admin Activity endpoint
    async loadAdminActivity() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin-activity');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.dashboardData.adminActivity = data.data;
                    this.renderAdminActivityDisplay(data.data);
                } else {
                    throw new Error('Invalid admin activity data structure');
                }
            } else {
                throw new Error(`Admin activity request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading admin activity:', error);
            this.showError('Failed to load admin activity');
        }
    }

    // UPDATED: Analytics endpoint
    async loadAnalytics() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/analytics');
            if (response.ok) {
                const data = await response.json();
                if (data && (data.user_analytics || data.content_analytics)) {
                    this.dashboardData.analytics = data;
                    if (this.statisticsManager) {
                        this.statisticsManager.updateCharts(data);
                    }
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

    // NEW: Support Real-time endpoint
    async loadSupportRealTime() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/support/real-time?include_stats=true');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.dashboardData.supportData = data.data;
                    this.renderSupportDataNew(data.data);

                    // Handle urgent alerts
                    if (data.data.urgent_alerts && data.data.urgent_alerts.length > 0 && this.systemMonitor) {
                        data.data.urgent_alerts.forEach(alert =>
                            this.systemMonitor.handleNewAlert(alert)
                        );
                    }
                } else {
                    throw new Error('Invalid support data structure');
                }
            } else {
                throw new Error(`Support real-time request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading support real-time data:', error);
            this.showError('Failed to load support data');
        }
    }

    // NEW: System Health endpoint
    async loadSystemHealth() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/system-health');
            if (response.ok) {
                const data = await response.json();
                this.dashboardData.systemHealth = data;
                if (this.systemMonitor) {
                    this.systemMonitor.updateSystemHealth(data);
                }
            } else {
                throw new Error(`System health request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading system health:', error);
            this.showError('Failed to load system health');
        }
    }

    // FIXED: Recent Activity using existing endpoints
    async loadRecentActivity() {
        try {
            // Check if we already have the data from overview
            if (this.dashboardData.overview) {
                const activities = this.gatherAllActivities();
                this.renderRecentActivity(activities);
            } else {
                // If not, load the overview data first
                await this.loadOverviewStats();
                const activities = this.gatherAllActivities();
                this.renderRecentActivity(activities);
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            this.showError('Failed to load recent activity');
        }
    }

    // NEW: Gather all activities from existing data sources
    gatherAllActivities() {
        const allActivities = [];
        const now = new Date();

        // From overview data
        if (this.dashboardData.overview) {
            const overview = this.dashboardData.overview;

            // Add recent content
            if (overview.recent_content && Array.isArray(overview.recent_content)) {
                overview.recent_content.forEach(content => {
                    const activityTime = new Date(content.created_at);
                    allActivities.push({
                        type: 'content_added',
                        category: 'content',
                        title: `New ${this.capitalizeFirst(content.type || content.content_type || 'content')} Added`,
                        subtitle: content.title || 'Untitled',
                        details: `Rating: ${content.rating || 'N/A'}/10`,
                        user: 'System',
                        time: this.formatTimeAgo(activityTime),
                        exact_time: this.formatExactDateTime(activityTime),
                        timestamp: activityTime,
                        status: 'success',
                        icon: 'film',
                        url: `/admin/content/${content.id}`,
                        typeLabel: 'Content',
                        isNew: (now - activityTime) < 3600000 // Less than 1 hour
                    });
                });
            }

            // Add recent users
            if (overview.recent_users && Array.isArray(overview.recent_users)) {
                overview.recent_users.forEach(user => {
                    const activityTime = new Date(user.created_at);
                    allActivities.push({
                        type: 'user_registered',
                        category: 'user',
                        title: 'New User Registered',
                        subtitle: `@${user.username}`,
                        details: user.email,
                        user: 'System',
                        time: this.formatTimeAgo(activityTime),
                        exact_time: this.formatExactDateTime(activityTime),
                        timestamp: activityTime,
                        status: 'info',
                        icon: 'user-plus',
                        url: `/admin/users/${user.id}`,
                        typeLabel: 'User',
                        isNew: (now - activityTime) < 3600000
                    });
                });
            }

            // Add recent recommendations
            if (overview.recent_recommendations && Array.isArray(overview.recent_recommendations)) {
                overview.recent_recommendations.forEach(rec => {
                    const activityTime = new Date(rec.created_at);
                    allActivities.push({
                        type: 'recommendation_created',
                        category: 'recommendation',
                        title: 'Recommendation Created',
                        subtitle: rec.content_title || 'Unknown Content',
                        details: `Type: ${rec.recommendation_type || 'general'} | By: ${rec.admin_name}`,
                        user: rec.admin_name || 'Admin',
                        time: this.formatTimeAgo(activityTime),
                        exact_time: this.formatExactDateTime(activityTime),
                        timestamp: activityTime,
                        status: rec.is_active ? 'warning' : 'info',
                        icon: 'star',
                        url: `/admin/recommendations/${rec.id}`,
                        typeLabel: rec.is_active ? 'Active' : 'Draft',
                        isNew: (now - activityTime) < 3600000
                    });
                });
            }
        }

        // From support data
        if (this.dashboardData.supportData) {
            const supportData = this.dashboardData.supportData;

            // Add recent tickets
            if (supportData.recent_tickets && Array.isArray(supportData.recent_tickets)) {
                supportData.recent_tickets.slice(0, 5).forEach(ticket => {
                    const activityTime = new Date(ticket.created_at);
                    allActivities.push({
                        type: 'support_ticket',
                        category: 'support',
                        title: 'Support Ticket Created',
                        subtitle: `#${ticket.ticket_number}: ${ticket.subject}`,
                        details: `Priority: ${ticket.priority} | User: ${ticket.user_name}`,
                        user: ticket.user_name || 'Unknown',
                        time: this.formatTimeAgo(activityTime),
                        exact_time: this.formatExactDateTime(activityTime),
                        timestamp: activityTime,
                        status: ticket.priority === 'urgent' ? 'danger' : 'info',
                        icon: 'message-circle',
                        url: `/admin/support/tickets/${ticket.id}`,
                        typeLabel: 'Ticket',
                        priority: ticket.priority,
                        isNew: ticket.is_new || (now - activityTime) < 3600000
                    });
                });
            }

            // Add recent contacts
            if (supportData.recent_contacts && Array.isArray(supportData.recent_contacts)) {
                supportData.recent_contacts.slice(0, 3).forEach(contact => {
                    const activityTime = new Date(contact.created_at);
                    allActivities.push({
                        type: 'contact_message',
                        category: 'support',
                        title: 'Contact Message',
                        subtitle: contact.subject || 'No subject',
                        details: `From: ${contact.name}${contact.company ? ` (${contact.company})` : ''}`,
                        user: contact.name || 'Unknown',
                        time: this.formatTimeAgo(activityTime),
                        exact_time: this.formatExactDateTime(activityTime),
                        timestamp: activityTime,
                        status: contact.is_business_inquiry ? 'warning' : 'info',
                        icon: 'mail',
                        url: `/admin/support/contacts/${contact.id}`,
                        typeLabel: 'Contact',
                        isNew: contact.is_new || (now - activityTime) < 1800000 // 30 minutes for contacts
                    });
                });
            }

            // Add recent issues
            if (supportData.recent_issues && Array.isArray(supportData.recent_issues)) {
                supportData.recent_issues.slice(0, 3).forEach(issue => {
                    const activityTime = new Date(issue.created_at);
                    allActivities.push({
                        type: 'issue_report',
                        category: 'support',
                        title: 'Issue Reported',
                        subtitle: issue.issue_title || 'No title',
                        details: `Severity: ${issue.severity} | ID: ${issue.issue_id}`,
                        user: issue.name || 'Unknown',
                        time: this.formatTimeAgo(activityTime),
                        exact_time: this.formatExactDateTime(activityTime),
                        timestamp: activityTime,
                        status: issue.severity === 'critical' ? 'danger' : 'warning',
                        icon: 'alert-triangle',
                        url: `/admin/support/issues/${issue.id}`,
                        typeLabel: issue.severity,
                        priority: issue.severity,
                        isNew: issue.is_new || (now - activityTime) < 1800000
                    });
                });
            }
        }

        // From admin activity data
        if (this.dashboardData.adminActivity) {
            const adminData = this.dashboardData.adminActivity;

            // Add admin activity info
            if (adminData.active > 0) {
                allActivities.push({
                    type: 'admin_activity',
                    category: 'admin',
                    title: 'Admin Activity Update',
                    subtitle: `${adminData.active} admins currently active`,
                    details: `Activity rate: ${adminData.activity_rate || '0%'}`,
                    user: 'System',
                    time: 'Just now',
                    exact_time: this.formatExactDateTime(now),
                    timestamp: now,
                    status: 'primary',
                    icon: 'users',
                    url: '/admin/analytics',
                    typeLabel: 'Admin',
                    isNew: true
                });
            }
        }

        return allActivities;
    }

    // SIMPLIFIED: Render Recent Activity
    renderRecentActivity(activities) {
        if (!this.elements.recentActivity) return;

        if (!activities || activities.length === 0) {
            this.elements.recentActivity.innerHTML = `
                <div class="table-empty-state">
                    <i data-feather="clock"></i>
                    <p>No recent activity</p>
                </div>
            `;
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        // Sort by timestamp (newest first)
        activities.sort((a, b) => b.timestamp - a.timestamp);
        const displayActivities = activities.slice(0, this.isMobile ? 8 : 12);

        let tableHtml = `
            <div class="table-responsive-mobile">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Activity</th>
                            <th class="d-none d-md-table-cell">User/Admin</th>
                            <th>Time</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        displayActivities.forEach(activity => {
            const isNewClass = activity.isNew ? 'activity-new' : '';

            tableHtml += `
                <tr class="slide-up ${isNewClass}">
                    <td>
                        <div class="activity-info">
                            <a href="${activity.url || '#'}" class="activity-title">
                                <i data-feather="${activity.icon}" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;"></i>
                                ${this.truncateText(activity.title, this.isMobile ? 30 : 50)}
                            </a>
                            <span class="activity-subtitle">${this.truncateText(activity.subtitle, this.isMobile ? 25 : 40)}</span>
                            ${activity.details ? `<span class="activity-details">${this.truncateText(activity.details, this.isMobile ? 20 : 35)}</span>` : ''}
                        </div>
                    </td>
                    <td class="d-none d-md-table-cell">
                        <span style="color: var(--text-secondary); font-size: var(--font-xs);">
                            ${this.truncateText(activity.user, 20)}
                        </span>
                    </td>
                    <td>
                        <div class="time-info-detailed">
                            <span class="time-ago">${activity.time}</span>
                            <span class="exact-time">${this.formatShortDateTime(activity.timestamp)}</span>
                        </div>
                    </td>
                    <td>
                        <span class="table-badge table-badge-${activity.status}">
                            ${activity.typeLabel}
                        </span>
                    </td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table></div>';
        this.elements.recentActivity.innerHTML = tableHtml;

        if (typeof feather !== 'undefined') feather.replace();

        // Update new activity badge
        const newActivityBadge = document.getElementById('newActivityBadge');
        if (newActivityBadge) {
            const newCount = displayActivities.filter(a => a.isNew).length;
            if (newCount > 0) {
                newActivityBadge.textContent = newCount;
                newActivityBadge.style.display = 'inline-block';
            } else {
                newActivityBadge.style.display = 'none';
            }
        }
    }

    // Helper: Format short date time
    formatShortDateTime(date) {
        const d = new Date(date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) {
            return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (d.toDateString() === yesterday.toDateString()) {
            return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }

    // NEW: Updated rendering methods for new data structures
    updateSystemMonitoringDisplay(data) {
        // Update database status
        if (data.database) {
            this.updateElement('dbConnectionStatus', data.database.status);
            this.updateElement('dbResponseTime', data.database.response);
            this.updateElement('dbConnections', data.database.connections);
        }

        // Update cache status  
        if (data.cache) {
            this.updateElement('cacheType', data.cache.type);
            this.updateElement('cacheHitRate', data.cache.hit_rate);
            this.updateElement('cacheMemory', data.cache.memory);
        }

        // Update external APIs
        if (data.external_apis) {
            this.updateElement('tmdbStatus', data.external_apis.tmdb ? '✓' : '✗');
            this.updateElement('youtubeStatus', data.external_apis.youtube ? '✓' : '✗');
            this.updateElement('cloudinaryStatus', data.external_apis.cloudinary ? '✓' : '✗');
        }

        // Update performance metrics
        if (data.performance) {
            this.updateElement('cpuUsage', data.performance.cpu);
            this.updateElement('memoryUsage', data.performance.memory);
            this.updateElement('diskUsage', data.performance.disk);

            // Update performance indicator
            const performanceIndicator = document.getElementById('performanceIndicator');
            if (performanceIndicator) {
                const cpuNum = parseInt(data.performance.cpu.replace('%', ''));
                const memNum = parseInt(data.performance.memory.replace('%', ''));
                const diskNum = parseInt(data.performance.disk.replace('%', ''));
                const maxUsage = Math.max(cpuNum, memNum, diskNum);

                const performanceDot = performanceIndicator.querySelector('.performance-dot');
                const performanceText = performanceIndicator.querySelector('.performance-text');

                if (performanceDot && performanceText) {
                    if (maxUsage > 90) {
                        performanceDot.className = 'performance-dot danger';
                        performanceText.textContent = 'Critical';
                    } else if (maxUsage > 70) {
                        performanceDot.className = 'performance-dot warning';
                        performanceText.textContent = 'Warning';
                    } else {
                        performanceDot.className = 'performance-dot';
                        performanceText.textContent = 'Optimal';
                    }
                }
            }
        }
    }

    // FIXED: Quick Actions rendering for mobile view
    renderQuickActions() {
        let quickActionsContainer = document.getElementById('quickActionsContainer');

        if (!quickActionsContainer) {
            // FIXED: Find the correct insertion point for both mobile and desktop
            let insertionPoint = null;

            if (this.isMobile) {
                // For mobile, insert after mobile overview cards
                const mobileOverviewRow = document.querySelector('.mobile-overview-scroll')?.closest('.row');
                insertionPoint = mobileOverviewRow;
            } else {
                // For desktop, insert after desktop overview cards
                const overviewCardsRow = document.getElementById('overviewCards')?.closest('.row');
                insertionPoint = overviewCardsRow;
            }

            // Fallback: if we can't find either, insert after system health cards
            if (!insertionPoint) {
                const systemHealthRow = document.querySelector('.system-health-card')?.closest('.row');
                insertionPoint = systemHealthRow;
            }

            // Final fallback: insert after admin container's first child
            if (!insertionPoint) {
                const adminContainer = document.querySelector('.admin-container');
                if (adminContainer && adminContainer.children.length > 0) {
                    insertionPoint = adminContainer.children[0];
                }
            }

            if (insertionPoint) {
                const quickActionsRow = document.createElement('div');
                quickActionsRow.className = 'row mb-4';
                quickActionsRow.id = 'quickActionsRow'; // Add ID for easier targeting
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

                // Insert after the found element
                insertionPoint.parentNode.insertBefore(quickActionsRow, insertionPoint.nextSibling);
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

            // FIXED: Ensure Quick Actions are visible on mobile
            const quickActionsRow = document.getElementById('quickActionsRow');
            if (quickActionsRow) {
                quickActionsRow.style.display = 'block';
                quickActionsRow.classList.remove('d-none');
            }
        }
    }

    // FIXED: Update renderOverviewCardsNew to trigger Quick Actions rendering
    renderOverviewCardsNew(data) {
        const cards = [
            {
                title: 'Total Users',
                value: this.formatNumber(data.total_users || 0),
                change: `+${this.formatNumber(data.active_users || 0)} active`,
                icon: 'users',
                color: '#113CCF'
            },
            {
                title: 'Total Content',
                value: this.formatNumber(data.total_content || 0),
                change: 'All platforms',
                icon: 'film',
                color: '#e50914'
            },
            {
                title: 'Active Users',
                value: this.formatNumber(data.active_users || 0),
                change: 'Last 24h',
                icon: 'activity',
                color: '#10b981'
            },
            {
                title: 'Support Tickets',
                value: this.formatNumber(data.support_tickets || 0),
                change: `${data.tickets_handled || 0} handled`,
                icon: 'headphones',
                color: data.support_tickets > data.tickets_handled ? '#f59e0b' : '#10b981'
            },
            {
                title: 'Interactions',
                value: this.formatNumber(data.interactions || 0),
                change: 'Total system',
                icon: 'mouse-pointer',
                color: '#8b5cf6'
            },
            {
                title: 'Recommendations',
                value: this.formatNumber(data.recommendations || 0),
                change: 'Active',
                icon: 'star',
                color: '#f59e0b'
            }
        ];

        // Render mobile cards
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
                        <div class="overview-card-change change-neutral">
                            <i data-feather="info" class="change-icon"></i>
                            ${card.change}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // FIXED: Trigger Quick Actions rendering after overview cards are rendered
        setTimeout(() => {
            this.renderQuickActions();
        }, 100);
    }

    // UPDATED: Enhanced Support Data Rendering with All Support Types
    renderSupportDataNew(data) {
        // Update support stats with new structure
        if (this.elements.supportStats && data.summary_stats) {
            const stats = data.summary_stats;
            const statItems = [
                { label: 'Tickets', value: stats.total_tickets || 0, color: '#113CCF' },
                { label: 'Contacts', value: stats.unread_contacts || 0, color: '#10b981' },
                { label: 'Issues', value: stats.critical_issues || 0, color: '#ef4444' },
                { label: 'Urgent', value: stats.urgent_tickets || 0, color: '#f59e0b' }
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
                const totalUrgent = (stats.urgent_tickets || 0) + (stats.critical_issues || 0);
                if (totalUrgent > 0) {
                    urgentBadge.textContent = totalUrgent;
                    urgentBadge.style.display = 'inline-block';
                } else {
                    urgentBadge.style.display = 'none';
                }
            }
        }

        // Render all support types with exact timestamps
        this.renderAllSupportTypes(data);
    }

    // NEW: Render All Support Types (Tickets, Contacts, Issues, Rise-Issues)
    renderAllSupportTypes(data) {
        if (!this.elements.recentTickets) return;

        this.showTableLoading(this.elements.recentTickets);

        // Combine all support types with exact timestamps
        const allSupportItems = [];

        // Add Tickets
        if (data.recent_tickets) {
            data.recent_tickets.forEach(ticket => {
                allSupportItems.push({
                    type: 'ticket',
                    id: ticket.id,
                    number: ticket.ticket_number,
                    title: ticket.subject,
                    user: ticket.user_name,
                    email: ticket.user_email,
                    priority: ticket.priority,
                    status: ticket.status,
                    created_at: ticket.created_at,
                    exact_time: this.formatExactDateTime(ticket.created_at),
                    sla_breached: ticket.sla_breached,
                    url: `/admin/support/ticket/${ticket.id}`,
                    icon: 'message-circle',
                    badge_color: this.getPriorityBadgeColor(ticket.priority)
                });
            });
        }

        // Add Contacts
        if (data.recent_contacts) {
            data.recent_contacts.forEach(contact => {
                allSupportItems.push({
                    type: 'contact',
                    id: contact.id,
                    number: `CON-${contact.id}`,
                    title: contact.subject,
                    user: contact.name,
                    email: contact.email,
                    priority: contact.is_business_inquiry ? 'high' : 'normal',
                    status: contact.is_read ? 'read' : 'unread',
                    created_at: contact.created_at,
                    exact_time: this.formatExactDateTime(contact.created_at),
                    company: contact.company,
                    url: `/admin/support/contact/${contact.id}`,
                    icon: 'mail',
                    badge_color: contact.is_business_inquiry ? 'warning' : 'info'
                });
            });
        }

        // Add Issues
        if (data.recent_issues) {
            data.recent_issues.forEach(issue => {
                allSupportItems.push({
                    type: 'issue',
                    id: issue.id,
                    number: issue.issue_id,
                    title: issue.issue_title,
                    user: issue.name,
                    email: issue.email,
                    priority: issue.severity,
                    status: issue.is_resolved ? 'resolved' : 'open',
                    created_at: issue.created_at,
                    exact_time: this.formatExactDateTime(issue.created_at),
                    ticket_number: issue.ticket_number,
                    url: `/admin/support/issue/${issue.id}`,
                    icon: 'alert-triangle',
                    badge_color: this.getSeverityBadgeColor(issue.severity)
                });
            });
        }

        // Add Rise-Issues (if available)
        if (data.rise_issues) {
            data.rise_issues.forEach(riseIssue => {
                allSupportItems.push({
                    type: 'rise-issue',
                    id: riseIssue.id,
                    number: `RISE-${riseIssue.id}`,
                    title: riseIssue.title,
                    user: riseIssue.reported_by,
                    email: riseIssue.reporter_email,
                    priority: riseIssue.priority || 'medium',
                    status: riseIssue.status,
                    created_at: riseIssue.created_at,
                    exact_time: this.formatExactDateTime(riseIssue.created_at),
                    url: `/admin/support/rise-issue/${riseIssue.id}`,
                    icon: 'trending-up',
                    badge_color: 'info'
                });
            });
        }

        // Sort by creation date (newest first)
        allSupportItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const displayItems = allSupportItems.slice(0, this.isMobile ? 5 : 8);

        if (displayItems.length === 0) {
            this.elements.recentTickets.innerHTML = `
                <div class="table-empty-state">
                    <i data-feather="check-circle"></i>
                    <p>No recent support items</p>
                </div>
            `;
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        let tableHtml = `
            <div class="table-responsive-mobile">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Support Item</th>
                            <th class="d-none d-md-table-cell">User</th>
                            <th>Type</th>
                            <th>Reported</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        displayItems.forEach(item => {
            const typeIcon = this.getSupportTypeIcon(item.type);
            const typeLabel = this.getSupportTypeLabel(item.type);

            tableHtml += `
                <tr class="slide-up ${item.sla_breached ? 'sla-breached' : ''} ${item.status === 'unread' ? 'unread-item' : ''}">
                    <td>
                        <div class="support-item-info">
                            <a href="${item.url}" class="support-number">
                                <i data-feather="${typeIcon}" style="width: 14px; height: 14px; margin-right: 4px;"></i>
                                ${item.number}
                            </a>
                            <span class="support-title">
                                ${this.truncateText(item.title, this.isMobile ? 30 : 45)}
                                ${item.sla_breached ? '<span class="table-badge table-badge-danger" style="font-size: 10px; margin-left: 4px;">SLA</span>' : ''}
                                ${item.company ? `<span class="company-badge">${item.company}</span>` : ''}
                            </span>
                        </div>
                    </td>
                    <td class="d-none d-md-table-cell">
                        <div class="user-info">
                            <span class="user-name">${this.truncateText(item.user, 15)}</span>
                            <span class="user-email">${this.truncateText(item.email, 20)}</span>
                        </div>
                    </td>
                    <td>
                        <span class="table-badge table-badge-${item.badge_color}">
                            ${typeLabel}
                        </span>
                    </td>
                    <td>
                        <div class="time-info-detailed">
                            <span class="time-ago">${this.formatTimeAgo(item.created_at)}</span>
                            <span class="exact-time">${item.exact_time}</span>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table></div>';
        this.elements.recentTickets.innerHTML = tableHtml;

        if (typeof feather !== 'undefined') feather.replace();
    }

    // NEW: Format exact date and time
    formatExactDateTime(dateString) {
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZoneName: 'short'
        };
        return date.toLocaleString('en-US', options);
    }

    renderAdminActivityDisplay(data) {
        if (!this.elements.adminActivityMetrics) return;

        const metrics = [
            {
                label: 'Currently Active',
                value: data.active || 0,
                change: 'Right now'
            },
            {
                label: 'Active Admins',
                value: data.active_admins || 0,
                change: 'Last hour'
            },
            {
                label: 'Total Admins',
                value: data.total_admins || 0,
                change: 'System wide'
            },
            {
                label: 'Activity Rate',
                value: data.activity_rate || '0%',
                change: 'Current period'
            }
        ];

        this.elements.adminActivityMetrics.innerHTML = metrics.map(metric => `
            <div class="activity-metric">
                <div class="activity-metric-value">${metric.value}</div>
                <div class="activity-metric-label">${metric.label}</div>
                <div class="activity-metric-change">${metric.change}</div>
            </div>
        `).join('');

        // Update activity status indicator
        const activityStatus = document.getElementById('adminActivityStatus');
        if (activityStatus) {
            const activityDot = activityStatus.querySelector('.activity-dot');
            const activityText = activityStatus.querySelector('.activity-text');

            if (activityDot && activityText) {
                if (data.active > 0) {
                    activityDot.className = 'activity-dot pulse-green';
                    activityText.textContent = 'Active';
                } else {
                    activityDot.className = 'activity-dot pulse-yellow';
                    activityText.textContent = 'Idle';
                }
            }
        }
    }

    // NEW: Email Preferences Management
    async toggleEmailPreferences() {
        const section = document.getElementById('emailPreferencesSection');
        const toggleBtn = document.getElementById('toggleEmailPreferences');
        const icon = toggleBtn?.querySelector('i');

        if (section.style.display === 'none' || !section.style.display) {
            // Show and load preferences
            section.style.display = 'block';
            if (icon) {
                icon.setAttribute('data-feather', 'chevron-up');
                feather.replace();
            }

            if (this.emailPreferences) {
                await this.emailPreferences.loadAndRender();
            }
        } else {
            // Hide
            section.style.display = 'none';
            if (icon) {
                icon.setAttribute('data-feather', 'chevron-down');
                feather.replace();
            }
        }
    }

    // NEW: Helper methods for support types
    getSupportTypeIcon(type) {
        const icons = {
            'ticket': 'message-circle',
            'contact': 'mail',
            'issue': 'alert-triangle',
            'rise-issue': 'trending-up'
        };
        return icons[type] || 'help-circle';
    }

    getSupportTypeLabel(type) {
        const labels = {
            'ticket': 'Ticket',
            'contact': 'Contact',
            'issue': 'Issue',
            'rise-issue': 'Rise Issue'
        };
        return labels[type] || 'Support';
    }

    getActivityTypeLabel(type) {
        const labels = {
            'content_added': 'Content',
            'user_registered': 'User',
            'recommendation_created': 'Recommendation',
            'support_ticket': 'Ticket',
            'contact_message': 'Contact'
        };
        return labels[type] || 'Activity';
    }

    getPriorityBadgeColor(priority) {
        const colors = {
            'urgent': 'danger',
            'high': 'warning',
            'normal': 'info',
            'low': 'success'
        };
        return colors[priority] || 'info';
    }

    getSeverityBadgeColor(severity) {
        const colors = {
            'critical': 'danger',
            'high': 'warning',
            'medium': 'info',
            'low': 'success'
        };
        return colors[severity] || 'info';
    }

    // Real-time Updates using NEW endpoints
    startRealTimeUpdatesNew() {
        this.refreshInterval = 8000; // 8 second base interval

        this.refreshTimer = setInterval(() => {
            if (!this.isRefreshing && !document.hidden) {
                this.refreshAllDataNew();
            }
        }, this.refreshInterval);

        console.log(`✅ Real-time updates started with NEW endpoints (${this.refreshInterval / 1000}s interval)`);
    }

    setupSmartPolling() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshAllDataNew();
                if (this.systemMonitor) {
                    this.systemMonitor.loadAllSystemDataNew();
                }
                this.boostPollingFrequency();
            }
        });
    }

    boostPollingFrequency() {
        if (this.boostTimeout) {
            clearTimeout(this.boostTimeout);
        }

        const originalRefreshInterval = this.refreshInterval;
        this.refreshInterval = 3000;

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

    async refreshAllDataNew() {
        if (this.isRefreshing) return;

        this.isRefreshing = true;

        try {
            await this.loadAllDataNew();
            if (this.systemMonitor) {
                await this.systemMonitor.loadAllSystemDataNew();
            }
            // this.showSuccess('Dashboard updated');
        } catch (error) {
            console.error('Refresh error:', error);
            this.showError('Failed to refresh dashboard');
        } finally {
            this.isRefreshing = false;
        }
    }

    updateChartsForPeriod() {
        this.loadAnalytics();
    }

    // NEW: Data integrity validation for new structure
    validateDataIntegrityNew() {
        if (!this.dashboardData.systemMonitoring) {
            console.error('Invalid system monitoring data, reloading...');
            this.loadSystemMonitoring();
        }

        if (!this.dashboardData.overview) {
            console.error('Invalid overview data, reloading...');
            this.loadOverviewStats();
        }

        if (!this.dashboardData.analytics || !this.dashboardData.analytics.user_analytics) {
            console.error('Invalid analytics data, reloading...');
            this.loadAnalytics();
        }

        if (!this.dashboardData.supportData) {
            console.error('Invalid support data, reloading...');
            this.loadSupportRealTime();
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
        if (window.topbar && window.topbar.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
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
            `;
            document.head.appendChild(style);
        }
    }

    // Cleanup
    destroy() {
        this.stopRealTimeUpdates();

        if (this.systemMonitor) {
            this.systemMonitor.destroy();
        }

        if (this.statisticsManager) {
            this.statisticsManager.destroy();
        }

        if (this.emailPreferences) {
            this.emailPreferences.destroy();
        }

        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleResize);

        console.log('🗑 Admin dashboard v3.0 destroyed');
    }
}

// NEW: Email Preferences Manager Class
class EmailPreferencesManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.preferences = null;
    }

    async init() {
        console.log('✅ Email Preferences Manager initialized');
    }

    async loadAndRender() {
        try {
            const response = await this.dashboard.makeAuthenticatedRequest('/admin/email-preferences');
            if (response.ok) {
                const data = await response.json();
                this.preferences = data.preferences;
                this.renderPreferences(data.preferences);
            } else {
                throw new Error('Failed to load email preferences');
            }
        } catch (error) {
            console.error('Error loading email preferences:', error);
            this.dashboard.showError('Failed to load email preferences');
        }
    }

    renderPreferences(preferences) {
        const container = document.getElementById('emailPreferencesContent');
        if (!container) return;

        container.innerHTML = `
            <div class="email-preferences-grid">
                <div class="preference-category">
                    <h5 class="preference-category-title">
                        <i data-feather="alert-triangle"></i>
                        Critical Alerts
                    </h5>
                    <div class="preference-items">
                        ${this.renderPreferenceToggle('urgent_tickets', 'Urgent Support Tickets', preferences.critical_alerts.urgent_tickets)}
                        ${this.renderPreferenceToggle('sla_breaches', 'SLA Breaches', preferences.critical_alerts.sla_breaches)}
                        ${this.renderPreferenceToggle('system_alerts', 'System Alerts', preferences.critical_alerts.system_alerts)}
                    </div>
                </div>

                <div class="preference-category">
                    <h5 class="preference-category-title">
                        <i data-feather="film"></i>
                        Content Management
                    </h5>
                    <div class="preference-items">
                        ${this.renderPreferenceToggle('content_added', 'Content Added', preferences.content_management.content_added)}
                        ${this.renderPreferenceToggle('recommendation_created', 'Recommendations Created', preferences.content_management.recommendation_created)}
                        ${this.renderPreferenceToggle('recommendation_published', 'Recommendations Published', preferences.content_management.recommendation_published)}
                    </div>
                </div>

                <div class="preference-category">
                    <h5 class="preference-category-title">
                        <i data-feather="users"></i>
                        User Activity
                    </h5>
                    <div class="preference-items">
                        ${this.renderPreferenceToggle('user_feedback', 'User Feedback', preferences.user_activity.user_feedback)}
                        ${this.renderPreferenceToggle('regular_tickets', 'Regular Tickets', preferences.user_activity.regular_tickets)}
                    </div>
                </div>

                <div class="preference-category">
                    <h5 class="preference-category-title">
                        <i data-feather="settings"></i>
                        System Operations
                    </h5>
                    <div class="preference-items">
                        ${this.renderPreferenceToggle('cache_operations', 'Cache Operations', preferences.system_operations.cache_operations)}
                        ${this.renderPreferenceToggle('bulk_operations', 'Bulk Operations', preferences.system_operations.bulk_operations)}
                        ${this.renderPreferenceToggle('slug_updates', 'Slug Updates', preferences.system_operations.slug_updates)}
                    </div>
                </div>
            </div>
            
            <div class="preference-actions">
                <button class="btn btn-primary" id="saveEmailPreferences">
                    <i data-feather="save"></i>
                    Save Preferences
                </button>
                <button class="btn btn-outline-secondary" id="resetEmailPreferences">
                    <i data-feather="rotate-ccw"></i>
                    Reset to Defaults
                </button>
            </div>
        `;

        this.setupPreferenceEventListeners();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderPreferenceToggle(id, label, checked) {
        return `
            <div class="preference-item">
                <div class="preference-toggle">
                    <input type="checkbox" id="pref_${id}" ${checked ? 'checked' : ''}>
                    <label for="pref_${id}" class="toggle-slider"></label>
                </div>
                <div class="preference-label">
                    <span class="preference-name">${label}</span>
                </div>
            </div>
        `;
    }

    setupPreferenceEventListeners() {
        // Save preferences
        const saveBtn = document.getElementById('saveEmailPreferences');
        saveBtn?.addEventListener('click', () => {
            this.savePreferences();
        });

        // Reset preferences
        const resetBtn = document.getElementById('resetEmailPreferences');
        resetBtn?.addEventListener('click', () => {
            this.resetPreferences();
        });
    }

    async savePreferences() {
        try {
            const updatedPreferences = {
                critical_alerts: {
                    urgent_tickets: document.getElementById('pref_urgent_tickets')?.checked || false,
                    sla_breaches: document.getElementById('pref_sla_breaches')?.checked || false,
                    system_alerts: document.getElementById('pref_system_alerts')?.checked || false
                },
                content_management: {
                    content_added: document.getElementById('pref_content_added')?.checked || false,
                    recommendation_created: document.getElementById('pref_recommendation_created')?.checked || false,
                    recommendation_published: document.getElementById('pref_recommendation_published')?.checked || false
                },
                user_activity: {
                    user_feedback: document.getElementById('pref_user_feedback')?.checked || false,
                    regular_tickets: document.getElementById('pref_regular_tickets')?.checked || false
                },
                system_operations: {
                    cache_operations: document.getElementById('pref_cache_operations')?.checked || false,
                    bulk_operations: document.getElementById('pref_bulk_operations')?.checked || false,
                    slug_updates: document.getElementById('pref_slug_updates')?.checked || false
                }
            };

            const response = await this.dashboard.makeAuthenticatedRequest('/admin/email-preferences', {
                method: 'PUT',
                body: JSON.stringify({ preferences: updatedPreferences })
            });

            if (response.ok) {
                const data = await response.json();
                this.dashboard.showSuccess('Email preferences saved successfully');
                this.preferences = updatedPreferences;
            } else {
                throw new Error('Failed to save email preferences');
            }
        } catch (error) {
            console.error('Error saving email preferences:', error);
            this.dashboard.showError('Failed to save email preferences');
        }
    }

    resetPreferences() {
        // Reset to default values
        const defaultChecked = {
            'pref_urgent_tickets': true,
            'pref_sla_breaches': true,
            'pref_system_alerts': true,
            'pref_content_added': true,
            'pref_recommendation_created': true,
            'pref_recommendation_published': true,
            'pref_user_feedback': true,
            'pref_regular_tickets': false,
            'pref_cache_operations': false,
            'pref_bulk_operations': false,
            'pref_slug_updates': false
        };

        Object.entries(defaultChecked).forEach(([id, checked]) => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = checked;
            }
        });

        this.dashboard.showSuccess('Preferences reset to defaults');
    }

    destroy() {
        console.log('🗑 Email preferences manager destroyed');
    }
}

// Initialize dashboard
let adminDashboard;

document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

window.addEventListener('beforeunload', () => {
    if (adminDashboard) {
        adminDashboard.destroy();
    }
});

window.AdminDashboard = AdminDashboard;
window.EmailPreferencesManager = EmailPreferencesManager;
window.adminDashboard = adminDashboard;