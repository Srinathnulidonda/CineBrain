// Optimized Admin Analytics Page
class AdminAnalytics {
    constructor() {
        this.analytics = null;
        this.chartInstances = {};
    }

    async init() {
        if (!AuthService.isAdmin()) {
            window.location.href = '/';
            return;
        }

        try {
            Loading.show();
            this.analytics = await API.adminGetAnalytics();
            this.render();
            this.initCharts();
        } catch (error) {
            console.error('Failed to load analytics:', error);
            new Toast('Failed to load analytics', 'error').show();
        } finally {
            Loading.hide();
        }
    }

    render() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="admin-analytics">
                <!-- Header -->
                <div class="bg-secondary-bg mb-8">
                    <div class="container mx-auto px-4 py-6">
                        <div class="flex items-center justify-between">
                            <h1 class="text-3xl font-bold">Analytics</h1>
                            <a href="/admin" class="text-text-secondary hover:text-netflix-red transition">
                                <i class="fas fa-arrow-left mr-2"></i>Dashboard
                            </a>
                        </div>
                    </div>
                </div>

                <div class="container mx-auto px-4">
                    <!-- Summary Cards -->
                    ${this.renderSummaryCards()}

                    <!-- Charts Grid -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        ${this.renderCharts()}
                    </div>

                    <!-- Tables -->
                    ${this.renderTables()}
                </div>
            </div>
        `;
    }

    renderSummaryCards() {
        const { users, content, interactions, admin_posts } = this.analytics;
        
        return `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-card-bg rounded-lg p-6">
                    <i class="fas fa-users text-3xl text-netflix-red mb-4"></i>
                    <p class="text-3xl font-bold">${users.total}</p>
                    <p class="text-text-secondary">Total Users</p>
                    <p class="text-sm text-success mt-2">
                        ${users.engagement_rate.toFixed(1)}% engaged
                    </p>
                </div>

                <div class="bg-card-bg rounded-lg p-6">
                    <i class="fas fa-film text-3xl text-netflix-red mb-4"></i>
                    <p class="text-3xl font-bold">${content.total}</p>
                    <p class="text-text-secondary">Total Content</p>
                </div>

                <div class="bg-card-bg rounded-lg p-6">
                    <i class="fas fa-heart text-3xl text-netflix-red mb-4"></i>
                    <p class="text-3xl font-bold">${interactions.total}</p>
                    <p class="text-text-secondary">Total Interactions</p>
                </div>

                <div class="bg-card-bg rounded-lg p-6">
                    <i class="fas fa-newspaper text-3xl text-netflix-red mb-4"></i>
                    <p class="text-3xl font-bold">${admin_posts.active}</p>
                    <p class="text-text-secondary">Active Posts</p>
                    <p class="text-sm text-text-muted mt-2">
                        ${admin_posts.telegram_posts} on Telegram
                    </p>
                </div>
            </div>
        `;
    }

    renderCharts() {
        return `
            <!-- Genre Distribution -->
            <div class="bg-card-bg rounded-lg p-6">
                <h3 class="text-xl font-bold mb-4">Popular Genres</h3>
                <canvas id="genreChart" height="300"></canvas>
            </div>

            <!-- Interaction Types -->
            <div class="bg-card-bg rounded-lg p-6">
                <h3 class="text-xl font-bold mb-4">Interaction Types</h3>
                <canvas id="interactionChart" height="300"></canvas>
            </div>
        `;
    }

    renderTables() {
        const { content, preferences } = this.analytics;
        
        return `
            <!-- Popular Content -->
            <div class="bg-card-bg rounded-lg p-6 mb-8">
                <h3 class="text-xl font-bold mb-4">Most Popular Content</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="text-left border-b border-border-color">
                                <th class="pb-3">Title</th>
                                <th class="pb-3">Interactions</th>
                                <th class="pb-3">Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${content.popular.slice(0, 10).map(item => `
                                <tr class="border-b border-border-color">
                                    <td class="py-3">${item.title}</td>
                                    <td class="py-3">${item.interactions}</td>
                                    <td class="py-3">
                                        <i class="fas fa-arrow-up text-success"></i>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    initCharts() {
        // Simple chart visualization using canvas
        this.drawGenreChart();
        this.drawInteractionChart();
    }

    drawGenreChart() {
        const canvas = document.getElementById('genreChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const genres = Object.entries(this.analytics.preferences.top_genres);
        
        // Simple bar chart
        const barWidth = canvas.width / genres.length;
        const maxValue = Math.max(...genres.map(([_, value]) => value));
        
        genres.forEach(([genre, value], index) => {
            const barHeight = (value / maxValue) * (canvas.height - 40);
            const x = index * barWidth;
            const y = canvas.height - barHeight - 20;
            
            ctx.fillStyle = '#e50914';
            ctx.fillRect(x + 10, y, barWidth - 20, barHeight);
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(genre, x + barWidth / 2, canvas.height - 5);
        });
    }

    drawInteractionChart() {
        const canvas = document.getElementById('interactionChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const interactions = this.analytics.interactions.by_type;
        
        // Simple pie chart
        const total = interactions.reduce((sum, item) => sum + item.count, 0);
        let currentAngle = -Math.PI / 2;
        
        const colors = ['#e50914', '#f40612', '#b20710', '#ff4444', '#ffa500'];
        
        interactions.forEach((item, index) => {
            const sliceAngle = (item.count / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 80, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            
            currentAngle += sliceAngle;
        });
    }
}

const AdminAnalyticsInstance = new AdminAnalytics();