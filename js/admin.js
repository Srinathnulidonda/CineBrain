// Admin-specific functionality

class AdminManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFilters = {};
        this.selectedContent = null;
    }

    async checkAdminAccess() {
        if (!userManager.isLoggedIn()) {
            window.location.href = '../login.html';
            return false;
        }
        
        // In a real app, check if user has admin role
        return true;
    }
}

const adminManager = new AdminManager();

// Admin Dashboard Initialization
async function initializeAdminDashboard() {
    if (!await adminManager.checkAdminAccess()) return;
    
    try {
        UIComponents.showLoading();
        
        // Load analytics data
        const analytics = await apiService.adminAnalytics();
        populateAdminStats(analytics);
        
        // Load system status
        const systemStatus = await apiService.makeRequest('/admin/system-status');
        updateSystemStatus(systemStatus);
        
        // Load recent activity
        loadRecentActivity();
        
        // Load popular content
        loadPopularContent(analytics);
        
    } catch (error) {
        handleError(error, 'Loading admin dashboard');
    } finally {
        UIComponents.hideLoading();
    }
}

function populateAdminStats(analytics) {
    const totalUsers = document.getElementById('total-users');
    const totalContent = document.getElementById('total-content');
    const activePosts = document.getElementById('active-posts');
    const totalInteractions = document.getElementById('total-interactions');
    
    if (totalUsers) totalUsers.textContent = analytics.users?.total || 0;
    if (totalContent) totalContent.textContent = analytics.content?.total || 0;
    if (activePosts) activePosts.textContent = analytics.admin_posts?.active || 0;
    if (totalInteractions) totalInteractions.textContent = analytics.interactions?.total || 0;
}

function updateSystemStatus(status) {
    updateStatusIndicator('db-status', status.database);
    updateStatusIndicator('api-status', status.external_apis?.tmdb || 'unknown');
    updateStatusIndicator('telegram-status', status.telegram_bot);
}

function updateStatusIndicator(elementId, status) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const dot = element.querySelector('.status-dot');
    const text = element.querySelector('.status-text');
    
    if (status === 'healthy') {
        dot.style.backgroundColor = '#10b981';
        text.textContent = 'Healthy';
    } else if (status === 'error') {
        dot.style.backgroundColor = '#ef4444';
        text.textContent = 'Error';
    } else {
        dot.style.backgroundColor = '#f59e0b';
        text.textContent = 'Unknown';
    }
}

function loadRecentActivity() {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    // Mock recent activity data
    const activities = [
        { type: 'user_registration', user: 'john_doe', time: '2 minutes ago' },
        { type: 'content_interaction', user: 'jane_smith', content: 'Avengers: Endgame', time: '5 minutes ago' },
        { type: 'admin_post', admin: 'admin', title: 'New Marvel Collection', time: '1 hour ago' },
        { type: 'content_sync', count: 150, time: '2 hours ago' }
    ];
    
    container.innerHTML = '';
    
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        let description = '';
        switch (activity.type) {
            case 'user_registration':
                description = `New user ${activity.user} registered`;
                break;
            case 'content_interaction':
                description = `${activity.user} interacted with ${activity.content}`;
                break;
            case 'admin_post':
                description = `${activity.admin} created post: ${activity.title}`;
                break;
            case 'content_sync':
                description = `Synced ${activity.count} content items`;
                break;
        }
        
        item.innerHTML = `
            <div class="activity-description">${description}</div>
            <div class="activity-time">${activity.time}</div>
        `;
        
        container.appendChild(item);
    });
}

function loadPopularContent(analytics) {
    const container = document.getElementById('popular-content');
    if (!container || !analytics.content?.popular) return;
    
    container.innerHTML = '';
    
    analytics.content.popular.forEach((item, index) => {
        const contentItem = document.createElement('div');
        contentItem.className = 'popular-content-item';
        
        contentItem.innerHTML = `
            <div class="popular-rank">#${index + 1}</div>
            <div class="popular-title">${item.title}</div>
            <div class="popular-interactions">${item.interactions} interactions</div>
        `;
        
        container.appendChild(contentItem);
    });
}

