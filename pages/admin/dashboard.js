// Admin Dashboard Page
class AdminDashboard {
    constructor() {
        this.analytics = null;
        this.systemStatus = null;
        this.recentPosts = [];
    }

    async init() {
        if (!AuthService.isAdmin()) {
            window.location.href = '/';
            return;
        }

        try {
            Loading.show();
            await this.loadDashboardData();
            this.render();
        } catch (error) {
            console.error('Failed to load admin dashboard:', error);
            new Toast('Failed to load dashboard', 'error').show();
        } finally {
            Loading.hide();
        }
    }

    async loadDashboardData() {
        const [analytics, systemStatus, posts] = await Promise.all([
            API.adminGetAnalytics(),
            API.adminGetSystemStatus(),
            API.adminGetPosts()
        ]);

        this.analytics = analytics;
        this.systemStatus = systemStatus;
        this.recentPosts = posts.posts.slice(0, 5);
    }

    render() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="admin-dashboard">
                <!-- Header -->
                <div class="bg-secondary-bg mb-8">
                    <div class="container mx-auto px-4 py-6">
                        <h1 class="text-3xl font-bold">Admin Dashboard</h1>
                    </div>
                </div>

                <div class="container mx-auto px-4">
                    <!-- Quick Actions -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <a href="/admin/browse" class="bg-card-bg hover:bg-hover-bg rounded-lg p-6 text-center transition">
                            <i class="fas fa-search text-3xl text-netflix-red mb-3"></i>
                            <p class="font-medium">Browse Content</p>
                        </a>
                        <a href="/admin/create-post" class="bg-card-bg hover:bg-hover-bg rounded-lg p-6 text-center transition">
                            <i class="fas fa-plus-circle text-3xl text-netflix-red mb-3"></i>
                            <p class="font-medium">Create Post</p>
                        </a>
                        <a href="/admin/posts" class="bg-card-bg hover:bg-hover-bg rounded-lg p-6 text-center transition">
                            <i class="fas fa-list text-3xl text-netflix-red mb-3"></i>
                            <p class="font-medium">Manage Posts</p>
                        </a>
                        <button onclick="AdminDashboardInstance.syncContent()" class="bg-card-bg hover:bg-hover-bg rounded-lg p-6 text-center transition">
                            <i class="fas fa-sync text-3xl text-netflix-red mb-3"></i>
                            <p class="font-medium">Sync Content</p>
                        </button>
                    </div>

                    <!-- System Status -->
                    ${this.renderSystemStatus()}

                    <!-- Analytics Overview -->
                    ${this.renderAnalytics()}

                    <!-- Recent Posts -->
                    ${this.renderRecentPosts()}
                </div>
            </div>
        `;
    }

    renderSystemStatus() {
        if (!this.systemStatus) return '';

        const statusColor = (status) => {
            switch (status) {
                case 'healthy': return 'text-success';
                case 'error': return 'text-error';
                default: return 'text-warning';
            }
        };

        return `
            <div class="bg-card-bg rounded-lg p-6 mb-8">
                <h2 class="text-xl font-bold mb-4">System Status</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p class="text-text-secondary text-sm">Database</p>
                        <p class="font-medium ${statusColor(this.systemStatus.database)}">
                            ${this.systemStatus.database.toUpperCase()}
                        </p>
                    </div>
                    <div>
                        <p class="text-text-secondary text-sm">TMDB API</p>
                        <p class="font-medium ${statusColor(this.systemStatus.external_apis?.tmdb)}">
                            ${(this.systemStatus.external_apis?.tmdb || 'unknown').toUpperCase()}
                        </p>
                    </div>
                    <div>
                        <p class="text-text-secondary text-sm">Telegram Bot</p>
                        <p class="font-medium ${statusColor(this.systemStatus.telegram_bot)}">
                            ${this.systemStatus.telegram_bot.toUpperCase()}
                        </p>
                    </div>
                    <div>
                        <p class="text-text-secondary text-sm">Content Count</p>
                        <p class="font-medium">${this.systemStatus.content_count}</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderAnalytics() {
        if (!this.analytics) return '';

        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <!-- Users Overview -->
                <div class="bg-card-bg rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4">Users</h2>
                    <div class="space-y-4">
                        <div class="flex justify-between">
                            <span class="text-text-secondary">Total Users</span>
                            <span class="font-medium">${this.analytics.users.total}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-text-secondary">Active (30 days)</span>
                            <span class="font-medium">${this.analytics.users.active_monthly}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-text-secondary">Engagement Rate</span>
                            <span class="font-medium">${this.analytics.users.engagement_rate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <!-- Content Stats -->
                <div class="bg-card-bg rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4">Content</h2>
                    <div class="space-y-4">
                        <div class="flex justify-between">
                            <span class="text-text-secondary">Total Content</span>
                            <span class="font-medium">${this.analytics.content.total}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-text-secondary">Total Interactions</span>
                            <span class="font-medium">${this.analytics.interactions.total}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-text-secondary">Admin Posts</span>
                            <span class="font-medium">${this.analytics.admin_posts.active} active</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentPosts() {
        if (!this.recentPosts || this.recentPosts.length === 0) return '';

        return `
            <div class="bg-card-bg rounded-lg p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold">Recent Admin Posts</h2>
                    <a href="/admin/posts" class="text-netflix-red hover:underline">View All</a>
                </div>
                <div class="space-y-4">
                    ${this.recentPosts.map(post => `
                        <div class="flex items-center justify-between py-3 border-b border-border-color last:border-0">
                            <div>
                                <p class="font-medium">${post.title}</p>
                                <p class="text-sm text-text-secondary">
                                    ${post.content.title} • ${new Date(post.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div class="flex items-center space-x-2">
                                ${post.post_to_telegram ? '<i class="fab fa-telegram text-text-muted"></i>' : ''}
                                <span class="px-2 py-1 bg-${post.is_active ? 'success' : 'error'}/20 text-${post.is_active ? 'success' : 'error'} rounded text-xs">
                                    ${post.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async syncContent() {
        try {
            Loading.show('Syncing content...');
            await API.request('/admin/enhanced-sync', { method: 'POST' });
            new Toast('Content sync started', 'success').show();
        } catch (error) {
            new Toast('Sync failed', 'error').show();
        } finally {
            Loading.hide();
        }
    }
}

const AdminDashboardInstance = new AdminDashboard();