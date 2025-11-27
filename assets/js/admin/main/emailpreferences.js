/**
 * CineBrain Admin Dashboard - Email Preferences Manager
 * Integrated with AdminDashboard and matching the CSS design system
 */

class EmailPreferences {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.preferences = null;
        this.isLoading = false;
        this.isMobile = window.innerWidth <= 768;
        this.initialized = false;
        this.lastUpdated = null;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Check if admin is authenticated
            if (!await this.checkAdminAuth()) {
                console.error('Not authenticated for email preferences');
                return;
            }

            await this.loadPreferences();
            this.renderPreferences();
            this.setupEventListeners();
            this.initialized = true;

            console.log('✅ Email Preferences initialized');

        } catch (error) {
            console.error('Error initializing email preferences:', error);
            this.showError('Failed to initialize email preferences');
        }
    }

    async checkAdminAuth() {
        try {
            const token = localStorage.getItem('cinebrain-token');
            const userStr = localStorage.getItem('cinebrain-user');

            if (!token || !userStr) return false;

            const user = JSON.parse(userStr);
            return user.is_admin;

        } catch (error) {
            return false;
        }
    }

    setupEventListeners() {
        // Window resize handling
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;

            if (wasMobile !== this.isMobile && this.initialized) {
                this.renderPreferences();
            }
        });
    }

    async loadPreferences() {
        this.isLoading = true;
        this.showLoading(true);

        try {
            const response = await this.makeAuthenticatedRequest('/admin/email-preferences');

            if (response.ok) {
                const data = await response.json();
                this.preferences = data.preferences;
                this.lastUpdated = data.updated_at;

                console.log('✅ Email preferences loaded');
            } else {
                console.warn(`Failed to load preferences: ${response.status}, using defaults`);
                // Set default preferences
                this.preferences = this.getDefaultPreferences();
            }

        } catch (error) {
            console.error('Error loading email preferences:', error);
            // Set default preferences on error
            this.preferences = this.getDefaultPreferences();

        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    getDefaultPreferences() {
        return {
            critical_alerts: {
                urgent_tickets: true,
                sla_breaches: true,
                system_alerts: true
            },
            content_management: {
                content_added: true,
                recommendation_created: true,
                recommendation_updated: false,
                recommendation_deleted: false,
                recommendation_published: true
            },
            user_activity: {
                user_feedback: true,
                regular_tickets: false
            },
            system_operations: {
                cache_operations: false,
                bulk_operations: false,
                slug_updates: false
            }
        };
    }

    renderPreferences() {
        const container = document.getElementById('emailPreferencesContent');
        if (!container) {
            console.error('Email preferences container not found');
            return;
        }

        if (!this.preferences) {
            container.innerHTML = '<p class="text-center">Loading email preferences...</p>';
            return;
        }

        const categories = this.getPreferenceCategories();

        container.innerHTML = `
            <div class="email-preferences-container">
                <div class="preferences-header">
                    <div class="preferences-title">
                        <h4>
                            <i data-feather="mail"></i>
                            Email Alert Preferences
                        </h4>
                        <p class="preferences-subtitle">
                            Control which email notifications you receive. Critical alerts are always recommended.
                        </p>
                    </div>
                    <div class="preferences-actions">
                        <button class="btn btn-outline-secondary btn-sm" id="resetEmailPreferences">
                            <i data-feather="refresh-cw"></i>
                            <span class="d-none d-sm-inline">Reset Defaults</span>
                        </button>
                        <button class="btn btn-primary btn-sm" id="saveEmailPreferences">
                            <i data-feather="save"></i>
                            <span class="d-none d-sm-inline">Save Changes</span>
                        </button>
                    </div>
                </div>

                <div class="preferences-grid">
                    ${categories.map(category => this.renderCategory(category)).join('')}
                </div>

                <div class="preferences-footer">
                    <div class="preferences-info">
                        <i data-feather="info"></i>
                        <span>Last updated: ${this.lastUpdated ? new Date(this.lastUpdated).toLocaleString() : 'Never'}</span>
                    </div>
                    <div class="preferences-status" id="preferencesStatus"></div>
                </div>
            </div>
        `;

        // Attach event listeners for new elements
        this.attachCategoryEventListeners();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    getPreferenceCategories() {
        return [
            {
                id: 'critical_alerts',
                title: '🚨 Critical Alerts',
                description: 'Important system alerts that require immediate attention',
                icon: 'alert-circle',
                color: '#ef4444',
                recommended: true,
                items: [
                    {
                        key: 'urgent_tickets',
                        label: 'Urgent Support Tickets',
                        description: 'Get notified when urgent support tickets are created',
                        recommended: true
                    },
                    {
                        key: 'sla_breaches',
                        label: 'SLA Breaches',
                        description: 'Alerts when support tickets exceed SLA deadlines',
                        recommended: true
                    },
                    {
                        key: 'system_alerts',
                        label: 'System Alerts',
                        description: 'Critical system errors and downtime notifications',
                        recommended: true
                    }
                ]
            },
            {
                id: 'content_management',
                title: '🎬 Content Management',
                description: 'Notifications about content and recommendation activities',
                icon: 'film',
                color: '#113CCF',
                recommended: false,
                items: [
                    {
                        key: 'content_added',
                        label: 'Content Added',
                        description: 'New movies, shows, or anime added to the platform'
                    },
                    {
                        key: 'recommendation_created',
                        label: 'Recommendation Created',
                        description: 'When new admin recommendations are created'
                    },
                    {
                        key: 'recommendation_updated',
                        label: 'Recommendation Updated',
                        description: 'When recommendations are modified'
                    },
                    {
                        key: 'recommendation_deleted',
                        label: 'Recommendation Deleted',
                        description: 'When recommendations are removed'
                    },
                    {
                        key: 'recommendation_published',
                        label: 'Recommendation Published',
                        description: 'When recommendations go live'
                    }
                ]
            },
            {
                id: 'user_activity',
                title: '👥 User Activity',
                description: 'Notifications about user interactions and feedback',
                icon: 'users',
                color: '#10b981',
                recommended: false,
                items: [
                    {
                        key: 'user_feedback',
                        label: 'User Feedback',
                        description: 'New user feedback and reviews submitted'
                    },
                    {
                        key: 'regular_tickets',
                        label: 'Regular Support Tickets',
                        description: 'Non-urgent support tickets (can be noisy)'
                    }
                ]
            },
            {
                id: 'system_operations',
                title: '⚙️ System Operations',
                description: 'Technical operations and maintenance activities',
                icon: 'settings',
                color: '#8b5cf6',
                recommended: false,
                items: [
                    {
                        key: 'cache_operations',
                        label: 'Cache Operations',
                        description: 'Cache clearing and maintenance operations'
                    },
                    {
                        key: 'bulk_operations',
                        label: 'Bulk Operations',
                        description: 'Bulk content updates and migrations'
                    },
                    {
                        key: 'slug_updates',
                        label: 'Slug Updates',
                        description: 'Content URL slug modifications'
                    }
                ]
            }
        ];
    }

    renderCategory(category) {
        const categoryPrefs = this.preferences[category.id];
        const enabledCount = Object.values(categoryPrefs).filter(Boolean).length;
        const totalCount = Object.keys(categoryPrefs).length;

        return `
            <div class="preference-category" data-category="${category.id}">
                <div class="category-header">
                    <div class="category-info">
                        <div class="category-title">
                            <i data-feather="${category.icon}" style="color: ${category.color};"></i>
                            <span>${category.title}</span>
                            ${category.recommended ? '<span class="category-badge recommended">Recommended</span>' : ''}
                        </div>
                        <p class="category-description">${category.description}</p>
                        <div class="category-stats">
                            <span class="enabled-count">${enabledCount}/${totalCount} enabled</span>
                        </div>
                    </div>
                    <div class="category-actions">
                        <button class="quick-toggle-btn ${enabledCount === totalCount ? 'btn-danger' : 'btn-success'}" 
                                data-category="${category.id}" 
                                data-enabled="${enabledCount === totalCount}"
                                title="${enabledCount === totalCount ? 'Disable All' : 'Enable All'}">
                            <i data-feather="${enabledCount === totalCount ? 'toggle-right' : 'toggle-left'}"></i>
                            <span class="d-none d-md-inline">${enabledCount === totalCount ? 'Disable All' : 'Enable All'}</span>
                        </button>
                    </div>
                </div>
                
                <div class="category-items">
                    ${category.items.map(item => this.renderPreferenceItem(item, categoryPrefs[item.key], category.id)).join('')}
                </div>
            </div>
        `;
    }

    renderPreferenceItem(item, enabled, categoryId) {
        const switchId = `${categoryId}_${item.key}`;

        return `
            <div class="preference-item">
                <div class="preference-info">
                    <div class="preference-label">
                        <label for="${switchId}" class="form-label">
                            ${item.label}
                        </label>
                        ${item.recommended ? '<span class="item-badge recommended">Recommended</span>' : ''}
                    </div>
                    <p class="preference-description">${item.description}</p>
                </div>
                <div class="preference-control">
                    <div class="form-switch">
                        <input class="form-check-input preference-toggle" 
                               type="checkbox" 
                               id="${switchId}"
                               data-category="${categoryId}"
                               data-key="${item.key}"
                               ${enabled ? 'checked' : ''}>
                        <label class="form-check-label" for="${switchId}">
                            <span class="toggle-text">${enabled ? 'On' : 'Off'}</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    attachCategoryEventListeners() {
        // Save button listener
        const saveBtn = document.getElementById('saveEmailPreferences');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.savePreferences();
            });
        }

        // Reset button listener
        const resetBtn = document.getElementById('resetEmailPreferences');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }

        // Quick toggle buttons
        document.querySelectorAll('.quick-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                const enabled = e.currentTarget.dataset.enabled === 'true';
                this.quickToggleCategory(category, !enabled);
            });
        });

        // Individual preference toggles
        document.querySelectorAll('.preference-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.handlePreferenceToggle(e.target);
            });
        });
    }

    handlePreferenceToggle(toggle) {
        const category = toggle.dataset.category;
        const key = toggle.dataset.key;
        const enabled = toggle.checked;

        // Update preferences object
        if (this.preferences[category]) {
            this.preferences[category][key] = enabled;
        }

        // Update toggle text
        const label = toggle.nextElementSibling;
        const toggleText = label?.querySelector('.toggle-text');
        if (toggleText) {
            toggleText.textContent = enabled ? 'On' : 'Off';
        }

        // Update category stats
        this.updateCategoryStats(category);

        // Show unsaved changes indicator
        this.showUnsavedChanges(true);
    }

    quickToggleCategory(categoryId, enable) {
        if (!this.preferences[categoryId]) return;

        // Update all preferences in category
        Object.keys(this.preferences[categoryId]).forEach(key => {
            this.preferences[categoryId][key] = enable;

            // Update UI toggles
            const toggle = document.querySelector(`[data-category="${categoryId}"][data-key="${key}"]`);
            if (toggle) {
                toggle.checked = enable;

                const label = toggle.nextElementSibling;
                const toggleText = label?.querySelector('.toggle-text');
                if (toggleText) {
                    toggleText.textContent = enable ? 'On' : 'Off';
                }
            }
        });

        // Update category quick toggle button
        this.updateCategoryQuickToggle(categoryId);
        this.updateCategoryStats(categoryId);
        this.showUnsavedChanges(true);
    }

    updateCategoryStats(categoryId) {
        const categoryPrefs = this.preferences[categoryId];
        const enabledCount = Object.values(categoryPrefs).filter(Boolean).length;
        const totalCount = Object.keys(categoryPrefs).length;

        const statsElement = document.querySelector(`[data-category="${categoryId}"] .enabled-count`);
        if (statsElement) {
            statsElement.textContent = `${enabledCount}/${totalCount} enabled`;
        }

        this.updateCategoryQuickToggle(categoryId);
    }

    updateCategoryQuickToggle(categoryId) {
        const categoryPrefs = this.preferences[categoryId];
        const enabledCount = Object.values(categoryPrefs).filter(Boolean).length;
        const totalCount = Object.keys(categoryPrefs).length;
        const allEnabled = enabledCount === totalCount;

        const quickToggleBtn = document.querySelector(`[data-category="${categoryId}"].quick-toggle-btn`);
        if (quickToggleBtn) {
            quickToggleBtn.className = `quick-toggle-btn ${allEnabled ? 'btn-danger' : 'btn-success'}`;
            quickToggleBtn.dataset.enabled = allEnabled;
            quickToggleBtn.title = allEnabled ? 'Disable All' : 'Enable All';

            const icon = quickToggleBtn.querySelector('i');
            const text = quickToggleBtn.querySelector('span');

            if (icon) {
                icon.setAttribute('data-feather', allEnabled ? 'toggle-right' : 'toggle-left');
            }

            if (text) {
                text.textContent = allEnabled ? 'Disable All' : 'Enable All';
            }

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    async savePreferences() {
        if (this.isLoading || !this.preferences) return;

        this.isLoading = true;
        this.showSaveLoading(true);

        try {
            const response = await this.makeAuthenticatedRequest('/admin/email-preferences', {
                method: 'PUT',
                body: JSON.stringify({
                    preferences: this.preferences
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.lastUpdated = data.updated_at || new Date().toISOString();

                this.showSuccess('Email preferences saved successfully');
                this.showUnsavedChanges(false);

                // Update footer timestamp
                const infoElement = document.querySelector('.preferences-info span');
                if (infoElement) {
                    infoElement.textContent = `Last updated: ${new Date(this.lastUpdated).toLocaleString()}`;
                }

                // Add saved animation to preference items
                document.querySelectorAll('.preference-item').forEach(item => {
                    item.classList.add('saved');
                    setTimeout(() => item.classList.remove('saved'), 600);
                });

            } else {
                throw new Error(`Failed to save preferences: ${response.status}`);
            }

        } catch (error) {
            console.error('Error saving email preferences:', error);
            this.showError('Failed to save email preferences');

        } finally {
            this.isLoading = false;
            this.showSaveLoading(false);
        }
    }

    resetToDefaults() {
        if (confirm('Are you sure you want to reset all email preferences to default values?')) {
            this.preferences = this.getDefaultPreferences();
            this.renderPreferences();
            this.showUnsavedChanges(true);
            this.showSuccess('Preferences reset to defaults');
        }
    }

    showUnsavedChanges(show) {
        const statusElement = document.getElementById('preferencesStatus');
        if (statusElement) {
            if (show) {
                statusElement.innerHTML = '<i data-feather="alert-circle"></i> <span>Unsaved changes</span>';
                statusElement.className = 'preferences-status unsaved';
            } else {
                statusElement.innerHTML = '<i data-feather="check-circle"></i> <span>Saved</span>';
                statusElement.className = 'preferences-status saved';

                // Hide success message after 3 seconds
                setTimeout(() => {
                    statusElement.innerHTML = '';
                    statusElement.className = 'preferences-status';
                }, 3000);
            }

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    showLoading(show) {
        const container = document.getElementById('emailPreferencesContent');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="preferences-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading email preferences...</p>
                </div>
            `;
        }
    }

    showSaveLoading(show) {
        const saveBtn = document.getElementById('saveEmailPreferences');
        if (!saveBtn) return;

        if (show) {
            saveBtn.disabled = true;
            saveBtn.classList.add('loading');
            saveBtn.innerHTML = '<i data-feather="loader" class="spinning"></i> <span class="d-none d-sm-inline">Saving...</span>';
        } else {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
            saveBtn.innerHTML = '<i data-feather="save"></i> <span class="d-none d-sm-inline">Save Changes</span>';
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async makeAuthenticatedRequest(endpoint, options = {}) {
        const token = localStorage.getItem('cinebrain-token');

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        const response = await fetch(`${this.apiBase}${endpoint}`, mergedOptions);

        if (response.status === 401) {
            localStorage.removeItem('cinebrain-token');
            localStorage.removeItem('cinebrain-user');
            window.location.href = '/auth/login.html';
            throw new Error('Authentication failed');
        }

        return response;
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Use existing notification system from dashboard
        if (window.adminDashboard && window.adminDashboard.showToast) {
            window.adminDashboard.showToast(message, type);
        } else if (window.topbar && window.topbar.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            // Fallback toast
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    destroy() {
        this.initialized = false;
        this.preferences = null;
        console.log('🗑 Email preferences destroyed');
    }
}

// Global instance for dashboard integration
window.EmailPreferences = EmailPreferences;

// Initialize after DOM is ready and dashboard is available
document.addEventListener('DOMContentLoaded', () => {
    // Wait for dashboard to be ready
    const initializeEmailPrefs = () => {
        if (window.adminDashboard) {
            window.emailPreferencesInstance = new EmailPreferences();
            console.log('✅ Email Preferences instance created');
        } else {
            // Retry after a short delay
            setTimeout(initializeEmailPrefs, 500);
        }
    };

    // Start initialization
    setTimeout(initializeEmailPrefs, 1000);
});