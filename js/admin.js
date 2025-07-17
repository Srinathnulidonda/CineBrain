// Admin panel functionality
class AdminPanel {
    constructor() {
        this.currentView = 'dashboard';
        this.contentCache = new Map();
        this.postsCache = new Map();
        this.analyticsCache = null;
        this.init();
    }

    async init() {
        // Check admin authentication
        if (!authManager.requireAdmin()) return;

        this.initEventListeners();
        await this.loadInitialData();
        this.initAutoRefresh();
    }

    initEventListeners() {
        // Navigation
        const navLinks = document.querySelectorAll('.admin-nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Content browser events
        document.getElementById('contentSource')?.addEventListener('change', (e) => {
            this.loadContentBrowser(e.target.value);
        });

        document.getElementById('contentSearch')?.addEventListener('input', 
            Utils.debounce((e) => this.searchContent(e.target.value), 500)
        );

        document.getElementById('contentType')?.addEventListener('change', () => {
            this.loadContentBrowser();
        });

        document.getElementById('contentLanguage')?.addEventListener('change', () => {
            this.loadContentBrowser();
        });

        // Post management events
        document.getElementById('createPostBtn')?.addEventListener('click', () => {
            this.showCreatePostModal();
        });

        document.getElementById('refreshPostsBtn')?.addEventListener('click', () => {
            this.loadPosts(true);
        });

        // Analytics events
        document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', () => {
            this.loadAnalytics(true);
        });

        document.getElementById('syncContentBtn')?.addEventListener('click', () => {
            this.syncContent();
        });

