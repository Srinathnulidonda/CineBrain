/**
 * CineBrain Admin Users Management - Complete Controller (Backend v4.0 Compatible)
 * Mobile-First Responsive User Administration System
 * Updated for Backend API v4.0 compatibility
 */

class UsersManager {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.refreshInterval = 10000; // 10 seconds for users
        this.refreshTimer = null;
        this.isRefreshing = false;
        this.currentUser = null;
        this.isMobile = window.innerWidth <= 768;
        this.touchDevice = 'ontouchstart' in window;

        // Users data structure - Updated for backend v4.0
        this.usersData = {
            users: [],
            analytics: null,
            statistics: null,
            filters: {
                status: '',
                role: '',
                registration: '',
                search: ''
            },
            pagination: {
                page: 1,
                per_page: 25,
                total: 0,
                total_pages: 0,
                has_prev: false,
                has_next: false
            },
            sorting: {
                sort_by: 'created_at',
                sort_direction: 'desc'
            }
        };

        this.selectedUsers = new Set();

        // Initialize component managers
        this.tableManager = null;
        this.chartManager = null;
        this.modalManager = null;

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

            // Initialize elements and event listeners
            this.initializeElements();
            this.setupEventListeners();

            // Initialize component managers
            this.tableManager = new UsersTableManager(this);
            this.chartManager = new UsersChartManager(this);
            this.modalManager = new UsersModalManager(this);

            await this.tableManager.init();
            await this.chartManager.init();
            await this.modalManager.init();

            // Load initial data
            await this.loadAllUsersData();

            // Start real-time updates
            this.startRealTimeUpdates();

            // Setup mobile optimizations
            if (this.touchDevice) {
                this.setupTouchGestures();
            }

