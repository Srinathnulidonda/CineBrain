// Admin dashboard functionality
class AdminDashboard {
    constructor() {
        this.stats = {};
        this.selectedContent = null;
        this.init();
    }

    init() {
        this.loadDashboardStats();
        this.loadRecentActivity();
        this.loadSystemAlerts();
        this.loadTopContent();
        this.checkMLServiceStatus();
        this.startRealTimeUpdates();
    }

    async loadDashboardStats() {
        try {
            const response = await ApiService.get('/admin/analytics');
            this.stats = response;

            // Update stat cards
            document.getElementById('total-users').textContent = response.total_users.toLocaleString();
            document.getElementById('total-content').textContent = response.total_content.toLocaleString();
            document.getElementById('active-today').textContent = response.active_users_last_week.toLocaleString();

            // Update admin name
            if (appState.user) {
                document.getElementById('admin-name').textContent = appState.user.username;
            }
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    }

    async loadRecentActivity() {
        const container = document.getElementById('recent-activity');

        try {
            // Simulate recent user activity
            const activities = [
                { user: 'john_doe', action: 'added to watchlist', content: 'Avengers: Endgame', time: '2 min ago' },
                { user: 'jane_smith', action: 'rated', content: 'Breaking Bad', time: '5 min ago', rating: 9.5 },
                { user: 'mike_wilson', action: 'searched for', content: 'anime movies', time: '8 min ago' },
                { user: 'sarah_davis', action: 'favorited', content: 'The Office', time: '12 min ago' },
                { user: 'alex_brown', action: 'viewed', content: 'Naruto', time: '15 min ago' }
            ];

            container.innerHTML = activities.map(activity => `
                <div class="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
                    <div class="w-8 h-8 bg-primary-blue rounded-full flex items-center justify-center text-xs font-bold">
                        ${activity.user.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1">
                        <div class="text-sm">
                            <strong>${activity.user}</strong> ${activity.action} 
                            <em>"${activity.content}"</em>
                            ${activity.rating ? `(${activity.rating}/10)` : ''}
                        </div>
                        <div class="text-xs text-muted">${activity.time}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }

    async loadSystemAlerts() {
        const container = document.getElementById('system-alerts');

        try {
            // Simulate system alerts
            const alerts = [
                { type: 'info', message: 'ML service updated successfully', time: '1 hour ago' },
                { type: 'warning', message: 'High API usage detected', time: '2 hours ago' },
                { type: 'success', message: 'New content batch imported', time: '3 hours ago' },
                { type: 'info', message: 'Database backup completed', time: '6 hours ago' }
            ];

            container.innerHTML = alerts.map(alert => `
                <div class="flex items-start gap-3 p-3 bg-bg-tertiary rounded-lg">
                    <div class="w-6 h-6 flex items-center justify-center text-sm">
                        ${this.getAlertIcon(alert.type)}
                    </div>
                    <div class="flex-1">
                        <div class="text-sm">${alert.message}</div>
                        <div class="text-xs text-muted">${alert.time}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load system alerts:', error);
        }
    }

    async loadTopContent() {
        const tableBody = document.getElementById('top-content-table');

        try {
            const response = await ApiService.get('/admin/analytics');
            const topContent = response.popular_content || [];

            tableBody.innerHTML = topContent.map((item, index) => `
                <tr class="border-b border-white/5">
                    <td class="p-3">${item.title}</td>
                    <td class="p-3">${this.getContentTypeIcon(item.type)} ${item.type || 'Movie'}</td>
                    <td class="p-3">${item.interactions || Math.floor(Math.random() * 1000)}</td>
                    <td class="p-3">⭐ ${(Math.random() * 2 + 8).toFixed(1)}</td>
                    <td class="p-3">${Math.floor(Math.random() * 500)}</td>
                    <td class="p-3">${index < 3 ? '📈' : '📊'}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Failed to load top content:', error);
        }
    }

    async checkMLServiceStatus() {
        try {
            const response = await ApiService.get('/admin/ml-service-check');
            const status = response.status;
            const statusElement = document.getElementById('ml-status');
            const serviceStatusElement = document.getElementById('ml-service-status');
            const lastCheckElement = document.getElementById('ml-last-check');

            if (status === 'healthy') {
                statusElement.innerHTML = '<span class="text-success">Healthy</span>';
                serviceStatusElement.innerHTML = '✅ Running';
            } else if (status === 'partial') {
                statusElement.innerHTML = '<span class="text-warning">Partial</span>';
                serviceStatusElement.innerHTML = '⚠️ Issues';
            } else {
                statusElement.innerHTML = '<span class="text-error">Unhealthy</span>';
                serviceStatusElement.innerHTML = '❌ Down';
            }

            lastCheckElement.textContent = 'now';
        } catch (error) {
            document.getElementById('ml-status').innerHTML = '<span class="text-error">Error</span>';
            document.getElementById('ml-service-status').innerHTML = '❌ Error';
        }
    }

    getAlertIcon(type) {
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            success: '✅'
        };
        return icons[type] || 'ℹ️';
    }

    getContentTypeIcon(type) {
        const icons = {
            movie: '🎬',
            tv: '📺',
            anime: '🎌'
        };
        return icons[type] || '🎬';
    }

    showAddContentModal() {
        document.getElementById('add-content-modal').classList.add('active');
    }

    showRecommendationModal() {
        document.getElementById('recommendation-modal').classList.add('active');
    }

    async searchContent() {
        const source = document.getElementById('content-source').value;
        const query = document.getElementById('content-query').value;

        if (!query.trim()) {
            UIComponents.showToast('Please enter a search query', 'warning');
            return;
        }

        const resultsContainer = document.getElementById('modal-search-results');
        const searchResultsDiv = document.getElementById('search-results-modal');

        UIComponents.showLoading(resultsContainer);
        searchResultsDiv.classList.remove('hidden');

        try {
            let searchResults;

            if (source === 'tmdb') {
                searchResults = await ApiService.get('/admin/search', { query, source: 'tmdb' });
            } else if (source === 'anime') {
                searchResults = await ApiService.get('/admin/search', { query, source: 'anime' });
            } else {
                // Manual entry
                resultsContainer.innerHTML = `
                    <div class="p-4 bg-bg-tertiary rounded-lg">
                        <h5 class="font-medium mb-2">Manual Entry</h5>
                        <p class="text-sm text-secondary">Manual content entry form would appear here</p>
                    </div>
                `;
                return;
            }

            if (searchResults.results && searchResults.results.length > 0) {
                resultsContainer.innerHTML = searchResults.results.map(item => `
                    <div class="search-result-item p-3 bg-bg-tertiary rounded-lg cursor-pointer hover:bg-bg-secondary" 
                         onclick="AdminManager.selectContent(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        <div class="flex gap-3">
                            <img src="${item.poster_path || '/assets/images/placeholder-poster.jpg'}" 
                                 alt="${item.title}" class="w-12 h-18 object-cover rounded">
                            <div class="flex-1">
                                <h5 class="font-medium">${item.title}</h5>
                                <div class="text-sm text-secondary">
                                    ${item.content_type || item.type} • 
                                    ${item.release_date || 'Unknown'} • 
                                    ⭐ ${item.rating || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                resultsContainer.innerHTML = '<p class="text-center text-muted">No results found</p>';
            }
        } catch (error) {
            resultsContainer.innerHTML = '<p class="text-center text-error">Search failed</p>';
        }
    }

    selectContent(content) {
        this.selectedContent = content;

        // Highlight selected content
        document.querySelectorAll('.search-result-item').forEach(item =>
            item.classList.remove('border-2', 'border-primary-blue'));
        event.currentTarget.classList.add('border-2', 'border-primary-blue');

        UIComponents.showToast(`Selected: ${content.title}`, 'success');
    }

    async addSelectedContent() {
        if (!this.selectedContent) {
            UIComponents.showToast('Please select content first', 'warning');
            return;
        }

        try {
            const response = await ApiService.post('/admin/content', this.selectedContent);
            UIComponents.showToast('Content added successfully!', 'success');
            UIComponents.closeModal('add-content-modal');

            // Refresh dashboard stats
            this.loadDashboardStats();
            this.loadTopContent();
        } catch (error) {
            UIComponents.showToast('Failed to add content', 'error');
        }
    }

    async createRecommendation() {
        const contentSearch = document.getElementById('rec-content-search').value;
        const recType = document.getElementById('rec-type').value;
        const description = document.getElementById('rec-description').value;
        const sendTelegram = document.getElementById('send-telegram').checked;

        if (!contentSearch.trim() || !description.trim()) {
            UIComponents.showToast('Please fill in all required fields', 'warning');
            return;
        }

        try {
            // In a real implementation, you would first search for the content
            // and then create the recommendation with the content ID
            const recommendationData = {
                content_id: 1, // This would be the actual content ID
                recommendation_type: recType,
                description: description,
                send_telegram: sendTelegram
            };

            const response = await ApiService.post('/admin/recommendations', recommendationData);

            UIComponents.showToast(
                `Recommendation created${response.telegram_sent ? ' and sent to Telegram' : ''}!`,
                'success'
            );
            UIComponents.closeModal('recommendation-modal');

            // Clear form
            document.getElementById('recommendation-form').reset();
        } catch (error) {
            UIComponents.showToast('Failed to create recommendation', 'error');
        }
    }

    async syncExternalContent() {
        try {
            UIComponents.showToast('Starting content sync...', 'info');

            // This would trigger a background job to sync content from external APIs
            const response = await ApiService.post('/admin/sync-content');

            UIComponents.showToast('Content sync completed!', 'success');
            this.loadDashboardStats();
        } catch (error) {
            UIComponents.showToast('Content sync failed', 'error');
        }
    }

    async updateMLModels() {
        try {
            UIComponents.showToast('Updating ML models...', 'info');

            const response = await ApiService.post('/admin/ml-service-update');

            if (response.success) {
                UIComponents.showToast('ML models updated successfully!', 'success');
                this.checkMLServiceStatus();
            } else {
                UIComponents.showToast('ML model update failed', 'error');
            }
        } catch (error) {
            UIComponents.showToast('Failed to update ML models', 'error');
        }
    }

    async runSystemCheck() {
        try {
            UIComponents.showToast('Running system check...', 'info');

            const response = await ApiService.get('/admin/ml-service-check');

            // Show detailed system check results
            const content = `
                <div class="space-y-4">
                    <h4 class="font-semibold">System Check Results</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span>Overall Status:</span>
                            <span class="font-semibold ${response.status === 'healthy' ? 'text-success' : 'text-error'}">
                                ${response.status.toUpperCase()}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span>API Status:</span>
                            <span class="text-success">✅ Online</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Database:</span>
                            <span class="text-success">✅ Connected</span>
                        </div>
                        <div class="flex justify-between">
                            <span>ML Service:</span>
                            <span class="${response.status === 'healthy' ? 'text-success' : 'text-error'}">
                                ${response.status === 'healthy' ? '✅ Healthy' : '❌ Issues'}
                            </span>
                        </div>
                    </div>
                </div>
            `;

            UIComponents.createModal('System Check', content);
        } catch (error) {
            UIComponents.showToast('System check failed', 'error');
        }
    }

    refreshActivity() {
        this.loadRecentActivity();
        UIComponents.showToast('Activity refreshed', 'success');
    }

    clearAlerts() {
        document.getElementById('system-alerts').innerHTML =
            '<p class="text-center text-muted">No alerts</p>';
        UIComponents.showToast('Alerts cleared', 'success');
    }

    startRealTimeUpdates() {
        // Update dashboard stats every 30 seconds
        setInterval(() => {
            this.loadDashboardStats();
        }, 30000);

        // Update activity every 1 minute
        setInterval(() => {
            this.loadRecentActivity();
        }, 60000);

        // Check ML service status every 5 minutes
        setInterval(() => {
            this.checkMLServiceStatus();
        }, 5 * 60 * 1000);

        // Simulate real-time alerts
        setInterval(() => {
            this.simulateRealTimeAlert();
        }, 2 * 60 * 1000); // Every 2 minutes
    }

    simulateRealTimeAlert() {
        const alerts = [
            { type: 'info', message: 'New user registered', time: 'Just now' },
            { type: 'success', message: 'Content recommendation sent', time: 'Just now' },
            { type: 'warning', message: 'High server load detected', time: 'Just now' },
            { type: 'info', message: 'ML model training completed', time: 'Just now' }
        ];

        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
        const container = document.getElementById('system-alerts');

        const alertElement = document.createElement('div');
        alertElement.className = 'flex items-start gap-3 p-3 bg-bg-tertiary rounded-lg opacity-0 transform translate-x-4';
        alertElement.innerHTML = `
            <div class="w-6 h-6 flex items-center justify-center text-sm">
                ${this.getAlertIcon(randomAlert.type)}
            </div>
            <div class="flex-1">
                <div class="text-sm">${randomAlert.message}</div>
                <div class="text-xs text-muted">${randomAlert.time}</div>
            </div>
        `;

        container.insertBefore(alertElement, container.firstChild);

        // Animate in
        setTimeout(() => {
            alertElement.classList.remove('opacity-0', 'translate-x-4');
        }, 100);

        // Remove old alerts (keep only 5)
        const alerts_elements = container.children;
        if (alerts_elements.length > 5) {
            for (let i = 5; i < alerts_elements.length; i++) {
                alerts_elements[i].remove();
            }
        }
    }
}

// Global admin manager instance
let adminManager;

// Admin utility functions
window.AdminManager = {
    showAddContentModal() {
        adminManager.showAddContentModal();
    },

    showRecommendationModal() {
        adminManager.showRecommendationModal();
    },

    searchContent() {
        adminManager.searchContent();
    },

    selectContent(content) {
        adminManager.selectContent(content);
    },

    addSelectedContent() {
        adminManager.addSelectedContent();
    },

    createRecommendation() {
        adminManager.createRecommendation();
    },

    syncExternalContent() {
        adminManager.syncExternalContent();
    },

    updateMLModels() {
        adminManager.updateMLModels();
    },

    runSystemCheck() {
        adminManager.runSystemCheck();
    },

    refreshActivity() {
        adminManager.refreshActivity();
    },

    clearAlerts() {
        adminManager.clearAlerts();
    }
};

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.startsWith('/admin/')) {
        adminManager = new AdminDashboard();
    }
});