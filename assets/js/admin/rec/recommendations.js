class AdminRecommendations {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.currentUser = null;
        this.isMobile = window.innerWidth <= 768;
        this.touchDevice = 'ontouchstart' in window;

        this.state = {
            currentTab: 'search',
            searchResults: [],
            recommendations: [],
            upcomingRecommendations: [],
            selectedContent: null,
            searchQuery: '',
            searchSource: 'tmdb',
            currentPage: 1,
            totalPages: 0,
            isLoading: false,
            filters: {
                recommendations: 'all',
                upcoming: 'all'
            },
            sorting: {
                recommendations: 'created_at',
                upcoming: 'created_at'
            }
        };

        this.quickStats = {
            totalRecommendations: 0,
            activeRecommendations: 0,
            upcomingRecommendations: 0,
            telegramSent: 0,
            totalUsers: 0,
            systemStatus: 'unknown'
        };

        this.charts = {};
        this.updateTimer = null;
        this.realtimeTimer = null;
        this.updateInterval = 5000;
        this.realtimeInterval = 2000;
        this.placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2luZUJyYWluPC90ZXh0Pjwvc3ZnPg==';

        this.cache = {
            searchResults: new Map(),
            contentDetails: new Map(),
            lastUpdated: {
                dashboard: 0,
                recommendations: 0,
                upcoming: 0
            }
        };

        this.realtimeStatus = {
            isActive: false,
            lastUpdate: Date.now(),
            updateCount: 0
        };

        this.touchStartX = 0;
        this.touchEndX = 0;

        this.init();
        this.handleResize();
    }

    async init() {
        try {
            if (!await this.checkAdminAuth()) {
                window.location.href = '/auth/login.html';
                return;
            }

            this.initializeElements();
            this.setupCoreEventListeners();
            this.initializeCharts();
            await this.loadInitialData();
            this.startRealTimeUpdates();

            if (this.touchDevice) {
                this.setupMobileFeatures();
            }

            window.recommendationsManager = this;

            console.log('✅ CineBrain Admin Recommendations initialized with real-time updates');

        } catch (error) {
            console.error('❌ Recommendations initialization error:', error);
            this.showError('Failed to initialize recommendations interface');
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

                const activeTab = document.querySelector('.nav-tab.active');
                if (activeTab && this.isMobile) {
                    this.scrollTabIntoView(activeTab);
                }
            }, 100);
        });
    }

    reinitializeForDevice() {
        switch (this.state.currentTab) {
            case 'search':
                if (window.recTelegram) window.recTelegram.renderSearchResults();
                break;
            case 'recommendations':
                if (window.recTelegram) window.recTelegram.renderRecommendations();
                break;
            case 'saved-content':
                if (window.recTelegram) window.recTelegram.renderUpcomingRecommendations();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
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

            const response = await this.makeAuthenticatedRequest('/admin/dashboard');
            if (!response.ok) {
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
            telegramStatus: document.getElementById('telegramStatus'),
            telegramStatusDot: document.getElementById('telegramStatusDot'),
            tmdbStatus: document.getElementById('tmdbStatus'),
            jikanStatus: document.getElementById('jikanStatus'),
            lastSync: document.getElementById('lastSync'),
            quickStatsGrid: document.getElementById('quickStatsGrid'),
            recommendationsCount: document.getElementById('recommendationsCount'),
            savedContentCount: document.getElementById('savedContentCount'),
            analyticsMetrics: document.getElementById('analyticsMetrics'),
            syncExternalAPIs: document.getElementById('syncExternalAPIs'),
            recommendationPerformanceChart: document.getElementById('recommendationPerformanceChart'),
            contentDistributionChart: document.getElementById('contentDistributionChart'),
            // NEW: Add filter elements
            recommendationsFilter: document.getElementById('recommendationsFilter'),
            recommendationsSort: document.getElementById('recommendationsSort'),
            savedContentFilter: document.getElementById('savedContentFilter'),
            savedContentSearch: document.getElementById('savedContentSearch')
        };
    }

    setupCoreEventListeners() {
        const navTabsWrapper = document.querySelector('.nav-tabs-wrapper');
        navTabsWrapper?.addEventListener('click', (e) => {
            if (e.target.matches('.nav-tab') || e.target.closest('.nav-tab')) {
                const button = e.target.matches('.nav-tab') ? e.target : e.target.closest('.nav-tab');
                const tabName = button.getAttribute('data-tab');
                if (tabName) {
                    this.switchTab(tabName);
                }
            }
        });

        this.elements.syncExternalAPIs?.addEventListener('click', () => {
            this.syncExternalAPIs();
        });

        // NEW: Setup filter event listeners
        this.setupFilterEventListeners();

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        const searchInput = document.getElementById('contentSearchInput');
                        searchInput?.focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshCurrentTab();
                        break;
                }
            }

            if (e.altKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('search');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('recommendations');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('saved-content');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchTab('analytics');
                        break;
                }
            }

            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (document.activeElement && document.activeElement.classList.contains('nav-tab')) {
                const tabs = Array.from(document.querySelectorAll('.nav-tab'));
                const currentIndex = tabs.indexOf(document.activeElement);

                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    let newIndex;

                    if (e.key === 'ArrowLeft') {
                        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                    } else {
                        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                    }

                    const newTab = tabs[newIndex];
                    const tabName = newTab.getAttribute('data-tab');
                    if (tabName) {
                        this.switchTab(tabName);
                        newTab.focus();
                    }
                }
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshCurrentTab();
            }
        });

        this.setupTouchGestures();
    }

    // NEW: Setup filter event listeners
    setupFilterEventListeners() {
        // Recommendations filters
        this.elements.recommendationsFilter?.addEventListener('change', () => {
            this.state.filters.recommendations = this.elements.recommendationsFilter.value;
            this.loadRecommendations();
        });

        this.elements.recommendationsSort?.addEventListener('change', () => {
            this.state.sorting.recommendations = this.elements.recommendationsSort.value;
            this.loadRecommendations();
        });

        // Saved content filters
        this.elements.savedContentFilter?.addEventListener('change', () => {
            this.state.filters.upcoming = this.elements.savedContentFilter.value;
            this.loadUpcomingRecommendations();
        });

        this.elements.savedContentSearch?.addEventListener('input',
            this.debounce(() => {
                this.loadUpcomingRecommendations();
            }, 300)
        );
    }

    setupTouchGestures() {
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('touchstart', function () {
                this.style.transform = 'scale(0.95)';
                this.style.opacity = '0.8';
            }, { passive: true });

            tab.addEventListener('touchend', function () {
                this.style.transform = '';
                this.style.opacity = '';
            }, { passive: true });
        });
    }

    handleSwipe() {
        const swipeThreshold = 100;
        const diff = this.touchStartX - this.touchEndX;

        if (Math.abs(diff) > swipeThreshold && this.isMobile) {
            const activeTab = document.querySelector('.nav-tab.active');
            const tabs = Array.from(document.querySelectorAll('.nav-tab'));
            const currentIndex = tabs.indexOf(activeTab);

            let newIndex;
            if (diff > 0) {
                newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            } else {
                newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            }

            const newTab = tabs[newIndex];
            const tabName = newTab.getAttribute('data-tab');
            if (tabName) {
                this.switchTab(tabName);
            }
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });

        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activePane = document.getElementById(`${tabName}-content`) || document.getElementById(tabName);

        if (activeTab && activePane) {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
            activePane.classList.add('active');

            if (this.isMobile) {
                this.scrollTabIntoView(activeTab);
            }
        }

        this.state.currentTab = tabName;

        switch (tabName) {
            case 'search':
                break;
            case 'recommendations':
                if (this.state.recommendations.length === 0) {
                    this.loadRecommendations();
                } else if (window.recTelegram) {
                    window.recTelegram.renderRecommendations();
                }
                break;
            case 'saved-content':
                if (this.state.upcomingRecommendations.length === 0) {
                    this.loadUpcomingRecommendations();
                } else if (window.recTelegram) {
                    window.recTelegram.renderUpcomingRecommendations();
                }
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }

        this.refreshFeatherIcons();
    }

    scrollTabIntoView(tab) {
        const navWrapper = document.querySelector('.nav-tabs-wrapper');
        const tabRect = tab.getBoundingClientRect();
        const wrapperRect = navWrapper.getBoundingClientRect();

        if (tabRect.left < wrapperRect.left || tabRect.right > wrapperRect.right) {
            tab.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    }

    setupMobileFeatures() {
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

                if (pullDistance > 100) {
                    this.showPullToRefreshIndicator();
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (window.scrollY === 0 && startY && currentY) {
                const pullDistance = currentY - startY;

                if (pullDistance > 100) {
                    this.refreshCurrentTab();
                    this.hapticFeedback('medium');
                }
            }

            startY = 0;
            currentY = 0;
            this.hidePullToRefreshIndicator();
        }, { passive: true });
    }

    initializeCharts() {
        if (!this.elements.recommendationPerformanceChart && !this.elements.contentDistributionChart) {
            return;
        }

        if (this.charts.performance) {
            this.charts.performance.destroy();
        }
        if (this.charts.distribution) {
            this.charts.distribution.destroy();
        }

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 750 },
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
                        usePointStyle: true,
                        font: { size: this.isMobile ? 11 : 12 }
                    }
                }
            }
        };

        const performanceCtx = this.elements.recommendationPerformanceChart?.getContext('2d');
        if (performanceCtx) {
            this.charts.performance = new Chart(performanceCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Recommendations',
                        data: [],
                        borderColor: '#e50914',
                        backgroundColor: 'rgba(229, 9, 20, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        x: {
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
                                font: { size: this.isMobile ? 10 : 11 }
                            },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
                                font: { size: this.isMobile ? 10 : 11 }
                            },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        const distributionCtx = this.elements.contentDistributionChart?.getContext('2d');
        if (distributionCtx) {
            this.charts.distribution = new Chart(distributionCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: ['#e50914', '#113CCF', '#ff6b35', '#10b981'],
                        borderWidth: 0,
                        hoverOffset: this.isMobile ? 4 : 8
                    }]
                },
                options: {
                    ...chartOptions,
                    cutout: this.isMobile ? '60%' : '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
                                usePointStyle: true,
                                padding: this.isMobile ? 10 : 15
                            }
                        }
                    }
                }
            });
        }
    }

    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    async loadInitialData() {
        this.showLoading(true);

        try {
            const results = await Promise.allSettled([
                this.loadQuickStats(),
                this.loadSystemStatus(),
                this.loadRecommendations(),
                this.loadUpcomingRecommendations()
            ]);

            const failed = results.filter(result => result.status === 'rejected');
            if (failed.length > 0) {
                console.warn('Some data loading operations failed:', failed);
            }

            this.updateLastSync();

        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load some data');
        } finally {
            this.showLoading(false);
        }
    }

    async loadQuickStats() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/dashboard/stats');
            if (response.ok) {
                const data = await response.json();

                this.quickStats = {
                    totalRecommendations: data.active_recommendations || 0,
                    activeRecommendations: data.active_recommendations || 0,
                    upcomingRecommendations: 0, // Will be updated by loadUpcomingRecommendations
                    telegramSent: 0,
                    totalUsers: data.total_users || 0,
                    systemStatus: 'healthy'
                };

                this.renderQuickStats();
                this.cache.lastUpdated.dashboard = Date.now();
                console.log('✅ Quick stats loaded successfully');
            }
        } catch (error) {
            console.error('Error loading quick stats:', error);
            this.renderQuickStats();
        }
    }

    async loadSystemStatus() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/system-health');
            if (response.ok) {
                const data = await response.json();
                this.updateSystemStatus(data);
            }
        } catch (error) {
            console.error('Error loading system status:', error);
            this.updateSystemStatus({
                status: 'degraded',
                configuration: {
                    telegram_bot: 'not_configured',
                    redis: 'not_configured'
                },
                components: {
                    external_apis: {
                        tmdb: 'not_configured',
                        jikan: 'not_configured'
                    }
                }
            });
        }
    }

    async loadRecommendations(forceRefresh = false) {
        const cacheKey = `recommendations_${this.state.filters.recommendations}_${this.state.sorting.recommendations}`;
        const lastUpdate = this.cache.lastUpdated.recommendations;

        if (!forceRefresh && Date.now() - lastUpdate < 10000) {
            if (window.recTelegram) window.recTelegram.renderRecommendations();
            return;
        }

        try {
            // Get sort option
            const sortBy = this.state.sorting.recommendations || 'created_at';

            const params = new URLSearchParams({
                filter: this.state.filters.recommendations || 'all',
                status: 'active',
                page: 1,
                per_page: 50,
                sort_by: sortBy  // Add sort parameter
            });

            console.log(`🌐 Loading recommendations: ${params}`);
            const response = await this.makeAuthenticatedRequest(`/admin/recommendations?${params}`);

            if (response.ok) {
                const data = await response.json();

                // FIX: Validate and clean the data
                let recommendations = data.recommendations || [];

                // Filter out invalid recommendations and add defaults
                recommendations = recommendations.filter(rec => {
                    if (!rec || !rec.id) {
                        console.warn('Invalid recommendation found:', rec);
                        return false;
                    }
                    return true;
                }).map(rec => ({
                    ...rec,
                    recommendation_type: rec.recommendation_type || 'general',
                    description: rec.description || '',
                    is_active: rec.is_active !== false, // Default to true for active recommendations
                    content: rec.content || {}
                }));

                this.state.recommendations = recommendations;

                if (window.recTelegram) {
                    window.recTelegram.renderRecommendations();
                }

                if (this.elements.recommendationsCount) {
                    this.elements.recommendationsCount.textContent = recommendations.length;
                }

                this.cache.lastUpdated.recommendations = Date.now();

                console.log(`✅ Loaded ${recommendations.length} active recommendations`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
            this.state.recommendations = [];

            if (window.recTelegram) {
                window.recTelegram.renderRecommendations();
            }

            this.showError('Failed to load recommendations. Please try again.');
        }
    }

    async loadUpcomingRecommendations(forceRefresh = false) {
        const lastUpdate = this.cache.lastUpdated.upcoming;

        if (!forceRefresh && Date.now() - lastUpdate < 10000) {
            if (window.recTelegram) window.recTelegram.renderUpcomingRecommendations();
            return;
        }

        try {
            const params = new URLSearchParams({
                status: 'draft',
                filter: this.state.filters.upcoming || 'all',
                page: 1,
                per_page: 100
            });

            // Add search parameter if there's search text
            const upcomingSearch = this.elements.savedContentSearch;
            if (upcomingSearch?.value) {
                params.append('search', upcomingSearch.value);
            }

            // Add type filter if not 'all'
            if (this.state.filters.upcoming && this.state.filters.upcoming !== 'all') {
                params.set('recommendation_type', this.state.filters.upcoming);
                params.delete('filter'); // Use recommendation_type instead of filter
            }

            console.log(`🌐 Loading upcoming recommendations: ${params}`);
            const response = await this.makeAuthenticatedRequest(`/admin/recommendations?${params}`);

            if (response.ok) {
                const data = await response.json();

                // FIX: Validate and clean the data
                let recommendations = data.recommendations || [];

                // Filter out invalid recommendations and add defaults
                recommendations = recommendations.filter(rec => {
                    if (!rec || !rec.id) {
                        console.warn('Invalid upcoming recommendation found:', rec);
                        return false;
                    }
                    return true;
                }).map(rec => ({
                    ...rec,
                    // Add default values for missing fields
                    recommendation_type: rec.recommendation_type || 'general',
                    description: rec.description || '',
                    is_active: rec.is_active || false,
                    content: rec.content || {}
                }));

                this.state.upcomingRecommendations = recommendations;

                if (window.recTelegram) {
                    window.recTelegram.renderUpcomingRecommendations();
                }

                if (this.elements.savedContentCount) {
                    this.elements.savedContentCount.textContent = recommendations.length;
                }

                // Update quick stats with upcoming count
                this.quickStats.upcomingRecommendations = recommendations.length;
                this.renderQuickStats();

                this.cache.lastUpdated.upcoming = Date.now();

                console.log(`✅ Loaded ${recommendations.length} upcoming recommendations`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading upcoming recommendations:', error);
            this.state.upcomingRecommendations = [];

            if (window.recTelegram) {
                window.recTelegram.renderUpcomingRecommendations();
            }

            // Show user-friendly error
            this.showError('Failed to load upcoming recommendations. Please try again.');
        }
    }

    async loadAnalytics() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/analytics');
            if (response.ok) {
                const data = await response.json();
                this.renderAnalytics(data);
                this.updateCharts(data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.renderAnalytics({});
        }
    }

    refreshCurrentTab() {
        switch (this.state.currentTab) {
            case 'search':
                if (this.state.searchQuery && window.recTelegram) {
                    const cacheKey = `${this.state.searchQuery}_${this.state.searchSource}_${this.state.currentPage}`;
                    this.cache.searchResults.delete(cacheKey);
                    window.recTelegram.performContentSearch();
                }
                break;
            case 'recommendations':
                this.loadRecommendations(true);
                break;
            case 'saved-content':
                this.loadUpcomingRecommendations(true);
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
        this.loadQuickStats();
        this.loadSystemStatus();
    }

    renderQuickStats() {
        if (!this.elements.quickStatsGrid) return;

        const stats = [
            {
                label: 'Total Recommendations',
                value: this.formatNumber(this.quickStats.totalRecommendations),
                change: `${this.quickStats.activeRecommendations} active`,
                color: '#e50914'
            },
            {
                label: 'Upcoming Recommendations',
                value: this.formatNumber(this.quickStats.upcomingRecommendations),
                change: 'Ready to publish',
                color: '#10b981'
            },
            {
                label: 'Total Users',
                value: this.formatNumber(this.quickStats.totalUsers),
                change: 'Platform members',
                color: '#113CCF'
            },
            {
                label: 'System Status',
                value: this.quickStats.systemStatus === 'healthy' ? 'Healthy' :
                    this.quickStats.systemStatus === 'degraded' ? 'Degraded' : 'Online',
                change: 'All systems operational',
                color: this.quickStats.systemStatus === 'healthy' ? '#10b981' :
                    this.quickStats.systemStatus === 'degraded' ? '#f59e0b' : '#113CCF'
            }
        ];

        this.elements.quickStatsGrid.innerHTML = stats.map(stat => `
            <div class="quick-stat-card" style="--stat-color: ${stat.color}">
                <div class="quick-stat-value">${stat.value}</div>
                <div class="quick-stat-label">${stat.label}</div>
                <div class="quick-stat-change">${stat.change}</div>
            </div>
        `).join('');

        this.refreshFeatherIcons();
    }

    updateSystemStatus(data) {
        const config = data.configuration || {};
        const components = data.components || {};
        const apis = components.external_apis || {};

        this.updateElement('telegramStatus', config.telegram_bot === 'configured' ? 'Connected' : 'Disconnected');
        this.updateElement('tmdbStatus', apis.tmdb === 'configured' ? 'Online' : 'Offline');
        this.updateElement('jikanStatus', apis.jikan === 'configured' ? 'Online' : 'Offline');

        const telegramDot = this.elements.telegramStatusDot;
        if (telegramDot) {
            const isConnected = config.telegram_bot === 'configured';
            telegramDot.className = `status-dot ${isConnected ? 'green' : 'red'}`;
        }
    }

    renderAnalytics(data = {}) {
        if (!this.elements.analyticsMetrics) return;

        const userAnalytics = data.user_analytics || {};
        const contentAnalytics = data.content_analytics || {};
        const interactionAnalytics = data.interaction_analytics || {};

        const metrics = [
            {
                label: 'Total Users',
                value: this.formatNumber(userAnalytics.total_users || 0),
                change: '+12.5% this month',
                color: '#113CCF'
            },
            {
                label: 'Total Content',
                value: this.formatNumber(contentAnalytics.total_content || 0),
                change: '+8.3% this month',
                color: '#10b981'
            },
            {
                label: 'Total Interactions',
                value: this.formatNumber(interactionAnalytics.total_interactions || 0),
                change: '+15.2% this month',
                color: '#f59e0b'
            },
            {
                label: 'Active Today',
                value: this.formatNumber(userAnalytics.active_today || 0),
                change: 'Current session',
                color: '#e50914'
            }
        ];

        this.elements.analyticsMetrics.innerHTML = metrics.map(metric => `
            <div class="analytics-metric-card" style="--metric-color: ${metric.color}">
                <div class="analytics-metric-value">${metric.value}</div>
                <div class="analytics-metric-label">${metric.label}</div>
                <div class="analytics-metric-change">${metric.change}</div>
            </div>
        `).join('');

        this.refreshFeatherIcons();
    }

    updateCharts(data) {
        if (this.charts.performance && data.user_analytics) {
            const userGrowth = data.user_analytics.user_growth || [];
            this.charts.performance.data.labels = userGrowth.map(item =>
                new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            );
            this.charts.performance.data.datasets[0].data = userGrowth.map(item => item.count);
            this.charts.performance.update('none');
        }

        if (this.charts.distribution && data.content_analytics) {
            const contentDist = data.content_analytics.content_distribution || [];
            this.charts.distribution.data.labels = contentDist.map(item => this.capitalizeFirst(item.type));
            this.charts.distribution.data.datasets[0].data = contentDist.map(item => item.count);
            this.charts.distribution.update('none');
        }
    }

    async syncExternalAPIs() {
        try {
            this.showToast('Syncing external APIs...', 'info');

            const response = await this.makeAuthenticatedRequest('/admin/cache/clear', {
                method: 'POST'
            });

            if (response.ok) {
                this.showToast('APIs synced successfully!', 'success');
                this.loadSystemStatus();
                this.updateLastSync();
                this.cache.searchResults.clear();
            } else {
                throw new Error('Sync failed');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.showToast('Failed to sync APIs', 'error');
        }
    }

    startRealTimeUpdates() {
        this.updateTimer = setInterval(() => {
            if (!document.hidden) {
                this.loadQuickStats();
                this.loadSystemStatus();
            }
        }, this.updateInterval);

        this.realtimeTimer = setInterval(() => {
            if (!document.hidden) {
                if (Date.now() - this.cache.lastUpdated[this.state.currentTab] > 30000) {
                    switch (this.state.currentTab) {
                        case 'recommendations':
                            this.loadRecommendations();
                            break;
                        case 'saved-content':
                            this.loadUpcomingRecommendations();
                            break;
                        case 'analytics':
                            this.loadAnalytics();
                            break;
                    }
                }
                this.updateRealtimeStatus();
            }
        }, this.realtimeInterval);
    }

    stopRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        if (this.realtimeTimer) {
            clearInterval(this.realtimeTimer);
            this.realtimeTimer = null;
        }
    }

    updateRealtimeStatus() {
        this.realtimeStatus.lastUpdate = Date.now();
        this.realtimeStatus.updateCount++;
        this.realtimeStatus.isActive = true;
    }

    showPullToRefreshIndicator() {
        if (!document.getElementById('pullToRefreshIndicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'pullToRefreshIndicator';
            indicator.innerHTML = '<i data-feather="rotate-cw"></i> Release to refresh';
            indicator.style.cssText = `
                position: fixed;
                top: calc(var(--navbar-height, 70px) + 10px);
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
            this.refreshFeatherIcons();
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

        try {
            console.log(`🌐 API Request: ${endpoint}`, options.method || 'GET');

            const response = await fetch(`${this.apiBase}${endpoint}`, mergedOptions);

            if (response.status === 401) {
                localStorage.removeItem('cinebrain-token');
                localStorage.removeItem('cinebrain-user');
                window.location.href = '/auth/login.html';
                throw new Error('Authentication failed');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
                throw new Error(errorMessage);
            }

            console.log(`✅ API Response: ${endpoint} - Success`);
            return response;

        } catch (error) {
            if (error.message === 'Authentication failed') {
                throw error;
            }

            console.error(`❌ API Request failed: ${endpoint}`, error);

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }

            throw error;
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }

    refreshFeatherIcons() {
        setTimeout(() => {
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }, 100);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateLastSync() {
        this.updateElement('lastSync', new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        }));
    }

    formatNumber(num) {
        if (!num || num === 0) return '0';
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
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
        return date.toLocaleDateString();
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase().replace('_', ' ');
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
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
        const existingToast = document.querySelector('.mobile-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        toast.style.cssText = `
            position: fixed;
            bottom: calc(var(--mobile-nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 20px);
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
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

    destroy() {
        this.stopRealTimeUpdates();
        this.cache.searchResults.clear();
        this.cache.contentDetails.clear();

        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });

        this.closeAllModals();

        console.log('🗑️ Recommendations manager destroyed');
    }
}

let recommendationsManager;

window.AdminRecommendations = AdminRecommendations;

document.addEventListener('DOMContentLoaded', () => {
    recommendationsManager = new AdminRecommendations();

    setTimeout(() => {
        window.recTelegram = new RecTelegram(recommendationsManager);
    }, 100);
});

window.addEventListener('beforeunload', () => {
    if (recommendationsManager) {
        recommendationsManager.destroy();
    }
});

window.recommendationsManager = recommendationsManager;