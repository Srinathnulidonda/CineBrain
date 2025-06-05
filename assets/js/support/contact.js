// assets/js/support/contact.js

class CineBrainContactForm {
    constructor() {
        this.apiBase = window.CineBrainConfig?.apiBase || 'https://cinebrain.onrender.com/api';
        this.form = null;
        this.submitBtn = null;
        this.isSubmitting = false;

        this.init();
    }

    async init() {
        this.setupElements();
        this.loadSupportCategories();
        this.setupEventListeners();
        this.setupFormValidation();

        // Auto-fill user info if logged in
        await this.loadUserInfo();
    }

    setupElements() {
        this.form = document.getElementById('contactForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.successDiv = document.getElementById('formSuccess');
        this.errorDiv = document.getElementById('formError');
        this.errorMessage = document.getElementById('errorMessage');

        // Form fields
        this.nameField = document.getElementById('name');
        this.emailField = document.getElementById('email');
        this.subjectField = document.getElementById('subject');
        this.priorityField = document.getElementById('priority');
        this.messageField = document.getElementById('message');
    }

    async loadSupportCategories() {
        try {
            const response = await fetch(`${this.apiBase}/support/categories`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateSubjectDropdown(data.categories || []);
            } else {
                // Fallback to default categories
                this.populateSubjectDropdown(this.getDefaultCategories());
            }
        } catch (error) {
            console.warn('Failed to load support categories:', error);
            this.populateSubjectDropdown(this.getDefaultCategories());
        }
    }

    getDefaultCategories() {
        return [
            { id: 1, name: 'Account & Login', description: 'Issues with account creation, login, password reset' },
            { id: 2, name: 'Technical Issues', description: 'App crashes, loading issues, performance problems' },
            { id: 3, name: 'Features & Functions', description: 'How to use features, feature requests' },
            { id: 4, name: 'Content & Recommendations', description: 'Issues with movies, shows, recommendations' },
            { id: 5, name: 'General Support', description: 'Other questions and general inquiries' }
        ];
    }

    populateSubjectDropdown(categories) {
        // Clear existing options except the first one
        this.subjectField.innerHTML = '<option value="">Select a topic</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = `${category.icon || '📝'} ${category.name}`;
            option.title = category.description || '';
            this.subjectField.appendChild(option);
        });

        // Add custom options
        const customOptions = [
            { value: 'Partnership Inquiry', text: '🤝 Partnership Inquiry' },
            { value: 'Business Collaboration', text: '💼 Business Collaboration' },
            { value: 'Media Inquiry', text: '📰 Media Inquiry' },
            { value: 'Feature Request', text: '💡 Feature Request' },
            { value: 'Bug Report', text: '🐛 Bug Report' },
            { value: 'Other', text: '📋 Other' }
        ];

        customOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            this.subjectField.appendChild(option);
        });
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

    setupEventListeners() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));

        // Real-time validation
        [this.nameField, this.emailField, this.subjectField, this.messageField].forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });

        // Character counter for message
        this.setupCharacterCounter();

        // Email validation
        this.emailField.addEventListener('input', this.validateEmail.bind(this));
    }

    setupCharacterCounter() {
        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.innerHTML = '<span id="messageCounter">0</span>/2000 characters';
        this.messageField.parentNode.appendChild(counter);

        const counterSpan = document.getElementById('messageCounter');

        this.messageField.addEventListener('input', () => {
            const length = this.messageField.value.length;
            counterSpan.textContent = length;

            if (length > 1900) {
                counter.style.color = '#ef4444';
            } else if (length > 1500) {
                counter.style.color = '#f59e0b';
            } else {
                counter.style.color = 'var(--text-muted)';
            }
        });
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
            .form-success, .form-error {
                padding: 1rem;
                border-radius: 0.5rem;
                margin-bottom: 1.5rem;
                display: none;
                align-items: center;
                gap: 0.5rem;
            }
            .form-success {
                background-color: rgba(34, 197, 94, 0.1);
                border: 1px solid rgba(34, 197, 94, 0.3);
                color: #22c55e;
            }
            .form-error {
                background-color: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #ef4444;
            }
            .contact-form .form-group {
                margin-bottom: 1.5rem;
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
            case 'name':
                if (!value) {
                    errorMessage = 'Name is required';
                    isValid = false;
                } else if (value.length < 2) {
                    errorMessage = 'Name must be at least 2 characters';
                    isValid = false;
                } else if (value.length > 100) {
                    errorMessage = 'Name must be less than 100 characters';
                    isValid = false;
                }
                break;

            case 'email':
                if (!value) {
                    errorMessage = 'Email is required';
                    isValid = false;
                } else if (!this.isValidEmail(value)) {
                    errorMessage = 'Please enter a valid email address';
                    isValid = false;
                } else if (value.length > 255) {
                    errorMessage = 'Email must be less than 255 characters';
                    isValid = false;
                }
                break;

            case 'subject':
                if (!value) {
                    errorMessage = 'Please select a topic';
                    isValid = false;
                }
                break;

            case 'message':
                if (!value) {
                    errorMessage = 'Message is required';
                    isValid = false;
                } else if (value.length < 10) {
                    errorMessage = 'Message must be at least 10 characters';
                    isValid = false;
                } else if (value.length > 2000) {
                    errorMessage = 'Message must be less than 2000 characters';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    validateEmail() {
        this.validateField(this.emailField);
    }

    isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    showFieldError(field, message) {
        field.classList.add('form-field-error');

        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error-message');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
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

        [this.nameField, this.emailField, this.subjectField, this.messageField].forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (this.isSubmitting) return;

        // Hide previous messages
        this.hideMessages();

        // Validate form
        if (!this.validateForm()) {
            this.showError('Please correct the errors above and try again.');
            return;
        }

        this.isSubmitting = true;
        this.setLoadingState(true);

        try {
            const formData = this.getFormData();
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
                    gtag('event', 'contact_form_submit', {
                        'event_category': 'engagement',
                        'event_label': formData.subject
                    });
                }

                // Auto-scroll to success message
                this.successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

            } else {
                this.handleError(response.status, data);
            }
        } catch (error) {
            console.error('Contact form submission error:', error);
            this.showError('Network error. Please check your connection and try again.');
        } finally {
            this.isSubmitting = false;
            this.setLoadingState(false);
        }
    }

    getFormData() {
        return {
            name: this.nameField.value.trim(),
            email: this.emailField.value.trim(),
            subject: this.subjectField.value,
            message: this.messageField.value.trim(),
            priority: this.priorityField.value || 'normal'
        };
    }

    handleError(status, data) {
        let errorMessage = 'Something went wrong. Please try again.';

        switch (status) {
            case 400:
                errorMessage = data.error || 'Invalid form data. Please check your inputs.';
                break;
            case 429:
                errorMessage = 'Too many messages sent. Please wait 15 minutes before trying again.';
                break;
            case 500:
                errorMessage = 'Server error. Our team has been notified. Please try again later.';
                break;
            case 503:
                errorMessage = 'Service temporarily unavailable. Please try again in a few minutes.';
                break;
            default:
                errorMessage = data.error || errorMessage;
        }

        this.showError(errorMessage);
    }

    showSuccess(data) {
        const message = data.message || 'Thank you! Your message has been sent successfully.';
        const referenceNumber = data.reference_number;
        const submittedTime = data.submitted_time;

        let successHTML = `
            <i data-feather="check-circle"></i>
            <div>
                <div>${message}</div>
                ${referenceNumber ? `<div style="font-size: 0.875rem; margin-top: 0.5rem; opacity: 0.8;">Reference: ${referenceNumber}</div>` : ''}
                ${submittedTime ? `<div style="font-size: 0.875rem; opacity: 0.8;">Submitted: ${submittedTime}</div>` : ''}
            </div>
        `;

        this.successDiv.innerHTML = successHTML;
        this.successDiv.style.display = 'flex';

        // Re-initialize Feather icons
        feather.replace();
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorDiv.style.display = 'flex';
    }

    hideMessages() {
        this.successDiv.style.display = 'none';
        this.errorDiv.style.display = 'none';
    }

    setLoadingState(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.classList.add('loading');
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.classList.remove('loading');
        }
    }

    resetForm() {
        this.form.reset();

        // Clear any field errors
        [this.nameField, this.emailField, this.subjectField, this.messageField].forEach(field => {
            this.clearFieldError(field);
        });

        // Reset character counter
        const counterSpan = document.getElementById('messageCounter');
        if (counterSpan) {
            counterSpan.textContent = '0';
            counterSpan.parentNode.style.color = 'var(--text-muted)';
        }

        // Re-load user info for logged in users
        this.loadUserInfo();
    }
}

// Initialize contact form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the contact page
    if (document.getElementById('contactForm')) {
        new CineBrainContactForm();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainContactForm;
}