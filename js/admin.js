class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.browsedContent = [];
        this.selectedContent = null;
    }

    show() {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-md-2 admin-sidebar">
                        <h4 class="text-netflix mb-4">Admin Panel</h4>
                        <nav class="nav flex-column">
                            <a class="nav-link text-white" href="#" onclick="adminPanel.showDashboard()">
                                <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                            </a>
                            <a class="nav-link text-white" href="#" onclick="adminPanel.showContentBrowser()">
                                <i class="fas fa-search me-2"></i>Browse Content
                            </a>
                            <a class="nav-link text-white" href="#" onclick="adminPanel.showPostManager()">
                                <i class="fas fa-edit me-2"></i>Manage Posts
                            </a>
                            <a class="nav-link text-white" href="#" onclick="adminPanel.showAnalytics()">
                                <i class="fas fa-chart-bar me-2"></i>Analytics
                            </a>
                            <a class="nav-link text-white" href="#" onclick="adminPanel.showSystemStatus()">
                                <i class="fas fa-cog me-2"></i>System Status
                            </a>
                        </nav>
                    </div>
                    <div class="col-md-10 admin-content">
                        <div id="adminContent">
                            ${this.getDashboardHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.loadDashboardData();
    }

    async showDashboard() {
        this.currentSection = 'dashboard';
        document.getElementById('adminContent').innerHTML = this.getDashboardHTML();
        await this.loadDashboardData();
    }

    getDashboardHTML() {
        return `
            <h2 class="text-white mb-4">Admin Dashboard</h2>
            
            <div class="row mb-4" id="statsCards">
                <div class="col-md-3 mb-3">
                    <div class="stats-card">
                        <h4 class="text-netflix">Total Users</h4>
                        <h2 class="text-white" id="totalUsers">-</h2>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stats-card">
                        <h4 class="text-netflix">Active Users</h4>
                        <h2 class="text-white" id="activeUsers">-</h2>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stats-card">
                        <h4 class="text-netflix">Total Content</h4>
                        <h2 class="text-white" id="totalContent">-</h2>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stats-card">
                        <h4 class="text-netflix">Admin Posts</h4>
                        <h2 class="text-white" id="adminPosts">-</h2>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="content-card p-4">
                        <h4 class="text-white mb-3">Popular Content</h4>
                        <div id="popularContent">Loading...</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="content-card p-4">
                        <h4 class="text-white mb-3">Quick Actions</h4>
                        <div class="d-grid gap-2">
                            <button class="btn btn-netflix" onclick="adminPanel.showContentBrowser()">
                                Browse & Add Content
                            </button>
                            <button class="btn btn-outline-light" onclick="adminPanel.syncContent()">
                                Sync Latest Content
                            </button>
                            <button class="btn btn-outline-light" onclick="adminPanel.showPostManager()">
                                Manage Posts
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadDashboardData() {
        try {
            const analytics = await api.adminGetAnalytics();
            
            document.getElementById('totalUsers').textContent = analytics.users.total;
            document.getElementById('activeUsers').textContent = analytics.users.active_monthly;
            document.getElementById('totalContent').textContent = analytics.content.total;
            document.getElementById('adminPosts').textContent = analytics.admin_posts.total;
            
            const popularContentHTML = analytics.content.popular.map(item => `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-secondary rounded">
                    <span class="text-white">${item.title}</span>
                    <span class="badge badge-netflix">${item.interactions} interactions</span>
                </div>
            `).join('');
            
            document.getElementById('popularContent').innerHTML = popularContentHTML || '<p class="text-light">No data available</p>';
        } catch (error) {
            app.showToast('Failed to load dashboard data', 'error');
        }
    }

    showContentBrowser() {
        this.currentSection = 'browser';
        document.getElementById('adminContent').innerHTML = `
            <h2 class="text-white mb-4">Browse & Add Content</h2>
            
            <div class="content-card p-4 mb-4">
                <div class="row">
                    <div class="col-md-3">
                        <label class="form-label text-white">Source</label>
                        <select class="form-select" id="contentSource">
                            <option value="tmdb">TMDB</option>
                            <option value="regional">Regional</option>
                            <option value="anime">Anime</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label text-white">Type</label>
                        <select class="form-select" id="contentType">
                            <option value="movie">Movie</option>
                            <option value="tv">TV Show</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label text-white">Language</label>
                        <select class="form-select" id="contentLanguage">
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                            <option value="te">Telugu</option>
                            <option value="ta">Tamil</option>
                            <option value="kn">Kannada</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label text-white">Search</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="contentSearch" placeholder="Search...">
                            <button class="btn btn-netflix" onclick="adminPanel.browseContent()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="browsedResults">
                <div class="text-center text-light p-5">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <p>Select options and search to browse content</p>
                </div>
            </div>
        `;
        
        document.getElementById('contentSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.browseContent();
            }
        });
    }

    async browseContent() {
        const source = document.getElementById('contentSource').value;
        const type = document.getElementById('contentType').value;
        const language = document.getElementById('contentLanguage').value;
        const query = document.getElementById('contentSearch').value;
        
        const resultsDiv = document.getElementById('browsedResults');
        resultsDiv.innerHTML = `
            <div class="row">
                ${ComponentBuilder.createLoadingSkeleton(12)}
            </div>
        `;
        
        try {
            const params = { source, type, language };
            if (query) params.q = query;
            
            const results = await api.adminBrowseContent(params);
            this.browsedContent = results.results || [];
            
            resultsDiv.innerHTML = `
                <div class="row">
                    ${this.browsedContent.map(item => `
                        <div class="col-md-2 col-sm-3 col-4 mb-4">
                            <div class="content-card h-100" onclick="adminPanel.selectContent(${this.browsedContent.indexOf(item)})">
                                <img src="${item.poster_path || item.images?.jpg?.image_url || 'https://image.tmdb.org/t/p/w300' + item.poster_path}" 
                                     alt="${item.title || item.name}" style="width: 100%; height: 200px; object-fit: cover;">
                                <div class="p-2">
                                    <h6 class="text-white small mb-1">${item.title || item.name}</h6>
                                    <small class="text-light">${item.release_date || item.first_air_date || item.aired?.from?.substring(0, 4) || 'N/A'}</small>
                                    ${item.vote_average ? `<div><small class="text-netflix">${item.vote_average}/10</small></div>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            resultsDiv.innerHTML = '<div class="text-center text-light p-5"><h4>Failed to browse content</h4></div>';
        }
    }

    selectContent(index) {
        this.selectedContent = this.browsedContent[index];
        this.showContentPostForm();
    }

    showContentPostForm() {
        if (!this.selectedContent) return;
        
        const content = this.selectedContent;
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content bg-dark">
                    <div class="modal-header border-0">
                        <h5 class="modal-title text-white">Create Admin Post</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-4">
                            <div class="col-md-4">
                                <img src="${content.poster_path || content.images?.jpg?.image_url || 'https://image.tmdb.org/t/p/w300' + content.poster_path}" 
                                     alt="${content.title || content.name}" class="img-fluid rounded">
                            </div>
                            <div class="col-md-8">
                                <h4 class="text-white">${content.title || content.name}</h4>
                                <p class="text-light">${(content.overview || content.synopsis || '').substring(0, 200)}...</p>
                            </div>
                        </div>
                        
                        <form id="adminPostForm">
                            <div class="mb-3">
                                <label class="form-label text-white">Post Title</label>
                                <input type="text" class="form-control" id="postTitle" value="${content.title || content.name}" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label text-white">Description</label>
                                <textarea class="form-control" id="postDescription" rows="4" placeholder="Why are you recommending this content?" required></textarea>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <label class="form-label text-white">Priority</label>
                                    <select class="form-select" id="postPriority">
                                        <option value="1">Low</option>
                                        <option value="2" selected>Medium</option>
                                        <option value="3">High</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-white">Expires On</label>
                                    <input type="date" class="form-control" id="postExpiry">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label text-white">Custom Tags (comma separated)</label>
                                <input type="text" class="form-control" id="postTags" placeholder="action, thriller, must-watch">
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="postToWebsite" checked>
                                        <label class="form-check-label text-white" for="postToWebsite">
                                            Show on Website
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="postToTelegram">
                                        <label class="form-check-label text-white" for="postToTelegram">
                                            Post to Telegram
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-netflix" onclick="adminPanel.createPost()">Create Post</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    async createPost() {
        const postData = {
            tmdb_id: this.selectedContent.id,
            tmdb_data: this.selectedContent,
            title: document.getElementById('postTitle').value,
            description: document.getElementById('postDescription').value,
            priority: parseInt(document.getElementById('postPriority').value),
            expires_at: document.getElementById('postExpiry').value || null,
            custom_tags: document.getElementById('postTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            post_to_website: document.getElementById('postToWebsite').checked,
            post_to_telegram: document.getElementById('postToTelegram').checked
        };
        
        try {
            const response = await api.adminCreatePost(postData);
            app.showToast('Post created successfully!', 'success');
            bootstrap.Modal.getInstance(document.querySelector('.modal')).hide();
            this.showPostManager();
        } catch (error) {
            app.showToast('Failed to create post', 'error');
        }
    }

    async showPostManager() {
        this.currentSection = 'posts';
        document.getElementById('adminContent').innerHTML = `
            <h2 class="text-white mb-4">Manage Posts</h2>
            <div id="postsContainer">Loading posts...</div>
        `;
        
        try {
            const postsData = await api.adminGetPosts();
            const posts = postsData.posts;
            
            document.getElementById('postsContainer').innerHTML = `
                <div class="table-responsive">
                    <table class="table table-dark">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Content</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${posts.map(post => `
                                <tr>
                                    <td>${post.title}</td>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            <img src="${post.content.poster_path}" alt="${post.content.title}" 
                                                 style="width: 40px; height: 60px; object-fit: cover;" class="me-2">
                                            <div>
                                                <div class="text-white">${post.content.title}</div>
                                                <small class="text-light">${post.content.content_type}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge ${post.priority === 3 ? 'bg-danger' : post.priority === 2 ? 'bg-warning' : 'bg-secondary'}">
                                            ${post.priority === 3 ? 'High' : post.priority === 2 ? 'Medium' : 'Low'}
                                        </span>
                                    </td>
                                    <td>
                                        <span class="badge ${post.is_active ? 'bg-success' : 'bg-secondary'}">
                                            ${post.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        ${post.telegram_message_id ? '<br><small class="text-info">Posted to Telegram</small>' : ''}
                                    </td>
                                    <td><small class="text-light">${new Date(post.created_at).toLocaleDateString()}</small></td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-light me-1" onclick="adminPanel.editPost(${post.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" onclick="adminPanel.deletePost(${post.id})">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            document.getElementById('postsContainer').innerHTML = '<div class="text-center text-light p-5"><h4>Failed to load posts</h4></div>';
        }
    }

    async showAnalytics() {
        this.currentSection = 'analytics';
        document.getElementById('adminContent').innerHTML = `
            <h2 class="text-white mb-4">Analytics & Insights</h2>
            <div id="analyticsContainer">Loading analytics...</div>
        `;
        
        try {
            const analytics = await api.adminGetAnalytics();
            
            document.getElementById('analyticsContainer').innerHTML = `
                <div class="row">
                    <div class="col-md-6 mb-4">
                        <div class="content-card p-4">
                            <h4 class="text-white mb-3">User Engagement</h4>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between">
                                    <span class="text-light">Total Users</span>
                                    <span class="text-white">${analytics.users.total}</span>
                                </div>
                                <div class="progress mt-2">
                                    <div class="progress-bar" style="width: 100%"></div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between">
                                    <span class="text-light">Active Users (30 days)</span>
                                    <span class="text-white">${analytics.users.active_monthly}</span>
                                </div>
                                <div class="progress mt-2">
                                    <div class="progress-bar" style="width: ${analytics.users.engagement_rate}%"></div>
                                </div>
                            </div>
                            <div class="text-center mt-3">
                                <span class="badge badge-netflix">${analytics.users.engagement_rate.toFixed(1)}% Engagement Rate</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6 mb-4">
                        <div class="content-card p-4">
                            <h4 class="text-white mb-3">Content Stats</h4>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between">
                                    <span class="text-light">Total Content</span>
                                    <span class="text-white">${analytics.content.total}</span>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between">
                                    <span class="text-light">Total Interactions</span>
                                    <span class="text-white">${analytics.interactions.total}</span>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between">
                                    <span class="text-light">Admin Posts</span>
                                    <span class="text-white">${analytics.admin_posts.total}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-12 mb-4">
                        <div class="content-card p-4">
                            <h4 class="text-white mb-3">Popular Genres</h4>
                            <div class="row">
                                ${Object.entries(analytics.preferences.top_genres).slice(0, 6).map(([genre, count]) => `
                                    <div class="col-md-4 mb-3">
                                        <div class="d-flex justify-content-between align-items-center p-2 bg-secondary rounded">
                                            <span class="text-white">${genre}</span>
                                            <span class="badge badge-netflix">${count}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-12">
                        <div class="content-card p-4">
                            <h4 class="text-white mb-3">Interaction Types</h4>
                            <div class="row">
                                ${analytics.interactions.by_type.map(item => `
                                    <div class="col-md-3 mb-3">
                                        <div class="text-center p-3 bg-secondary rounded">
                                            <h5 class="text-netflix">${item.count}</h5>
                                            <span class="text-white text-capitalize">${item.type}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            document.getElementById('analyticsContainer').innerHTML = '<div class="text-center text-light p-5"><h4>Failed to load analytics</h4></div>';
        }
    }

    async showSystemStatus() {
        this.currentSection = 'system';
        document.getElementById('adminContent').innerHTML = `
            <h2 class="text-white mb-4">System Status</h2>
            <div id="systemStatusContainer">Loading system status...</div>
        `;
        
        try {
            const status = await api.adminGetSystemStatus();
            
            document.getElementById('systemStatusContainer').innerHTML = `
                <div class="row">
                    <div class="col-md-6 mb-4">
                        <div class="content-card p-4">
                            <h4 class="text-white mb-3">Database Status</h4>
                            <div class="d-flex align-items-center">
                                <i class="fas fa-database fa-2x me-3 ${status.database === 'healthy' ? 'text-success' : 'text-danger'}"></i>
                                <div>
                                    <div class="text-white">${status.database === 'healthy' ? 'Connected' : 'Error'}</div>
                                    <small class="text-light">Content: ${status.content_count} | Users: ${status.user_count}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6 mb-4">
                        <div class="content-card p-4">
                            <h4 class="text-white mb-3">External APIs</h4>
                            ${Object.entries(status.external_apis).map(([api, status]) => `
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="text-white text-uppercase">${api}</span>
                                    <span class="badge ${status === 'healthy' ? 'bg-success' : 'bg-danger'}">${status}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="col-md-6 mb-4">
                        <div class="content-card p-4">
                            <h4 class="text-white mb-3">Telegram Bot</h4>
                            <div class="d-flex align-items-center">
                                <i class="fab fa-telegram fa-2x me-3 ${status.telegram_bot === 'healthy' ? 'text-success' : status.telegram_bot === 'disabled' ? 'text-warning' : 'text-danger'}"></i>
                                <div>
                                    <div class="text-white text-capitalize">${status.telegram_bot}</div>
                                    <small class="text-light">Automated posting service</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6 mb-4">
                        <div class="content-card p-4">
                            <h4 class="text-white mb-3">Recommendation Engine</h4>
                            <div class="d-flex align-items-center">
                                <i class="fas fa-brain fa-2x me-3 ${status.recommendation_matrix === 'built' ? 'text-success' : 'text-warning'}"></i>
                                <div>
                                    <div class="text-white text-capitalize">${status.recommendation_matrix}</div>
                                    <small class="text-light">ML model status</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-12">
                        <div class="content-card p-4">
                            <h4 class="text-white mb-3">System Actions</h4>
                            <div class="d-grid gap-2 d-md-flex">
                                <button class="btn btn-netflix" onclick="adminPanel.syncContent()">
                                    <i class="fas fa-sync me-2"></i>Sync Content
                                </button>
                                <button class="btn btn-outline-light" onclick="location.reload()">
                                    <i class="fas fa-refresh me-2"></i>Refresh Status
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            document.getElementById('systemStatusContainer').innerHTML = '<div class="text-center text-light p-5"><h4>Failed to load system status</h4></div>';
        }
    }

    async syncContent() {
        try {
            app.showToast('Content sync started...', 'info');
            await api.enhancedSync();
            app.showToast('Content sync completed successfully!', 'success');
            this.loadDashboardData();
        } catch (error) {
            app.showToast('Content sync failed', 'error');
        }
    }
}

const adminPanel = new AdminPanel();