class CineBrainUsersAdvancedAnalytics {
    constructor(coreInstance) {
        this.core = coreInstance;
        this.currentTab = 'overview';
        this.analyticsData = {
            segmentation: null,
            lifecycle: null,
            intelligence: null,
            anomalies: null,
            valueScores: null
        };

        this.chartInstances = new Map();
        this.refreshInterval = 30000; // 30 seconds
        this.refreshTimer = null;

        this.elements = {
            analyticsNav: null,
            analyticsTimeframe: null,
            tabContent: null,
            anomalyBadge: null,
            notificationBadge: null
        };

        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('📊 Initializing Advanced Analytics...');

            this.initializeElements();
            this.setupEventListeners();
            this.setupTabNavigation();

            await this.loadInitialAnalytics();
            this.startRealTimeUpdates();

            this.core.registerComponent('analytics', this);

            this.isInitialized = true;
            console.log('✅ Advanced Analytics initialized successfully');

        } catch (error) {
            console.error('❌ Advanced Analytics initialization failed:', error);
            throw error;
        }
    }

    initializeElements() {
        this.elements = {
            analyticsNav: document.getElementById('analyticsNav'),
            analyticsTimeframe: document.getElementById('analyticsTimeframe'),
            tabContent: document.getElementById('analyticsTabContent'),
            anomalyBadge: document.getElementById('anomalyBadge'),
            notificationBadge: document.getElementById('notificationBadge'),

            // Overview elements
            segmentationSummary: document.getElementById('segmentationSummary'),
            segmentationChart: document.getElementById('segmentationChart'),
            segmentDetails: document.getElementById('segmentDetails'),

            // Lifecycle elements
            discoveryCount: document.getElementById('discoveryCount'),
            discoveryPercentage: document.getElementById('discoveryPercentage'),
            activationCount: document.getElementById('activationCount'),
            activationPercentage: document.getElementById('activationPercentage'),
            engagementCount: document.getElementById('engagementCount'),
            engagementPercentage: document.getElementById('engagementPercentage'),
            retentionCount: document.getElementById('retentionCount'),
            retentionPercentage: document.getElementById('retentionPercentage'),
            onboardingFunnel: document.getElementById('onboardingFunnel'),
            cohortTable: document.getElementById('cohortTable'),

            // Intelligence elements
            valueScoreDistribution: document.getElementById('valueScoreDistribution'),
            behaviorChart: document.getElementById('behaviorChart'),
            behaviorPattern: document.getElementById('behaviorPattern'),
            valueUsersTable: document.getElementById('valueUsersTable'),
            refreshValueScores: document.getElementById('refreshValueScores'),

            // Anomalies elements
            anomalyAlertBanner: document.getElementById('anomalyAlertBanner'),
            anomalyAlertText: document.getElementById('anomalyAlertText'),
            dismissAnomalyAlert: document.getElementById('dismissAnomalyAlert'),
            suspiciousActivity: document.getElementById('suspiciousActivity'),
            potentialBots: document.getElementById('potentialBots'),
            spamIndicators: document.getElementById('spamIndicators'),
            securityConcerns: document.getElementById('securityConcerns'),
            suspiciousCount: document.getElementById('suspiciousCount'),
            botCount: document.getElementById('botCount'),
            spamCount: document.getElementById('spamCount'),
            securityCount: document.getElementById('securityCount'),

            // Modal elements
            behaviorIntelligenceBtn: document.getElementById('behaviorIntelligenceBtn'),
            behaviorIntelligenceModal: document.getElementById('behaviorIntelligenceModal'),
            behaviorIntelligenceModalBody: document.getElementById('behaviorIntelligenceModalBody'),
            advancedSearch: document.getElementById('advancedSearch'),
            advancedSearchModal: document.getElementById('advancedSearchModal'),
            advancedSearchForm: document.getElementById('advancedSearchForm'),
            clearAdvancedSearch: document.getElementById('clearAdvancedSearch')
        };
    }

    setupEventListeners() {
        // Analytics timeframe change
        if (this.elements.analyticsTimeframe) {
            this.elements.analyticsTimeframe.addEventListener('change', () => {
                this.handleTimeframeChange();
            });
        }

        // Behavior pattern change
        if (this.elements.behaviorPattern) {
            this.elements.behaviorPattern.addEventListener('change', () => {
                this.updateBehaviorChart();
            });
        }

        // Refresh value scores
        if (this.elements.refreshValueScores) {
            this.elements.refreshValueScores.addEventListener('click', () => {
                this.refreshValueScores();
            });
        }

        // Anomaly alert dismiss
        if (this.elements.dismissAnomalyAlert) {
            this.elements.dismissAnomalyAlert.addEventListener('click', () => {
                this.dismissAnomalyAlert();
            });
        }

        // Behavior intelligence modal
        if (this.elements.behaviorIntelligenceBtn) {
            this.elements.behaviorIntelligenceBtn.addEventListener('click', () => {
                this.showBehaviorIntelligenceModal();
            });
        }

        // Advanced search
        if (this.elements.advancedSearch) {
            this.elements.advancedSearch.addEventListener('click', () => {
                this.showAdvancedSearchModal();
            });
        }

        if (this.elements.advancedSearchForm) {
            this.elements.advancedSearchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdvancedSearch();
            });
        }

        if (this.elements.clearAdvancedSearch) {
            this.elements.clearAdvancedSearch.addEventListener('click', () => {
                this.clearAdvancedSearchForm();
            });
        }

        // Theme change detection for charts
        window.addEventListener('theme-changed', () => {
            this.updateChartsTheme();
        });

        // Visibility API for smart refresh
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentTab !== 'overview') {
                this.loadTabData(this.currentTab);
            }
        });
    }

    setupTabNavigation() {
        if (!this.elements.analyticsNav) return;

        const tabButtons = this.elements.analyticsNav.querySelectorAll('.nav-link');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = button.getAttribute('data-bs-target')?.replace('#', '');
                if (tabId) {
                    this.switchTab(tabId);
                }
            });
        });

        // Initialize with overview tab
        this.switchTab('overview');
    }

    async switchTab(tabId) {
        if (this.currentTab === tabId) return;

        this.currentTab = tabId;

        // Update active tab button
        const tabButtons = this.elements.analyticsNav.querySelectorAll('.nav-link');
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-bs-target') === `#${tabId}`) {
                btn.classList.add('active');
            }
        });

        // Show/hide tab content
        const tabPanes = this.elements.tabContent.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.remove('show', 'active');
            if (pane.id === tabId) {
                pane.classList.add('show', 'active');
            }
        });

        // Load tab data
        await this.loadTabData(tabId);

        // Track analytics usage
        this.trackAnalyticsUsage(tabId);
    }

    async loadTabData(tabId) {
        switch (tabId) {
            case 'segmentation':
                await this.loadSegmentationData();
                break;
            case 'lifecycle':
                await this.loadLifecycleData();
                break;
            case 'intelligence':
                await this.loadIntelligenceData();
                break;
            case 'anomalies':
                await this.loadAnomaliesData();
                break;
            default:
                break;
        }
    }

    async loadInitialAnalytics() {
        try {
            // Load anomalies first to show notifications
            await this.loadAnomaliesData();

        } catch (error) {
            console.error('❌ Error loading initial analytics:', error);
        }
    }

    // ==================== SEGMENTATION ANALYTICS ====================

    async loadSegmentationData() {
        if (this.analyticsData.segmentation) {
            this.renderSegmentationData(this.analyticsData.segmentation);
            return;
        }

        try {
            this.showTabLoading('segmentation', true);

            const response = await this.core.makeAuthenticatedRequest('/admin/users/segmentation');

            if (!response.ok) {
                throw new Error(`Failed to load segmentation data: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to load segmentation data');
            }

            this.analyticsData.segmentation = result.data;
            this.renderSegmentationData(result.data);

        } catch (error) {
            console.error('❌ Error loading segmentation data:', error);
            this.showTabError('segmentation', 'Failed to load user segmentation data');
        } finally {
            this.showTabLoading('segmentation', false);
        }
    }

    renderSegmentationData(data) {
        this.renderSegmentationSummary(data);
        this.renderSegmentationChart(data.segments);
        this.renderSegmentDetails(data.segments);
    }

    renderSegmentationSummary(data) {
        if (!this.elements.segmentationSummary) return;

        const segments = data.segments || {};
        const totalUsers = data.total_users || 0;

        const summaryCards = Object.entries(segments).map(([segmentName, segmentData]) => {
            const count = segmentData.count || 0;
            const percentage = segmentData.percentage || 0;
            const color = this.getSegmentColor(segmentName);

            return `
                <div class="segment-summary-card fade-in-analytics" style="--segment-color: ${color}">
                    <div class="segment-summary-count">${this.core.formatNumber(count)}</div>
                    <div class="segment-summary-label">${this.formatSegmentName(segmentName)}</div>
                    <div class="segment-summary-percentage">${percentage.toFixed(1)}%</div>
                </div>
            `;
        }).join('');

        this.elements.segmentationSummary.innerHTML = summaryCards;
    }

    renderSegmentationChart(segments) {
        if (!this.elements.segmentationChart) return;

        const ctx = this.elements.segmentationChart.getContext('2d');

        // Destroy existing chart
        const existingChart = this.chartInstances.get('segmentation');
        if (existingChart) {
            existingChart.destroy();
        }

        const labels = Object.keys(segments).map(key => this.formatSegmentName(key));
        const data = Object.values(segments).map(segment => segment.count || 0);
        const colors = Object.keys(segments).map(key => this.getSegmentColor(key));

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: this.getThemeColor('textPrimary'),
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: this.core.isMobile ? 11 : 12,
                                family: "'Inter', sans-serif"
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: this.getThemeColor('tooltipBg'),
                        titleColor: this.getThemeColor('textPrimary'),
                        bodyColor: this.getThemeColor('textPrimary'),
                        borderColor: this.getThemeColor('tooltipBorder'),
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${this.core.formatNumber(context.raw)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        this.chartInstances.set('segmentation', chart);
    }

    renderSegmentDetails(segments) {
        if (!this.elements.segmentDetails) return;

        const segmentItems = Object.entries(segments).map(([segmentName, segmentData]) => {
            const count = segmentData.count || 0;
            const percentage = segmentData.percentage || 0;
            const users = segmentData.users || [];
            const color = this.getSegmentColor(segmentName);

            return `
                <div class="segment-detail-item fade-in-analytics" style="--segment-color: ${color}" onclick="showSegmentUsers('${segmentName}')">
                    <div class="segment-detail-info">
                        <div class="segment-detail-name">${this.formatSegmentName(segmentName)}</div>
                        <div class="segment-detail-description">${this.getSegmentDescription(segmentName)}</div>
                    </div>
                    <div class="segment-detail-metrics">
                        <div class="segment-detail-count">${this.core.formatNumber(count)}</div>
                        <div class="segment-detail-percentage">${percentage.toFixed(1)}%</div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.segmentDetails.innerHTML = segmentItems;
    }

    // ==================== LIFECYCLE ANALYTICS ====================

    async loadLifecycleData() {
        if (this.analyticsData.lifecycle) {
            this.renderLifecycleData(this.analyticsData.lifecycle);
            return;
        }

        try {
            this.showTabLoading('lifecycle', true);

            const periodDays = this.getPeriodDays();
            const response = await this.core.makeAuthenticatedRequest(`/admin/users/lifecycle-analysis?period_days=${periodDays}`);

            if (!response.ok) {
                throw new Error(`Failed to load lifecycle data: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to load lifecycle data');
            }

            this.analyticsData.lifecycle = result.data;
            this.renderLifecycleData(result.data);

        } catch (error) {
            console.error('❌ Error loading lifecycle data:', error);
            this.showTabError('lifecycle', 'Failed to load lifecycle analysis data');
        } finally {
            this.showTabLoading('lifecycle', false);
        }
    }

    renderLifecycleData(data) {
        this.renderLifecycleStages(data.user_journey_stages);
        this.renderOnboardingFunnel(data.onboarding_funnel);
        this.renderCohortTable(data.retention_cohorts);
    }

    renderLifecycleStages(stages) {
        if (!stages) return;

        const stageElements = {
            discovery: { count: this.elements.discoveryCount, percentage: this.elements.discoveryPercentage },
            activation: { count: this.elements.activationCount, percentage: this.elements.activationPercentage },
            engagement: { count: this.elements.engagementCount, percentage: this.elements.engagementPercentage },
            retention: { count: this.elements.retentionCount, percentage: this.elements.retentionPercentage }
        };

        const stageCounts = stages.stage_counts || {};
        const stagePercentages = stages.stage_percentages || {};

        Object.keys(stageElements).forEach(stage => {
            const elements = stageElements[stage];
            const count = stageCounts[stage] || 0;
            const percentage = stagePercentages[stage] || 0;

            if (elements.count) {
                elements.count.textContent = this.core.formatNumber(count);
            }
            if (elements.percentage) {
                elements.percentage.textContent = `${percentage.toFixed(1)}%`;
            }
        });
    }

    renderOnboardingFunnel(funnelData) {
        if (!this.elements.onboardingFunnel || !funnelData) return;

        const steps = [
            {
                name: 'Registered',
                count: funnelData.total_registered || 0,
                color: '#6b7280',
                description: 'Users who signed up'
            },
            {
                name: 'Profile Complete',
                count: funnelData.completed_profile || 0,
                color: '#3b82f6',
                description: 'Added preferences/info'
            },
            {
                name: 'First Interaction',
                count: funnelData.first_interaction || 0,
                color: '#10b981',
                description: 'Engaged with content'
            },
            {
                name: 'Week 1 Retention',
                count: funnelData.first_week_retention || 0,
                color: '#8b5cf6',
                description: 'Active after 7 days'
            }
        ];

        const maxCount = Math.max(...steps.map(step => step.count));

        const funnelHTML = steps.map((step, index) => {
            const percentage = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
            const conversionRate = index > 0 ?
                (steps[index - 1].count > 0 ? (step.count / steps[index - 1].count) * 100 : 0) : 100;

            return `
                <div class="funnel-step fade-in-analytics" style="--step-percentage: ${percentage}%; --step-color: ${step.color}">
                    <div class="funnel-step-number">${index + 1}</div>
                    <div class="funnel-step-content">
                        <div class="funnel-step-title">${step.name}</div>
                        <div class="funnel-step-description">${step.description}</div>
                        <div class="funnel-step-metrics">
                            <span class="funnel-step-count">${this.core.formatNumber(step.count)}</span>
                            <span class="funnel-step-percentage">${percentage.toFixed(1)}%</span>
                            ${index > 0 ? `<span class="funnel-step-conversion">${conversionRate.toFixed(1)}% conversion</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.onboardingFunnel.innerHTML = funnelHTML;
    }

    renderCohortTable(cohortData) {
        if (!this.elements.cohortTable || !cohortData || !cohortData.cohorts) return;

        const cohorts = cohortData.cohorts;
        const cohortKeys = Object.keys(cohorts).slice(-6); // Show last 6 cohorts

        if (cohortKeys.length === 0) {
            this.elements.cohortTable.innerHTML = '<p class="text-muted">No cohort data available</p>';
            return;
        }

        const periods = ['day_7', 'day_14', 'day_30', 'day_60', 'day_90'];

        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Cohort</th>
                        <th>Size</th>
                        ${periods.map(period => `<th>${period.replace('day_', '')}d</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        cohortKeys.forEach(cohortKey => {
            const cohort = cohorts[cohortKey];
            const retentionRates = cohort.retention_rates || {};

            tableHTML += `
                <tr>
                    <td>${new Date(cohort.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td>${this.core.formatNumber(cohort.total_users || 0)}</td>
                    ${periods.map(period => {
                const rate = retentionRates[period]?.retention_rate || 0;
                return `<td><div class="cohort-cell" style="--retention-rate: ${rate}"><span class="cohort-cell-value">${rate.toFixed(0)}%</span></div></td>`;
            }).join('')}
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        this.elements.cohortTable.innerHTML = tableHTML;
    }

    // ==================== INTELLIGENCE ANALYTICS ====================

    async loadIntelligenceData() {
        try {
            this.showTabLoading('intelligence', true);

            const [valueScoresResponse, behaviorDataResponse] = await Promise.allSettled([
                this.loadValueScores(),
                this.loadBehaviorData()
            ]);

            if (valueScoresResponse.status === 'fulfilled') {
                this.renderValueScoreDistribution(valueScoresResponse.value);
            }

            if (behaviorDataResponse.status === 'fulfilled') {
                this.renderBehaviorChart(behaviorDataResponse.value);
            }

        } catch (error) {
            console.error('❌ Error loading intelligence data:', error);
            this.showTabError('intelligence', 'Failed to load intelligence data');
        } finally {
            this.showTabLoading('intelligence', false);
        }
    }

    async loadValueScores() {
        if (this.analyticsData.valueScores) {
            return this.analyticsData.valueScores;
        }

        const response = await this.core.makeAuthenticatedRequest('/admin/users/value-scores');

        if (!response.ok) {
            throw new Error(`Failed to load value scores: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to load value scores');
        }

        this.analyticsData.valueScores = result.data;
        return result.data;
    }

    async loadBehaviorData() {
        // Mock behavior data - in real implementation, this would come from analytics endpoint
        return {
            activity_patterns: {
                peak_hours: [19, 20, 21],
                peak_days: [5, 6, 0], // Fri, Sat, Sun
                pattern: 'evening_weekend'
            },
            content_consumption: {
                avg_session_time: 1847,
                bounce_rate: 0.23,
                pages_per_session: 4.7
            },
            interaction_patterns: {
                most_common: 'rating',
                diversity_score: 0.78,
                engagement_depth: 'high'
            }
        };
    }

    renderValueScoreDistribution(data) {
        if (!this.elements.valueScoreDistribution) return;

        const distribution = data.distribution || {};
        const averageScore = data.average_score || 0;

        const tiers = [
            { name: 'Platinum', key: 'high_value', color: '#e5e7eb', description: '80-100 points', count: distribution.high_value || 0 },
            { name: 'Gold', key: 'medium_high', color: '#fbbf24', description: '60-79 points', count: Math.floor((distribution.medium_value || 0) * 0.6) },
            { name: 'Silver', key: 'medium_low', color: '#9ca3af', description: '40-59 points', count: Math.floor((distribution.medium_value || 0) * 0.4) },
            { name: 'Bronze', key: 'low_value', color: '#92400e', description: '0-39 points', count: distribution.low_value || 0 }
        ];

        const totalUsers = data.total_users || 1;

        const tiersHTML = tiers.map(tier => {
            const percentage = (tier.count / totalUsers) * 100;

            return `
                <div class="value-tier ${tier.name.toLowerCase()} fade-in-analytics" style="--tier-color: ${tier.color}">
                    <div class="value-tier-info">
                        <div class="value-tier-icon">
                            <i data-feather="award"></i>
                        </div>
                        <div class="value-tier-details">
                            <div class="value-tier-name">${tier.name}</div>
                            <div class="value-tier-description">${tier.description}</div>
                        </div>
                    </div>
                    <div class="value-tier-metrics">
                        <div class="value-tier-count">${this.core.formatNumber(tier.count)}</div>
                        <div class="value-tier-percentage">${percentage.toFixed(1)}%</div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.valueScoreDistribution.innerHTML = `
            <div class="mb-3">
                <h6>Average Score: <strong>${averageScore.toFixed(1)}</strong></div>
            </div>
            ${tiersHTML}
        `;

        this.renderValueUsersTable(data.users || []);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderValueUsersTable(users) {
        if (!this.elements.valueUsersTable) return;

        if (!users.length) {
            this.elements.valueUsersTable.innerHTML = '<p class="text-muted text-center">No value score data available</p>';
            return;
        }

        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Value Score</th>
                        <th>Tier</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.slice(0, 10).map(user => `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center gap-2">
                                    <div class="user-avatar-small">
                                        <i data-feather="user"></i>
                                    </div>
                                    <div>
                                        <div class="fw-semibold">${this.escapeHtml(user.username)}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${this.escapeHtml(user.email)}</td>
                            <td>
                                <strong>${user.value_score.toFixed(1)}</strong>
                            </td>
                            <td>
                                <span class="value-score-badge ${user.tier}">${user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}</span>
                            </td>
                            <td>
                                <button class="btn btn-outline-primary btn-sm" onclick="cineBrainUsersModals.showUserDetails(${user.user_id})">
                                    <i data-feather="eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        this.elements.valueUsersTable.innerHTML = tableHTML;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderBehaviorChart(data) {
        if (!this.elements.behaviorChart) return;

        const ctx = this.elements.behaviorChart.getContext('2d');

        // Destroy existing chart
        const existingChart = this.chartInstances.get('behavior');
        if (existingChart) {
            existingChart.destroy();
        }

        // Generate sample behavior data based on pattern
        const pattern = this.elements.behaviorPattern?.value || 'activity';
        const chartData = this.generateBehaviorChartData(pattern, data);

        const chart = new Chart(ctx, {
            type: chartData.type,
            data: chartData.data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: chartData.type !== 'line',
                        position: 'bottom',
                        labels: {
                            color: this.getThemeColor('textPrimary'),
                            font: {
                                size: this.core.isMobile ? 11 : 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: this.getThemeColor('tooltipBg'),
                        titleColor: this.getThemeColor('textPrimary'),
                        bodyColor: this.getThemeColor('textPrimary'),
                        borderColor: this.getThemeColor('tooltipBorder'),
                        borderWidth: 1
                    }
                },
                scales: chartData.type === 'line' ? {
                    x: {
                        ticks: { color: this.getThemeColor('textMuted') },
                        grid: { color: this.getThemeColor('gridColor') }
                    },
                    y: {
                        ticks: { color: this.getThemeColor('textMuted') },
                        grid: { color: this.getThemeColor('gridColor') }
                    }
                } : undefined
            }
        });

        this.chartInstances.set('behavior', chart);
    }

    generateBehaviorChartData(pattern, data) {
        const colors = ['#e50914', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

        switch (pattern) {
            case 'activity':
                return {
                    type: 'line',
                    data: {
                        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                        datasets: [{
                            label: 'Daily Activity',
                            data: [65, 59, 80, 81, 96, 87, 74],
                            borderColor: colors[0],
                            backgroundColor: colors[0] + '20',
                            tension: 0.4
                        }]
                    }
                };
            case 'content':
                return {
                    type: 'doughnut',
                    data: {
                        labels: ['Movies', 'TV Shows', 'Anime', 'Documentaries'],
                        datasets: [{
                            data: [45, 30, 15, 10],
                            backgroundColor: colors.slice(0, 4)
                        }]
                    }
                };
            case 'interaction':
                return {
                    type: 'bar',
                    data: {
                        labels: ['Ratings', 'Favorites', 'Watchlist', 'Reviews', 'Likes'],
                        datasets: [{
                            data: [120, 89, 67, 45, 98],
                            backgroundColor: colors.slice(0, 5)
                        }]
                    }
                };
            case 'session':
                return {
                    type: 'line',
                    data: {
                        labels: ['0-5min', '5-15min', '15-30min', '30-60min', '60min+'],
                        datasets: [{
                            label: 'Session Duration',
                            data: [25, 45, 65, 40, 20],
                            borderColor: colors[1],
                            backgroundColor: colors[1] + '20',
                            tension: 0.4
                        }]
                    }
                };
            default:
                return this.generateBehaviorChartData('activity', data);
        }
    }

    // ==================== ANOMALIES ANALYTICS ====================

    async loadAnomaliesData() {
        try {
            const periodDays = this.getPeriodDays();
            const response = await this.core.makeAuthenticatedRequest(`/admin/users/anomalies?period_days=${periodDays}`);

            if (!response.ok) {
                throw new Error(`Failed to load anomalies data: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to load anomalies data');
            }

            this.analyticsData.anomalies = result.data;
            this.renderAnomaliesData(result.data);
            this.updateAnomalyNotifications(result.data);

        } catch (error) {
            console.error('❌ Error loading anomalies data:', error);
            if (this.currentTab === 'anomalies') {
                this.showTabError('anomalies', 'Failed to load anomalies data');
            }
        }
    }

    renderAnomaliesData(data) {
        const anomalies = data.anomalies || {};

        this.renderAnomalySection('suspiciousActivity', anomalies.suspicious_activity || [], 'suspicious');
        this.renderAnomalySection('potentialBots', anomalies.potential_bots || [], 'bot');
        this.renderAnomalySection('spamIndicators', anomalies.spam_indicators || [], 'spam');
        this.renderAnomalySection('securityConcerns', anomalies.security_concerns || [], 'security');

        // Update counts
        this.updateAnomalyCounts(anomalies);

        // Show/hide alert banner
        const totalAnomalies = data.total_anomalies || 0;
        if (totalAnomalies > 0) {
            this.showAnomalyAlert(totalAnomalies);
        } else {
            this.hideAnomalyAlert();
        }
    }

    renderAnomalySection(elementId, anomalies, type) {
        const element = this.elements[elementId];
        if (!element) return;

        if (!anomalies.length) {
            element.innerHTML = '<div class="text-muted text-center p-3">No anomalies detected</div>';
            return;
        }

        const anomaliesHTML = anomalies.map(anomaly => `
            <div class="anomaly-item ${anomaly.risk_level || 'medium'} fade-in-analytics">
                <div class="anomaly-header">
                    <div class="anomaly-user">@${this.escapeHtml(anomaly.username)}</div>
                    <div class="anomaly-risk-level ${anomaly.risk_level || 'medium'}">${anomaly.risk_level || 'Medium'}</div>
                </div>
                <div class="anomaly-description">${this.escapeHtml(anomaly.details)}</div>
                <div class="anomaly-actions">
                    <button class="anomaly-action-btn" onclick="cineBrainUsersModals.showUserDetails(${anomaly.user_id})">
                        <i data-feather="eye"></i>
                        View User
                    </button>
                    <button class="anomaly-action-btn" onclick="toggleUserStatus(${anomaly.user_id})">
                        <i data-feather="shield"></i>
                        Take Action
                    </button>
                </div>
            </div>
        `).join('');

        element.innerHTML = anomaliesHTML;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    updateAnomalyCounts(anomalies) {
        const counts = {
            suspiciousCount: (anomalies.suspicious_activity || []).length,
            botCount: (anomalies.potential_bots || []).length,
            spamCount: (anomalies.spam_indicators || []).length,
            securityCount: (anomalies.security_concerns || []).length
        };

        Object.entries(counts).forEach(([elementId, count]) => {
            const element = this.elements[elementId];
            if (element) {
                element.textContent = count.toString();
            }
        });
    }

    updateAnomalyNotifications(data) {
        const totalAnomalies = data.total_anomalies || 0;

        if (this.elements.anomalyBadge) {
            if (totalAnomalies > 0) {
                this.elements.anomalyBadge.textContent = totalAnomalies.toString();
                this.elements.anomalyBadge.style.display = 'inline-block';
            } else {
                this.elements.anomalyBadge.style.display = 'none';
            }
        }

        // Update general notification badge
        if (this.elements.notificationBadge) {
            const currentNotifications = parseInt(this.elements.notificationBadge.textContent || '0');
            const newTotal = currentNotifications + totalAnomalies;

            if (newTotal > 0) {
                this.elements.notificationBadge.textContent = newTotal.toString();
                this.elements.notificationBadge.style.display = 'inline-block';
            }
        }
    }

    showAnomalyAlert(count) {
        if (!this.elements.anomalyAlertBanner) return;

        this.elements.anomalyAlertText.textContent =
            `${count} anomal${count === 1 ? 'y' : 'ies'} detected. Please review for potential security concerns.`;

        this.elements.anomalyAlertBanner.style.display = 'flex';
    }

    hideAnomalyAlert() {
        if (this.elements.anomalyAlertBanner) {
            this.elements.anomalyAlertBanner.style.display = 'none';
        }
    }

    dismissAnomalyAlert() {
        this.hideAnomalyAlert();
        localStorage.setItem('anomaly-alert-dismissed', Date.now().toString());
    }

    // ==================== MODALS ====================

    showBehaviorIntelligenceModal() {
        if (!this.core.currentUser || !this.elements.behaviorIntelligenceModal) return;

        // Get the current user being viewed (if any)
        const userId = this.getCurrentUserIdFromModal();

        if (userId) {
            this.loadAndShowBehaviorIntelligence(userId);
        } else {
            this.core.showToast('Please select a user first', 'warning');
        }
    }

    async loadAndShowBehaviorIntelligence(userId) {
        try {
            this.core.showLoading(true, 'Loading behavior intelligence...');

            const response = await this.core.makeAuthenticatedRequest(`/admin/users/${userId}/behavior-intelligence`);

            if (!response.ok) {
                throw new Error(`Failed to load behavior intelligence: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to load behavior intelligence');
            }

            this.renderBehaviorIntelligenceModal(result.data);

            const modal = new bootstrap.Modal(this.elements.behaviorIntelligenceModal);
            modal.show();

        } catch (error) {
            console.error('❌ Error loading behavior intelligence:', error);
            this.core.handleError('Failed to load behavior intelligence', error);
        } finally {
            this.core.showLoading(false);
        }
    }

    renderBehaviorIntelligenceModal(data) {
        if (!this.elements.behaviorIntelligenceModalBody) return;

        const sections = [
            {
                title: 'Activity Patterns',
                icon: 'activity',
                data: data.activity_patterns || {},
                render: this.renderActivityPatternsSection.bind(this)
            },
            {
                title: 'Content Consumption',
                icon: 'play-circle',
                data: data.content_consumption || {},
                render: this.renderContentConsumptionSection.bind(this)
            },
            {
                title: 'Interaction Patterns',
                icon: 'zap',
                data: data.interaction_patterns || {},
                render: this.renderInteractionPatternsSection.bind(this)
            },
            {
                title: 'Social Behavior',
                icon: 'users',
                data: data.social_behavior || {},
                render: this.renderSocialBehaviorSection.bind(this)
            }
        ];

        const sectionsHTML = sections.map(section => `
            <div class="behavior-section">
                <div class="behavior-section-header">
                    <i data-feather="${section.icon}" class="behavior-section-icon"></i>
                    <h5 class="behavior-section-title">${section.title}</h5>
                </div>
                <div class="behavior-section-content">
                    ${section.render(section.data)}
                </div>
            </div>
        `).join('');

        this.elements.behaviorIntelligenceModalBody.innerHTML = `
            <div class="behavior-intelligence-content">
                ${sectionsHTML}
            </div>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderActivityPatternsSection(data) {
        const pattern = data.pattern || 'unknown';
        const peakHours = data.peak_hours || [];
        const peakDays = data.peak_days || [];

        return `
            <div class="behavior-metrics-grid">
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${pattern.replace('_', ' ').toUpperCase()}</div>
                    <div class="behavior-metric-label">Activity Pattern</div>
                </div>
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${peakHours.join(', ')}:00</div>
                    <div class="behavior-metric-label">Peak Hours</div>
                </div>
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${this.formatPeakDays(peakDays)}</div>
                    <div class="behavior-metric-label">Peak Days</div>
                </div>
            </div>
        `;
    }

    renderContentConsumptionSection(data) {
        const totalConsumed = data.total_consumed || 0;
        const avgRating = data.average_rating || 0;
        const topGenres = data.top_genres || [];

        return `
            <div class="behavior-metrics-grid">
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${this.core.formatNumber(totalConsumed)}</div>
                    <div class="behavior-metric-label">Total Content</div>
                </div>
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${avgRating.toFixed(1)}</div>
                    <div class="behavior-metric-label">Avg Rating</div>
                </div>
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${topGenres.slice(0, 2).join(', ')}</div>
                    <div class="behavior-metric-label">Top Genres</div>
                </div>
            </div>
        `;
    }

    renderInteractionPatternsSection(data) {
        const dominantInteraction = data.dominant_interaction || 'unknown';
        const totalInteractions = data.total_interactions || 0;
        const diversityScore = data.diversity_score || 0;

        return `
            <div class="behavior-metrics-grid">
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${dominantInteraction.toUpperCase()}</div>
                    <div class="behavior-metric-label">Most Common</div>
                </div>
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${this.core.formatNumber(totalInteractions)}</div>
                    <div class="behavior-metric-label">Total Interactions</div>
                </div>
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${(diversityScore * 100).toFixed(0)}%</div>
                    <div class="behavior-metric-label">Diversity Score</div>
                </div>
            </div>
        `;
    }

    renderSocialBehaviorSection(data) {
        const socialScore = data.social_score || 0;
        const socialType = data.social_type || 'unknown';
        const behaviors = data.behaviors || [];

        return `
            <div class="behavior-metrics-grid">
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${socialScore}</div>
                    <div class="behavior-metric-label">Social Score</div>
                </div>
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${socialType.replace('_', ' ').toUpperCase()}</div>
                    <div class="behavior-metric-label">Social Type</div>
                </div>
                <div class="behavior-metric">
                    <div class="behavior-metric-value">${behaviors.length}</div>
                    <div class="behavior-metric-label">Active Behaviors</div>
                </div>
            </div>
        `;
    }

    showAdvancedSearchModal() {
        if (this.elements.advancedSearchModal) {
            const modal = new bootstrap.Modal(this.elements.advancedSearchModal);
            modal.show();
        }
    }

    async handleAdvancedSearch() {
        try {
            const formData = this.getAdvancedSearchFormData();

            this.core.showLoading(true, 'Searching users...');

            const response = await this.core.makeAuthenticatedRequest('/admin/users/advanced-search', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Search failed: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Search failed');
            }

            // Close modal
            const modal = bootstrap.Modal.getInstance(this.elements.advancedSearchModal);
            if (modal) {
                modal.hide();
            }

            // Apply search results to main table
            this.applyAdvancedSearchResults(result.data);

            this.core.showToast(`Found ${result.data.total_found} users`, 'success');

        } catch (error) {
            console.error('❌ Advanced search error:', error);
            this.core.handleError('Advanced search failed', error);
        } finally {
            this.core.showLoading(false);
        }
    }

    getAdvancedSearchFormData() {
        const form = this.elements.advancedSearchForm;
        if (!form) return {};

        return {
            text: form.querySelector('#searchText')?.value || '',
            location: form.querySelector('#searchLocation')?.value || '',
            registration_date_from: form.querySelector('#searchRegistrationFrom')?.value || '',
            registration_date_to: form.querySelector('#searchRegistrationTo')?.value || '',
            last_active_from: form.querySelector('#searchLastActiveFrom')?.value || '',
            last_active_to: form.querySelector('#searchLastActiveTo')?.value || '',
            account_status: form.querySelector('#searchAccountStatus')?.value || ''
        };
    }

    applyAdvancedSearchResults(searchData) {
        // Update core state with search results
        this.core.state.users.list = searchData.users || [];
        this.core.state.users.total = searchData.total_found || 0;

        // Update pagination
        this.core.state.pagination = {
            page: 1,
            per_page: searchData.users?.length || 0,
            total: searchData.total_found || 0,
            total_pages: 1,
            has_prev: false,
            has_next: false
        };

        // Render updated table
        if (this.core.components.tables) {
            this.core.components.tables.renderUsers(this.core.state.users.list);
            this.core.components.tables.renderPagination(this.core.state.pagination);
        }
    }

    clearAdvancedSearchForm() {
        const form = this.elements.advancedSearchForm;
        if (form) {
            form.reset();
        }
    }

    // ==================== UTILITY METHODS ====================

    async refreshValueScores() {
        try {
            this.core.showLoading(true, 'Recalculating value scores...');

            // Clear cached data
            this.analyticsData.valueScores = null;

            // Reload value scores
            const data = await this.loadValueScores();
            this.renderValueScoreDistribution(data);

            this.core.showToast('Value scores updated successfully', 'success');

        } catch (error) {
            console.error('❌ Error refreshing value scores:', error);
            this.core.handleError('Failed to refresh value scores', error);
        } finally {
            this.core.showLoading(false);
        }
    }

    async updateBehaviorChart() {
        const data = await this.loadBehaviorData();
        this.renderBehaviorChart(data);
    }

    handleTimeframeChange() {
        const newTimeframe = this.elements.analyticsTimeframe?.value || 'week';

        // Clear cached data for current tab
        if (this.currentTab !== 'overview') {
            this.analyticsData[this.currentTab] = null;
        }

        // Update core analytics period
        this.core.state.analytics.period = this.timeframeToPeriod(newTimeframe);

        // Reload current tab data
        this.loadTabData(this.currentTab);

        console.log(`📊 Analytics timeframe changed to ${newTimeframe}`);
    }

    timeframeToPeriod(timeframe) {
        const mapping = {
            'today': '1d',
            'week': '7d',
            'month': '30d',
            'quarter': '90d',
            'year': '365d'
        };
        return mapping[timeframe] || '30d';
    }

    getPeriodDays() {
        const timeframe = this.elements.analyticsTimeframe?.value || 'month';
        const mapping = {
            'today': 1,
            'week': 7,
            'month': 30,
            'quarter': 90,
            'year': 365
        };
        return mapping[timeframe] || 30;
    }

    getCurrentUserIdFromModal() {
        // Try to get user ID from the currently open user details modal
        const modal = document.getElementById('userDetailsModal');
        if (modal && modal.classList.contains('show')) {
            const editBtn = document.getElementById('editUserBtn');
            if (editBtn && this.core.components.modals && this.core.components.modals.currentUser) {
                return this.core.components.modals.currentUser.id;
            }
        }
        return null;
    }

    getSegmentColor(segmentName) {
        const colors = {
            power_users: '#e50914',
            casual_users: '#3b82f6',
            new_users: '#10b981',
            churned_users: '#6b7280',
            at_risk_users: '#f59e0b',
            high_value_users: '#8b5cf6',
            content_creators: '#ec4899',
            lurkers: '#64748b'
        };
        return colors[segmentName] || '#6b7280';
    }

    formatSegmentName(segmentName) {
        return segmentName.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    getSegmentDescription(segmentName) {
        const descriptions = {
            power_users: 'Highly engaged users with frequent interactions',
            casual_users: 'Regular users with moderate engagement',
            new_users: 'Recently registered users (last 7 days)',
            churned_users: 'Users who haven\'t been active recently',
            at_risk_users: 'Users showing declining engagement',
            high_value_users: 'Most valuable users based on activity and tenure',
            content_creators: 'Users who create reviews and content',
            lurkers: 'Users who browse but rarely interact'
        };
        return descriptions[segmentName] || 'User segment';
    }

    formatPeakDays(dayNumbers) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return dayNumbers.map(num => days[num] || '?').join(', ');
    }

    getThemeColor(colorType) {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';

        const colors = {
            dark: {
                textPrimary: '#f9fafb',
                textMuted: '#d1d5db',
                tooltipBg: 'rgba(0, 0, 0, 0.9)',
                tooltipBorder: 'rgba(255, 255, 255, 0.2)',
                gridColor: 'rgba(255, 255, 255, 0.1)'
            },
            light: {
                textPrimary: '#1f2937',
                textMuted: '#6b7280',
                tooltipBg: 'rgba(255, 255, 255, 0.95)',
                tooltipBorder: 'rgba(0, 0, 0, 0.1)',
                gridColor: 'rgba(0, 0, 0, 0.05)'
            }
        };

        return colors[theme]?.[colorType] || colors.dark[colorType];
    }

    updateChartsTheme() {
        this.chartInstances.forEach((chart, chartId) => {
            try {
                this.updateSingleChartTheme(chart);
                chart.update('none');
            } catch (error) {
                console.error(`❌ Error updating theme for chart ${chartId}:`, error);
            }
        });
    }

    updateSingleChartTheme(chart) {
        const options = chart.options;

        if (options.plugins?.legend?.labels) {
            options.plugins.legend.labels.color = this.getThemeColor('textPrimary');
        }

        if (options.plugins?.tooltip) {
            const tooltip = options.plugins.tooltip;
            tooltip.backgroundColor = this.getThemeColor('tooltipBg');
            tooltip.titleColor = this.getThemeColor('textPrimary');
            tooltip.bodyColor = this.getThemeColor('textPrimary');
            tooltip.borderColor = this.getThemeColor('tooltipBorder');
        }

        if (options.scales) {
            Object.keys(options.scales).forEach(scaleKey => {
                const scale = options.scales[scaleKey];
                if (scale.ticks) scale.ticks.color = this.getThemeColor('textMuted');
                if (scale.grid) scale.grid.color = this.getThemeColor('gridColor');
            });
        }
    }

    showTabLoading(tabId, show) {
        const tabPane = document.getElementById(tabId);
        if (!tabPane) return;

        if (show) {
            if (!tabPane.querySelector('.tab-loading')) {
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'tab-loading text-center p-4';
                loadingDiv.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
                tabPane.appendChild(loadingDiv);
            }
        } else {
            const loadingDiv = tabPane.querySelector('.tab-loading');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }
    }

    showTabError(tabId, message) {
        const tabPane = document.getElementById(tabId);
        if (!tabPane) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'tab-error text-center p-4';
        errorDiv.innerHTML = `
            <div class="text-muted">
                <i data-feather="alert-triangle" class="mb-2"></i>
                <p>${message}</p>
                <button class="btn btn-outline-primary btn-sm" onclick="location.reload()">
                    <i data-feather="refresh-cw"></i> Retry
                </button>
            </div>
        `;

        tabPane.innerHTML = '';
        tabPane.appendChild(errorDiv);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    trackAnalyticsUsage(tabId) {
        // Track which analytics tabs are being used
        const usage = JSON.parse(localStorage.getItem('analytics-usage') || '{}');
        usage[tabId] = (usage[tabId] || 0) + 1;
        usage[`${tabId}_last_visit`] = Date.now();
        localStorage.setItem('analytics-usage', JSON.stringify(usage));
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    startRealTimeUpdates() {
        this.refreshTimer = setInterval(() => {
            if (!document.hidden && this.currentTab === 'anomalies') {
                this.loadAnomaliesData();
            }
        }, this.refreshInterval);
    }

    stopRealTimeUpdates() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    handleDeviceChange() {
        // Recreate charts for new device layout
        this.chartInstances.forEach((chart, chartId) => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    destroy() {
        console.log('🗑 Destroying Advanced Analytics...');

        this.stopRealTimeUpdates();

        // Destroy all charts
        this.chartInstances.forEach((chart, chartId) => {
            try {
                chart.destroy();
            } catch (error) {
                console.error(`Error destroying chart ${chartId}:`, error);
            }
        });
        this.chartInstances.clear();

        // Clear data
        this.analyticsData = {};
        this.elements = {};
        this.core = null;
        this.isInitialized = false;

        console.log('🗑 Advanced Analytics destroyed');
    }
}

// Global functions for onclick handlers
window.showSegmentUsers = function (segmentName) {
    console.log(`Showing users for segment: ${segmentName}`);
    // TODO: Implement segment users modal
};

// Initialize when DOM is ready
let cineBrainAdvancedAnalytics;

document.addEventListener('DOMContentLoaded', () => {
    if (window.cineBrainUsersCore) {
        initializeAdvancedAnalytics();
    } else {
        setTimeout(initializeAdvancedAnalytics, 200);
    }
});

async function initializeAdvancedAnalytics() {
    try {
        if (!window.cineBrainUsersCore) {
            console.warn('⚠️ Core not ready, retrying...');
            setTimeout(initializeAdvancedAnalytics, 200);
            return;
        }

        cineBrainAdvancedAnalytics = new CineBrainUsersAdvancedAnalytics(window.cineBrainUsersCore);
        await cineBrainAdvancedAnalytics.init();

        window.cineBrainAdvancedAnalytics = cineBrainAdvancedAnalytics;

        console.log('✅ Advanced Analytics initialized successfully');

    } catch (error) {
        console.error('❌ Advanced Analytics initialization failed:', error);
    }
}

window.addEventListener('beforeunload', () => {
    if (cineBrainAdvancedAnalytics) {
        cineBrainAdvancedAnalytics.destroy();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainUsersAdvancedAnalytics;
} else {
    window.CineBrainUsersAdvancedAnalytics = CineBrainUsersAdvancedAnalytics;
}   