/**
 * CineBrain Admin Dashboard - System Monitoring (Updated for Backend v3.0)
 * Real-time system health and alert management
 */

class SystemMonitor {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.apiBase = dashboard.apiBase;

        // Updated monitoring properties for new endpoints
        this.monitoring = {
            refreshRate: 5000,
            systemTimer: null,        // NEW: /system-monitoring
            serviceTimer: null,       // NEW: /service-status  
            alertsTimer: null,        // NEW: /admin/support/alerts
            notificationTimer: null,  // UPDATED: /admin/notifications
            healthTimer: null,        // NEW: /admin/system-health
            activityTimer: null      // NEW: /admin-activity
        };

        this.systemData = {
            systemMonitoring: null,   // NEW: System monitoring data
            serviceStatus: null,      // NEW: Service status data
            systemHealth: null,       // NEW: System health data
            adminActivity: null,      // NEW: Admin activity data
            alerts: [],
            notifications: [],
            lastAlertCheck: null,
            lastNotificationCheck: null
        };

        this.processedAlerts = new Set();
        this.processedNotifications = new Set();
        this.notificationQueue = [];

        this.elements = this.initializeElements();
    }

    async init() {
        this.setupEventListeners();
        this.setupNotificationSystem();
        this.systemData.lastAlertCheck = new Date();
        this.systemData.lastNotificationCheck = new Date();
        this.startSystemMonitoringNew();
        await this.loadAllSystemDataNew();
    }

    initializeElements() {
        return {
            // Main status elements
            mainStatusDot: document.getElementById('mainStatusDot'),
            mainStatusText: document.getElementById('mainStatusText'),
            dbStatus: document.getElementById('dbStatus'),
            cacheStatus: document.getElementById('cacheStatus'),
            apiStatus: document.getElementById('apiStatus'),

            // Health card elements
            dbHealthStatus: document.getElementById('dbHealthStatus'),
            cacheHealthStatus: document.getElementById('cacheHealthStatus'),
            servicesHealthStatus: document.getElementById('servicesHealthStatus'),
            performanceHealthStatus: document.getElementById('performanceHealthStatus'),

            // Detailed metric elements
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

            // Alert elements
            alertsSection: document.getElementById('alertsSection'),
            realTimeAlerts: document.getElementById('realTimeAlerts'),
            activeAlertsCount: document.getElementById('activeAlertsCount'),

            // Service and activity elements
            servicesStatusGrid: document.getElementById('servicesStatusGrid'),
            adminActivityMetrics: document.getElementById('adminActivityMetrics'),
            adminActivityStatus: document.getElementById('adminActivityStatus'),

            // Notification elements
            systemNotificationsList: document.getElementById('systemNotificationsList'),
            notificationBadge: document.getElementById('notificationBadge'),
            notificationDropdown: document.getElementById('notificationDropdown'),
            notificationDropdownContent: document.getElementById('notificationDropdownContent'),

            // Performance indicator
            performanceIndicator: document.getElementById('performanceIndicator'),

            // Last update time
            lastUpdate: document.getElementById('lastUpdate'),
            liveConnectionStatus: document.getElementById('liveConnectionStatus')
        };
    }

    setupEventListeners() {
        // Quick health check button
        const quickHealthCheck = document.getElementById('quickHealthCheck');
        quickHealthCheck?.addEventListener('click', () => {
            this.performQuickHealthCheck();
            this.dashboard.hapticFeedback('medium');
        });

        // Monitoring refresh rate selector
        const monitoringRefreshRate = document.getElementById('monitoringRefreshRate');
        monitoringRefreshRate?.addEventListener('change', (e) => {
            this.updateMonitoringRefreshRate(parseInt(e.target.value));
        });

        // Dismiss all alerts button
        const dismissAllAlerts = document.getElementById('dismissAllAlerts');
        dismissAllAlerts?.addEventListener('click', () => {
            this.dismissAllAlerts();
        });

        // Mark all notifications read button
        const markAllNotificationsRead = document.getElementById('markAllNotificationsRead');
        markAllNotificationsRead?.addEventListener('click', () => {
            this.markAllNotificationsAsRead();
        });

        // Mark all notifications read button in dropdown
        const markAllNotificationsReadBtn = document.getElementById('markAllNotificationsReadBtn');
        markAllNotificationsReadBtn?.addEventListener('click', () => {
            this.markAllNotificationsAsRead();
        });

        // Notification bell click
        const notificationBell = document.getElementById('notificationBell');
        notificationBell?.addEventListener('click', () => {
            this.toggleNotificationDropdown();
        });

        // Close notification dropdown
        const closeNotificationDropdown = document.getElementById('closeNotificationDropdown');
        closeNotificationDropdown?.addEventListener('click', () => {
            this.hideNotificationDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#notificationBell') && !e.target.closest('#notificationDropdown')) {
                this.hideNotificationDropdown();
            }
        });
    }

    setupNotificationSystem() {
        // Process notification queue every second
        setInterval(() => {
            this.processNotificationQueue();
        }, 1000);

        // Listen for notification events from other components
        window.addEventListener('cinebrain-notification', (e) => {
            this.handleNewNotification(e.detail);
        });
    }

    startSystemMonitoringNew() {
        // NEW: Optimized polling for new endpoints with staggered starts

        // System monitoring (database, cache, APIs, performance) - 5s
        this.monitoring.systemTimer = setInterval(() => {
            this.loadSystemMonitoringData();
        }, 5000);

        // Support alerts - 5s (high priority)
        setTimeout(() => {
            this.monitoring.alertsTimer = setInterval(() => {
                this.loadSupportAlerts();
            }, 5000);
        }, 1000);

        // Service status - 8s
        setTimeout(() => {
            this.monitoring.serviceTimer = setInterval(() => {
                this.loadServiceStatusData();
            }, 8000);
        }, 2000);

        // Admin activity - 8s
        setTimeout(() => {
            this.monitoring.activityTimer = setInterval(() => {
                this.loadAdminActivityData();
            }, 8000);
        }, 3000);

        // System health - 10s
        setTimeout(() => {
            this.monitoring.healthTimer = setInterval(() => {
                this.loadSystemHealthData();
            }, 10000);
        }, 4000);

        // Admin notifications - 8s
        setTimeout(() => {
            this.monitoring.notificationTimer = setInterval(() => {
                this.loadAdminNotifications();
            }, 8000);
        }, 6000);

        console.log('✅ System monitoring started with NEW endpoints');
        console.log('   - System: 5s | Alerts: 5s | Service: 8s | Activity: 8s | Health: 10s | Notifications: 8s');
    }

    async loadAllSystemDataNew() {
        try {
            await Promise.allSettled([
                this.loadSystemMonitoringData(),
                this.loadServiceStatusData(),
                this.loadAdminActivityData(),
                this.loadSystemHealthData(),
                this.loadSupportAlerts(),
                this.loadAdminNotifications()
            ]);

            this.updateSystemStatusBarNew();
            this.updateLiveConnectionStatus();
        } catch (error) {
            console.error('Error loading system data:', error);
        }
    }

    // NEW: System Monitoring endpoint (/system-monitoring)
    async loadSystemMonitoringData() {
        try {
            const response = await this.dashboard.makeAuthenticatedRequest('/system-monitoring');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.systemData.systemMonitoring = data.data;
                    this.updateSystemHealthCardsNew(data.data);
                    this.updateSystemStatusBarNew(data.data);

                    // Update refresh interval display
                    if (data.refresh_interval) {
                        this.updateElement('refreshInterval', `${data.refresh_interval}s`);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading system monitoring:', error);
            this.updateSystemStatusBarNew({ status: 'error' });
        }
    }

    // NEW: Service Status endpoint (/service-status)
    async loadServiceStatusData() {
        try {
            const response = await this.dashboard.makeAuthenticatedRequest('/service-status');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.systemData.serviceStatus = data.data;
                    this.updateServicesDisplay(data.data);
                }
            }
        } catch (error) {
            console.error('Error loading service status:', error);
        }
    }

    // NEW: Admin Activity endpoint (/admin-activity)
    async loadAdminActivityData() {
        try {
            const response = await this.dashboard.makeAuthenticatedRequest('/admin-activity');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.systemData.adminActivity = data.data;
                    this.updateAdminActivityMetrics(data.data);
                }
            }
        } catch (error) {
            console.error('Error loading admin activity:', error);
        }
    }

    // NEW: System Health endpoint (/admin/system-health)
    async loadSystemHealthData() {
        try {
            const response = await this.dashboard.makeAuthenticatedRequest('/admin/system-health');
            if (response.ok) {
                const data = await response.json();
                this.systemData.systemHealth = data;
                this.updateSystemHealth(data);
            }
        } catch (error) {
            console.error('Error loading system health:', error);
        }
    }

    // UPDATED: Support Alerts endpoint (/admin/support/alerts)
    async loadSupportAlerts() {
        try {
            const response = await this.dashboard.makeAuthenticatedRequest('/admin/support/alerts');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.alerts) {
                    const alerts = data.alerts;

                    // Process new alerts
                    alerts.forEach(alert => {
                        const alertId = alert.id || `${alert.type}-${alert.message}-${alert.created_at}`;
                        if (!this.processedAlerts.has(alertId)) {
                            this.processedAlerts.add(alertId);
                            this.handleNewAlert(alert);
                        }
                    });

                    // Keep only last 100 processed alert IDs to prevent memory leak
                    if (this.processedAlerts.size > 100) {
                        const alertsArray = Array.from(this.processedAlerts);
                        this.processedAlerts = new Set(alertsArray.slice(-100));
                    }

                    this.systemData.alerts = alerts;
                    this.updateSystemAlertsNew(alerts);
                }
            }
        } catch (error) {
            console.error('Error loading support alerts:', error);
        }
    }

    // UPDATED: Enhanced admin notifications with all activity types
    async loadAdminNotifications() {
        try {
            const response = await this.dashboard.makeAuthenticatedRequest('/admin/notifications');
            if (response.ok) {
                const data = await response.json();

                // Handle both recent_notifications and notifications arrays
                let notifications = data.notifications || data.recent_notifications || [];

                // Enhance notifications with support data
                notifications = await this.enhanceNotificationsWithSupportData(notifications);

                // Process new notifications
                notifications.forEach(notif => {
                    const notifId = notif.id || `${notif.type}-${notif.title}-${notif.created_at}`;
                    if (!this.processedNotifications.has(notifId) && !notif.is_read) {
                        this.processedNotifications.add(notifId);
                        this.handleNewNotification(notif);
                    }
                });

                // Keep only last 100 processed notification IDs
                if (this.processedNotifications.size > 100) {
                    const notifsArray = Array.from(this.processedNotifications);
                    this.processedNotifications = new Set(notifsArray.slice(-100));
                }

                this.updateSystemNotificationsNew(data);
                this.updateNotificationDropdown(notifications);

                // Update notification badge
                const unreadCount = notifications.filter(n => !n.is_read).length;
                this.updateNotificationBadge(unreadCount);

                // Store in localStorage for persistence
                localStorage.setItem('cinebrain-admin-notifications', JSON.stringify(notifications));

                // Dispatch event for other components
                window.dispatchEvent(new CustomEvent('cinebrain-notifications-updated', {
                    detail: { notifications, unreadCount }
                }));
            }
        } catch (error) {
            console.error('Error loading admin notifications:', error);
        }
    }

    // NEW: Enhance notifications with support and activity data
    async enhanceNotificationsWithSupportData(baseNotifications) {
        const enhancedNotifications = [...baseNotifications];

        try {
            // Add support-related notifications
            if (this.dashboard.dashboardData.supportData) {
                const supportData = this.dashboard.dashboardData.supportData;

                // Add ticket notifications
                if (supportData.recent_tickets) {
                    supportData.recent_tickets.forEach(ticket => {
                        enhancedNotifications.push({
                            id: `ticket-${ticket.id}`,
                            type: 'support_ticket',
                            notification_type: 'NEW_TICKET',
                            title: `New Support Ticket #${ticket.ticket_number}`,
                            message: `${ticket.user_name} created a ${ticket.priority} priority ticket: ${ticket.subject}`,
                            is_urgent: ticket.priority === 'urgent',
                            is_read: false,
                            created_at: ticket.created_at,
                            action_url: `/admin/support/tickets/${ticket.id}`,
                            metadata: {
                                ticket_id: ticket.id,
                                priority: ticket.priority,
                                user: ticket.user_name
                            }
                        });
                    });
                }

                // Add contact notifications
                if (supportData.recent_contacts) {
                    supportData.recent_contacts.forEach(contact => {
                        enhancedNotifications.push({
                            id: `contact-${contact.id}`,
                            type: 'contact_message',
                            notification_type: 'CONTACT_RECEIVED',
                            title: `New Contact Message`,
                            message: `${contact.name} ${contact.company ? `from ${contact.company}` : ''} sent a message: ${contact.subject}`,
                            is_urgent: contact.is_business_inquiry,
                            is_read: contact.is_read,
                            created_at: contact.created_at,
                            action_url: `/admin/support/contacts/${contact.id}`,
                            metadata: {
                                contact_id: contact.id,
                                is_business: contact.is_business_inquiry,
                                user: contact.name
                            }
                        });
                    });
                }

                // Add issue notifications
                if (supportData.recent_issues) {
                    supportData.recent_issues.forEach(issue => {
                        enhancedNotifications.push({
                            id: `issue-${issue.id}`,
                            type: 'issue_report',
                            notification_type: 'ISSUE_REPORTED',
                            title: `New Issue Report: ${issue.issue_id}`,
                            message: `${issue.name} reported a ${issue.severity} severity issue: ${issue.issue_title}`,
                            is_urgent: issue.severity === 'critical',
                            is_read: false,
                            created_at: issue.created_at,
                            action_url: `/admin/support/issues/${issue.id}`,
                            metadata: {
                                issue_id: issue.id,
                                severity: issue.severity,
                                user: issue.name
                            }
                        });
                    });
                }
            }

            // Add admin activity notifications
            if (this.dashboard.dashboardData.overview) {
                const overview = this.dashboard.dashboardData.overview;

                // Add recommendation activities
                if (overview.recent_recommendations) {
                    overview.recent_recommendations.forEach(rec => {
                        enhancedNotifications.push({
                            id: `recommendation-${rec.id}`,
                            type: 'admin_recommendation',
                            notification_type: 'RECOMMENDATION_CREATED',
                            title: `New Admin Recommendation`,
                            message: `Admin ${rec.admin_name} recommended: ${rec.content_title}`,
                            is_urgent: false,
                            is_read: false,
                            created_at: rec.created_at,
                            action_url: `/admin/recommendations/${rec.id}`,
                            metadata: {
                                recommendation_id: rec.id,
                                admin: rec.admin_name,
                                content: rec.content_title
                            }
                        });
                    });
                }

                // Add content activities
                if (overview.recent_content) {
                    overview.recent_content.slice(0, 3).forEach(content => {
                        enhancedNotifications.push({
                            id: `content-${content.id}`,
                            type: 'content_activity',
                            notification_type: 'CONTENT_ADDED',
                            title: `New Content Added`,
                            message: `${content.type}: ${content.title} (Rating: ${content.rating || 'N/A'}/10)`,
                            is_urgent: false,
                            is_read: false,
                            created_at: content.created_at,
                            action_url: `/admin/content/${content.id}`,
                            metadata: {
                                content_id: content.id,
                                type: content.type,
                                title: content.title
                            }
                        });
                    });
                }

                // Add user activities
                if (overview.recent_users) {
                    overview.recent_users.slice(0, 2).forEach(user => {
                        enhancedNotifications.push({
                            id: `user-${user.id}`,
                            type: 'user_activity',
                            notification_type: 'USER_REGISTERED',
                            title: `New User Registration`,
                            message: `${user.username} (${user.email}) joined CineBrain`,
                            is_urgent: false,
                            is_read: false,
                            created_at: user.created_at,
                            action_url: `/admin/users/${user.id}`,
                            metadata: {
                                user_id: user.id,
                                username: user.username,
                                email: user.email
                            }
                        });
                    });
                }
            }

            // Sort all notifications by creation date
            enhancedNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // Remove duplicates and limit to recent ones
            const uniqueNotifications = enhancedNotifications.filter((notif, index, arr) =>
                index === arr.findIndex(n => n.id === notif.id)
            ).slice(0, 50);

            return uniqueNotifications;

        } catch (error) {
            console.error('Error enhancing notifications:', error);
            return baseNotifications;
        }
    }

    // NEW: Updated system health cards for new data structure
    updateSystemHealthCardsNew(data) {
        // Database health card
        if (data.database) {
            this.updateHealthCardNew('database', {
                status: data.database.status === 'online' ? 'healthy' :
                    data.database.status === 'degraded' ? 'warning' : 'danger',
                connection: data.database.status,
                response_time: data.database.response,
                connections: data.database.connections
            });
        }

        // Cache health card
        if (data.cache) {
            this.updateHealthCardNew('cache', {
                status: data.cache.type !== 'unknown' && data.cache.hit_rate !== '0%' ? 'healthy' :
                    data.cache.type !== 'unknown' ? 'warning' : 'danger',
                type: data.cache.type,
                hit_rate: data.cache.hit_rate,
                memory: data.cache.memory
            });
        }

        // External APIs health card
        if (data.external_apis) {
            const apis = data.external_apis;
            const allConfigured = apis.tmdb && apis.youtube && apis.cloudinary;
            const someConfigured = apis.tmdb || apis.youtube || apis.cloudinary;

            this.updateHealthCardNew('services', {
                status: allConfigured ? 'healthy' : someConfigured ? 'warning' : 'danger',
                tmdb: apis.tmdb,
                youtube: apis.youtube,
                cloudinary: apis.cloudinary
            });
        }

        // Performance health card
        if (data.performance) {
            const perf = data.performance;
            const cpuNum = parseInt(perf.cpu?.replace('%', '') || 0);
            const memNum = parseInt(perf.memory?.replace('%', '') || 0);
            const diskNum = parseInt(perf.disk?.replace('%', '') || 0);
            const maxUsage = Math.max(cpuNum, memNum, diskNum);

            this.updateHealthCardNew('performance', {
                status: maxUsage > 90 ? 'danger' : (maxUsage > 70 ? 'warning' : 'healthy'),
                cpu: perf.cpu,
                memory: perf.memory,
                disk: perf.disk
            });

            // FIXED: Use the correct method name - updatePerformanceChartNew
            if (this.dashboard.statisticsManager && this.dashboard.statisticsManager.updatePerformanceChartNew) {
                this.dashboard.statisticsManager.updatePerformanceChartNew({
                    performance: perf
                });
            }
        }
    }

    updateHealthCardNew(type, data) {
        const healthStatus = document.getElementById(`${type}HealthStatus`);
        const healthDot = healthStatus?.querySelector('.health-dot');

        if (!healthDot) return;

        // Update health dot status
        healthDot.className = `health-dot ${data.status === 'healthy' ? '' : data.status}`;

        // Update specific metrics based on type
        if (type === 'database') {
            this.updateElement('dbConnectionStatus', data.connection || 'Unknown');
            this.updateElement('dbResponseTime', data.response_time || '--');
            this.updateElement('dbConnections', data.connections || '--');
        } else if (type === 'cache') {
            this.updateElement('cacheType', data.type || 'Unknown');
            this.updateElement('cacheHitRate', data.hit_rate || '--');
            this.updateElement('cacheMemory', data.memory || '--');
        } else if (type === 'services') {
            this.updateElement('tmdbStatus', data.tmdb ? '✓' : '✗');
            this.updateElement('youtubeStatus', data.youtube ? '✓' : '✗');
            this.updateElement('cloudinaryStatus', data.cloudinary ? '✓' : '✗');
        } else if (type === 'performance') {
            this.updateElement('cpuUsage', data.cpu || '--%');
            this.updateElement('memoryUsage', data.memory || '--%');
            this.updateElement('diskUsage', data.disk || '--%');
        }
    }

    updateSystemStatusBarNew(data) {
        const mainStatusDot = this.elements.mainStatusDot;
        const mainStatusText = this.elements.mainStatusText;

        if (data) {
            // Determine overall system status
            let overallStatus = 'healthy';

            // Check database status
            if (data.database?.status !== 'online') {
                overallStatus = 'degraded';
            }

            // Check performance metrics
            if (data.performance) {
                const maxUsage = Math.max(
                    parseInt(data.performance.cpu?.replace('%', '') || 0),
                    parseInt(data.performance.memory?.replace('%', '') || 0),
                    parseInt(data.performance.disk?.replace('%', '') || 0)
                );

                if (maxUsage > 90) {
                    overallStatus = 'critical';
                } else if (maxUsage > 70 && overallStatus === 'healthy') {
                    overallStatus = 'degraded';
                }
            }

            // Check cache status
            if (data.cache?.type === 'unknown') {
                if (overallStatus === 'healthy') {
                    overallStatus = 'degraded';
                }
            }

            // Update main status indicator
            if (mainStatusDot) {
                mainStatusDot.className = `status-dot ${overallStatus === 'healthy' ? 'pulse-green' :
                    overallStatus === 'degraded' ? 'pulse-yellow' : 'pulse-red'
                    }`;
            }

            if (mainStatusText) {
                mainStatusText.textContent =
                    overallStatus === 'healthy' ? 'System Online' :
                        overallStatus === 'degraded' ? 'System Degraded' : 'System Critical';
            }
        }

        // Update individual status bar indicators
        this.updateElement('dbStatus', data?.database?.status === 'online' ? 'Connected' : 'Error');
        this.updateElement('cacheStatus', data?.cache?.type !== 'unknown' ? 'Active' : 'Inactive');
        this.updateElement('apiStatus', data?.external_apis?.tmdb ? 'Online' : 'Offline');
    }

    // NEW: Updated services display for new service status structure
    updateServicesDisplay(data) {
        const servicesGrid = this.elements.servicesStatusGrid;
        if (!servicesGrid) return;

        const services = [
            { name: 'Auth', status: data.auth === 'online', icon: '🔐' },
            { name: 'Admin', status: data.admin === 'online', icon: '👤' },
            { name: 'Support', status: data.support === 'online', icon: '🎧' },
            { name: 'Content', status: data.content === 'online', icon: '🎬' },
            { name: 'Analytics', status: data.analytics === 'online', icon: '📊' },
            { name: 'Cache', status: data.cache === 'online', icon: '⚡' }
        ];

        servicesGrid.innerHTML = services.map(service => `
            <div class="service-item">
                <div class="service-status ${service.status ? '' : 'danger'}"></div>
                <div class="service-name">${service.name}</div>
                <div class="service-info">${service.status ? 'Online' : 'Offline'}</div>
            </div>
        `).join('');
    }

    // NEW: Update admin activity metrics display
    updateAdminActivityMetrics(data) {
        const adminActivityMetrics = this.elements.adminActivityMetrics;
        if (!adminActivityMetrics) return;

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
                change: '24h average'
            }
        ];

        adminActivityMetrics.innerHTML = metrics.map(metric => `
            <div class="activity-metric">
                <div class="activity-metric-value">${metric.value}</div>
                <div class="activity-metric-label">${metric.label}</div>
                <div class="activity-metric-change">${metric.change}</div>
            </div>
        `).join('');

        // Update activity status indicator
        const activityStatus = this.elements.adminActivityStatus;
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

        // Update recommendations count if present
        if (data.recommendations !== undefined) {
            const recommendationsBadge = document.getElementById('activeRecommendationsBadge');
            if (recommendationsBadge) {
                recommendationsBadge.textContent = data.recommendations;
                recommendationsBadge.style.display = data.recommendations > 0 ? 'inline-block' : 'none';
            }
        }
    }

    // NEW: Updated alerts handling for new structure
    updateSystemAlertsNew(alerts) {
        const alertsSection = this.elements.alertsSection;
        const realTimeAlerts = this.elements.realTimeAlerts;
        const activeAlertsCount = this.elements.activeAlertsCount;

        if (!alerts || alerts.length === 0) {
            if (alertsSection) alertsSection.style.display = 'none';
            if (activeAlertsCount) activeAlertsCount.textContent = '0';
            return;
        }

        if (alertsSection) alertsSection.style.display = 'block';
        if (activeAlertsCount) activeAlertsCount.textContent = alerts.length;

        if (realTimeAlerts) {
            realTimeAlerts.innerHTML = alerts.map(alert => {
                const alertLevel = alert.type === 'urgent_ticket' ? 'urgent' :
                    alert.type === 'critical_issue' ? 'danger' :
                        alert.type === 'business_inquiry' ? 'info' : 'warning';

                return `
                    <div class="alert-item ${alertLevel}" data-alert-id="${alert.id || Date.now()}">
                        <div class="alert-icon">
                            <i data-feather="${this.getAlertIcon(alertLevel)}"></i>
                        </div>
                        <div class="alert-content">
                            <div class="alert-title">${alert.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'System Alert'}</div>
                            <div class="alert-message">${alert.message}</div>
                            ${alert.url ? `<a href="${alert.url}" class="alert-link">View Details →</a>` : ''}
                        </div>
                        <div class="alert-time">${this.dashboard.formatTimeAgo(alert.created_at || new Date().toISOString())}</div>
                        <div class="alert-actions">
                            <button class="alert-dismiss" onclick="adminDashboard.systemMonitor.dismissAlert('${alert.id || Date.now()}')">
                                <i data-feather="x"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    // NEW: Updated notifications for new structure
    updateSystemNotificationsNew(data) {
        const notificationsList = this.elements.systemNotificationsList;
        if (!notificationsList) return;

        const notifications = data.notifications || data.recent_notifications || [];

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
                    <i data-feather="${this.getNotificationIcon(notification.type || notification.notification_type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${this.dashboard.truncateText(notification.message, 60)}</div>
                    <div class="notification-time">${this.dashboard.formatTimeAgo(notification.created_at)}</div>
                </div>
            </div>
        `).join('');

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // NEW: Update notification dropdown content
    updateNotificationDropdown(notifications) {
        const dropdownContent = this.elements.notificationDropdownContent;
        if (!dropdownContent) return;

        if (!notifications || notifications.length === 0) {
            dropdownContent.innerHTML = `
                <div class="notification-empty">
                    <i data-feather="bell-off"></i>
                    <p>No notifications</p>
                </div>
            `;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            return;
        }

        dropdownContent.innerHTML = notifications.slice(0, 10).map(notification => {
            const notifType = notification.type || notification.notification_type || 'info';
            const isUrgent = notification.is_urgent || notification.action_required;
            const notifLevel = isUrgent ? 'critical' :
                notifType.includes('error') ? 'error' :
                    notifType.includes('warning') ? 'warning' :
                        notifType.includes('success') ? 'success' : 'info';

            return `
                <div class="notification-dropdown-item ${notification.is_read ? '' : 'unread'} ${notifLevel}">
                    <div class="notification-dropdown-icon">
                        <i data-feather="${this.getNotificationIcon(notifType)}"></i>
                    </div>
                    <div class="notification-dropdown-body">
                        <div class="notification-dropdown-item-title">${notification.title}</div>
                        <div class="notification-dropdown-item-message">${this.dashboard.truncateText(notification.message, 50)}</div>
                        <div class="notification-dropdown-item-time">${this.dashboard.formatTimeAgo(notification.created_at)}</div>
                    </div>
                </div>
            `;
        }).join('');

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // NEW: System health update method
    updateSystemHealth(data) {
        if (!data) return;

        const status = data.status || 'unknown';

        // Update performance indicator based on overall health
        const performanceIndicator = this.elements.performanceIndicator;
        if (performanceIndicator) {
            const performanceDot = performanceIndicator.querySelector('.performance-dot');
            const performanceText = performanceIndicator.querySelector('.performance-text');

            if (performanceDot && performanceText) {
                if (status === 'healthy') {
                    performanceDot.className = 'performance-dot';
                    performanceText.textContent = 'Optimal';
                } else if (status === 'degraded') {
                    performanceDot.className = 'performance-dot warning';
                    performanceText.textContent = 'Warning';
                } else {
                    performanceDot.className = 'performance-dot danger';
                    performanceText.textContent = 'Critical';
                }
            }
        }

        // Log configuration status
        if (data.configuration) {
            console.log('System Configuration:', data.configuration);
        }

        // Check for critical components
        if (data.components) {
            const criticalComponents = ['database', 'cache', 'support_system'];
            criticalComponents.forEach(component => {
                if (data.components[component]?.status === 'unhealthy' ||
                    data.components[component]?.status === 'error') {
                    this.handleNewAlert({
                        type: 'system_health',
                        level: 'critical',
                        message: `${component.replace('_', ' ').toUpperCase()} is experiencing issues`,
                        created_at: new Date().toISOString()
                    });
                }
            });
        }
    }

    updateLiveConnectionStatus() {
        if (this.elements.liveConnectionStatus) {
            this.elements.liveConnectionStatus.textContent = 'LIVE';
            this.elements.liveConnectionStatus.style.color = 'var(--admin-success)';
        }

        if (this.elements.lastUpdate) {
            const now = new Date();
            const timeString = this.dashboard.isMobile ?
                now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                now.toLocaleTimeString();
            this.elements.lastUpdate.textContent = timeString;
        }
    }

    // Notification management methods
    handleNewAlert(alert) {
        // Add to notification queue for processing
        this.notificationQueue.push({
            type: 'alert',
            title: alert.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'System Alert',
            message: alert.message,
            level: alert.level || 'warning',
            timestamp: alert.created_at || alert.timestamp || new Date().toISOString(),
            data: alert
        });
    }

    handleNewNotification(notification) {
        // Add to notification queue for processing
        this.notificationQueue.push({
            type: 'notification',
            title: notification.title,
            message: notification.message,
            level: notification.is_urgent ? 'warning' : 'info',
            timestamp: notification.created_at || new Date().toISOString(),
            data: notification
        });
    }

    processNotificationQueue() {
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            this.sendNotificationToTopbar(notification);
        }
    }

    sendNotificationToTopbar(notification) {
        // Trigger visual notification
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            notificationBell.classList.add('notification-pulse');
            setTimeout(() => {
                notificationBell.classList.remove('notification-pulse');
            }, 1000);
        }

        // Update notification count
        const notificationBadge = this.elements.notificationBadge;
        if (notificationBadge) {
            const currentCount = parseInt(notificationBadge.textContent || '0');
            notificationBadge.textContent = currentCount + 1;
            notificationBadge.style.display = 'block';
        }

        // Store notification
        const notifications = JSON.parse(localStorage.getItem('cinebrain-admin-notifications') || '[]');
        notifications.unshift({
            id: Date.now(),
            ...notification,
            isRead: false,
            createdAt: new Date().toISOString()
        });

        // Keep only last 50 notifications
        if (notifications.length > 50) {
            notifications.splice(50);
        }

        localStorage.setItem('cinebrain-admin-notifications', JSON.stringify(notifications));

        // Dispatch event for other components
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('cinebrain-notification', {
                detail: notification,
                bubbles: true
            }));
        }, 100);

        // Show toast for critical notifications
        if (notification.level === 'critical' || notification.level === 'error' || notification.level === 'urgent') {
            this.dashboard.showToast(notification.message, notification.level === 'critical' ? 'error' : 'warning');
        }
    }

    updateNotificationBadge(count) {
        const notificationBadge = this.elements.notificationBadge;
        if (notificationBadge) {
            if (count > 0) {
                notificationBadge.textContent = count > 99 ? '99+' : count;
                notificationBadge.style.display = 'block';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
    }

    toggleNotificationDropdown() {
        const dropdown = this.elements.notificationDropdown;
        if (dropdown) {
            if (dropdown.style.display === 'none' || !dropdown.style.display) {
                dropdown.style.display = 'flex';
                dropdown.classList.add('show');
            } else {
                this.hideNotificationDropdown();
            }
        }
    }

    hideNotificationDropdown() {
        const dropdown = this.elements.notificationDropdown;
        if (dropdown) {
            dropdown.classList.remove('show');
            setTimeout(() => {
                dropdown.style.display = 'none';
            }, 300);
        }
    }

    // Action Methods
    async performQuickHealthCheck() {
        this.dashboard.showToast('Running quick health check...', 'info');

        try {
            await Promise.all([
                this.loadSystemMonitoringData(),
                this.loadServiceStatusData(),
                this.loadSystemHealthData()
            ]);
            this.dashboard.showToast('Health check completed', 'success');
        } catch (error) {
            this.dashboard.showToast('Health check failed', 'error');
        }
    }

    updateMonitoringRefreshRate(newRate) {
        this.monitoring.refreshRate = newRate;

        // Stop current monitoring
        this.stopSystemMonitoringNew();

        // Restart with new rate
        this.startSystemMonitoringNew();

        this.dashboard.showToast(`Monitoring refresh rate updated to ${newRate / 1000}s`, 'success');
    }

    checkMissedNotifications() {
        // Force reload of notifications and alerts
        this.loadAdminNotifications();
        this.loadSupportAlerts();
    }

    dismissAlert(alertId) {
        // Remove alert from UI
        const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (alertElement) {
            alertElement.style.animation = 'fadeOutRight 0.3s ease';
            setTimeout(() => {
                alertElement.remove();
            }, 300);
        }

        // Update alerts count
        this.systemData.alerts = this.systemData.alerts.filter(alert =>
            (alert.id || Date.now().toString()) !== alertId
        );

        const activeAlertsCount = this.elements.activeAlertsCount;
        if (activeAlertsCount) {
            activeAlertsCount.textContent = this.systemData.alerts.length;
        }

        // Hide section if no alerts
        if (this.systemData.alerts.length === 0) {
            const alertsSection = this.elements.alertsSection;
            if (alertsSection) {
                alertsSection.style.display = 'none';
            }
        }
    }

    dismissAllAlerts() {
        const alertsContainer = this.elements.realTimeAlerts;
        const alertsSection = this.elements.alertsSection;

        if (alertsContainer) {
            alertsContainer.innerHTML = '';
        }
        if (alertsSection) {
            alertsSection.style.display = 'none';
        }

        this.systemData.alerts = [];
        this.processedAlerts.clear();

        const activeAlertsCount = this.elements.activeAlertsCount;
        if (activeAlertsCount) {
            activeAlertsCount.textContent = '0';
        }

        this.dashboard.showToast('All alerts dismissed', 'success');
    }

    // UPDATED: Mark all notifications as read using new endpoint
    async markAllNotificationsAsRead() {
        try {
            const response = await this.dashboard.makeAuthenticatedRequest('/admin/notifications/mark-all-read', {
                method: 'PUT'
            });

            if (response.ok) {
                const data = await response.json();

                // Update UI
                this.updateNotificationBadge(0);

                // Clear local storage
                const notifications = JSON.parse(localStorage.getItem('cinebrain-admin-notifications') || '[]');
                notifications.forEach(n => n.isRead = true);
                localStorage.setItem('cinebrain-admin-notifications', JSON.stringify(notifications));

                // Reload notifications
                this.loadAdminNotifications();

                this.dashboard.showToast(data.message || 'All notifications marked as read', 'success');
            } else {
                throw new Error('Failed to mark notifications as read');
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            this.dashboard.showToast('Failed to mark notifications as read', 'error');
        }
    }

    stopSystemMonitoringNew() {
        // Clear all monitoring timers
        if (this.monitoring.systemTimer) {
            clearInterval(this.monitoring.systemTimer);
            this.monitoring.systemTimer = null;
        }
        if (this.monitoring.serviceTimer) {
            clearInterval(this.monitoring.serviceTimer);
            this.monitoring.serviceTimer = null;
        }
        if (this.monitoring.alertsTimer) {
            clearInterval(this.monitoring.alertsTimer);
            this.monitoring.alertsTimer = null;
        }
        if (this.monitoring.healthTimer) {
            clearInterval(this.monitoring.healthTimer);
            this.monitoring.healthTimer = null;
        }
        if (this.monitoring.notificationTimer) {
            clearInterval(this.monitoring.notificationTimer);
            this.monitoring.notificationTimer = null;
        }
        if (this.monitoring.activityTimer) {
            clearInterval(this.monitoring.activityTimer);
            this.monitoring.activityTimer = null;
        }

        console.log('⏹ System monitoring stopped');
    }

    // Utility Methods
    getAlertIcon(level) {
        const icons = {
            'critical': 'alert-octagon',
            'danger': 'alert-circle',
            'error': 'x-circle',
            'warning': 'alert-triangle',
            'urgent': 'zap',
            'info': 'info',
            'success': 'check-circle'
        };
        return icons[level] || 'alert-circle';
    }

    // UPDATED: Enhanced notification icon mapping
    getNotificationIcon(type) {
        const icons = {
            'NEW_TICKET': 'message-circle',
            'new_ticket': 'message-circle',
            'support_ticket': 'message-circle',
            'URGENT_TICKET': 'alert-circle',
            'urgent_ticket': 'alert-circle',
            'CONTACT_RECEIVED': 'mail',
            'contact_message': 'mail',
            'ISSUE_REPORTED': 'alert-triangle',
            'issue_report': 'alert-triangle',
            'rise_issue': 'trending-up',
            'TICKET_ESCALATION': 'trending-up',
            'ticket_escalation': 'trending-up',
            'SLA_BREACH': 'clock',
            'sla_breach': 'clock',
            'FEEDBACK_RECEIVED': 'message-square',
            'feedback_received': 'message-square',
            'SYSTEM_ALERT': 'alert-triangle',
            'system_alert': 'alert-triangle',
            'USER_ACTIVITY': 'users',
            'user_activity': 'user-plus',
            'USER_REGISTERED': 'user-plus',
            'CONTENT_ADDED': 'plus-circle',
            'content_added': 'film',
            'content_activity': 'film',
            'RECOMMENDATION_CREATED': 'star',
            'admin_recommendation': 'star',
            'recommendation_created': 'star',
            'recommendation_published': 'send',
            'cache_operation': 'zap',
            'bulk_operation': 'layers',
            'slug_update': 'edit'
        };
        return icons[type] || 'bell';
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Cleanup
    destroy() {
        this.stopSystemMonitoringNew();

        // Clear notification queue
        this.notificationQueue = [];

        // Clear processed sets
        this.processedAlerts.clear();
        this.processedNotifications.clear();

        console.log('🗑 System monitor v3.0 destroyed');
    }
}

// Export for global access
window.SystemMonitor = SystemMonitor;