class CineBrainUsersChartsManager {
    constructor(coreInstance) {
        this.core = coreInstance;
        this.charts = {};
        this.chartInstances = new Map();
        this.chartConfig = {
            animationDuration: 750,
            animationEasing: 'easeInOutQuart',
            responsive: true,
            maintainAspectRatio: false
        };

        // Chart data cache
        this.chartData = {
            userActivity: {
                labels: [],
                datasets: []
            },
            userGrowth: {
                labels: [],
                datasets: []
            },
            engagement: {
                metrics: [],
                trends: []
            }
        };

        // Elements will be set during initialization
        this.elements = {
            userActivityChart: null,
            activityChartPeriod: null,
            engagementMetrics: null
        };

        this.isInitialized = false;
        this.currentTheme = this.detectTheme();
    }

    async init() {
        try {
            console.log('🎨 Initializing CineBrain Charts Manager...');

            // Get chart elements
            this.initializeElements();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize Chart.js with default config
            this.configureChartDefaults();

            // Initialize all charts
            await this.initializeAllCharts();

            // Register with core
            this.core.registerComponent('charts', this);

            this.isInitialized = true;
            console.log('✅ Charts Manager initialized successfully');

        } catch (error) {
            console.error('❌ Charts Manager initialization failed:', error);
            throw error;
        }
    }

    initializeElements() {
        this.elements = {
            userActivityChart: document.getElementById('userActivityChart'),
            activityChartPeriod: document.getElementById('activityChartPeriod'),
            engagementMetrics: document.getElementById('engagementMetrics')
        };

        // Validate required elements
        if (!this.elements.userActivityChart) {
            throw new Error('Required chart canvas element not found');
        }
    }

