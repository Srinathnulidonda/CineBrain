/**
 * CineBrain Support Item Details - Mobile-First Redesign
 * Modern, responsive modal system for viewing support items
 */

class SupportItemDetailsManager {
    constructor() {
        this.supportDashboard = null;
        this.currentItem = null;
        this.modals = {};
        this.isInitialized = false;
        this.pendingView = null;

        // Wait for support dashboard to be ready
        this.waitForDashboard();
    }

    waitForDashboard() {
        const checkDashboard = () => {
            if (window.supportDashboard && window.supportDashboard.supportData) {
                this.supportDashboard = window.supportDashboard;
                this.init();
            } else {
                setTimeout(checkDashboard, 100);
            }
        };
        checkDashboard();
    }

    init() {
        if (this.isInitialized) return;

        this.createModernModalHTML();
        this.setupEventListeners();
        this.isInitialized = true;

        // If there was a pending view request, process it now
        if (this.pendingView) {
            this.viewItemDetails(this.pendingView);
            this.pendingView = null;
        }

        console.log('✅ Support Item Details Manager initialized');
    }

    createModernModalHTML() {
        // Remove existing modals
        ['supportItemDetailsModal', 'quickActionsModal'].forEach(id => {
            const existing = document.getElementById(id);
            if (existing) existing.remove();
        });

        const modalHTML = `
            <!-- Modern Support Item Details Modal -->
            <div class="modal fade support-details-modal" id="supportItemDetailsModal" tabindex="-1" 
                 data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-fullscreen-lg-down modal-xl modal-dialog-centered">
                    <div class="modal-content support-details-content">
                        <!-- Header -->
                        <div class="support-details-header">
                            <div class="header-content">
                                <div class="header-info">
                                    <div class="item-type-badge" id="itemTypeBadge"></div>
                                    <h2 class="item-title" id="itemTitle">Loading...</h2>
                                    <div class="item-meta" id="itemMeta"></div>
                                </div>
                                <div class="header-actions">
                                    <button class="action-btn secondary" id="quickActionsBtn" title="Quick Actions">
                                        <i data-feather="more-vertical"></i>
                                    </button>
                                    <button class="action-btn secondary" data-bs-dismiss="modal" title="Close">
                                        <i data-feather="x"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" id="progressFill"></div>
                            </div>
                        </div>

                        <!-- Content -->
                        <div class="support-details-body">
                            <!-- Loading State -->
                            <div class="loading-state" id="loadingState">
                                <div class="loading-spinner">
                                    <div class="spinner"></div>
                                </div>
                                <p class="loading-text">Loading details...</p>
                            </div>

                            <!-- Error State -->
                            <div class="error-state" id="errorState" style="display: none;">
                                <div class="error-icon">
                                    <i data-feather="alert-circle"></i>
                                </div>
                                <h3>Unable to Load Details</h3>
                                <p class="error-message" id="errorMessage">Something went wrong</p>
                                <button class="btn btn-primary" onclick="supportItemDetailsManager.retry()">
                                    <i data-feather="refresh-cw"></i>
                                    Try Again
                                </button>
                            </div>

                            <!-- Main Content -->
                            <div class="details-content" id="detailsContent" style="display: none;">
                                <!-- Content will be populated by JavaScript -->
                            </div>
                        </div>

                        <!-- Footer Actions (Mobile) -->
                        <div class="support-details-footer d-lg-none" id="mobileActions">
                            <!-- Mobile actions will be populated -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions Modal -->
            <div class="modal fade" id="quickActionsModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i data-feather="zap"></i>
                                Quick Actions
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="quick-actions-grid" id="quickActionsGrid">
                                <!-- Actions will be populated -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Reply Modal -->
            <div class="modal fade" id="replyModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i data-feather="message-square"></i>
                                Send Reply
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="reply-to-info" id="replyToInfo"></div>
                            <form id="replyForm">
                                <div class="mb-3">
                                    <label for="replyMessage" class="form-label">Your Reply</label>
                                    <textarea class="form-control" id="replyMessage" rows="5" 
                                              placeholder="Type your reply here..." required></textarea>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="autoResolveCheck">
                                    <label class="form-check-label" for="autoResolveCheck">
                                        Mark as resolved after sending
                                    </label>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="sendReplyBtn">
                                <i data-feather="send"></i>
                                Send Reply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupEventListeners() {
        // Quick actions button
        document.getElementById('quickActionsBtn')?.addEventListener('click', () => {
            this.showQuickActions();
        });

        // Reply form
        document.getElementById('sendReplyBtn')?.addEventListener('click', () => {
            this.sendReply();
        });

        // Modal cleanup
        document.getElementById('supportItemDetailsModal')?.addEventListener('hidden.bs.modal', () => {
            this.cleanup();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modals.details?.isShown) {
                this.close();
            }
        });
    }

    viewItemDetails(itemId) {
        // If not initialized, store for later
        if (!this.isInitialized) {
            this.pendingView = itemId;
            return;
        }

        this.currentItemId = itemId;
        this.show();
        this.loadItemData(itemId);
    }

    show() {
        const modalEl = document.getElementById('supportItemDetailsModal');
        this.modals.details = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
        });
        this.modals.details.show();

        // Add body class for mobile optimization
        document.body.classList.add('support-modal-open');
    }

    close() {
        this.modals.details?.hide();
        document.body.classList.remove('support-modal-open');
    }

    cleanup() {
        this.currentItem = null;
        this.currentItemId = null;
        document.body.classList.remove('support-modal-open');
    }

    retry() {
        if (this.currentItemId) {
            this.loadItemData(this.currentItemId);
        }
    }

    showLoading() {
        document.getElementById('loadingState').style.display = 'flex';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('detailsContent').style.display = 'none';
        this.updateProgress(0);
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'flex';
        document.getElementById('detailsContent').style.display = 'none';
        document.getElementById('errorMessage').textContent = message;
    }

    showContent() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('detailsContent').style.display = 'block';
        this.updateProgress(100);
    }

    updateProgress(percent) {
        const fill = document.getElementById('progressFill');
        if (fill) {
            fill.style.width = percent + '%';
        }
    }

    async loadItemData(itemId) {
        const [type, id] = itemId.split('-');
        this.showLoading();

        try {
            this.updateProgress(25);

            let item = this.findItemInCurrentData(itemId, type);

            if (!item) {
                throw new Error('Item not found');
            }

            this.updateProgress(50);
            this.currentItem = { type, data: item };

            // Try to get additional details from API
            try {
                await this.enrichItemData(type, id, item);
                this.updateProgress(75);
            } catch (apiError) {
                console.log('API enrichment failed, using list data:', apiError);
            }

            this.renderItemDetails();
            this.updateProgress(100);
            this.showContent();

        } catch (error) {
            console.error('Error loading item:', error);
            this.showError('Failed to load item details. Please try again.');
        }
    }

    findItemInCurrentData(itemId, type) {
        const allItems = this.supportDashboard.combineAllSupportItems();
        return allItems.find(item =>
            item.itemId === itemId && item.type === type
        );
    }

    async enrichItemData(type, id, item) {
        // Try to get more detailed data from API if available
        switch (type) {
            case 'ticket':
                if (item.ticket_number) {
                    try {
                        const response = await this.makeRequest(`/support/tickets/${item.ticket_number}`);
                        if (response.ok) {
                            const data = await response.json();
                            Object.assign(item, data.ticket);
                            item.activities = data.activities || [];
                        }
                    } catch { }
                }
                break;
        }
    }

    renderItemDetails() {
        const { type, data } = this.currentItem;

        this.updateHeader(type, data);
        this.renderMainContent(type, data);
        this.setupActions(type, data);
    }

    updateHeader(type, data) {
        const typeBadge = document.getElementById('itemTypeBadge');
        const title = document.getElementById('itemTitle');
        const meta = document.getElementById('itemMeta');

        // Type badge with icon
        const typeConfig = {
            ticket: { icon: 'message-circle', label: 'Support Ticket', color: 'primary' },
            contact: { icon: 'mail', label: 'Contact Message', color: 'success' },
            issue: { icon: 'alert-triangle', label: 'Issue Report', color: 'warning' }
        };

        const config = typeConfig[type];
        typeBadge.innerHTML = `
            <i data-feather="${config.icon}"></i>
            <span>${config.label}</span>
        `;
        typeBadge.className = `item-type-badge ${config.color}`;

        // Title
        title.textContent = this.getItemTitle(type, data);

        // Meta information
        meta.innerHTML = this.getItemMeta(type, data);

        // Update feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    getItemTitle(type, data) {
        switch (type) {
            case 'ticket':
                return `#${data.ticket_number || data.displayNumber}`;
            case 'contact':
                return data.subject || data.title;
            case 'issue':
                return data.issue_title || data.title;
            default:
                return 'Support Item';
        }
    }

    getItemMeta(type, data) {
        const timeAgo = this.getTimeAgo(data.created_at);

        let badges = [];

        switch (type) {
            case 'ticket':
                badges = [
                    `<span class="status-badge ${data.status}">${this.getStatusLabel(data.status)}</span>`,
                    `<span class="priority-badge ${data.priority}">${this.getPriorityLabel(data.priority)}</span>`
                ];
                break;
            case 'contact':
                badges = [
                    `<span class="status-badge ${data.status === 'read' ? 'read' : 'unread'}">${data.status === 'read' ? 'Read' : 'Unread'}</span>`
                ];
                if (data.is_business) {
                    badges.push('<span class="business-badge">Business</span>');
                }
                break;
            case 'issue':
                badges = [
                    `<span class="status-badge ${data.status === 'resolved' ? 'resolved' : 'open'}">${data.status === 'resolved' ? 'Resolved' : 'Open'}</span>`,
                    `<span class="severity-badge ${data.severity || data.priority}">${this.getSeverityLabel(data.severity || data.priority)}</span>`
                ];
                break;
        }

        return `
            <div class="meta-badges">${badges.join('')}</div>
            <div class="meta-time">
                <i data-feather="clock"></i>
                <span>${timeAgo}</span>
            </div>
        `;
    }

    renderMainContent(type, data) {
        const container = document.getElementById('detailsContent');

        let content = '';

        switch (type) {
            case 'ticket':
                content = this.renderTicketContent(data);
                break;
            case 'contact':
                content = this.renderContactContent(data);
                break;
            case 'issue':
                content = this.renderIssueContent(data);
                break;
        }

        container.innerHTML = content;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderTicketContent(ticket) {
        return `
            <div class="content-sections">
                <!-- Compact User Info Card -->
                <div class="content-section">
                    <div class="section-header">
                        <i data-feather="user"></i>
                        <h4>Customer Information</h4>
                    </div>
                    <div class="info-grid-compact">
                        <div class="info-item">
                            <label>Name</label>
                            <span class="text-truncate" title="${this.escapeHtml(ticket.user_name || ticket.user)}">
                                ${this.escapeHtml(ticket.user_name || ticket.user)}
                            </span>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <a href="mailto:${ticket.user_email || ticket.email}" class="link-primary text-truncate">
                                ${ticket.user_email || ticket.email}
                            </a>
                        </div>
                        ${ticket.category ? `
                            <div class="info-item">
                                <label>Category</label>
                                <span>${ticket.category.icon} ${ticket.category.name}</span>
                            </div>
                        ` : ''}
                        ${ticket.assigned_to ? `
                            <div class="info-item">
                                <label>Assigned To</label>
                                <span>Agent #${ticket.assigned_to}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Subject & Description -->
                <div class="content-section">
                    <div class="section-header">
                        <i data-feather="file-text"></i>
                        <h4>Ticket Details</h4>
                    </div>
                    <div class="p-3">
                        <label class="text-muted text-uppercase" style="font-size: 10px; font-weight: 500;">Subject</label>
                        <h5 style="font-size: 14px; margin: 4px 0 12px 0;">${this.escapeHtml(ticket.subject || ticket.title)}</h5>
                        
                        <label class="text-muted text-uppercase" style="font-size: 10px; font-weight: 500;">Description</label>
                        <div class="content-display">
                            ${this.formatText(ticket.description)}
                        </div>
                    </div>
                </div>

                <!-- Technical Details Table -->
                ${this.renderTechnicalTable(ticket)}

                <!-- Compact Timeline -->
                ${this.renderCompactTimeline(ticket.activities)}
            </div>
        `;
    }

    renderTechnicalTable(item) {
        const hasInfo = item.browser_info || item.device_os || item.page_url || item.ip_address;

        if (!hasInfo) return '';

        return `
            <div class="content-section">
                <div class="section-header">
                    <i data-feather="monitor"></i>
                    <h4>Technical Information</h4>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Property</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${item.browser_info ? `
                            <tr>
                                <td>Browser</td>
                                <td>${this.escapeHtml(item.browser_info)}</td>
                            </tr>
                        ` : ''}
                        ${item.device_os ? `
                            <tr>
                                <td>Device/OS</td>
                                <td>${this.escapeHtml(item.device_os)}</td>
                            </tr>
                        ` : ''}
                        ${item.ip_address ? `
                            <tr>
                                <td>IP Address</td>
                                <td>${item.ip_address}</td>
                            </tr>
                        ` : ''}
                        ${item.page_url ? `
                            <tr>
                                <td>Page URL</td>
                                <td>
                                    <a href="${item.page_url}" target="_blank" class="link-primary d-flex align-items-center gap-1">
                                        <span class="text-truncate" style="max-width: 300px;">${item.page_url}</span>
                                        <i data-feather="external-link" style="width: 10px; height: 10px;"></i>
                                    </a>
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderCompactTimeline(activities) {
        if (!activities || activities.length === 0) {
            return `
                <div class="content-section">
                    <div class="section-header">
                        <i data-feather="clock"></i>
                        <h4>Activity Timeline</h4>
                    </div>
                    <div class="p-3 text-center text-muted" style="font-size: 12px;">
                        No activity recorded yet
                    </div>
                </div>
            `;
        }

        const timelineItems = activities.slice(0, 10).map((activity, index) => `
            <div class="timeline-item">
                <div class="timeline-marker ${index === 0 ? 'is-active' : ''}">
                    <i data-feather="${this.getActivityIcon(activity.action)}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <strong>${this.escapeHtml(activity.actor_name || 'System')}</strong>
                        <span class="timeline-time">${this.getTimeAgo(activity.created_at)}</span>
                    </div>
                    <div class="timeline-description">
                        ${this.escapeHtml(activity.description)}
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <div class="content-section">
                <div class="section-header">
                    <i data-feather="clock"></i>
                    <h4>Activity Timeline</h4>
                    ${activities.length > 10 ? `<span class="text-muted" style="font-size: 10px;">Showing recent 10</span>` : ''}
                </div>
                <div class="timeline">
                    ${timelineItems}
                </div>
            </div>
        `;
    }

    renderContactContent(contact) {
        return `
            <div class="content-sections">
                <!-- Contact Info -->
                <div class="content-section">
                    <div class="section-header">
                        <i data-feather="user"></i>
                        <h4>Contact Information</h4>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Name</label>
                            <span>${this.escapeHtml(contact.name || contact.user)}</span>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <span>
                                <a href="mailto:${contact.email}" class="link-primary">${contact.email}</a>
                            </span>
                        </div>
                        ${contact.phone ? `
                            <div class="info-item">
                                <label>Phone</label>
                                <span>
                                    <a href="tel:${contact.phone}" class="link-primary">${contact.phone}</a>
                                </span>
                            </div>
                        ` : ''}
                        ${contact.company ? `
                            <div class="info-item">
                                <label>Company</label>
                                <span class="company-tag">${this.escapeHtml(contact.company)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Message -->
                <div class="content-section">
                    <div class="section-header">
                        <i data-feather="message-circle"></i>
                        <h4>Message</h4>
                    </div>
                    <div class="message-content">
                        ${this.formatText(contact.message)}
                    </div>
                </div>
            </div>
        `;
    }

    renderIssueContent(issue) {
        return `
            <div class="content-sections">
                <!-- Reporter Info -->
                <div class="content-section">
                    <div class="section-header">
                        <i data-feather="user"></i>
                        <h4>Reporter Information</h4>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Name</label>
                            <span>${this.escapeHtml(issue.name || issue.user)}</span>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <span>
                                <a href="mailto:${issue.email}" class="link-primary">${issue.email}</a>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Issue Details -->
                <div class="content-section">
                    <div class="section-header">
                        <i data-feather="alert-triangle"></i>
                        <h4>Issue Description</h4>
                    </div>
                    <div class="issue-description">
                        <label>Problem Description</label>
                        <div class="description-content">
                            ${this.formatText(issue.description)}
                        </div>
                    </div>

                    ${issue.steps_to_reproduce ? `
                        <div class="steps-section">
                            <label>Steps to Reproduce</label>
                            <div class="steps-content">
                                ${this.formatText(issue.steps_to_reproduce)}
                            </div>
                        </div>
                    ` : ''}

                    ${issue.expected_behavior ? `
                        <div class="expected-section">
                            <label>Expected Behavior</label>
                            <div class="expected-content">
                                ${this.formatText(issue.expected_behavior)}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Technical Environment -->
                ${this.renderTechnicalTable(issue)}

                <!-- Screenshots -->
                ${this.renderScreenshots(issue.screenshots)}
            </div>
        `;
    }

    renderScreenshots(screenshots) {
        if (!screenshots || screenshots.length === 0) return '';

        const screenshotGrid = screenshots.map((screenshot, index) => `
            <div class="screenshot-item">
                <img src="${screenshot.url}" 
                     alt="Screenshot ${index + 1}" 
                     onclick="window.open('${screenshot.url}', '_blank')"
                     loading="lazy">
                <div class="screenshot-info">
                    <span class="filename text-truncate" title="${screenshot.original_filename || `Screenshot ${index + 1}`}">
                        ${screenshot.original_filename || `Screenshot ${index + 1}`}
                    </span>
                    ${screenshot.bytes ? `<span class="text-muted" style="font-size: 9px;">${this.formatFileSize(screenshot.bytes)}</span>` : ''}
                </div>
            </div>
        `).join('');

        return `
            <div class="content-section">
                <div class="section-header">
                    <i data-feather="image"></i>
                    <h4>Screenshots</h4>
                    <span class="text-muted" style="font-size: 10px;">${screenshots.length} files</span>
                </div>
                <div class="screenshot-grid">
                    ${screenshotGrid}
                </div>
            </div>
        `;
    }

    setupActions(type, data) {
        // Desktop actions in header
        const headerActions = document.querySelector('.header-actions');

        // Mobile actions in footer
        const mobileActions = document.getElementById('mobileActions');

        const actions = this.getItemActions(type, data);

        // Populate quick actions modal
        this.populateQuickActions(actions);

        // Populate mobile footer
        mobileActions.innerHTML = this.renderMobileActions(actions);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    getItemActions(type, data) {
        const actions = [];

        switch (type) {
            case 'ticket':
                if (data.status !== 'resolved' && data.status !== 'closed') {
                    actions.push({
                        id: 'resolve',
                        icon: 'check-circle',
                        label: 'Mark Resolved',
                        variant: 'success',
                        action: () => this.updateTicketStatus(data.id, 'resolved')
                    });
                }
                actions.push({
                    id: 'reply',
                    icon: 'message-square',
                    label: 'Reply to Customer',
                    variant: 'primary',
                    action: () => this.openReplyModal(type, data)
                });
                break;

            case 'contact':
                if (data.status === 'unread') {
                    actions.push({
                        id: 'markRead',
                        icon: 'mail',
                        label: 'Mark as Read',
                        variant: 'outline-primary',
                        action: () => this.markContactAsRead(data.id)
                    });
                }
                actions.push({
                    id: 'reply',
                    icon: 'message-square',
                    label: 'Send Reply',
                    variant: 'primary',
                    action: () => this.openReplyModal(type, data)
                });
                break;

            case 'issue':
                if (data.status !== 'resolved') {
                    actions.push({
                        id: 'resolve',
                        icon: 'check-square',
                        label: 'Mark Resolved',
                        variant: 'success',
                        action: () => this.markIssueResolved(data.id)
                    });
                }
                actions.push({
                    id: 'contact',
                    icon: 'message-square',
                    label: 'Contact Reporter',
                    variant: 'primary',
                    action: () => this.openReplyModal(type, data)
                });
                break;
        }

        return actions;
    }

    populateQuickActions(actions) {
        const grid = document.getElementById('quickActionsGrid');

        grid.innerHTML = actions.map(action => `
            <button class="quick-action-btn" data-action="${action.id}">
                <i data-feather="${action.icon}"></i>
                <span>${action.label}</span>
            </button>
        `).join('');

        // Add click handlers
        actions.forEach(action => {
            const btn = grid.querySelector(`[data-action="${action.id}"]`);
            if (btn) {
                btn.addEventListener('click', () => {
                    action.action();
                    this.hideQuickActions();
                });
            }
        });
    }

    renderMobileActions(actions) {
        if (actions.length === 0) return '';

        return `
            <div class="mobile-actions-grid">
                ${actions.map(action => `
                    <button class="btn btn-${action.variant}" data-action="${action.id}">
                        <i data-feather="${action.icon}"></i>
                        <span>${action.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    showQuickActions() {
        const modal = new bootstrap.Modal(document.getElementById('quickActionsModal'));
        modal.show();
    }

    hideQuickActions() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('quickActionsModal'));
        if (modal) modal.hide();
    }

    openReplyModal(type, data) {
        const modal = new bootstrap.Modal(document.getElementById('replyModal'));

        // Setup reply info
        document.getElementById('replyToInfo').innerHTML = `
            <div class="reply-to-card">
                <div class="reply-to-header">
                    <strong>${this.escapeHtml(data.name || data.user_name || data.user)}</strong>
                    <span class="reply-to-email">${data.email || data.user_email}</span>
                </div>
                <div class="reply-to-subject">${this.escapeHtml(data.subject || data.title || data.issue_title)}</div>
            </div>
        `;

        // Store context
        this.replyContext = { type, data };

        modal.show();
    }

    async sendReply() {
        const message = document.getElementById('replyMessage').value.trim();
        const autoResolve = document.getElementById('autoResolveCheck').checked;

        if (!message) {
            this.showNotification('Please enter a reply message', 'error');
            return;
        }

        const btn = document.getElementById('sendReplyBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-feather="loader" class="spin"></i> Sending...';

        try {
            // Simulate sending (replace with actual API call)
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.showNotification('Reply sent successfully', 'success');

            // Close modals
            bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();

            if (autoResolve) {
                await this.performAutoResolve();
            }

            // Refresh dashboard
            if (this.supportDashboard && this.supportDashboard.loadAllSupportData) {
                await this.supportDashboard.loadAllSupportData();
            }

            this.close();

        } catch (error) {
            console.error('Error sending reply:', error);
            this.showNotification('Failed to send reply', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            if (typeof feather !== 'undefined') feather.replace();
        }
    }

    async performAutoResolve() {
        const { type, data } = this.replyContext;

        try {
            switch (type) {
                case 'ticket':
                    await this.updateTicketStatus(data.id, 'resolved');
                    break;
                case 'issue':
                    await this.markIssueResolved(data.id);
                    break;
            }
        } catch (error) {
            console.error('Auto-resolve failed:', error);
        }
    }

    // API Methods
    async makeRequest(endpoint, options = {}) {
        const token = localStorage.getItem('cinebrain-token');
        const baseOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        return fetch(
            `${this.supportDashboard?.apiBase || ''}${endpoint}`,
            { ...baseOptions, ...options }
        );
    }

    async updateTicketStatus(ticketId, status) {
        try {
            // Implementation depends on your API endpoints
            this.showNotification(`Ticket ${status}`, 'success');

            if (this.supportDashboard?.loadAllSupportData) {
                await this.supportDashboard.loadAllSupportData();
            }

            this.close();
        } catch (error) {
            this.showNotification('Failed to update ticket', 'error');
        }
    }

    async markContactAsRead(contactId) {
        try {
            // Implementation depends on your API endpoints
            this.showNotification('Contact marked as read', 'success');

            if (this.supportDashboard?.loadAllSupportData) {
                await this.supportDashboard.loadAllSupportData();
            }

            this.close();
        } catch (error) {
            this.showNotification('Failed to mark contact as read', 'error');
        }
    }

    async markIssueResolved(issueId) {
        try {
            // Implementation depends on your API endpoints
            this.showNotification('Issue marked as resolved', 'success');

            if (this.supportDashboard?.loadAllSupportData) {
                await this.supportDashboard.loadAllSupportData();
            }

            this.close();
        } catch (error) {
            this.showNotification('Failed to resolve issue', 'error');
        }
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatText(text) {
        if (!text) return 'No content available';
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    getTimeAgo(dateStr) {
        if (!dateStr) return 'Unknown';

        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    getStatusLabel(status) {
        const labels = {
            'open': 'Open',
            'in_progress': 'In Progress',
            'resolved': 'Resolved',
            'closed': 'Closed',
            'read': 'Read',
            'unread': 'Unread'
        };
        return labels[status] || status;
    }

    getPriorityLabel(priority) {
        const labels = {
            'urgent': 'Urgent',
            'high': 'High',
            'normal': 'Normal',
            'low': 'Low'
        };
        return labels[priority] || priority;
    }

    getSeverityLabel(severity) {
        return this.getPriorityLabel(severity);
    }

    getActivityIcon(action) {
        const icons = {
            'created': 'plus-circle',
            'status_updated': 'refresh-cw',
            'resolved': 'check-circle',
            'responded': 'message-square'
        };
        return icons[action] || 'circle';
    }

    showNotification(message, type = 'info') {
        // Use existing notification system from support dashboard
        if (this.supportDashboard) {
            this.supportDashboard.showNotification(message, type);
        } else {
            alert(message); // Fallback
        }
    }
}

// Initialize immediately
window.supportItemDetailsManager = new SupportItemDetailsManager();

// Global function for backward compatibility
function viewItemDetails(itemId) {
    window.supportItemDetailsManager.viewItemDetails(itemId);
}