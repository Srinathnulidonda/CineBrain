class CineBrainUsersTableManager {
    constructor(coreInstance) {
        this.core = coreInstance;
        this.sortableColumns = ['username', 'email', 'role', 'status', 'created_at', 'last_active'];
        this.currentSort = {
            field: null,
            direction: 'asc'
        };

        // Elements will be set during initialization
        this.elements = {
            usersTableBody: null,
            usersPagination: null,
            paginationInfo: null,
            userTableCount: null,
            selectAllUsers: null,
            bulkActionsBar: null,
            selectedCount: null
        };

        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('📊 Initializing Users Table Manager...');

            this.initializeElements();
            this.setupEventListeners();
            this.setupSortableHeaders();

            // Register with core
            this.core.registerComponent('tables', this);

            this.isInitialized = true;
            console.log('✅ Users Table Manager initialized');

        } catch (error) {
            console.error('❌ Table Manager initialization failed:', error);
            throw error;
        }
    }

    initializeElements() {
        this.elements = {
            usersTableBody: document.getElementById('usersTableBody'),
            usersPagination: document.getElementById('usersPagination'),
            paginationInfo: document.getElementById('paginationInfo'),
            userTableCount: document.getElementById('userTableCount'),
            selectAllUsers: document.getElementById('selectAllUsers'),
            bulkActionsBar: document.getElementById('bulkActionsBar'),
            selectedCount: document.getElementById('selectedCount'),
            deselectAll: document.getElementById('deselectAll'),
            bulkSuspend: document.getElementById('bulkSuspend'),
            bulkActivate: document.getElementById('bulkActivate'),
            bulkDelete: document.getElementById('bulkDelete')
        };

        // Validate required elements
        if (!this.elements.usersTableBody) {
            throw new Error('Users table body element not found');
        }
    }

    setupEventListeners() {
        // Select all checkbox
        if (this.elements.selectAllUsers) {
            this.elements.selectAllUsers.addEventListener('change', (e) => {
                this.handleSelectAll(e.target.checked);
            });
        }

        // Bulk action buttons
        if (this.elements.deselectAll) {
            this.elements.deselectAll.addEventListener('click', () => {
                this.core.clearSelection();
            });
        }

        if (this.elements.bulkSuspend) {
            this.elements.bulkSuspend.addEventListener('click', () => {
                this.handleBulkAction('suspend');
            });
        }

        if (this.elements.bulkActivate) {
            this.elements.bulkActivate.addEventListener('click', () => {
                this.handleBulkAction('activate');
            });
        }

        if (this.elements.bulkDelete) {
            this.elements.bulkDelete.addEventListener('click', () => {
                this.handleBulkAction('delete');
            });
        }
    }

    setupSortableHeaders() {
        document.querySelectorAll('.users-table th.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                if (field && this.sortableColumns.includes(field)) {
                    this.handleSort(field);
                }
            });
        });
    }

    // ==================== TABLE RENDERING ====================

    renderUsers(users = []) {
        if (!this.elements.usersTableBody) return;

        if (!users.length) {
            this.renderEmptyState();
            return;
        }

        try {
            const tableHTML = users.map(user => this.renderUserRow(user)).join('');
            this.elements.usersTableBody.innerHTML = tableHTML;

            // Update table count
            this.updateTableCount();

            // Re-apply selection state
            this.updateSelectionUI(this.core.state.selection);

            // Add row animations
            this.animateNewRows();

            // Replace feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            console.log(`✅ Rendered ${users.length} users in table`);

        } catch (error) {
            console.error('❌ Error rendering users table:', error);
            this.renderErrorState();
        }
    }

    renderUserRow(user) {
        const statusClass = this.getUserStatusClass(user);
        const statusText = this.getUserStatusText(user);
        const statusAction = this.getUserStatusAction(user);
        const statusIcon = this.getUserStatusIcon(user);

        return `
            <tr class="slide-up" data-user-id="${user.id}">
                <td class="select-column">
                    <input type="checkbox" 
                           class="user-select-checkbox" 
                           data-user-id="${user.id}"
                           onchange="cineBrainUsersCore.handleUserSelect(${user.id}, this.checked)">
                </td>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${user.avatar_url ?
                `<img src="${this.escapeHtml(user.avatar_url)}" alt="${this.escapeHtml(user.username)}" loading="lazy">` :
                `<i data-feather="user" class="user-avatar-placeholder"></i>`
            }
                        </div>
                        <div class="user-details">
                            <div class="user-name">${this.escapeHtml(user.full_name || user.username)}</div>
                            <div class="user-username">@${this.escapeHtml(user.username)}</div>
                        </div>
                    </div>
                </td>
                <td class="d-none d-md-table-cell">
                    <div class="user-email" title="${this.escapeHtml(user.email)}">
                        ${this.escapeHtml(user.email)}
                    </div>
                </td>
                <td class="d-none d-lg-table-cell">
                    <span class="role-badge role-badge-${user.is_admin ? 'admin' : 'user'}">
                        <i data-feather="${user.is_admin ? 'shield' : 'user'}" class="role-icon"></i>
                        ${user.is_admin ? 'Admin' : 'User'}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-badge-${statusClass}">
                        <span class="status-indicator ${statusClass}"></span>
                        ${statusText}
                    </span>
                </td>
                <td class="d-none d-sm-table-cell">
                    <div class="user-join-date" title="${this.formatFullDate(user.created_at)}">
                        ${this.core.formatTimeAgo(user.created_at)}
                    </div>
                </td>
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="action-btn action-view" 
                                onclick="cineBrainUsersModals.showUserDetails(${user.id})"
                                title="View user details"
                                aria-label="View details for ${this.escapeHtml(user.username)}">
                            <i data-feather="eye"></i>
                        </button>
                        <button class="action-btn action-edit" 
                                onclick="cineBrainUsersModals.showEditUser(${user.id})"
                                title="Edit user"
                                aria-label="Edit ${this.escapeHtml(user.username)}">
                            <i data-feather="edit"></i>
                        </button>
                        <button class="action-btn action-status" 
                                onclick="toggleUserStatus(${user.id})"
                                title="${statusAction}"
                                aria-label="${statusAction} for ${this.escapeHtml(user.username)}">
                            <i data-feather="${statusIcon}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderEmptyState() {
        this.elements.usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty-state">
                    <i data-feather="users" class="empty-state-icon"></i>
                    <p class="empty-state-message">No users found</p>
                    <p class="empty-state-hint">Try adjusting your filters or search criteria</p>
                </td>
            </tr>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderErrorState() {
        this.elements.usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-error-state">
                    <i data-feather="alert-triangle" class="error-state-icon"></i>
                    <p class="error-state-message">Error loading users</p>
                    <button class="btn btn-sm btn-outline-primary" onclick="cineBrainUsersCore.refreshAllData()">
                        <i data-feather="refresh-cw"></i> Try Again
                    </button>
                </td>
            </tr>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    animateNewRows() {
        // Add staggered animation to new rows
        const rows = this.elements.usersTableBody.querySelectorAll('tr.slide-up');
        rows.forEach((row, index) => {
            setTimeout(() => {
                row.classList.add('animate-in');
            }, index * 50);
        });
    }

    // ==================== PAGINATION ====================

    renderPagination(pagination) {
        if (!this.elements.usersPagination || !pagination) return;

        const { page, total_pages, total, per_page } = pagination;

        // Update pagination info
        if (this.elements.paginationInfo) {
            const start = (page - 1) * per_page + 1;
            const end = Math.min(page * per_page, total);
            this.elements.paginationInfo.textContent =
                `Showing ${start.toLocaleString()}-${end.toLocaleString()} of ${total.toLocaleString()} users`;
        }

        // Handle single page case
        if (total_pages <= 1) {
            this.elements.usersPagination.innerHTML = '';
            return;
        }

        const paginationHTML = this.buildPaginationHTML(page, total_pages);
        this.elements.usersPagination.innerHTML = paginationHTML;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    buildPaginationHTML(currentPage, totalPages) {
        let html = '';

        // Previous button
        html += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" ${currentPage > 1 ? `onclick="goToPage(${currentPage - 1})"` : ''} 
                   aria-label="Previous page">
                    <i data-feather="chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers with smart truncation
        const pageNumbers = this.generatePageNumbers(currentPage, totalPages);

        pageNumbers.forEach(item => {
            if (item === '...') {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            } else {
                const pageNum = parseInt(item);
                html += `
                    <li class="page-item ${pageNum === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="goToPage(${pageNum})">${pageNum}</a>
                    </li>
                `;
            }
        });

        // Next button
        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" ${currentPage < totalPages ? `onclick="goToPage(${currentPage + 1})"` : ''} 
                   aria-label="Next page">
                    <i data-feather="chevron-right"></i>
                </a>
            </li>
        `;

        return html;
    }

    generatePageNumbers(current, total) {
        const pages = [];
        const isMobile = this.core.isMobile;
        const maxVisible = isMobile ? 3 : 5; // Show fewer pages on mobile

        if (total <= maxVisible + 2) {
            // Show all pages if total is small
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (current <= 3) {
                // Show pages near beginning
                for (let i = 2; i <= Math.min(maxVisible, total - 1); i++) {
                    pages.push(i);
                }
                if (maxVisible < total - 1) {
                    pages.push('...');
                }
            } else if (current >= total - 2) {
                // Show pages near end
                pages.push('...');
                for (let i = Math.max(total - maxVisible + 1, 2); i < total; i++) {
                    pages.push(i);
                }
            } else {
                // Show pages around current
                pages.push('...');
                for (let i = current - 1; i <= current + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
            }

            // Always show last page
            pages.push(total);
        }

        return pages;
    }

    // ==================== SORTING ====================

    handleSort(field) {
        if (this.currentSort.field === field) {
            // Toggle direction
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New field
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        // Update core state
        this.core.state.sorting = {
            sort_by: field,
            sort_direction: this.currentSort.direction
        };

        // Update UI
        this.updateSortHeaders();

        // Reload data
        this.core.loadUsers();

        console.log(`📊 Sorting by ${field} ${this.currentSort.direction}`);
    }

    updateSortHeaders() {
        document.querySelectorAll('.users-table th.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');

            if (header.dataset.sort === this.currentSort.field) {
                header.classList.add(`sort-${this.currentSort.direction}`);
            }
        });
    }

    // ==================== SELECTION MANAGEMENT ====================

    handleSelectAll(checked) {
        this.core.handleSelectAll(checked);
    }

    updateSelectionUI(selectionState) {
        // Update individual checkboxes
        document.querySelectorAll('.user-select-checkbox').forEach(checkbox => {
            const userId = parseInt(checkbox.dataset.userId);
            checkbox.checked = selectionState.selectedUsers.has(userId);
        });

        // Update select all checkbox
        if (this.elements.selectAllUsers) {
            const totalVisible = this.core.state.users.list.length;
            const selectedVisible = this.core.state.users.list.filter(user =>
                selectionState.selectedUsers.has(user.id)
            ).length;

            this.elements.selectAllUsers.checked = totalVisible > 0 && selectedVisible === totalVisible;
            this.elements.selectAllUsers.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible;
        }

        // Update bulk actions visibility
        this.updateBulkActionsVisibility(selectionState.selectedUsers.size);
    }

    updateBulkActionsVisibility(selectedCount) {
        const hasSelection = selectedCount > 0;

        if (this.elements.bulkActionsBar) {
            this.elements.bulkActionsBar.style.display = hasSelection ? 'block' : 'none';
        }

        if (this.elements.selectedCount) {
            this.elements.selectedCount.textContent = selectedCount;
        }
    }

    // ==================== BULK OPERATIONS ====================

    async handleBulkAction(action) {
        const selectedUsers = this.core.getSelectedUsers();

        if (selectedUsers.length === 0) {
            this.core.showToast('No users selected', 'warning');
            return;
        }

        const confirmMessage = this.getBulkActionConfirmMessage(action, selectedUsers.length);
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            this.core.showLoading(true, `Processing ${action} operation...`);

            const response = await this.core.makeAuthenticatedRequest('/admin/users/bulk', {
                method: 'POST',
                body: JSON.stringify({
                    action: action,
                    user_ids: selectedUsers
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Bulk ${action} failed: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Bulk operation failed');
            }

            // Handle results
            const results = result.results || {};
            const successCount = results.success_count || 0;
            const failedCount = results.failed_count || 0;
            const skippedCount = results.skipped ? results.skipped.length : 0;

            // Show appropriate message
            this.showBulkActionResults(action, successCount, failedCount, skippedCount);

            // Clear selection and reload data
            this.core.clearSelection();
            await Promise.all([
                this.core.loadUsers(),
                this.core.loadUserStatistics()
            ]);

            // Haptic feedback for successful operations
            if (successCount > 0) {
                this.core.hapticFeedback('medium');
            }

        } catch (error) {
            console.error(`❌ Bulk ${action} error:`, error);
            this.core.handleError(error.message || `Failed to ${action} selected users`, error);
        } finally {
            this.core.showLoading(false);
        }
    }

    getBulkActionConfirmMessage(action, count) {
        const messages = {
            suspend: `Are you sure you want to suspend ${count} user(s)?\n\nThis will prevent them from accessing the platform.`,
            activate: `Are you sure you want to activate ${count} user(s)?\n\nThis will restore their platform access.`,
            delete: `Are you sure you want to delete ${count} user(s)?\n\n⚠️ This action cannot be undone and will anonymize their data.`
        };

        return messages[action] || `Are you sure you want to ${action} ${count} user(s)?`;
    }

    showBulkActionResults(action, successCount, failedCount, skippedCount) {
        let message = '';
        let type = 'success';

        if (successCount > 0 && failedCount === 0) {
            message = `✅ Successfully ${action}d ${successCount} user(s)`;
            if (skippedCount > 0) {
                message += ` (${skippedCount} skipped)`;
            }
        } else if (successCount > 0 && failedCount > 0) {
            message = `⚠️ ${action} completed: ${successCount} successful, ${failedCount} failed`;
            if (skippedCount > 0) {
                message += `, ${skippedCount} skipped`;
            }
            type = 'warning';
        } else if (failedCount > 0) {
            message = `❌ All ${action} operations failed (${failedCount} users)`;
            type = 'error';
        } else {
            message = `ℹ️ No users were ${action}d (${skippedCount} skipped)`;
            type = 'info';
        }

        this.core.showToast(message, type);
    }

    // ==================== UTILITY METHODS ====================

    updateTableCount() {
        if (this.elements.userTableCount) {
            const { total, page, per_page } = this.core.state.pagination;
            const start = (page - 1) * per_page + 1;
            const end = Math.min(page * per_page, total);

            this.elements.userTableCount.textContent =
                `Showing ${start.toLocaleString()}-${end.toLocaleString()} of ${total.toLocaleString()} users`;
        }
    }

    getUserStatusClass(user) {
        if (user.is_banned) return 'banned';
        if (user.is_suspended) return 'suspended';
        if (user.is_active) return 'active';
        return 'inactive';
    }

    getUserStatusText(user) {
        if (user.is_banned) return 'Banned';
        if (user.is_suspended) return 'Suspended';
        if (user.is_active) return 'Active';
        return 'Inactive';
    }

    getUserStatusAction(user) {
        if (user.is_suspended || user.is_banned) return 'Activate user';
        return 'Suspend user';
    }

    getUserStatusIcon(user) {
        if (user.is_suspended || user.is_banned) return 'play-circle';
        return 'pause-circle';
    }

    formatFullDate(dateString) {
        try {
            return new Date(dateString).toLocaleString();
        } catch (error) {
            return dateString;
        }
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

    handleDeviceChange() {
        // Re-render current users for new device layout
        this.renderUsers(this.core.state.users.list);
        this.renderPagination(this.core.state.pagination);
    }

    destroy() {
        console.log('🗑 Destroying Users Table Manager...');
        this.isInitialized = false;
        this.elements = {};
        this.core = null;
    }
}

// ==================== MODAL MANAGEMENT ====================

class CineBrainUsersModalsManager {
    constructor(coreInstance) {
        this.core = coreInstance;
        this.currentUser = null;
        this.activeModals = new Map();

        // Elements will be set during initialization
        this.elements = {
            userDetailsModal: null,
            editUserModal: null,
            addUserModal: null
        };

        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🖼️ Initializing Users Modals Manager...');

            this.initializeElements();
            this.setupEventListeners();

            // Register with core
            this.core.registerComponent('modals', this);

            this.isInitialized = true;
            console.log('✅ Users Modals Manager initialized');

        } catch (error) {
            console.error('❌ Modals Manager initialization failed:', error);
            throw error;
        }
    }

    initializeElements() {
        this.elements = {
            userDetailsModal: document.getElementById('userDetailsModal'),
            editUserModal: document.getElementById('editUserModal'),
            addUserModal: document.getElementById('addUserModal')
        };

        // Validate required elements
        if (!this.elements.userDetailsModal || !this.elements.editUserModal) {
            console.warn('⚠️ Some modal elements not found, some features may not work');
        }
    }

    setupEventListeners() {
        // Edit user button in details modal
        document.getElementById('editUserBtn')?.addEventListener('click', () => {
            if (this.currentUser) {
                this.showEditUser(this.currentUser.id);
            }
        });

        // Edit user form submission
        document.getElementById('editUserForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditUserSubmit();
        });

        // Add user form submission
        document.getElementById('addUserForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddUserSubmit();
        });

        // Modal event listeners
        if (this.elements.userDetailsModal) {
            this.elements.userDetailsModal.addEventListener('hidden.bs.modal', () => {
                this.currentUser = null;
            });
        }

        if (this.elements.editUserModal) {
            this.elements.editUserModal.addEventListener('hidden.bs.modal', () => {
                this.resetEditForm();
            });
        }
    }

    // ==================== USER DETAILS MODAL ====================

    async showUserDetails(userId) {
        try {
            this.core.showLoading(true, 'Loading user details...');

            const response = await this.core.makeAuthenticatedRequest(`/admin/users/${userId}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to load user details: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Invalid user data structure');
            }

            this.currentUser = result.data;
            this.renderUserDetails(result.data);

            // Show modal
            if (this.elements.userDetailsModal) {
                const modal = new bootstrap.Modal(this.elements.userDetailsModal);
                this.activeModals.set('userDetails', modal);
                modal.show();
            }

        } catch (error) {
            console.error('❌ Error loading user details:', error);
            this.core.handleError('Failed to load user details', error);
        } finally {
            this.core.showLoading(false);
        }
    }

    renderUserDetails(user) {
        const modalBody = document.getElementById('userDetailsModalBody');
        if (!modalBody) return;

        const detailsHTML = `
            <div class="user-modal-header">
                <div class="user-modal-avatar">
                    ${user.avatar_url ?
                `<img src="${this.escapeHtml(user.avatar_url)}" alt="${this.escapeHtml(user.username)}" loading="lazy">` :
                `<i data-feather="user"></i>`
            }
                </div>
                <div class="user-modal-info">
                    <h4>${this.escapeHtml(user.full_name || user.username)}</h4>
                    <p>@${this.escapeHtml(user.username)} • ${this.escapeHtml(user.email)}</p>
                    ${user.location ? `<p class="user-location"><i data-feather="map-pin"></i> ${this.escapeHtml(user.location)}</p>` : ''}
                </div>
            </div>
            
            <div class="user-details-grid">
                ${this.renderUserDetailItem('User ID', user.id)}
                ${this.renderUserDetailItem('Role', this.renderRoleBadge(user))}
                ${this.renderUserDetailItem('Status', this.renderStatusBadge(user))}
                ${this.renderUserDetailItem('Join Date', this.formatDate(user.created_at))}
                ${this.renderUserDetailItem('Last Active', user.last_active ? this.formatDate(user.last_active) : 'Never')}
                ${user.preferred_languages && user.preferred_languages.length ?
                this.renderUserDetailItem('Preferred Languages', user.preferred_languages.join(', ')) : ''
            }
                ${user.preferred_genres && user.preferred_genres.length ?
                this.renderUserDetailItem('Preferred Genres', user.preferred_genres.join(', ')) : ''
            }
            </div>

            <div class="user-activity-summary">
                <h5><i data-feather="activity"></i> Activity Summary</h5>
                <div class="activity-grid">
                    ${this.renderActivityStat('Total Interactions', user.interaction_count || 0, 'zap')}
                    ${this.renderActivityStat('Content Rated', user.ratings_count || 0, 'star')}
                    ${this.renderActivityStat('Favorites', user.favorites_count || 0, 'heart')}
                    ${this.renderActivityStat('Watchlist', user.watchlist_count || 0, 'bookmark')}
                    ${user.reviews_count !== undefined ?
                this.renderActivityStat('Reviews Written', user.reviews_count || 0, 'edit-3') : ''
            }
                </div>
            </div>
        `;

        modalBody.innerHTML = detailsHTML;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderUserDetailItem(label, value) {
        return `
            <div class="user-detail-item">
                <div class="user-detail-label">${label}</div>
                <div class="user-detail-value">${value}</div>
            </div>
        `;
    }

    renderActivityStat(label, value, icon) {
        return `
            <div class="activity-stat">
                <div class="activity-stat-icon">
                    <i data-feather="${icon}"></i>
                </div>
                <div class="activity-stat-content">
                    <div class="activity-stat-value">${value.toLocaleString()}</div>
                    <div class="activity-stat-label">${label}</div>
                </div>
            </div>
        `;
    }

    renderRoleBadge(user) {
        return `
            <span class="role-badge role-badge-${user.is_admin ? 'admin' : 'user'}">
                <i data-feather="${user.is_admin ? 'shield' : 'user'}"></i>
                ${user.is_admin ? 'Admin' : 'User'}
            </span>
        `;
    }

    renderStatusBadge(user) {
        const statusClass = this.getUserStatusClass(user);
        const statusText = this.getUserStatusText(user);

        return `
            <span class="status-badge status-badge-${statusClass}">
                <span class="status-indicator ${statusClass}"></span>
                ${statusText}
            </span>
        `;
    }

    // ==================== EDIT USER MODAL ====================

    async showEditUser(userId) {
        // Close details modal first
        const detailsModal = this.activeModals.get('userDetails');
        if (detailsModal) {
            detailsModal.hide();
        }

        try {
            this.core.showLoading(true, 'Loading user for editing...');

            const response = await this.core.makeAuthenticatedRequest(`/admin/users/${userId}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to load user for editing: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Invalid user data structure');
            }

            this.renderEditUserForm(result.data);

            // Show modal
            if (this.elements.editUserModal) {
                const modal = new bootstrap.Modal(this.elements.editUserModal);
                this.activeModals.set('editUser', modal);
                modal.show();
            }

        } catch (error) {
            console.error('❌ Error loading user for edit:', error);
            this.core.handleError('Failed to load user for editing', error);
        } finally {
            this.core.showLoading(false);
        }
    }

    renderEditUserForm(user) {
        const modalBody = this.elements.editUserModal?.querySelector('.modal-body');
        if (!modalBody) return;

        const formHTML = `
            <input type="hidden" id="editUserId" value="${user.id}">
            
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="editUsername" class="form-label">
                            <i data-feather="user"></i> Username
                        </label>
                        <input type="text" 
                               class="form-control" 
                               id="editUsername" 
                               value="${this.escapeHtml(user.username)}" 
                               required
                               pattern="[a-zA-Z0-9_-]{3,20}"
                               title="Username must be 3-20 characters, letters, numbers, underscore, or dash only">
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="editEmail" class="form-label">
                            <i data-feather="mail"></i> Email
                        </label>
                        <input type="email" 
                               class="form-control" 
                               id="editEmail" 
                               value="${this.escapeHtml(user.email)}" 
                               required>
                    </div>
                </div>
                
                <div class="col-12">
                    <div class="form-group">
                        <label for="editFullName" class="form-label">
                            <i data-feather="user-check"></i> Full Name
                        </label>
                        <input type="text" 
                               class="form-control" 
                               id="editFullName" 
                               value="${this.escapeHtml(user.full_name || '')}"
                               maxlength="100">
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="editRole" class="form-label">
                            <i data-feather="shield"></i> Role
                        </label>
                        <select class="form-select" id="editRole">
                            <option value="user" ${!user.is_admin ? 'selected' : ''}>User</option>
                            <option value="admin" ${user.is_admin ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="editStatus" class="form-label">
                            <i data-feather="activity"></i> Status
                        </label>
                        <select class="form-select" id="editStatus">
                            <option value="active" ${!user.is_suspended && !user.is_banned ? 'selected' : ''}>Active</option>
                            <option value="suspended" ${user.is_suspended ? 'selected' : ''}>Suspended</option>
                            <option value="banned" ${user.is_banned ? 'selected' : ''}>Banned</option>
                        </select>
                    </div>
                </div>
                
                <div class="col-12">
                    <div class="form-group">
                        <label for="editLocation" class="form-label">
                            <i data-feather="map-pin"></i> Location
                        </label>
                        <input type="text" 
                               class="form-control" 
                               id="editLocation" 
                               value="${this.escapeHtml(user.location || '')}"
                               maxlength="100">
                    </div>
                </div>
            </div>
        `;

        modalBody.innerHTML = formHTML;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async handleEditUserSubmit() {
        try {
            const formData = this.getEditFormData();

            if (!this.validateEditForm(formData)) {
                return;
            }

            this.core.showLoading(true, 'Updating user...');

            const response = await this.core.makeAuthenticatedRequest(`/admin/users/${formData.userId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    full_name: formData.fullName,
                    is_admin: formData.isAdmin,
                    status: formData.status,
                    location: formData.location
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Update failed: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to update user');
            }

            // Show success message
            const changes = result.changes || [];
            const message = changes.length ?
                `User updated successfully: ${changes.join(', ')}` :
                'User updated successfully';

            this.core.showToast(message, 'success');

            // Close modal
            const modal = this.activeModals.get('editUser');
            if (modal) {
                modal.hide();
            }

            // Refresh data
            await Promise.all([
                this.core.loadUsers(),
                this.core.loadUserStatistics()
            ]);

            // Haptic feedback
            this.core.hapticFeedback('medium');

        } catch (error) {
            console.error('❌ Error updating user:', error);
            this.core.handleError('Failed to update user', error);
        } finally {
            this.core.showLoading(false);
        }
    }

    getEditFormData() {
        return {
            userId: document.getElementById('editUserId')?.value,
            username: document.getElementById('editUsername')?.value?.trim(),
            email: document.getElementById('editEmail')?.value?.trim(),
            fullName: document.getElementById('editFullName')?.value?.trim(),
            isAdmin: document.getElementById('editRole')?.value === 'admin',
            status: document.getElementById('editStatus')?.value,
            location: document.getElementById('editLocation')?.value?.trim()
        };
    }

    validateEditForm(formData) {
        if (!formData.username || formData.username.length < 3) {
            this.core.showToast('Username must be at least 3 characters long', 'error');
            return false;
        }

        if (!formData.email || !this.isValidEmail(formData.email)) {
            this.core.showToast('Please enter a valid email address', 'error');
            return false;
        }

        return true;
    }

    resetEditForm() {
        const form = document.getElementById('editUserForm');
        if (form) {
            form.reset();
        }
    }

    // ==================== ADD USER MODAL ====================

    showAddUserModal() {
        this.core.showToast('Add user functionality will be implemented soon', 'info');

        // TODO: Implement add user modal
        /*
        if (this.elements.addUserModal) {
            this.renderAddUserForm();
            const modal = new bootstrap.Modal(this.elements.addUserModal);
            this.activeModals.set('addUser', modal);
            modal.show();
        }
        */
    }

    // ==================== UTILITY METHODS ====================

    getUserStatusClass(user) {
        if (user.is_banned) return 'banned';
        if (user.is_suspended) return 'suspended';
        if (user.is_active) return 'active';
        return 'inactive';
    }

    getUserStatusText(user) {
        if (user.is_banned) return 'Banned';
        if (user.is_suspended) return 'Suspended';
        if (user.is_active) return 'Active';
        return 'Inactive';
    }

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleString();
        } catch (error) {
            return dateString;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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

    handleDeviceChange() {
        // Handle any mobile-specific modal adjustments
        console.log('📱 Modal layout adjusted for device change');
    }

    destroy() {
        console.log('🗑 Destroying Users Modals Manager...');

        // Close all active modals
        this.activeModals.forEach((modal, key) => {
            try {
                modal.hide();
            } catch (error) {
                console.warn(`Warning: Error closing modal ${key}:`, error);
            }
        });

        this.activeModals.clear();
        this.isInitialized = false;
        this.elements = {};
        this.core = null;
        this.currentUser = null;
    }
}

// ==================== GLOBAL FUNCTIONS FOR HTML ====================

// User status toggle function
window.toggleUserStatus = async function (userId) {
    if (!window.cineBrainUsersCore) return;

    try {
        const user = window.cineBrainUsersCore.state.users.list.find(u => u.id === userId);
        if (!user) {
            console.error('User not found:', userId);
            return;
        }

        const action = (user.is_suspended || user.is_banned) ? 'activate' : 'suspend';
        const confirmMessage = `Are you sure you want to ${action} this user?\n\n${action === 'suspend' ?
            'This will prevent them from accessing the platform.' :
            'This will restore their platform access.'
            }`;

        if (!confirm(confirmMessage)) return;

        window.cineBrainUsersCore.showLoading(true, `${action.charAt(0).toUpperCase() + action.slice(1)}ing user...`);

        const response = await window.cineBrainUsersCore.makeAuthenticatedRequest(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ action: action })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Status update failed: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || `Failed to ${action} user`);
        }

        // Show success message
        window.cineBrainUsersCore.showToast(result.message || `User ${action}d successfully`, 'success');

        // Refresh data
        await Promise.all([
            window.cineBrainUsersCore.loadUsers(),
            window.cineBrainUsersCore.loadUserStatistics()
        ]);

        // Haptic feedback
        window.cineBrainUsersCore.hapticFeedback('light');

    } catch (error) {
        console.error('❌ Error updating user status:', error);
        window.cineBrainUsersCore.handleError('Failed to update user status', error);
    } finally {
        window.cineBrainUsersCore.showLoading(false);
    }
};

// ==================== INITIALIZATION ====================

let cineBrainUsersTable;
let cineBrainUsersModals;

document.addEventListener('DOMContentLoaded', () => {
    // Wait for core to be ready
    if (window.cineBrainUsersCore) {
        initializeUsersManagement();
    } else {
        // Wait for core initialization
        setTimeout(initializeUsersManagement, 100);
    }
});

async function initializeUsersManagement() {
    try {
        if (!window.cineBrainUsersCore) {
            console.warn('⚠️ Core not ready, retrying...');
            setTimeout(initializeUsersManagement, 100);
            return;
        }

        // Initialize table manager
        cineBrainUsersTable = new CineBrainUsersTableManager(window.cineBrainUsersCore);
        await cineBrainUsersTable.init();

        // Initialize modals manager
        cineBrainUsersModals = new CineBrainUsersModalsManager(window.cineBrainUsersCore);
        await cineBrainUsersModals.init();

        // Make globally available
        window.cineBrainUsersTable = cineBrainUsersTable;
        window.cineBrainUsersModals = cineBrainUsersModals;

        console.log('✅ Users Management UI initialized successfully');

    } catch (error) {
        console.error('❌ Users Management UI initialization failed:', error);
    }
}

window.addEventListener('beforeunload', () => {
    if (cineBrainUsersTable) {
        cineBrainUsersTable.destroy();
    }
    if (cineBrainUsersModals) {
        cineBrainUsersModals.destroy();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CineBrainUsersTableManager,
        CineBrainUsersModalsManager
    };
} else {
    window.CineBrainUsersTableManager = CineBrainUsersTableManager;
    window.CineBrainUsersModalsManager = CineBrainUsersModalsManager;
}