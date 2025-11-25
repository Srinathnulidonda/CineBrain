class TemplateManager {
    constructor(recUpcoming) {
        this.recUpcoming = recUpcoming;
        this.manager = recUpcoming.manager;
        this.availableTemplates = {};
        this.templatePrompts = {};
        this.selectedTemplate = null;
        this.templateFields = {};
        this.templateData = {};
        this.listItems = [];
    }

    async loadTemplateData() {
        try {
            console.log('🌐 Loading template data...');
            const templatesResponse = await this.manager.makeAuthenticatedRequest('/admin/telegram/templates');
            if (templatesResponse.ok) {
                const templatesData = await templatesResponse.json();
                this.availableTemplates = templatesData.templates || {};
                console.log('✅ Templates loaded:', this.availableTemplates);
            }

            const promptsResponse = await this.manager.makeAuthenticatedRequest('/admin/telegram/templates/prompts');
            if (promptsResponse.ok) {
                const promptsData = await promptsResponse.json();
                this.templatePrompts = promptsData.prompts || {};
                this.templateFields = promptsData.available_templates || {};
                console.log('✅ Template prompts loaded:', this.templatePrompts);
            }
        } catch (error) {
            console.error('Error loading template data:', error);
        }
    }

    renderTemplateSelection(container) {
        if (!container) return;

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

        const popularTemplates = ['mind_bending', 'hidden_gem'];

        const templateCards = Object.entries(this.availableTemplates).map(([key, name]) => {
            const isPopular = popularTemplates.includes(key);

            return `
            <div class="template-card" data-template="${key}" onclick="window.templateManager.selectTemplate('${key}')">
                <span class="template-card-icon">${templateIcons[key] || '📝'}</span>
                <p class="template-card-title">${name.replace('Standard ', '').replace('Template', '')}</p>
                ${isPopular ? '<span class="template-feature">Popular</span>' : ''}
            </div>
        `;
        }).join('');

        container.innerHTML = templateCards;
        window.recUtils.refreshFeatherIcons();
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
        window.recUtils.refreshFeatherIcons();
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
                            <button type="button" class="add-list-item-btn" onclick="window.templateManager.addListItem()">
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
            this.manager.showError(`Maximum ${maxItems} items allowed`);
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
                <button type="button" class="remove-list-item-btn" onclick="window.templateManager.removeListItem(this)">
                    <i data-feather="minus"></i>
                </button>
                ${currentItems === 0 ? '<button type="button" class="add-list-item-btn" onclick="window.templateManager.addListItem()"><i data-feather="plus"></i></button>' : ''}
            </div>
        `;

        container.appendChild(newItem);

        this.updateListItemNumbers();
        window.recUtils.refreshFeatherIcons();
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
                actionsDiv.innerHTML += '<button type="button" class="add-list-item-btn" onclick="window.templateManager.addListItem()"><i data-feather="plus"></i></button>';
                window.recUtils.refreshFeatherIcons();
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

        // Collect all template field inputs
        document.querySelectorAll('.template-field-input').forEach(input => {
            if (input.name && input.value.trim()) {
                params[input.name] = input.value.trim();
            }
        });

        // Handle special cases for specific templates
        if (this.selectedTemplate === 'top_list') {
            params.items = this.getListItems();
        }

        // Log what we're collecting for debugging
        console.log('🎯 Collecting template params:', params);

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

    // Enhanced preload method
    preloadTemplateFields(templateFields) {
        console.log('🔄 Preloading template fields:', templateFields);

        setTimeout(() => {
            Object.entries(templateFields).forEach(([fieldKey, fieldValue]) => {
                const field = document.getElementById(`template_${fieldKey}`);
                if (field && fieldValue) {
                    field.value = fieldValue;

                    // Update character count if exists
                    const countElement = document.getElementById(`count_${fieldKey}`);
                    if (countElement) {
                        const maxLength = field.maxLength || 200;
                        countElement.textContent = `${fieldValue.length}/${maxLength}`;
                    }

                    // Trigger input event to update internal state
                    field.dispatchEvent(new Event('input', { bubbles: true }));

                    console.log(`✅ Preloaded field ${fieldKey}:`, fieldValue);
                } else if (!field) {
                    console.warn(`❌ Field not found: template_${fieldKey}`);
                }
            });

            // Handle list items if present
            if (templateFields.items && Array.isArray(templateFields.items) && templateFields.items.length > 0) {
                this.preloadListItems(templateFields.items);
            }

            // Store the loaded data in templateData
            this.templateData = { ...templateFields };

            window.recUtils.refreshFeatherIcons();
            console.log('✅ All template fields preloaded successfully');
        }, 200);
    }

    // NEW: Preload list items method
    preloadListItems(items) {
        const container = document.getElementById('listItemsContainer');
        if (!container) return;

        console.log('🔄 Preloading list items:', items);

        // Clear existing items
        container.innerHTML = '';

        // Add saved items
        items.forEach((item, index) => {
            if (index === 0) {
                // Create first item
                const firstItem = document.createElement('div');
                firstItem.className = 'list-item';
                firstItem.innerHTML = `
                    <div class="list-item-number">1.</div>
                    <div class="list-item-inputs">
                        <input type="text" class="list-item-input" placeholder="Movie Title" maxlength="50" value="${this.escapeHtml(item[0] || '')}">
                        <input type="text" class="list-item-input" placeholder="Year" maxlength="4" value="${this.escapeHtml(item[1] || '')}">
                        <input type="text" class="list-item-input" placeholder="Hook (short, punchy)" maxlength="80" value="${this.escapeHtml(item[2] || '')}">
                    </div>
                    <div class="list-item-actions">
                        <button type="button" class="add-list-item-btn" onclick="window.templateManager.addListItem()">
                            <i data-feather="plus"></i>
                        </button>
                    </div>
                `;
                container.appendChild(firstItem);
            } else {
                // Add additional items
                this.addListItem();
                const newItem = container.lastElementChild;
                const inputs = newItem.querySelectorAll('.list-item-input');
                if (inputs.length >= 3) {
                    inputs[0].value = this.escapeHtml(item[0] || '');
                    inputs[1].value = this.escapeHtml(item[1] || '');
                    inputs[2].value = this.escapeHtml(item[2] || '');
                }
            }
        });

        window.recUtils.refreshFeatherIcons();
        console.log(`✅ Preloaded ${items.length} list items`);
    }

    // NEW: HTML escape utility
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
}

class RecUpcoming {
    constructor(manager) {
        this.manager = manager;
        this.initializeElements();
        this.setupEventListeners();
        console.log('✅ RecUpcoming module initialized');
    }

    initializeElements() {
        this.elements = {
            upcomingGrid: document.getElementById('savedContentGrid'),
            upcomingFilter: document.getElementById('savedContentFilter'),
            upcomingSearch: document.getElementById('savedContentSearch'),
            refreshUpcoming: document.getElementById('refreshSavedContent'),
            bulkContentActions: document.getElementById('bulkContentActions'),
            createRecommendationBtn: document.getElementById('createRecommendationBtn')
        };
    }

    setupEventListeners() {
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

        this.elements.refreshUpcoming?.addEventListener('click', () => {
            this.manager.loadUpcomingRecommendations(true);
        });

        this.elements.bulkContentActions?.addEventListener('click', () => {
            this.bulkEditUpcoming();
        });
    }

    renderUpcomingRecommendations() {
        if (!this.elements.upcomingGrid) return;

        try {
            if (!this.manager.state.upcomingRecommendations || this.manager.state.upcomingRecommendations.length === 0) {
                this.elements.upcomingGrid.classList.remove('active');
                this.elements.upcomingGrid.innerHTML = window.recUtils.getEmptyState(
                    'clock',
                    'No upcoming recommendations',
                    'Create recommendations and save as draft',
                    false
                );
                this.updateTabContainerHeight();
                window.recUtils.refreshFeatherIcons();
                return;
            }

            // Filter out any null/undefined recommendations
            const validRecommendations = this.manager.state.upcomingRecommendations.filter(rec => rec && rec.id);

            this.elements.upcomingGrid.innerHTML = validRecommendations.map(rec => {
                try {
                    return this.createUpcomingContentCard(rec);
                } catch (error) {
                    console.error('Error rendering recommendation card:', error, rec);
                    return '';
                }
            }).filter(card => card).join('');

            this.elements.upcomingGrid.classList.add('active');
            this.setupLazyLoadingForCards(this.elements.upcomingGrid);
            this.updateTabContainerHeight();
            window.recUtils.refreshFeatherIcons();
        } catch (error) {
            console.error('Error rendering upcoming recommendations:', error);
            this.elements.upcomingGrid.innerHTML = window.recUtils.getEmptyState(
                'alert-circle',
                'Error loading recommendations',
                'Please refresh the page',
                false
            );
            window.recUtils.refreshFeatherIcons();
        }
    }

    createUpcomingContentCard(recommendation) {
        try {
            // Add comprehensive null checking
            if (!recommendation) {
                console.warn('createUpcomingContentCard: recommendation is null/undefined');
                return '';
            }

            const content = recommendation.content || {};
            const posterUrl = window.recUtils.getPosterUrl(content);
            const rating = window.recUtils.formatRating(content.rating || content.vote_average);
            const year = window.recUtils.extractYear(content.release_date || content.first_air_date);
            const contentType = content.content_type || content.media_type || 'movie';
            const contentId = content.id || content.tmdb_id || content.mal_id || recommendation.id || Date.now();
            const runtime = window.recUtils.formatRuntime(content.runtime);
            const genres = window.recUtils.getGenres(content);

            // FIX: Safe handling of recommendation type
            const recommendationType = window.recUtils.formatRecommendationType(
                recommendation.recommendation_type || 'general'
            );

            // Enhanced template indicator with field count
            const hasTemplateData = recommendation.template_data?.template_fields ||
                recommendation.hook_text ||
                recommendation.if_you_like ||
                recommendation.custom_overview ||
                recommendation.emotion_hook ||
                recommendation.scene_caption ||
                recommendation.list_title ||
                recommendation.list_items;

            let templateFieldCount = 0;
            if (recommendation.template_data?.template_fields) {
                templateFieldCount = Object.keys(recommendation.template_data.template_fields).length;
            }
            // Add individual field count as backup
            templateFieldCount += [
                recommendation.hook_text,
                recommendation.if_you_like,
                recommendation.custom_overview,
                recommendation.emotion_hook,
                recommendation.scene_caption,
                recommendation.list_title,
                recommendation.list_items
            ].filter(Boolean).length;

            const templateIndicator = hasTemplateData ?
                `<span class="template-indicator" title="Template: ${recommendation.template_type || 'Custom'} (${templateFieldCount} fields saved)">
                    📝 ${templateFieldCount}
                 </span>` : '';

            return `
                <div class="content-card" data-content-id="${contentId}" data-recommendation-id="${recommendation.id || ''}" tabindex="0">
                    <div class="card-poster-container">
                        <img class="card-poster" data-src="${posterUrl}" alt="${this.manager.escapeHtml(content.title || content.name || 'Content')}" loading="lazy">
                        
                        <div class="content-type-badge ${contentType}">
                            ${contentType.toUpperCase()}
                        </div>
                        
                        <div class="recommendation-type-badge">
                            ${recommendationType}
                            ${templateIndicator}
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
                                    <button class="action-btn publish-btn" onclick="window.recUpcoming.publishDraftRecommendation(${recommendation.id || 0})" 
                                            title="Publish to Telegram" aria-label="Publish to Telegram">
                                        <i data-feather="send"></i>
                                    </button>
                                    <button class="action-btn edit-btn" onclick="window.recUpcoming.editRecommendation(${recommendation.id || 0})" 
                                            title="Edit Draft" aria-label="Edit Draft">
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
                            ${genres.map(genre => `<span class="genre-chip">${this.manager.escapeHtml(genre)}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error creating upcoming content card:', error, recommendation);
            return `
                <div class="content-card error-card">
                    <div class="card-info">
                        <div class="card-title">Error loading content</div>
                        <div class="card-meta">Please refresh the page</div>
                    </div>
                </div>
            `;
        }
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

        // Reset modal title for creating
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i data-feather="star"></i>
                Create Recommendation with Template
            `;
        }

        const contentPreview = document.getElementById('modalContentPreview');
        if (contentPreview) {
            contentPreview.innerHTML = `
                <div class="row">
                    <div class="col-3">
                        <img src="${window.recUtils.getPosterUrl(targetContent)}" 
                             alt="${targetContent.title}" 
                             class="img-fluid rounded">
                    </div>
                    <div class="col-9">
                        <h6>${targetContent.title || targetContent.name}</h6>
                        <p class="text-muted mb-2">${targetContent.content_type || 'movie'} • ${window.recUtils.extractYear(targetContent.release_date || targetContent.first_air_date)}</p>
                        <p class="small">${(targetContent.overview || '').substring(0, 150)}...</p>
                    </div>
                </div>
            `;
        }

        const templateGrid = document.getElementById('templateGrid');
        if (templateGrid) {
            window.templateManager.renderTemplateSelection(templateGrid);
        }

        // Reset modal buttons for creating
        const modalFooter = modal.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" id="saveTemplateDraftBtn">
                    <i data-feather="bookmark"></i>
                    Save as Draft
                </button>
                <button type="button" class="btn btn-primary" id="publishTemplateBtn">
                    <i data-feather="send"></i>
                    Publish to Telegram
                </button>
            `;
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

        window.recUtils.refreshFeatherIcons();
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

    async createTemplateRecommendation(contentData, templateType, publishNow, templateParams = {}) {
        try {
            this.manager.showToast('Creating recommendation with template...', 'info');

            // FIX: Validate contentData before sending
            if (!contentData || !contentData.id) {
                throw new Error('Invalid content data');
            }

            // Enhanced template params logging
            console.log('🎯 Template params being saved:', templateParams);

            const requestData = {
                content_data: contentData,
                template_type: templateType || 'auto',
                template_params: templateParams || {},
                status: publishNow ? 'active' : 'draft',
                publish_to_telegram: publishNow,
                recommendation_type: templateType || 'general',
                description: this.generateDescriptionFromTemplate(templateType, templateParams),

                // Enhanced template data structure
                template_data: {
                    selected_template: templateType,
                    template_fields: templateParams,
                    template_timestamp: Date.now(),
                    field_count: Object.keys(templateParams).length
                }
            };

            console.log('🌐 Creating template recommendation with enhanced data:', requestData);

            const response = await this.manager.makeAuthenticatedRequest('/admin/recommendations/create-with-template', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                const result = await response.json();

                if (publishNow) {
                    this.manager.showToast(`Recommendation published with ${templateType} template!`, 'success');
                } else {
                    this.manager.showToast(`Draft saved with ${templateType} template! (${Object.keys(templateParams).length} fields saved)`, 'success');
                }

                // Close modal and refresh data
                const modal = document.getElementById('enhancedCreateRecommendationModal');
                if (modal) {
                    bootstrap.Modal.getInstance(modal)?.hide();
                }

                this.manager.loadRecommendations(true);
                this.manager.loadUpcomingRecommendations(true);
                this.manager.loadQuickStats();

                console.log('✅ Template recommendation created successfully with saved fields:', result);

            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create recommendation');
            }
        } catch (error) {
            console.error('Template recommendation error:', error);
            this.manager.showError('Failed to create recommendation: ' + error.message);
        }
    }

    // NEW: Generate description from template
    generateDescriptionFromTemplate(templateType, templateParams) {
        const descriptions = {
            'mind_bending': `Mind-bending recommendation${templateParams.overview ? ' with custom overview' : ''}`,
            'hidden_gem': `Hidden gem recommendation${templateParams.hook ? ': ' + templateParams.hook.substring(0, 50) + '...' : ''}`,
            'anime_gem': `Anime gem recommendation${templateParams.emotion_hook ? ' - ' + templateParams.emotion_hook.substring(0, 30) + '...' : ''}`,
            'scene_clip': `Scene clip recommendation${templateParams.caption ? ': ' + templateParams.caption : ''}`,
            'top_list': `Top list: ${templateParams.list_title || 'Custom List'}`
        };

        return descriptions[templateType] || `Recommended with ${templateType} template`;
    }

    async editRecommendation(recommendationId) {
        try {
            if (!recommendationId || recommendationId === 0) {
                this.manager.showError('Invalid recommendation ID');
                return;
            }

            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch recommendation details');
            }

            const recommendation = await response.json();

            // Use enhanced template modal for editing
            this.showEnhancedEditModal(recommendation);

        } catch (error) {
            console.error('Edit recommendation error:', error);
            this.manager.showError('Failed to open edit form: ' + error.message);
        }
    }

    // Enhanced edit modal using the same design as create recommendation
    showEnhancedEditModal(recommendation) {
        if (!window.templateManager) {
            window.templateManager = new TemplateManager(this);
            window.templateManager.loadTemplateData().then(() => {
                this.renderEnhancedEditModal(recommendation);
            });
        } else {
            this.renderEnhancedEditModal(recommendation);
        }
    }

    renderEnhancedEditModal(recommendation) {
        const modal = document.getElementById('enhancedCreateRecommendationModal');
        if (!modal) {
            this.manager.showError('Enhanced template modal not found. Please refresh the page.');
            return;
        }

        // Update modal title for editing
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i data-feather="edit"></i>
                Edit Recommendation
            `;
        }

        // Update content preview
        const contentPreview = document.getElementById('modalContentPreview');
        if (contentPreview) {
            contentPreview.innerHTML = `
                <div class="row">
                    <div class="col-3">
                        <img src="${window.recUtils.getPosterUrl(recommendation.content)}" 
                             alt="${recommendation.content?.title}" 
                             class="img-fluid rounded">
                    </div>
                    <div class="col-9">
                        <h6>${recommendation.content?.title || recommendation.content?.name}</h6>
                        <p class="text-muted mb-2">${recommendation.content?.content_type || 'movie'} • ${window.recUtils.extractYear(recommendation.content?.release_date || recommendation.content?.first_air_date)}</p>
                        <p class="small">${(recommendation.content?.overview || '').substring(0, 150)}...</p>
                        
                        <div class="mt-2">
                            <small class="text-muted">
                                <strong>Current Type:</strong> ${window.recUtils.formatRecommendationType(recommendation.recommendation_type)}<br>
                                <strong>Status:</strong> ${recommendation.is_active ? 'Active' : 'Draft'}${recommendation.template_data?.field_count ? `<br><strong>Template Fields:</strong> ${recommendation.template_data.field_count} saved` : ''}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }

        // Render template selection
        const templateGrid = document.getElementById('templateGrid');
        if (templateGrid) {
            window.templateManager.renderTemplateSelection(templateGrid);

            // Enhanced template preselection
            setTimeout(() => {
                let templateToSelect = 'standard_movie'; // Default

                // Try to get template from multiple sources
                if (recommendation.template_data?.selected_template) {
                    templateToSelect = recommendation.template_data.selected_template;
                    console.log('✅ Found template in template_data:', templateToSelect);
                } else if (recommendation.template_type) {
                    templateToSelect = recommendation.template_type;
                    console.log('✅ Found template in template_type:', templateToSelect);
                } else if (recommendation.recommendation_type) {
                    templateToSelect = recommendation.recommendation_type;
                    console.log('✅ Using recommendation_type as template:', templateToSelect);
                }

                // Select the template
                window.templateManager.selectTemplate(templateToSelect);

                // Enhanced field preloading
                let fieldsToPreload = {};

                // Get fields from template_fields first (priority)
                if (recommendation.template_data?.template_fields) {
                    fieldsToPreload = { ...recommendation.template_data.template_fields };
                    console.log('✅ Found template_fields in template_data:', fieldsToPreload);
                }

                // Also check individual database columns as backup
                const individualFields = {};
                if (recommendation.hook_text) individualFields.hook = recommendation.hook_text;
                if (recommendation.if_you_like) individualFields.if_you_like = recommendation.if_you_like;
                if (recommendation.custom_overview) individualFields.overview = recommendation.custom_overview;
                if (recommendation.emotion_hook) individualFields.emotion_hook = recommendation.emotion_hook;
                if (recommendation.scene_caption) individualFields.caption = recommendation.scene_caption;
                if (recommendation.list_title) individualFields.list_title = recommendation.list_title;
                if (recommendation.list_items) individualFields.items = recommendation.list_items;

                // Merge fields (template_fields takes priority)
                fieldsToPreload = { ...individualFields, ...fieldsToPreload };

                console.log('🔄 Final fields to preload:', fieldsToPreload);

                if (Object.keys(fieldsToPreload).length > 0) {
                    window.templateManager.preloadTemplateFields(fieldsToPreload);
                } else {
                    console.log('ℹ️ No template fields found to preload');
                }

            }, 100);
        }

        // Update modal buttons for editing
        const modalFooter = modal.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.innerHTML = `
                <button type="button" class="btn btn-danger me-auto" id="deleteRecommendationBtn">
                    <i data-feather="trash"></i>
                    Delete
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" id="saveChangesBtn">
                    <i data-feather="check-circle"></i>
                    Save Changes
                </button>
                <button type="button" class="btn btn-primary" id="saveAndPublishBtn">
                    <i data-feather="send"></i>
                    Save & Publish
                </button>
            `;
        }

        this.setupEnhancedEditEventListeners(recommendation);

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

        window.recUtils.refreshFeatherIcons();
    }

    async publishDraftRecommendation(recommendationId) {
        try {
            if (!recommendationId || recommendationId === 0) {
                this.manager.showError('Invalid recommendation ID');
                return;
            }

            const recommendation = this.manager.state.upcomingRecommendations.find(rec => rec.id === recommendationId);
            if (!recommendation) {
                this.manager.showError('Recommendation not found');
                return;
            }

            // Use enhanced template modal for publishing
            this.showEnhancedPublishModal(recommendation);

        } catch (error) {
            console.error('Publish draft error:', error);
            this.manager.showError('Failed to publish recommendation: ' + error.message);
        }
    }

    // Enhanced publish modal using the same design as create recommendation
    showEnhancedPublishModal(recommendation) {
        if (!window.templateManager) {
            window.templateManager = new TemplateManager(this);
            window.templateManager.loadTemplateData().then(() => {
                this.renderEnhancedPublishModal(recommendation);
            });
        } else {
            this.renderEnhancedPublishModal(recommendation);
        }
    }

    renderEnhancedPublishModal(recommendation) {
        const modal = document.getElementById('enhancedCreateRecommendationModal');
        if (!modal) {
            this.manager.showError('Enhanced template modal not found. Please refresh the page.');
            return;
        }

        // Update modal title for publishing
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i data-feather="send"></i>
                Publish Recommendation to Telegram
            `;
        }

        // Update content preview
        const contentPreview = document.getElementById('modalContentPreview');
        if (contentPreview) {
            const templateFieldCount = recommendation.template_data?.field_count ||
                Object.keys(recommendation.template_data?.template_fields || {}).length;

            contentPreview.innerHTML = `
                <div class="row">
                    <div class="col-3">
                        <img src="${window.recUtils.getPosterUrl(recommendation.content)}" 
                             alt="${recommendation.content?.title}" 
                             class="img-fluid rounded">
                    </div>
                    <div class="col-9">
                        <h6>${recommendation.content?.title || recommendation.content?.name}</h6>
                        <p class="text-muted mb-2">${recommendation.content?.content_type || 'movie'} • ${window.recUtils.extractYear(recommendation.content?.release_date || recommendation.content?.first_air_date)}</p>
                        <p class="small">${(recommendation.content?.overview || '').substring(0, 150)}...</p>
                        
                        ${templateFieldCount > 0 ? `
                        <div class="mt-2">
                            <span class="badge bg-primary">
                                <i class="bi bi-file-text"></i>
                                ${templateFieldCount} template fields saved
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Render template selection
        const templateGrid = document.getElementById('templateGrid');
        if (templateGrid) {
            window.templateManager.renderTemplateSelection(templateGrid);

            // Pre-select template if saved with recommendation
            if (recommendation.template_data?.selected_template) {
                setTimeout(() => {
                    window.templateManager.selectTemplate(recommendation.template_data.selected_template);

                    // Pre-fill template fields if saved
                    if (recommendation.template_data?.template_fields) {
                        window.templateManager.preloadTemplateFields(recommendation.template_data.template_fields);
                    }
                }, 100);
            }
        }

        // Update modal buttons for publishing
        const modalFooter = modal.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" id="updateDraftBtn">
                    <i data-feather="bookmark"></i>
                    Update Draft
                </button>
                <button type="button" class="btn btn-primary" id="publishNowBtn">
                    <i data-feather="send"></i>
                    Publish to Telegram
                </button>
            `;
        }

        this.setupEnhancedPublishEventListeners(recommendation);

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

        window.recUtils.refreshFeatherIcons();
    }

    // Setup event listeners for enhanced publish modal
    setupEnhancedPublishEventListeners(recommendation) {
        const updateDraftBtn = document.getElementById('updateDraftBtn');
        const publishNowBtn = document.getElementById('publishNowBtn');

        updateDraftBtn?.addEventListener('click', async () => {
            const validation = window.templateManager.validateTemplateSelection();
            if (!validation.valid) {
                this.manager.showError(validation.error);
                return;
            }

            const templateParams = window.templateManager.getTemplateParams();
            await this.updateRecommendationWithTemplate(
                recommendation.id,
                window.templateManager.selectedTemplate,
                false,
                templateParams
            );
        });

        publishNowBtn?.addEventListener('click', async () => {
            const validation = window.templateManager.validateTemplateSelection();
            if (!validation.valid) {
                this.manager.showError(validation.error);
                return;
            }

            const templateParams = window.templateManager.getTemplateParams();
            await this.updateRecommendationWithTemplate(
                recommendation.id,
                window.templateManager.selectedTemplate,
                true,
                templateParams
            );
        });
    }

    // Setup event listeners for enhanced edit modal
    setupEnhancedEditEventListeners(recommendation) {
        const deleteBtn = document.getElementById('deleteRecommendationBtn');
        const saveChangesBtn = document.getElementById('saveChangesBtn');
        const saveAndPublishBtn = document.getElementById('saveAndPublishBtn');

        deleteBtn?.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this recommendation? This action cannot be undone.')) {
                await this.deleteRecommendation(recommendation.id);
            }
        });

        saveChangesBtn?.addEventListener('click', async () => {
            const validation = window.templateManager.validateTemplateSelection();
            if (!validation.valid) {
                this.manager.showError(validation.error);
                return;
            }

            const templateParams = window.templateManager.getTemplateParams();
            await this.updateRecommendationWithTemplate(
                recommendation.id,
                window.templateManager.selectedTemplate,
                false,
                templateParams
            );
        });

        saveAndPublishBtn?.addEventListener('click', async () => {
            const validation = window.templateManager.validateTemplateSelection();
            if (!validation.valid) {
                this.manager.showError(validation.error);
                return;
            }

            const templateParams = window.templateManager.getTemplateParams();
            await this.updateRecommendationWithTemplate(
                recommendation.id,
                window.templateManager.selectedTemplate,
                true,
                templateParams
            );
        });
    }

    // Update recommendation with template data
    async updateRecommendationWithTemplate(recommendationId, templateType, publishNow, templateParams = {}) {
        try {
            this.manager.showToast(publishNow ? 'Publishing recommendation...' : 'Updating recommendation...', 'info');

            console.log('🎯 Updating with template params:', templateParams);

            const updateData = {
                recommendation_type: templateType,
                template_data: {
                    selected_template: templateType,
                    template_fields: templateParams,
                    template_timestamp: Date.now(),
                    field_count: Object.keys(templateParams).length
                },
                is_active: publishNow
            };

            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                if (publishNow) {
                    // Also publish to Telegram
                    const publishResponse = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}/publish`, {
                        method: 'POST',
                        body: JSON.stringify({
                            template_type: templateType,
                            template_params: templateParams
                        })
                    });

                    if (publishResponse.ok) {
                        const result = await publishResponse.json();
                        if (result.telegram_sent) {
                            this.manager.showToast(`Recommendation updated and published to Telegram! (${Object.keys(templateParams).length} fields saved)`, 'success');
                        } else {
                            this.manager.showToast(`Recommendation updated (Telegram not configured) - ${Object.keys(templateParams).length} fields saved`, 'warning');
                        }
                    } else {
                        this.manager.showToast(`Recommendation updated but failed to publish to Telegram - ${Object.keys(templateParams).length} fields saved`, 'warning');
                    }
                } else {
                    this.manager.showToast(`Recommendation updated successfully! (${Object.keys(templateParams).length} fields saved)`, 'success');
                }

                const modal = document.getElementById('enhancedCreateRecommendationModal');
                if (modal) {
                    bootstrap.Modal.getInstance(modal)?.hide();
                }

                this.manager.loadRecommendations(true);
                this.manager.loadUpcomingRecommendations(true);
                this.manager.loadQuickStats();

                console.log('✅ Recommendation updated with template fields:', templateParams);

            } else {
                const error = await response.json();
                throw new Error(error.error || 'Update failed');
            }
        } catch (error) {
            console.error('Update recommendation error:', error);
            this.manager.showError('Failed to update recommendation: ' + error.message);
        }
    }

    // Delete recommendation method
    async deleteRecommendation(recommendationId) {
        try {
            this.manager.showToast('Deleting recommendation...', 'info');

            const response = await this.manager.makeAuthenticatedRequest(`/admin/recommendations/${recommendationId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.manager.showToast('Recommendation deleted successfully!', 'success');

                const modal = document.getElementById('enhancedCreateRecommendationModal');
                if (modal) {
                    bootstrap.Modal.getInstance(modal)?.hide();
                }

                this.manager.loadRecommendations(true);
                this.manager.loadUpcomingRecommendations(true);
                this.manager.loadQuickStats();

            } else {
                const error = await response.json();
                throw new Error(error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete recommendation error:', error);
            this.manager.showError('Failed to delete recommendation: ' + error.message);
        }
    }

    async bulkEditUpcoming() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'bulkEditUpcomingModal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i data-feather="edit"></i>
                            Bulk Edit Upcoming
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Select an action to perform on all upcoming recommendations:</p>
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary" id="bulkMoveToActive">
                                <i data-feather="arrow-right"></i>
                                Move All to Active
                            </button>
                            <button class="btn btn-outline-success" id="bulkPublishAll">
                                <i data-feather="send"></i>
                                Publish All to Telegram
                            </button>
                            <button class="btn btn-outline-secondary" id="bulkExportUpcoming">
                                <i data-feather="download"></i>
                                Export as CSV
                            </button>
                            <button class="btn btn-outline-danger" id="bulkDeleteUpcoming">
                                <i data-feather="trash"></i>
                                Delete All Drafts
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

        document.getElementById('bulkMoveToActive').addEventListener('click', async () => {
            await this.bulkMoveToActive();
        });

        document.getElementById('bulkPublishAll').addEventListener('click', async () => {
            await this.bulkPublishUpcoming();
        });

        document.getElementById('bulkExportUpcoming').addEventListener('click', async () => {
            await this.exportUpcomingRecommendations();
        });

        document.getElementById('bulkDeleteUpcoming').addEventListener('click', async () => {
            await this.bulkDeleteUpcoming();
        });

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        window.recUtils.refreshFeatherIcons();
    }

    async bulkMoveToActive() {
        try {
            if (!confirm('Are you sure you want to move all upcoming recommendations to active?')) {
                return;
            }

            this.manager.showToast('Moving all to active...', 'info');

            const promises = this.manager.state.upcomingRecommendations.map(rec =>
                this.manager.makeAuthenticatedRequest(`/admin/recommendations/${rec.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ is_active: true })
                })
            );

            await Promise.allSettled(promises);
            this.manager.showToast('Bulk move completed!', 'success');
            this.manager.loadRecommendations(true);
            this.manager.loadUpcomingRecommendations(true);

        } catch (error) {
            console.error('Bulk move error:', error);
            this.manager.showError('Failed to move all recommendations');
        }
    }

    async bulkPublishUpcoming() {
        try {
            if (!confirm('Are you sure you want to publish all upcoming recommendations to Telegram?')) {
                return;
            }

            this.manager.showToast('Publishing all to Telegram...', 'info');

            const promises = this.manager.state.upcomingRecommendations.map(rec =>
                this.manager.makeAuthenticatedRequest(`/admin/recommendations/${rec.id}/publish`, {
                    method: 'POST',
                    body: JSON.stringify({
                        template_type: 'auto',
                        template_params: {}
                    })
                })
            );

            await Promise.allSettled(promises);
            this.manager.showToast('Bulk publish completed!', 'success');
            this.manager.loadRecommendations(true);
            this.manager.loadUpcomingRecommendations(true);

        } catch (error) {
            console.error('Bulk publish error:', error);
            this.manager.showError('Failed to publish all recommendations');
        }
    }

    async exportUpcomingRecommendations() {
        try {
            const csvContent = this.generateCSV(this.manager.state.upcomingRecommendations);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `upcoming_recommendations_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();

            window.URL.revokeObjectURL(url);
            this.manager.showToast('Upcoming recommendations exported!', 'success');

        } catch (error) {
            console.error('Export error:', error);
            this.manager.showError('Failed to export upcoming recommendations');
        }
    }

    async bulkDeleteUpcoming() {
        try {
            if (!confirm('Are you sure you want to delete ALL upcoming recommendations? This action cannot be undone.')) {
                return;
            }

            this.manager.showToast('Deleting all upcoming...', 'info');

            const promises = this.manager.state.upcomingRecommendations.map(rec =>
                this.manager.makeAuthenticatedRequest(`/admin/recommendations/${rec.id}`, {
                    method: 'DELETE'
                })
            );

            await Promise.allSettled(promises);
            this.manager.showToast('All upcoming recommendations deleted!', 'success');
            this.manager.loadUpcomingRecommendations(true);
            this.manager.loadQuickStats();

        } catch (error) {
            console.error('Bulk delete error:', error);
            this.manager.showError('Failed to delete upcoming recommendations');
        }
    }

    generateCSV(recommendations) {
        const headers = ['Title', 'Type', 'Content Type', 'Description', 'Status', 'Created Date', 'Template Fields'];
        const rows = recommendations.map(rec => [
            rec.content?.title || 'Unknown',
            rec.recommendation_type || 'general',
            rec.content?.content_type || 'movie',
            (rec.description || '').replace(/"/g, '""'),
            rec.is_active ? 'Active' : 'Draft',
            new Date(rec.created_at).toLocaleDateString(),
            rec.template_data?.field_count || Object.keys(rec.template_data?.template_fields || {}).length || 0
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    extractContentData(content) {
        // FIX: Better data extraction with validation
        if (!content) {
            throw new Error('Content data is required');
        }

        return {
            id: content.id || content.tmdb_id || content.mal_id,
            title: content.title || content.name || 'Unknown Title',
            original_title: content.original_title || content.original_name || content.title || content.name,
            content_type: content.content_type || content.media_type || 'movie',
            genres: content.genre_ids || content.genres || [],
            languages: content.original_language ? [content.original_language] : ['en'],
            release_date: content.release_date || content.first_air_date,
            runtime: content.runtime,
            rating: content.vote_average || content.rating || 0,
            vote_count: content.vote_count || 0,
            popularity: content.popularity || 0,
            overview: content.overview || '',
            poster_path: content.poster_path,
            backdrop_path: content.backdrop_path,
            source: content.source || this.elements.searchSource?.value || 'tmdb'
        };
    }

    setupLazyLoadingForCards(container = null) {
        const cards = container?.querySelectorAll('.content-card img[data-src]');
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
}

// Initialize and expose globally
window.recUpcoming = null;
window.templateManager = null;