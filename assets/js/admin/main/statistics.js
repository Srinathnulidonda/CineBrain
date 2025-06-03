/**
 * CineBrain Admin Dashboard - Statistics & Charts Manager (Updated for Backend v3.0)
 * FIXED: Dark theme text visibility issues
 */

class StatisticsManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.charts = {};
        this.chartData = {
            userGrowth: [],
            activeUsers: [],
            performance: [],
            contentDistribution: [],
            interactionTypes: []
        };
        this.performanceHistory = {
            labels: [],
            cpu: [],
            memory: [],
            disk: []
        };
        this.maxDataPoints = 20;
        this.elements = this.initializeElements();
    }

    async init() {
        this.initializeCharts();
        this.setupEventListeners();
        this.startPerformanceTracking();
        console.log('✅ Statistics Manager v3.0 initialized');
    }

    initializeElements() {
        return {
            userGrowthChart: document.getElementById('userGrowthChart'),
            contentDistributionChart: document.getElementById('contentDistributionChart'),
            systemPerformanceChart: document.getElementById('systemPerformanceChart'),
            activityPeriod: document.getElementById('activityPeriod'),
            performanceIndicator: document.getElementById('performanceIndicator'),
            userGrowthContainer: document.querySelector('#userGrowthChart')?.parentElement,
            contentDistributionContainer: document.querySelector('#contentDistributionChart')?.parentElement,
            systemPerformanceContainer: document.querySelector('#systemPerformanceChart')?.parentElement
        };
    }

    setupEventListeners() {
        this.elements.activityPeriod?.addEventListener('change', (e) => {
            this.updateChartsForPeriod(e.target.value);
        });

        window.addEventListener('theme-changed', () => {
            this.updateChartsTheme();
        });

        window.addEventListener('performance-data-updated', (e) => {
            if (e.detail) {
                this.updatePerformanceChartNew(e.detail);
            }
        });

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.resizeCharts();
            }, 250);
        });
    }

    startPerformanceTracking() {
        const now = new Date();
        for (let i = 0; i < 10; i++) {
            const time = new Date(now.getTime() - (i * 5000));
            this.performanceHistory.labels.unshift(this.formatTimeLabel(time));
            this.performanceHistory.cpu.unshift(0);
            this.performanceHistory.memory.unshift(0);
            this.performanceHistory.disk.unshift(0);
        }
    }

    // FIXED: Helper methods for direct color access
    getTextColor() {
        const theme = document.documentElement.getAttribute('data-theme') ||
            document.documentElement.getAttribute('data-bs-theme') || 'dark';
        return theme === 'light' ? '#1a1a1a' : '#ffffff';
    }

    getSecondaryTextColor() {
        const theme = document.documentElement.getAttribute('data-theme') ||
            document.documentElement.getAttribute('data-bs-theme') || 'dark';
        return theme === 'light' ? '#4a4a4a' : '#b3b3b3';
    }

    getTooltipBg() {
        const theme = document.documentElement.getAttribute('data-theme') ||
            document.documentElement.getAttribute('data-bs-theme') || 'dark';
        return theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.9)';
    }

    getBorderColor() {
        const theme = document.documentElement.getAttribute('data-theme') ||
            document.documentElement.getAttribute('data-bs-theme') || 'dark';
        return theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)';
    }

    // FIXED: Enhanced color detection for dark theme
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
                        color: colors.textPrimary, // FIXED: Use theme colors
                        usePointStyle: true,
                        font: {
                            size: this.dashboard.isMobile ? 11 : 12,
                            family: "'Inter', sans-serif"
                        },
                        padding: this.dashboard.isMobile ? 10 : 15,
                        boxWidth: this.dashboard.isMobile ? 6 : 8,
                        boxHeight: this.dashboard.isMobile ? 6 : 8
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: colors.tooltipBg, // FIXED: Theme-aware tooltip
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
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.label?.includes('Usage')) {
                                    label += context.parsed.y + '%';
                                } else {
                                    label += context.parsed.y.toLocaleString();
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: colors.textMuted, // FIXED: Theme-aware axis labels
                        font: {
                            size: this.dashboard.isMobile ? 10 : 11,
                            family: "'Inter', sans-serif"
                        },
                        maxRotation: this.dashboard.isMobile ? 45 : 0,
                        autoSkip: true,
                        maxTicksLimit: this.dashboard.isMobile ? 6 : 12
                    },
                    grid: {
                        color: colors.cardBorder,
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: colors.textMuted, // FIXED: Theme-aware axis labels
                        font: {
                            size: this.dashboard.isMobile ? 10 : 11,
                            family: "'Inter', sans-serif"
                        },
                        callback: function (value) {
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
                    radius: this.dashboard.isMobile ? 3 : 4,
                    hoverRadius: this.dashboard.isMobile ? 5 : 6,
                    hitRadius: this.dashboard.isMobile ? 10 : 15
                },
                line: {
                    borderJoinStyle: 'round'
                }
            }
        };
    }

    initializeUserGrowthChart(chartOptions) {
        const userGrowthCtx = this.elements.userGrowthChart?.getContext('2d');
        if (!userGrowthCtx) return;

        const gradientNewUsers = userGrowthCtx.createLinearGradient(0, 0, 0, 400);
        gradientNewUsers.addColorStop(0, 'rgba(17, 60, 207, 0.4)');
        gradientNewUsers.addColorStop(1, 'rgba(17, 60, 207, 0.01)');

        const gradientActiveUsers = userGrowthCtx.createLinearGradient(0, 0, 0, 400);
        gradientActiveUsers.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        gradientActiveUsers.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

        this.charts.userGrowth = new Chart(userGrowthCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'New Users',
                    data: [],
                    borderColor: '#113CCF',
                    backgroundColor: gradientNewUsers,
                    tension: 0.4,
                    fill: true,
                    borderWidth: this.dashboard.isMobile ? 2 : 3,
                    pointBackgroundColor: '#113CCF',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }, {
                    label: 'Active Users',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: gradientActiveUsers,
                    tension: 0.4,
                    fill: true,
                    borderWidth: this.dashboard.isMobile ? 2 : 3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    title: {
                        display: !this.dashboard.isMobile,
                        text: 'User Growth & Activity Trends',
                        color: this.getThemeColors().textPrimary, // FIXED: Theme-aware title
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

    // FIXED: Content Distribution Chart with proper theme handling
    initializeContentDistributionChart() {
        const contentDistCtx = this.elements.contentDistributionChart?.getContext('2d');
        if (!contentDistCtx) return;

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
                        '#ef4444',
                        '#3b82f6',
                        '#ec4899'
                    ],
                    borderWidth: 0,
                    hoverOffset: this.dashboard.isMobile ? 4 : 8,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: this.dashboard.isMobile ? '60%' : '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            // FIXED: Force theme colors for legend
                            color: this.getTextColor(), // Use direct color instead of CSS variable
                            usePointStyle: true,
                            padding: this.dashboard.isMobile ? 10 : 15,
                            font: {
                                size: this.dashboard.isMobile ? 10 : 11,
                                family: "'Inter', sans-serif"
                            },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    const dataset = data.datasets[0];
                                    const total = dataset.data.reduce((a, b) => a + b, 0);

                                    return data.labels.map((label, i) => {
                                        const value = dataset.data[i];
                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

                                        return {
                                            text: `${label} (${percentage}%)`,
                                            fillStyle: dataset.backgroundColor[i],
                                            strokeStyle: dataset.backgroundColor[i],
                                            lineWidth: 0,
                                            hidden: false,
                                            index: i,
                                            fontColor: this.getTextColor() // FIXED: Explicit font color
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: this.getTooltipBg(),
                        titleColor: this.getTextColor(),
                        bodyColor: this.getTextColor(),
                        borderColor: this.getBorderColor(),
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        titleFont: {
                            size: 12,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 11
                        },
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        this.addCenterTextPlugin();
    }

    initializeSystemPerformanceChart(baseOptions) {
        const ctx = this.elements.systemPerformanceChart?.getContext('2d');
        if (!ctx) return;

        const gradientCPU = ctx.createLinearGradient(0, 0, 0, 400);
        gradientCPU.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
        gradientCPU.addColorStop(1, 'rgba(239, 68, 68, 0.01)');

        const gradientMemory = ctx.createLinearGradient(0, 0, 0, 400);
        gradientMemory.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
        gradientMemory.addColorStop(1, 'rgba(245, 158, 11, 0.01)');

        const gradientDisk = ctx.createLinearGradient(0, 0, 0, 400);
        gradientDisk.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
        gradientDisk.addColorStop(1, 'rgba(139, 92, 246, 0.01)');

        this.charts.systemPerformance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.performanceHistory.labels,
                datasets: [{
                    label: 'CPU Usage',
                    data: this.performanceHistory.cpu,
                    borderColor: '#ef4444',
                    backgroundColor: gradientCPU,
                    tension: 0.4,
                    fill: true,
                    borderWidth: this.dashboard.isMobile ? 2 : 3,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }, {
                    label: 'Memory Usage',
                    data: this.performanceHistory.memory,
                    borderColor: '#f59e0b',
                    backgroundColor: gradientMemory,
                    tension: 0.4,
                    fill: true,
                    borderWidth: this.dashboard.isMobile ? 2 : 3,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }, {
                    label: 'Disk Usage',
                    data: this.performanceHistory.disk,
                    borderColor: '#8b5cf6',
                    backgroundColor: gradientDisk,
                    tension: 0.4,
                    fill: true,
                    borderWidth: this.dashboard.isMobile ? 2 : 3,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                ...baseOptions,
                animation: {
                    duration: 500
                },
                scales: {
                    ...baseOptions.scales,
                    y: {
                        ...baseOptions.scales.y,
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            ...baseOptions.scales.y.ticks,
                            callback: function (value) {
                                return value + '%';
                            },
                            stepSize: 25
                        }
                    }
                },
                plugins: {
                    ...baseOptions.plugins,
                    title: {
                        display: !this.dashboard.isMobile,
                        text: 'System Performance',
                        color: this.getThemeColors().textPrimary, // FIXED: Theme-aware title
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

    // FIXED: Enhanced center text plugin with forced colors
    addCenterTextPlugin() {
        Chart.register({
            id: 'centerText',
            beforeDraw: (chart) => {
                if (chart.config.type !== 'doughnut') return;

                const ctx = chart.ctx;
                const chartArea = chart.chartArea;

                if (!chartArea || chartArea.width < 50 || chartArea.height < 50) return;

                ctx.save();

                const dataset = chart.data.datasets[0];
                const total = dataset.data.reduce((a, b) => a + b, 0);

                const centerX = (chartArea.left + chartArea.right) / 2;
                const centerY = (chartArea.top + chartArea.bottom) / 2;

                const availableRadius = Math.min(chartArea.width, chartArea.height) / 2;
                const cutoutPercentage = chart.options.cutout ?
                    parseFloat(chart.options.cutout.replace('%', '')) / 100 : 0.7;
                const innerRadius = availableRadius * cutoutPercentage;

                const textArea = innerRadius * 0.7;

                const numberFontSize = Math.min(Math.max(textArea / 3, 12), this.dashboard.isMobile ? 16 : 20);
                const labelFontSize = Math.min(Math.max(textArea / 6, 8), this.dashboard.isMobile ? 10 : 12);

                // FIXED: Force colors based on current theme
                const textPrimary = this.getTextColor();
                const textSecondary = this.getSecondaryTextColor();

                // Draw total number with forced color
                ctx.font = `bold ${numberFontSize}px Inter`;
                ctx.fillStyle = textPrimary; // Direct color, not CSS variable
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const totalText = total > 999 ?
                    (total > 999999 ? `${(total / 1000000).toFixed(1)}M` : `${(total / 1000).toFixed(0)}K`) :
                    total.toLocaleString();

                const totalTextWidth = ctx.measureText(totalText).width;

                if (totalTextWidth < innerRadius * 1.4) {
                    ctx.fillText(totalText, centerX, centerY - labelFontSize / 2);
                }

                // Draw label with forced color
                ctx.font = `${labelFontSize}px Inter`;
                ctx.fillStyle = textSecondary; // Direct color, not CSS variable

                const labelText = 'Total Content';
                const labelTextWidth = ctx.measureText(labelText).width;

                if (labelTextWidth < innerRadius * 1.4) {
                    ctx.fillText(labelText, centerX, centerY + numberFontSize / 2);
                }

                ctx.restore();
            }
        });
    }

    // FIXED: Enhanced theme update specifically for Content Distribution
    updateChartsTheme() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.options) {
                // Update legend colors
                if (chart.options.plugins?.legend?.labels) {
                    chart.options.plugins.legend.labels.color = this.getTextColor();
                }

                // Update title colors
                if (chart.options.plugins?.title) {
                    chart.options.plugins.title.color = this.getTextColor();
                }

                // Update tooltip colors
                if (chart.options.plugins?.tooltip) {
                    chart.options.plugins.tooltip.backgroundColor = this.getTooltipBg();
                    chart.options.plugins.tooltip.titleColor = this.getTextColor();
                    chart.options.plugins.tooltip.bodyColor = this.getTextColor();
                    chart.options.plugins.tooltip.borderColor = this.getBorderColor();
                }

                // Update scales colors
                if (chart.options.scales) {
                    Object.keys(chart.options.scales).forEach(scaleKey => {
                        if (chart.options.scales[scaleKey].ticks) {
                            chart.options.scales[scaleKey].ticks.color = this.getSecondaryTextColor();
                        }
                        if (chart.options.scales[scaleKey].grid) {
                            chart.options.scales[scaleKey].grid.color = this.getBorderColor();
                        }
                    });
                }

                // FIXED: Force update for doughnut chart
                if (chart.config.type === 'doughnut') {
                    // Force regenerate legend labels with new colors
                    chart.options.plugins.legend.labels.generateLabels = (chartInstance) => {
                        const data = chartInstance.data;
                        if (data.labels.length && data.datasets.length) {
                            const dataset = data.datasets[0];
                            const total = dataset.data.reduce((a, b) => a + b, 0);

                            return data.labels.map((label, i) => {
                                const value = dataset.data[i];
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

                                return {
                                    text: `${label} (${percentage}%)`,
                                    fillStyle: dataset.backgroundColor[i],
                                    strokeStyle: dataset.backgroundColor[i],
                                    lineWidth: 0,
                                    hidden: false,
                                    index: i,
                                    fontColor: this.getTextColor() // FIXED: Force current theme color
                                };
                            });
                        }
                        return [];
                    };
                }

                // Force chart update
                chart.update('active');
            }
        });

        console.log('🎨 Charts theme updated for', document.documentElement.getAttribute('data-theme') || 'dark', 'mode');
    }

    initializeCharts() {
        const baseChartOptions = this.getBaseChartOptions();
        this.initializeUserGrowthChart(baseChartOptions);
        this.initializeContentDistributionChart();
        this.initializeSystemPerformanceChart(baseChartOptions);
        this.addChartLoadingAnimations();
    }

    // UPDATED: Main update method for charts with enhanced color handling
    updateCharts(data) {
        if (!data) return;

        if (data.user_analytics) {
            this.updateUserGrowthChart(data.user_analytics);
        }

        if (data.content_analytics) {
            this.updateContentDistributionChart(data.content_analytics);
        }

        if (data.interaction_analytics) {
            this.updateInteractionMetrics(data.interaction_analytics);
        }

        this.removeChartLoadingAnimations();
    }

    updateUserGrowthChart(userAnalytics) {
        if (!this.charts.userGrowth || !userAnalytics) return;

        const userGrowthData = userAnalytics.user_growth || [];
        const activeUsersData = userAnalytics.active_users_trend || [];

        const period = this.elements.activityPeriod?.value || '30d';
        const maxLabels = period === '7d' ? 7 : period === '30d' ?
            (this.dashboard.isMobile ? 15 : 30) :
            (this.dashboard.isMobile ? 30 : 90);

        const recentGrowthData = userGrowthData.slice(-maxLabels);
        const recentActiveData = activeUsersData.slice(-maxLabels);

        this.charts.userGrowth.data.labels = recentGrowthData.map(item => {
            const date = new Date(item.date);
            return this.dashboard.isMobile ?
                date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) :
                date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        this.charts.userGrowth.data.datasets[0].data = recentGrowthData.map(item => item.count);
        this.charts.userGrowth.data.datasets[1].data = recentActiveData.map(item => item.count);

        this.charts.userGrowth.update('active');
        this.updateUserGrowthMetrics(userAnalytics);
    }

    // FIXED: Content distribution update with proper color handling
    updateContentDistributionChart(contentAnalytics) {
        if (!this.charts.contentDistribution || !contentAnalytics) return;

        const contentDist = contentAnalytics.content_distribution || [];
        const sortedDist = contentDist.sort((a, b) => b.count - a.count);

        this.charts.contentDistribution.data.labels = sortedDist.map(item => {
            const type = item.type || item.content_type;
            return this.formatContentType(type);
        });

        this.charts.contentDistribution.data.datasets[0].data = sortedDist.map(item => item.count);

        // FIXED: Update chart with proper legend colors
        this.charts.contentDistribution.options.plugins.legend.labels.color = this.getTextColor();

        this.charts.contentDistribution.update('active');
        this.updateContentMetrics(contentAnalytics);
    }

    updatePerformanceChartNew(data) {
        if (!this.charts.systemPerformance) return;

        const chart = this.charts.systemPerformance;
        const now = new Date();
        const timeLabel = this.formatTimeLabel(now);

        let cpuUsage = 0, memoryUsage = 0, diskUsage = 0;

        if (data.performance) {
            cpuUsage = parseInt(data.performance.cpu?.replace('%', '') || 0);
            memoryUsage = parseInt(data.performance.memory?.replace('%', '') || 0);
            diskUsage = parseInt(data.performance.disk?.replace('%', '') || 0);
        } else if (data.resources) {
            cpuUsage = data.resources.cpu_usage || 0;
            memoryUsage = data.resources.memory_usage || 0;
            diskUsage = data.resources.disk_usage || 0;
        } else if (data.cpu !== undefined) {
            cpuUsage = parseInt(data.cpu?.replace?.('%', '') || data.cpu || 0);
            memoryUsage = parseInt(data.memory?.replace?.('%', '') || data.memory || 0);
            diskUsage = parseInt(data.disk?.replace?.('%', '') || data.disk || 0);
        }

        this.performanceHistory.labels.push(timeLabel);
        this.performanceHistory.cpu.push(cpuUsage);
        this.performanceHistory.memory.push(memoryUsage);
        this.performanceHistory.disk.push(diskUsage);

        const maxPoints = this.dashboard.isMobile ? 10 : 20;
        if (this.performanceHistory.labels.length > maxPoints) {
            this.performanceHistory.labels.shift();
            this.performanceHistory.cpu.shift();
            this.performanceHistory.memory.shift();
            this.performanceHistory.disk.shift();
        }

        chart.data.labels = this.performanceHistory.labels;
        chart.data.datasets[0].data = this.performanceHistory.cpu;
        chart.data.datasets[1].data = this.performanceHistory.memory;
        chart.data.datasets[2].data = this.performanceHistory.disk;

        chart.update('none');
        this.updatePerformanceIndicatorNew(cpuUsage, memoryUsage, diskUsage);
    }

    updatePerformanceIndicatorNew(cpuUsage, memoryUsage, diskUsage) {
        const performanceIndicator = this.elements.performanceIndicator;
        if (!performanceIndicator) return;

        const performanceDot = performanceIndicator.querySelector('.performance-dot');
        const performanceText = performanceIndicator.querySelector('.performance-text');

        const maxUsage = Math.max(cpuUsage, memoryUsage, diskUsage);

        let status, text, color;
        if (maxUsage > 90) {
            status = 'danger';
            text = 'Critical';
            color = '#ef4444';
        } else if (maxUsage > 70) {
            status = 'warning';
            text = 'Warning';
            color = '#f59e0b';
        } else {
            status = '';
            text = 'Optimal';
            color = '#10b981';
        }

        if (performanceDot) {
            performanceDot.className = `performance-dot ${status}`;
        }
        if (performanceText) {
            performanceText.textContent = text;
            performanceText.style.color = color;
        }

        if (maxUsage > 90) {
            performanceIndicator.classList.add('pulse-animation');
        } else {
            performanceIndicator.classList.remove('pulse-animation');
        }
    }

    async updateChartsForPeriod(period) {
        this.addChartLoadingAnimations();

        try {
            const endpoint = `/admin/analytics?period=${period}`;
            const response = await this.dashboard.makeAuthenticatedRequest(endpoint);

            if (response.ok) {
                const data = await response.json();
                this.updateCharts(data);
            }
        } catch (error) {
            console.error('Error updating charts for period:', error);
            this.removeChartLoadingAnimations();
        }
    }

    updateUserGrowthMetrics(userAnalytics) {
        const totalUsers = userAnalytics.total_users || 0;
        const activeToday = userAnalytics.active_today || 0;
        const growthRate = this.calculateGrowthRate(userAnalytics.user_growth);

        const metricsContainer = document.getElementById('userGrowthMetrics');
        if (metricsContainer) {
            metricsContainer.innerHTML = `
                <div class="growth-metrics">
                    <div class="growth-metric">
                        <div class="growth-metric-value">${this.dashboard.formatNumber(totalUsers)}</div>
                        <div class="growth-metric-label">Total Users</div>
                    </div>
                    <div class="growth-metric">
                        <div class="growth-metric-value">${this.dashboard.formatNumber(activeToday)}</div>
                        <div class="growth-metric-label">Active Today</div>
                    </div>
                    <div class="growth-metric">
                        <div class="growth-metric-value growth-metric-change ${growthRate >= 0 ? 'positive' : 'negative'}">
                            ${growthRate >= 0 ? '+' : ''}${growthRate}%
                        </div>
                        <div class="growth-metric-label">Growth Rate</div>
                    </div>
                </div>
            `;
        }
    }

    updateContentMetrics(contentAnalytics) {
        const totalContent = contentAnalytics.total_content || 0;
        const popularGenres = contentAnalytics.popular_genres || [];
        const topGenre = popularGenres[0]?.genre || 'N/A';

        const metricsContainer = document.getElementById('contentMetrics');
        if (metricsContainer) {
            metricsContainer.innerHTML = `
                <div class="content-metrics">
                    <div class="content-metric">
                        <div class="content-metric-value">${this.dashboard.formatNumber(totalContent)}</div>
                        <div class="content-metric-label">Total Content</div>
                    </div>
                    <div class="content-metric">
                        <div class="content-metric-value">${topGenre}</div>
                        <div class="content-metric-label">Top Genre</div>
                    </div>
                </div>
            `;
        }
    }

    updateInteractionMetrics(interactionAnalytics) {
        const totalInteractions = interactionAnalytics.total_interactions || 0;
        const dailyTrend = interactionAnalytics.daily_trend || [];

        const avgDaily = dailyTrend.length > 0 ?
            Math.round(dailyTrend.reduce((sum, day) => sum + day.count, 0) / dailyTrend.length) : 0;

        const metricsContainer = document.getElementById('interactionMetrics');
        if (metricsContainer) {
            metricsContainer.innerHTML = `
                <div class="interaction-metrics">
                    <div class="interaction-metric">
                        <div class="interaction-metric-value">${this.dashboard.formatNumber(totalInteractions)}</div>
                        <div class="interaction-metric-label">Total Interactions</div>
                    </div>
                    <div class="interaction-metric">
                        <div class="interaction-metric-value">${this.dashboard.formatNumber(avgDaily)}</div>
                        <div class="interaction-metric-label">Daily Average</div>
                    </div>
                </div>
            `;
        }
    }

    resizeCharts() {
        const wasMobile = this.dashboard.isMobile;
        this.dashboard.isMobile = window.innerWidth <= 768;

        if (wasMobile !== this.dashboard.isMobile) {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    this.updateChartOptionsForScreenSize(chart);
                    chart.resize();
                }
            });
        } else {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }
    }

    updateChartOptionsForScreenSize(chart) {
        if (!chart || !chart.options) return;

        const colors = this.getThemeColors();

        if (chart.options.plugins?.legend?.labels) {
            chart.options.plugins.legend.labels.font.size = this.dashboard.isMobile ? 11 : 12;
            chart.options.plugins.legend.labels.padding = this.dashboard.isMobile ? 10 : 15;
            chart.options.plugins.legend.labels.color = colors.textPrimary;
        }

        if (chart.options.plugins?.title) {
            chart.options.plugins.title.color = colors.textPrimary;
        }

        if (chart.options.scales?.x?.ticks) {
            chart.options.scales.x.ticks.font.size = this.dashboard.isMobile ? 10 : 11;
            chart.options.scales.x.ticks.maxRotation = this.dashboard.isMobile ? 45 : 0;
            chart.options.scales.x.ticks.maxTicksLimit = this.dashboard.isMobile ? 6 : 12;
            chart.options.scales.x.ticks.color = colors.textMuted;
        }

        if (chart.options.scales?.y?.ticks) {
            chart.options.scales.y.ticks.font.size = this.dashboard.isMobile ? 10 : 11;
            chart.options.scales.y.ticks.color = colors.textMuted;
        }

        if (chart.options.elements?.point) {
            chart.options.elements.point.radius = this.dashboard.isMobile ? 3 : 4;
            chart.options.elements.point.hoverRadius = this.dashboard.isMobile ? 5 : 6;
        }

        if (chart.config.type === 'doughnut') {
            chart.options.cutout = this.dashboard.isMobile ? '60%' : '70%';
        }

        chart.update('none');
    }

    addChartLoadingAnimations() {
        const containers = [
            this.elements.userGrowthContainer,
            this.elements.contentDistributionContainer,
            this.elements.systemPerformanceContainer
        ];

        containers.forEach(container => {
            if (container && !container.querySelector('.chart-loading')) {
                const loader = document.createElement('div');
                loader.className = 'chart-loading';
                loader.innerHTML = '<div class="chart-skeleton"></div>';
                container.appendChild(loader);
            }
        });
    }

    removeChartLoadingAnimations() {
        document.querySelectorAll('.chart-loading').forEach(loader => {
            loader.remove();
        });
    }

    exportChartData(chartType) {
        const chart = this.charts[chartType];
        if (!chart) return null;

        return {
            type: chartType,
            labels: chart.data.labels,
            datasets: chart.data.datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data,
                borderColor: dataset.borderColor,
                backgroundColor: dataset.backgroundColor
            })),
            timestamp: new Date().toISOString()
        };
    }

    getChartStats(chartType) {
        const chart = this.charts[chartType];
        if (!chart || !chart.data.datasets) return null;

        const stats = {};
        chart.data.datasets.forEach(dataset => {
            const data = dataset.data;
            if (data.length > 0) {
                const validData = data.filter(d => d !== null && d !== undefined);
                stats[dataset.label] = {
                    total: validData.reduce((sum, value) => sum + value, 0),
                    average: validData.reduce((sum, value) => sum + value, 0) / validData.length,
                    max: Math.max(...validData),
                    min: Math.min(...validData),
                    latest: validData[validData.length - 1],
                    count: validData.length
                };
            }
        });

        return stats;
    }

    formatTimeLabel(date) {
        if (this.dashboard.isMobile) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    formatContentType(type) {
        const typeMap = {
            'movie': 'Movies',
            'tv': 'TV Shows',
            'series': 'TV Series',
            'anime': 'Anime',
            'documentary': 'Documentaries',
            'short': 'Shorts'
        };
        return typeMap[type?.toLowerCase()] ||
            type?.charAt(0).toUpperCase() + type?.slice(1) ||
            'Unknown';
    }

    calculateGrowthRate(growthData) {
        if (!growthData || growthData.length < 2) return 0;

        const recent = growthData.slice(-7);
        const previous = growthData.slice(-14, -7);

        const recentSum = recent.reduce((sum, item) => sum + item.count, 0);
        const previousSum = previous.reduce((sum, item) => sum + item.count, 0);

        if (previousSum === 0) return 100;

        const rate = ((recentSum - previousSum) / previousSum) * 100;
        return Math.round(rate * 10) / 10;
    }

    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });

        this.charts = {};
        this.chartData = {
            userGrowth: [],
            activeUsers: [],
            performance: [],
            contentDistribution: [],
            interactionTypes: []
        };
        this.performanceHistory = {
            labels: [],
            cpu: [],
            memory: [],
            disk: []
        };

        console.log('🗑 Statistics manager v3.0 destroyed');
    }
}

window.StatisticsManager = StatisticsManager;