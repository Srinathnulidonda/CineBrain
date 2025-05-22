class TemplateManager {
    constructor(recTelegram) {
        this.recTelegram = recTelegram;
        this.availableTemplates = {};
        this.templatePrompts = {};
        this.selectedTemplate = null;
        this.templateFields = {};
        this.templateData = {};
        this.listItems = [];
    }

    async loadTemplateData() {
        try {
            const templatesResponse = await this.recTelegram.manager.makeAuthenticatedRequest('/admin/telegram/templates');
            if (templatesResponse.ok) {
                const templatesData = await templatesResponse.json();
                this.availableTemplates = templatesData.templates || {};
            }

            const promptsResponse = await this.recTelegram.manager.makeAuthenticatedRequest('/admin/telegram/templates/prompts');
            if (promptsResponse.ok) {
                const promptsData = await promptsResponse.json();
                this.templatePrompts = promptsData.prompts || {};
                this.templateFields = promptsData.available_templates || {};
            }
        } catch (error) {
            console.error('Error loading template data:', error);
        }
    }

    renderTemplateSelection(container) {
        const templateIcons = {
            'standard_movie': '🎬',
            'standard_tv': '📺',
            'standard_anime': '🎌',
            'mind_bending': '🧠',
            'hidden_gem': '💎',
            'anime_gem': '🎌',
            'top_list': '📝',
            'scene_clip': '🎥'
        };

        const popularTemplates = ['mind_bending'];

        const templateCards = Object.entries(this.availableTemplates).map(([key, name]) => {
            const isPopular = popularTemplates.includes(key);

            return `
            <div class="template-card" data-template="${key}" onclick="templateManager.selectTemplate('${key}')">
                <span class="template-card-icon">${templateIcons[key] || '📝'}</span>
                <p class="template-card-title">${name.replace('Standard ', '').replace('Template', '')}</p>
                ${isPopular ? '<span class="template-feature">Popular</span>' : ''}
            </div>
        `;
        }).join('');

        container.innerHTML = templateCards;
        this.recTelegram.refreshFeatherIcons();
    }

    selectTemplate(templateKey) {
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });

        const selectedCard = document.querySelector(`[data-template="${templateKey}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        this.selectedTemplate = templateKey;
        this.showTemplateGuidance();
        this.renderTemplateFields();
    }

    showTemplateGuidance() {
        const guidanceContainer = document.getElementById('templateGuidance');
        const guidanceContent = document.getElementById('guidanceContent');
        const guidanceCard = guidanceContainer?.querySelector('.guidance-card');

        if (!guidanceContainer || !guidanceContent || !this.selectedTemplate) return;

        const promptInfo = this.templatePrompts[this.selectedTemplate] || {};
        const templateName = this.availableTemplates[this.selectedTemplate] || 'Template';

        const displayName = templateName.replace('Standard ', '').replace(' Template', '');

        if (guidanceCard) {
            guidanceCard.classList.add('fade-out');

            setTimeout(() => {
                guidanceContent.innerHTML = `
                <strong>${displayName}:</strong> ${promptInfo.purpose || 'General recommendation template for content curation.'}
            `;

                guidanceCard.classList.remove('fade-out');
                guidanceCard.classList.add('fade-in');
                guidanceContainer.style.display = 'block';

                setTimeout(() => {
                    guidanceCard.classList.remove('fade-in');
                }, 300);
            }, 100);
        }
    }

    renderTemplateFields() {
        const fieldsContainer = document.getElementById('templateFieldsContainer');
        if (!fieldsContainer) return;

        fieldsContainer.innerHTML = '';
        this.templateData = {};

        if (!this.selectedTemplate) {
            fieldsContainer.style.display = 'none';
            return;
        }

        const templateFieldConfig = this.getTemplateFieldConfig(this.selectedTemplate);
        if (!templateFieldConfig || templateFieldConfig.length === 0) {
            fieldsContainer.style.display = 'none';
            return;
        }

        fieldsContainer.style.display = 'block';

        const fieldsHTML = templateFieldConfig.map(field => {
            return this.createFieldHTML(field);
        }).join('');

        fieldsContainer.innerHTML = fieldsHTML;

        this.setupFieldEventListeners();
        this.recTelegram.refreshFeatherIcons();
    }

    getTemplateFieldConfig(templateType) {
        const fieldConfigs = {
            'mind_bending': [
                {
                    key: 'overview',
                    label: 'Custom Overview',
                    type: 'textarea',
                    required: false,
                    placeholder: 'Write a mysterious 2-3 sentence overview that raises questions...',
                    description: '2-3 sentences, mysterious, never spoil twists',
                    maxLength: 250
                },
                {
                    key: 'if_you_like',
                    label: 'If You Like',
                    type: 'text',
                    required: false,
                    placeholder: 'Inception, Dark, Predestination, The Matrix',
                    description: '2-4 similar brain-breaking movies (comma separated)',
                    maxLength: 150
                }
            ],
            'hidden_gem': [
                {
                    key: 'hook',
                    label: 'Hook Text',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Why nobody talks about this masterpiece...',
                    description: '1-2 lines with "why nobody talks about this" feel',
                    maxLength: 120
                },
                {
                    key: 'if_you_like',
                    label: 'If You Like',
                    type: 'text',
                    required: false,
                    placeholder: 'Similar hidden gems or mainstream movies...',
                    description: '2-3 movies with similar tone (comma separated)',
                    maxLength: 100
                }
            ],
            'anime_gem': [
                {
                    key: 'overview',
                    label: 'Emotional Core',
                    type: 'textarea',
                    required: false,
                    placeholder: 'Focus on emotional and philosophical themes...',
                    description: '2-3 lines about emotional/philosophical core, themes not plot',
                    maxLength: 200
                },
                {
                    key: 'emotion_hook',
                    label: 'Emotion Hook',
                    type: 'text',
                    required: true,
                    placeholder: 'A time-loop tragedy that hits harder the more you think about it',
                    description: '1 strong emotional line that captures the impact',
                    maxLength: 80
                }
            ],
            'scene_clip': [
                {
                    key: 'caption',
                    label: 'Scene Caption',
                    type: 'text',
                    required: true,
                    placeholder: 'This scene will hook you instantly',
                    description: 'Punchy line creating curiosity about the clip',
                    maxLength: 60
                }
            ],
            'top_list': [
                {
                    key: 'list_title',
                    label: 'List Title',
                    type: 'text',
                    required: true,
                    placeholder: 'Top 5 Mind-Bending Sci-Fi Gems',
                    description: 'Catchy and niche-based list title',
                    maxLength: 80
                },
                {
                    key: 'items',
                    label: 'List Items',
                    type: 'list',
                    required: true,
                    description: '5-10 items MAX with title, year, and hook',
                    maxItems: 10
                }
            ]
        };

        return fieldConfigs[templateType] || [];
    }

    createFieldHTML(field) {
        const isRequired = field.required ? 'required' : '';
        const requiredLabel = field.required ? '<span class="template-field-required">*</span>' : '';

        if (field.type === 'list') {
            return this.createListFieldHTML(field);
        }

        if (field.type === 'textarea') {
            return `
                <div class="template-field-group">
                    <label class="template-field-label" for="template_${field.key}">
                        ${field.label} ${requiredLabel}
                    </label>
                    <div class="template-field-description">${field.description}</div>
                    <textarea 
                        class="template-field-input template-field-textarea" 
                        id="template_${field.key}"
                        name="${field.key}"
                        placeholder="${field.placeholder || ''}"
                        maxlength="${field.maxLength || 500}"
                        rows="3"
                        ${isRequired}></textarea>
                    <div class="template-field-character-count">
                        <span></span>
                        <span id="count_${field.key}">0/${field.maxLength || 500}</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="template-field-group">
                <label class="template-field-label" for="template_${field.key}">
                    ${field.label} ${requiredLabel}
                </label>
                <div class="template-field-description">${field.description}</div>
                <input 
                    type="text"
                    class="template-field-input" 
                    id="template_${field.key}"
                    name="${field.key}"
                    placeholder="${field.placeholder || ''}"
                    maxlength="${field.maxLength || 200}"
                    ${isRequired}>
                <div class="template-field-character-count">
                    <span></span>
                    <span id="count_${field.key}">0/${field.maxLength || 200}</span>
                </div>
            </div>
        `;
    }

    createListFieldHTML(field) {
        return `
            <div class="template-field-group">
                <label class="template-field-label">
                    ${field.label} <span class="template-field-required">*</span>
                </label>
                <div class="template-field-description">${field.description}</div>
                <div class="list-items-container" id="listItemsContainer">
                    <div class="list-item">
                        <div class="list-item-number">1.</div>
                        <div class="list-item-inputs">
                            <input type="text" class="list-item-input" placeholder="Movie Title" maxlength="50">
                            <input type="text" class="list-item-input" placeholder="Year" maxlength="4">
                            <input type="text" class="list-item-input" placeholder="Hook (short, punchy)" maxlength="80">
                        </div>
                        <div class="list-item-actions">
                            <button type="button" class="add-list-item-btn" onclick="templateManager.addListItem()">
                                <i data-feather="plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupFieldEventListeners() {
        document.querySelectorAll('.template-field-input').forEach(input => {
            const fieldKey = input.name;
            const countElement = document.getElementById(`count_${fieldKey}`);

            if (countElement) {
                const maxLength = input.maxLength || 200;

                input.addEventListener('input', () => {
                    const currentLength = input.value.length;
                    countElement.textContent = `${currentLength}/${maxLength}`;

                    this.templateData[fieldKey] = input.value;

                    if (currentLength > maxLength * 0.9) {
                        countElement.style.color = '#ef4444';
                    } else {
                        countElement.style.color = '';
                    }
                });
            }
        });
    }

    addListItem() {
        const container = document.getElementById('listItemsContainer');
        if (!container) return;

        const currentItems = container.children.length;
        const maxItems = 10;

        if (currentItems >= maxItems) {
            this.recTelegram.manager.showError(`Maximum ${maxItems} items allowed`);
            return;
        }

        const newItem = document.createElement('div');
        newItem.className = 'list-item';
        newItem.innerHTML = `
            <div class="list-item-number">${currentItems + 1}.</div>
            <div class="list-item-inputs">
                <input type="text" class="list-item-input" placeholder="Movie Title" maxlength="50">
                <input type="text" class="list-item-input" placeholder="Year" maxlength="4">
                <input type="text" class="list-item-input" placeholder="Hook (short, punchy)" maxlength="80">
            </div>
            <div class="list-item-actions">
                <button type="button" class="remove-list-item-btn" onclick="templateManager.removeListItem(this)">
                    <i data-feather="minus"></i>
                </button>
                ${currentItems === 0 ? '<button type="button" class="add-list-item-btn" onclick="templateManager.addListItem()"><i data-feather="plus"></i></button>' : ''}
            </div>
        `;

        container.appendChild(newItem);

        this.updateListItemNumbers();
        this.recTelegram.refreshFeatherIcons();
    }

    removeListItem(button) {
        const container = document.getElementById('listItemsContainer');
        const item = button.closest('.list-item');

        if (container && item && container.children.length > 1) {
            item.remove();
            this.updateListItemNumbers();

            const lastItem = container.lastElementChild;
            const addBtn = lastItem.querySelector('.add-list-item-btn');
            if (!addBtn) {
                const actionsDiv = lastItem.querySelector('.list-item-actions');
                actionsDiv.innerHTML += '<button type="button" class="add-list-item-btn" onclick="templateManager.addListItem()"><i data-feather="plus"></i></button>';
                this.recTelegram.refreshFeatherIcons();
            }
        }
    }

    updateListItemNumbers() {
        const container = document.getElementById('listItemsContainer');
        if (!container) return;

        Array.from(container.children).forEach((item, index) => {
            const numberDiv = item.querySelector('.list-item-number');
            if (numberDiv) {
                numberDiv.textContent = `${index + 1}.`;
            }
        });
    }

    validateTemplateSelection() {
        if (!this.selectedTemplate) {
            return { valid: false, error: 'Please select a template' };
        }

        const fieldConfig = this.getTemplateFieldConfig(this.selectedTemplate);

        for (const field of fieldConfig) {
            if (field.required) {
                if (field.type === 'list') {
                    const items = this.getListItems();
                    if (items.length === 0) {
                        return { valid: false, error: `${field.label} is required` };
                    }
                } else {
                    const input = document.getElementById(`template_${field.key}`);
                    if (!input || !input.value.trim()) {
                        return { valid: false, error: `${field.label} is required` };
                    }
                }
            }
        }

        return { valid: true };
    }

    getTemplateParams() {
        const params = {};

        document.querySelectorAll('.template-field-input').forEach(input => {
            if (input.name && input.value.trim()) {
                params[input.name] = input.value.trim();
            }
        });

        if (this.selectedTemplate === 'top_list') {
            params.items = this.getListItems();
        }

        return params;
    }

    getListItems() {
        const container = document.getElementById('listItemsContainer');
        if (!container) return [];

        const items = [];

        Array.from(container.children).forEach(item => {
            const inputs = item.querySelectorAll('.list-item-input');
            if (inputs.length >= 3) {
                const title = inputs[0].value.trim();
                const year = inputs[1].value.trim();
                const hook = inputs[2].value.trim();

                if (title && year && hook) {
                    items.push([title, year, hook]);
                }
            }
        });

        return items;
    }
}

