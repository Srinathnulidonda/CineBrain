class RecRecommendations {
    constructor(manager) {
        this.manager = manager;
        this.initializeElements();
        this.setupEventListeners();
        console.log('✅ RecRecommendations module initialized');
    }

    initializeElements() {
        this.elements = {
            recommendationsListContainer: document.getElementById('recommendationsListContainer'),
            recommendationsFilter: document.getElementById('recommendationsFilter'),
            refreshRecommendations: document.getElementById('refreshRecommendations'),
            bulkActionsBtn: document.getElementById('bulkActionsBtn'),
            analyticsMetrics: document.getElementById('analyticsMetrics')
        };
    }

    setupEventListeners() {
        this.elements.recommendationsFilter?.addEventListener('change', () => {
            this.manager.state.filters.recommendations = this.elements.recommendationsFilter.value;
            this.manager.loadRecommendations();
        });

        this.elements.refreshRecommendations?.addEventListener('click', () => {
            this.manager.loadRecommendations(true);
        });

        this.elements.bulkActionsBtn?.addEventListener('click', () => {
            this.showBulkActionsModal();
        });
    }

    renderRecommendations() {
        if (!this.elements.recommendationsListContainer) return;

        if (this.manager.state.recommendations.length === 0) {
            this.elements.recommendationsListContainer.classList.remove('active');
            this.elements.recommendationsListContainer.innerHTML = window.recUtils.getEmptyState(
                'star',
                'No active recommendations yet',
                'Create your first recommendation to get started',
                false
            );
            this.updateTabContainerHeight();
            window.recUtils.refreshFeatherIcons();
            return;
        }

        this.elements.recommendationsListContainer.innerHTML = this.manager.state.recommendations.map(rec =>
            this.createRecommendationItem(rec)
        ).join('');

        this.elements.recommendationsListContainer.classList.add('active');
        this.updateTabContainerHeight();
        window.recUtils.refreshFeatherIcons();
    }

    createRecommendationItem(recommendation) {
        const posterUrl = window.recUtils.getPosterUrl(recommendation.content);
        const statusColor = this.getRecommendationStatusColor(recommendation.recommendation_type);
        const date = this.manager.formatTimeAgo(recommendation.created_at);
        const isActive = recommendation.is_active !== false;

        // NEW: Check if recommendation has template data
        const hasTemplateData = recommendation.template_data && recommendation.template_data.selected_template;
        const templateIndicator = hasTemplateData ?
            `<span class="template-indicator" title="Created with ${recommendation.template_data.selected_template} template">📝</span>` : '';

        return `
            <div class="recommendation-item" style="--recommendation-status-color: ${statusColor}">
                <div class="recommendation-poster">
                    <img src="${posterUrl}" alt="${recommendation.content?.title || 'Content'}" loading="lazy">
                </div>
                <div class="recommendation-content">
                    <div class="recommendation-header">
                        <h3 class="recommendation-title">
                            ${recommendation.content?.title || 'Unknown Title'}
                            ${templateIndicator}
                        </h3>
                        <div class="recommendation-type" style="background-color: ${statusColor}">
                            ${this.manager.capitalizeFirst(recommendation.recommendation_type)}
                        </div>
                    </div>
                    <p class="recommendation-description">${recommendation.description || 'No description'}</p>
                    <div class="recommendation-meta">
                        <span class="recommendation-date">${date}</span>
                        <span class="recommendation-status ${isActive ? 'active' : 'inactive'}">${isActive ? 'active' : 'draft'}</span>
                        ${hasTemplateData ? '<span class="template-badge">Template</span>' : ''}
                        <div class="recommendation-actions">
                            <button class="recommendation-action" onclick="window.recRecommendations.editRecommendation(${recommendation.id})">
                                <i data-feather="edit"></i>
                                ${hasTemplateData ? 'Enhanced Edit' : 'Edit'}
                            </button>
                            <button class="recommendation-action primary" onclick="window.recRecommendations.sendToTelegram(${recommendation.id})">
                                <i data-feather="send"></i>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async editRecommendation(recommendationId) {
        try {
            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch recommendation details');
            }

            const recommendation = await response.json();

            // Use enhanced template modal for editing (same as upcoming)
            if (window.recUpcoming) {
                window.recUpcoming.showEnhancedEditModal(recommendation);
            } else {
                // Fallback to simple modal if recUpcoming not available
                this.showEditRecommendationModal(recommendation);
            }

        } catch (error) {
            console.error('Edit recommendation error:', error);
            this.manager.showError('Failed to open edit form: ' + error.message);
        }
    }

    // Keep the old modal as fallback but update it to be more consistent
    showEditRecommendationModal(recommendation) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'editRecommendationModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i data-feather="edit"></i>
                            Edit Recommendation (Simple)
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i data-feather="info"></i>
                            For advanced template editing, please use the enhanced edit from the drafts section.
                        </div>
                        
                        <div class="content-preview mb-4">
                            <div class="row">
                                <div class="col-3">
                                    <img src="${window.recUtils.getPosterUrl(recommendation.content)}" 
                                         alt="${recommendation.content?.title}" 
                                         class="img-fluid rounded">
                                </div>
                                <div class="col-9">
                                    <h6>${recommendation.content?.title || 'Unknown Title'}</h6>
                                    <p class="text-muted mb-2">${recommendation.content?.content_type || 'movie'}</p>
                                    <p class="small">${(recommendation.content?.overview || '').substring(0, 150)}...</p>
                                </div>
                            </div>
                        </div>
                        
                        <form id="editRecommendationForm">
                            <div class="mb-3">
                                <label for="editRecommendationType" class="form-label">Recommendation Type</label>
                                <select class="form-select" id="editRecommendationType" required>
                                    <option value="featured" ${recommendation.recommendation_type === 'featured' ? 'selected' : ''}>Featured Pick</option>
                                    <option value="trending" ${recommendation.recommendation_type === 'trending' ? 'selected' : ''}>Trending Now</option>
                                    <option value="hidden_gem" ${recommendation.recommendation_type === 'hidden_gem' ? 'selected' : ''}>Hidden Gem</option>
                                    <option value="classic" ${recommendation.recommendation_type === 'classic' ? 'selected' : ''}>Classic Must-Watch</option>
                                    <option value="new_release" ${recommendation.recommendation_type === 'new_release' ? 'selected' : ''}>New Release</option>
                                    <option value="mind_bending" ${recommendation.recommendation_type === 'mind_bending' ? 'selected' : ''}>Mind-Bending</option>
                                    <option value="anime_gem" ${recommendation.recommendation_type === 'anime_gem' ? 'selected' : ''}>Anime Gem</option>
                                    <option value="scene_clip" ${recommendation.recommendation_type === 'scene_clip' ? 'selected' : ''}>Scene Clip</option>
                                    <option value="top_list" ${recommendation.recommendation_type === 'top_list' ? 'selected' : ''}>Top List</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="editRecommendationDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="editRecommendationDescription" 
                                         rows="4" placeholder="Why do you recommend this content?"
                                         maxlength="500" required>${recommendation.description || ''}</textarea>
                                <div class="form-text">
                                    <span id="editDescriptionCount">${(recommendation.description || '').length}</span>/500 characters
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="recommendationStatus" class="form-label">Status</label>
                                <select class="form-select" id="recommendationStatus">
                                    <option value="true" ${recommendation.is_active ? 'selected' : ''}>Active</option>
                                    <option value="false" ${!recommendation.is_active ? 'selected' : ''}>Draft</option>
                                </select>
                            </div>

                            <!-- Show template data if available -->
                            ${recommendation.template_data ? `
                            <div class="mb-3">
                                <div class="alert alert-warning">
                                    <i data-feather="layout"></i>
                                    <strong>Template Data Available:</strong> This recommendation was created with template "${recommendation.template_data.selected_template}". 
                                    Use enhanced edit to modify template fields.
                                </div>
                            </div>
                            ` : ''}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger me-auto" id="deleteRecommendationBtn">
                            <i data-feather="trash"></i>
                            Delete
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-outline-primary" id="switchToEnhancedEditBtn">
                            <i data-feather="layout"></i>
                            Enhanced Edit
                        </button>
                        <button type="button" class="btn btn-primary" id="updateRecommendationSubmit">
                            <i data-feather="check-circle"></i>
                            Update Recommendation
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('editRecommendationForm');
        const descriptionTextarea = document.getElementById('editRecommendationDescription');
        const descriptionCount = document.getElementById('editDescriptionCount');
        const submitBtn = document.getElementById('updateRecommendationSubmit');
        const deleteBtn = document.getElementById('deleteRecommendationBtn');
        const switchToEnhancedBtn = document.getElementById('switchToEnhancedEditBtn');

        descriptionTextarea.addEventListener('input', () => {
            descriptionCount.textContent = descriptionTextarea.value.length;
        });

        submitBtn.addEventListener('click', async () => {
            if (form.checkValidity()) {
                const recommendationType = document.getElementById('editRecommendationType').value;
                const description = descriptionTextarea.value;
                const isActive = document.getElementById('recommendationStatus').value === 'true';

                await this.updateRecommendation(recommendation.id, {
                    recommendation_type: recommendationType,
                    description: description,
                    is_active: isActive
                });
            } else {
                form.reportValidity();
            }
        });

        deleteBtn.addEventListener('click', async () => {
            await this.deleteRecommendation(recommendation.id);
        });

        // NEW: Switch to enhanced edit button
        switchToEnhancedBtn.addEventListener('click', () => {
            // Close current modal
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }

            // Open enhanced modal
            setTimeout(() => {
                if (window.recUpcoming) {
                    window.recUpcoming.showEnhancedEditModal(recommendation);
                }
            }, 300);
        });

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        window.recUtils.refreshFeatherIcons();
    }

    async updateRecommendation(recommendationId, data) {
        try {
            this.manager.showToast('Updating recommendation...', 'info');

            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.manager.showToast('Recommendation updated successfully!', 'success');
                this.manager.loadRecommendations(true);
                this.manager.loadUpcomingRecommendations(true);
                this.closeEditRecommendationModal();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Update failed');
            }
        } catch (error) {
            console.error('Update recommendation error:', error);
            this.manager.showError('Failed to update recommendation: ' + error.message);
        }
    }

    async deleteRecommendation(recommendationId) {
        try {
            if (!confirm('Are you sure you want to delete this recommendation? This action cannot be undone.')) {
                return;
            }

            this.manager.showToast('Deleting recommendation...', 'info');

            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.manager.showToast('Recommendation deleted successfully!', 'success');
                this.manager.loadRecommendations(true);
                this.manager.loadUpcomingRecommendations(true);
                this.manager.loadQuickStats();
                this.closeEditRecommendationModal();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete recommendation error:', error);
            this.manager.showError('Failed to delete recommendation: ' + error.message);
        }
    }

    async sendToTelegram(recommendationId) {
        try {
            this.manager.showToast('Sending to Telegram...', 'info');

            // Get recommendation to check for template data
            const recommendation = this.manager.state.recommendations.find(rec => rec.id === recommendationId);

            let publishData = { template_type: 'auto' };

            // If recommendation has template data, use it
            if (recommendation?.template_data) {
                publishData = {
                    template_type: recommendation.template_data.selected_template || 'auto',
                    template_params: recommendation.template_data.template_fields || {}
                };
            }

            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}/send`, {
                method: 'POST',
                body: JSON.stringify(publishData)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.telegram_sent) {
                    this.manager.showToast('Successfully sent to Telegram channel!', 'success');
                } else {
                    this.manager.showToast('Telegram is not configured', 'warning');
                }
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Send failed');
            }
        } catch (error) {
            console.error('Send to Telegram error:', error);
            this.manager.showError('Failed to send to Telegram: ' + error.message);
        }
    }

    showBulkActionsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'bulkActionsModal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i data-feather="send"></i>
                            Bulk Send Actions
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Select an action to perform on all active recommendations:</p>
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary" id="bulkSendToTelegram">
                                <i data-feather="send"></i>
                                Send All to Telegram
                            </button>
                            <button class="btn btn-outline-secondary" id="bulkExport">
                                <i data-feather="download"></i>
                                Export as CSV
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('bulkSendToTelegram').addEventListener('click', async () => {
            await this.bulkSendToTelegram();
        });

        document.getElementById('bulkExport').addEventListener('click', async () => {
            await this.exportRecommendations();
        });

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        window.recUtils.refreshFeatherIcons();
    }

    async bulkSendToTelegram() {
        try {
            if (!confirm('Are you sure you want to send all active recommendations to Telegram?')) {
                return;
            }

            this.manager.showToast('Sending all recommendations to Telegram...', 'info');

            const promises = this.manager.state.recommendations.map(rec =>
                this.sendToTelegram(rec.id)
            );

            await Promise.allSettled(promises);
            this.manager.showToast('Bulk send completed!', 'success');

        } catch (error) {
            console.error('Bulk send error:', error);
            this.manager.showError('Failed to send all recommendations');
        }
    }

    async exportRecommendations() {
        try {
            const csvContent = this.generateCSV(this.manager.state.recommendations);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `recommendations_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();

            window.URL.revokeObjectURL(url);
            this.manager.showToast('Recommendations exported!', 'success');

        } catch (error) {
            console.error('Export error:', error);
            this.manager.showError('Failed to export recommendations');
        }
    }

    generateCSV(recommendations) {
        const headers = ['Title', 'Type', 'Content Type', 'Description', 'Status', 'Created Date', 'Template'];
        const rows = recommendations.map(rec => [
            rec.content?.title || 'Unknown',
            rec.recommendation_type,
            rec.content?.content_type || 'movie',
            (rec.description || '').replace(/"/g, '""'),
            rec.is_active ? 'Active' : 'Draft',
            new Date(rec.created_at).toLocaleDateString(),
            rec.template_data?.selected_template || 'Manual'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    renderAnalytics(data = {}) {
        if (!this.elements.analyticsMetrics) return;

        const userAnalytics = data.user_analytics || {};
        const contentAnalytics = data.content_analytics || {};
        const interactionAnalytics = data.interaction_analytics || {};

        const metrics = [
            {
                label: 'Total Users',
                value: this.formatNumber(userAnalytics.total_users || 0),
                change: '+12.5%',
                color: '#113CCF'
            },
            {
                label: 'Total Content',
                value: this.formatNumber(contentAnalytics.total_content || 0),
                change: '+8.3%',
                color: '#10b981'
            },
            {
                label: 'Total Interactions',
                value: this.formatNumber(interactionAnalytics.total_interactions || 0),
                change: '+15.2%',
                color: '#f59e0b'
            },
            {
                label: 'Active Today',
                value: this.formatNumber(userAnalytics.active_today || 0),
                change: 'Online now',
                color: '#e50914'
            }
        ];

        this.elements.analyticsMetrics.innerHTML = metrics.map(metric => `
            <div class="analytics-metric-card" style="--metric-color: ${metric.color}">
                <div class="analytics-metric-value">${metric.value}</div>
                <div class="analytics-metric-label">${metric.label}</div>
                <div class="analytics-metric-change">${metric.change}</div>
            </div>
        `).join('');

        window.recUtils.refreshFeatherIcons();
    }

    formatNumber(num) {
        if (!num || num === 0) return '0';
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(this.manager.isMobile ? 0 : 1)}K`;
        }
        return num.toString();
    }

    closeEditRecommendationModal() {
        const modal = document.getElementById('editRecommendationModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    getRecommendationStatusColor(status) {
        const colors = {
            'featured': '#e50914',
            'trending': '#113CCF',
            'hidden_gem': '#10b981',
            'classic': '#f59e0b',
            'new_release': '#8b5cf6',
            'mind_bending': '#6366f1',
            'anime_gem': '#ff6b35',
            'scene_clip': '#ec4899',
            'top_list': '#84cc16'
        };
        return colors[status] || '#6b7280';
    }

    updateTabContainerHeight() {
        const contentTabs = document.querySelector('.content-tabs');
        const activeTabPane = document.querySelector('.tab-pane.active');

        if (contentTabs && activeTabPane) {
            const hasExpandedContent = activeTabPane.querySelector('.active');

            if (hasExpandedContent) {
                contentTabs.classList.add('has-expanded-content');
            } else {
                contentTabs.classList.remove('has-expanded-content');
            }
        }
    }

    // Add method to show enhanced edit if recUpcoming is not available
    showEnhancedEdit(recommendation) {
        if (window.recUpcoming) {
            window.recUpcoming.showEnhancedEditModal(recommendation);
        } else {
            this.manager.showError('Enhanced edit not available. Please refresh the page.');
        }
    }

    refreshFeatherIcons() {
        window.recUtils.refreshFeatherIcons();
    }
}

// Initialize and expose globally
window.recRecommendations = null;