            console.log('✅ CineBrain Users Management v4.0 initialized');

        } catch (error) {
            console.error('❌ Users management initialization error:', error);
            this.showError('Failed to initialize users management');
        }
    }

    handleResize() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;

            if (wasMobile !== this.isMobile) {
                this.reinitializeForDevice();
            }
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.reinitializeForDevice();
            }, 100);
        });
    }

    reinitializeForDevice() {
        if (this.tableManager) {
            this.tableManager.handleDeviceChange();
        }
        if (this.chartManager) {
            this.chartManager.resizeCharts();
        }
        this.renderUserStatsCards();
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
            // Statistics
            userStatsCards: document.getElementById('userStatsCards'),
            mobileUserStatsCards: document.getElementById('mobileUserStatsCards'),
            statsTimeframe: document.getElementById('statsTimeframe'),

            // Search
            desktopSearchInput: document.getElementById('desktopSearchInput'),
            mobileSearchInput: document.getElementById('mobileSearchInput'),
            searchClear: document.getElementById('searchClear'),

            // Filters and toolbar
            filterStatus: document.getElementById('filterStatus'),
            filterRole: document.getElementById('filterRole'),
            filterRegistration: document.getElementById('filterRegistration'),
            clearFilters: document.getElementById('clearFilters'),
            refreshUsers: document.getElementById('refreshUsers'),

            // Table controls
            selectAllUsers: document.getElementById('selectAllUsers'),
            usersPerPage: document.getElementById('usersPerPage'),
            userTableCount: document.getElementById('userTableCount'),
            usersTableBody: document.getElementById('usersTableBody'),
            usersPagination: document.getElementById('usersPagination'),
            paginationInfo: document.getElementById('paginationInfo'),

            // Bulk actions
            bulkActionsBar: document.getElementById('bulkActionsBar'),
            selectedCount: document.getElementById('selectedCount'),
            deselectAll: document.getElementById('deselectAll'),
            bulkSuspend: document.getElementById('bulkSuspend'),
            bulkActivate: document.getElementById('bulkActivate'),
            bulkDelete: document.getElementById('bulkDelete'),

            // Actions
            addUser: document.getElementById('addUser'),
            exportUsers: document.getElementById('exportUsers'),

            // Charts
            userActivityChart: document.getElementById('userActivityChart'),
            activityChartPeriod: document.getElementById('activityChartPeriod'),
            engagementMetrics: document.getElementById('engagementMetrics'),

            // Modals
            userDetailsModal: document.getElementById('userDetailsModal'),
            editUserModal: document.getElementById('editUserModal')
        };
    }

    setupEventListeners() {
        // Statistics timeframe
        this.elements.statsTimeframe?.addEventListener('change', () => {
            this.loadUserStatistics();
        });

        // Search functionality
        this.elements.desktopSearchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        this.elements.mobileSearchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        this.elements.searchClear?.addEventListener('click', () => {
            this.clearSearch();
        });

        // Filters
        this.elements.filterStatus?.addEventListener('change', () => {
            this.handleFilterChange();
        });

        this.elements.filterRole?.addEventListener('change', () => {
            this.handleFilterChange();
        });

        this.elements.filterRegistration?.addEventListener('change', () => {
            this.handleFilterChange();
        });

        this.elements.clearFilters?.addEventListener('click', () => {
            this.clearAllFilters();
        });

        this.elements.refreshUsers?.addEventListener('click', () => {
            this.refreshAllData();
            this.hapticFeedback('light');
        });

        // Table controls
        this.elements.selectAllUsers?.addEventListener('change', (e) => {
            this.handleSelectAll(e.target.checked);
        });

        this.elements.usersPerPage?.addEventListener('change', () => {
            this.handlePerPageChange();
        });

        // Bulk actions
        this.elements.deselectAll?.addEventListener('click', () => {
            this.clearSelection();
        });

        this.elements.bulkSuspend?.addEventListener('click', () => {
            this.handleBulkAction('suspend');
        });

        this.elements.bulkActivate?.addEventListener('click', () => {
            this.handleBulkAction('activate');
        });

        this.elements.bulkDelete?.addEventListener('click', () => {
            this.handleBulkAction('delete');
        });

        // Actions
        this.elements.addUser?.addEventListener('click', () => {
            this.showAddUserModal();
        });

        this.elements.exportUsers?.addEventListener('click', () => {
            this.exportUsersData();
        });

        // Chart period
        this.elements.activityChartPeriod?.addEventListener('change', () => {
            this.updateChartsForPeriod();
        });

        // Window events
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshAllData();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshAllData();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.showAddUserModal();
                        break;
                }
            }
        });

        // Theme changes
        window.addEventListener('theme-changed', () => {
            if (this.chartManager) {
                this.chartManager.updateChartsTheme();
            }
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

    // ==================== DATA LOADING METHODS - Updated for Backend v4.0 ====================

    async loadAllUsersData() {
        this.showLoading(true);

        try {
            const promises = [
                this.loadUsers(),
                this.loadUserStatistics(),
                this.loadUserAnalytics()
            ];

            const results = await Promise.allSettled(promises);

            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Data loading failed for promise ${index}:`, result.reason);
                }
            });

            this.updateLastRefreshTime();

        } catch (error) {
            console.error('Error loading users data:', error);
            this.showError('Failed to load users data');
        } finally {
            this.showLoading(false);
        }
    }

    async loadUsers() {
        try {
            const params = new URLSearchParams({
                page: this.usersData.pagination.page,
                per_page: this.usersData.pagination.per_page,
                sort_by: this.usersData.sorting.sort_by,
                sort_direction: this.usersData.sorting.sort_direction,
                ...this.usersData.filters
            });

            // Remove empty filters
            Object.keys(this.usersData.filters).forEach(key => {
                if (!this.usersData.filters[key]) {
                    params.delete(key);
                }
            });

            const response = await this.makeAuthenticatedRequest(`/admin/users?${params}`);

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const data = result.data;
                    this.usersData.users = data.users || [];
                    this.usersData.pagination = {
                        page: data.page || 1,
                        per_page: data.per_page || 25,
                        total: data.total || 0,
                        total_pages: data.total_pages || 0,
                        has_prev: data.has_prev || false,
                        has_next: data.has_next || false
                    };

                    if (this.tableManager) {
                        this.tableManager.renderUsers();
                        this.tableManager.renderPagination();
                    }

                    this.updateTableCount();
                } else {
                    throw new Error(result.error || 'Invalid users data structure');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Users request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError(error.message || 'Failed to load users');
        }
    }

    async loadUserStatistics() {
        try {
            const timeframe = this.elements.statsTimeframe?.value || 'week';
            const response = await this.makeAuthenticatedRequest(`/admin/users/statistics?timeframe=${timeframe}`);

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.usersData.statistics = result.data;
                    this.renderUserStatsCards();
                } else {
                    throw new Error(result.error || 'Invalid statistics data structure');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Statistics request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading user statistics:', error);
            this.showError(error.message || 'Failed to load user statistics');
        }
    }

    async loadUserAnalytics() {
        try {
            const period = this.elements.activityChartPeriod?.value || '30d';
            const response = await this.makeAuthenticatedRequest(`/admin/users/analytics?period=${period}`);

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.usersData.analytics = result.data;
                    if (this.chartManager) {
                        this.chartManager.updateCharts(result.data);
                    }
                    this.renderEngagementMetrics(result.data.engagement || {});
                } else {
                    throw new Error(result.error || 'Invalid analytics data structure');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Analytics request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading user analytics:', error);
            this.showError(error.message || 'Failed to load user analytics');
        }
    }

    // ==================== RENDERING METHODS ====================

    renderUserStatsCards() {
        if (!this.usersData.statistics) return;

        const stats = this.usersData.statistics;
        const cards = [
            {
                title: 'Total Users',
                value: this.formatNumber(stats.total_users || 0),
                change: this.calculatePercentageChange(stats.total_users, stats.total_users_previous),
                icon: 'users',
                color: '#113CCF'
            },
            {
                title: 'Active Users',
                value: this.formatNumber(stats.active_users || 0),
                change: this.calculatePercentageChange(stats.active_users, stats.active_users_previous),
                icon: 'activity',
                color: '#10b981'
            },
            {
                title: 'New Users',
                value: this.formatNumber(stats.new_users || 0),
                change: this.calculatePercentageChange(stats.new_users, stats.new_users_previous),
                icon: 'user-plus',
                color: '#e50914'
            },
            {
                title: 'Admin Users',
                value: this.formatNumber(stats.admin_users || 0),
                change: this.calculatePercentageChange(stats.admin_users, stats.admin_users_previous),
                icon: 'shield',
                color: '#f59e0b'
            },
            {
                title: 'Suspended',
                value: this.formatNumber(stats.suspended_users || 0),
                change: this.calculatePercentageChange(stats.suspended_users, stats.suspended_users_previous),
                icon: 'pause-circle',
                color: '#ef4444'
            },
            {
                title: 'Engagement Rate',
                value: `${(stats.engagement_rate || 0).toFixed(1)}%`,
                change: this.calculatePercentageChange(stats.engagement_rate, stats.engagement_rate_previous),
                icon: 'trending-up',
                color: '#8b5cf6'
            }
        ];

        // Render desktop cards
        if (this.elements.userStatsCards && !this.isMobile) {
            this.elements.userStatsCards.innerHTML = cards.map(card => `
                <div class="col-lg-2 col-md-4 col-6">
                    <div class="users-stats-card fade-in" style="--card-color: ${card.color}">
                        <div class="stats-card-header">
                            <div class="stats-card-title">
                                <i data-feather="${card.icon}" class="stats-card-icon"></i>
                                ${card.title}
                            </div>
                        </div>
                        <div class="stats-card-value">${card.value}</div>
                        <div class="stats-card-change ${this.getChangeClass(card.change)}">
                            <i data-feather="${this.getChangeIcon(card.change)}" class="change-icon"></i>
                            ${card.change}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Render mobile cards
        if (this.elements.mobileUserStatsCards && this.isMobile) {
            this.elements.mobileUserStatsCards.innerHTML = cards.map(card => `
                <div class="mobile-stats-card" style="--card-color: ${card.color}">
                    <div class="mobile-stats-value">${card.value}</div>
                    <div class="mobile-stats-label">${card.title}</div>
                </div>
            `).join('');
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderEngagementMetrics(engagement) {
        if (!this.elements.engagementMetrics) return;

        const metrics = [
            {
                label: 'Daily Active Users',
                value: this.formatNumber(engagement.daily_active || 0),
                progress: Math.min((engagement.daily_active / engagement.total_users || 0) * 100, 100),
                icon: 'calendar'
            },
            {
                label: 'Weekly Active Users',
                value: this.formatNumber(engagement.weekly_active || 0),
                progress: Math.min((engagement.weekly_active / engagement.total_users || 0) * 100, 100),
                icon: 'clock'
            },
            {
                label: 'Monthly Active Users',
                value: this.formatNumber(engagement.monthly_active || 0),
                progress: Math.min((engagement.monthly_active / engagement.total_users || 0) * 100, 100),
                icon: 'trending-up'
            },
            {
                label: 'Avg. Session Time',
                value: this.formatDuration(engagement.avg_session_time || 0),
                progress: Math.min((engagement.avg_session_time / 3600 || 0) * 100, 100), // Max 1 hour
                icon: 'play-circle'
            }
        ];

        this.elements.engagementMetrics.innerHTML = metrics.map(metric => `
            <div class="engagement-metric">
                <div class="engagement-metric-info">
                    <div class="engagement-metric-label">${metric.label}</div>
                    <div class="engagement-metric-value">${metric.value}</div>
                    <div class="engagement-progress">
                        <div class="engagement-progress-bar" style="width: ${metric.progress}%"></div>
                    </div>
                </div>
                <div class="engagement-metric-icon">
                    <i data-feather="${metric.icon}"></i>
                </div>
            </div>
        `).join('');

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    updateTableCount() {
        if (this.elements.userTableCount) {
            const { total, page, per_page } = this.usersData.pagination;
            const start = (page - 1) * per_page + 1;
            const end = Math.min(page * per_page, total);
            
            this.elements.userTableCount.textContent = 
                `Showing ${start}-${end} of ${total} users`;
        }
    }

    // ==================== FILTER AND SEARCH METHODS ====================

    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        this.searchTimeout = setTimeout(() => {
            this.usersData.filters.search = query;
            this.usersData.pagination.page = 1; // Reset to first page
            this.loadUsers();
        }, 300);

        // Show/hide clear button
        if (this.elements.searchClear) {
            this.elements.searchClear.style.display = query ? 'block' : 'none';
        }
    }

    clearSearch() {
        this.elements.desktopSearchInput.value = '';
        this.elements.mobileSearchInput.value = '';
        this.elements.searchClear.style.display = 'none';
        this.usersData.filters.search = '';
        this.usersData.pagination.page = 1;
        this.loadUsers();
    }

    focusSearch() {
        if (this.isMobile) {
            this.elements.mobileSearchInput?.focus();
        } else {
            this.elements.desktopSearchInput?.focus();
        }
    }

    handleFilterChange() {
        this.usersData.filters = {
            status: this.elements.filterStatus?.value || '',
            role: this.elements.filterRole?.value || '',
            registration: this.elements.filterRegistration?.value || '',
            search: this.usersData.filters.search
        };
        
        this.usersData.pagination.page = 1; // Reset to first page
        this.loadUsers();
    }

    clearAllFilters() {
        this.elements.filterStatus.value = '';
        this.elements.filterRole.value = '';
        this.elements.filterRegistration.value = '';
        
        this.usersData.filters = {
            status: '',
            role: '',
            registration: '',
            search: this.usersData.filters.search // Keep search
        };
        
        this.usersData.pagination.page = 1;
        this.loadUsers();
    }

    handlePerPageChange() {
        this.usersData.pagination.per_page = parseInt(this.elements.usersPerPage.value);
        this.usersData.pagination.page = 1; // Reset to first page
        this.loadUsers();
    }

    // ==================== SELECTION AND BULK OPERATIONS - Updated ====================

    handleSelectAll(checked) {
        this.selectedUsers.clear();
        
        if (checked) {
            this.usersData.users.forEach(user => {
                this.selectedUsers.add(user.id);
            });
        }
        
        this.updateSelectionUI();
        this.updateBulkActionsVisibility();
    }

    handleUserSelect(userId, checked) {
        if (checked) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
        }
        
        this.updateSelectionUI();
        this.updateBulkActionsVisibility();
    }

    updateSelectionUI() {
        // Update individual checkboxes
        document.querySelectorAll('.user-select-checkbox').forEach(checkbox => {
            const userId = parseInt(checkbox.dataset.userId);
            checkbox.checked = this.selectedUsers.has(userId);
        });

        // Update select all checkbox
        if (this.elements.selectAllUsers) {
            const totalVisible = this.usersData.users.length;
            const selectedVisible = this.usersData.users.filter(user => 
                this.selectedUsers.has(user.id)
            ).length;

            this.elements.selectAllUsers.checked = totalVisible > 0 && selectedVisible === totalVisible;
            this.elements.selectAllUsers.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible;
        }
    }

    updateBulkActionsVisibility() {
        const hasSelection = this.selectedUsers.size > 0;
        
        if (this.elements.bulkActionsBar) {
            this.elements.bulkActionsBar.style.display = hasSelection ? 'block' : 'none';
        }
        
        if (this.elements.selectedCount) {
            this.elements.selectedCount.textContent = this.selectedUsers.size;
        }
    }

    clearSelection() {
        this.selectedUsers.clear();
        this.updateSelectionUI();
        this.updateBulkActionsVisibility();
    }

    async handleBulkAction(action) {
        if (this.selectedUsers.size === 0) return;

        const userIds = Array.from(this.selectedUsers);
        const confirmMessage = this.getBulkActionConfirmMessage(action, userIds.length);

        if (!confirm(confirmMessage)) return;

        try {
            this.showLoading(true);

            const response = await this.makeAuthenticatedRequest('/admin/users/bulk', {
                method: 'POST',
                body: JSON.stringify({
                    action: action,
                    user_ids: userIds
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const results = result.results || {};
                    const successCount = results.success_count || 0;
                    const failedCount = results.failed_count || 0;
                    
                    if (successCount > 0) {
                        this.showSuccess(`${action.charAt(0).toUpperCase() + action.slice(1)} operation completed: ${successCount} successful${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
                    } else {
                        this.showError(`All ${action} operations failed`);
                    }
                    
                    this.clearSelection();
                    await this.loadUsers();
                    await this.loadUserStatistics(); // Refresh stats after bulk operation
                } else {
                    throw new Error(result.error || 'Bulk operation failed');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Bulk operation failed: ${response.status}`);
            }
        } catch (error) {
            console.error(`Bulk ${action} error:`, error);
            this.showError(error.message || `Failed to ${action} selected users`);
        } finally {
            this.showLoading(false);
        }
    }

    getBulkActionConfirmMessage(action, count) {
        const messages = {
            suspend: `Are you sure you want to suspend ${count} user(s)? This will prevent them from accessing the platform.`,
            activate: `Are you sure you want to activate ${count} user(s)? This will restore their platform access.`,
            delete: `Are you sure you want to delete ${count} user(s)? This action cannot be undone and will anonymize their data.`
        };
        return messages[action] || `Are you sure you want to ${action} ${count} user(s)?`;
    }

    // ==================== MODAL OPERATIONS ====================

    showAddUserModal() {
        if (this.modalManager) {
            this.modalManager.showAddUserModal();
        }
    }

    // ==================== EXPORT FUNCTIONALITY - Updated ====================

    async exportUsersData() {
        try {
            this.showLoading(true);

            const params = new URLSearchParams({
                format: 'csv',
                ...this.usersData.filters
            });

            // Remove empty filters
            Object.keys(this.usersData.filters).forEach(key => {
                if (!this.usersData.filters[key]) {
                    params.delete(key);
                }
            });

            const response = await this.makeAuthenticatedRequest(`/admin/users/export?${params}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `cinebrain-users-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccess('Users data exported successfully');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Export failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError(error.message || 'Failed to export users data');
        } finally {
            this.showLoading(false);
        }
    }

    // ==================== REAL-TIME UPDATES ====================

    startRealTimeUpdates() {
        this.refreshTimer = setInterval(() => {
            if (!this.isRefreshing && !document.hidden) {
                this.refreshAllData();
            }
        }, this.refreshInterval);

        console.log(`✅ Users real-time updates started (${this.refreshInterval / 1000}s interval)`);
    }

    stopRealTimeUpdates() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('⏹ Users real-time updates stopped');
        }
    }

    async refreshAllData() {
        if (this.isRefreshing) return;

        this.isRefreshing = true;

        try {
            await this.loadAllUsersData();
        } catch (error) {
            console.error('Refresh error:', error);
            this.showError('Failed to refresh users data');
        } finally {
            this.isRefreshing = false;
        }
    }

    updateChartsForPeriod() {
        this.loadUserAnalytics();
    }

    // ==================== PAGINATION METHODS - Updated ====================

    goToPage(page) {
        if (page >= 1 && page <= this.usersData.pagination.total_pages) {
            this.usersData.pagination.page = page;
            this.loadUsers();
        }
    }

    // ==================== UTILITY METHODS - Updated ====================

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

    formatNumber(num) {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(this.isMobile ? 0 : 1)}K`;
        }
        return num.toString();
    }

    formatDuration(seconds) {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    }

    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
        return date.toLocaleDateString();
    }

    calculatePercentageChange(current, previous) {
        if (!previous || previous === 0) return '+0%';
        const change = ((current - previous) / previous * 100);
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(1)}%`;
    }

    getChangeClass(change) {
        if (change.includes('+') && !change.includes('+0')) return 'change-positive';
        if (change.includes('-')) return 'change-negative';
        return 'change-neutral';
    }

    getChangeIcon(change) {
        if (change.includes('+') && !change.includes('+0')) return 'trending-up';
        if (change.includes('-')) return 'trending-down';
        return 'minus';
    }

    updateLastRefreshTime() {
        const now = new Date();
        const timeString = this.isMobile ?
            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
            now.toLocaleTimeString();
        
        // Update any last refresh indicators if they exist
        document.querySelectorAll('.last-refresh').forEach(element => {
            element.textContent = `Last updated: ${timeString}`;
        });
    }

    showLoading(show) {
        const indicator = document.getElementById('page-loading-indicator');
        if (indicator) {
            indicator.style.transform = show ? 'scaleX(1)' : 'scaleX(0)';
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
    }

    destroy() {
        this.stopRealTimeUpdates();

        if (this.tableManager) {
            this.tableManager.destroy();
        }

        if (this.chartManager) {
            this.chartManager.destroy();
        }

        if (this.modalManager) {
            this.modalManager.destroy();
        }

        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleResize);

        console.log('🗑 Users management v4.0 destroyed');
    }
}

// ==================== USERS TABLE MANAGER - Updated ====================

class UsersTableManager {
    constructor(usersManager) {
        this.usersManager = usersManager;
        this.sortableColumns = ['username', 'email', 'role', 'status', 'created_at'];
    }

    async init() {
        this.setupTableEventListeners();
        console.log('✅ Users table manager initialized');
    }

    setupTableEventListeners() {
        // Sortable column headers
        document.querySelectorAll('.users-table th.sortable').forEach(header => {
            header.addEventListener('click', () => {
                this.handleSort(header.dataset.sort);
            });
        });
    }

    handleSort(field) {
        if (this.usersManager.usersData.sorting.sort_by === field) {
            // Toggle direction
            this.usersManager.usersData.sorting.sort_direction = 
                this.usersManager.usersData.sorting.sort_direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New field
            this.usersManager.usersData.sorting.sort_by = field;
            this.usersManager.usersData.sorting.sort_direction = 'asc';
        }

        this.updateSortHeaders();
        this.usersManager.loadUsers();
    }

    updateSortHeaders() {
        document.querySelectorAll('.users-table th.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            
            if (header.dataset.sort === this.usersManager.usersData.sorting.sort_by) {
                header.classList.add(`sort-${this.usersManager.usersData.sorting.sort_direction}`);
            }
        });
    }

    renderUsers() {
        const tbody = this.usersManager.elements.usersTableBody;
        if (!tbody) return;

        if (!this.usersManager.usersData.users.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-empty-state">
                        <i data-feather="users"></i>
                        <p>No users found</p>
                    </td>
                </tr>
            `;
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        tbody.innerHTML = this.usersManager.usersData.users.map(user => `
            <tr class="slide-up">
                <td class="select-column">
                    <input type="checkbox" class="user-select-checkbox" 
                           data-user-id="${user.id}"
                           onchange="usersManager.handleUserSelect(${user.id}, this.checked)">
                </td>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${user.avatar_url ? 
                                `<img src="${user.avatar_url}" alt="${user.username}">` :
                                `<i data-feather="user" class="user-avatar-placeholder"></i>`
                            }
                        </div>
                        <div class="user-details">
                            <div class="user-name">${this.escapeHtml(user.full_name || user.username)}</div>
                            <div class="user-username">@${this.escapeHtml(user.username)}</div>
                        </div>
                    </div>
                </td>
                <td class="d-none d-md-table-cell">
                    <div class="user-email">${this.escapeHtml(user.email)}</div>
                </td>
                <td class="d-none d-lg-table-cell">
                    <span class="role-badge role-badge-${user.is_admin ? 'admin' : 'user'}">
                        ${user.is_admin ? 'Admin' : 'User'}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-badge-${this.getUserStatusClass(user)}">
                        <span class="status-indicator ${this.getUserStatusClass(user)}"></span>
                        ${this.getUserStatusText(user)}
                    </span>
                </td>
                <td class="d-none d-sm-table-cell">
                    <div class="user-join-date">
                        ${this.usersManager.formatTimeAgo(user.created_at)}
                    </div>
                </td>
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="action-btn action-view" 
                                onclick="usersManager.modalManager.showUserDetails(${user.id})"
                                title="View details">
                            <i data-feather="eye"></i>
                        </button>
                        <button class="action-btn action-edit" 
                                onclick="usersManager.modalManager.showEditUser(${user.id})"
                                title="Edit user">
                            <i data-feather="edit"></i>
                        </button>
                        <button class="action-btn action-suspend" 
                                onclick="usersManager.toggleUserStatus(${user.id})"
                                title="${this.getUserStatusAction(user)}">
                            <i data-feather="${this.getUserStatusIcon(user)}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Update selection UI
        this.usersManager.updateSelectionUI();
    }

    renderPagination() {
        const pagination = this.usersManager.elements.usersPagination;
        const paginationInfo = this.usersManager.elements.paginationInfo;
        
        if (!pagination) return;

        const { page, total_pages, total, per_page } = this.usersManager.usersData.pagination;

        // Update pagination info
        if (paginationInfo) {
            const start = (page - 1) * per_page + 1;
            const end = Math.min(page * per_page, total);
            paginationInfo.textContent = `Showing ${start}-${end} of ${total} users`;
        }

        if (total_pages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = '';

        // Previous button
        paginationHtml += `
            <li class="page-item ${page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="usersManager.goToPage(${page - 1})" aria-label="Previous">
                    <i data-feather="chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(total_pages, page + 2);

        if (startPage > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="usersManager.goToPage(1)">1</a>
                </li>
            `;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="usersManager.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        if (endPage < total_pages) {
            if (endPage < total_pages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="usersManager.goToPage(${total_pages})">${total_pages}</a>
                </li>
            `;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${page === total_pages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="usersManager.goToPage(${page + 1})" aria-label="Next">
                    <i data-feather="chevron-right"></i>
                </a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    getUserStatusClass(user) {
        if (user.is_suspended) return 'suspended';
        if (user.is_banned) return 'banned';
        if (user.is_active) return 'active';
        return 'inactive';
    }

    getUserStatusText(user) {
        if (user.is_suspended) return 'Suspended';
        if (user.is_banned) return 'Banned';
        if (user.is_active) return 'Active';
        return 'Inactive';
    }

    getUserStatusAction(user) {
        if (user.is_suspended || user.is_banned) return 'Activate user';
        return 'Suspend user';
    }

    getUserStatusIcon(user) {
        if (user.is_suspended || user.is_banned) return 'play-circle';
        return 'pause-circle';
    }

    handleDeviceChange() {
        this.renderUsers();
        this.renderPagination();
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    destroy() {
        console.log('🗑 Users table manager destroyed');
    }
}

// ==================== USERS CHART MANAGER - Updated ====================

class UsersChartManager {
    constructor(usersManager) {
        this.usersManager = usersManager;
        this.charts = {};
        this.chartData = {
            userActivity: [],
            userGrowth: []
        };
    }

    async init() {
        this.initializeCharts();
        console.log('✅ Users chart manager initialized');
    }

    getThemeColors() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';

        if (theme === 'light') {
            return {
                textPrimary: '#1a1a1a',
                textSecondary: '#4a4a4a',
                textMuted: '#666666',
                cardBorder: 'rgba(0, 0, 0, 0.1)',
                tooltipBg: 'rgba(255, 255, 255, 0.95)',
                tooltipBorder: 'rgba(0, 0, 0, 0.1)'
            };
        } else {
            return {
                textPrimary: '#ffffff',
                textSecondary: '#b3b3b3',
                textMuted: '#888888',
                cardBorder: 'rgba(255, 255, 255, 0.1)',
                tooltipBg: 'rgba(0, 0, 0, 0.9)',
                tooltipBorder: 'rgba(255, 255, 255, 0.2)'
            };
        }
    }

    getBaseChartOptions() {
        const colors = this.getThemeColors();
        const isMobile = this.usersManager.isMobile;

        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: colors.textPrimary,
                        usePointStyle: true,
                        font: {
                            size: isMobile ? 11 : 12,
                            family: "'Inter', sans-serif"
                        },
                        padding: isMobile ? 10 : 15,
                        boxWidth: isMobile ? 6 : 8,
                        boxHeight: isMobile ? 6 : 8
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.textPrimary,
                    bodyColor: colors.textPrimary,
                    borderColor: colors.tooltipBorder,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    displayColors: true,
                    titleFont: {
                        size: 12,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 11
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: colors.textMuted,
                        font: {
                            size: isMobile ? 10 : 11,
                            family: "'Inter', sans-serif"
                        },
                        maxRotation: isMobile ? 45 : 0,
                        autoSkip: true,
                        maxTicksLimit: isMobile ? 6 : 12
                    },
                    grid: {
                        color: colors.cardBorder,
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: colors.textMuted,
                        font: {
                            size: isMobile ? 10 : 11,
                            family: "'Inter', sans-serif"
                        },
                        callback: function(value) {
                            if (Number.isInteger(value)) {
                                return value.toLocaleString();
                            }
                        }
                    },
                    grid: {
                        color: colors.cardBorder,
                        drawBorder: false
                    },
                    beginAtZero: true
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    radius: isMobile ? 3 : 4,
                    hoverRadius: isMobile ? 5 : 6,
                    hitRadius: isMobile ? 10 : 15
                },
                line: {
                    borderJoinStyle: 'round'
                }
            }
        };
    }

    initializeCharts() {
        this.initializeUserActivityChart();
    }

    initializeUserActivityChart() {
        const ctx = this.usersManager.elements.userActivityChart?.getContext('2d');
        if (!ctx) return;

        const gradientActive = ctx.createLinearGradient(0, 0, 0, 400);
        gradientActive.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        gradientActive.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

        const gradientNew = ctx.createLinearGradient(0, 0, 0, 400);
        gradientNew.addColorStop(0, 'rgba(17, 60, 207, 0.4)');
        gradientNew.addColorStop(1, 'rgba(17, 60, 207, 0.01)');

        this.charts.userActivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Active Users',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: gradientActive,
                    tension: 0.4,
                    fill: true,
                    borderWidth: this.usersManager.isMobile ? 2 : 3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }, {
                    label: 'New Users',
                    data: [],
                    borderColor: '#113CCF',
                    backgroundColor: gradientNew,
                    tension: 0.4,
                    fill: true,
                    borderWidth: this.usersManager.isMobile ? 2 : 3,
                    pointBackgroundColor: '#113CCF',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                ...this.getBaseChartOptions(),
                plugins: {
                    ...this.getBaseChartOptions().plugins,
                    title: {
                        display: !this.usersManager.isMobile,
                        text: 'User Activity Trends',
                        color: this.getThemeColors().textPrimary,
                        font: {
                            size: 14,
                            weight: '600',
                            family: "'Inter', sans-serif"
                        },
                        padding: { bottom: 10 }
                    }
                }
            }
        });
    }

    updateCharts(analyticsData) {
        if (analyticsData.user_activity) {
            this.updateUserActivityChart(analyticsData.user_activity);
        }
    }

    updateUserActivityChart(activityData) {
        if (!this.charts.userActivity || !activityData) return;

        const period = this.usersManager.elements.activityChartPeriod?.value || '30d';
        const maxLabels = period === '7d' ? 7 : period === '30d' ? 
            (this.usersManager.isMobile ? 15 : 30) : 
            (this.usersManager.isMobile ? 30 : 90);

        const recentData = activityData.slice(-maxLabels);

        this.charts.userActivity.data.labels = recentData.map(item => {
            const date = new Date(item.date);
            return this.usersManager.isMobile ?
                date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) :
                date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        this.charts.userActivity.data.datasets[0].data = recentData.map(item => item.active_users);
        this.charts.userActivity.data.datasets[1].data = recentData.map(item => item.new_users);

        this.charts.userActivity.update('active');
    }

    updateChartsTheme() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.options) {
                const colors = this.getThemeColors();

                // Update legend colors
                if (chart.options.plugins?.legend?.labels) {
                    chart.options.plugins.legend.labels.color = colors.textPrimary;
                }

                // Update title colors
                if (chart.options.plugins?.title) {
                    chart.options.plugins.title.color = colors.textPrimary;
                }

                // Update tooltip colors
                if (chart.options.plugins?.tooltip) {
                    chart.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
                    chart.options.plugins.tooltip.titleColor = colors.textPrimary;
                    chart.options.plugins.tooltip.bodyColor = colors.textPrimary;
                    chart.options.plugins.tooltip.borderColor = colors.tooltipBorder;
                }

                // Update scales colors
                if (chart.options.scales) {
                    Object.keys(chart.options.scales).forEach(scaleKey => {
                        if (chart.options.scales[scaleKey].ticks) {
                            chart.options.scales[scaleKey].ticks.color = colors.textMuted;
                        }
                        if (chart.options.scales[scaleKey].grid) {
                            chart.options.scales[scaleKey].grid.color = colors.cardBorder;
                        }
                    });
                }

                chart.update('active');
            }
        });
    }

    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
        console.log('🗑 Users chart manager destroyed');
    }
}

// ==================== USERS MODAL MANAGER - Updated ====================

class UsersModalManager {
    constructor(usersManager) {
        this.usersManager = usersManager;
        this.currentUser = null;
    }

    async init() {
        this.setupModalEventListeners();
        console.log('✅ Users modal manager initialized');
    }

    setupModalEventListeners() {
        // Edit user button in details modal
        document.getElementById('editUserBtn')?.addEventListener('click', () => {
            if (this.currentUser) {
                this.showEditUser(this.currentUser.id);
            }
        });

        // Edit user form submission
        document.getElementById('editUserForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditUserSubmit();
        });
    }

    async showUserDetails(userId) {
        try {
            this.usersManager.showLoading(true);

            const response = await this.usersManager.makeAuthenticatedRequest(`/admin/users/${userId}`);

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.currentUser = result.data;
                    this.renderUserDetails(result.data);
                    
                    const modal = new bootstrap.Modal(this.usersManager.elements.userDetailsModal);
                    modal.show();
                } else {
                    throw new Error(result.error || 'Invalid user data structure');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to load user details: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            this.usersManager.showError(error.message || 'Failed to load user details');
        } finally {
            this.usersManager.showLoading(false);
        }
    }

    renderUserDetails(user) {
        const modalBody = document.getElementById('userDetailsModalBody');
        if (!modalBody) return;

        const formatDate = (dateString) => {
            return new Date(dateString).toLocaleString();
        };

        modalBody.innerHTML = `
            <div class="user-modal-header">
                <div class="user-modal-avatar">
                    ${user.avatar_url ? 
                        `<img src="${user.avatar_url}" alt="${user.username}">` :
                        `<i data-feather="user"></i>`
                    }
                </div>
                <div class="user-modal-info">
                    <h4>${this.escapeHtml(user.full_name || user.username)}</h4>
                    <p>@${this.escapeHtml(user.username)} • ${user.email}</p>
                </div>
            </div>
            
            <div class="user-details-grid">
                <div class="user-detail-item">
                    <div class="user-detail-label">User ID</div>
                    <div class="user-detail-value">${user.id}</div>
                </div>
                
                <div class="user-detail-item">
                    <div class="user-detail-label">Role</div>
                    <div class="user-detail-value">
                        <span class="role-badge role-badge-${user.is_admin ? 'admin' : 'user'}">
                            ${user.is_admin ? 'Admin' : 'User'}
                        </span>
                    </div>
                </div>
                
                <div class="user-detail-item">
                    <div class="user-detail-label">Status</div>
                    <div class="user-detail-value">
                        <span class="status-badge status-badge-${this.getUserStatusClass(user)}">
                            <span class="status-indicator ${this.getUserStatusClass(user)}"></span>
                            ${this.getUserStatusText(user)}
                        </span>
                    </div>
                </div>
                
                <div class="user-detail-item">
                    <div class="user-detail-label">Join Date</div>
                    <div class="user-detail-value">${formatDate(user.created_at)}</div>
                </div>
                
                <div class="user-detail-item">
                    <div class="user-detail-label">Last Active</div>
                    <div class="user-detail-value">${user.last_active ? formatDate(user.last_active) : 'Never'}</div>
                </div>
                
                <div class="user-detail-item">
                    <div class="user-detail-label">Location</div>
                    <div class="user-detail-value">${user.location || 'Not specified'}</div>
                </div>
                
                ${user.preferred_languages && user.preferred_languages.length ? `
                <div class="user-detail-item">
                    <div class="user-detail-label">Preferred Languages</div>
                    <div class="user-detail-value">${user.preferred_languages.join(', ')}</div>
                </div>
                ` : ''}
                
                ${user.preferred_genres && user.preferred_genres.length ? `
                <div class="user-detail-item">
                    <div class="user-detail-label">Preferred Genres</div>
                    <div class="user-detail-value">${user.preferred_genres.join(', ')}</div>
                </div>
                ` : ''}
                
                <div class="user-detail-item">
                    <div class="user-detail-label">Total Interactions</div>
                    <div class="user-detail-value">${user.interaction_count || 0}</div>
                </div>
                
                <div class="user-detail-item">
                    <div class="user-detail-label">Content Rated</div>
                    <div class="user-detail-value">${user.ratings_count || 0}</div>
                </div>
                
                <div class="user-detail-item">
                    <div class="user-detail-label">Favorites</div>
                    <div class="user-detail-value">${user.favorites_count || 0}</div>
                </div>
                
                <div class="user-detail-item">
                    <div class="user-detail-label">Watchlist Items</div>
                    <div class="user-detail-value">${user.watchlist_count || 0}</div>
                </div>

                ${user.reviews_count !== undefined ? `
                <div class="user-detail-item">
                    <div class="user-detail-label">Reviews Written</div>
                    <div class="user-detail-value">${user.reviews_count || 0}</div>
                </div>
                ` : ''}
            </div>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    showEditUser(userId) {
        // Close details modal first
        const detailsModal = bootstrap.Modal.getInstance(this.usersManager.elements.userDetailsModal);
        if (detailsModal) {
            detailsModal.hide();
        }

        // Load user for editing
        this.loadUserForEdit(userId);
    }

    async loadUserForEdit(userId) {
        try {
            this.usersManager.showLoading(true);

            const response = await this.usersManager.makeAuthenticatedRequest(`/admin/users/${userId}`);

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.renderEditUserForm(result.data);
                    
                    const modal = new bootstrap.Modal(this.usersManager.elements.editUserModal);
                    modal.show();
                } else {
                    throw new Error(result.error || 'Invalid user data structure');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to load user for editing: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading user for edit:', error);
            this.usersManager.showError(error.message || 'Failed to load user for editing');
        } finally {
            this.usersManager.showLoading(false);
        }
    }

    renderEditUserForm(user) {
        const modalBody = this.usersManager.elements.editUserModal?.querySelector('.modal-body');
        if (!modalBody) return;

        modalBody.innerHTML = `
            <input type="hidden" id="editUserId" value="${user.id}">
            
            <div class="form-group">
                <label for="editUsername" class="form-label">Username</label>
                <input type="text" class="form-control" id="editUsername" value="${this.escapeHtml(user.username)}" required>
            </div>
            
            <div class="form-group">
                <label for="editEmail" class="form-label">Email</label>
                <input type="email" class="form-control" id="editEmail" value="${this.escapeHtml(user.email)}" required>
            </div>
            
            <div class="form-group">
                <label for="editFullName" class="form-label">Full Name</label>
                <input type="text" class="form-control" id="editFullName" value="${this.escapeHtml(user.full_name || '')}">
            </div>
            
            <div class="form-group">
                <label for="editRole" class="form-label">Role</label>
                <select class="form-select" id="editRole">
                    <option value="user" ${!user.is_admin ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.is_admin ? 'selected' : ''}>Admin</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="editStatus" class="form-label">Status</label>
                <select class="form-select" id="editStatus">
                    <option value="active" ${!user.is_suspended && !user.is_banned ? 'selected' : ''}>Active</option>
                    <option value="suspended" ${user.is_suspended ? 'selected' : ''}>Suspended</option>
                    <option value="banned" ${user.is_banned ? 'selected' : ''}>Banned</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="editLocation" class="form-label">Location</label>
                <input type="text" class="form-control" id="editLocation" value="${this.escapeHtml(user.location || '')}">
            </div>
        `;
    }

    async handleEditUserSubmit() {
        try {
            const userId = document.getElementById('editUserId').value;
            const formData = {
                username: document.getElementById('editUsername').value,
                email: document.getElementById('editEmail').value,
                full_name: document.getElementById('editFullName').value,
                is_admin: document.getElementById('editRole').value === 'admin',
                status: document.getElementById('editStatus').value,
                location: document.getElementById('editLocation').value
            };

            this.usersManager.showLoading(true);

            const response = await this.usersManager.makeAuthenticatedRequest(`/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const changes = result.changes || [];
                    this.usersManager.showSuccess(`User updated successfully${changes.length ? ': ' + changes.join(', ') : ''}`);
                    
                    const modal = bootstrap.Modal.getInstance(this.usersManager.elements.editUserModal);
                    modal.hide();
                    
                    // Refresh users list and statistics
                    await this.usersManager.loadUsers();
                    await this.usersManager.loadUserStatistics();
                } else {
                    throw new Error(result.error || 'Failed to update user');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Update failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error updating user:', error);
            this.usersManager.showError(error.message || 'Failed to update user');
        } finally {
            this.usersManager.showLoading(false);
        }
    }

    showAddUserModal() {
        // Implement add user functionality
        this.usersManager.showError('Add user functionality will be implemented soon');
    }

    getUserStatusClass(user) {
        if (user.is_suspended) return 'suspended';
        if (user.is_banned) return 'banned';
        if (user.is_active) return 'active';
        return 'inactive';
    }

    getUserStatusText(user) {
        if (user.is_suspended) return 'Suspended';
        if (user.is_banned) return 'Banned';
        if (user.is_active) return 'Active';
        return 'Inactive';
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    destroy() {
        console.log('🗑 Users modal manager destroyed');
    }
}

// ==================== GLOBAL FUNCTIONS FOR HTML ONCLICK - Updated ====================

// Global navigation function for pagination
window.goToPage = function(page) {
    if (window.usersManager) {
        window.usersManager.goToPage(page);
    }
};

// Global user status toggle function - Updated
window.toggleUserStatus = async function(userId) {
    if (window.usersManager) {
        try {
            const user = window.usersManager.usersData.users.find(u => u.id === userId);
            if (!user) return;

            const action = (user.is_suspended || user.is_banned) ? 'activate' : 'suspend';
            const confirmMessage = `Are you sure you want to ${action} this user?`;

            if (!confirm(confirmMessage)) return;

            window.usersManager.showLoading(true);

            const response = await window.usersManager.makeAuthenticatedRequest(`/admin/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ action: action })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    window.usersManager.showSuccess(result.message || `User ${action}d successfully`);
                    await window.usersManager.loadUsers();
                    await window.usersManager.loadUserStatistics(); // Refresh stats after status change
                } else {
                    throw new Error(result.error || `Failed to ${action} user`);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Status update failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error updating user status:', error);
            window.usersManager.showError(error.message || 'Failed to update user status');
        } finally {
            window.usersManager.showLoading(false);
        }
    }
};

// ==================== INITIALIZATION ====================

let usersManager;

document.addEventListener('DOMContentLoaded', () => {
    usersManager = new UsersManager();
    window.usersManager = usersManager; // Make it globally available
});

window.addEventListener('beforeunload', () => {
    if (usersManager) {
        usersManager.destroy();
    }
});

// Export classes for module systems
window.UsersManager = UsersManager;
window.UsersTableManager = UsersTableManager;
window.UsersChartManager = UsersChartManager;
window.UsersModalManager = UsersModalManager;