class RecTelegram {
    constructor(recommendationsManager) {
        this.manager = recommendationsManager;
        this.initializeContentElements();
        this.setupContentEventListeners();
        this.setupCardClickHandlers();

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

    setupCardClickHandlers() {
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.content-card');
            if (card && !e.target.closest('.action-btn')) {
                e.preventDefault();
                this.handleCardClick(card);
            }
        });

        document.addEventListener('keydown', (e) => {
            const card = e.target.closest('.content-card');
            if (card && (e.key === 'Enter' || e.key === ' ') && !e.target.closest('.action-btn')) {
                e.preventDefault();
                this.handleCardClick(card);
            }
        });
    }

    handleCardClick(card) {
        try {
            card.style.transform = 'scale(0.98)';
            card.style.transition = 'transform 0.1s ease';

            setTimeout(() => {
                card.style.transform = '';

                const contentData = this.extractContentDataFromCard(card);
                if (contentData) {
                    this.navigateToContentDetails(contentData);
                } else {
                    this.manager.showError('Unable to open content details');
                }
            }, 100);
        } catch (error) {
            console.error('Card click error:', error);
            this.manager.showError('Navigation failed');
        }
    }

    extractContentDataFromCard(card) {
        try {
            const contentId = card.dataset.contentId;
            const recommendationId = card.dataset.recommendationId;

            let content = null;

            if (recommendationId) {
                const recommendation = this.manager.state.upcomingRecommendations.find(r => r.id == recommendationId);
                content = recommendation?.content;
            } else if (contentId) {
                content = this.manager.state.searchResults.find(c =>
                    (c.id || c.tmdb_id || c.mal_id) == contentId
                );
            }

            if (!content) {
                const titleEl = card.querySelector('.card-title');
                const typeEl = card.querySelector('.content-type-badge');
                const yearEl = card.querySelector('.card-year');
                const posterEl = card.querySelector('.card-poster');
                const ratingEl = card.querySelector('.rating-badge span');

                content = {
                    id: contentId || Date.now(),
                    title: titleEl?.textContent?.trim() || 'Unknown',
                    content_type: typeEl?.textContent?.toLowerCase()?.trim() || 'movie',
                    release_date: yearEl?.textContent ? `${yearEl.textContent}-01-01` : null,
                    poster_path: posterEl?.getAttribute('data-src') || posterEl?.src || '',
                    rating: ratingEl?.textContent && ratingEl.textContent !== 'N/A' ?
                        parseFloat(ratingEl.textContent) : null,
                    tmdb_id: card.dataset.tmdbId ? parseInt(card.dataset.tmdbId) : null
                };
            }

            return content;
        } catch (error) {
            console.error('Error extracting content data from card:', error);
            return null;
        }
    }

    navigateToContentDetails(content) {
        try {
            this.showLoadingIndicator();

            let slug = content.slug;

            if (!slug && content.title) {
                slug = this.generateContentSlug(content);
            }

            if (slug && slug.length >= 2) {
                const cleanSlug = slug.replace(/[^a-z0-9\-]/gi, '').toLowerCase();
                if (cleanSlug.length >= 2) {
                    const targetUrl = `/explore/details.html?${encodeURIComponent(cleanSlug)}`;
                    window.location.href = targetUrl;
                    return;
                }
            }

            if (content.id) {
                const fallbackSlug = `content-${content.id}`;
                window.location.href = `/explore/details.html?${encodeURIComponent(fallbackSlug)}`;
                return;
            }

            if (content.title) {
                const titleSlug = this.generateContentSlug(content);
                if (titleSlug) {
                    window.location.href = `/explore/details.html?${encodeURIComponent(titleSlug)}`;
                    return;
                }
            }

            throw new Error('No valid identifier for navigation');

        } catch (error) {
            console.error('Navigation error:', error);
            this.manager.showError('Unable to open content details');
        } finally {
            this.hideLoadingIndicator();
        }
    }

    generateContentSlug(content) {
        try {
            if (!content.title) return '';

            const { cleanTitle, extractedYear } = this.extractYearFromTitle(content.title);
            const finalTitle = cleanTitle || content.title;

            let year = null;
            if (content.release_date) {
                year = this.extractYear(content.release_date);
            } else if (extractedYear) {
                year = extractedYear;
            }

            let slug = finalTitle.toLowerCase()
                .trim()
                .replace(/[^\w\s\-']/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');

            if (!slug || slug.length < 2) {
                slug = this.manualSlugify(finalTitle);
            }

            const contentType = content.content_type || 'movie';
            if (contentType === 'anime' && !slug.startsWith('anime-')) {
                slug = `anime-${slug}`;
            } else if (contentType === 'tv' && !slug.startsWith('tv-')) {
                slug = `tv-${slug}`;
            } else if (contentType === 'movie' && slug.length < 10) {
                slug = `movie-${slug}`;
            }

            if (year && (contentType === 'movie' || contentType === 'anime') &&
                year >= 1900 && year <= 2030) {
                slug += `-${year}`;
            }

            if (content.tmdb_id && slug.length < 15) {
                slug += `-${content.tmdb_id}`;
            }

            if (slug.length > 120) {
                const parts = slug.substring(0, 117).split('-');
                if (parts.length > 1) {
                    parts.pop();
                    slug = parts.join('-');
                } else {
                    slug = slug.substring(0, 117);
                }
            }

            return slug || `content-${content.tmdb_id || content.id || Date.now()}`;

        } catch (error) {
            console.error('Slug generation error:', error);
            return `content-${content.tmdb_id || content.id || Date.now()}`;
        }
    }

    extractYearFromTitle(title) {
        try {
            const yearPatterns = [
                /\((\d{4})\)$/,
                /\s(\d{4})$/,
                /-(\d{4})$/,
                /\[(\d{4})\]$/
            ];

            for (const pattern of yearPatterns) {
                const match = title.match(pattern);
                if (match) {
                    const year = parseInt(match[1]);
                    if (year >= 1900 && year <= 2030) {
                        const cleanTitle = title.replace(pattern, '').trim();
                        return { cleanTitle, extractedYear: year };
                    }
                }
            }

            return { cleanTitle: title, extractedYear: null };
        } catch (error) {
            console.error('Year extraction error:', error);
            return { cleanTitle: title, extractedYear: null };
        }
    }

    manualSlugify(text) {
        try {
            if (!text) return '';
            return text.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[-\s]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 70);
        } catch (error) {
            return '';
        }
    }

    showLoadingIndicator() {
        const indicator = document.getElementById('page-loading-indicator');
        if (indicator) {
            indicator.style.transform = 'scaleX(1)';
        }
    }

    hideLoadingIndicator() {
        setTimeout(() => {
            const indicator = document.getElementById('page-loading-indicator');
            if (indicator) {
                indicator.style.transform = 'scaleX(0)';
            }
        }, 300);
    }

    setupContentEventListeners() {
        const searchInput = document.getElementById('contentSearchInput');
        const clearButton = document.getElementById('contentSearchClear');

        if (searchInput && clearButton) {
            searchInput.addEventListener('input', function () {
                clearButton.style.display = this.value ? 'flex' : 'none';
            });

            clearButton.addEventListener('click', () => {
                searchInput.value = '';
                searchInput.focus();
                clearButton.style.display = 'none';
                this.clearSearch();
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performContentSearch();
                }
            });
        }

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
            this.showEnhancedCreateRecommendationModal();
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
                            this.showEnhancedCreateRecommendationModal();
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
                    searchClear.style.display = 'flex';
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
            this.showEnhancedCreateRecommendationModal(content);

        } catch (error) {
            console.error('Recommend error:', error);
            this.manager.showError('Failed to open recommendation form');
        }
    }

    async showPublishWithTemplateModal(recommendationId) {
        try {
            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch recommendation details');
            }

            const recommendation = await response.json();
            const content = recommendation.content;

            if (!window.templateManager) {
                window.templateManager = new TemplateManager(this);
                await window.templateManager.loadTemplateData();
            }

            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'publishWithTemplateModal';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i data-feather="send"></i>
                                Publish Recommendation to Telegram
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="content-preview mb-4">
                                <div class="row">
                                    <div class="col-3">
                                        <img src="${this.getPosterUrl(content)}" 
                                             alt="${content.title}" 
                                             class="img-fluid rounded">
                                    </div>
                                    <div class="col-9">
                                        <h6>${content.title || content.name}</h6>
                                        <p class="text-muted mb-2">${content.content_type || 'movie'} • ${this.extractYear(content.release_date || content.first_air_date)}</p>
                                        <p class="small mb-2">${recommendation.recommendation_type} - ${recommendation.description}</p>
                                        <span class="badge bg-${recommendation.is_active ? 'success' : 'warning'}">${recommendation.is_active ? 'Active' : 'Draft'}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="template-selection-container">
                                <h6 class="template-section-title">
                                    <i data-feather="layout"></i>
                                    Choose Publishing Template
                                </h6>
                                <div class="template-grid" id="publishTemplateGrid">
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmPublishBtn" disabled>
                                <i data-feather="send"></i>
                                Publish to Telegram
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const templateGrid = document.getElementById('publishTemplateGrid');
            if (templateGrid) {
                this.renderQuickTemplateSelection(templateGrid, content, recommendation);
            }

            const confirmPublishBtn = document.getElementById('confirmPublishBtn');
            confirmPublishBtn.addEventListener('click', async () => {
                const selectedTemplate = document.querySelector('.publish-template-card.selected');
                if (!selectedTemplate) {
                    this.manager.showError('Please select a template');
                    return;
                }

                const templateType = selectedTemplate.dataset.template;
                await this.publishWithTemplate(recommendationId, templateType);

                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            });

            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
            });

            this.refreshFeatherIcons();

        } catch (error) {
            console.error('Show publish modal error:', error);
            this.manager.showError('Failed to open publish options: ' + error.message);
        }
    }

    renderQuickTemplateSelection(container, content, recommendation) {
        const quickTemplates = {
            'auto': {
                name: '🤖 Auto-Select',
                description: 'Let CineBrain choose the best template'
            },
            'standard_movie': {
                name: '🎬 Standard Movie',
                description: 'Classic movie recommendation format'
            },
            'standard_tv': {
                name: '📺 Standard TV Show',
                description: 'TV series recommendation format'
            },
            'standard_anime': {
                name: '🎌 Standard Anime',
                description: 'Anime recommendation format'
            },
            'mind_bending': {
                name: '🔥 Mind-Bending',
                description: 'For psychological or sci-fi content'
            },
            'hidden_gem': {
                name: '💎 Hidden Gem',
                description: 'For underrated content'
            }
        };

        let availableTemplates = {};
        if (content.content_type === 'anime') {
            availableTemplates = {
                'auto': quickTemplates.auto,
                'standard_anime': quickTemplates.standard_anime,
                'anime_gem': {
                    name: '🎐 Anime Gem',
                    description: 'For emotional or philosophical anime'
                }
            };
        } else if (content.content_type === 'tv' || content.content_type === 'series') {
            availableTemplates = {
                'auto': quickTemplates.auto,
                'standard_tv': quickTemplates.standard_tv,
                'hidden_gem': quickTemplates.hidden_gem
            };
        } else {
            availableTemplates = {
                'auto': quickTemplates.auto,
                'standard_movie': quickTemplates.standard_movie,
                'mind_bending': quickTemplates.mind_bending,
                'hidden_gem': quickTemplates.hidden_gem
            };
        }

        const cards = Object.entries(availableTemplates).map(([key, template]) => `
            <div class="publish-template-card" data-template="${key}" onclick="window.recTelegram.selectPublishTemplate('${key}')">
                <div class="template-card-header">
                    <h6 class="template-card-title">${template.name}</h6>
                </div>
                <p class="template-card-description">${template.description}</p>
            </div>
        `).join('');

        container.innerHTML = cards;
        this.refreshFeatherIcons();
    }

    selectPublishTemplate(templateKey) {
        document.querySelectorAll('.publish-template-card').forEach(card => {
            card.classList.remove('selected');
        });

        const selectedCard = document.querySelector(`[data-template="${templateKey}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        const confirmBtn = document.getElementById('confirmPublishBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }

    async publishWithTemplate(recommendationId, templateType) {
        try {
            this.manager.showToast('Publishing recommendation...', 'info');

            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}/publish`, {
                method: 'POST',
                body: JSON.stringify({
                    template_type: templateType,
                    template_params: {}
                })
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
            console.error('Publish with template error:', error);
            this.manager.showError('Failed to publish recommendation: ' + error.message);
        }
    }

    async publishRecommendation(recommendationId) {
        await this.showPublishWithTemplateModal(recommendationId);
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

                this.manager.loadRecommendations(true);
                this.manager.loadUpcomingRecommendations(true);
                this.manager.loadQuickStats();
                this.closeQuickSaveRecommendationModal();

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

    async createTemplateRecommendation(contentData, templateType, publishNow, templateParams = {}) {
        try {
            this.manager.showToast('Creating recommendation with template...', 'info');

            const response = await this.manager.makeAuthenticatedRequest('/admin/recommendations/create-with-template', {
                method: 'POST',
                body: JSON.stringify({
                    content_data: contentData,
                    template_type: templateType,
                    template_params: templateParams,
                    status: publishNow ? 'active' : 'draft',
                    publish_to_telegram: publishNow
                })
            });

            if (response.ok) {
                const result = await response.json();

                if (publishNow) {
                    this.manager.showToast('Recommendation published with template!', 'success');
                } else {
                    this.manager.showToast('Recommendation saved as draft!', 'success');
                }

                const modal = document.getElementById('enhancedCreateRecommendationModal');
                if (modal) {
                    bootstrap.Modal.getInstance(modal)?.hide();
                }

                this.manager.loadRecommendations(true);
                this.manager.loadUpcomingRecommendations(true);
                this.manager.loadQuickStats();

            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create recommendation');
            }
        } catch (error) {
            console.error('Template recommendation error:', error);
            this.manager.showError('Failed to create recommendation: ' + error.message);
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
        const runtime = this.formatRuntime(content.runtime);
        const genres = this.getGenres(content);

        return `
            <div class="content-card" data-content-id="${contentId}" data-source="${content.source || 'tmdb'}" tabindex="0">
                <div class="card-poster-container">
                    <img class="card-poster" data-src="${posterUrl}" alt="${this.manager.escapeHtml(content.title || content.name || 'Content')}" loading="lazy">
                    
                    <div class="content-type-badge ${contentType}">
                        ${contentType.toUpperCase()}
                    </div>

                    <div class="card-overlays">
                        <div class="card-top-overlay"></div>
                        <div class="card-bottom-overlay">
                            <div class="rating-badge">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                                <span>${rating}</span>
                            </div>
                            <div class="card-actions">
                                <button class="action-btn save-btn" onclick="window.recTelegram.saveRecommendation('${contentId}')" 
                                        title="Save for Later" aria-label="Save for Later">
                                    <i data-feather="bookmark"></i>
                                </button>
                                <button class="action-btn recommend-btn" onclick="window.recTelegram.recommendContent('${contentId}')" 
                                        title="Recommend" aria-label="Recommend">
                                    <i data-feather="star"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card-info">
                    <div class="card-title">${this.manager.escapeHtml(content.title || content.name || 'Unknown Title')}</div>
                    <div class="card-meta">
                        ${year ? `<span class="card-year">${year}</span>` : ''}
                        ${runtime ? `<span class="card-runtime">• ${runtime}</span>` : ''}
                    </div>
                    <div class="card-genres">
                        ${genres.map(genre => `<span class="genre-chip">${genre}</span>`).join('')}
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
        const runtime = this.formatRuntime(content.runtime);
        const genres = this.getGenres(content);
        const recommendationType = this.formatRecommendationType(recommendation.recommendation_type);

        return `
            <div class="content-card" data-content-id="${contentId}" data-recommendation-id="${recommendation.id}" tabindex="0">
                <div class="card-poster-container">
                    <img class="card-poster" data-src="${posterUrl}" alt="${this.manager.escapeHtml(content.title || content.name || 'Content')}" loading="lazy">
                    
                    <div class="content-type-badge ${contentType}">
                        ${contentType.toUpperCase()}
                    </div>
                    
                    <div class="recommendation-type-badge">
                        ${recommendationType}
                    </div>

                    <div class="card-overlays">
                        <div class="card-top-overlay"></div>
                        <div class="card-bottom-overlay">
                            <div class="rating-badge">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                                <span>${rating}</span>
                            </div>
                            <div class="card-actions">
                                <button class="action-btn publish-btn" onclick="window.recTelegram.publishRecommendation(${recommendation.id})" 
                                        title="Publish" aria-label="Publish">
                                    <i data-feather="upload"></i>
                                </button>
                                <button class="action-btn edit-btn" onclick="window.recTelegram.editRecommendation(${recommendation.id})" 
                                        title="Edit" aria-label="Edit">
                                    <i data-feather="edit"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card-info">
                    <div class="card-title">${this.manager.escapeHtml(content.title || content.name || 'Unknown Title')}</div>
                    <div class="card-meta">
                        ${year ? `<span class="card-year">${year}</span>` : ''}
                        ${runtime ? `<span class="card-runtime">• ${runtime}</span>` : ''}
                    </div>
                    <div class="card-genres">
                        ${genres.map(genre => `<span class="genre-chip">${genre}</span>`).join('')}
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

    async showEnhancedCreateRecommendationModal(content = null) {
        const targetContent = content || this.manager.state.selectedContent;
        if (!targetContent) {
            this.manager.showError('No content selected');
            return;
        }

        if (!window.templateManager) {
            window.templateManager = new TemplateManager(this);
            await window.templateManager.loadTemplateData();
        }

        const modal = document.getElementById('enhancedCreateRecommendationModal');
        if (!modal) {
            this.manager.showError('Enhanced template modal not found. Please refresh the page.');
            return;
        }

        const contentPreview = document.getElementById('modalContentPreview');
        if (contentPreview) {
            contentPreview.innerHTML = `
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
            `;
        }

        const templateGrid = document.getElementById('templateGrid');
        if (templateGrid) {
            window.templateManager.renderTemplateSelection(templateGrid);
        }

        this.setupEnhancedModalEventListeners(targetContent);

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            window.templateManager.selectedTemplate = null;
            document.getElementById('templateGuidance').style.display = 'none';
            const fieldsContainer = document.getElementById('templateFieldsContainer');
            if (fieldsContainer) {
                fieldsContainer.style.display = 'none';
            }
        });

        this.refreshFeatherIcons();
    }

    setupEnhancedModalEventListeners(content) {
        const saveDraftBtn = document.getElementById('saveTemplateDraftBtn');
        const publishBtn = document.getElementById('publishTemplateBtn');

        const newSaveDraftBtn = saveDraftBtn?.cloneNode(true);
        const newPublishBtn = publishBtn?.cloneNode(true);

        if (newSaveDraftBtn && saveDraftBtn) {
            saveDraftBtn.parentNode.replaceChild(newSaveDraftBtn, saveDraftBtn);
            newSaveDraftBtn.addEventListener('click', async () => {
                const validation = window.templateManager.validateTemplateSelection();
                if (!validation.valid) {
                    this.manager.showError(validation.error);
                    return;
                }

                const contentData = this.extractContentData(content);
                const templateParams = window.templateManager.getTemplateParams();

                await this.createTemplateRecommendation(
                    contentData,
                    window.templateManager.selectedTemplate,
                    false,
                    templateParams
                );
            });
        }

        if (newPublishBtn && publishBtn) {
            publishBtn.parentNode.replaceChild(newPublishBtn, publishBtn);
            newPublishBtn.addEventListener('click', async () => {
                const validation = window.templateManager.validateTemplateSelection();
                if (!validation.valid) {
                    this.manager.showError(validation.error);
                    return;
                }

                const contentData = this.extractContentData(content);
                const templateParams = window.templateManager.getTemplateParams();

                await this.createTemplateRecommendation(
                    contentData,
                    window.templateManager.selectedTemplate,
                    true,
                    templateParams
                );
            });
        }
    }

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

    closeEditRecommendationModal() {
        const modal = document.getElementById('editRecommendationModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

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
                        <div class="skeleton skeleton-poster">
                            <div class="skeleton-shimmer"></div>
                        </div>
                        <div class="skeleton-info">
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
    }

    clearSearch() {
        if (this.elements.contentSearchInput) {
            this.elements.contentSearchInput.value = '';
            this.elements.contentSearchInput.focus();
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

    formatRuntime(runtime) {
        if (!runtime || runtime === 0) return '';
        const hours = Math.floor(runtime / 60);
        const minutes = runtime % 60;
        if (hours > 0) {
            return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
        }
        return `${minutes}m`;
    }

    getGenres(content) {
        if (!content.genres && !content.genre_ids) return [];

        if (content.genres && Array.isArray(content.genres)) {
            return content.genres.map(g => g.name || g).slice(0, 3);
        }

        const genreMap = {
            28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
            80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
            14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
            9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
            53: 'Thriller', 10752: 'War', 37: 'Western'
        };

        if (content.genre_ids && Array.isArray(content.genre_ids)) {
            return content.genre_ids
                .map(id => genreMap[id] || 'Unknown')
                .slice(0, 3);
        }

        return [];
    }

    formatRecommendationType(type) {
        const typeMap = {
            'featured': 'Featured',
            'trending': 'Trending',
            'hidden_gem': 'Hidden Gem',
            'classic': 'Classic',
            'new_release': 'New Release'
        };
        return typeMap[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    extractYear(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).getFullYear();
        } catch {
            return '';
        }
    }

    refreshFeatherIcons() {
        setTimeout(() => {
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }, 100);
    }
}

window.templateManager = null;

document.addEventListener('DOMContentLoaded', () => {
    recommendationsManager = new AdminRecommendations();

    setTimeout(() => {
        window.recTelegram = new RecTelegram(recommendationsManager);
    }, 100);
});

window.addEventListener('beforeunload', () => {
    if (recommendationsManager) {
        recommendationsManager.destroy();
    }
});

window.recommendationsManager = recommendationsManager;