class ReviewWritePage {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.posterBase = 'https://image.tmdb.org/t/p/w500';
        this.contentSlug = this.getContentSlugFromUrl();
        this.contentData = null;
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;
        this.currentUser = this.getCurrentUser();
        this.selectedRating = 0;
        this.isDraftSaved = false;
        this.formChanged = false;

        this.init();
    }

    getContentSlugFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('content') || decodeURIComponent(window.location.search.substring(1));
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('cinebrain-user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }

    async init() {
        try {
            // Check authentication
            if (!this.isAuthenticated) {
                this.redirectToLogin();
                return;
            }

            if (!this.contentSlug) {
                this.showError('No content specified for review');
                this.hideLoader();
                return;
            }

            await this.loadContentData();
            this.setupEventListeners();
            this.setupFormValidation();
            this.loadDraftIfExists();

            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            this.hideLoader();

        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(error.message);
            this.hideLoader();
        }
    }

    redirectToLogin() {
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `/auth/login.html?redirect=${currentUrl}`;
    }

    async loadContentData() {
        const url = `${this.apiBase}/details/${encodeURIComponent(this.contentSlug)}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load content (${response.status})`);
            }

            this.contentData = await response.json();
            this.renderContentInfo();
            this.updatePageMeta();

        } catch (error) {
            console.error('Error loading content:', error);
            throw error;
        }
    }

    renderContentInfo() {
        const data = this.contentData;
        if (!data) return;

        // Update content poster
        const poster = document.getElementById('contentPoster');
        if (poster && data.poster_url) {
            const img = new Image();
            img.onload = () => {
                poster.src = img.src;
                poster.classList.add('loaded');
            };
            img.onerror = () => {
                poster.src = this.getPlaceholderImage();
                poster.classList.add('loaded');
            };
            img.src = data.poster_url;
            poster.alt = `${data.title} poster`;
        }

        // Update content type badge
        const typeBadge = document.getElementById('contentTypeBadge');
        if (typeBadge) {
            typeBadge.textContent = (data.content_type || 'movie').toUpperCase();
        }

        // Update content title
        this.updateElement('contentTitle', data.title);

        // Update content year and genres
        const year = data.metadata?.release_date ? new Date(data.metadata.release_date).getFullYear() : '';
        const genres = data.metadata?.genres?.slice(0, 3).join(', ') || '';

        this.updateElement('contentYear', year);
        this.updateElement('contentGenres', genres);

        // Update content rating
        if (data.ratings?.tmdb?.score) {
            this.updateElement('contentRating', data.ratings.tmdb.score.toFixed(1));
        }
    }

    updatePageMeta() {
        const data = this.contentData;
        if (!data) return;

        const title = `Write Review for ${data.title} - CineBrain`;
        const description = `Share your thoughts about ${data.title}. Write a detailed review to help other users discover great content.`;

        document.title = title;
        this.updateMetaTag('meta-title', 'content', title);
        this.updateMetaTag('meta-description', 'content', description);
        this.updateMetaTag('og-title', 'content', title);
        this.updateMetaTag('og-description', 'content', description);

        if (data.poster_url) {
            this.updateMetaTag('og-image', 'content', data.poster_url);
        }

        const canonicalUrl = window.location.href;
        this.updateMetaTag('canonical-url', 'href', canonicalUrl);
        this.updateMetaTag('og-url', 'content', canonicalUrl);
    }

    updateMetaTag(id, attribute, value) {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute(attribute, value);
        }
    }

    setupEventListeners() {
        // Back button
        const backBtn = document.getElementById('backToContent');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (this.formChanged && !this.isDraftSaved) {
                    this.showConfirmation(
                        'Unsaved Changes',
                        'You have unsaved changes. Do you want to save as draft before leaving?',
                        () => {
                            this.saveDraft().then(() => {
                                this.navigateBack();
                            });
                        },
                        () => {
                            this.navigateBack();
                        }
                    );
                } else {
                    this.navigateBack();
                }
            });
        }

        // Form submission
        const form = document.getElementById('reviewForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Rating stars
        this.setupRatingStars();

        // Form inputs
        this.setupFormInputs();

        // Action buttons
        this.setupActionButtons();

        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.formChanged && !this.isDraftSaved) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    setupRatingStars() {
        const starsContainer = document.getElementById('ratingStars');
        const ratingDisplay = document.getElementById('selectedRating');

        if (!starsContainer) return;

        // Generate 10 stars
        starsContainer.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const star = document.createElement('span');
            star.className = 'rating-star';
            star.innerHTML = '★';
            star.dataset.rating = i;
            star.setAttribute('role', 'button');
            star.setAttribute('aria-label', `${i} stars`);
            star.setAttribute('tabindex', '0');

            const selectStar = () => {
                this.selectedRating = i;
                if (ratingDisplay) ratingDisplay.textContent = i;

                starsContainer.querySelectorAll('.rating-star').forEach((s, index) => {
                    s.classList.toggle('active', index < i);
                });

                this.formChanged = true;
                this.validateForm();
            };

            star.addEventListener('click', selectStar);
            star.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectStar();
                }
            });

            star.addEventListener('mouseenter', () => {
                starsContainer.querySelectorAll('.rating-star').forEach((s, index) => {
                    s.classList.toggle('hover', index < i);
                });
            });

            starsContainer.appendChild(star);
        }

        starsContainer.addEventListener('mouseleave', () => {
            starsContainer.querySelectorAll('.rating-star').forEach(s => {
                s.classList.remove('hover');
            });
        });
    }

    setupFormInputs() {
        const titleInput = document.getElementById('reviewTitle');
        const textInput = document.getElementById('reviewText');
        const titleCounter = document.getElementById('titleCharCount');
        const textCounter = document.getElementById('textCharCount');

        // Title input
        if (titleInput && titleCounter) {
            titleInput.addEventListener('input', () => {
                const length = titleInput.value.length;
                titleCounter.textContent = length;
                titleCounter.parentElement.classList.toggle('warning', length > 80);
                titleCounter.parentElement.classList.toggle('danger', length > 95);
                this.formChanged = true;
                this.validateForm();
            });
        }

        // Text input
        if (textInput && textCounter) {
            textInput.addEventListener('input', () => {
                const length = textInput.value.length;
                textCounter.textContent = length;
                textCounter.parentElement.classList.toggle('warning', length > 1600);
                textCounter.parentElement.classList.toggle('danger', length > 1900);
                this.formChanged = true;
                this.validateForm();
            });

            // Auto-resize textarea
            textInput.addEventListener('input', () => {
                textInput.style.height = 'auto';
                textInput.style.height = textInput.scrollHeight + 'px';
            });
        }

        // Expand textarea button
        const expandBtn = document.getElementById('expandTextarea');
        if (expandBtn && textInput) {
            expandBtn.addEventListener('click', () => {
                textInput.classList.toggle('expanded');
                const icon = expandBtn.querySelector('svg');
                if (icon) {
                    const isExpanded = textInput.classList.contains('expanded');
                    icon.setAttribute('data-feather', isExpanded ? 'minimize' : 'maximize');
                    if (typeof feather !== 'undefined') {
                        feather.replace();
                    }
                }
            });
        }

        // Checkboxes
        const spoilerCheckbox = document.getElementById('spoilerWarning');
        const publicCheckbox = document.getElementById('publicReview');

        [spoilerCheckbox, publicCheckbox].forEach(checkbox => {
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.formChanged = true;
                });
            }
        });
    }

    setupActionButtons() {
        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (this.formChanged) {
                    this.showConfirmation(
                        'Cancel Review',
                        'Are you sure you want to cancel? All unsaved changes will be lost.',
                        () => {
                            this.navigateBack();
                        }
                    );
                } else {
                    this.navigateBack();
                }
            });
        }

        // Save draft button
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => {
                this.saveDraft();
            });
        }

        // Submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.handleSubmit();
            });
        }

        // Success modal back button
        const backFromSuccessBtn = document.getElementById('backToContentFromSuccess');
        if (backFromSuccessBtn) {
            backFromSuccessBtn.addEventListener('click', () => {
                this.navigateBack();
            });
        }
    }

    setupFormValidation() {
        this.validateForm();
    }

    validateForm() {
        const textInput = document.getElementById('reviewText');
        const submitBtn = document.getElementById('submitBtn');

        if (!textInput || !submitBtn) return;

        const hasText = textInput.value.trim().length >= 10;
        const hasRating = this.selectedRating > 0;

        const isValid = hasText && hasRating;

        submitBtn.disabled = !isValid;
        submitBtn.classList.toggle('disabled', !isValid);

        // Update submit button text
        const submitText = submitBtn.querySelector('span');
        if (submitText) {
            if (!hasRating) {
                submitText.textContent = 'Select Rating';
            } else if (!hasText) {
                submitText.textContent = 'Write Review';
            } else {
                submitText.textContent = 'Submit Review';
            }
        }
    }

    async handleSubmit() {
        if (!this.validateFormData()) return;

        const submitBtn = document.getElementById('submitBtn');
        const form = document.getElementById('reviewForm');

        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i data-feather="loader"></i><span>Submitting...</span>';
            }
            if (form) {
                form.classList.add('loading');
            }

            const reviewData = this.getFormData();

            const response = await fetch(`${this.apiBase}/details/${encodeURIComponent(this.contentSlug)}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(reviewData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Clear draft
                this.clearDraft();
                this.formChanged = false;

                // Show success modal
                this.showSuccessModal();
            } else {
                throw new Error(result.message || 'Failed to submit review');
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            this.showToast(error.message || 'Failed to submit review', 'error');
        } finally {
            // Reset button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-feather="send"></i><span>Submit Review</span>';
            }
            if (form) {
                form.classList.remove('loading');
            }
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    validateFormData() {
        const textInput = document.getElementById('reviewText');

        if (!textInput || textInput.value.trim().length < 10) {
            this.showToast('Review text must be at least 10 characters', 'warning');
            textInput?.focus();
            return false;
        }

        if (this.selectedRating === 0) {
            this.showToast('Please select a rating', 'warning');
            document.getElementById('ratingStars')?.scrollIntoView({ behavior: 'smooth' });
            return false;
        }

        return true;
    }

    getFormData() {
        const titleInput = document.getElementById('reviewTitle');
        const textInput = document.getElementById('reviewText');
        const spoilerCheckbox = document.getElementById('spoilerWarning');
        const publicCheckbox = document.getElementById('publicReview');

        return {
            rating: this.selectedRating,
            title: titleInput?.value.trim() || '',
            review_text: textInput?.value.trim() || '',
            has_spoilers: spoilerCheckbox?.checked || false,
            is_public: publicCheckbox?.checked || true
        };
    }

    async saveDraft() {
        const saveDraftBtn = document.getElementById('saveDraftBtn');

        try {
            if (saveDraftBtn) {
                saveDraftBtn.disabled = true;
                saveDraftBtn.innerHTML = '<i data-feather="loader"></i>Saving...';
            }

            const draftData = {
                content_slug: this.contentSlug,
                form_data: this.getFormData(),
                timestamp: new Date().toISOString()
            };

            localStorage.setItem(`review_draft_${this.contentSlug}`, JSON.stringify(draftData));

            this.isDraftSaved = true;
            this.showToast('Draft saved successfully', 'success');

        } catch (error) {
            console.error('Error saving draft:', error);
            this.showToast('Failed to save draft', 'error');
        } finally {
            if (saveDraftBtn) {
                saveDraftBtn.disabled = false;
                saveDraftBtn.innerHTML = '<i data-feather="save"></i>Save Draft';
            }
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    loadDraftIfExists() {
        try {
            const draftData = localStorage.getItem(`review_draft_${this.contentSlug}`);
            if (!draftData) return;

            const draft = JSON.parse(draftData);
            const formData = draft.form_data;

            // Load form data
            if (formData.rating) {
                this.selectedRating = formData.rating;
                const ratingDisplay = document.getElementById('selectedRating');
                if (ratingDisplay) ratingDisplay.textContent = formData.rating;

                const starsContainer = document.getElementById('ratingStars');
                if (starsContainer) {
                    starsContainer.querySelectorAll('.rating-star').forEach((star, index) => {
                        star.classList.toggle('active', index < formData.rating);
                    });
                }
            }

            const titleInput = document.getElementById('reviewTitle');
            if (titleInput && formData.title) {
                titleInput.value = formData.title;
                document.getElementById('titleCharCount').textContent = formData.title.length;
            }

            const textInput = document.getElementById('reviewText');
            if (textInput && formData.review_text) {
                textInput.value = formData.review_text;
                document.getElementById('textCharCount').textContent = formData.review_text.length;
            }

            const spoilerCheckbox = document.getElementById('spoilerWarning');
            if (spoilerCheckbox) {
                spoilerCheckbox.checked = formData.has_spoilers || false;
            }

            const publicCheckbox = document.getElementById('publicReview');
            if (publicCheckbox) {
                publicCheckbox.checked = formData.is_public !== false;
            }

            this.isDraftSaved = true;
            this.validateForm();

            // Show draft loaded message
            this.showToast('Draft loaded', 'info');

        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }

    clearDraft() {
        try {
            localStorage.removeItem(`review_draft_${this.contentSlug}`);
            this.isDraftSaved = false;
        } catch (error) {
            console.error('Error clearing draft:', error);
        }
    }

    navigateBack() {
        if (this.contentData?.slug) {
            window.location.href = `/content/details.html?${encodeURIComponent(this.contentData.slug)}`;
        } else {
            window.history.back();
        }
    }

    showSuccessModal() {
        const modal = new bootstrap.Modal(document.getElementById('successModal'));
        modal.show();
    }

    showConfirmation(title, message, onConfirm, onCancel = null) {
        const modal = document.getElementById('confirmationModal');
        const titleEl = document.getElementById('confirmationTitle');
        const messageEl = document.getElementById('confirmationMessage');
        const confirmBtn = document.getElementById('confirmAction');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        const handleConfirm = () => {
            if (onConfirm) onConfirm();
            bootstrap.Modal.getInstance(modal)?.hide();
        };

        const handleCancel = () => {
            if (onCancel) onCancel();
            bootstrap.Modal.getInstance(modal)?.hide();
        };

        // Remove existing listeners
        confirmBtn.removeEventListener('click', this.currentConfirmHandler);

        // Add new listeners
        this.currentConfirmHandler = handleConfirm;
        confirmBtn.addEventListener('click', this.currentConfirmHandler);

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            if (onCancel) onCancel();
        }, { once: true });
    }

    hideLoader() {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.classList.add('hidden');
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                }, 300);
            }, 200);
        }
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value || '';
        }
    }

    showToast(message, type = 'success') {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            console.log(`Toast: ${message} (${type})`);
        }
    }

    showError(message) {
        const container = document.querySelector('#main-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px; min-height: 400px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <i data-feather="alert-circle" style="width: 64px; height: 64px; color: var(--text-secondary); margin-bottom: 16px;"></i>
                    <h2 style="color: var(--text-primary); margin-bottom: 8px;">Error</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">${this.escapeHtml(message)}</p>
                    <a href="/" style="color: var(--cinebrain-primary); text-decoration: none; padding: 12px 24px; border: 1px solid var(--cinebrain-primary); border-radius: 8px;">Go Home</a>
                </div>
            `;

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        const reviewWritePage = new ReviewWritePage();
        window.reviewWritePage = reviewWritePage;
    } catch (error) {
        console.error('Failed to initialize review write page:', error);
    }
}); 