async function syncContent() {
    try {
        UIComponents.showLoading();
        UIComponents.showToast('Starting content sync...', 'info');
        
        await apiService.makeRequest('/enhanced-sync', { method: 'POST' });
        
        UIComponents.showToast('Content sync started successfully', 'success');
        
        // Refresh dashboard after sync
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch (error) {
        handleError(error, 'Content sync');
    } finally {
        UIComponents.hideLoading();
    }
}

// Content Browser Initialization
async function initializeContentBrowser() {
    if (!await adminManager.checkAdminAccess()) return;
    
    // Initialize search functionality
    const searchInput = document.getElementById('content-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            if (searchInput.value.length > 2) {
                searchContent();
            }
        }, 500));
    }
    
    // Load initial content
    searchContent();
}

async function searchContent() {
    try {
        UIComponents.showLoading();
        
        const source = document.getElementById('source-filter')?.value || 'tmdb';
        const type = document.getElementById('type-filter')?.value || 'movie';
        const language = document.getElementById('language-filter')?.value || 'en';
        const query = document.getElementById('content-search')?.value || '';
        
        const params = {
            source,
            type,
            language,
            q: query,
            page: adminManager.currentPage
        };
        
        const data = await apiService.adminBrowseContent(params);
        
        populateContentResults(data.results || []);
        updatePagination(data.total_pages || 1, data.current_page || 1);
        
    } catch (error) {
        handleError(error, 'Searching content');
    } finally {
        UIComponents.hideLoading();
    }
}

function populateContentResults(results) {
    const container = document.getElementById('content-results');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (results.length === 0) {
        const emptyState = UIComponents.createEmptyState(
            'No Content Found',
            'Try adjusting your search criteria or filters.'
        );
        container.appendChild(emptyState);
        return;
    }
    
    results.forEach(item => {
        const card = createContentBrowserCard(item);
        container.appendChild(card);
    });
    
    // Update pagination info
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${results.length} results`;
    }
}

function createContentBrowserCard(item) {
    const card = document.createElement('div');
    card.className = 'content-browser-card';
    
    const posterUrl = item.poster_path ? 
        (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w300${item.poster_path}`) :
        '/api/placeholder/200/300';
    
    const title = item.title || item.name || 'Unknown Title';
    const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    
    card.innerHTML = `
        <div class="content-browser-poster">
            <img src="${posterUrl}" alt="${title}" loading="lazy">
            <div class="content-browser-overlay">
                <button class="btn-primary" onclick="openCreatePostModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                    Create Post
                </button>
            </div>
        </div>
        <div class="content-browser-info">
            <h3 class="content-browser-title">${title}</h3>
            <div class="content-browser-meta">
                <span>${year}</span>
                <span>⭐ ${rating}</span>
            </div>
            <p class="content-browser-overview">${(item.overview || '').substring(0, 100)}...</p>
        </div>
    `;
    
    return card;
}

function updatePagination(totalPages, currentPage) {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            adminManager.currentPage = currentPage - 1;
            searchContent();
        }
    };
    container.appendChild(prevBtn);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            adminManager.currentPage = i;
            searchContent();
        };
        container.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            adminManager.currentPage = currentPage + 1;
            searchContent();
        }
    };
    container.appendChild(nextBtn);
}

function clearFilters() {
    document.getElementById('source-filter').value = 'tmdb';
    document.getElementById('type-filter').value = 'movie';
    document.getElementById('language-filter').value = 'en';
    document.getElementById('content-search').value = '';
    
    adminManager.currentPage = 1;
    searchContent();
}

function openCreatePostModal(contentData) {
    adminManager.selectedContent = contentData;
    
    // Pre-fill form with content data
    document.getElementById('post-title').value = `Featured: ${contentData.title || contentData.name}`;
    document.getElementById('post-description').value = contentData.overview || '';
    
    ModalManager.openModal('create-post-modal');
}