    setupEventListeners() {
        // Chart period selector
        if (this.elements.activityChartPeriod) {
            this.elements.activityChartPeriod.addEventListener('change', () => {
                this.handlePeriodChange();
            });
        }

        // Theme change detection
        window.addEventListener('theme-changed', () => {
            this.handleThemeChange();
        });

        // Resize handling
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        // Orientation change for mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 300);
        });
    }

    configureChartDefaults() {
        // Set global Chart.js defaults
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
            Chart.defaults.animation.duration = this.chartConfig.animationDuration;
            Chart.defaults.animation.easing = this.chartConfig.animationEasing;
            Chart.defaults.responsive = true;
            Chart.defaults.maintainAspectRatio = false;
            Chart.defaults.interaction.intersect = false;
            Chart.defaults.interaction.mode = 'index';
        }
    }

    // ==================== CHART INITIALIZATION ====================

    async initializeAllCharts() {
        try {
            // Initialize main activity chart
            await this.initializeUserActivityChart();

            console.log('✅ All charts initialized');
        } catch (error) {
            console.error('❌ Error initializing charts:', error);
            throw error;
        }
    }

    async initializeUserActivityChart() {
        const ctx = this.elements.userActivityChart?.getContext('2d');
        if (!ctx) {
            throw new Error('Cannot get canvas context for user activity chart');
        }

        try {
            // Create gradients
            const gradients = this.createChartGradients(ctx);

            // Build chart configuration
            const config = this.buildActivityChartConfig(gradients);

            // Create chart instance
            const chart = new Chart(ctx, config);
            this.chartInstances.set('userActivity', chart);

            console.log('✅ User Activity Chart initialized');

        } catch (error) {
            console.error('❌ Error creating user activity chart:', error);
            throw error;
        }
    }

    createChartGradients(ctx) {
        const canvas = ctx.canvas;
        const height = canvas.height || 400;

        // Active users gradient
        const gradientActive = ctx.createLinearGradient(0, 0, 0, height);
        gradientActive.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        gradientActive.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
        gradientActive.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

        // New users gradient
        const gradientNew = ctx.createLinearGradient(0, 0, 0, height);
        gradientNew.addColorStop(0, 'rgba(17, 60, 207, 0.4)');
        gradientNew.addColorStop(0.5, 'rgba(17, 60, 207, 0.2)');
        gradientNew.addColorStop(1, 'rgba(17, 60, 207, 0.01)');

        // Engagement gradient
        const gradientEngagement = ctx.createLinearGradient(0, 0, 0, height);
        gradientEngagement.addColorStop(0, 'rgba(229, 9, 20, 0.4)');
        gradientEngagement.addColorStop(0.5, 'rgba(229, 9, 20, 0.2)');
        gradientEngagement.addColorStop(1, 'rgba(229, 9, 20, 0.01)');

        return {
            active: gradientActive,
            new: gradientNew,
            engagement: gradientEngagement
        };
    }

    buildActivityChartConfig(gradients) {
        const colors = this.getThemeColors();
        const isMobile = this.core.isMobile;

        return {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Active Users',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: gradients.active,
                        tension: 0.4,
                        fill: true,
                        borderWidth: isMobile ? 2 : 3,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: colors.chartPointBorder,
                        pointBorderWidth: 2,
                        pointRadius: isMobile ? 3 : 4,
                        pointHoverRadius: isMobile ? 5 : 6,
                        pointHitRadius: isMobile ? 10 : 15
                    },
                    {
                        label: 'New Users',
                        data: [],
                        borderColor: '#113CCF',
                        backgroundColor: gradients.new,
                        tension: 0.4,
                        fill: true,
                        borderWidth: isMobile ? 2 : 3,
                        pointBackgroundColor: '#113CCF',
                        pointBorderColor: colors.chartPointBorder,
                        pointBorderWidth: 2,
                        pointRadius: isMobile ? 3 : 4,
                        pointHoverRadius: isMobile ? 5 : 6,
                        pointHitRadius: isMobile ? 10 : 15
                    }
                ]
            },
            options: this.buildChartOptions(colors, isMobile)
        };
    }

    buildChartOptions(colors, isMobile = false) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: this.chartConfig.animationDuration,
                easing: this.chartConfig.animationEasing
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
                            family: "'Inter', sans-serif",
                            weight: '500'
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
                    },
                    callbacks: {
                        title: (context) => {
                            if (context[0]) {
                                return this.formatChartDate(context[0].label);
                            }
                            return '';
                        },
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = this.formatNumber(context.parsed.y);
                            return `${label}: ${value}`;
                        }
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
                        maxTicksLimit: isMobile ? 6 : 12,
                        callback: function (value, index, values) {
                            return this.getLabelForValue(value);
                        }
                    },
                    grid: {
                        color: colors.cardBorder,
                        drawBorder: false,
                        lineWidth: 1
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        color: colors.textMuted,
                        font: {
                            size: isMobile ? 10 : 11,
                            family: "'Inter', sans-serif"
                        },
                        callback: (value) => {
                            if (Number.isInteger(value)) {
                                return this.formatNumber(value);
                            }
                            return '';
                        }
                    },
                    grid: {
                        color: colors.cardBorder,
                        drawBorder: false,
                        lineWidth: 1
                    },
                    border: {
                        display: false
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
                    borderJoinStyle: 'round',
                    borderCapStyle: 'round'
                }
            }
        };
    }

    // ==================== CHART UPDATES ====================

    updateCharts(analyticsData) {
        if (!this.isInitialized || !analyticsData) {
            console.warn('⚠️ Charts not initialized or no data provided');
            return;
        }

        try {
            // Update user activity chart
            if (analyticsData.user_activity) {
                this.updateUserActivityChart(analyticsData.user_activity);
            }

            // Update any additional charts here
            if (analyticsData.engagement) {
                this.updateEngagementData(analyticsData.engagement);
            }

            console.log('✅ Charts updated with new data');

        } catch (error) {
            console.error('❌ Error updating charts:', error);
        }
    }

    updateUserActivityChart(activityData) {
        const chart = this.chartInstances.get('userActivity');
        if (!chart || !activityData || !Array.isArray(activityData)) {
            console.warn('⚠️ User activity chart or data not available');
            return;
        }

        try {
            // Get current period setting
            const period = this.elements.activityChartPeriod?.value || '30d';
            const maxLabels = this.getMaxLabelsForPeriod(period);

            // Prepare data
            const recentData = activityData.slice(-maxLabels);
            const labels = this.prepareChartLabels(recentData, period);
            const activeUsersData = recentData.map(item => item.active_users || 0);
            const newUsersData = recentData.map(item => item.new_users || 0);

            // Update chart data
            chart.data.labels = labels;
            chart.data.datasets[0].data = activeUsersData;
            chart.data.datasets[1].data = newUsersData;

            // Store data in cache
            this.chartData.userActivity = {
                labels,
                datasets: [
                    { label: 'Active Users', data: activeUsersData },
                    { label: 'New Users', data: newUsersData }
                ]
            };

            // Animate update
            chart.update('active');

            console.log('✅ User activity chart updated');

        } catch (error) {
            console.error('❌ Error updating user activity chart:', error);
        }
    }

    getMaxLabelsForPeriod(period) {
        const isMobile = this.core.isMobile;

        switch (period) {
            case '7d':
                return 7;
            case '30d':
                return isMobile ? 15 : 30;
            case '90d':
                return isMobile ? 30 : 90;
            default:
                return isMobile ? 15 : 30;
        }
    }

    prepareChartLabels(data, period) {
        const isMobile = this.core.isMobile;

        return data.map(item => {
            const date = new Date(item.date);

            if (isMobile) {
                return date.toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric'
                });
            } else {
                if (period === '7d') {
                    return date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                } else {
                    return date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });
                }
            }
        });
    }

    updateEngagementData(engagementData) {
        // Store engagement data for other components to use
        this.chartData.engagement = engagementData;

        // Trigger any engagement-specific visualizations
        this.updateEngagementVisualizations(engagementData);
    }

    updateEngagementVisualizations(engagementData) {
        // This could include mini-charts or sparklines for engagement metrics
        // For now, we'll just store the data
        console.log('📊 Engagement data updated:', engagementData);
    }

    // ==================== THEME MANAGEMENT ====================

    detectTheme() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    }

    getThemeColors() {
        const theme = this.currentTheme;

        if (theme === 'light') {
            return {
                textPrimary: '#1a1a1a',
                textSecondary: '#4a4a4a',
                textMuted: '#666666',
                cardBorder: 'rgba(0, 0, 0, 0.1)',
                tooltipBg: 'rgba(255, 255, 255, 0.95)',
                tooltipBorder: 'rgba(0, 0, 0, 0.1)',
                chartPointBorder: '#ffffff',
                gridColor: 'rgba(0, 0, 0, 0.05)'
            };
        } else {
            return {
                textPrimary: '#ffffff',
                textSecondary: '#b3b3b3',
                textMuted: '#888888',
                cardBorder: 'rgba(255, 255, 255, 0.1)',
                tooltipBg: 'rgba(0, 0, 0, 0.9)',
                tooltipBorder: 'rgba(255, 255, 255, 0.2)',
                chartPointBorder: '#ffffff',
                gridColor: 'rgba(255, 255, 255, 0.05)'
            };
        }
    }

    handleThemeChange() {
        const newTheme = this.detectTheme();

        if (newTheme !== this.currentTheme) {
            this.currentTheme = newTheme;
            this.updateChartsTheme();
            console.log(`🎨 Theme changed to ${newTheme}, updating charts`);
        }
    }

    updateChartsTheme() {
        if (!this.isInitialized) return;

        const colors = this.getThemeColors();

        this.chartInstances.forEach((chart, chartId) => {
            try {
                this.updateSingleChartTheme(chart, colors);
                chart.update('none'); // Update without animation
            } catch (error) {
                console.error(`❌ Error updating theme for chart ${chartId}:`, error);
            }
        });

        console.log('✅ Chart themes updated');
    }

    updateSingleChartTheme(chart, colors) {
        const options = chart.options;

        // Update legend colors
        if (options.plugins?.legend?.labels) {
            options.plugins.legend.labels.color = colors.textPrimary;
        }

        // Update tooltip colors
        if (options.plugins?.tooltip) {
            const tooltip = options.plugins.tooltip;
            tooltip.backgroundColor = colors.tooltipBg;
            tooltip.titleColor = colors.textPrimary;
            tooltip.bodyColor = colors.textPrimary;
            tooltip.borderColor = colors.tooltipBorder;
        }

        // Update scales colors
        if (options.scales) {
            Object.keys(options.scales).forEach(scaleKey => {
                const scale = options.scales[scaleKey];

                if (scale.ticks) {
                    scale.ticks.color = colors.textMuted;
                }

                if (scale.grid) {
                    scale.grid.color = colors.cardBorder;
                }
            });
        }

        // Update point border colors for datasets
        if (chart.data && chart.data.datasets) {
            chart.data.datasets.forEach(dataset => {
                if (dataset.pointBorderColor) {
                    dataset.pointBorderColor = colors.chartPointBorder;
                }
            });
        }
    }

    // ==================== EVENT HANDLERS ====================

    handlePeriodChange() {
        const newPeriod = this.elements.activityChartPeriod?.value || '30d';

        // Update core analytics period
        this.core.state.analytics.period = newPeriod;

        // Reload analytics data
        this.core.loadUserAnalytics();

        console.log(`📊 Chart period changed to ${newPeriod}`);
    }

    handleResize() {
        if (!this.isInitialized) return;

        // Resize all charts
        this.chartInstances.forEach((chart, chartId) => {
            try {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            } catch (error) {
                console.error(`❌ Error resizing chart ${chartId}:`, error);
            }
        });

        console.log('📏 Charts resized for new viewport');
    }

    handleDeviceChange() {
        // Recreate charts with new mobile/desktop settings
        this.recreateCharts();
    }

    async recreateCharts() {
        try {
            console.log('🔄 Recreating charts for device change...');

            // Destroy existing charts
            this.destroyAllCharts();

            // Recreate with new settings
            await this.initializeAllCharts();

            // Reload current data
            if (this.chartData.userActivity.labels.length > 0) {
                const chart = this.chartInstances.get('userActivity');
                if (chart) {
                    chart.data.labels = this.chartData.userActivity.labels;
                    chart.data.datasets[0].data = this.chartData.userActivity.datasets[0].data;
                    chart.data.datasets[1].data = this.chartData.userActivity.datasets[1].data;
                    chart.update('none');
                }
            }

            console.log('✅ Charts recreated successfully');

        } catch (error) {
            console.error('❌ Error recreating charts:', error);
        }
    }

    // ==================== CHART EXPORT FUNCTIONALITY ====================

    async exportChart(chartId, format = 'png') {
        const chart = this.chartInstances.get(chartId);
        if (!chart) {
            throw new Error(`Chart ${chartId} not found`);
        }

        try {
            const canvas = chart.canvas;
            const dataUrl = canvas.toDataURL(`image/${format}`);

            // Create download link
            const link = document.createElement('a');
            link.download = `cinebrain-${chartId}-chart.${format}`;
            link.href = dataUrl;
            link.click();

            console.log(`✅ Chart ${chartId} exported as ${format}`);

        } catch (error) {
            console.error(`❌ Error exporting chart ${chartId}:`, error);
            throw error;
        }
    }

    // ==================== CHART DATA ANALYSIS ====================

    getChartInsights(chartId) {
        const data = this.chartData[chartId];
        if (!data || !data.datasets) {
            return null;
        }

        try {
            const insights = {
                totalDataPoints: data.labels.length,
                dateRange: {
                    start: data.labels[0],
                    end: data.labels[data.labels.length - 1]
                },
                datasets: {}
            };

            data.datasets.forEach(dataset => {
                const values = dataset.data.filter(val => val !== null && val !== undefined);

                if (values.length > 0) {
                    const sum = values.reduce((a, b) => a + b, 0);
                    const avg = sum / values.length;
                    const max = Math.max(...values);
                    const min = Math.min(...values);
                    const trend = this.calculateTrend(values);

                    insights.datasets[dataset.label] = {
                        total: sum,
                        average: Math.round(avg * 100) / 100,
                        maximum: max,
                        minimum: min,
                        trend: trend
                    };
                }
            });

            return insights;

        } catch (error) {
            console.error('❌ Error generating chart insights:', error);
            return null;
        }
    }

    calculateTrend(values) {
        if (values.length < 2) return 'insufficient_data';

        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        const change = ((secondAvg - firstAvg) / firstAvg) * 100;

        if (change > 5) return 'increasing';
        if (change < -5) return 'decreasing';
        return 'stable';
    }

    // ==================== UTILITY FUNCTIONS ====================

    formatNumber(num) {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(this.core.isMobile ? 0 : 1)}K`;
        }
        return num.toString();
    }

    formatChartDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ==================== CLEANUP ====================

    destroyAllCharts() {
        this.chartInstances.forEach((chart, chartId) => {
            try {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
                console.log(`🗑 Chart ${chartId} destroyed`);
            } catch (error) {
                console.error(`❌ Error destroying chart ${chartId}:`, error);
            }
        });

        this.chartInstances.clear();
        this.chartData = {
            userActivity: { labels: [], datasets: [] },
            userGrowth: { labels: [], datasets: [] },
            engagement: { metrics: [], trends: [] }
        };
    }

    destroy() {
        console.log('🗑 Destroying CineBrain Charts Manager...');

        // Remove event listeners
        if (this.elements.activityChartPeriod) {
            this.elements.activityChartPeriod.removeEventListener('change', this.handlePeriodChange);
        }

        window.removeEventListener('theme-changed', this.handleThemeChange);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleResize);

        // Destroy all charts
        this.destroyAllCharts();

        // Clear references
        this.elements = {};
        this.core = null;
        this.isInitialized = false;

        console.log('🗑 Charts Manager destroyed');
    }
}

// ==================== CHART UTILITIES ====================

class ChartUtilities {
    static createSmoothGradient(ctx, colorStops, direction = 'vertical') {
        const canvas = ctx.canvas;
        const gradient = direction === 'vertical'
            ? ctx.createLinearGradient(0, 0, 0, canvas.height)
            : ctx.createLinearGradient(0, 0, canvas.width, 0);

        colorStops.forEach(stop => {
            gradient.addColorStop(stop.position, stop.color);
        });

        return gradient;
    }

    static generateColorPalette(baseColor, count = 5) {
        // Generate a palette based on a base color
        const colors = [];
        const hsl = this.hexToHsl(baseColor);

        for (let i = 0; i < count; i++) {
            const lightness = Math.max(0.2, Math.min(0.8, hsl.l + (i - count / 2) * 0.1));
            colors.push(this.hslToHex(hsl.h, hsl.s, lightness));
        }

        return colors;
    }

    static hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return { h, s, l };
    }

    static hslToHex(h, s, l) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 1 / 6) {
            r = c; g = x; b = 0;
        } else if (1 / 6 <= h && h < 2 / 6) {
            r = x; g = c; b = 0;
        } else if (2 / 6 <= h && h < 3 / 6) {
            r = 0; g = c; b = x;
        } else if (3 / 6 <= h && h < 4 / 6) {
            r = 0; g = x; b = c;
        } else if (4 / 6 <= h && h < 5 / 6) {
            r = x; g = 0; b = c;
        } else if (5 / 6 <= h && h < 1) {
            r = c; g = 0; b = x;
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}

// ==================== EXPORT ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CineBrainUsersChartsManager, ChartUtilities };
} else {
    window.CineBrainUsersChartsManager = CineBrainUsersChartsManager;
    window.ChartUtilities = ChartUtilities;
}