        // System status events
        document.getElementById('checkSystemBtn')?.addEventListener('click', () => {
            this.checkSystemStatus();
        });
    }

    async loadInitialData() {
        try {
            showLoader(true, 'Loading admin panel...');
            
            // Load based on current page
            const path = window.location.pathname;
            
            if (path.includes('content-browser.html')) {
                await this.loadContentBrowser();
            } else if (path.includes('posts.html')) {
                await this.loadPosts();
            } else if (path.includes('analytics.html')) {
                await this.loadAnalytics();
            } else {
                await this.loadDashboard();
            }
            
            showLoader(false);
        } catch (error) {
            showLoader(false);
            console.error('Failed to load admin data:', error);
            UIComponents.showToast('Failed to load admin data', 'error');
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Update navigation
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');

        // Load view data
        switch (view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'content':
                this.loadContentBrowser();
                break;
            case 'posts':
                this.loadPosts();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    async loadDashboard() {
        try {
            const [analytics, systemStatus] = await Promise.all([
                apiService.adminGetAnalytics(),
                apiService.adminGetSystemStatus()
            ]);

            this.renderDashboardOverview(analytics, systemStatus);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    renderDashboardOverview(analytics, systemStatus) {
        // Update overview cards
        const overviewCards = document.getElementById('overviewCards');
        if (overviewCards) {
            overviewCards.innerHTML = `
                <div class="overview-card">
                    <div class="card-icon bg-blue-500">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                        </svg>
                    </div>
                    <div class="card-content">
                        <h3>Total Users</h3>
                        <p class="stat-number">${analytics.users.total}</p>
                        <p class="stat-change text-green-400">+${analytics.users.active_monthly} active</p>
                    </div>
                </div>
                <div class="overview-card">
                    <div class="card-icon bg-purple-500">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3z"></path>
                        </svg>
                    </div>
                    <div class="card-content">
                        <h3>Total Content</h3>
                        <p class="stat-number">${analytics.content.total}</p>
                        <p class="stat-change text-blue-400">${analytics.content.popular?.length || 0} popular</p>
                    </div>
                </div>
                <div class="overview-card">
                    <div class="card-icon bg-green-500">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div class="card-content">
                        <h3>Interactions</h3>
                        <p class="stat-number">${analytics.interactions.total}</p>
                        <p class="stat-change text-yellow-400">${analytics.users.engagement_rate.toFixed(1)}% engagement</p>
                    </div>
                </div>
                <div class="overview-card">
                    <div class="card-icon bg-red-500">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                        </svg>
                    </div>
                    <div class="card-content">
                        <h3>Admin Posts</h3>
                        <p class="stat-number">${analytics.admin_posts.total}</p>
                        <p class="stat-change text-purple-400">${analytics.admin_posts.active} active</p>
                    </div>
                </div>
            `;
        }

        // Update system status
        const systemStatusContainer = document.getElementById('systemStatus');
        if (systemStatusContainer) {
            const statusColor = {
                healthy: 'text-green-400',
                error: 'text-red-400',
                disabled: 'text-yellow-400'
            };

            systemStatusContainer.innerHTML = `
                <div class="status-item">
                    <span>Database</span>
                    <span class="status-indicator ${statusColor[systemStatus.database]}">${systemStatus.database}</span>
                </div>
                <div class="status-item">
                    <span>TMDB API</span>
                    <span class="status-indicator ${statusColor[systemStatus.external_apis.tmdb]}">${systemStatus.external_apis.tmdb}</span>
                </div>
                <div class="status-item">
                    <span>Telegram Bot</span>
                    <span class="status-indicator ${statusColor[systemStatus.telegram_bot]}">${systemStatus.telegram_bot}</span>
                </div>
                <div class="status-item">
                    <span>Content Count</span>
                    <span class="status-value">${systemStatus.content_count}</span>
                </div>
            `;
        }

        // Render charts if analytics container exists
        this.renderAnalyticsCharts(analytics);
    }

    async loadContentBrowser(source = 'tmdb') {
        try {
            showLoader(true, 'Loading content...');

            const params = {
                source: source,
                type: document.getElementById('contentType')?.value || 'movie',
                language: document.getElementById('contentLanguage')?.value || 'en',
                page: 1
            };

            const searchQuery = document.getElementById('contentSearch')?.value;
            if (searchQuery) {
                params.q = searchQuery;
            }

            const data = await apiService.adminBrowseContent(params);
            this.renderContentBrowser(data);

            showLoader(false);
        } catch (error) {
            showLoader(false);
            console.error('Failed to load content:', error);
            UIComponents.showToast('Failed to load content', 'error');
        }
    }

    renderContentBrowser(data) {
        const container = document.getElementById('contentGrid');
        if (!container) return;

        if (!data.results || data.results.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-text-secondary">
                    <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                    <p>No content found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.results.map(item => {
            const title = item.title || item.name || 'Unknown Title';
            const year = item.release_date ? new Date(item.release_date).getFullYear() : 
                        item.first_air_date ? new Date(item.first_air_date).getFullYear() : '';
            const poster = item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : 
                         item.images?.jpg?.image_url || '/assets/images/placeholder-poster.jpg';
            const rating = item.vote_average || item.score || 'N/A';

            return `
                <div class="admin-content-card" data-content='${JSON.stringify(item)}'>
                    <img src="${poster}" alt="${title}" class="content-poster" loading="lazy">
                    <div class="content-info">
                        <h3 class="content-title">${title}</h3>
                        <div class="content-meta">
                            ${year ? `<span>${year}</span>` : ''}
                            ${rating !== 'N/A' ? `<span>⭐ ${rating}</span>` : ''}
                        </div>
                        <div class="content-actions">
                            <button class="btn-primary btn-sm create-post-btn">Create Post</button>
                            <button class="btn-secondary btn-sm view-details-btn">View Details</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to action buttons
        container.querySelectorAll('.create-post-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.admin-content-card');
                const contentData = JSON.parse(card.getAttribute('data-content'));
                this.showCreatePostModal(contentData);
            });
        });

        container.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.admin-content-card');
                const contentData = JSON.parse(card.getAttribute('data-content'));
                this.showContentDetailsModal(contentData);
            });
        });
    }

    async searchContent(query) {
        if (!query.trim()) {
            this.loadContentBrowser();
            return;
        }

        await this.loadContentBrowser();
    }

    async loadPosts(force = false) {
        try {
            if (!force && this.postsCache.size > 0) {
                this.renderPosts(Array.from(this.postsCache.values()));
                return;
            }

            showLoader(true, 'Loading posts...');

            const data = await apiService.adminGetPosts();
            
            // Cache posts
            this.postsCache.clear();
            data.posts.forEach(post => {
                this.postsCache.set(post.id, post);
            });

            this.renderPosts(data.posts);
            showLoader(false);
        } catch (error) {
            showLoader(false);
            console.error('Failed to load posts:', error);
            UIComponents.showToast('Failed to load posts', 'error');
        }
    }

    renderPosts(posts) {
        const container = document.getElementById('postsContainer');
        if (!container) return;

        if (!posts || posts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-text-secondary">
                    <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p>No posts created yet</p>
                    <button class="btn-primary mt-4" onclick="adminPanel.showCreatePostModal()">Create First Post</button>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="admin-post-card ${!post.is_active ? 'opacity-50' : ''}">
                <div class="flex items-start space-x-4">
                    <img src="${post.content.poster_path || '/assets/images/placeholder-poster.jpg'}" 
                         alt="${post.content.title}" class="w-16 h-24 object-cover rounded">
                    <div class="flex-1">
                        <div class="flex items-start justify-between mb-2">
                            <h3 class="font-bold text-lg">${post.title}</h3>
                            <div class="flex items-center space-x-2">
                                <span class="status-badge ${post.is_active ? 'bg-green-500' : 'bg-gray-500'}">
                                    ${post.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <div class="flex items-center space-x-1">
                                    <button class="action-btn edit-post-btn" data-post-id="${post.id}" title="Edit">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                        </svg>
                                    </button>
                                    <button class="action-btn delete-post-btn" data-post-id="${post.id}" title="Delete">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p class="text-text-secondary mb-2">${post.description}</p>
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <span class="text-sm text-text-secondary">Movie: ${post.content.title}</span>
                            <span class="text-sm text-text-secondary">Priority: ${post.priority}</span>
                            <span class="text-sm text-text-secondary">Created: ${Utils.formatDate(post.created_at)}</span>
                        </div>
                        ${post.custom_tags && post.custom_tags.length > 0 ? `
                            <div class="flex flex-wrap gap-1">
                                ${post.custom_tags.map(tag => `<span class="custom-tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div class="flex items-center justify-between mt-3 pt-3 border-t border-border-color">
                            <div class="flex items-center space-x-4 text-sm text-text-secondary">
                                <span>By: ${post.admin_user}</span>
                                ${post.telegram_message_id ? '<span class="text-blue-400">📱 Posted to Telegram</span>' : ''}
                            </div>
                            ${post.expires_at ? `<span class="text-sm text-yellow-400">Expires: ${Utils.formatDate(post.expires_at)}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.edit-post-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const postId = parseInt(btn.getAttribute('data-post-id'));
                const post = this.postsCache.get(postId);
                this.showEditPostModal(post);
            });
        });

        container.querySelectorAll('.delete-post-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const postId = parseInt(btn.getAttribute('data-post-id'));
                this.deletePost(postId);
            });
        });
    }

    async loadAnalytics(force = false) {
        try {
            if (!force && this.analyticsCache) {
                this.renderAnalytics(this.analyticsCache);
                return;
            }

            showLoader(true, 'Loading analytics...');

            const data = await apiService.adminGetAnalytics();
            this.analyticsCache = data;
            
            this.renderAnalytics(data);
            showLoader(false);
        } catch (error) {
            showLoader(false);
            console.error('Failed to load analytics:', error);
            UIComponents.showToast('Failed to load analytics', 'error');
        }
    }

    renderAnalytics(data) {
        // Render analytics overview
        const analyticsOverview = document.getElementById('analyticsOverview');
        if (analyticsOverview) {
            analyticsOverview.innerHTML = `
                <div class="analytics-card">
                    <h3>User Engagement</h3>
                    <div class="metric-grid">
                        <div class="metric">
                            <span class="metric-label">Total Users</span>
                            <span class="metric-value">${data.users.total}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Active Users</span>
                            <span class="metric-value">${data.users.active_monthly}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Engagement Rate</span>
                            <span class="metric-value">${data.users.engagement_rate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                <div class="analytics-card">
                    <h3>Content Performance</h3>
                    <div class="metric-grid">
                        <div class="metric">
                            <span class="metric-label">Total Content</span>
                            <span class="metric-value">${data.content.total}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Popular Items</span>
                            <span class="metric-value">${data.content.popular?.length || 0}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Total Interactions</span>
                            <span class="metric-value">${data.interactions.total}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Render popular content
        const popularContent = document.getElementById('popularContent');
        if (popularContent && data.content.popular) {
            popularContent.innerHTML = data.content.popular.map(item => `
                <div class="popular-item">
                    <span class="item-title">${item.title}</span>
                    <span class="item-count">${item.interactions} interactions</span>
                </div>
            `).join('');
        }

        // Render genre preferences
        const genrePreferences = document.getElementById('genrePreferences');
        if (genrePreferences && data.preferences.top_genres) {
            const genres = Object.entries(data.preferences.top_genres).sort(([,a], [,b]) => b - a);
            genrePreferences.innerHTML = genres.slice(0, 10).map(([genre, count]) => `
                <div class="genre-item">
                    <span class="genre-name">${genre}</span>
                    <div class="genre-bar">
                        <div class="genre-fill" style="width: ${(count / genres[0][1] * 100)}%"></div>
                    </div>
                    <span class="genre-count">${count}</span>
                </div>
            `).join('');
        }

        this.renderAnalyticsCharts(data);
    }

    renderAnalyticsCharts(data) {
        // Simple chart rendering using CSS
        const chartContainer = document.getElementById('chartsContainer');
        if (!chartContainer) return;

        // Interaction types chart
        if (data.interactions.by_type) {
            const totalInteractions = data.interactions.by_type.reduce((sum, item) => sum + item.count, 0);
            
            const interactionChart = `
                <div class="chart-card">
                    <h4>Interaction Types</h4>
                    <div class="chart-bars">
                        ${data.interactions.by_type.map(item => `
                            <div class="chart-bar">
                                <div class="bar-label">${item.type}</div>
                                <div class="bar-track">
                                    <div class="bar-fill" style="width: ${(item.count / totalInteractions * 100)}%"></div>
                                </div>
                                <div class="bar-value">${item.count}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            chartContainer.innerHTML = interactionChart;
        }
    }

    showCreatePostModal(contentData = null) {
        const modalContent = `
            <form id="createPostForm" class="space-y-4">
                ${contentData ? `
                    <div class="selected-content">
                        <h4>Selected Content:</h4>
                        <div class="content-preview">
                            <img src="${contentData.poster_path ? `https://image.tmdb.org/t/p/w92${contentData.poster_path}` : '/assets/images/placeholder-poster.jpg'}" 
                                 alt="${contentData.title || contentData.name}" class="w-16 h-24 object-cover rounded">
                            <div>
                                <h5>${contentData.title || contentData.name}</h5>
                                <p class="text-sm text-text-secondary">
                                    ${contentData.release_date ? new Date(contentData.release_date).getFullYear() : ''}
                                    ${contentData.vote_average ? `• ⭐ ${contentData.vote_average}` : ''}
                                </p>
                            </div>
                        </div>
                        <input type="hidden" name="tmdb_id" value="${contentData.id}">
                        <input type="hidden" name="tmdb_data" value='${JSON.stringify(contentData)}'>
                    </div>
                ` : ''}
                
                <div>
                    <label for="postTitle" class="block text-sm font-medium mb-2">Post Title *</label>
                    <input type="text" id="postTitle" name="title" required 
                           class="form-input" placeholder="Enter post title">
                </div>
                
                <div>
                    <label for="postDescription" class="block text-sm font-medium mb-2">Description</label>
                    <textarea id="postDescription" name="description" rows="3" 
                              class="form-input" placeholder="Enter post description"></textarea>
                </div>
                
                <div>
                    <label for="customTags" class="block text-sm font-medium mb-2">Custom Tags</label>
                    <input type="text" id="customTags" name="custom_tags" 
                           class="form-input" placeholder="Enter tags separated by commas">
                    <p class="text-xs text-text-secondary mt-1">e.g. Must Watch, Hidden Gem, Critics Choice</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="priority" class="block text-sm font-medium mb-2">Priority</label>
                        <select id="priority" name="priority" class="form-input">
                            <option value="1">Low</option>
                            <option value="2" selected>Medium</option>
                            <option value="3">High</option>
                        </select>
                    </div>
                    
                    <div>
                        <label for="expiresAt" class="block text-sm font-medium mb-2">Expires At (Optional)</label>
                        <input type="date" id="expiresAt" name="expires_at" class="form-input">
                    </div>
                </div>
                
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" name="post_to_website" checked class="form-checkbox mr-2">
                        <span>Post to Website</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" name="post_to_telegram" class="form-checkbox mr-2">
                        <span>Post to Telegram Channel</span>
                    </label>
                </div>
                
                <div class="flex space-x-4 pt-4">
                    <button type="submit" class="btn-primary flex-1">Create Post</button>
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </form>
        `;

        const modal = UIComponents.createModal('Create Admin Post', modalContent, { size: 'lg' });

        // Handle form submission
        const form = modal.querySelector('#createPostForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createPost(new FormData(form));
            modal.remove();
        });
    }

    async createPost(formData) {
        try {
            showLoader(true, 'Creating post...');

            const postData = {
                title: formData.get('title'),
                description: formData.get('description'),
                custom_tags: formData.get('custom_tags') ? formData.get('custom_tags').split(',').map(tag => tag.trim()) : [],
                priority: parseInt(formData.get('priority')),
                expires_at: formData.get('expires_at') || null,
                post_to_website: formData.has('post_to_website'),
                post_to_telegram: formData.has('post_to_telegram')
            };

            if (formData.get('tmdb_id')) {
                postData.tmdb_id = formData.get('tmdb_id');
                postData.tmdb_data = JSON.parse(formData.get('tmdb_data'));
            }

            const result = await apiService.adminCreatePost(postData);
            
            showLoader(false);
            UIComponents.showToast(
                `Post created successfully! ${result.telegram_sent ? 'Posted to Telegram.' : ''}`, 
                'success'
            );
            
            // Refresh posts if on posts page
            if (this.currentView === 'posts') {
                this.loadPosts(true);
            }
            
        } catch (error) {
            showLoader(false);
            console.error('Failed to create post:', error);
            UIComponents.showToast('Failed to create post', 'error');
        }
    }

    showEditPostModal(post) {
        const modalContent = `
            <form id="editPostForm" class="space-y-4">
                <input type="hidden" name="post_id" value="${post.id}">
                
                <div>
                    <label for="editPostTitle" class="block text-sm font-medium mb-2">Post Title *</label>
                    <input type="text" id="editPostTitle" name="title" value="${post.title}" required class="form-input">
                </div>
                
                <div>
                    <label for="editPostDescription" class="block text-sm font-medium mb-2">Description</label>
                    <textarea id="editPostDescription" name="description" rows="3" class="form-input">${post.description || ''}</textarea>
                </div>
                
                <div>
                    <label for="editCustomTags" class="block text-sm font-medium mb-2">Custom Tags</label>
                    <input type="text" id="editCustomTags" name="custom_tags" value="${post.custom_tags ? post.custom_tags.join(', ') : ''}" class="form-input">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="editPriority" class="block text-sm font-medium mb-2">Priority</label>
                        <select id="editPriority" name="priority" class="form-input">
                            <option value="1" ${post.priority === 1 ? 'selected' : ''}>Low</option>
                            <option value="2" ${post.priority === 2 ? 'selected' : ''}>Medium</option>
                            <option value="3" ${post.priority === 3 ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                    
                    <div>
                        <label for="editExpiresAt" class="block text-sm font-medium mb-2">Expires At</label>
                        <input type="date" id="editExpiresAt" name="expires_at" value="${post.expires_at ? post.expires_at.split('T')[0] : ''}" class="form-input">
                    </div>
                </div>
                
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" name="is_active" ${post.is_active ? 'checked' : ''} class="form-checkbox mr-2">
                        <span>Active</span>
                    </label>
                </div>
                
                <div class="flex space-x-4 pt-4">
                    <button type="submit" class="btn-primary flex-1">Update Post</button>
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </form>
        `;

        const modal = UIComponents.createModal('Edit Post', modalContent, { size: 'lg' });

        // Handle form submission
        const form = modal.querySelector('#editPostForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updatePost(new FormData(form));
            modal.remove();
        });
    }

    async updatePost(formData) {
        try {
            showLoader(true, 'Updating post...');

            const postId = formData.get('post_id');
            const updateData = {
                title: formData.get('title'),
                description: formData.get('description'),
                custom_tags: formData.get('custom_tags') ? formData.get('custom_tags').split(',').map(tag => tag.trim()) : [],
                priority: parseInt(formData.get('priority')),
                expires_at: formData.get('expires_at') || null,
                is_active: formData.has('is_active')
            };

            await apiService.adminUpdatePost(postId, updateData);
            
            showLoader(false);
            UIComponents.showToast('Post updated successfully!', 'success');
            
            // Update cache
            const post = this.postsCache.get(parseInt(postId));
            if (post) {
                Object.assign(post, updateData);
            }
            
            // Refresh posts
            this.loadPosts(true);
            
        } catch (error) {
            showLoader(false);
            console.error('Failed to update post:', error);
            UIComponents.showToast('Failed to update post', 'error');
        }
    }

    async deletePost(postId) {
        const confirmed = confirm('Are you sure you want to delete this post?');
        if (!confirmed) return;

        try {
            showLoader(true, 'Deleting post...');
            
            await apiService.adminDeletePost(postId);
            
            showLoader(false);
            UIComponents.showToast('Post deleted successfully!', 'success');
            
            // Remove from cache
            this.postsCache.delete(postId);
            
            // Refresh posts
            this.loadPosts(true);
            
        } catch (error) {
            showLoader(false);
            console.error('Failed to delete post:', error);
            UIComponents.showToast('Failed to delete post', 'error');
        }
    }

    async syncContent() {
        const confirmed = confirm('This will sync content from external APIs. It may take a few minutes. Continue?');
        if (!confirmed) return;

        try {
            UIComponents.showToast('Content sync started. This may take a few minutes...', 'info');
            
            await apiService.adminSyncContent();
            
            UIComponents.showToast('Content sync completed successfully!', 'success');
            
        } catch (error) {
            console.error('Content sync failed:', error);
            UIComponents.showToast('Content sync failed', 'error');
        }
    }

    async checkSystemStatus() {
        try {
            showLoader(true, 'Checking system status...');
            
            const status = await apiService.adminGetSystemStatus();
            
            showLoader(false);
            
            // Show detailed status modal
            const modalContent = `
                <div class="space-y-4">
                    <div class="status-grid">
                        <div class="status-item ${status.database === 'healthy' ? 'status-healthy' : 'status-error'}">
                            <span class="status-label">Database</span>
                            <span class="status-value">${status.database}</span>
                        </div>
                        <div class="status-item ${status.external_apis.tmdb === 'healthy' ? 'status-healthy' : 'status-error'}">
                            <span class="status-label">TMDB API</span>
                            <span class="status-value">${status.external_apis.tmdb}</span>
                        </div>
                        <div class="status-item ${status.telegram_bot === 'healthy' ? 'status-healthy' : status.telegram_bot === 'disabled' ? 'status-warning' : 'status-error'}">
                            <span class="status-label">Telegram Bot</span>
                            <span class="status-value">${status.telegram_bot}</span>
                        </div>
                        <div class="status-item status-info">
                            <span class="status-label">Content Count</span>
                            <span class="status-value">${status.content_count}</span>
                        </div>
                        <div class="status-item status-info">
                            <span class="status-label">User Count</span>
                            <span class="status-value">${status.user_count}</span>
                        </div>
                        <div class="status-item ${status.recommendation_matrix === 'built' ? 'status-healthy' : 'status-warning'}">
                            <span class="status-label">Recommendation Matrix</span>
                            <span class="status-value">${status.recommendation_matrix}</span>
                        </div>
                    </div>
                    <div class="text-center text-sm text-text-secondary">
                        Last checked: ${new Date().toLocaleString()}
                    </div>
                </div>
            `;
            
            UIComponents.createModal('System Status', modalContent);
            
        } catch (error) {
            showLoader(false);
            console.error('Failed to check system status:', error);
            UIComponents.showToast('Failed to check system status', 'error');
        }
    }

    showContentDetailsModal(contentData) {
        const title = contentData.title || contentData.name || 'Unknown Title';
        const year = contentData.release_date ? new Date(contentData.release_date).getFullYear() : 
                    contentData.first_air_date ? new Date(contentData.first_air_date).getFullYear() : '';
        const poster = contentData.poster_path ? `https://image.tmdb.org/t/p/w300${contentData.poster_path}` : 
                     contentData.images?.jpg?.image_url || '/assets/images/placeholder-poster.jpg';
        const rating = contentData.vote_average || contentData.score || 'N/A';

        const modalContent = `
            <div class="flex flex-col md:flex-row gap-6">
                <img src="${poster}" alt="${title}" class="w-full md:w-48 h-auto rounded-lg">
                <div class="flex-1">
                    <h2 class="text-2xl font-bold mb-2">${title}</h2>
                    ${contentData.original_title !== title ? `<p class="text-text-secondary mb-2">Original: ${contentData.original_title || contentData.original_name}</p>` : ''}
                    <div class="flex items-center space-x-4 mb-4">
                        ${year ? `<span>${year}</span>` : ''}
                        ${rating !== 'N/A' ? `<span class="flex items-center"><svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>${rating}</span>` : ''}
                        ${contentData.runtime ? `<span>${contentData.runtime} min</span>` : ''}
                    </div>
                    ${contentData.genre_ids && contentData.genre_ids.length > 0 ? `
                        <div class="flex flex-wrap gap-2 mb-4">
                            ${contentData.genre_ids.map(id => `<span class="genre-tag">Genre ${id}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${contentData.overview ? `<p class="text-text-secondary leading-relaxed">${contentData.overview}</p>` : ''}
                    
                    <div class="flex space-x-4 mt-6">
                        <button class="btn-primary" onclick="adminPanel.showCreatePostModal(${JSON.stringify(contentData).replace(/"/g, '&quot;')})">
                            Create Post
                        </button>
                        ${contentData.homepage ? `<a href="${contentData.homepage}" target="_blank" class="btn-secondary">Official Site</a>` : ''}
                    </div>
                </div>
            </div>
        `;

        UIComponents.createModal(title, modalContent, { size: '4xl' });
    }

    initAutoRefresh() {
        // Auto-refresh analytics every 5 minutes
        setInterval(() => {
            if (this.currentView === 'analytics' || this.currentView === 'dashboard') {
                this.loadAnalytics(true);
            }
        }, 5 * 60 * 1000);

        // Auto-refresh posts every 2 minutes
        setInterval(() => {
            if (this.currentView === 'posts') {
                this.loadPosts(true);
            }
        }, 2 * 60 * 1000);
    }
}

// Global admin panel instance
window.adminPanel = new AdminPanel();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin/')) {
        adminPanel.init();
    }
});