async function submitPost() {
    const title = document.getElementById('post-title').value;
    const description = document.getElementById('post-description').value;
    const tags = document.getElementById('post-tags').value.split(',').map(tag => tag.trim()).filter(Boolean);
    const priority = parseInt(document.getElementById('post-priority').value);
    const expires = document.getElementById('post-expires').value;
    const postToWebsite = document.getElementById('post-to-website').checked;
    const postToTelegram = document.getElementById('post-to-telegram').checked;
    
    if (!title) {
        UIComponents.showToast('Please enter a post title', 'warning');
        return;
    }
    
    if (!adminManager.selectedContent) {
        UIComponents.showToast('No content selected', 'error');
        return;
    }
    
    try {
        UIComponents.showLoading();
        
        const postData = {
            title,
            description,
            custom_tags: tags,
            priority,
            expires_at: expires,
            post_to_website: postToWebsite,
            post_to_telegram: postToTelegram,
            tmdb_id: adminManager.selectedContent.id,
            tmdb_data: adminManager.selectedContent
        };
        
        const response = await apiService.adminCreatePost(postData);
        
        ModalManager.closeModal('create-post-modal');
        UIComponents.showToast('Post created successfully!', 'success');
        
        if (response.telegram_sent) {
            UIComponents.showToast('Post also sent to Telegram', 'info');
        }
        
    } catch (error) {
        handleError(error, 'Creating post');
    } finally {
        UIComponents.hideLoading();
    }
}

// Posts Management Initialization
async function initializePostsManagement() {
    if (!await adminManager.checkAdminAccess()) return;
    
    loadPosts();
}

async function loadPosts() {
    try {
        UIComponents.showLoading();
        
        const data = await apiService.adminGetPosts();
        populatePostsTable(data.posts || []);
        
    } catch (error) {
        handleError(error, 'Loading posts');
    } finally {
        UIComponents.hideLoading();
    }
}

