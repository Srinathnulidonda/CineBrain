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
        this.autoSaveInterval = null;
        this.lastAutoSave = null;

        this.init();
    }

    getContentSlugFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('content') || '';
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
            console.log('Initializing review write page...');
            console.log('Content slug:', this.contentSlug);
            console.log('Is authenticated:', this.isAuthenticated);

            // Check authentication
            if (!this.isAuthenticated) {
                console.log('User not authenticated, redirecting to login');
                this.redirectToLogin();
                return;
            }

            if (!this.contentSlug) {
                console.log('No content slug found');
                this.showError('No content specified for review');
                this.hideLoader();
                return;
            }

            await this.loadContentData();
            this.setupEventListeners();
            this.setupFormValidation();
            this.loadDraftIfExists();
            this.startAutoSave();

            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            this.hideLoader();
            console.log('Review write page initialized successfully');

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
        console.log('Loading content data from:', url);

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            console.log('Content API response status:', response.status);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Content not found');
                } else if (response.status === 401) {
                    this.redirectToLogin();
                    return;
                }
                throw new Error(`Failed to load content (${response.status})`);
            }

            this.contentData = await response.json();
            console.log('Content data loaded:', this.contentData);

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

        console.log('Rendering content info for:', data.title);

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
        console.log('Setting up event listeners...');

        // Back button
        const backBtn = document.getElementById('backToContent');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.handleBackNavigation();
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

        // Form inputs with real-time validation
        this.setupFormInputs();

        // Action buttons
        this.setupActionButtons();

        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.formChanged && !this.isDraftSaved) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });

        // Auto-save on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.formChanged) {
                this.saveDraft(true); // Silent save
            }
        });
    }

    setupRatingStars() {
        const starsContainer = document.getElementById('ratingStars');
        const ratingDisplay = document.getElementById('selectedRating');

        if (!starsContainer) return;

        console.log('Setting up rating stars...');

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
                this.triggerAutoSave();
                console.log('Rating selected:', i);

                // Add visual feedback
                star.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    star.style.transform = '';
                }, 150);
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

        // Title input with real-time validation
        if (titleInput && titleCounter) {
            titleInput.addEventListener('input', () => {
                const length = titleInput.value.length;
                titleCounter.textContent = length;

                const counterParent = titleCounter.parentElement;
                counterParent.classList.remove('warning', 'danger');
                if (length > 80) counterParent.classList.add('warning');
                if (length > 95) counterParent.classList.add('danger');

                this.formChanged = true;
                this.validateForm();
                this.triggerAutoSave();
            });

            // Real-time validation feedback
            titleInput.addEventListener('blur', () => {
                this.validateTitleField();
            });
        }

        // Text input with real-time validation and auto-resize
        if (textInput && textCounter) {
            let inputTimeout;

            textInput.addEventListener('input', () => {
                const length = textInput.value.length;
                textCounter.textContent = length;

                const counterParent = textCounter.parentElement;
                counterParent.classList.remove('warning', 'danger');
                if (length > 1600) counterParent.classList.add('warning');
                if (length > 1900) counterParent.classList.add('danger');

                this.formChanged = true;
                this.validateForm();

                // Auto-resize textarea
                textInput.style.height = 'auto';
                textInput.style.height = textInput.scrollHeight + 'px';

                // Debounced auto-save
                clearTimeout(inputTimeout);
                inputTimeout = setTimeout(() => {
                    this.triggerAutoSave();
                }, 1000);
            });

            // Real-time validation feedback
            textInput.addEventListener('blur', () => {
                this.validateTextField();
            });

            // Initial resize
            textInput.style.height = 'auto';
            textInput.style.height = textInput.scrollHeight + 'px';
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
                    this.triggerAutoSave();
                });
            }
        });
    }

    setupActionButtons() {
        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.handleBackNavigation();
            });
        }

        // Save draft button
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => {
                this.saveDraft(false); // Manual save with feedback
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

        // Update submit button text with better feedback
        const submitText = submitBtn.querySelector('span');
        if (submitText) {
            if (!hasRating && !hasText) {
                submitText.textContent = 'Rate & Write Review';
            } else if (!hasRating) {
                submitText.textContent = 'Select Rating';
            } else if (!hasText) {
                submitText.textContent = 'Write Review (min 10 chars)';
            } else {
                submitText.textContent = 'Submit Review';
            }
        }

        return isValid;
    }

    validateTitleField() {
        const titleInput = document.getElementById('reviewTitle');
        if (!titleInput) return true;

        const title = titleInput.value.trim();
        titleInput.classList.remove('error');

        if (title.length > 100) {
            titleInput.classList.add('error');
            return false;
        }

        return true;
    }

    validateTextField() {
        const textInput = document.getElementById('reviewText');
        if (!textInput) return false;

        const text = textInput.value.trim();
        textInput.classList.remove('error');

        if (text.length < 10) {
            textInput.classList.add('error');
            return false;
        }

        if (text.length > 2000) {
            textInput.classList.add('error');
            return false;
        }

        return true;
    }

    handleBackNavigation() {
        if (this.formChanged && !this.isDraftSaved) {
            this.showConfirmation(
                'Unsaved Changes',
                'You have unsaved changes. Do you want to save as draft before leaving?',
                () => {
                    this.saveDraft(false).then(() => {
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
    }

    async handleSubmit() {
        console.log('Handling form submission...');

        if (!this.validateFormData()) {
            console.log('Form validation failed');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        const form = document.getElementById('reviewForm');

        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                const originalHTML = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i data-feather="loader"></i><span>Submitting...</span>';

                // Animate loader
                const loader = submitBtn.querySelector('[data-feather="loader"]');
                if (loader) {
                    loader.style.animation = 'spin 1s linear infinite';
                }
            }
            if (form) {
                form.classList.add('loading');
            }

            const reviewData = this.getFormData();
            console.log('Submitting review data:', reviewData);

            // Use the correct API endpoint that matches backend route
            const url = `${this.apiBase}/details/${encodeURIComponent(this.contentSlug)}/reviews`;
            console.log('POST to:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(reviewData)
            });

            console.log('Review submission response status:', response.status);
            const result = await response.json();
            console.log('Review submission result:', result);

            if (response.ok && result.success) {
                // Clear draft and form state
                this.clearDraft();
                this.formChanged = false;
                this.stopAutoSave();

                // Show success with auto-approval info
                const message = result.auto_approved ?
                    'Review published successfully!' :
                    'Review submitted for moderation';

                console.log('Review submitted successfully, ID:', result.review_id);
                this.showSuccessModal(message);

                // If auto-approved, refresh the parent page's reviews
                if (result.auto_approved && window.opener) {
                    try {
                        if (window.opener.detailsPage && window.opener.detailsPage.refreshReviews) {
                            window.opener.detailsPage.refreshReviews();
                        }
                    } catch (e) {
                        console.log('Could not refresh parent page reviews');
                    }
                }
            } else {
                throw new Error(result.error || result.message || 'Failed to submit review');
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            let errorMessage = 'Failed to submit review';

            if (error.message.includes('401')) {
                errorMessage = 'Please log in again to submit your review';
                setTimeout(() => this.redirectToLogin(), 2000);
            } else if (error.message.includes('404')) {
                errorMessage = 'Content not found';
            } else if (error.message.includes('already reviewed')) {
                errorMessage = 'You have already reviewed this content';
            } else {
                errorMessage = error.message || errorMessage;
            }

            this.showToast(errorMessage, 'error');

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
        const titleInput = document.getElementById('reviewTitle');

        // Validate review text
        if (!textInput || textInput.value.trim().length < 10) {
            this.showToast('Review text must be at least 10 characters', 'warning');
            textInput?.focus();
            textInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        if (textInput.value.trim().length > 2000) {
            this.showToast('Review text must be less than 2000 characters', 'warning');
            textInput?.focus();
            return false;
        }

        // Validate rating
        if (this.selectedRating === 0) {
            this.showToast('Please select a rating', 'warning');
            document.getElementById('ratingStars')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        // Validate title length if provided
        if (titleInput && titleInput.value.trim().length > 100) {
            this.showToast('Review title must be less than 100 characters', 'warning');
            titleInput.focus();
            return false;
        }

        return true;
    }

    getFormData() {
        const titleInput = document.getElementById('reviewTitle');
        const textInput = document.getElementById('reviewText');
        const spoilerCheckbox = document.getElementById('spoilerWarning');

        return {
            rating: this.selectedRating,
            title: titleInput?.value.trim() || null,
            review_text: textInput?.value.trim() || '',
            has_spoilers: spoilerCheckbox?.checked || false
        };
    }

    // Auto-save functionality
    startAutoSave() {
        // Auto-save every 30 seconds if there are changes
        this.autoSaveInterval = setInterval(() => {
            if (this.formChanged && !this.isDraftSaved) {
                this.saveDraft(true); // Silent auto-save
            }
        }, 30000);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    triggerAutoSave() {
        // Trigger auto-save after 3 seconds of inactivity
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            if (this.formChanged) {
                this.saveDraft(true);
            }
        }, 3000);
    }

    async saveDraft(silent = false) {
        const saveDraftBtn = document.getElementById('saveDraftBtn');

        try {
            if (!silent && saveDraftBtn) {
                saveDraftBtn.disabled = true;
                saveDraftBtn.innerHTML = '<i data-feather="loader"></i>Saving...';
            }

            const draftData = {
                content_slug: this.contentSlug,
                form_data: this.getFormData(),
                timestamp: new Date().toISOString(),
                user_id: this.currentUser?.id
            };

            localStorage.setItem(`review_draft_${this.contentSlug}`, JSON.stringify(draftData));

            this.isDraftSaved = true;
            this.lastAutoSave = new Date();

            if (!silent) {
                this.showToast('Draft saved successfully', 'success');
            }
            console.log('Draft saved for:', this.contentSlug);

        } catch (error) {
            console.error('Error saving draft:', error);
            if (!silent) {
                this.showToast('Failed to save draft', 'error');
            }
        } finally {
            if (!silent && saveDraftBtn) {
                saveDraftBtn.disabled = false;
                saveDraftBtn.innerHTML = '<i data-feather="save"></i>Save Draft';
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }
        }
    }

    loadDraftIfExists() {
        try {
            const draftData = localStorage.getItem(`review_draft_${this.contentSlug}`);
            if (!draftData) return;

            console.log('Loading draft for:', this.contentSlug);
            const draft = JSON.parse(draftData);

            // Check if draft is from the same user
            if (draft.user_id && this.currentUser?.id && draft.user_id !== this.currentUser.id) {
                console.log('Draft from different user, clearing...');
                this.clearDraft();
                return;
            }

            const formData = draft.form_data;

            // Load rating
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

            // Load title
            const titleInput = document.getElementById('reviewTitle');
            if (titleInput && formData.title) {
                titleInput.value = formData.title;
                const titleCounter = document.getElementById('titleCharCount');
                if (titleCounter) titleCounter.textContent = formData.title.length;
            }

            // Load review text
            const textInput = document.getElementById('reviewText');
            if (textInput && formData.review_text) {
                textInput.value = formData.review_text;
                const textCounter = document.getElementById('textCharCount');
                if (textCounter) textCounter.textContent = formData.review_text.length;

                // Auto-resize
                textInput.style.height = 'auto';
                textInput.style.height = textInput.scrollHeight + 'px';
            }

            // Load spoiler warning
            const spoilerCheckbox = document.getElementById('spoilerWarning');
            if (spoilerCheckbox) {
                spoilerCheckbox.checked = formData.has_spoilers || false;
            }

            this.isDraftSaved = true;
            this.validateForm();

            // Show draft loaded message with timestamp
            const draftTime = new Date(draft.timestamp).toLocaleString();
            this.showToast(`Draft loaded from ${draftTime}`, 'info');

        } catch (error) {
            console.error('Error loading draft:', error);
            this.clearDraft(); // Clear corrupted draft
        }
    }

    clearDraft() {
        try {
            localStorage.removeItem(`review_draft_${this.contentSlug}`);
            this.isDraftSaved = false;
            console.log('Draft cleared for:', this.contentSlug);
        } catch (error) {
            console.error('Error clearing draft:', error);
        }
    }

    navigateBack() {
        // Stop auto-save before navigation
        this.stopAutoSave();

        if (this.contentData?.slug) {
            window.location.href = `/content/details.html?${encodeURIComponent(this.contentData.slug)}`;
        } else if (this.contentSlug) {
            window.location.href = `/content/details.html?${encodeURIComponent(this.contentSlug)}`;
        } else {
            window.history.back();
        }
    }

    showSuccessModal(message = 'Review submitted for moderation') {
        const modal = document.getElementById('successModal');
        const messageEl = modal?.querySelector('.success-message');

        if (messageEl) {
            messageEl.textContent = message;
        }

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
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
        if (this.currentConfirmHandler) {
            confirmBtn.removeEventListener('click', this.currentConfirmHandler);
        }

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
            // Enhanced fallback toast
            console.log(`Toast: ${message} (${type})`);

            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: ${type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : type === 'info' ? '#3498db' : '#28a745'};
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                z-index: 10000;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 300px;
                word-wrap: break-word;
                animation: slideInRight 0.3s ease-out;
            `;

            // Add animation styles
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);

            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                    if (style.parentNode) {
                        style.parentNode.removeChild(style);
                    }
                }, 300);
            }, type === 'error' ? 5000 : 3000);
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
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                        <a href="/" style="color: var(--cinebrain-primary); text-decoration: none; padding: 12px 24px; border: 1px solid var(--cinebrain-primary); border-radius: 8px;">Go Home</a>
                        <button onclick="window.history.back()" style="color: var(--text-secondary); background: transparent; border: 1px solid var(--nav-button-border); padding: 12px 24px; border-radius: 8px; cursor: pointer;">Go Back</button>
                    </div>
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
        console.log('DOM loaded, initializing review write page...');
        const reviewWritePage = new ReviewWritePage();
        window.reviewWritePage = reviewWritePage;
    } catch (error) {
        console.error('Failed to initialize review write page:', error);
    }
});