// assets/js/support/feedback.js

class CineBrainFeedbackForm {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.form = null;
        this.submitBtn = null;
        this.isSubmitting = false;
        this.currentRating = 0;

        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupFormValidation();
        this.setupStarRating();
        this.setupFeedbackTypes();

        // Auto-fill user info if logged in
        await this.loadUserInfo();
    }

    setupElements() {
        this.form = document.getElementById('feedbackForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.successDiv = document.getElementById('formSuccess');

        // Form fields
        this.nameField = document.getElementById('name');
        this.emailField = document.getElementById('email');
        this.categoryField = document.getElementById('category');
        this.feedbackField = document.getElementById('feedback');
        this.ratingInput = document.getElementById('rating');
        this.ratingLabel = document.getElementById('ratingLabel');

        // Star rating elements
        this.stars = document.querySelectorAll('.star');

        // Feedback type elements
        this.feedbackTypes = document.querySelectorAll('.feedback-type');
    }

    async loadUserInfo() {
        try {
            const token = localStorage.getItem('cinebrain_token');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/users/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    // Auto-fill name and email if available
                    if (data.user.username && !this.nameField.value) {
                        this.nameField.value = data.user.username;
                    }
                    if (data.user.email && !this.emailField.value) {
                        this.emailField.value = data.user.email;
                    }
                }
            }
        } catch (error) {
            console.warn('Could not load user info:', error);
        }
    }

    setupStarRating() {
        const ratingLabels = {
            1: 'Poor - Needs significant improvement',
            2: 'Fair - Below expectations',
            3: 'Good - Meets expectations',
            4: 'Very Good - Exceeds expectations',
            5: 'Excellent - Outstanding experience'
        };

        this.stars.forEach(star => {
            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.dataset.rating);
                this.highlightStars(rating);
                this.ratingLabel.textContent = ratingLabels[rating];
            });

            star.addEventListener('mouseleave', () => {
                this.highlightStars(this.currentRating);
                if (this.currentRating > 0) {
                    this.ratingLabel.textContent = ratingLabels[this.currentRating];
                } else {
                    this.ratingLabel.textContent = 'Click to rate your experience';
                }
            });

            star.addEventListener('click', () => {
                this.currentRating = parseInt(star.dataset.rating);
                this.ratingInput.value = this.currentRating;
                this.highlightStars(this.currentRating);
                this.ratingLabel.textContent = ratingLabels[this.currentRating];

                // Track rating selection
                if (window.gtag) {
                    gtag('event', 'feedback_rating_selected', {
                        'event_category': 'engagement',
                        'event_label': 'rating',
                        'value': this.currentRating
                    });
                }
            });
        });
    }

    highlightStars(rating) {
        this.stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    setupFeedbackTypes() {
        this.feedbackTypes.forEach(type => {
            type.addEventListener('click', () => {
                // Remove active class from all types
                this.feedbackTypes.forEach(t => t.classList.remove('active'));

                // Add active class to clicked type
                type.classList.add('active');

                // Set corresponding category
                const typeValue = type.dataset.type;
                const categoryMapping = {
                    'general': 'general',
                    'recommendations': 'recommendations',
                    'feature': 'feature-request',
                    'content': 'content'
                };

                if (categoryMapping[typeValue]) {
                    this.categoryField.value = categoryMapping[typeValue];
                }

                // Update placeholder based on type
                this.updatePlaceholderText(typeValue);

                // Track feedback type selection
                if (window.gtag) {
                    gtag('event', 'feedback_type_selected', {
                        'event_category': 'engagement',
                        'event_label': typeValue
                    });
                }
            });
        });
    }

    updatePlaceholderText(type) {
        const placeholders = {
            'general': 'Share your overall experience with CineBrain. What do you love? What could be better? Your insights help us improve.',
            'recommendations': 'Tell us about your AI recommendation experience. Are the suggestions accurate? What genres or content types work best for you?',
            'feature': 'Describe the feature you\'d like to see in CineBrain. How would it work? What problem would it solve for you?',
            'content': 'Let us know about missing content, incorrect information, or content you\'d like to see added to CineBrain.'
        };

        if (placeholders[type]) {
            this.feedbackField.placeholder = placeholders[type];
        }
    }

    setupEventListeners() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));

        // Real-time validation for required fields
        this.categoryField.addEventListener('change', () => this.validateField(this.categoryField));
        this.feedbackField.addEventListener('blur', () => this.validateField(this.feedbackField));
        this.feedbackField.addEventListener('input', () => {
            this.clearFieldError(this.feedbackField);
            this.updateCharacterCounter();
        });

        // Email validation if provided
        this.emailField.addEventListener('blur', () => {
            if (this.emailField.value.trim()) {
                this.validateField(this.emailField);
            }
        });
        this.emailField.addEventListener('input', () => this.clearFieldError(this.emailField));

        // Character counter setup
        this.setupCharacterCounter();
    }

    setupCharacterCounter() {
        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.innerHTML = '<span id="feedbackCounter">0</span>/2000 characters';
        this.feedbackField.parentNode.appendChild(counter);

        this.counterSpan = document.getElementById('feedbackCounter');
        this.updateCharacterCounter();
    }

    updateCharacterCounter() {
        const length = this.feedbackField.value.length;
        this.counterSpan.textContent = length;

        const counter = this.counterSpan.parentNode;
        if (length > 1800) {
            counter.style.color = '#ef4444';
        } else if (length > 1500) {
            counter.style.color = '#f59e0b';
        } else {
            counter.style.color = 'var(--text-muted)';
        }
    }

    setupFormValidation() {
        // Add CSS classes for validation states
        const style = document.createElement('style');
        style.textContent = `
            .form-field-error {
                border-color: #ef4444 !important;
                box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1) !important;
            }
            .field-error-message {
                color: #ef4444;
                font-size: 0.875rem;
                margin-top: 0.25rem;
                display: block;
            }
            .character-counter {
                color: var(--text-muted);
                font-size: 0.75rem;
                text-align: right;
                margin-top: 0.25rem;
            }
            .feedback-type.active {
                border-color: #113CCF;
                background-color: rgba(17, 60, 207, 0.05);
                transform: translateY(-2px);
            }
            .star.active {
                fill: #fbbf24;
                stroke: #f59e0b;
            }
            .star:hover {
                fill: #fde047;
                stroke: #eab308;
                cursor: pointer;
            }
            .submit-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .submit-btn.loading {
                position: relative;
                color: transparent;
            }
            .submit-btn.loading::after {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                top: 50%;
                left: 50%;
                margin-left: -8px;
                margin-top: -8px;
                border: 2px solid #ffffff;
                border-radius: 50%;
                border-top-color: transparent;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .form-success.show {
                display: block !important;
                animation: slideInUp 0.5s ease-out;
            }
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .checkbox-group {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 0.5rem;
                margin-top: 0.5rem;
            }
            .checkbox-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                border-radius: 0.375rem;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .checkbox-item:hover {
                background-color: rgba(17, 60, 207, 0.05);
            }
            .checkbox-item input[type="checkbox"] {
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Remove existing error
        this.clearFieldError(field);

        switch (field.id) {
            case 'email':
                if (value && !this.isValidEmail(value)) {
                    errorMessage = 'Please enter a valid email address';
                    isValid = false;
                }
                break;

            case 'category':
                if (!value) {
                    errorMessage = 'Please select a feedback category';
                    isValid = false;
                }
                break;

            case 'feedback':
                if (!value) {
                    errorMessage = 'Please share your feedback';
                    isValid = false;
                } else if (value.length < 10) {
                    errorMessage = 'Please provide at least 10 characters of feedback';
                    isValid = false;
                } else if (value.length > 2000) {
                    errorMessage = 'Feedback must be less than 2000 characters';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    showFieldError(field, message) {
        field.classList.add('form-field-error');

        const errorElement = document.createElement('span');
        errorElement.className = 'field-error-message';
        errorElement.textContent = message;
        field.parentNode.appendChild(errorElement);
    }

    clearFieldError(field) {
        field.classList.remove('form-field-error');
        const errorMessage = field.parentNode.querySelector('.field-error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    validateForm() {
        let isValid = true;

        // Validate required fields
        if (!this.validateField(this.categoryField)) {
            isValid = false;
        }
        if (!this.validateField(this.feedbackField)) {
            isValid = false;
        }

        // Validate email if provided
        if (this.emailField.value.trim() && !this.validateField(this.emailField)) {
            isValid = false;
        }

        return isValid;
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (this.isSubmitting) return;

        // Validate form
        if (!this.validateForm()) {
            this.scrollToFirstError();
            return;
        }

        this.isSubmitting = true;
        this.setLoadingState(true);

        try {
            const formData = this.getFormData();

            // Use contact endpoint for feedback (or create specific feedback endpoint)
            const response = await fetch(`${this.apiBase}/support/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('cinebrain_token') && {
                        'Authorization': `Bearer ${localStorage.getItem('cinebrain_token')}`
                    })
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(data);
                this.resetForm();

                // Track successful submission
                if (window.gtag) {
                    gtag('event', 'feedback_form_submit', {
                        'event_category': 'engagement',
                        'event_label': formData.subject,
                        'value': this.currentRating
                    });
                }

            } else {
                this.handleError(response.status, data);
            }
        } catch (error) {
            console.error('Feedback form submission error:', error);
            this.showError('Network error. Please check your connection and try again.');
        } finally {
            this.isSubmitting = false;
            this.setLoadingState(false);
        }
    }

    getFormData() {
        // Get selected aspects
        const aspectsCheckboxes = document.querySelectorAll('input[name="aspects[]"]:checked');
        const selectedAspects = Array.from(aspectsCheckboxes).map(cb => cb.value);

        // Create subject based on category and rating
        const categoryText = this.categoryField.options[this.categoryField.selectedIndex].text;
        const ratingText = this.currentRating > 0 ? ` (${this.currentRating}★)` : '';
        const subject = `Feedback: ${categoryText}${ratingText}`;

        // Build comprehensive message
        let message = this.feedbackField.value.trim();

        if (this.currentRating > 0) {
            message = `Overall Rating: ${this.currentRating}/5 stars\n\n${message}`;
        }

        if (selectedAspects.length > 0) {
            message += `\n\nImportant aspects: ${selectedAspects.join(', ')}`;
        }

        message += '\n\n[Submitted via CineBrain Feedback Form]';

        return {
            name: this.nameField.value.trim() || 'Anonymous',
            email: this.emailField.value.trim() || 'feedback@user.anonymous',
            subject: subject,
            message: message,
            priority: 'normal' // Feedback is typically normal priority
        };
    }

    handleError(status, data) {
        let errorMessage = 'Something went wrong. Please try again.';

        switch (status) {
            case 400:
                errorMessage = 'Invalid feedback data. Please check your inputs.';
                break;
            case 429:
                errorMessage = 'Too much feedback sent recently. Please wait 15 minutes.';
                break;
            case 500:
                errorMessage = 'Server error. Our team has been notified.';
                break;
            default:
                errorMessage = data.error || errorMessage;
        }

        this.showError(errorMessage);
    }

    showSuccess(data) {
        const successContent = this.successDiv.querySelector('.success-content');
        if (successContent) {
            successContent.innerHTML = `
                <div class="success-title">Thank You for Your Feedback!</div>
                <div class="success-description">
                    Your feedback is valuable and helps make CineBrain better for everyone.
                    ${data.reference_number ? `<br><small>Reference: ${data.reference_number}</small>` : ''}
                </div>
            `;
        }

        this.successDiv.classList.add('show');
        this.successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Hide success message after 8 seconds
        setTimeout(() => {
            this.successDiv.classList.remove('show');
        }, 8000);
    }

    showError(message) {
        // Create error div if it doesn't exist
        let errorDiv = document.getElementById('formError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'formError';
            errorDiv.className = 'form-error';
            errorDiv.innerHTML = `
                <i data-feather="alert-circle"></i>
                <span id="errorMessage"></span>
            `;
            this.form.parentNode.insertBefore(errorDiv, this.form);
            feather.replace();
        }

        document.getElementById('errorMessage').textContent = message;
        errorDiv.style.display = 'flex';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Hide error after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    scrollToFirstError() {
        const firstError = document.querySelector('.form-field-error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    setLoadingState(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.classList.add('loading');
            this.submitBtn.innerHTML = '<i data-feather="loader"></i> Submitting...';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.classList.remove('loading');
            this.submitBtn.innerHTML = '<i data-feather="send"></i> Submit Feedback';
        }

        // Refresh feather icons
        feather.replace();
    }

    resetForm() {
        this.form.reset();

        // Reset star rating
        this.currentRating = 0;
        this.ratingInput.value = '';
        this.ratingLabel.textContent = 'Click to rate your experience';
        this.highlightStars(0);

        // Reset feedback types
        this.feedbackTypes.forEach(type => type.classList.remove('active'));

        // Reset character counter
        if (this.counterSpan) {
            this.counterSpan.textContent = '0';
            this.counterSpan.parentNode.style.color = 'var(--text-muted)';
        }

        // Clear all field errors
        document.querySelectorAll('.form-field-error').forEach(field => {
            this.clearFieldError(field);
        });

        // Reset placeholder
        this.feedbackField.placeholder = 'Please share your thoughts, suggestions, or any issues you\'ve encountered. Be as detailed as possible to help us understand and improve.';

        // Re-load user info
        this.loadUserInfo();
    }
}

// Initialize feedback form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the feedback page
    if (document.getElementById('feedbackForm')) {
        new CineBrainFeedbackForm();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainFeedbackForm;
}