class CineBrainUsersCore {
    constructor() {
        // Core configuration
        this.apiBase = window.CineBrainConfig.apiBase;
        this.refreshInterval = 10000; // 10 seconds
        this.refreshTimer = null;
        this.isRefreshing = false;
        this.currentUser = null;

        // Device detection
        this.isMobile = window.innerWidth <= 768;
        this.touchDevice = 'ontouchstart' in window;

        // Core data structure - Centralized state management
        this.state = {
            users: {
                list: [],
                total: 0,
                loading: false,
                error: null
            },
            statistics: {
                data: null,
                loading: false,
                error: null,
                lastUpdated: null
            },
            analytics: {
                data: null,
                loading: false,
                error: null,
                period: '30d'
            },
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
            },
            selection: {
                selectedUsers: new Set(),
                selectAll: false
            }
        };

        // Component references - Will be set by child modules
        this.components = {
            charts: null,    // UsersChartsManager
            tables: null,    // UsersTableManager  
            modals: null     // UsersModalsManager
        };

        // Request cache for optimization
        this.requestCache = new Map();
        this.cacheTimeout = 30000; // 30 seconds

        // Initialize charts component first
        this.initChartsComponent();

        this.init();
    }

    initChartsComponent() {
        // Initialize charts component early to avoid initialization errors
        if (typeof CineBrainUsersChartsManager !== 'undefined') {
            try {
                const chartsManager = new CineBrainUsersChartsManager(this);
                chartsManager.init().then(() => {
                    console.log('✅ Charts component pre-initialized');
                }).catch(error => {
                    console.warn('⚠️ Charts pre-initialization failed:', error);
                });
            } catch (error) {
                console.warn('⚠️ Could not pre-initialize charts:', error);
            }
        }
    }

    async init() {
        try {
            console.log('🚀 Initializing CineBrain Users Management Core v4.0...');

            // Check admin authentication first
            if (!await this.checkAdminAuth()) {
                this.redirectToLogin();
                return;
            }

            // Initialize DOM elements and events
            this.initializeElements();
            this.setupCoreEventListeners();
            this.handleResize();

            // Load initial data
            await this.loadInitialData();

            // Start real-time updates
            this.startRealTimeUpdates();

            // Setup mobile optimizations
            if (this.touchDevice) {
                this.setupTouchGestures();
            }

            console.log('✅ CineBrain Users Core initialized successfully');

        } catch (error) {
            console.error('❌ Core initialization error:', error);
            this.handleError('Failed to initialize users management', error);
        }
    }

    // ==================== AUTHENTICATION ====================

    async checkAdminAuth() {
        try {
            const token = this.getStoredToken();
            const userStr = localStorage.getItem('cinebrain-user');

            if (!token || !userStr) {
                console.warn('⚠️ No authentication credentials found');
                return false;
            }

            const user = JSON.parse(userStr);
            if (!user.is_admin) {
                console.warn('⚠️ User is not an admin');
                return false;
            }

            // Validate token with server
            const isValid = await this.validateToken(token);
            if (!isValid) {
                console.warn('⚠️ Token validation failed');
                this.clearAuthData();
                return false;
            }

            this.currentUser = user;
            console.log('✅ Admin authentication validated');
            return true;

        } catch (error) {
            console.error('❌ Auth check error:', error);
            this.clearAuthData();
            return false;
        }
    }

    async validateToken(token) {
        try {
            // Make a light API call to validate token
            const response = await this.makeRequest('/admin/services/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    getStoredToken() {
        return localStorage.getItem('cinebrain-token');
    }

    clearAuthData() {
        localStorage.removeItem('cinebrain-token');
        localStorage.removeItem('cinebrain-user');
    }

    redirectToLogin() {
        window.location.href = '/auth/login.html';
    }

    // ==================== DOM INITIALIZATION ====================

    initializeElements() {
        this.elements = {
            // Statistics & Analytics
            userStatsCards: document.getElementById('userStatsCards'),
            mobileUserStatsCards: document.getElementById('mobileUserStatsCards'),
            statsTimeframe: document.getElementById('statsTimeframe'),
            engagementMetrics: document.getElementById('engagementMetrics'),

            // Search & Filters
            desktopSearchInput: document.getElementById('desktopSearchInput'),
            mobileSearchInput: document.getElementById('mobileSearchInput'),
            searchClear: document.getElementById('searchClear'),
            filterStatus: document.getElementById('filterStatus'),
            filterRole: document.getElementById('filterRole'),
            filterRegistration: document.getElementById('filterRegistration'),
            clearFilters: document.getElementById('clearFilters'),

            // Controls
            refreshUsers: document.getElementById('refreshUsers'),
            usersPerPage: document.getElementById('usersPerPage'),

            // Loading & Notifications
            pageLoadingIndicator: document.getElementById('page-loading-indicator'),

            // Export & Actions
            exportUsers: document.getElementById('exportUsers'),
            addUser: document.getElementById('addUser')
        };
    }

    setupCoreEventListeners() {
        // Statistics timeframe change
        this.elements.statsTimeframe?.addEventListener('change', () => {
            this.loadUserStatistics();
        });

        // Search functionality with debouncing
        const searchHandler = this.debounce((value) => {
            this.handleSearch(value);
        }, 300);

        this.elements.desktopSearchInput?.addEventListener('input', (e) => {
            searchHandler(e.target.value);
            this.updateSearchClearButton(e.target.value);
        });

        this.elements.mobileSearchInput?.addEventListener('input', (e) => {
            searchHandler(e.target.value);
            this.updateSearchClearButton(e.target.value);
        });

        this.elements.searchClear?.addEventListener('click', () => {
            this.clearSearch();
        });

        // Filter changes
        ['filterStatus', 'filterRole', 'filterRegistration'].forEach(filterId => {
            this.elements[filterId]?.addEventListener('change', () => {
                this.handleFilterChange();
            });
        });

        this.elements.clearFilters?.addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Actions
        this.elements.refreshUsers?.addEventListener('click', () => {
            this.refreshAllData();
            this.hapticFeedback('light');
        });

        this.elements.exportUsers?.addEventListener('click', () => {
            this.exportUsersData();
        });

        this.elements.addUser?.addEventListener('click', () => {
            this.showAddUserModal();
        });

        this.elements.usersPerPage?.addEventListener('change', () => {
            this.handlePerPageChange();
        });

        // Global keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Theme change detection
        window.addEventListener('theme-changed', () => {
            this.handleThemeChange();
        });

        // Visibility API for smart refresh
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshAllData();
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshAllData();
                        this.showToast('Data refreshed', 'info');
                        break;
                    case 'f':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.showAddUserModal();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportUsersData();
                        break;
                }
            }

            // Escape key to clear selection
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }

    handleResize() {
        const resizeHandler = this.debounce(() => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;

            if (wasMobile !== this.isMobile) {
                this.handleDeviceChange();
            }
        }, 100);

        window.addEventListener('resize', resizeHandler);
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleDeviceChange(), 100);
        });
    }

    handleDeviceChange() {
        // Notify all components of device change
        Object.values(this.components).forEach(component => {
            if (component && typeof component.handleDeviceChange === 'function') {
                component.handleDeviceChange();
            }
        });

        this.renderUserStatsCards();
    }

    handleThemeChange() {
        // Notify chart component of theme change
        if (this.components.charts && typeof this.components.charts.updateChartsTheme === 'function') {
            this.components.charts.updateChartsTheme();
        }
    }

    // ==================== DATA MANAGEMENT ====================

    async loadInitialData() {
        this.showLoading(true, 'Loading users data...');

        try {
            // Load all data in parallel for faster initial load
            const promises = [
                this.loadUsers(),
                this.loadUserStatistics(),
                this.loadUserAnalytics()
            ];

            const results = await Promise.allSettled(promises);

            // Handle any failures
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const operations = ['users', 'statistics', 'analytics'];
                    console.error(`❌ Failed to load ${operations[index]}:`, result.reason);
                }
            });

            this.updateLastRefreshTime();

        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.handleError('Failed to load users data', error);
        } finally {
            this.showLoading(false);
        }
    }

    async loadUsers() {
        if (this.state.users.loading) return;

        this.state.users.loading = true;
        this.state.users.error = null;

        try {
            const cacheKey = this.buildCacheKey('users', {
                ...this.state.filters,
                ...this.state.pagination,
                ...this.state.sorting
            });

            // Check cache first
            const cachedData = this.getFromCache(cacheKey);
            if (cachedData) {
                this.updateUsersState(cachedData);
                return;
            }

            const params = this.buildQueryParams({
                page: this.state.pagination.page,
                per_page: this.state.pagination.per_page,
                sort_by: this.state.sorting.sort_by,
                sort_direction: this.state.sorting.sort_direction,
                ...this.state.filters
            });

            const response = await this.makeAuthenticatedRequest(`/admin/users?${params}`);

            // FIXED: Parse response body even on error to get error message
            const responseData = await response.json();

            if (!response.ok) {
                const errorMessage = responseData.error || responseData.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            // FIXED: Handle both success responses and direct data responses
            const data = responseData.data || responseData;

            // Check if we have the expected structure
            if (!data.users && responseData.success === false) {
                throw new Error(responseData.error || 'Invalid response structure');
            }

            this.updateUsersState(data);

            // Cache the result
            this.setCache(cacheKey, data);

            // Notify table component
            if (this.components.tables) {
                this.components.tables.renderUsers(this.state.users.list);
                this.components.tables.renderPagination(this.state.pagination);
            }

            console.log('✅ Users loaded successfully:', data.users?.length || 0);

        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.state.users.error = error.message;

            // Show specific error message
            const errorMsg = error.message || 'Failed to load users';
            this.handleError(`Failed to load users: ${errorMsg}`, error);

            // Render error state in table
            if (this.components.tables) {
                this.components.tables.renderErrorState();
            }
        } finally {
            this.state.users.loading = false;
        }
    }

    async loadUserStatistics() {
        if (this.state.statistics.loading) return;

        this.state.statistics.loading = true;
        this.state.statistics.error = null;

        try {
            const timeframe = this.elements.statsTimeframe?.value || 'week';
            const cacheKey = this.buildCacheKey('statistics', { timeframe });

            // Check cache first
            const cachedData = this.getFromCache(cacheKey);
            if (cachedData) {
                this.state.statistics.data = cachedData;
                this.renderUserStatsCards();
                return;
            }

            const response = await this.makeAuthenticatedRequest(`/admin/users/statistics?timeframe=${timeframe}`);

            // FIXED: Parse response body even on error
            const responseData = await response.json();

            if (!response.ok) {
                const errorMessage = responseData.error || responseData.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            // FIXED: Handle both success responses and direct data responses
            const data = responseData.data || responseData;

            if (!data && responseData.success === false) {
                throw new Error(responseData.error || 'Invalid statistics data');
            }

            this.state.statistics.data = data;
            this.state.statistics.lastUpdated = new Date();

            // Cache the result
            this.setCache(cacheKey, data);

            this.renderUserStatsCards();
            console.log('✅ Statistics loaded successfully');

        } catch (error) {
            console.error('❌ Error loading statistics:', error);
            this.state.statistics.error = error.message;

            // Show specific error message
            const errorMsg = error.message || 'Failed to load statistics';
            this.handleError(`Failed to load statistics: ${errorMsg}`, error);

            // Render placeholder stats
            this.renderEmptyStatsCards();
        } finally {
            this.state.statistics.loading = false;
        }
    }

    async loadUserAnalytics() {
        if (this.state.analytics.loading) return;

        this.state.analytics.loading = true;
        this.state.analytics.error = null;

        try {
            const period = this.state.analytics.period;
            const cacheKey = this.buildCacheKey('analytics', { period });

            // Check cache first
            const cachedData = this.getFromCache(cacheKey);
            if (cachedData) {
                this.state.analytics.data = cachedData;
                this.updateChartsAndMetrics(cachedData);
                return;
            }

            const response = await this.makeAuthenticatedRequest(`/admin/users/analytics?period=${period}`);

            // FIXED: Parse response body
            const responseData = await response.json();

            if (!response.ok) {
                const errorMessage = responseData.error || responseData.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            // FIXED: Handle both success responses and direct data responses
            const data = responseData.data || responseData;

            if (!data && responseData.success === false) {
                throw new Error(responseData.error || 'Invalid analytics data');
            }

            this.state.analytics.data = data;

            // Cache the result
            this.setCache(cacheKey, data);

            this.updateChartsAndMetrics(data);
            console.log('✅ Analytics loaded successfully');

        } catch (error) {
            console.error('❌ Error loading analytics:', error);
            this.state.analytics.error = error.message;

            // Analytics failures are less critical, just log them
            console.warn('⚠️ Analytics unavailable:', error.message);
        } finally {
            this.state.analytics.loading = false;
        }
    }

    updateUsersState(data) {
        this.state.users.list = data.users || [];
        this.state.users.total = data.total || 0;
        this.state.users.error = null;

        this.state.pagination = {
            page: data.page || 1,
            per_page: data.per_page || 25,
            total: data.total || 0,
            total_pages: data.total_pages || 0,
            has_prev: data.has_prev || false,
            has_next: data.has_next || false
        };
    }

    updateChartsAndMetrics(analyticsData) {
        // Notify charts component
        if (this.components.charts) {
            this.components.charts.updateCharts(analyticsData);
        }

        // Update engagement metrics
        this.renderEngagementMetrics(analyticsData.engagement || {});
    }

    // ==================== FILTERING & SEARCH ====================

    handleSearch(query) {
        this.state.filters.search = query;
        this.state.pagination.page = 1; // Reset to first page
        this.invalidateCache('users');
        this.loadUsers();
    }

    clearSearch() {
        this.elements.desktopSearchInput.value = '';
        this.elements.mobileSearchInput.value = '';
        this.updateSearchClearButton('');
        this.state.filters.search = '';
        this.state.pagination.page = 1;
        this.invalidateCache('users');
        this.loadUsers();
    }

    focusSearch() {
        const input = this.isMobile ?
            this.elements.mobileSearchInput :
            this.elements.desktopSearchInput;
        input?.focus();
    }

    updateSearchClearButton(value) {
        if (this.elements.searchClear) {
            this.elements.searchClear.style.display = value ? 'block' : 'none';
        }
    }

    handleFilterChange() {
        this.state.filters = {
            status: this.elements.filterStatus?.value || '',
            role: this.elements.filterRole?.value || '',
            registration: this.elements.filterRegistration?.value || '',
            search: this.state.filters.search // Preserve search
        };

        this.state.pagination.page = 1; // Reset to first page
        this.invalidateCache('users');
        this.loadUsers();
    }

    clearAllFilters() {
        // Clear filter elements
        ['filterStatus', 'filterRole', 'filterRegistration'].forEach(filterId => {
            if (this.elements[filterId]) {
                this.elements[filterId].value = '';
            }
        });

        // Clear filter state (preserve search)
        this.state.filters = {
            status: '',
            role: '',
            registration: '',
            search: this.state.filters.search
        };

        this.state.pagination.page = 1;
        this.invalidateCache('users');
        this.loadUsers();
    }

    handlePerPageChange() {
        this.state.pagination.per_page = parseInt(this.elements.usersPerPage.value);
        this.state.pagination.page = 1; // Reset to first page
        this.invalidateCache('users');
        this.loadUsers();
    }

    // ==================== PAGINATION ====================

    goToPage(page) {
        if (page >= 1 && page <= this.state.pagination.total_pages) {
            this.state.pagination.page = page;
            this.invalidateCache('users');
            this.loadUsers();
        }
    }

    // ==================== SELECTION MANAGEMENT ====================

    handleSelectAll(checked) {
        this.state.selection.selectedUsers.clear();

        if (checked) {
            this.state.users.list.forEach(user => {
                this.state.selection.selectedUsers.add(user.id);
            });
        }

        this.state.selection.selectAll = checked;
        this.notifySelectionChange();
    }

    handleUserSelect(userId, checked) {
        if (checked) {
            this.state.selection.selectedUsers.add(userId);
        } else {
            this.state.selection.selectedUsers.delete(userId);
        }

        this.updateSelectAllState();
        this.notifySelectionChange();
    }

    updateSelectAllState() {
        const totalVisible = this.state.users.list.length;
        const selectedVisible = this.state.users.list.filter(user =>
            this.state.selection.selectedUsers.has(user.id)
        ).length;

        this.state.selection.selectAll = totalVisible > 0 && selectedVisible === totalVisible;
    }

    clearSelection() {
        this.state.selection.selectedUsers.clear();
        this.state.selection.selectAll = false;
        this.notifySelectionChange();
    }

    getSelectedUsers() {
        return Array.from(this.state.selection.selectedUsers);
    }

    notifySelectionChange() {
        // Notify table component of selection changes
        if (this.components.tables) {
            this.components.tables.updateSelectionUI(this.state.selection);
        }
    }

    // ==================== EXPORT FUNCTIONALITY ====================

    async exportUsersData() {
        try {
            this.showLoading(true, 'Preparing export...');

            const params = this.buildQueryParams({
                format: 'csv',
                ...this.state.filters
            });

            const response = await this.makeAuthenticatedRequest(`/admin/users/export?${params}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Export failed: ${response.status}`);
            }

            const blob = await response.blob();
            this.downloadFile(blob, `cinebrain-users-${new Date().toISOString().split('T')[0]}.csv`);

            this.showToast('Users data exported successfully', 'success');

        } catch (error) {
            console.error('❌ Export error:', error);
            this.handleError('Failed to export users data', error);
        } finally {
            this.showLoading(false);
        }
    }

    downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // ==================== REAL-TIME UPDATES ====================

    startRealTimeUpdates() {
        this.refreshTimer = setInterval(() => {
            if (!this.isRefreshing && !document.hidden) {
                this.refreshData();
            }
        }, this.refreshInterval);

        console.log(`✅ Real-time updates started (${this.refreshInterval / 1000}s interval)`);
    }

    stopRealTimeUpdates() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('⏹ Real-time updates stopped');
        }
    }

    async refreshAllData() {
        if (this.isRefreshing) return;

        this.isRefreshing = true;

        try {
            // Clear cache for fresh data
            this.clearCache();

            await this.loadInitialData();

            this.showToast('Data refreshed', 'success');

        } catch (error) {
            console.error('❌ Refresh error:', error);
            this.handleError('Failed to refresh data', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    async refreshData() {
        // Silent refresh without loading indicators
        try {
            await Promise.all([
                this.loadUsers(),
                this.loadUserStatistics()
            ]);
            this.updateLastRefreshTime();
        } catch (error) {
            console.error('❌ Silent refresh error:', error);
        }
    }

    // ==================== MOBILE TOUCH GESTURES ====================

    setupTouchGestures() {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = false;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && startY) {
                currentY = e.touches[0].pageY;
                const pullDistance = currentY - startY;

                if (pullDistance > 50 && !this.isRefreshing) {
                    isPulling = true;
                    this.showPullToRefreshIndicator(pullDistance);
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (window.scrollY === 0 && startY && currentY && isPulling) {
                const pullDistance = currentY - startY;

                if (pullDistance > 100 && !this.isRefreshing) {
                    this.refreshAllData();
                    this.hapticFeedback('medium');
                }
            }

            startY = 0;
            currentY = 0;
            isPulling = false;
            this.hidePullToRefreshIndicator();
        }, { passive: true });
    }

    showPullToRefreshIndicator(distance) {
        const threshold = 100;
        const progress = Math.min(distance / threshold, 1);

        let indicator = document.getElementById('pullToRefreshIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'pullToRefreshIndicator';
            indicator.innerHTML = '<i data-feather="refresh-cw"></i> Release to refresh';
            indicator.style.cssText = `
                position: fixed;
                top: calc(var(--topbar-height, 70px) + 10px);
                left: 50%;
                transform: translateX(-50%) scale(${progress});
                background: var(--admin-primary);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 8px;
                opacity: ${progress};
                transition: all 0.2s ease;
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

    // ==================== API UTILITIES ====================

    async makeRequest(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
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

        return await fetch(url, mergedOptions);
    }

    async makeAuthenticatedRequest(endpoint, options = {}) {
        const token = this.getStoredToken();

        if (!token) {
            throw new Error('No authentication token available');
        }

        const authenticatedOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        };

        const response = await this.makeRequest(endpoint, authenticatedOptions);

        // Handle authentication errors
        if (response.status === 401) {
            console.warn('⚠️ Authentication failed, redirecting to login');
            this.clearAuthData();
            this.redirectToLogin();
            throw new Error('Authentication failed');
        }

        return response;
    }

    // ==================== CACHE MANAGEMENT ====================

    buildCacheKey(type, params = {}) {
        const paramString = Object.keys(params)
            .sort()
            .map(key => `${key}:${params[key]}`)
            .join('|');
        return `${type}-${paramString}`;
    }

    getFromCache(key) {
        const cached = this.requestCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.requestCache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.requestCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    invalidateCache(type) {
        const keysToDelete = [];
        for (const key of this.requestCache.keys()) {
            if (key.startsWith(type)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.requestCache.delete(key));
    }

    clearCache() {
        this.requestCache.clear();
    }

    // ==================== UI RENDERING ====================

    renderUserStatsCards() {
        if (!this.state.statistics.data) return;

        const stats = this.state.statistics.data;
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

        this.renderDesktopStatsCards(cards);
        this.renderMobileStatsCards(cards);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderEmptyStatsCards() {
        const emptyCards = [
            { title: 'Total Users', value: '—', change: '+0%', icon: 'users', color: '#113CCF' },
            { title: 'Active Users', value: '—', change: '+0%', icon: 'activity', color: '#10b981' },
            { title: 'New Users', value: '—', change: '+0%', icon: 'user-plus', color: '#e50914' },
            { title: 'Admin Users', value: '—', change: '+0%', icon: 'shield', color: '#f59e0b' },
            { title: 'Suspended', value: '—', change: '+0%', icon: 'pause-circle', color: '#ef4444' },
            { title: 'Engagement Rate', value: '—', change: '+0%', icon: 'trending-up', color: '#8b5cf6' }
        ];

        this.renderDesktopStatsCards(emptyCards);
        this.renderMobileStatsCards(emptyCards);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderDesktopStatsCards(cards) {
        if (!this.elements.userStatsCards || this.isMobile) return;

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

    renderMobileStatsCards(cards) {
        if (!this.elements.mobileUserStatsCards || !this.isMobile) return;

        this.elements.mobileUserStatsCards.innerHTML = cards.map(card => `
            <div class="mobile-stats-card" style="--card-color: ${card.color}">
                <div class="mobile-stats-value">${card.value}</div>
                <div class="mobile-stats-label">${card.title}</div>
            </div>
        `).join('');
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
                progress: Math.min((engagement.avg_session_time / 3600 || 0) * 100, 100),
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

    // ==================== UTILITY FUNCTIONS ====================

    buildQueryParams(params) {
        const searchParams = new URLSearchParams();

        Object.keys(params).forEach(key => {
            const value = params[key];
            if (value !== null && value !== undefined && value !== '') {
                searchParams.append(key, value);
            }
        });

        return searchParams.toString();
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

        document.querySelectorAll('.last-refresh').forEach(element => {
            element.textContent = `Last updated: ${timeString}`;
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
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

    showLoading(show, message = 'Loading...') {
        const indicator = this.elements.pageLoadingIndicator;
        if (indicator) {
            indicator.style.transform = show ? 'scaleX(1)' : 'scaleX(0)';
            if (show && message) {
                indicator.setAttribute('data-message', message);
            }
        }
    }

    showAddUserModal() {
        // Delegate to modal manager
        if (this.components.modals && typeof this.components.modals.showAddUserModal === 'function') {
            this.components.modals.showAddUserModal();
        } else {
            this.showToast('Add user functionality will be available soon', 'info');
        }
    }

    handleError(message, error = null) {
        console.error('❌', message, error);
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

    // ==================== COMPONENT REGISTRATION ====================

    registerComponent(type, component) {
        this.components[type] = component;
        console.log(`✅ ${type} component registered`);
    }

    // ==================== CLEANUP ====================

    destroy() {
        console.log('🗑 Destroying CineBrain Users Core...');

        this.stopRealTimeUpdates();
        this.clearCache();

        // Destroy all components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });

        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleResize);

        console.log('🗑 CineBrain Users Core destroyed');
    }
}

// ==================== GLOBAL FUNCTIONS ====================

// Global navigation for HTML onclick handlers
window.goToPage = function (page) {
    if (window.cineBrainUsersCore) {
        window.cineBrainUsersCore.goToPage(page);
    }
};

// ==================== INITIALIZATION ====================

let cineBrainUsersCore;

document.addEventListener('DOMContentLoaded', () => {
    cineBrainUsersCore = new CineBrainUsersCore();
    window.cineBrainUsersCore = cineBrainUsersCore; // Make globally available
});

window.addEventListener('beforeunload', () => {
    if (cineBrainUsersCore) {
        cineBrainUsersCore.destroy();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainUsersCore;
} else {
    window.CineBrainUsersCore = CineBrainUsersCore;
}