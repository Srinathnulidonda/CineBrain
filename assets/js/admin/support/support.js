class SupportDashboard {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.refreshInterval = 30000; // 30 seconds for live updates
        this.refreshTimer = null;
        this.isRefreshing = false;
        this.currentUser = null;
        this.isMobile = window.innerWidth <= 768;

        // Support data structure matching backend
        this.supportData = {
            health: null,
            stats: null,
            dashboard: null,
            tickets: [],
            contacts: [],
            issues: [],
            categories: [],
            recentActivity: []
        };

        // Filter and pagination state
        this.currentFilters = {
            type: '',
            status: '',
            priority: '',
            dateRange: '',
            search: '',
            quickFilter: 'all'
        };

        this.pagination = {
            page: 1,
            per_page: 25,  // Match backend default
            total: 0,
            pages: 0,
            has_next: false,
            has_prev: false
        };

        this.selectedItems = new Set();
        this.charts = {};
        this.lastRefreshTime = null;

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

            // Initialize elements and setup
            this.initializeElements();
            this.setupEventListeners();
            this.setupCharts();

            // Load initial data
            await this.loadSupportCategories(); // Load categories first
            await this.loadAllSupportData();

            // Start real-time updates
            this.startRealTimeUpdates();

            console.log('✅ CineBrain Support Dashboard v3.0 initialized (Backend-integrated)');

        } catch (error) {
            console.error('❌ Support dashboard initialization error:', error);
            this.showError('Failed to initialize support dashboard');
        }
    }

    handleResize() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;

            if (wasMobile !== this.isMobile) {
                this.reinitializeForDevice();
            }

            // Resize charts
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
        // Re-render table for current device
        this.renderSupportTable();

        // Update filter layout
        this.updateFiltersForDevice();
    }

    async checkAdminAuth() {
        try {
            const token = localStorage.getItem('cinebrain-token');
            const userStr = localStorage.getItem('cinebrain-user');

            if (!token || !userStr) return false;

            const user = JSON.parse(userStr);
            if (!user.is_admin) return false;

            this.currentUser = user;

            // Verify with backend health check
            const response = await this.makeAuthenticatedRequest('/support/health');
            if (response.ok) {
                const data = await response.json();
                this.supportData.health = data;
                return true;
            }

            return false;

        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    initializeElements() {
        this.elements = {
            // Overview cards
            totalTicketsValue: document.getElementById('totalTicketsValue'),
            totalTicketsBadge: document.getElementById('totalTicketsBadge'),
            totalTicketsChange: document.getElementById('totalTicketsChange'),
            urgentTicketsValue: document.getElementById('urgentTicketsValue'),
            urgentTicketsBadge: document.getElementById('urgentTicketsBadge'),
            urgentTicketsChange: document.getElementById('urgentTicketsChange'),
            unreadContactsValue: document.getElementById('unreadContactsValue'),
            unreadContactsBadge: document.getElementById('unreadContactsBadge'),
            unreadContactsChange: document.getElementById('unreadContactsChange'),
            openIssuesValue: document.getElementById('openIssuesValue'),
            openIssuesBadge: document.getElementById('openIssuesBadge'),
            openIssuesChange: document.getElementById('openIssuesChange'),

            // Status indicators
            supportSystemStatus: document.getElementById('supportSystemStatus'),
            avgResponseTime: document.getElementById('avgResponseTime'),
            slaCompliance: document.getElementById('slaCompliance'),

            // Filters
            typeFilter: document.getElementById('typeFilter'),
            statusFilter: document.getElementById('statusFilter'),
            priorityFilter: document.getElementById('priorityFilter'),
            dateRangeFilter: document.getElementById('dateRangeFilter'),
            supportSearch: document.getElementById('supportSearch'),
            quickFilters: document.getElementById('quickFilters'),

            // Filter counts
            urgentFilterCount: document.getElementById('urgentFilterCount'),
            slaBreachFilterCount: document.getElementById('slaBreachFilterCount'),
            businessFilterCount: document.getElementById('businessFilterCount'),
            unassignedFilterCount: document.getElementById('unassignedFilterCount'),

            // Table elements
            supportTableContainer: document.getElementById('supportTableContainer'),
            supportTableLoading: document.getElementById('supportTableLoading'),
            supportTablePagination: document.getElementById('supportTablePagination'),
            activeItemsCount: document.getElementById('activeItemsCount'),
            viewToggle: document.getElementById('viewToggle'),

            // Charts
            supportTrendsChart: document.getElementById('supportTrendsChart'),
            responseTimeChart: document.getElementById('responseTimeChart'),
            responseTimeIndicator: document.getElementById('responseTimeIndicator'),
            trendsTimeframe: document.getElementById('trendsTimeframe'),

            // Team performance
            teamPerformanceContent: document.getElementById('teamPerformanceContent'),

            // Action buttons
            refreshSupportDashboard: document.getElementById('refreshSupportDashboard'),
            createNewTicket: document.getElementById('createNewTicket'),
            clearAllFilters: document.getElementById('clearAllFilters'),
            exportSupportData: document.getElementById('exportSupportData'),
            searchSupportBtn: document.getElementById('searchSupportBtn'),
            bulkActions: document.getElementById('bulkActions'),
            viewTeamDetails: document.getElementById('viewTeamDetails'),

            // Modals
            bulkActionsModal: document.getElementById('bulkActionsModal'),
            createTicketModal: document.getElementById('createTicketModal'),
            selectedItemsCount: document.getElementById('selectedItemsCount')
        };
    }

    setupEventListeners() {
        // Refresh button
        this.elements.refreshSupportDashboard?.addEventListener('click', () => {
            this.refreshAllData();
            this.hapticFeedback('light');
        });

        // Create new ticket
        this.elements.createNewTicket?.addEventListener('click', () => {
            this.showCreateTicketModal();
        });

        // Filter listeners
        this.elements.typeFilter?.addEventListener('change', (e) => {
            this.currentFilters.type = e.target.value;
            this.applyFilters();
        });

        this.elements.statusFilter?.addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.applyFilters();
        });

        this.elements.priorityFilter?.addEventListener('change', (e) => {
            this.currentFilters.priority = e.target.value;
            this.applyFilters();
        });

        this.elements.dateRangeFilter?.addEventListener('change', (e) => {
            this.currentFilters.dateRange = e.target.value;
            this.applyFilters();
        });

        // Search functionality
        this.elements.supportSearch?.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            }, 500);
        });

        this.elements.searchSupportBtn?.addEventListener('click', () => {
            this.currentFilters.search = this.elements.supportSearch.value;
            this.applyFilters();
        });

        // Quick filters
        this.elements.quickFilters?.addEventListener('click', (e) => {
            if (e.target.closest('.filter-tag')) {
                this.handleQuickFilter(e.target.closest('.filter-tag'));
            }
        });

        // View toggle
        this.elements.viewToggle?.addEventListener('click', (e) => {
            if (e.target.closest('.view-btn')) {
                this.handleViewToggle(e.target.closest('.view-btn'));
            }
        });

        // Clear filters
        this.elements.clearAllFilters?.addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Export data
        this.elements.exportSupportData?.addEventListener('click', () => {
            this.exportSupportData();
        });

        // Bulk actions
        this.elements.bulkActions?.addEventListener('click', () => {
            this.showBulkActionsModal();
        });

        // Team details
        this.elements.viewTeamDetails?.addEventListener('click', () => {
            window.location.href = '/admin/team.html';
        });

        // Chart timeframe
        this.elements.trendsTimeframe?.addEventListener('change', (e) => {
            this.updateChartsTimeframe(e.target.value);
        });

        // Modal actions
        this.setupModalListeners();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window focus for refresh
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshAllData();
            }
        });

        // Touch gestures for mobile
        if (this.isMobile) {
            this.setupMobileGestures();
        }
    }

    setupModalListeners() {
        // Bulk actions modal
        document.getElementById('bulkMarkResolved')?.addEventListener('click', () => {
            this.bulkMarkResolved();
        });

        document.getElementById('bulkAssign')?.addEventListener('click', () => {
            this.bulkAssign();
        });

        document.getElementById('bulkUpdatePriority')?.addEventListener('click', () => {
            this.bulkUpdatePriority();
        });

        document.getElementById('bulkDelete')?.addEventListener('click', () => {
            this.bulkDelete();
        });

        // Create ticket modal
        document.getElementById('submitNewTicket')?.addEventListener('click', () => {
            this.submitNewTicket();
        });

        // Category dropdown in create ticket modal
        document.getElementById('ticketCategory')?.addEventListener('change', (e) => {
            this.updateTicketTypeOptions(e.target.value);
        });
    }

    setupMobileGestures() {
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
                background: var(--support-primary);
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
                heavy: 50,
                success: [10, 50, 10],
                error: [50, 10, 50]
            };
            navigator.vibrate(patterns[type] || patterns.light);
        }
    }

    // API Methods
    async makeAuthenticatedRequest(endpoint, options = {}) {
        const token = localStorage.getItem('cinebrain-token');
        if (!token) {
            throw new Error('No authentication token');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        return fetch(`${this.apiBase}${endpoint}`, finalOptions);
    }

    async loadAllSupportData() {
        this.showLoading(true);

        try {
            const promises = [
                this.loadSupportStats(),
                this.loadSupportDashboard(),
                this.loadSupportTickets(),
                this.loadSupportContacts(),
                this.loadSupportIssues()
            ];

            const results = await Promise.allSettled(promises);

            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Support data loading failed for promise ${index}:`, result.reason);
                }
            });

            // Render all components
            this.renderOverviewCards();
            this.renderSupportTable();
            this.updateFilterCounts();
            this.renderTeamPerformance();
            this.updateCharts();

            // Mark last refresh time
            this.lastRefreshTime = new Date();

            console.log('✅ Support data loaded successfully');

        } catch (error) {
            console.error('Error loading support data:', error);
            this.showError('Failed to load support data');
        } finally {
            this.showLoading(false);
        }
    }

    async loadSupportStats() {
        try {
            const response = await this.makeAuthenticatedRequest('/support/stats');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.supportData.stats = data.stats;
                }
            }
        } catch (error) {
            console.error('Error loading support stats:', error);
        }
    }

    async loadSupportDashboard() {
        try {
            const response = await this.makeAuthenticatedRequest('/support/dashboard');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.supportData.dashboard = data.dashboard;
                }
            }
        } catch (error) {
            console.error('Error loading support dashboard:', error);
        }
    }

    async loadSupportCategories() {
        try {
            const response = await this.makeAuthenticatedRequest('/support/categories');
            if (response.ok) {
                const data = await response.json();
                this.supportData.categories = data.categories || [];
                this.populateCategoryDropdowns();
            }
        } catch (error) {
            console.error('Error loading support categories:', error);
        }
    }

    async loadSupportTickets() {
        try {
            const params = new URLSearchParams({
                page: this.pagination.page,
                per_page: this.pagination.per_page,
                ...(this.currentFilters.status && { status: this.currentFilters.status }),
                ...(this.currentFilters.priority && { priority: this.currentFilters.priority }),
                ...(this.currentFilters.search && { search: this.currentFilters.search })
            });

            const response = await this.makeAuthenticatedRequest(`/support/tickets?${params}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.supportData.tickets = data.tickets;
                    this.updatePaginationFromResponse(data.pagination);
                }
            }
        } catch (error) {
            console.error('Error loading support tickets:', error);
        }
    }

    async loadSupportContacts() {
        try {
            const params = new URLSearchParams({
                page: 1,  // Always page 1 for overview
                per_page: 100,  // Get more for dashboard view
                unread_only: this.currentFilters.status === 'unread' ? 'true' : 'false',
                ...(this.currentFilters.search && { search: this.currentFilters.search })
            });

            const response = await this.makeAuthenticatedRequest(`/support/contact/messages?${params}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.supportData.contacts = data.messages;
                }
            }
        } catch (error) {
            console.error('Error loading support contacts:', error);
        }
    }

    async loadSupportIssues() {
        try {
            const params = new URLSearchParams({
                page: 1,  // Always page 1 for overview
                per_page: 100,  // Get more for dashboard view
                unresolved_only: this.currentFilters.status === 'open' ? 'true' : 'false',
                ...(this.currentFilters.search && { search: this.currentFilters.search })
            });

            const response = await this.makeAuthenticatedRequest(`/support/issues?${params}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.supportData.issues = data.issues;
                }
            }
        } catch (error) {
            console.error('Error loading support issues:', error);
        }
    }

    updatePaginationFromResponse(pagination) {
        if (pagination) {
            this.pagination = {
                ...this.pagination,
                ...pagination
            };
        }
    }

    populateCategoryDropdowns() {
        const ticketCategory = document.getElementById('ticketCategory');
        if (ticketCategory && this.supportData.categories) {
            ticketCategory.innerHTML = '<option value="">Select category...</option>';

            this.supportData.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.icon} ${category.name}`;
                ticketCategory.appendChild(option);
            });
        }
    }

    renderOverviewCards() {
        const stats = this.supportData.stats;
        const dashboard = this.supportData.dashboard;

        if (!stats) return;

        // Total tickets
        this.updateElement('totalTicketsValue', this.formatNumber(stats.tickets?.total || 0));
        this.updateElement('totalTicketsBadge', stats.tickets?.open || 0);
        this.updateElement('totalTicketsChange', `Today: ${stats.recent?.this_week || 0}`);

        // Urgent tickets
        this.updateElement('urgentTicketsValue', this.formatNumber(stats.priority?.urgent || 0));
        this.updateElement('urgentTicketsBadge', stats.priority?.urgent || 0);
        this.updateElement('urgentTicketsChange', 'SLA: 4h');

        // Unread contacts
        this.updateElement('unreadContactsValue', this.formatNumber(stats.contact?.unread || 0));
        this.updateElement('unreadContactsBadge', stats.contact?.unread || 0);

        // Count business contacts from dashboard data
        let businessCount = 0;
        if (dashboard?.unread_contacts) {
            businessCount = dashboard.unread_contacts.filter(c => c.is_business_inquiry).length;
        }
        this.updateElement('unreadContactsChange', `Business: ${businessCount}`);

        // Open issues
        this.updateElement('openIssuesValue', this.formatNumber(stats.issues?.unresolved || 0));
        this.updateElement('openIssuesBadge', stats.issues?.unresolved || 0);
        this.updateElement('openIssuesChange', `Critical: ${stats.issues?.critical || 0}`);

        // Update status indicators
        if (stats.recent?.overdue > 0) {
            this.updateElement('supportSystemStatus', 'status-dot pulse-red');
        }

        // Calculate average response time (mock for now)
        this.updateElement('avgResponseTime', this.calculateAvgResponseTime());

        // Calculate SLA compliance
        const slaCompliance = this.calculateSLACompliance();
        this.updateElement('slaCompliance', `${slaCompliance}%`);

        // Update system status based on SLA
        const statusDot = this.elements.supportSystemStatus;
        if (statusDot) {
            statusDot.className = slaCompliance >= 90 ? 'status-dot pulse-green' :
                slaCompliance >= 75 ? 'status-dot pulse-yellow' : 'status-dot pulse-red';
        }
    }

    calculateAvgResponseTime() {
        const dashboard = this.supportData.dashboard;
        if (!dashboard?.recent_tickets) return '--';

        const ticketsWithResponse = dashboard.recent_tickets.filter(t => t.first_response_at);
        if (ticketsWithResponse.length === 0) return '--';

        // Mock calculation - in real implementation, calculate from timestamps
        return '2.5h';
    }

    calculateSLACompliance() {
        const stats = this.supportData.stats;
        if (!stats) return 100;

        const total = stats.tickets?.total || 1;
        const overdue = stats.recent?.overdue || 0;

        return Math.round((1 - (overdue / total)) * 100);
    }

    renderSupportTable() {
        const container = this.elements.supportTableContainer;
        const loading = this.elements.supportTableLoading;

        if (!container) return;

        // Show loading state
        if (loading) loading.style.display = 'block';

        // Combine all support items from backend data
        const allItems = this.combineAllSupportItems();

        // Apply filters (client-side for dashboard view)
        const filteredItems = this.applyFiltersToItems(allItems);

        // Apply pagination (client-side for dashboard view)
        const paginatedItems = this.paginateItems(filteredItems);

        // Update count
        this.updateElement('activeItemsCount', filteredItems.length);

        // Generate table HTML
        const tableHtml = this.generateTableHtml(paginatedItems);

        container.innerHTML = tableHtml;

        // Hide loading state
        if (loading) loading.style.display = 'none';

        // Update pagination
        this.updatePagination(filteredItems.length);

        // Replace feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Setup table interactions
        this.setupTableInteractions();

        // Mark items as seen
        this.markNewItemsAsSeen(paginatedItems);
    }

    combineAllSupportItems() {
        const allItems = [];

        // Add tickets from backend
        if (this.supportData.tickets) {
            this.supportData.tickets.forEach(ticket => {
                allItems.push({
                    ...ticket,
                    type: 'ticket',
                    itemId: `ticket-${ticket.id}`,
                    displayNumber: ticket.ticket_number,
                    title: ticket.subject,
                    user: ticket.user_name,
                    email: ticket.user_email,
                    priority: ticket.priority,
                    status: ticket.status,
                    created_at: ticket.created_at,
                    is_business: false,
                    sla_breached: ticket.sla_breached || false,
                    assigned_to: ticket.assigned_to,
                    category: ticket.category,
                    url: `/admin/support/tickets/${ticket.id}`
                });
            });
        }

        // Add contacts from backend
        if (this.supportData.contacts) {
            this.supportData.contacts.forEach(contact => {
                allItems.push({
                    ...contact,
                    type: 'contact',
                    itemId: `contact-${contact.id}`,
                    displayNumber: `CB-CONTACT-${String(contact.id).padStart(6, '0')}`,
                    title: contact.subject,
                    user: contact.name,
                    email: contact.email,
                    priority: this.calculateContactPriority(contact),
                    status: contact.is_read ? 'read' : 'unread',
                    created_at: contact.created_at,
                    is_business: this.isBusinessInquiry(contact),
                    sla_breached: false,
                    company: contact.company,
                    url: `/admin/support/contacts/${contact.id}`
                });
            });
        }

        // Add issues from backend
        if (this.supportData.issues) {
            this.supportData.issues.forEach(issue => {
                allItems.push({
                    ...issue,
                    type: 'issue',
                    itemId: `issue-${issue.id}`,
                    displayNumber: issue.issue_id,
                    title: issue.issue_title,
                    user: issue.name,
                    email: issue.email,
                    priority: issue.severity,  // severity maps to priority
                    status: issue.is_resolved ? 'resolved' : 'open',
                    created_at: issue.created_at,
                    is_business: false,
                    sla_breached: false,
                    severity: issue.severity,
                    screenshots: issue.screenshots,
                    url: `/admin/support/issues/${issue.id}`
                });
            });
        }

        // Sort by creation date (newest first)
        allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return allItems;
    }

    calculateContactPriority(contact) {
        if (this.isBusinessInquiry(contact)) {
            return 'high';
        }
        return 'normal';
    }

    isBusinessInquiry(contact) {
        return !!(
            contact.company ||
            (contact.subject && contact.subject.toLowerCase().includes('partnership')) ||
            (contact.subject && contact.subject.toLowerCase().includes('business')) ||
            (contact.message && contact.message.toLowerCase().includes('collaborate'))
        );
    }

    applyFiltersToItems(items) {
        let filtered = [...items];

        // Type filter
        if (this.currentFilters.type) {
            const typeMap = {
                'tickets': 'ticket',
                'contacts': 'contact',
                'issues': 'issue'
            };
            const filterType = typeMap[this.currentFilters.type];
            if (filterType) {
                filtered = filtered.filter(item => item.type === filterType);
            }
        }

        // Status filter
        if (this.currentFilters.status) {
            filtered = filtered.filter(item => item.status === this.currentFilters.status);
        }

        // Priority filter
        if (this.currentFilters.priority) {
            filtered = filtered.filter(item => item.priority === this.currentFilters.priority);
        }

        // Search filter - already applied on backend, but apply locally too
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(item =>
                item.displayNumber.toLowerCase().includes(searchTerm) ||
                item.title.toLowerCase().includes(searchTerm) ||
                item.user.toLowerCase().includes(searchTerm) ||
                item.email.toLowerCase().includes(searchTerm)
            );
        }

        // Quick filter
        switch (this.currentFilters.quickFilter) {
            case 'urgent':
                filtered = filtered.filter(item =>
                    item.priority === 'urgent' || item.priority === 'critical'
                );
                break;
            case 'sla-breach':
                filtered = filtered.filter(item => item.sla_breached);
                break;
            case 'business':
                filtered = filtered.filter(item => item.is_business);
                break;
            case 'unassigned':
                filtered = filtered.filter(item => !item.assigned_to);
                break;
        }

        // Date range filter
        if (this.currentFilters.dateRange) {
            const now = new Date();
            let startDate = new Date();

            switch (this.currentFilters.dateRange) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'yesterday':
                    startDate.setDate(startDate.getDate() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
            }

            if (this.currentFilters.dateRange !== 'custom') {
                filtered = filtered.filter(item =>
                    new Date(item.created_at) >= startDate
                );
            }
        }

        return filtered;
    }

    paginateItems(items) {
        const startIndex = (this.pagination.page - 1) * this.pagination.per_page;
        const endIndex = startIndex + this.pagination.per_page;

        this.pagination.total = items.length;
        this.pagination.pages = Math.ceil(items.length / this.pagination.per_page);

        return items.slice(startIndex, endIndex);
    }

    generateTableHtml(items) {
        if (items.length === 0) {
            return `
                <div class="table-empty-state">
                    <i data-feather="inbox"></i>
                    <h4>No Support Items Found</h4>
                    <p>Try adjusting your filters or search terms.</p>
                </div>
            `;
        }

        let tableHtml = `
            <div class="table-responsive">
                <table class="support-table">
                    <thead>
                        <tr>
                            <th>
                                <input type="checkbox" id="selectAllItems" ${this.selectedItems.size === items.length && items.length > 0 ? 'checked' : ''}>
                            </th>
                            <th>Support Item</th>
                            <th class="d-none d-md-table-cell">User</th>
                            <th class="d-none d-lg-table-cell">Status</th>
                            <th class="d-none d-lg-table-cell">Priority</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        items.forEach(item => {
            const rowClasses = this.getRowClasses(item);
            const isSelected = this.selectedItems.has(item.itemId);

            tableHtml += `
                <tr class="${rowClasses}" data-item-id="${item.itemId}">
                    <td>
                        <input type="checkbox" class="item-checkbox" value="${item.itemId}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td>
                        <div class="support-item-cell">
                            <div class="support-item-header">
                                <span class="support-item-type ${item.type}">${this.getTypeLabel(item.type)}</span>
                                <a href="${item.url}" class="support-item-number" target="_blank">
                                    ${item.displayNumber}
                                </a>
                            </div>
                            <h6 class="support-item-title">${this.escapeHtml(this.truncateText(item.title, 60))}</h6>
                            <div class="support-item-details">
                                ${item.is_business ? '<span class="support-item-tag business">Business</span>' : ''}
                                ${item.sla_breached ? '<span class="support-item-tag sla-breach">SLA Breach</span>' : ''}
                                ${item.company ? `<span class="support-item-tag">${this.escapeHtml(item.company)}</span>` : ''}
                                ${item.category ? `<span class="support-item-tag">${item.category.icon} ${this.escapeHtml(item.category.name)}</span>` : ''}
                                ${item.screenshots && item.screenshots.length > 0 ? `<span class="support-item-tag">📎 ${item.screenshots.length} files</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="d-none d-md-table-cell">
                        <div class="user-info-cell">
                            <div class="user-name">${this.escapeHtml(this.truncateText(item.user, 20))}</div>
                            <div class="user-email">${this.escapeHtml(this.truncateText(item.email, 25))}</div>
                            ${item.company ? `<span class="user-company">${this.escapeHtml(this.truncateText(item.company, 15))}</span>` : ''}
                        </div>
                    </td>
                    <td class="d-none d-lg-table-cell">
                        <div class="status-cell">
                            <span class="status-badge ${item.status}">${this.getStatusLabel(item.status)}</span>
                        </div>
                    </td>
                    <td class="d-none d-lg-table-cell">
                        <div class="priority-cell">
                            <span class="priority-badge ${item.priority}">
                                <span class="priority-indicator"></span>
                                ${this.getPriorityLabel(item.priority)}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div class="time-cell">
                            <div class="time-ago">${this.formatTimeAgo(item.created_at)}</div>
                            <div class="exact-time">${this.formatExactTime(item.created_at)}</div>
                            ${this.getSlaIndicator(item)}
                        </div>
                    </td>
                    <td>
                        <div class="actions-cell">
                            ${this.getActionButtons(item)}
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;

        return tableHtml;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }

    formatTimeAgo(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    formatExactTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getRowClasses(item) {
        const classes = [];

        if (item.priority === 'urgent' || item.priority === 'critical') {
            classes.push('urgent-row');
        }

        if (item.sla_breached) {
            classes.push('sla-breach');
        }

        if (item.status === 'unread') {
            classes.push('unread');
        }

        return classes.join(' ');
    }

    getTypeLabel(type) {
        const labels = {
            'ticket': 'Ticket',
            'contact': 'Contact',
            'issue': 'Issue'
        };
        return labels[type] || type;
    }

    getStatusLabel(status) {
        const labels = {
            'open': 'Open',
            'in_progress': 'In Progress',
            'waiting_for_user': 'Waiting',
            'resolved': 'Resolved',
            'closed': 'Closed',
            'unread': 'Unread',
            'read': 'Read'
        };
        return labels[status] || status;
    }

    getPriorityLabel(priority) {
        const labels = {
            'urgent': 'Urgent',
            'critical': 'Critical',
            'high': 'High',
            'normal': 'Normal',
            'medium': 'Medium',
            'low': 'Low'
        };
        return labels[priority] || priority;
    }

    getSlaIndicator(item) {
        if (item.type !== 'ticket') return '';

        if (item.sla_breached) {
            return '<div class="sla-indicator breach">SLA Breach</div>';
        }

        // Calculate time remaining
        if (item.sla_deadline) {
            const deadline = new Date(item.sla_deadline);
            const now = new Date();
            const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

            if (hoursRemaining <= 0) {
                return '<div class="sla-indicator breach">SLA Breach</div>';
            } else if (hoursRemaining <= 2) {
                return '<div class="sla-indicator warning">SLA Warning</div>';
            } else {
                return '<div class="sla-indicator good">SLA Good</div>';
            }
        }

        return '';
    }

    getActionButtons(item) {
        const actions = [];

        // View/Edit action - use the global function
        actions.push(`
            <button class="action-btn primary" onclick="viewItemDetails('${item.itemId}')" title="View Details">
                <i data-feather="eye"></i>
            </button>
        `);

        // Type-specific actions
        if (item.type === 'ticket') {
            if (item.status === 'open' || item.status === 'in_progress') {
                actions.push(`
                    <button class="action-btn success" onclick="supportDashboard.quickUpdateStatus('${item.itemId}', 'resolved')" title="Mark Resolved">
                        <i data-feather="check-circle"></i>
                    </button>
                `);
            }
        }

        if (item.type === 'contact' && item.status === 'unread') {
            actions.push(`
                <button class="action-btn" onclick="supportDashboard.markContactAsRead('${item.id}')" title="Mark as Read">
                    <i data-feather="mail"></i>
                </button>
            `);
        }

        if (item.type === 'issue' && item.status === 'open') {
            actions.push(`
                <button class="action-btn success" onclick="supportDashboard.markIssueResolved('${item.id}')" title="Mark Resolved">
                    <i data-feather="check-square"></i>
                </button>
            `);
        }

        return actions.join('');
    }

    setupTableInteractions() {
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllItems');
        selectAllCheckbox?.addEventListener('change', (e) => {
            this.handleSelectAll(e.target.checked);
        });

        // Individual item checkboxes
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleItemSelection(e.target.value, e.target.checked);
            });
        });

        // Update bulk actions visibility
        this.updateBulkActionsVisibility();
    }

    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            this.handleItemSelection(checkbox.value, checked);
        });
    }

    handleItemSelection(itemId, selected) {
        if (selected) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }

        this.updateBulkActionsVisibility();
        this.updateSelectAllState();
    }

    updateSelectAllState() {
        const selectAllCheckbox = document.getElementById('selectAllItems');
        const itemCheckboxes = document.querySelectorAll('.item-checkbox');

        if (selectAllCheckbox && itemCheckboxes.length > 0) {
            const checkedCount = document.querySelectorAll('.item-checkbox:checked').length;
            selectAllCheckbox.checked = checkedCount === itemCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < itemCheckboxes.length;
        }
    }

    updateBulkActionsVisibility() {
        const bulkActionsBtn = this.elements.bulkActions;
        if (bulkActionsBtn) {
            if (this.selectedItems.size > 0) {
                bulkActionsBtn.style.display = 'flex';
                bulkActionsBtn.innerHTML = `
                    <i data-feather="check-square"></i>
                    <span class="d-none d-sm-inline">Bulk (${this.selectedItems.size})</span>
                `;
            } else {
                bulkActionsBtn.style.display = 'none';
            }

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }

        // Update selected items count in modal
        this.updateElement('selectedItemsCount', this.selectedItems.size);
    }

    updatePagination(totalItems) {
        const paginationContainer = this.elements.supportTablePagination;
        if (!paginationContainer) return;

        if (totalItems <= this.pagination.per_page) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        const startItem = ((this.pagination.page - 1) * this.pagination.per_page) + 1;
        const endItem = Math.min(this.pagination.page * this.pagination.per_page, totalItems);

        let paginationHtml = `
            <div class="pagination-info">
                Showing ${startItem}-${endItem} of ${totalItems} items
            </div>
            <div class="pagination-controls">
                <button class="pagination-btn" ${this.pagination.page <= 1 ? 'disabled' : ''} 
                        onclick="supportDashboard.goToPage(${this.pagination.page - 1})">
                    <i data-feather="chevron-left"></i>
                    Previous
                </button>
        `;

        // Page numbers (simplified for mobile)
        const maxVisiblePages = this.isMobile ? 3 : 5;
        const startPage = Math.max(1, this.pagination.page - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(this.pagination.pages, startPage + maxVisiblePages - 1);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <button class="pagination-btn ${i === this.pagination.page ? 'active' : ''}"
                        onclick="supportDashboard.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        paginationHtml += `
                <button class="pagination-btn" ${this.pagination.page >= this.pagination.pages ? 'disabled' : ''}
                        onclick="supportDashboard.goToPage(${this.pagination.page + 1})">
                    Next
                    <i data-feather="chevron-right"></i>
                </button>
            </div>
        `;

        paginationContainer.innerHTML = paginationHtml;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    goToPage(page) {
        if (page >= 1 && page <= this.pagination.pages) {
            this.pagination.page = page;
            this.renderSupportTable();
            window.scrollTo(0, 0);
        }
    }

    updateFilterCounts() {
        const allItems = this.combineAllSupportItems();

        // Count urgent items
        const urgentCount = allItems.filter(item =>
            item.priority === 'urgent' || item.priority === 'critical'
        ).length;
        this.updateElement('urgentFilterCount', urgentCount);

        // Count SLA breaches
        const slaBreachCount = allItems.filter(item => item.sla_breached).length;
        this.updateElement('slaBreachFilterCount', slaBreachCount);

        // Count business items
        const businessCount = allItems.filter(item => item.is_business).length;
        this.updateElement('businessFilterCount', businessCount);

        // Count unassigned tickets
        const unassignedCount = allItems.filter(item =>
            item.type === 'ticket' && !item.assigned_to
        ).length;
        this.updateElement('unassignedFilterCount', unassignedCount);
    }

    handleQuickFilter(filterElement) {
        // Update active state
        document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
        filterElement.classList.add('active');

        // Set filter and apply
        this.currentFilters.quickFilter = filterElement.dataset.filter;
        this.applyFilters();
    }

    handleViewToggle(viewElement) {
        // Update active state
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        viewElement.classList.add('active');

        // Set type filter based on view
        const view = viewElement.dataset.view;
        this.currentFilters.type = view === 'all' ? '' : view;
        this.applyFilters();
    }

    applyFilters() {
        // Reset pagination to first page
        this.pagination.page = 1;

        // Re-render table with filters
        this.renderSupportTable();
    }

    clearAllFilters() {
        // Reset all filters
        this.currentFilters = {
            type: '',
            status: '',
            priority: '',
            dateRange: '',
            search: '',
            quickFilter: 'all'
        };

        // Reset form elements
        if (this.elements.typeFilter) this.elements.typeFilter.value = '';
        if (this.elements.statusFilter) this.elements.statusFilter.value = '';
        if (this.elements.priorityFilter) this.elements.priorityFilter.value = '';
        if (this.elements.dateRangeFilter) this.elements.dateRangeFilter.value = '';
        if (this.elements.supportSearch) this.elements.supportSearch.value = '';

        // Reset quick filter UI
        document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
        document.querySelector('.filter-tag[data-filter="all"]')?.classList.add('active');

        // Reset view toggle
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.view-btn[data-view="all"]')?.classList.add('active');

        // Apply filters (which will clear them)
        this.applyFilters();

        this.showSuccess('Filters cleared');
        this.hapticFeedback('success');
    }

    // Chart setup and management
    setupCharts() {
        this.initializeTrendsChart();
        this.initializeResponseTimeChart();
    }

    initializeTrendsChart() {
        const ctx = this.elements.supportTrendsChart?.getContext('2d');
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(17, 60, 207, 0.2)');
        gradient.addColorStop(1, 'rgba(17, 60, 207, 0.02)');

        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'New Tickets',
                    data: [],
                    borderColor: '#113CCF',
                    backgroundColor: gradient,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#113CCF',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }, {
                    label: 'Resolved',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: this.getChartOptions()
        });
    }

    initializeResponseTimeChart() {
        const ctx = this.elements.responseTimeChart?.getContext('2d');
        if (!ctx) return;

        this.charts.responseTime = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['< 1hr', '1-4hr', '4-24hr', '> 24hr'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6b7280'],
                    borderWidth: 0,
                    hoverOffset: 6
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
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: this.isMobile ? 10 : 12
                            }
                        }
                    }
                }
            }
        });
    }

    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        font: {
                            size: this.isMobile ? 11 : 12
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: this.isMobile ? 10 : 11
                        },
                        maxRotation: this.isMobile ? 45 : 0
                    },
                    grid: {
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: this.isMobile ? 10 : 11
                        }
                    },
                    grid: {
                        drawBorder: false
                    },
                    beginAtZero: true
                }
            }
        };
    }

    updateCharts() {
        // Mock chart data for now
        this.updateTrendsChart();
        this.updateResponseTimeChart();
    }

    updateTrendsChart() {
        if (!this.charts.trends) return;

        // Generate mock data for last 7 days
        const labels = [];
        const newTickets = [];
        const resolved = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            labels.push(date.toLocaleDateString('en-US', {
                month: this.isMobile ? 'numeric' : 'short',
                day: 'numeric'
            }));

            newTickets.push(Math.floor(Math.random() * 20) + 10);
            resolved.push(Math.floor(Math.random() * 15) + 5);
        }

        this.charts.trends.data.labels = labels;
        this.charts.trends.data.datasets[0].data = newTickets;
        this.charts.trends.data.datasets[1].data = resolved;
        this.charts.trends.update();
    }

    updateResponseTimeChart() {
        if (!this.charts.responseTime) return;

        // Calculate from actual ticket data
        const tickets = this.supportData.tickets || [];
        const distribution = {
            under_1hr: 0,
            between_1_4hr: 0,
            between_4_24hr: 0,
            over_24hr: 0
        };

        // Mock distribution for now
        const total = tickets.length || 100;
        distribution.under_1hr = Math.floor(total * 0.4);
        distribution.between_1_4hr = Math.floor(total * 0.3);
        distribution.between_4_24hr = Math.floor(total * 0.2);
        distribution.over_24hr = Math.floor(total * 0.1);

        this.charts.responseTime.data.datasets[0].data = [
            distribution.under_1hr,
            distribution.between_1_4hr,
            distribution.between_4_24hr,
            distribution.over_24hr
        ];
        this.charts.responseTime.update();

        // Update response time indicator
        this.updateResponseTimeIndicator();
    }

    updateResponseTimeIndicator() {
        const indicator = this.elements.responseTimeIndicator;
        if (!indicator) return;

        const dot = indicator.querySelector('.indicator-dot');
        const text = indicator.querySelector('.indicator-text');

        // Mock average response time calculation
        const avgHours = 2.5;

        if (avgHours <= 2) {
            dot.className = 'indicator-dot';
            text.textContent = 'Excellent';
        } else if (avgHours <= 8) {
            dot.className = 'indicator-dot warning';
            text.textContent = 'Good';
        } else {
            dot.className = 'indicator-dot danger';
            text.textContent = 'Needs Improvement';
        }
    }

    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    renderTeamPerformance() {
        const container = this.elements.teamPerformanceContent;
        if (!container) return;

        // Mock team performance data
        const teamMembers = [
            { name: 'Admin User', role: 'Support Lead', tickets_handled: 45, avg_response_time: '1.2h', satisfaction_rate: '98%' },
            { name: 'Support Agent 1', role: 'Agent', tickets_handled: 32, avg_response_time: '2.1h', satisfaction_rate: '95%' },
            { name: 'Support Agent 2', role: 'Agent', tickets_handled: 28, avg_response_time: '1.8h', satisfaction_rate: '96%' }
        ];

        let html = '<div class="team-performance-grid">';

        teamMembers.forEach(member => {
            const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();

            html += `
                <div class="team-member-card">
                    <div class="member-avatar">${initials}</div>
                    <div class="member-name">${member.name}</div>
                    <div class="member-role">${member.role}</div>
                    <div class="member-stats">
                        <div class="member-stat">
                            <div class="stat-value">${member.tickets_handled}</div>
                            <div class="stat-label">Tickets</div>
                        </div>
                        <div class="member-stat">
                            <div class="stat-value">${member.avg_response_time}</div>
                            <div class="stat-label">Avg Time</div>
                        </div>
                        <div class="member-stat">
                            <div class="stat-value">${member.satisfaction_rate}</div>
                            <div class="stat-label">Satisfaction</div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // Modal management
    showBulkActionsModal() {
        if (this.selectedItems.size === 0) {
            this.showError('Please select items to perform bulk actions');
            return;
        }

        const modal = new bootstrap.Modal(this.elements.bulkActionsModal);
        modal.show();
    }

    showCreateTicketModal() {
        const modal = new bootstrap.Modal(this.elements.createTicketModal);

        // Reset form
        document.getElementById('createTicketForm')?.reset();

        modal.show();
    }

    async submitNewTicket() {
        const form = document.getElementById('createTicketForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const ticketData = {
            subject: document.getElementById('ticketSubject').value,
            message: document.getElementById('ticketDescription').value,
            name: this.currentUser.username,
            email: document.getElementById('ticketUserEmail').value,
            category_id: parseInt(document.getElementById('ticketCategory').value) || 1,
            priority: document.getElementById('ticketPriority').value,
            ticket_type: 'general'  // Default type
        };

        try {
            this.showLoading(true);

            const response = await this.makeAuthenticatedRequest('/support/tickets', {
                method: 'POST',
                body: JSON.stringify(ticketData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess(`Ticket created successfully: ${result.ticket_number}`);
                bootstrap.Modal.getInstance(this.elements.createTicketModal).hide();
                await this.loadAllSupportData();
            } else {
                throw new Error(result.error || 'Failed to create ticket');
            }

        } catch (error) {
            console.error('Error creating ticket:', error);
            this.showError(error.message || 'Failed to create ticket');
        } finally {
            this.showLoading(false);
        }
    }

    // Quick actions
    async quickUpdateStatus(itemId, newStatus) {
        if (!itemId.startsWith('ticket-')) return;

        const ticketId = itemId.replace('ticket-', '');

        try {
            const response = await this.makeAuthenticatedRequest(`/support/tickets/${ticketId}/status`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: newStatus,
                    message: `Status updated to ${newStatus} from admin dashboard`
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess(`Ticket status updated to ${newStatus}`);
                this.hapticFeedback('success');
                await this.loadAllSupportData();
            } else {
                throw new Error(result.error || 'Failed to update status');
            }

        } catch (error) {
            console.error('Error updating ticket status:', error);
            this.showError(error.message || 'Failed to update ticket status');
            this.hapticFeedback('error');
        }
    }

    async markContactAsRead(contactId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/support/contact/messages/${contactId}/read`, {
                method: 'PUT'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('Contact marked as read');
                this.hapticFeedback('success');
                await this.loadAllSupportData();
            } else {
                throw new Error(result.error || 'Failed to mark as read');
            }

        } catch (error) {
            console.error('Error marking contact as read:', error);
            this.showError(error.message || 'Failed to mark contact as read');
            this.hapticFeedback('error');
        }
    }

    async markIssueResolved(issueId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/support/issues/${issueId}/resolve`, {
                method: 'PUT',
                body: JSON.stringify({
                    admin_notes: 'Resolved from admin dashboard'
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('Issue marked as resolved');
                this.hapticFeedback('success');
                await this.loadAllSupportData();
            } else {
                throw new Error(result.error || 'Failed to resolve issue');
            }

        } catch (error) {
            console.error('Error resolving issue:', error);
            this.showError(error.message || 'Failed to resolve issue');
            this.hapticFeedback('error');
        }
    }

    async quickReply(itemId) {
        // TODO: Implement quick reply modal
        this.showInfo('Quick reply feature coming soon');
    }

    // Bulk actions
    async bulkMarkResolved() {
        const ticketIds = Array.from(this.selectedItems)
            .filter(id => id.startsWith('ticket-'))
            .map(id => id.replace('ticket-', ''));

        if (ticketIds.length === 0) {
            this.showError('Please select tickets to mark as resolved');
            return;
        }

        try {
            this.showLoading(true);

            // Process each ticket
            const promises = ticketIds.map(ticketId =>
                this.makeAuthenticatedRequest(`/support/tickets/${ticketId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        status: 'resolved',
                        message: 'Bulk resolved from admin dashboard'
                    })
                })
            );

            const results = await Promise.allSettled(promises);
            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            if (succeeded > 0) {
                this.showSuccess(`${succeeded} tickets marked as resolved${failed > 0 ? `, ${failed} failed` : ''}`);
                bootstrap.Modal.getInstance(this.elements.bulkActionsModal).hide();
                this.selectedItems.clear();
                await this.loadAllSupportData();
            } else {
                throw new Error('All operations failed');
            }

        } catch (error) {
            console.error('Error in bulk resolve:', error);
            this.showError('Failed to resolve tickets');
        } finally {
            this.showLoading(false);
        }
    }

    bulkAssign() {
        // TODO: Implement bulk assign
        this.showInfo('Bulk assign feature coming soon');
    }

    bulkUpdatePriority() {
        // TODO: Implement bulk priority update
        this.showInfo('Bulk priority update coming soon');
    }

    bulkDelete() {
        // TODO: Implement bulk delete with confirmation
        this.showInfo('Bulk delete feature coming soon');
    }

    // Mark items as seen
    async markNewItemsAsSeen(items) {
        const newItems = items.filter(item => {
            const itemAge = Date.now() - new Date(item.created_at).getTime();
            return itemAge < 3600000; // Less than 1 hour old
        });

        if (newItems.length === 0) return;

        const itemsByType = {
            ticket: [],
            contact: [],
            issue: []
        };

        newItems.forEach(item => {
            if (itemsByType[item.type]) {
                itemsByType[item.type].push(item.id);
            }
        });

        // Mark each type as seen
        for (const [type, ids] of Object.entries(itemsByType)) {
            if (ids.length > 0) {
                try {
                    await this.makeAuthenticatedRequest('/support/mark-seen', {
                        method: 'POST',
                        body: JSON.stringify({
                            type: type,
                            ids: ids
                        })
                    });
                } catch (error) {
                    console.error(`Error marking ${type} items as seen:`, error);
                }
            }
        }
    }

    // Real-time updates
    startRealTimeUpdates() {
        // Clear existing timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        // Set up periodic refresh
        this.refreshTimer = setInterval(() => {
            if (!document.hidden && !this.isRefreshing) {
                this.refreshDashboardData();
            }
        }, this.refreshInterval);
    }

    stopRealTimeUpdates() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    async refreshDashboardData() {
        // Only refresh key data, not full reload
        try {
            await Promise.all([
                this.loadSupportStats(),
                this.loadSupportDashboard()
            ]);

            this.renderOverviewCards();
            this.updateFilterCounts();

        } catch (error) {
            console.error('Error refreshing dashboard data:', error);
        }
    }

    async refreshAllData() {
        if (this.isRefreshing) return;

        this.isRefreshing = true;
        const refreshBtn = this.elements.refreshSupportDashboard;

        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i data-feather="loader" class="spin"></i> <span class="d-none d-sm-inline">Refreshing</span>';
            if (typeof feather !== 'undefined') feather.replace();
        }

        try {
            await this.loadAllSupportData();
            this.showSuccess('Dashboard refreshed');
            this.hapticFeedback('success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showError('Failed to refresh dashboard');
            this.hapticFeedback('error');
        } finally {
            this.isRefreshing = false;

            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i data-feather="refresh-cw"></i> <span class="d-none d-sm-inline">Refresh</span>';
                if (typeof feather !== 'undefined') feather.replace();
            }
        }
    }

    // Export functionality
    async exportSupportData() {
        try {
            const allItems = this.combineAllSupportItems();
            const filteredItems = this.applyFiltersToItems(allItems);

            const csvContent = this.generateCSV(filteredItems);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `cinebrain-support-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess('Support data exported successfully');
            this.hapticFeedback('success');

        } catch (error) {
            console.error('Error exporting data:', error);
            this.showError('Failed to export support data');
            this.hapticFeedback('error');
        }
    }

    generateCSV(items) {
        const headers = ['Type', 'Number', 'Title', 'User', 'Email', 'Status', 'Priority', 'Created', 'Company', 'Category'];
        const rows = [headers];

        items.forEach(item => {
            rows.push([
                item.type,
                item.displayNumber,
                `"${item.title.replace(/"/g, '""')}"`,
                item.user,
                item.email,
                item.status,
                item.priority,
                this.formatExactTime(item.created_at),
                item.company || '',
                item.category?.name || ''
            ]);
        });

        return rows.map(row => row.join(',')).join('\n');
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + R: Refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.refreshAllData();
        }

        // Ctrl/Cmd + N: New ticket
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showCreateTicketModal();
        }

        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.elements.supportSearch?.focus();
        }

        // Escape: Clear selection
        if (e.key === 'Escape') {
            this.selectedItems.clear();
            this.renderSupportTable();
        }
    }

    // Utility methods
    updateElement(id, value) {
        const element = this.elements[id];
        if (element) {
            element.textContent = value;
        }
    }

    updateFiltersForDevice() {
        // Adjust filter layout for mobile
        if (this.isMobile) {
            // Could implement collapsible filters here
        }
    }

    showLoading(show) {
        const indicator = document.getElementById('page-loading-indicator');
        if (indicator) {
            indicator.style.display = show ? 'block' : 'none';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.support-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `support-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i data-feather="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: calc(var(--topbar-height) + 20px);
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            animation: slideDown 0.3s ease;
        `;

        document.body.appendChild(notification);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Cleanup
    destroy() {
        this.stopRealTimeUpdates();

        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });

        // Clear timeouts
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        console.log('✅ Support dashboard destroyed');
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.supportDashboard = new SupportDashboard();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
    
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
    
    .spin {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);