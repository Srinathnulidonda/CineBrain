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
        this.updateInterval = 5000; // Real-time updates every 5 seconds
        this.realtimeInterval = 2000; // Super real-time updates every 2 seconds
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
            this.setupEventListeners();
            this.initializeCharts();
            await this.loadInitialData();
            this.startRealTimeUpdates();

            if (this.touchDevice) {
                this.setupMobileFeatures();
            }

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
            }, 100);
        });
    }

    reinitializeForDevice() {
        switch (this.state.currentTab) {
            case 'search':
                this.renderSearchResults();
                break;
            case 'recommendations':
                this.renderRecommendations();
                break;
            case 'saved-content':
                this.renderUpcomingRecommendations();
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
            contentTabs: document.getElementById('contentTabs'),
            recommendationsCount: document.getElementById('recommendationsCount'),
            savedContentCount: document.getElementById('savedContentCount'),
            contentSearchInput: document.getElementById('contentSearchInput'),
            searchSource: document.getElementById('searchSource'),
            searchType: document.getElementById('searchType'),
            performSearch: document.getElementById('performSearch'),
            searchResultsGrid: document.getElementById('searchResultsGrid'),
            searchResultsContainer: document.getElementById('searchResultsContainer'),
            searchPagination: document.getElementById('searchPagination'),
            resultsCount: document.getElementById('resultsCount'),
            recommendationsListContainer: document.getElementById('recommendationsListContainer'),
            recommendationsFilter: document.getElementById('recommendationsFilter'),
            upcomingGrid: document.getElementById('savedContentGrid'),
            upcomingFilter: document.getElementById('savedContentFilter'),
            upcomingSearch: document.getElementById('savedContentSearch'),
            analyticsMetrics: document.getElementById('analyticsMetrics'),
            createRecommendationBtn: document.getElementById('createRecommendationBtn'),
            syncExternalAPIs: document.getElementById('syncExternalAPIs'),
            refreshRecommendations: document.getElementById('refreshRecommendations'),
            refreshUpcoming: document.getElementById('refreshSavedContent'),
            recommendationPerformanceChart: document.getElementById('recommendationPerformanceChart'),
            contentDistributionChart: document.getElementById('contentDistributionChart')
        };
    }

    setupEventListeners() {
        this.elements.contentTabs?.addEventListener('click', (e) => {
            if (e.target.matches('[data-bs-toggle="tab"]')) {
                const targetId = e.target.getAttribute('data-bs-target')?.replace('#', '').replace('-content', '');
                if (targetId) {
                    this.switchTab(targetId);
                }
            }
        });

        this.elements.contentSearchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performContentSearch();
            }
        });

        this.elements.performSearch?.addEventListener('click', () => {
            this.performContentSearch();
        });

        this.elements.contentSearchInput?.addEventListener('input',
            this.debounce(() => {
                if (this.elements.contentSearchInput.value.length >= 3) {
                    this.performContentSearch();
                }
            }, 500)
        );

        this.elements.searchSource?.addEventListener('change', () => {
            if (this.state.searchQuery) {
                this.performContentSearch();
            }
        });

        this.elements.searchType?.addEventListener('change', () => {
            if (this.state.searchQuery) {
                this.performContentSearch();
            }
        });

        this.elements.recommendationsFilter?.addEventListener('change', () => {
            this.state.filters.recommendations = this.elements.recommendationsFilter.value;
            this.loadRecommendations();
        });

        this.elements.upcomingFilter?.addEventListener('change', () => {
            this.state.filters.upcoming = this.elements.upcomingFilter.value;
            this.loadUpcomingRecommendations();
        });

        this.elements.upcomingSearch?.addEventListener('input',
            this.debounce(() => {
                this.loadUpcomingRecommendations();
            }, 300)
        );

        this.elements.createRecommendationBtn?.addEventListener('click', () => {
            this.showCreateRecommendationModal();
        });

        this.elements.syncExternalAPIs?.addEventListener('click', () => {
            this.syncExternalAPIs();
        });

        this.elements.refreshRecommendations?.addEventListener('click', () => {
            this.loadRecommendations(true);
        });

        this.elements.refreshUpcoming?.addEventListener('click', () => {
            this.loadUpcomingRecommendations(true);
        });

        const searchClear = document.getElementById('contentSearchClear');
        searchClear?.addEventListener('click', () => {
            this.clearSearch();
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        this.elements.contentSearchInput?.focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshCurrentTab();
                        break;
                    case 's':
                        if (this.state.currentTab === 'search' && this.state.searchResults.length > 0) {
                            e.preventDefault();
                            this.saveRecommendation(this.state.searchResults[0].id || this.state.searchResults[0].tmdb_id);
                        }
                        break;
                    case 'n':
                        if (this.state.currentTab === 'recommendations') {
                            e.preventDefault();
                            this.showCreateRecommendationModal();
                        }
                        break;
                }
            }

            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshCurrentTab();
            }
        });
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
            const response = await this.makeAuthenticatedRequest('/admin/dashboard');
            if (response.ok) {
                const data = await response.json();

                const generalStats = data.general_stats || {};
                const supportStats = data.support_overview || {};
                const recentActivity = data.recent_activity || {};

                const upcomingResponse = await this.makeAuthenticatedRequest('/admin/recommendations?status=draft');
                let upcomingCount = 0;
                if (upcomingResponse.ok) {
                    const upcomingData = await upcomingResponse.json();
                    upcomingCount = upcomingData.recommendations?.length || 0;
                }

                this.quickStats = {
                    totalRecommendations: generalStats.total_recommendations || recentActivity.recent_recommendations?.length || 0,
                    activeRecommendations: generalStats.active_recommendations || 0,
                    upcomingRecommendations: upcomingCount,
                    telegramSent: supportStats.today_resolved || 0,
                    totalUsers: generalStats.total_users || 0,
                    systemStatus: data.status || 'unknown'
                };

                this.renderQuickStats();
                this.cache.lastUpdated.dashboard = Date.now();
                this.addRealtimeAnimation('dashboard');
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
        const cacheKey = `recommendations_${this.state.filters.recommendations}`;
        const lastUpdate = this.cache.lastUpdated.recommendations;

        if (!forceRefresh && Date.now() - lastUpdate < 10000) { // Real-time cache for 10 seconds
            this.renderRecommendations();
            return;
        }

        try {
            const params = new URLSearchParams({
                filter: this.state.filters.recommendations,
                status: 'active',
                page: 1,
                per_page: 50
            });

            const response = await this.makeAuthenticatedRequest(`/admin/recommendations?${params}`);

            if (response.ok) {
                const data = await response.json();
                this.state.recommendations = data.recommendations || [];
                this.renderRecommendations();

                if (this.elements.recommendationsCount) {
                    this.elements.recommendationsCount.textContent = this.state.recommendations.length;
                    this.addRealtimeAnimation('recommendations-badge');
                }

                this.cache.lastUpdated.recommendations = Date.now();
                this.addRealtimeAnimation('recommendations');
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
            this.state.recommendations = [];
            this.renderRecommendations();
        }
    }

    async loadUpcomingRecommendations(forceRefresh = false) {
        const lastUpdate = this.cache.lastUpdated.upcoming;

        if (!forceRefresh && Date.now() - lastUpdate < 10000) { // Real-time cache for 10 seconds
            this.renderUpcomingRecommendations();
            return;
        }

        try {
            const params = new URLSearchParams({
                status: 'draft',
                filter: this.state.filters.upcoming,
                page: 1,
                per_page: 100
            });

            if (this.elements.upcomingSearch?.value) {
                params.append('search', this.elements.upcomingSearch.value);
            }

            const response = await this.makeAuthenticatedRequest(`/admin/recommendations?${params}`);

            if (response.ok) {
                const data = await response.json();
                this.state.upcomingRecommendations = data.recommendations || [];
                this.renderUpcomingRecommendations();

                if (this.elements.savedContentCount) {
                    this.elements.savedContentCount.textContent = this.state.upcomingRecommendations.length;
                    this.addRealtimeAnimation('upcoming-badge');
                }

                this.cache.lastUpdated.upcoming = Date.now();
                this.addRealtimeAnimation('upcoming');
            }
        } catch (error) {
            console.error('Error loading upcoming recommendations:', error);
            this.state.upcomingRecommendations = [];
            this.renderUpcomingRecommendations();
        }
    }

    async loadAnalytics() {
        try {
            const response = await this.makeAuthenticatedRequest('/admin/analytics');
            if (response.ok) {
                const data = await response.json();
                this.renderAnalytics(data);
                this.updateCharts(data);
                this.addRealtimeAnimation('analytics');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.renderAnalytics({});
        }
    }

    async performContentSearch() {
        const query = this.elements.contentSearchInput?.value.trim();
        if (!query || query.length < 2) {
            this.clearSearchResults();
            return;
        }

        const cacheKey = `${query}_${this.elements.searchSource?.value}_${this.state.currentPage}`;
        if (this.cache.searchResults.has(cacheKey)) {
            const cachedData = this.cache.searchResults.get(cacheKey);
            this.state.searchResults = cachedData.results;
            this.state.totalPages = cachedData.totalPages;
            this.renderSearchResults();
            this.updateSearchResultsHeader(cachedData);
            return;
        }

        this.state.searchQuery = query;
        this.state.currentPage = 1;
        this.state.isLoading = true;

        this.showSearchLoading();

        try {
            const source = this.elements.searchSource?.value || 'tmdb';
            const type = this.elements.searchType?.value || 'all';

            const params = new URLSearchParams({
                query: query,
                source: source,
                page: this.state.currentPage
            });

            if (type !== 'all') {
                params.append('type', type);
            }

            const response = await this.makeAuthenticatedRequest(`/admin/search?${params}`);

            if (response.ok) {
                const data = await response.json();
                this.state.searchResults = data.results || [];
                this.state.totalPages = data.total_pages || 1;

                this.cache.searchResults.set(cacheKey, {
                    results: this.state.searchResults,
                    totalPages: this.state.totalPages,
                    totalResults: data.total_results || 0
                });

                this.renderSearchResults();
                this.updateSearchResultsHeader(data);

                const searchClear = document.getElementById('contentSearchClear');
                if (searchClear) {
                    searchClear.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error performing search:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.state.isLoading = false;
            this.hideSearchLoading();
        }
    }

    async changePage(newPage) {
        if (newPage < 1 || newPage > this.state.totalPages) {
            return;
        }

        this.state.currentPage = newPage;
        await this.performContentSearch();
    }

    async previewContent(contentId) {
        try {
            const content = this.findContentById(contentId);
            if (!content) {
                this.showError('Content not found');
                return;
            }

            const slug = this.generateSlug(content);
            const detailsUrl = `/explore/details.html?${encodeURIComponent(slug)}`;

            window.open(detailsUrl, '_blank');
            this.showToast('Opening content preview...', 'info');

        } catch (error) {
            console.error('Preview error:', error);
            this.showError('Failed to preview content');
        }
    }

    async saveRecommendation(contentId) {
        try {
            const content = this.findContentById(contentId);
            if (!content) {
                this.showError('Content not found');
                return;
            }

            this.showQuickSaveRecommendationModal(content);

        } catch (error) {
            console.error('Save recommendation error:', error);
            this.showError('Failed to save recommendation');
        }
    }

    async recommendContent(contentId) {
        try {
            const content = this.findContentById(contentId);
            if (!content) {
                this.showError('Content not found');
                return;
            }

            this.state.selectedContent = content;
            this.showCreateRecommendationModal(content);

        } catch (error) {
            console.error('Recommend error:', error);
            this.showError('Failed to open recommendation form');
        }
    }

    async publishRecommendation(recommendationId) {
        try {
            this.showToast('Publishing recommendation...', 'info');

            const response = await this.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}/publish`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast('Recommendation published successfully!', 'success');

                if (result.telegram_sent) {
                    this.showToast('Sent to Telegram channel!', 'success');
                }

                this.loadRecommendations(true);
                this.loadUpcomingRecommendations(true);
                this.loadQuickStats();

            } else {
                const error = await response.json();
                throw new Error(error.error || 'Publish failed');
            }
        } catch (error) {
            console.error('Publish recommendation error:', error);
            this.showError('Failed to publish recommendation: ' + error.message);
        }
    }

    async editRecommendation(recommendationId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch recommendation details');
            }

            const recommendation = await response.json();
            this.showEditRecommendationModal(recommendation);

        } catch (error) {
            console.error('Edit recommendation error:', error);
            this.showError('Failed to open edit form: ' + error.message);
        }
    }

    async createDraftRecommendation(contentData, recommendationType, description, publishNow = false) {
        try {
            this.showToast('Saving recommendation...', 'info');

            const response = await this.makeAuthenticatedRequest('/admin/recommendations', {
                method: 'POST',
                body: JSON.stringify({
                    content_data: contentData,
                    recommendation_type: recommendationType,
                    description: description,
                    status: publishNow ? 'active' : 'draft',
                    publish_to_telegram: publishNow
                })
            });

            if (response.ok) {
                const result = await response.json();

                if (publishNow) {
                    this.showToast('Recommendation created and published!', 'success');
                    if (result.telegram_sent) {
                        this.showToast('Sent to Telegram channel!', 'success');
                    }
                } else {
                    this.showToast('Recommendation saved as upcoming!', 'success');
                }

                // Immediate real-time refresh
                this.loadRecommendations(true);
                this.loadUpcomingRecommendations(true);
                this.loadQuickStats();
                this.closeQuickSaveRecommendationModal();
                this.closeCreateRecommendationModal();

                this.updateContentCardState(contentData.id || contentData.tmdb_id || contentData.mal_id, 'saved');

            } else {
                const error = await response.json();
                throw new Error(error.error || 'Creation failed');
            }
        } catch (error) {
            console.error('Create recommendation error:', error);
            this.showError('Failed to save recommendation: ' + error.message);
        }
    }

    async updateRecommendation(recommendationId, data) {
        try {
            this.showToast('Updating recommendation...', 'info');

            const response = await this.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showToast('Recommendation updated successfully!', 'success');
                this.loadRecommendations(true);
                this.loadUpcomingRecommendations(true);
                this.closeEditRecommendationModal();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Update failed');
            }
        } catch (error) {
            console.error('Update recommendation error:', error);
            this.showError('Failed to update recommendation: ' + error.message);
        }
    }

    async deleteRecommendation(recommendationId) {
        try {
            if (!confirm('Are you sure you want to delete this recommendation? This action cannot be undone.')) {
                return;
            }

            this.showToast('Deleting recommendation...', 'info');

            const response = await this.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('Recommendation deleted successfully!', 'success');
                this.loadRecommendations(true);
                this.loadUpcomingRecommendations(true);
                this.loadQuickStats();
                this.closeEditRecommendationModal();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete recommendation error:', error);
            this.showError('Failed to delete recommendation: ' + error.message);
        }
    }

    async sendToTelegram(recommendationId) {
        try {
            this.showToast('Sending to Telegram...', 'info');

            const response = await this.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}/send`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.telegram_sent) {
                    this.showToast('Successfully sent to Telegram channel!', 'success');
                } else {
                    this.showToast('Telegram is not configured', 'warning');
                }
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Send failed');
            }
        } catch (error) {
            console.error('Send to Telegram error:', error);
            this.showError('Failed to send to Telegram: ' + error.message);
        }
    }

    showQuickSaveRecommendationModal(content) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'quickSaveRecommendationModal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-bookmark-plus-fill"></i>
                            Save as Upcoming Recommendation
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="content-preview mb-3">
                            <div class="row">
                                <div class="col-3">
                                    <img src="${this.getPosterUrl(content)}" 
                                         alt="${content.title}" 
                                         class="img-fluid rounded"
                                         style="max-height: 120px; object-fit: cover;">
                                </div>
                                <div class="col-9">
                                    <h6 class="mb-1">${content.title || content.name}</h6>
                                    <p class="text-muted mb-1 small">${content.content_type || 'movie'} • ${this.extractYear(content.release_date || content.first_air_date)}</p>
                                    <p class="small text-truncate">${(content.overview || '').substring(0, 100)}...</p>
                                </div>
                            </div>
                        </div>
                        
                        <form id="quickSaveForm">
                            <div class="mb-3">
                                <label for="quickRecommendationType" class="form-label">Recommendation Type</label>
                                <select class="form-select" id="quickRecommendationType" required>
                                    <option value="">Select type</option>
                                    <option value="featured">Featured Pick</option>
                                    <option value="trending">Trending Now</option>
                                    <option value="hidden_gem">Hidden Gem</option>
                                    <option value="classic">Classic Must-Watch</option>
                                    <option value="new_release">New Release</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="quickDescription" class="form-label">Quick Description</label>
                                <textarea class="form-control" id="quickDescription" 
                                         rows="3" placeholder="Brief description of why you recommend this..."
                                         maxlength="200" required></textarea>
                                <div class="form-text">
                                    <span id="quickDescriptionCount">0</span>/200 characters
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-outline-primary" id="saveAsDraftBtn">
                            <i class="bi bi-bookmark-plus"></i>
                            Save as Upcoming
                        </button>
                        <button type="button" class="btn btn-primary" id="saveAndPublishBtn">
                            <i class="bi bi-send"></i>
                            Save & Publish
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('quickSaveForm');
        const descriptionTextarea = document.getElementById('quickDescription');
        const descriptionCount = document.getElementById('quickDescriptionCount');
        const saveAsDraftBtn = document.getElementById('saveAsDraftBtn');
        const saveAndPublishBtn = document.getElementById('saveAndPublishBtn');

        descriptionTextarea.addEventListener('input', () => {
            descriptionCount.textContent = descriptionTextarea.value.length;
        });

        const handleSave = async (publishNow) => {
            if (form.checkValidity()) {
                const recommendationType = document.getElementById('quickRecommendationType').value;
                const description = descriptionTextarea.value;

                const contentData = this.extractContentData(content);
                await this.createDraftRecommendation(contentData, recommendationType, description, publishNow);
            } else {
                form.reportValidity();
            }
        };

        saveAsDraftBtn.addEventListener('click', () => handleSave(false));
        saveAndPublishBtn.addEventListener('click', () => handleSave(true));

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    showCreateRecommendationModal(content = null) {
        const targetContent = content || this.state.selectedContent;
        if (!targetContent) {
            this.showError('No content selected');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'createRecommendationModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-star-fill"></i>
                            Create Recommendation
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="content-preview mb-4">
                            <div class="row">
                                <div class="col-3">
                                    <img src="${this.getPosterUrl(targetContent)}" 
                                         alt="${targetContent.title}" 
                                         class="img-fluid rounded">
                                </div>
                                <div class="col-9">
                                    <h6>${targetContent.title || targetContent.name}</h6>
                                    <p class="text-muted mb-2">${targetContent.content_type || 'movie'} • ${this.extractYear(targetContent.release_date || targetContent.first_air_date)}</p>
                                    <p class="small">${(targetContent.overview || '').substring(0, 150)}...</p>
                                </div>
                            </div>
                        </div>
                        
                        <form id="recommendationForm">
                            <div class="mb-3">
                                <label for="recommendationType" class="form-label">Recommendation Type</label>
                                <select class="form-select" id="recommendationType" required>
                                    <option value="">Select type</option>
                                    <option value="featured">Featured Pick</option>
                                    <option value="trending">Trending Now</option>
                                    <option value="hidden_gem">Hidden Gem</option>
                                    <option value="classic">Classic Must-Watch</option>
                                    <option value="new_release">New Release</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="recommendationDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="recommendationDescription" 
                                         rows="4" placeholder="Why do you recommend this content? What makes it special?"
                                         maxlength="500" required></textarea>
                                <div class="form-text">
                                    <span id="descriptionCount">0</span>/500 characters
                                </div>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="sendToTelegramNow">
                                <label class="form-check-label" for="sendToTelegramNow">
                                    Send to Telegram channel immediately
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="createRecommendationSubmit">
                            <i class="bi bi-plus-circle"></i>
                            Create Recommendation
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('recommendationForm');
        const descriptionTextarea = document.getElementById('recommendationDescription');
        const descriptionCount = document.getElementById('descriptionCount');
        const submitBtn = document.getElementById('createRecommendationSubmit');

        descriptionTextarea.addEventListener('input', () => {
            descriptionCount.textContent = descriptionTextarea.value.length;
        });

        submitBtn.addEventListener('click', async () => {
            if (form.checkValidity()) {
                const recommendationType = document.getElementById('recommendationType').value;
                const description = descriptionTextarea.value;
                const publishNow = document.getElementById('sendToTelegramNow').checked;

                const contentData = this.extractContentData(targetContent);
                await this.createDraftRecommendation(contentData, recommendationType, description, publishNow);
            } else {
                form.reportValidity();
            }
        });

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    showEditRecommendationModal(recommendation) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'editRecommendationModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil-square"></i>
                            Edit Recommendation
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="content-preview mb-4">
                            <div class="row">
                                <div class="col-3">
                                    <img src="${this.getPosterUrl(recommendation.content)}" 
                                         alt="${recommendation.content?.title}" 
                                         class="img-fluid rounded">
                                </div>
                                <div class="col-9">
                                    <h6>${recommendation.content?.title || 'Unknown Title'}</h6>
                                    <p class="text-muted mb-2">${recommendation.content?.content_type || 'movie'}</p>
                                    <p class="small">${(recommendation.content?.overview || '').substring(0, 150)}...</p>
                                </div>
                            </div>
                        </div>
                        
                        <form id="editRecommendationForm">
                            <div class="mb-3">
                                <label for="editRecommendationType" class="form-label">Recommendation Type</label>
                                <select class="form-select" id="editRecommendationType" required>
                                    <option value="featured" ${recommendation.recommendation_type === 'featured' ? 'selected' : ''}>Featured Pick</option>
                                    <option value="trending" ${recommendation.recommendation_type === 'trending' ? 'selected' : ''}>Trending Now</option>
                                    <option value="hidden_gem" ${recommendation.recommendation_type === 'hidden_gem' ? 'selected' : ''}>Hidden Gem</option>
                                    <option value="classic" ${recommendation.recommendation_type === 'classic' ? 'selected' : ''}>Classic Must-Watch</option>
                                    <option value="new_release" ${recommendation.recommendation_type === 'new_release' ? 'selected' : ''}>New Release</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="editRecommendationDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="editRecommendationDescription" 
                                         rows="4" placeholder="Why do you recommend this content?"
                                         maxlength="500" required>${recommendation.description || ''}</textarea>
                                <div class="form-text">
                                    <span id="editDescriptionCount">${(recommendation.description || '').length}</span>/500 characters
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="recommendationStatus" class="form-label">Status</label>
                                <select class="form-select" id="recommendationStatus">
                                    <option value="true" ${recommendation.is_active ? 'selected' : ''}>Active</option>
                                    <option value="false" ${!recommendation.is_active ? 'selected' : ''}>Draft</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger me-auto" id="deleteRecommendationBtn">
                            <i class="bi bi-trash"></i>
                            Delete
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="updateRecommendationSubmit">
                            <i class="bi bi-check-circle"></i>
                            Update Recommendation
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('editRecommendationForm');
        const descriptionTextarea = document.getElementById('editRecommendationDescription');
        const descriptionCount = document.getElementById('editDescriptionCount');
        const submitBtn = document.getElementById('updateRecommendationSubmit');
        const deleteBtn = document.getElementById('deleteRecommendationBtn');

        descriptionTextarea.addEventListener('input', () => {
            descriptionCount.textContent = descriptionTextarea.value.length;
        });

        submitBtn.addEventListener('click', async () => {
            if (form.checkValidity()) {
                const recommendationType = document.getElementById('editRecommendationType').value;
                const description = descriptionTextarea.value;
                const isActive = document.getElementById('recommendationStatus').value === 'true';

                await this.updateRecommendation(recommendation.id, {
                    recommendation_type: recommendationType,
                    description: description,
                    is_active: isActive
                });
            } else {
                form.reportValidity();
            }
        });

        deleteBtn.addEventListener('click', async () => {
            await this.deleteRecommendation(recommendation.id);
        });

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    closeQuickSaveRecommendationModal() {
        const modal = document.getElementById('quickSaveRecommendationModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    closeCreateRecommendationModal() {
        const modal = document.getElementById('createRecommendationModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    closeEditRecommendationModal() {
        const modal = document.getElementById('editRecommendationModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
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

    switchTab(tabName) {
        this.state.currentTab = tabName;

        switch (tabName) {
            case 'search':
                break;
            case 'recommendations':
                if (this.state.recommendations.length === 0) {
                    this.loadRecommendations();
                } else {
                    this.renderRecommendations();
                }
                break;
            case 'saved-content':
                if (this.state.upcomingRecommendations.length === 0) {
                    this.loadUpcomingRecommendations();
                } else {
                    this.renderUpcomingRecommendations();
                }
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    refreshCurrentTab() {
        switch (this.state.currentTab) {
            case 'search':
                if (this.state.searchQuery) {
                    const cacheKey = `${this.state.searchQuery}_${this.elements.searchSource?.value}_${this.state.currentPage}`;
                    this.cache.searchResults.delete(cacheKey);
                    this.performContentSearch();
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
            telegramDot.className = `status-dot ${isConnected ? 'pulse-green' : 'pulse-red'}`;
        }
    }

    renderSearchResults() {
        if (!this.elements.searchResultsGrid) return;

        if (this.state.searchResults.length === 0) {
            if (this.elements.searchResultsContainer) {
                this.elements.searchResultsContainer.classList.remove('active');
                this.elements.searchResultsGrid.innerHTML = this.getEmptyState('search', 'No results found', 'Try different keywords or change search source');
            }
            this.updateTabContainerHeight();
            return;
        }

        this.elements.searchResultsGrid.innerHTML = this.state.searchResults.map(content =>
            this.createContentCard(content, 'search')
        ).join('');

        if (this.state.totalPages > 1) {
            this.renderSearchPagination();
        }

        this.setupLazyLoadingForCards();

        if (this.elements.searchResultsContainer) {
            this.elements.searchResultsContainer.classList.add('active');
            const header = this.elements.searchResultsContainer.querySelector('.search-results-header');
            if (header) {
                header.style.display = 'flex';
            }
        }

        this.updateTabContainerHeight();
    }

    renderSearchPagination() {
        if (!this.elements.searchPagination) return;

        const currentPage = this.state.currentPage;
        const totalPages = this.state.totalPages;

        let paginationHTML = '';

        paginationHTML += `
            <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                    onclick="recommendationsManager.changePage(${currentPage - 1})"
                    ${currentPage === 1 ? 'disabled' : ''}>
                <i class="bi bi-chevron-left"></i>
            </button>
        `;

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" onclick="recommendationsManager.changePage(1)">1</button>
            `;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="recommendationsManager.changePage(${i})">${i}</button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
            paginationHTML += `
                <button class="pagination-btn" onclick="recommendationsManager.changePage(${totalPages})">${totalPages}</button>
            `;
        }

        paginationHTML += `
            <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="recommendationsManager.changePage(${currentPage + 1})"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="bi bi-chevron-right"></i>
            </button>
        `;

        this.elements.searchPagination.innerHTML = paginationHTML;
        this.elements.searchPagination.style.display = 'flex';
    }

    renderRecommendations() {
        if (!this.elements.recommendationsListContainer) return;

        if (this.state.recommendations.length === 0) {
            this.elements.recommendationsListContainer.classList.remove('active');
            this.elements.recommendationsListContainer.innerHTML = this.getEmptyState(
                'star',
                'No active recommendations yet',
                'Create your first recommendation to get started',
                false
            );
            this.updateTabContainerHeight();
            return;
        }

        this.elements.recommendationsListContainer.innerHTML = this.state.recommendations.map(rec =>
            this.createRecommendationItem(rec)
        ).join('');

        this.elements.recommendationsListContainer.classList.add('active');

        this.updateTabContainerHeight();
    }

    renderUpcomingRecommendations() {
        if (!this.elements.upcomingGrid) return;

        if (this.state.upcomingRecommendations.length === 0) {
            this.elements.upcomingGrid.classList.remove('active');
            this.elements.upcomingGrid.innerHTML = this.getEmptyState(
                'clock',
                'No upcoming recommendations',
                'Save recommendations for later publishing',
                false
            );
            this.updateTabContainerHeight();
            return;
        }

        // Use the same content card format as search results
        this.elements.upcomingGrid.innerHTML = this.state.upcomingRecommendations.map(rec =>
            this.createUpcomingContentCard(rec)
        ).join('');

        this.elements.upcomingGrid.classList.add('active');
        this.setupLazyLoadingForCards(this.elements.upcomingGrid);

        this.updateTabContainerHeight();
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

    createContentCard(content, context = 'search') {
        const posterUrl = this.getPosterUrl(content);
        const rating = this.formatRating(content.rating || content.vote_average);
        const year = this.extractYear(content.release_date || content.first_air_date);
        const contentType = content.content_type || content.media_type || 'movie';
        const contentId = content.id || content.tmdb_id || content.mal_id || Date.now();

        return `
            <div class="content-card" data-content-id="${contentId}" data-source="${content.source || 'tmdb'}">
                <div class="content-card-image">
                    <img data-src="${posterUrl}" alt="${this.escapeHtml(content.title || content.name || 'Content')}" loading="lazy">
                    <div class="content-card-type ${contentType}">
                        ${contentType.toUpperCase()}
                    </div>
                    <div class="content-card-rating">
                        <i class="bi bi-eye"></i> ${rating}
                    </div>
                    <div class="content-card-actions">
                        <button class="content-card-action" onclick="recommendationsManager.previewContent('${contentId}')" 
                                title="Preview">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="content-card-action save-recommend" onclick="recommendationsManager.saveRecommendation('${contentId}')" 
                                title="Save as Upcoming">
                            <i class="bi bi-bookmark"></i>
                        </button>
                        <button class="content-card-action" onclick="recommendationsManager.recommendContent('${contentId}')" 
                                title="Recommend">
                            <i class="bi bi-star"></i>
                        </button>
                    </div>
                </div>
                <div class="content-card-body">
                    <h3 class="content-card-title">${this.escapeHtml(content.title || content.name || 'Unknown Title')}</h3>
                    <div class="content-card-meta">
                        ${year ? `<span class="content-card-year">${year}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    createUpcomingContentCard(recommendation) {
        const content = recommendation.content || {};
        const posterUrl = this.getPosterUrl(content);
        const rating = this.formatRating(content.rating || content.vote_average);
        const year = this.extractYear(content.release_date || content.first_air_date);
        const contentType = content.content_type || content.media_type || 'movie';
        const contentId = content.id || content.tmdb_id || content.mal_id || recommendation.id;
        const statusColor = this.getRecommendationStatusColor(recommendation.recommendation_type);

        return `
            <div class="content-card" data-content-id="${contentId}" data-recommendation-id="${recommendation.id}">
                <div class="content-card-image">
                    <img data-src="${posterUrl}" alt="${this.escapeHtml(content.title || content.name || 'Content')}" loading="lazy">
                    <div class="content-card-type" style="background: ${statusColor}">
                        ${this.capitalizeFirst(recommendation.recommendation_type)}
                    </div>
                    <div class="content-card-rating">
                        <i class="bi bi-star"></i> ${rating}
                    </div>
                    <div class="content-card-actions">
                        <button class="content-card-action" onclick="recommendationsManager.previewContent('${contentId}')" 
                                title="Preview">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="content-card-action" onclick="recommendationsManager.publishRecommendation(${recommendation.id})" 
                                title="Publish Now">
                            <i class="bi bi-send"></i>
                        </button>
                        <button class="content-card-action" onclick="recommendationsManager.editRecommendation(${recommendation.id})" 
                                title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </div>
                </div>
                <div class="content-card-body">
                    <h3 class="content-card-title">${this.escapeHtml(content.title || content.name || 'Unknown Title')}</h3>
                    <div class="content-card-meta">
                        ${year ? `<span class="content-card-year">${year}</span>` : ''}
                        <span class="content-card-status">DRAFT</span>
                    </div>
                </div>
            </div>
        `;
    }

    createRecommendationItem(recommendation) {
        const posterUrl = this.getPosterUrl(recommendation.content);
        const statusColor = this.getRecommendationStatusColor(recommendation.recommendation_type);
        const date = this.formatTimeAgo(recommendation.created_at);
        const isActive = recommendation.is_active !== false;

        return `
            <div class="recommendation-item" style="--recommendation-status-color: ${statusColor}">
                <div class="recommendation-poster">
                    <img src="${posterUrl}" alt="${recommendation.content?.title || 'Content'}" loading="lazy">
                </div>
                <div class="recommendation-content">
                    <div class="recommendation-header">
                        <h3 class="recommendation-title">${recommendation.content?.title || 'Unknown Title'}</h3>
                        <div class="recommendation-type" style="background-color: ${statusColor}">
                            ${this.capitalizeFirst(recommendation.recommendation_type)}
                        </div>
                    </div>
                    <p class="recommendation-description">${recommendation.description || 'No description'}</p>
                    <div class="recommendation-meta">
                        <span class="recommendation-date">${date}</span>
                        <span class="recommendation-status ${isActive ? 'active' : 'inactive'}">${isActive ? 'active' : 'draft'}</span>
                        <div class="recommendation-actions">
                            <button class="recommendation-action" onclick="recommendationsManager.editRecommendation(${recommendation.id})">
                                <i class="bi bi-pencil"></i>
                                Edit
                            </button>
                            <button class="recommendation-action primary" onclick="recommendationsManager.sendToTelegram(${recommendation.id})">
                                <i class="bi bi-send"></i>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    extractContentData(content) {
        return {
            id: content.id || content.tmdb_id || content.mal_id,
            title: content.title || content.name,
            original_title: content.original_title || content.original_name,
            content_type: content.content_type || content.media_type || 'movie',
            genres: content.genre_ids || content.genres || [],
            languages: content.original_language ? [content.original_language] : ['en'],
            release_date: content.release_date || content.first_air_date,
            runtime: content.runtime,
            rating: content.vote_average || content.rating,
            vote_count: content.vote_count,
            popularity: content.popularity,
            overview: content.overview,
            poster_path: content.poster_path,
            backdrop_path: content.backdrop_path,
            source: content.source || this.elements.searchSource?.value || 'tmdb'
        };
    }

    findContentById(contentId) {
        let content = this.state.searchResults.find(c =>
            (c.id || c.tmdb_id || c.mal_id) == contentId
        );

        if (!content) {
            content = this.state.upcomingRecommendations.find(r => r.content_id == contentId || r.id == contentId)?.content;
        }

        return content;
    }

    generateSlug(content) {
        const title = content.title || content.name || 'unknown';
        const year = this.extractYear(content.release_date || content.first_air_date);

        let slug = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        if (year) {
            slug += `-${year}`;
        }

        return slug;
    }

    updateContentCardState(contentId, state) {
        const card = document.querySelector(`[data-content-id="${contentId}"]`);
        if (card) {
            card.classList.add(`content-${state}`);

            const saveBtn = card.querySelector('[onclick*="saveRecommendation"]');
            if (saveBtn && state === 'saved') {
                saveBtn.innerHTML = '<i class="bi bi-check"></i>';
                saveBtn.title = 'Saved';
                saveBtn.classList.add('success');
            }
        }
    }

    updateTabContainerHeight() {
        const contentTabs = document.querySelector('.content-tabs');
        const activeTabPane = document.querySelector('.tab-pane.active');

        if (contentTabs && activeTabPane) {
            const hasExpandedContent = activeTabPane.querySelector('.active');

            if (hasExpandedContent) {
                contentTabs.classList.add('has-expanded-content');
            } else {
                contentTabs.classList.remove('has-expanded-content');
            }
        }
    }

    updateSearchResultsHeader(data) {
        if (this.elements.resultsCount) {
            const count = data.total_results || this.state.searchResults.length;
            this.elements.resultsCount.textContent = `${this.formatNumber(count)} results`;
        }

        const resultsSource = document.getElementById('resultsSource');
        if (resultsSource) {
            const source = this.elements.searchSource?.value || 'TMDB';
            resultsSource.textContent = source.toUpperCase();
        }
    }

    setupLazyLoadingForCards(container = null) {
        const targetContainer = container || this.elements.searchResultsGrid;
        const cards = targetContainer?.querySelectorAll('.content-card img[data-src]');
        if (!cards || cards.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const imgSrc = img.dataset.src;

                    if (imgSrc) {
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            img.src = imgSrc;
                            img.classList.add('loaded');
                        };
                        tempImg.onerror = () => {
                            img.src = this.placeholderImage;
                            img.classList.add('loaded');
                        };
                        tempImg.src = imgSrc;
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: this.isMobile ? '50px' : '100px',
            threshold: 0.01
        });

        cards.forEach(img => observer.observe(img));
    }

    showSearchLoading() {
        if (this.elements.searchResultsContainer) {
            this.elements.searchResultsContainer.classList.add('active');

            if (this.elements.searchResultsGrid) {
                this.elements.searchResultsGrid.innerHTML = Array(12).fill(0).map(() => `
                    <div class="skeleton-card">
                        <div class="content-card-image">
                            <div class="skeleton skeleton-poster">
                                <div class="skeleton-shimmer"></div>
                            </div>
                        </div>
                        <div class="content-card-body">
                            <div class="skeleton skeleton-title">
                                <div class="skeleton-shimmer"></div>
                            </div>
                            <div class="skeleton skeleton-meta">
                                <div class="skeleton-shimmer"></div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    hideSearchLoading() {
    }

    clearSearch() {
        if (this.elements.contentSearchInput) {
            this.elements.contentSearchInput.value = '';
        }
        const searchClear = document.getElementById('contentSearchClear');
        if (searchClear) {
            searchClear.style.display = 'none';
        }
        this.clearSearchResults();
    }

    clearSearchResults() {
        this.state.searchResults = [];
        this.state.searchQuery = '';
        this.state.currentPage = 1;
        this.state.totalPages = 0;

        if (this.elements.searchResultsContainer) {
            this.elements.searchResultsContainer.classList.remove('active');
        }

        if (this.elements.searchPagination) {
            this.elements.searchPagination.style.display = 'none';
        }

        const searchClear = document.getElementById('contentSearchClear');
        if (searchClear) {
            searchClear.style.display = 'none';
        }

        this.updateTabContainerHeight();
    }

    getEmptyState(icon, title, message, collapsed = true) {
        if (collapsed) {
            return `
                <div class="empty-state">
                    <i class="bi bi-${icon}"></i>
                    <div class="empty-state-title">${title}</div>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <i class="bi bi-${icon}"></i>
                    <div class="empty-state-title">${title}</div>
                    <div class="empty-state-message">${message}</div>
                </div>
            `;
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
        // Primary real-time updates every 5 seconds
        this.updateTimer = setInterval(() => {
            if (!document.hidden) {
                this.loadQuickStats();
                this.loadSystemStatus();
            }
        }, this.updateInterval);

        // Super real-time updates every 2 seconds
        this.realtimeTimer = setInterval(() => {
            if (!document.hidden) {
                // Update current tab data if it's been more than 30 seconds
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

    addRealtimeAnimation(target) {
        switch (target) {
            case 'dashboard':
                const statsCards = document.querySelectorAll('.quick-stat-card');
                statsCards.forEach(card => {
                    card.classList.add('realtime-updating');
                    setTimeout(() => card.classList.remove('realtime-updating'), 2000);
                });
                break;

            case 'recommendations':
                const recItems = document.querySelectorAll('.recommendation-item');
                recItems.forEach(item => {
                    item.classList.add('realtime-updating');
                    setTimeout(() => item.classList.remove('realtime-updating'), 2000);
                });
                break;

            case 'upcoming':
                const upcomingCards = document.querySelectorAll('#savedContentGrid .content-card');
                upcomingCards.forEach(card => {
                    card.classList.add('realtime-updating');
                    setTimeout(() => card.classList.remove('realtime-updating'), 2000);
                });
                break;

            case 'analytics':
                const analyticsCards = document.querySelectorAll('.analytics-metric-card');
                analyticsCards.forEach(card => {
                    card.classList.add('realtime-updating');
                    setTimeout(() => card.classList.remove('realtime-updating'), 2000);
                });
                break;

            case 'recommendations-badge':
                const recBadge = this.elements.recommendationsCount;
                if (recBadge) {
                    recBadge.classList.add('realtime-updating');
                    setTimeout(() => recBadge.classList.remove('realtime-updating'), 2000);
                }
                break;

            case 'upcoming-badge':
                const upcomingBadge = this.elements.savedContentCount;
                if (upcomingBadge) {
                    upcomingBadge.classList.add('realtime-updating');
                    setTimeout(() => upcomingBadge.classList.remove('realtime-updating'), 2000);
                }
                break;
        }
    }

    showPullToRefreshIndicator() {
        if (!document.getElementById('pullToRefreshIndicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'pullToRefreshIndicator';
            indicator.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Release to refresh';
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
            const response = await fetch(`${this.apiBase}${endpoint}`, mergedOptions);

            if (response.status === 401) {
                localStorage.removeItem('cinebrain-token');
                localStorage.removeItem('cinebrain-user');
                window.location.href = '/auth/login.html';
                throw new Error('Authentication failed');
            }

            return response;
        } catch (error) {
            if (error.message === 'Authentication failed') {
                throw error;
            }
            console.error('API request failed:', error);
            throw new Error('Network error. Please check your connection.');
        }
    }

    getPosterUrl(content) {
        if (!content) return this.placeholderImage;

        if (content.poster_path) {
            if (content.poster_path.startsWith('http')) {
                return content.poster_path;
            } else {
                return `https://image.tmdb.org/t/p/w500${content.poster_path}`;
            }
        }

        return this.placeholderImage;
    }

    getContentTypeColor(type) {
        const colors = {
            'movie': '#e50914',
            'tv': '#113CCF',
            'anime': '#ff6b35',
            'series': '#113CCF',
            'show': '#113CCF'
        };
        return colors[type?.toLowerCase()] || '#6b7280';
    }

    getRecommendationStatusColor(status) {
        const colors = {
            'featured': '#e50914',
            'trending': '#113CCF',
            'hidden_gem': '#10b981',
            'classic': '#f59e0b',
            'new_release': '#8b5cf6'
        };
        return colors[status] || '#6b7280';
    }

    formatRating(rating) {
        if (!rating || rating === 0) return 'N/A';
        return Number(rating).toFixed(1);
    }

    extractYear(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).getFullYear();
        } catch {
            return '';
        }
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

document.addEventListener('DOMContentLoaded', () => {
    recommendationsManager = new AdminRecommendations();
});

window.addEventListener('beforeunload', () => {
    if (recommendationsManager) {
        recommendationsManager.destroy();
    }
});

window.AdminRecommendations = AdminRecommendations;
window.recommendationsManager = recommendationsManager;