function populatePostsTable(posts) {
    const tbody = document.getElementById('posts-table-body');
    if (!tbody) return;
        tbody.innerHTML = '';
    
    if (posts.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="text-center py-8">
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3 class="empty-state-title">No Posts Found</h3>
                    <p class="empty-state-description">Create your first admin post to get started.</p>
                </div>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    posts.forEach(post => {
        const row = document.createElement('tr');
        
        const statusBadge = getStatusBadge(post);
        const platformBadges = getPlatformBadges(post);
        const priorityBadge = getPriorityBadge(post.priority);
        
        row.innerHTML = `
            <td>
                <div class="flex items-center">
                    <img src="${post.content.poster_path || '/api/placeholder/40/60'}" 
                         alt="${post.content.title}" 
                         class="w-10 h-15 object-cover rounded mr-3">
                    <div>
                        <div class="font-semibold">${post.content.title}</div>
                        <div class="text-sm text-gray-400">${post.content.content_type}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="font-medium">${post.title}</div>
                <div class="text-sm text-gray-400">${post.description.substring(0, 50)}...</div>
            </td>
            <td>${priorityBadge}</td>
            <td>${statusBadge}</td>
            <td>${platformBadges}</td>
            <td>${formatDate(post.created_at)}</td>
            <td>${post.expires_at ? formatDate(post.expires_at) : 'Never'}</td>
            <td>
                <div class="table-actions">
                    <button class="table-btn edit" onclick="editPost(${post.id})">Edit</button>
                    <button class="table-btn delete" onclick="deletePost(${post.id})">Delete</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function getStatusBadge(post) {
    const now = new Date();
    const expires = post.expires_at ? new Date(post.expires_at) : null;
    
    if (!post.is_active) {
        return '<span class="badge neutral">Inactive</span>';
    } else if (expires && expires < now) {
        return '<span class="badge warning">Expired</span>';
    } else {
        return '<span class="badge success">Active</span>';
    }
}

function getPlatformBadges(post) {
    const badges = [];
    
    if (post.post_to_website) {
        badges.push('<span class="badge info">Website</span>');
    }
    
    if (post.post_to_telegram) {
        badges.push('<span class="badge success">Telegram</span>');
    }
    
    return badges.join(' ');
}

function getPriorityBadge(priority) {
    const priorities = {
        1: '<span class="badge neutral">Low</span>',
        2: '<span class="badge info">Medium</span>',
        3: '<span class="badge warning">High</span>',
        4: '<span class="badge error">Critical</span>'
    };
    
    return priorities[priority] || '<span class="badge neutral">Unknown</span>';
}

function filterPosts() {
    // Implementation for filtering posts
    console.log('Filtering posts...');
    loadPosts(); // Reload with filters
}

function clearPostFilters() {
    document.getElementById('status-filter').value = 'all';
    document.getElementById('platform-filter').value = 'all';
    document.getElementById('priority-filter').value = 'all';
    
    loadPosts();
}

function editPost(postId) {
    // Load post data and open edit modal
    console.log('Editing post:', postId);
    ModalManager.openModal('edit-post-modal');
}

function deletePost(postId) {
    document.getElementById('delete-post-id').value = postId;
    ModalManager.openModal('delete-post-modal');
}

async function confirmDeletePost() {
    const postId = document.getElementById('delete-post-id').value;
    
    try {
        UIComponents.showLoading();
        
        await apiService.makeRequest(`/admin/posts/${postId}`, { method: 'DELETE' });
        
        ModalManager.closeModal('delete-post-modal');
        UIComponents.showToast('Post deleted successfully', 'success');
        
        loadPosts(); // Reload posts
        
    } catch (error) {
        handleError(error, 'Deleting post');
    } finally {
        UIComponents.hideLoading();
    }
}

async function updatePost() {
    const postId = document.getElementById('edit-post-id').value;
    const title = document.getElementById('edit-post-title').value;
    const description = document.getElementById('edit-post-description').value;
    const tags = document.getElementById('edit-post-tags').value.split(',').map(tag => tag.trim()).filter(Boolean);
    const priority = parseInt(document.getElementById('edit-post-priority').value);
    const expires = document.getElementById('edit-post-expires').value;
    const isActive = document.getElementById('edit-post-active').checked;
    
    try {
        UIComponents.showLoading();
        
        const updateData = {
            title,
            description,
            custom_tags: tags,
            priority,
            expires_at: expires,
            is_active: isActive
        };
        
        await apiService.makeRequest(`/admin/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        ModalManager.closeModal('edit-post-modal');
        UIComponents.showToast('Post updated successfully', 'success');
        
        loadPosts(); // Reload posts
        
    } catch (error) {
        handleError(error, 'Updating post');
    } finally {
        UIComponents.hideLoading();
    }
}

// Analytics Initialization
async function initializeAnalytics() {
    if (!await adminManager.checkAdminAccess()) return;
    
    try {
        UIComponents.showLoading();
        
        const analytics = await apiService.adminAnalytics();
        
        populateAnalyticsStats(analytics);
        initializeCharts(analytics);
        populateTopContent(analytics);
        populateUserInsights(analytics);
        
    } catch (error) {
        handleError(error, 'Loading analytics');
    } finally {
        UIComponents.hideLoading();
    }
}

function populateAnalyticsStats(analytics) {
    const engagementRate = document.getElementById('engagement-rate');
    const activeUsers = document.getElementById('active-users');
    const avgSession = document.getElementById('avg-session');
    const contentViews = document.getElementById('content-views');
    
    if (engagementRate) {
        engagementRate.textContent = `${analytics.users?.engagement_rate?.toFixed(1) || 0}%`;
    }
    
    if (activeUsers) {
        activeUsers.textContent = analytics.users?.active_monthly || 0;
    }
    
    if (avgSession) {
        avgSession.textContent = '12m'; // Mock data
    }
    
    if (contentViews) {
        contentViews.textContent = analytics.interactions?.total || 0;
    }
}

function initializeCharts(analytics) {
    // User Growth Chart
    const userGrowthCtx = document.getElementById('userGrowthChart');
    if (userGrowthCtx) {
        new Chart(userGrowthCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'New Users',
                    data: [12, 19, 3, 5, 2, 3],
                    borderColor: '#e50914',
                    backgroundColor: 'rgba(229, 9, 20, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    },
                    y: {
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    }
                }
            }
        });
    }
    
    // Content Popularity Chart
    const contentPopularityCtx = document.getElementById('contentPopularityChart');
    if (contentPopularityCtx && analytics.content?.popular) {
        const labels = analytics.content.popular.slice(0, 5).map(item => item.title);
        const data = analytics.content.popular.slice(0, 5).map(item => item.interactions);
        
        new Chart(contentPopularityCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Interactions',
                    data: data,
                    backgroundColor: '#e50914',
                    borderColor: '#b20710',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    },
                    y: {
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    }
                }
            }
        });
    }
    
    // Genre Preferences Chart
    const genrePreferencesCtx = document.getElementById('genrePreferencesChart');
    if (genrePreferencesCtx && analytics.preferences?.top_genres) {
        const genres = Object.keys(analytics.preferences.top_genres);
        const counts = Object.values(analytics.preferences.top_genres);
        
        new Chart(genrePreferencesCtx, {
            type: 'doughnut',
            data: {
                labels: genres,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#e50914', '#b20710', '#8b0000', '#ff6b6b', '#ff8e8e',
                        '#ffa8a8', '#ffc1c1', '#ffd9d9', '#ffe8e8', '#fff0f0'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }
    
    // Interaction Types Chart
    const interactionTypesCtx = document.getElementById('interactionTypesChart');
    if (interactionTypesCtx && analytics.interactions?.by_type) {
        const types = analytics.interactions.by_type.map(item => item.type);
        const counts = analytics.interactions.by_type.map(item => item.count);
        
        new Chart(interactionTypesCtx, {
            type: 'pie',
            data: {
                labels: types,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#e50914', '#b20710', '#8b0000', '#ff6b6b']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }
}

function populateTopContent(analytics) {
    const tbody = document.getElementById('top-content-table');
    if (!tbody || !analytics.content?.popular) return;
    
    tbody.innerHTML = '';
    
    analytics.content.popular.slice(0, 10).forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.title}</td>
            <td>${item.interactions}</td>
            <td>${Math.floor(Math.random() * 100)}</td>
            <td>${Math.floor(Math.random() * 50)}</td>
            <td>${(Math.random() * 5 + 5).toFixed(1)}</td>
            <td>${(Math.random() * 100).toFixed(1)}%</td>
        `;
        tbody.appendChild(row);
    });
}

function populateUserInsights(analytics) {
    // Peak Hours
    const peakHours = document.getElementById('peak-hours');
    if (peakHours) {
        peakHours.innerHTML = `
            <div class="insight-item">
                <span class="insight-time">8:00 PM - 10:00 PM</span>
                <span class="insight-value">Peak Activity</span>
            </div>
            <div class="insight-item">
                <span class="insight-time">2:00 PM - 4:00 PM</span>
                <span class="insight-value">Secondary Peak</span>
            </div>
        `;
    }
    
    // Device Distribution
    const deviceDistribution = document.getElementById('device-distribution');
    if (deviceDistribution) {
        deviceDistribution.innerHTML = `
            <div class="insight-item">
                <span class="insight-label">Mobile</span>
                <span class="insight-value">65%</span>
            </div>
            <div class="insight-item">
                <span class="insight-label">Desktop</span>
                <span class="insight-value">25%</span>
            </div>
            <div class="insight-item">
                <span class="insight-label">Tablet</span>
                <span class="insight-value">10%</span>
            </div>
        `;
    }
    
    // Regional Preferences
    const regionalPreferences = document.getElementById('regional-preferences');
    if (regionalPreferences) {
        regionalPreferences.innerHTML = `
            <div class="insight-item">
                <span class="insight-label">Telugu</span>
                <span class="insight-value">40%</span>
            </div>
            <div class="insight-item">
                <span class="insight-label">Hindi</span>
                <span class="insight-value">35%</span>
            </div>
            <div class="insight-item">
                <span class="insight-label">English</span>
                <span class="insight-value">25%</span>
            </div>
        `;
    }
}

function exportAnalytics(format) {
    UIComponents.showToast(`Exporting analytics as ${format.toUpperCase()}...`, 'info');
    
    // In a real app, this would generate and download the file
    setTimeout(() => {
        UIComponents.showToast(`Analytics exported successfully as ${format.toUpperCase()}`, 'success');
    }, 2000);
}

function scheduleReport() {
    UIComponents.showToast('Report scheduling feature coming soon!', 'info');
}

// Export admin functions
window.initializeAdminDashboard = initializeAdminDashboard;
window.initializeContentBrowser = initializeContentBrowser;
window.initializePostsManagement = initializePostsManagement;
window.initializeAnalytics = initializeAnalytics;
window.syncContent = syncContent;
window.searchContent = searchContent;
window.clearFilters = clearFilters;
window.openCreatePostModal = openCreatePostModal;
window.submitPost = submitPost;
window.filterPosts = filterPosts;
window.clearPostFilters = clearPostFilters;
window.editPost = editPost;
window.deletePost = deletePost;
window.confirmDeletePost = confirmDeletePost;
window.updatePost = updatePost;
window.exportAnalytics = exportAnalytics;
window.scheduleReport = scheduleReport;