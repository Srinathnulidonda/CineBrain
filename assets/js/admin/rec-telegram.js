class RecTelegram {
    constructor(recommendationsManager) {
        this.manager = recommendationsManager;
        this.initializeContentElements();
        this.setupContentEventListeners();

        console.log('✅ RecTelegram content module initialized');
    }

    initializeContentElements() {
        this.elements = {
            contentSearchInput: document.getElementById('contentSearchInput'),
            searchSource: document.getElementById('searchSource'),
            searchType: document.getElementById('searchType'),
            performSearch: document.getElementById('performSearch'),
            searchResultsGrid: document.getElementById('searchResultsGrid'),
            searchResultsContainer: document.getElementById('searchResultsContainer'),
            searchPagination: document.getElementById('searchPagination'),
            resultsCount: document.getElementById('resultsCount'),
            recommendationsListContainer: document.getElementById('recommendationsListContainer'),
            recommendationsFilter: document.getElementById('recommendationsFilter'),
            upcomingGrid: document.getElementById('savedContentGrid'),
            upcomingFilter: document.getElementById('savedContentFilter'),
            upcomingSearch: document.getElementById('savedContentSearch'),
            createRecommendationBtn: document.getElementById('createRecommendationBtn'),
            refreshRecommendations: document.getElementById('refreshRecommendations'),
            refreshUpcoming: document.getElementById('refreshSavedContent')
        };
    }

    setupContentEventListeners() {
        this.elements.contentSearchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performContentSearch();
            }
        });

        this.elements.performSearch?.addEventListener('click', () => {
            this.performContentSearch();
        });

        this.elements.contentSearchInput?.addEventListener('input',
            this.manager.debounce(() => {
                if (this.elements.contentSearchInput.value.length >= 3) {
                    this.performContentSearch();
                }
            }, 500)
        );

        this.elements.searchSource?.addEventListener('change', () => {
            if (this.manager.state.searchQuery) {
                this.performContentSearch();
            }
        });

        this.elements.searchType?.addEventListener('change', () => {
            if (this.manager.state.searchQuery) {
                this.performContentSearch();
            }
        });

        this.elements.recommendationsFilter?.addEventListener('change', () => {
            this.manager.state.filters.recommendations = this.elements.recommendationsFilter.value;
            this.manager.loadRecommendations();
        });

        this.elements.upcomingFilter?.addEventListener('change', () => {
            this.manager.state.filters.upcoming = this.elements.upcomingFilter.value;
            this.manager.loadUpcomingRecommendations();
        });

        this.elements.upcomingSearch?.addEventListener('input',
            this.manager.debounce(() => {
                this.manager.loadUpcomingRecommendations();
            }, 300)
        );

        this.elements.createRecommendationBtn?.addEventListener('click', () => {
            this.showCreateRecommendationModal();
        });

        this.elements.refreshRecommendations?.addEventListener('click', () => {
            this.manager.loadRecommendations(true);
        });

        this.elements.refreshUpcoming?.addEventListener('click', () => {
            this.manager.loadUpcomingRecommendations(true);
        });

        const searchClear = document.getElementById('contentSearchClear');
        searchClear?.addEventListener('click', () => {
            this.clearSearch();
        });

        // Content-specific keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        if (this.manager.state.currentTab === 'search' && this.manager.state.searchResults.length > 0) {
                            e.preventDefault();
                            this.saveRecommendation(this.manager.state.searchResults[0].id || this.manager.state.searchResults[0].tmdb_id);
                        }
                        break;
                    case 'n':
                        if (this.manager.state.currentTab === 'recommendations') {
                            e.preventDefault();
                            this.showCreateRecommendationModal();
                        }
                        break;
                }
            }
        });
    }

    async performContentSearch() {
        const query = this.elements.contentSearchInput?.value.trim();
        if (!query || query.length < 2) {
            this.clearSearchResults();
            return;
        }

        const cacheKey = `${query}_${this.elements.searchSource?.value}_${this.manager.state.currentPage}`;
        if (this.manager.cache.searchResults.has(cacheKey)) {
            const cachedData = this.manager.cache.searchResults.get(cacheKey);
            this.manager.state.searchResults = cachedData.results;
            this.manager.state.totalPages = cachedData.totalPages;
            this.renderSearchResults();
            this.updateSearchResultsHeader(cachedData);
            return;
        }

        this.manager.state.searchQuery = query;
        this.manager.state.currentPage = 1;
        this.manager.state.isLoading = true;

        this.showSearchLoading();

        try {
            const source = this.elements.searchSource?.value || 'tmdb';
            const type = this.elements.searchType?.value || 'all';

            const params = new URLSearchParams({
                query: query,
                source: source,
                page: this.manager.state.currentPage
            });

            if (type !== 'all') {
                params.append('type', type);
            }

            const response = await this.manager.makeAuthenticatedRequest(`/admin/search?${params}`);

            if (response.ok) {
                const data = await response.json();
                this.manager.state.searchResults = data.results || [];
                this.manager.state.totalPages = data.total_pages || 1;

                this.manager.cache.searchResults.set(cacheKey, {
                    results: this.manager.state.searchResults,
                    totalPages: this.manager.state.totalPages,
                    totalResults: data.total_results || 0
                });

                this.renderSearchResults();
                this.updateSearchResultsHeader(data);

                const searchClear = document.getElementById('contentSearchClear');
                if (searchClear) {
                    searchClear.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error performing search:', error);
            this.manager.showError('Search failed. Please try again.');
        } finally {
            this.manager.state.isLoading = false;
            this.hideSearchLoading();
        }
    }

    async changePage(newPage) {
        if (newPage < 1 || newPage > this.manager.state.totalPages) {
            return;
        }

        this.manager.state.currentPage = newPage;
        await this.performContentSearch();
    }

    async previewContent(contentId) {
        try {
            const content = this.findContentById(contentId);
            if (!content) {
                this.manager.showError('Content not found');
                return;
            }

            const slug = this.generateSlug(content);
            const detailsUrl = `/explore/details.html?${encodeURIComponent(slug)}`;

            window.open(detailsUrl, '_blank');
            this.manager.showToast('Opening content preview...', 'info');

        } catch (error) {
            console.error('Preview error:', error);
            this.manager.showError('Failed to preview content');
        }
    }

    async saveRecommendation(contentId) {
        try {
            const content = this.findContentById(contentId);
            if (!content) {
                this.manager.showError('Content not found');
                return;
            }

            this.showQuickSaveRecommendationModal(content);

        } catch (error) {
            console.error('Save recommendation error:', error);
            this.manager.showError('Failed to save recommendation');
        }
    }

    async recommendContent(contentId) {
        try {
            const content = this.findContentById(contentId);
            if (!content) {
                this.manager.showError('Content not found');
                return;
            }

            this.manager.state.selectedContent = content;
            this.showCreateRecommendationModal(content);

        } catch (error) {
            console.error('Recommend error:', error);
            this.manager.showError('Failed to open recommendation form');
        }
    }

    async publishRecommendation(recommendationId) {
        try {
            this.manager.showToast('Publishing recommendation...', 'info');

            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}/publish`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                this.manager.showToast('Recommendation published successfully!', 'success');

                if (result.telegram_sent) {
                    this.manager.showToast('Sent to Telegram channel!', 'success');
                }

                this.manager.loadRecommendations(true);
                this.manager.loadUpcomingRecommendations(true);
                this.manager.loadQuickStats();

            } else {
                const error = await response.json();
                throw new Error(error.error || 'Publish failed');
            }
        } catch (error) {
            console.error('Publish recommendation error:', error);
            this.manager.showError('Failed to publish recommendation: ' + error.message);
        }
    }

    async editRecommendation(recommendationId) {
        try {
            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch recommendation details');
            }

            const recommendation = await response.json();
            this.showEditRecommendationModal(recommendation);

        } catch (error) {
            console.error('Edit recommendation error:', error);
            this.manager.showError('Failed to open edit form: ' + error.message);
        }
    }

    async createDraftRecommendation(contentData, recommendationType, description, publishNow = false) {
        try {
            this.manager.showToast('Saving recommendation...', 'info');

            const response = await this.manager.makeAuthenticatedRequest('/admin/recommendations', {
                method: 'POST',
                body: JSON.stringify({
                    content_data: contentData,
                    recommendation_type: recommendationType,
                    description: description,
                    status: publishNow ? 'active' : 'draft',
                    publish_to_telegram: publishNow
                })
            });

            if (response.ok) {
                const result = await response.json();

                if (publishNow) {
                    this.manager.showToast('Recommendation created and published!', 'success');
                    if (result.telegram_sent) {
                        this.manager.showToast('Sent to Telegram channel!', 'success');
                    }
                } else {
                    this.manager.showToast('Recommendation saved as upcoming!', 'success');
                }

                // Immediate real-time refresh
                this.manager.loadRecommendations(true);
                this.manager.loadUpcomingRecommendations(true);
                this.manager.loadQuickStats();
                this.closeQuickSaveRecommendationModal();
                this.closeCreateRecommendationModal();

                this.updateContentCardState(contentData.id || contentData.tmdb_id || contentData.mal_id, 'saved');

            } else {
                const error = await response.json();
                throw new Error(error.error || 'Creation failed');
            }
        } catch (error) {
            console.error('Create recommendation error:', error);
            this.manager.showError('Failed to save recommendation: ' + error.message);
        }
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

            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}/send`, {
                method: 'POST'
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

    renderSearchResults() {
        if (!this.elements.searchResultsGrid) return;

        if (this.manager.state.searchResults.length === 0) {
            if (this.elements.searchResultsContainer) {
                this.elements.searchResultsContainer.classList.remove('active');
                this.elements.searchResultsGrid.innerHTML = this.getEmptyState('search', 'No results found', 'Try different keywords or change search source');
            }
            this.updateTabContainerHeight();
            this.refreshFeatherIcons();
            return;
        }

        this.elements.searchResultsGrid.innerHTML = this.manager.state.searchResults.map(content =>
            this.createContentCard(content, 'search')
        ).join('');

        if (this.manager.state.totalPages > 1) {
            this.renderSearchPagination();
        }

        this.setupLazyLoadingForCards();

        if (this.elements.searchResultsContainer) {
            this.elements.searchResultsContainer.classList.add('active');
            const header = this.elements.searchResultsContainer.querySelector('.search-results-header');
            if (header) {
                header.style.display = 'flex';
            }
        }

        this.updateTabContainerHeight();
        this.refreshFeatherIcons();
    }

    renderSearchPagination() {
        if (!this.elements.searchPagination) return;

        const currentPage = this.manager.state.currentPage;
        const totalPages = this.manager.state.totalPages;

        let paginationHTML = '';

        paginationHTML += `
            <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                    onclick="window.recTelegram.changePage(${currentPage - 1})"
                    ${currentPage === 1 ? 'disabled' : ''}>
                <i data-feather="chevron-left"></i>
            </button>
        `;

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" onclick="window.recTelegram.changePage(1)">1</button>
            `;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="window.recTelegram.changePage(${i})">${i}</button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
            paginationHTML += `
                <button class="pagination-btn" onclick="window.recTelegram.changePage(${totalPages})">${totalPages}</button>
            `;
        }

        paginationHTML += `
            <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="window.recTelegram.changePage(${currentPage + 1})"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                <i data-feather="chevron-right"></i>
            </button>
        `;

        this.elements.searchPagination.innerHTML = paginationHTML;
        this.elements.searchPagination.style.display = 'flex';
        this.refreshFeatherIcons();
    }

    renderRecommendations() {
        if (!this.elements.recommendationsListContainer) return;

        if (this.manager.state.recommendations.length === 0) {
            this.elements.recommendationsListContainer.classList.remove('active');
            this.elements.recommendationsListContainer.innerHTML = this.getEmptyState(
                'star',
                'No active recommendations yet',
                'Create your first recommendation to get started',
                false
            );
            this.updateTabContainerHeight();
            this.refreshFeatherIcons();
            return;
        }

        this.elements.recommendationsListContainer.innerHTML = this.manager.state.recommendations.map(rec =>
            this.createRecommendationItem(rec)
        ).join('');

        this.elements.recommendationsListContainer.classList.add('active');
        this.updateTabContainerHeight();
        this.refreshFeatherIcons();
    }

    renderUpcomingRecommendations() {
        if (!this.elements.upcomingGrid) return;

        if (this.manager.state.upcomingRecommendations.length === 0) {
            this.elements.upcomingGrid.classList.remove('active');
            this.elements.upcomingGrid.innerHTML = this.getEmptyState(
                'clock',
                'No upcoming recommendations',
                'Save recommendations for later publishing',
                false
            );
            this.updateTabContainerHeight();
            this.refreshFeatherIcons();
            return;
        }

        this.elements.upcomingGrid.innerHTML = this.manager.state.upcomingRecommendations.map(rec =>
            this.createUpcomingContentCard(rec)
        ).join('');

        this.elements.upcomingGrid.classList.add('active');
        this.setupLazyLoadingForCards(this.elements.upcomingGrid);
        this.updateTabContainerHeight();
        this.refreshFeatherIcons();
    }

    createContentCard(content, context = 'search') {
        const posterUrl = this.getPosterUrl(content);
        const rating = this.formatRating(content.rating || content.vote_average);
        const year = this.extractYear(content.release_date || content.first_air_date);
        const contentType = content.content_type || content.media_type || 'movie';
        const contentId = content.id || content.tmdb_id || content.mal_id || Date.now();

        return `
            <div class="content-card" data-content-id="${contentId}" data-source="${content.source || 'tmdb'}">
                <div class="content-card-image">
                    <img data-src="${posterUrl}" alt="${this.manager.escapeHtml(content.title || content.name || 'Content')}" loading="lazy">
                    <div class="content-card-type ${contentType}">
                        ${contentType.toUpperCase()}
                    </div>
                    <div class="content-card-rating">
                        <i data-feather="eye"></i> ${rating}
                    </div>
                    <div class="content-card-actions">
                        <button class="content-card-action" onclick="window.recTelegram.previewContent('${contentId}')" 
                                title="Preview">
                            <i data-feather="eye"></i>
                        </button>
                        <button class="content-card-action save-recommend" onclick="window.recTelegram.saveRecommendation('${contentId}')" 
                                title="Save as Upcoming">
                            <i data-feather="bookmark"></i>
                        </button>
                        <button class="content-card-action" onclick="window.recTelegram.recommendContent('${contentId}')" 
                                title="Recommend">
                            <i data-feather="star"></i>
                        </button>
                    </div>
                </div>
                <div class="content-card-body">
                    <h3 class="content-card-title">${this.manager.escapeHtml(content.title || content.name || 'Unknown Title')}</h3>
                    <div class="content-card-meta">
                        ${year ? `<span class="content-card-year">${year}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    createUpcomingContentCard(recommendation) {
        const content = recommendation.content || {};
        const posterUrl = this.getPosterUrl(content);
        const rating = this.formatRating(content.rating || content.vote_average);
        const year = this.extractYear(content.release_date || content.first_air_date);
        const contentType = content.content_type || content.media_type || 'movie';
        const contentId = content.id || content.tmdb_id || content.mal_id || recommendation.id;
        const statusColor = this.getRecommendationStatusColor(recommendation.recommendation_type);

        return `
            <div class="content-card" data-content-id="${contentId}" data-recommendation-id="${recommendation.id}">
                <div class="content-card-image">
                    <img data-src="${posterUrl}" alt="${this.manager.escapeHtml(content.title || content.name || 'Content')}" loading="lazy">
                    <div class="content-card-type" style="background: ${statusColor}">
                        ${this.manager.capitalizeFirst(recommendation.recommendation_type)}
                    </div>
                    <div class="content-card-rating">
                        <i data-feather="star"></i> ${rating}
                    </div>
                    <div class="content-card-actions">
                        <button class="content-card-action" onclick="window.recTelegram.previewContent('${contentId}')" 
                                title="Preview">
                            <i data-feather="eye"></i>
                        </button>
                        <button class="content-card-action" onclick="window.recTelegram.publishRecommendation(${recommendation.id})" 
                                title="Publish Now">
                            <i data-feather="send"></i>
                        </button>
                        <button class="content-card-action" onclick="window.recTelegram.editRecommendation(${recommendation.id})" 
                                title="Edit">
                            <i data-feather="edit"></i>
                        </button>
                    </div>
                </div>
                <div class="content-card-body">
                    <h3 class="content-card-title">${this.manager.escapeHtml(content.title || content.name || 'Unknown Title')}</h3>
                    <div class="content-card-meta">
                        ${year ? `<span class="content-card-year">${year}</span>` : ''}
                        <span class="content-card-status">DRAFT</span>
                    </div>
                </div>
            </div>
        `;
    }

    createRecommendationItem(recommendation) {
        const posterUrl = this.getPosterUrl(recommendation.content);
        const statusColor = this.getRecommendationStatusColor(recommendation.recommendation_type);
        const date = this.manager.formatTimeAgo(recommendation.created_at);
        const isActive = recommendation.is_active !== false;

        return `
            <div class="recommendation-item" style="--recommendation-status-color: ${statusColor}">
                <div class="recommendation-poster">
                    <img src="${posterUrl}" alt="${recommendation.content?.title || 'Content'}" loading="lazy">
                </div>
                <div class="recommendation-content">
                    <div class="recommendation-header">
                        <h3 class="recommendation-title">${recommendation.content?.title || 'Unknown Title'}</h3>
                        <div class="recommendation-type" style="background-color: ${statusColor}">
                            ${this.manager.capitalizeFirst(recommendation.recommendation_type)}
                        </div>
                    </div>
                    <p class="recommendation-description">${recommendation.description || 'No description'}</p>
                    <div class="recommendation-meta">
                        <span class="recommendation-date">${date}</span>
                        <span class="recommendation-status ${isActive ? 'active' : 'inactive'}">${isActive ? 'active' : 'draft'}</span>
                        <div class="recommendation-actions">
                            <button class="recommendation-action" onclick="window.recTelegram.editRecommendation(${recommendation.id})">
                                <i data-feather="edit"></i>
                                Edit
                            </button>
                            <button class="recommendation-action primary" onclick="window.recTelegram.sendToTelegram(${recommendation.id})">
                                <i data-feather="send"></i>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Modal functions
    showQuickSaveRecommendationModal(content) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'quickSaveRecommendationModal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i data-feather="bookmark-plus"></i>
                            Save as Upcoming Recommendation
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="content-preview mb-3">
                            <div class="row">
                                <div class="col-3">
                                    <img src="${this.getPosterUrl(content)}" 
                                         alt="${content.title}" 
                                         class="img-fluid rounded"
                                         style="max-height: 120px; object-fit: cover;">
                                </div>
                                <div class="col-9">
                                    <h6 class="mb-1">${content.title || content.name}</h6>
                                    <p class="text-muted mb-1 small">${content.content_type || 'movie'} • ${this.extractYear(content.release_date || content.first_air_date)}</p>
                                    <p class="small text-truncate">${(content.overview || '').substring(0, 100)}...</p>
                                </div>
                            </div>
                        </div>
                        
                        <form id="quickSaveForm">
                            <div class="mb-3">
                                <label for="quickRecommendationType" class="form-label">Recommendation Type</label>
                                <select class="form-select" id="quickRecommendationType" required>
                                    <option value="">Select type</option>
                                    <option value="featured">Featured Pick</option>
                                    <option value="trending">Trending Now</option>
                                    <option value="hidden_gem">Hidden Gem</option>
                                    <option value="classic">Classic Must-Watch</option>
                                    <option value="new_release">New Release</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="quickDescription" class="form-label">Quick Description</label>
                                <textarea class="form-control" id="quickDescription" 
                                         rows="3" placeholder="Brief description of why you recommend this..."
                                         maxlength="200" required></textarea>
                                <div class="form-text">
                                    <span id="quickDescriptionCount">0</span>/200 characters
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-outline-primary" id="saveAsDraftBtn">
                            <i data-feather="bookmark"></i>
                            Save as Upcoming
                        </button>
                        <button type="button" class="btn btn-primary" id="saveAndPublishBtn">
                            <i data-feather="send"></i>
                            Save & Publish
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('quickSaveForm');
        const descriptionTextarea = document.getElementById('quickDescription');
        const descriptionCount = document.getElementById('quickDescriptionCount');
        const saveAsDraftBtn = document.getElementById('saveAsDraftBtn');
        const saveAndPublishBtn = document.getElementById('saveAndPublishBtn');

        descriptionTextarea.addEventListener('input', () => {
            descriptionCount.textContent = descriptionTextarea.value.length;
        });

        const handleSave = async (publishNow) => {
            if (form.checkValidity()) {
                const recommendationType = document.getElementById('quickRecommendationType').value;
                const description = descriptionTextarea.value;

                const contentData = this.extractContentData(content);
                await this.createDraftRecommendation(contentData, recommendationType, description, publishNow);
            } else {
                form.reportValidity();
            }
        };

        saveAsDraftBtn.addEventListener('click', () => handleSave(false));
        saveAndPublishBtn.addEventListener('click', () => handleSave(true));

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        this.refreshFeatherIcons();
    }

    showCreateRecommendationModal(content = null) {
        const targetContent = content || this.manager.state.selectedContent;
        if (!targetContent) {
            this.manager.showError('No content selected');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'createRecommendationModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i data-feather="star"></i>
                            Create Recommendation
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="content-preview mb-4">
                            <div class="row">
                                <div class="col-3">
                                    <img src="${this.getPosterUrl(targetContent)}" 
                                         alt="${targetContent.title}" 
                                         class="img-fluid rounded">
                                </div>
                                <div class="col-9">
                                    <h6>${targetContent.title || targetContent.name}</h6>
                                    <p class="text-muted mb-2">${targetContent.content_type || 'movie'} • ${this.extractYear(targetContent.release_date || targetContent.first_air_date)}</p>
                                    <p class="small">${(targetContent.overview || '').substring(0, 150)}...</p>
                                </div>
                            </div>
                        </div>
                        
                        <form id="recommendationForm">
                            <div class="mb-3">
                                <label for="recommendationType" class="form-label">Recommendation Type</label>
                                <select class="form-select" id="recommendationType" required>
                                    <option value="">Select type</option>
                                    <option value="featured">Featured Pick</option>
                                    <option value="trending">Trending Now</option>
                                    <option value="hidden_gem">Hidden Gem</option>
                                    <option value="classic">Classic Must-Watch</option>
                                    <option value="new_release">New Release</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="recommendationDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="recommendationDescription" 
                                         rows="4" placeholder="Why do you recommend this content? What makes it special?"
                                         maxlength="500" required></textarea>
                                <div class="form-text">
                                    <span id="descriptionCount">0</span>/500 characters
                                </div>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="sendToTelegramNow">
                                <label class="form-check-label" for="sendToTelegramNow">
                                    Send to Telegram channel immediately
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="createRecommendationSubmit">
                            <i data-feather="plus-circle"></i>
                            Create Recommendation
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('recommendationForm');
        const descriptionTextarea = document.getElementById('recommendationDescription');
        const descriptionCount = document.getElementById('descriptionCount');
        const submitBtn = document.getElementById('createRecommendationSubmit');

        descriptionTextarea.addEventListener('input', () => {
            descriptionCount.textContent = descriptionTextarea.value.length;
        });

        submitBtn.addEventListener('click', async () => {
            if (form.checkValidity()) {
                const recommendationType = document.getElementById('recommendationType').value;
                const description = descriptionTextarea.value;
                const publishNow = document.getElementById('sendToTelegramNow').checked;

                const contentData = this.extractContentData(targetContent);
                await this.createDraftRecommendation(contentData, recommendationType, description, publishNow);
            } else {
                form.reportValidity();
            }
        });

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        this.refreshFeatherIcons();
    }

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
                            Edit Recommendation
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="content-preview mb-4">
                            <div class="row">
                                <div class="col-3">
                                    <img src="${this.getPosterUrl(recommendation.content)}" 
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
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger me-auto" id="deleteRecommendationBtn">
                            <i data-feather="trash"></i>
                            Delete
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
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

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        this.refreshFeatherIcons();
    }

    closeQuickSaveRecommendationModal() {
        const modal = document.getElementById('quickSaveRecommendationModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    closeCreateRecommendationModal() {
        const modal = document.getElementById('createRecommendationModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
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

    // Utility methods
    extractContentData(content) {
        return {
            id: content.id || content.tmdb_id || content.mal_id,
            title: content.title || content.name,
            original_title: content.original_title || content.original_name,
            content_type: content.content_type || content.media_type || 'movie',
            genres: content.genre_ids || content.genres || [],
            languages: content.original_language ? [content.original_language] : ['en'],
            release_date: content.release_date || content.first_air_date,
            runtime: content.runtime,
            rating: content.vote_average || content.rating,
            vote_count: content.vote_count,
            popularity: content.popularity,
            overview: content.overview,
            poster_path: content.poster_path,
            backdrop_path: content.backdrop_path,
            source: content.source || this.elements.searchSource?.value || 'tmdb'
        };
    }

    findContentById(contentId) {
        let content = this.manager.state.searchResults.find(c =>
            (c.id || c.tmdb_id || c.mal_id) == contentId
        );

        if (!content) {
            content = this.manager.state.upcomingRecommendations.find(r => r.content_id == contentId || r.id == contentId)?.content;
        }

        return content;
    }

    generateSlug(content) {
        const title = content.title || content.name || 'unknown';
        const year = this.extractYear(content.release_date || content.first_air_date);

        let slug = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        if (year) {
            slug += `-${year}`;
        }

        return slug;
    }

    updateContentCardState(contentId, state) {
        const card = document.querySelector(`[data-content-id="${contentId}"]`);
        if (card) {
            card.classList.add(`content-${state}`);

            const saveBtn = card.querySelector('[onclick*="saveRecommendation"]');
            if (saveBtn && state === 'saved') {
                saveBtn.innerHTML = '<i data-feather="check"></i>';
                saveBtn.title = 'Saved';
                saveBtn.classList.add('success');
                this.refreshFeatherIcons();
            }
        }
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

    updateSearchResultsHeader(data) {
        if (this.elements.resultsCount) {
            const count = data.total_results || this.manager.state.searchResults.length;
            this.elements.resultsCount.textContent = `${this.manager.formatNumber(count)} results`;
        }

        const resultsSource = document.getElementById('resultsSource');
        if (resultsSource) {
            const source = this.elements.searchSource?.value || 'TMDB';
            resultsSource.textContent = source.toUpperCase();
        }
    }

    setupLazyLoadingForCards(container = null) {
        const targetContainer = container || this.elements.searchResultsGrid;
        const cards = targetContainer?.querySelectorAll('.content-card img[data-src]');
        if (!cards || cards.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const imgSrc = img.dataset.src;

                    if (imgSrc) {
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            img.src = imgSrc;
                            img.classList.add('loaded');
                        };
                        tempImg.onerror = () => {
                            img.src = this.manager.placeholderImage;
                            img.classList.add('loaded');
                        };
                        tempImg.src = imgSrc;
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: this.manager.isMobile ? '50px' : '100px',
            threshold: 0.01
        });

        cards.forEach(img => observer.observe(img));
    }

    showSearchLoading() {
        if (this.elements.searchResultsContainer) {
            this.elements.searchResultsContainer.classList.add('active');

            if (this.elements.searchResultsGrid) {
                this.elements.searchResultsGrid.innerHTML = Array(12).fill(0).map(() => `
                    <div class="skeleton-card">
                        <div class="content-card-image">
                            <div class="skeleton skeleton-poster">
                                <div class="skeleton-shimmer"></div>
                            </div>
                        </div>
                        <div class="content-card-body">
                            <div class="skeleton skeleton-title">
                                <div class="skeleton-shimmer"></div>
                            </div>
                            <div class="skeleton skeleton-meta">
                                <div class="skeleton-shimmer"></div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    hideSearchLoading() {
        // Loading is hidden when results are rendered
    }

    clearSearch() {
        if (this.elements.contentSearchInput) {
            this.elements.contentSearchInput.value = '';
        }
        const searchClear = document.getElementById('contentSearchClear');
        if (searchClear) {
            searchClear.style.display = 'none';
        }
        this.clearSearchResults();
    }

    clearSearchResults() {
        this.manager.state.searchResults = [];
        this.manager.state.searchQuery = '';
        this.manager.state.currentPage = 1;
        this.manager.state.totalPages = 0;

        if (this.elements.searchResultsContainer) {
            this.elements.searchResultsContainer.classList.remove('active');
        }

        if (this.elements.searchPagination) {
            this.elements.searchPagination.style.display = 'none';
        }

        const searchClear = document.getElementById('contentSearchClear');
        if (searchClear) {
            searchClear.style.display = 'none';
        }

        this.updateTabContainerHeight();
    }

    getEmptyState(icon, title, message, collapsed = true) {
        if (collapsed) {
            return `
                <div class="empty-state">
                    <i data-feather="${icon}"></i>
                    <div class="empty-state-title">${title}</div>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <i data-feather="${icon}"></i>
                    <div class="empty-state-title">${title}</div>
                    <div class="empty-state-message">${message}</div>
                </div>
            `;
        }
    }

    getPosterUrl(content) {
        if (!content) return this.manager.placeholderImage;

        if (content.poster_path) {
            if (content.poster_path.startsWith('http')) {
                return content.poster_path;
            } else {
                return `https://image.tmdb.org/t/p/w500${content.poster_path}`;
            }
        }

        return this.manager.placeholderImage;
    }

    getRecommendationStatusColor(status) {
        const colors = {
            'featured': '#e50914',
            'trending': '#113CCF',
            'hidden_gem': '#10b981',
            'classic': '#f59e0b',
            'new_release': '#8b5cf6'
        };
        return colors[status] || '#6b7280';
    }

    formatRating(rating) {
        if (!rating || rating === 0) return 'N/A';
        return Number(rating).toFixed(1);
    }

    extractYear(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).getFullYear();
        } catch {
            return '';
        }
    }

    // Helper function to refresh Feather icons
    refreshFeatherIcons() {
        setTimeout(() => {
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }, 100);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    recommendationsManager = new AdminRecommendations();

    // Initialize RecTelegram after core manager is ready
    setTimeout(() => {
        window.recTelegram = new RecTelegram(recommendationsManager);
    }, 100);
});

// Global cleanup
window.addEventListener('beforeunload', () => {
    if (recommendationsManager) {
        recommendationsManager.destroy();
    }
});

// Expose for global access
window.recommendationsManager = recommendationsManager;