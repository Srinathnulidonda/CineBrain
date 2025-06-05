// assets/js/support/report-issue.js

class CineBrainIssueReporter {
    constructor() {
        this.apiBase = window.CineBrainConfig?.apiBase || 'https://cinebrain.onrender.com/api';
        this.form = null;
        this.submitBtn = null;
        this.isSubmitting = false;
        this.uploadedFiles = [];
        this.maxFiles = 5;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
        this.selectedSeverity = null;
        this.selectedIssueType = null;

        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupFormValidation();
        this.detectSystemInfo();
        this.setupFileUpload();
        this.setupIssueTypeSelection();
        this.setupSeveritySelection();
        this.setupAnalytics();

        // Auto-fill user info if logged in
        await this.loadUserInfo();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    setupElements() {
        this.form = document.getElementById('reportForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.successDiv = document.getElementById('formSuccess');

        // Form fields
        this.nameField = document.getElementById('name');
        this.emailField = document.getElementById('email');
        this.issueTypeField = document.getElementById('issueType');
        this.severityInput = document.getElementById('severity');
        this.titleField = document.getElementById('title');
        this.descriptionField = document.getElementById('description');
        this.browserField = document.getElementById('browser');
        this.deviceField = document.getElementById('device');
        this.urlField = document.getElementById('url');
        this.fileInput = document.getElementById('fileInput');

        // UI elements
        this.fileUploadArea = document.getElementById('fileUpload');
        this.uploadedFilesContainer = document.getElementById('uploadedFiles');
        this.issueTypes = document.querySelectorAll('.issue-type');
        this.severityOptions = document.querySelectorAll('.severity-option');
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

    detectSystemInfo() {
        // Auto-detect browser information
        const userAgent = navigator.userAgent;
        let browserInfo = this.getBrowserInfo(userAgent);
        let deviceInfo = this.getDeviceInfo(userAgent);

        if (browserInfo && !this.browserField.value) {
            this.browserField.value = browserInfo;
        }

        if (deviceInfo && !this.deviceField.value) {
            this.deviceField.value = deviceInfo;
        }

        // Set current page URL
        if (!this.urlField.value) {
            this.urlField.value = window.location.href;
        }

        // Add additional system info as hidden data
        this.systemInfo = {
            screenResolution: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            colorDepth: screen.colorDepth,
            pixelRatio: window.devicePixelRatio,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }

    getBrowserInfo(userAgent) {
        const browsers = [
            { name: 'Chrome', regex: /Chrome\/(\d+)/, prefix: 'Chrome' },
            { name: 'Firefox', regex: /Firefox\/(\d+)/, prefix: 'Firefox' },
            { name: 'Safari', regex: /Version\/(\d+).*Safari/, prefix: 'Safari' },
            { name: 'Edge', regex: /Edg\/(\d+)/, prefix: 'Edge' },
            { name: 'Opera', regex: /OPR\/(\d+)/, prefix: 'Opera' }
        ];

        for (const browser of browsers) {
            const match = userAgent.match(browser.regex);
            if (match && (!browser.name === 'Safari' || !userAgent.includes('Chrome'))) {
                return `${browser.prefix} ${match[1]}`;
            }
        }

        return 'Unknown Browser';
    }

    getDeviceInfo(userAgent) {
        const devices = [
            { name: 'iPhone', regex: /iPhone/ },
            { name: 'iPad', regex: /iPad/ },
            { name: 'Android Phone', regex: /Android.*Mobile/ },
            { name: 'Android Tablet', regex: /Android(?!.*Mobile)/ },
            { name: 'Windows', regex: /Windows NT (\d+\.\d+)/ },
            { name: 'macOS', regex: /Mac OS X (\d+_\d+)/ },
            { name: 'Linux', regex: /Linux/ }
        ];

        for (const device of devices) {
            if (device.regex.test(userAgent)) {
                const match = userAgent.match(device.regex);
                if (device.name === 'Windows' && match) {
                    const version = this.getWindowsVersion(match[1]);
                    return `${device.name} ${version}`;
                } else if (device.name === 'macOS' && match) {
                    const version = match[1].replace('_', '.');
                    return `${device.name} ${version}`;
                }
                return device.name;
            }
        }

        return 'Unknown Device';
    }

    getWindowsVersion(version) {
        const versions = {
            '10.0': '10/11',
            '6.3': '8.1',
            '6.2': '8',
            '6.1': '7',
            '6.0': 'Vista'
        };
        return versions[version] || version;
    }

    setupIssueTypeSelection() {
        this.issueTypes.forEach(typeElement => {
            typeElement.addEventListener('click', () => {
                // Remove active class from all types
                this.issueTypes.forEach(t => t.classList.remove('active'));

                // Add active class to clicked type
                typeElement.classList.add('active');

                // Set the select value
                this.selectedIssueType = typeElement.dataset.type;
                this.issueTypeField.value = this.selectedIssueType;

                // Update form title suggestions based on issue type
                this.updateTitleSuggestions(this.selectedIssueType);

                // Clear validation error if any
                this.clearFieldError(this.issueTypeField);

                // Track selection
                if (window.gtag) {
                    gtag('event', 'issue_type_selected', {
                        'event_category': 'engagement',
                        'issue_type': this.selectedIssueType
                    });
                }
            });
        });

        // Also handle direct select change
        this.issueTypeField.addEventListener('change', (e) => {
            const selectedType = e.target.value;
            this.issueTypes.forEach(t => t.classList.remove('active'));

            const matchingType = Array.from(this.issueTypes).find(t => t.dataset.type === selectedType);
            if (matchingType) {
                matchingType.classList.add('active');
                this.selectedIssueType = selectedType;
                this.updateTitleSuggestions(selectedType);
            }
        });
    }

    updateTitleSuggestions(issueType) {
        const suggestions = {
            'bug': [
                'Button not responding when clicked',
                'Page shows error message',
                'Feature stops working unexpectedly',
                'Data not saving correctly'
            ],
            'performance': [
                'Page loads very slowly',
                'App becomes unresponsive',
                'Search takes too long to complete',
                'Recommendations not updating'
            ],
            'content': [
                'Movie/show information is incorrect',
                'Missing poster or images',
                'Search results show wrong content',
                'Recommendations are irrelevant'
            ],
            'security': [
                'Suspicious activity detected',
                'Privacy settings not working',
                'Account access concerns',
                'Data security issue'
            ]
        };

        const titleField = this.titleField;
        const currentValue = titleField.value;

        if (!currentValue && suggestions[issueType]) {
            titleField.placeholder = suggestions[issueType][0];
            titleField.setAttribute('data-suggestions', JSON.stringify(suggestions[issueType]));
        }
    }

    setupSeveritySelection() {
        this.severityOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                this.severityOptions.forEach(o => o.classList.remove('active'));

                // Add active class to clicked option
                option.classList.add('active');

                // Set the hidden input value
                this.selectedSeverity = option.dataset.severity;
                this.severityInput.value = this.selectedSeverity;

                // Update form styling based on severity
                this.updateFormSeverityIndicator(this.selectedSeverity);

                // Clear validation error
                this.clearFieldError(this.severityInput);

                // Track selection
                if (window.gtag) {
                    gtag('event', 'severity_selected', {
                        'event_category': 'engagement',
                        'severity': this.selectedSeverity
                    });
                }
            });
        });
    }

    updateFormSeverityIndicator(severity) {
        const severityColors = {
            'low': '#10b981',
            'medium': '#f59e0b',
            'high': '#ef4444',
            'critical': '#dc2626'
        };

        const formTitle = document.querySelector('.form-title');
        if (formTitle) {
            formTitle.style.borderLeftColor = severityColors[severity];
        }
    }

    setupFileUpload() {
        // Click to upload
        this.fileUploadArea.addEventListener('click', (e) => {
            if (e.target.closest('.file-remove')) return;
            this.fileInput.click();
        });

        // Drag and drop
        this.fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileUploadArea.classList.add('dragover');
        });

        this.fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.fileUploadArea.classList.remove('dragover');
        });

        this.fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileUploadArea.classList.remove('dragover');
            this.handleFiles(Array.from(e.dataTransfer.files));
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });

        // Setup file upload area with enhanced styling
        this.setupFileUploadStyling();
    }

    setupFileUploadStyling() {
        const style = document.createElement('style');
        style.textContent = `
            .file-upload.dragover {
                border-color: var(--primary-color);
                background-color: rgba(17, 60, 207, 0.05);
            }
            
            .uploaded-files.show {
                display: block;
                margin-top: 1rem;
            }
            
            .file-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: var(--card-background);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                margin-bottom: 0.5rem;
            }
            
            .file-info {
                flex-grow: 1;
            }
            
            .file-name {
                font-weight: 500;
                color: var(--text-primary);
            }
            
            .file-size {
                font-size: 0.875rem;
                color: var(--text-muted);
            }
            
            .file-remove {
                background: none;
                border: none;
                color: var(--error-color);
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .file-remove:hover {
                background-color: rgba(239, 68, 68, 0.1);
            }
            
            .upload-progress {
                margin-top: 0.5rem;
            }
            
            .progress-bar {
                width: 100%;
                height: 4px;
                background-color: var(--background-muted);
                border-radius: 2px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background-color: var(--primary-color);
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    async handleFiles(files) {
        for (const file of files) {
            // Check file count limit
            if (this.uploadedFiles.length >= this.maxFiles) {
                this.showNotification(`Maximum ${this.maxFiles} files allowed`, 'error');
                break;
            }

            // Validate file
            const validation = this.validateFile(file);
            if (!validation.valid) {
                this.showNotification(validation.error, 'error');
                continue;
            }

            // Add to uploaded files
            const fileData = {
                file: file,
                id: this.generateFileId(),
                name: file.name,
                size: file.size,
                type: file.type,
                uploaded: false
            };

            this.uploadedFiles.push(fileData);
            this.renderUploadedFile(fileData);
        }

        this.updateFileUploadDisplay();
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                error: `File "${file.name}" is too large. Maximum size is 10MB.`
            };
        }

        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `File type "${file.type}" is not allowed. Please use PNG, JPG, GIF, PDF, or TXT files.`
            };
        }

        // Check for duplicate names
        const existingFile = this.uploadedFiles.find(f => f.name === file.name);
        if (existingFile) {
            return {
                valid: false,
                error: `File "${file.name}" is already uploaded.`
            };
        }

        return { valid: true };
    }

    renderUploadedFile(fileData) {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        fileElement.dataset.fileId = fileData.id;
        fileElement.innerHTML = `
            <i data-feather="file" class="file-icon"></i>
            <div class="file-info">
                <div class="file-name">${this.escapeHtml(fileData.name)}</div>
                <div class="file-size">${this.formatFileSize(fileData.size)}</div>
            </div>
            <button type="button" class="file-remove" data-file-id="${fileData.id}">
                <i data-feather="x"></i>
            </button>
        `;

        // Add remove event listener
        const removeBtn = fileElement.querySelector('.file-remove');
        removeBtn.addEventListener('click', () => {
            this.removeFile(fileData.id);
        });

        this.uploadedFilesContainer.appendChild(fileElement);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    removeFile(fileId) {
        // Remove from uploaded files array
        this.uploadedFiles = this.uploadedFiles.filter(file => file.id !== fileId);

        // Remove from DOM
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileElement) {
            fileElement.remove();
        }

        this.updateFileUploadDisplay();
    }

    updateFileUploadDisplay() {
        const hasFiles = this.uploadedFiles.length > 0;

        if (hasFiles) {
            this.uploadedFilesContainer.classList.add('show');
            this.fileUploadArea.querySelector('.file-upload-text').textContent =
                `${this.uploadedFiles.length}/${this.maxFiles} files selected`;
        } else {
            this.uploadedFilesContainer.classList.remove('show');
            this.fileUploadArea.querySelector('.file-upload-text').textContent =
                'Click to upload or drag and drop';
        }
    }

    generateFileId() {
        return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupEventListeners() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));

        // Real-time validation
        [this.emailField, this.titleField, this.descriptionField].forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });

        // Character counter for description
        this.setupCharacterCounter();

        // Smart title suggestions
        this.setupSmartTitleSuggestions();
    }

    setupCharacterCounter() {
        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.innerHTML = '<span id="descriptionCounter">0</span>/2000 characters';
        this.descriptionField.parentNode.appendChild(counter);

        const counterSpan = document.getElementById('descriptionCounter');

        this.descriptionField.addEventListener('input', () => {
            const length = this.descriptionField.value.length;
            counterSpan.textContent = length;

            if (length > 1800) {
                counter.style.color = '#ef4444';
            } else if (length > 1500) {
                counter.style.color = '#f59e0b';
            } else {
                counter.style.color = 'var(--text-muted)';
            }
        });
    }

    setupSmartTitleSuggestions() {
        // Create suggestion dropdown
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'title-suggestions';
        suggestionsContainer.style.display = 'none';
        this.titleField.parentNode.appendChild(suggestionsContainer);

        this.titleField.addEventListener('focus', () => {
            if (this.selectedIssueType && this.titleField.value.length < 3) {
                this.showTitleSuggestions();
            }
        });

        this.titleField.addEventListener('input', () => {
            if (this.titleField.value.length >= 3) {
                suggestionsContainer.style.display = 'none';
            }
        });

        this.titleField.addEventListener('blur', () => {
            setTimeout(() => {
                suggestionsContainer.style.display = 'none';
            }, 200);
        });
    }

    showTitleSuggestions() {
        const suggestions = this.titleField.getAttribute('data-suggestions');
        if (!suggestions) return;

        const suggestionsArray = JSON.parse(suggestions);
        const container = document.querySelector('.title-suggestions');

        container.innerHTML = suggestionsArray.map(suggestion =>
            `<div class="suggestion-item" data-suggestion="${this.escapeHtml(suggestion)}">
                ${this.escapeHtml(suggestion)}
            </div>`
        ).join('');

        container.style.display = 'block';

        // Add click listeners
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.titleField.value = item.dataset.suggestion;
                container.style.display = 'none';
                this.titleField.focus();
            });
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
            
            .severity-group {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-top: 0.5rem;
            }
            
            .severity-option {
                padding: 1rem;
                border: 2px solid var(--border-color);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: center;
            }
            
            .severity-option:hover {
                border-color: var(--primary-color);
            }
            
            .severity-option.active {
                border-color: var(--primary-color);
                background-color: rgba(17, 60, 207, 0.05);
            }
            
            .severity-option.low.active { border-color: #10b981; background-color: rgba(16, 185, 129, 0.05); }
            .severity-option.medium.active { border-color: #f59e0b; background-color: rgba(245, 158, 11, 0.05); }
            .severity-option.high.active { border-color: #ef4444; background-color: rgba(239, 68, 68, 0.05); }
            .severity-option.critical.active { border-color: #dc2626; background-color: rgba(220, 38, 38, 0.05); }
            
            .severity-title {
                font-weight: 600;
                margin-bottom: 0.5rem;
                font-size: 1.1rem;
            }
            
            .severity-desc {
                font-size: 0.875rem;
                color: var(--text-muted);
            }
            
            .issue-types {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .issue-type {
                padding: 1.5rem;
                border: 2px solid var(--border-color);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
            }
            
            .issue-type:hover {
                border-color: var(--primary-color);
                transform: translateY(-2px);
            }
            
            .issue-type.active {
                border-color: var(--primary-color);
                background-color: rgba(17, 60, 207, 0.05);
                transform: translateY(-2px);
            }
            
            .issue-icon {
                color: var(--primary-color);
                margin-bottom: 1rem;
            }
            
            .title-suggestions {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--card-background);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                max-height: 200px;
                overflow-y: auto;
            }
            
            .suggestion-item {
                padding: 0.75rem 1rem;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .suggestion-item:hover {
                background-color: var(--background-muted);
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
            
            .form-success.show {
                display: block !important;
                animation: slideInUp 0.5s ease-out;
            }
            
            @keyframes slideInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
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
                if (!value) {
                    errorMessage = 'Email address is required';
                    isValid = false;
                } else if (!this.isValidEmail(value)) {
                    errorMessage = 'Please enter a valid email address';
                    isValid = false;
                }
                break;

            case 'title':
                if (!value) {
                    errorMessage = 'Issue title is required';
                    isValid = false;
                } else if (value.length < 5) {
                    errorMessage = 'Title must be at least 5 characters';
                    isValid = false;
                } else if (value.length > 100) {
                    errorMessage = 'Title must be less than 100 characters';
                    isValid = false;
                }
                break;

            case 'description':
                if (!value) {
                    errorMessage = 'Detailed description is required';
                    isValid = false;
                } else if (value.length < 20) {
                    errorMessage = 'Please provide at least 20 characters of description';
                    isValid = false;
                } else if (value.length > 2000) {
                    errorMessage = 'Description must be less than 2000 characters';
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
        if (!this.validateField(this.emailField)) {
            isValid = false;
        }
        if (!this.validateField(this.titleField)) {
            isValid = false;
        }
        if (!this.validateField(this.descriptionField)) {
            isValid = false;
        }

        // Validate issue type selection
        if (!this.selectedIssueType) {
            this.showFieldError(this.issueTypeField, 'Please select an issue type');
            isValid = false;
        }

        // Validate severity selection
        if (!this.selectedSeverity) {
            this.showNotification('Please select a severity level', 'error');
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
            const formData = await this.prepareFormData();

            const response = await fetch(`${this.apiBase}/support/report-issue`, {
                method: 'POST',
                body: formData,
                headers: {
                    ...(localStorage.getItem('cinebrain_token') && {
                        'Authorization': `Bearer ${localStorage.getItem('cinebrain_token')}`
                    })
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(data);
                this.resetForm();

                // Track successful submission
                if (window.gtag) {
                    gtag('event', 'issue_report_submit', {
                        'event_category': 'support',
                        'issue_type': this.selectedIssueType,
                        'severity': this.selectedSeverity,
                        'files_count': this.uploadedFiles.length
                    });
                }

            } else {
                this.handleError(response.status, data);
            }
        } catch (error) {
            console.error('Issue report submission error:', error);
            this.showNotification('Network error. Please check your connection and try again.', 'error');
        } finally {
            this.isSubmitting = false;
            this.setLoadingState(false);
        }
    }

    async prepareFormData() {
        const formData = new FormData();

        // Add form fields
        formData.append('name', this.nameField.value.trim() || 'Anonymous');
        formData.append('email', this.emailField.value.trim());
        formData.append('issue_type', this.selectedIssueType);
        formData.append('severity', this.selectedSeverity);
        formData.append('issue_title', this.titleField.value.trim());
        formData.append('description', this.descriptionField.value.trim());
        formData.append('browser_version', this.browserField.value.trim());
        formData.append('device_os', this.deviceField.value.trim());
        formData.append('page_url', this.urlField.value.trim());

        // Add steps to reproduce and expected behavior if provided
        const stepsMatch = this.descriptionField.value.match(/steps to reproduce:?\s*(.*?)(?=expected|$)/is);
        const expectedMatch = this.descriptionField.value.match(/expected:?\s*(.*?)$/is);

        if (stepsMatch) {
            formData.append('steps_to_reproduce', stepsMatch[1].trim());
        }
        if (expectedMatch) {
            formData.append('expected_behavior', expectedMatch[1].trim());
        }

        // Add system information
        formData.append('system_info', JSON.stringify(this.systemInfo));

        // Add files
        this.uploadedFiles.forEach((fileData, index) => {
            formData.append('screenshots', fileData.file);
        });

        return formData;
    }

    handleError(status, data) {
        let errorMessage = 'Something went wrong. Please try again.';

        switch (status) {
            case 400:
                errorMessage = data.error || 'Invalid report data. Please check your inputs.';
                break;
            case 429:
                errorMessage = 'Too many reports submitted recently. Please wait 15 minutes.';
                break;
            case 413:
                errorMessage = 'Files are too large. Please reduce file sizes or remove some files.';
                break;
            case 500:
                errorMessage = 'Server error. Our team has been notified. Please try again later.';
                break;
            default:
                errorMessage = data.error || errorMessage;
        }

        this.showNotification(errorMessage, 'error');
    }

    showSuccess(data) {
        const ticketNumber = data.ticket_number || `CB-${Date.now()}`;
        const issueId = data.issue_id || `issue_${Date.now()}`;
        const submittedTime = data.submitted_time || 'just now';
        const estimatedResponse = data.estimated_response_time || '24-48 hours';

        // Update success message
        const ticketElement = this.successDiv.querySelector('.ticket-id');
        if (ticketElement) {
            ticketElement.innerHTML = `
                Ticket: #${ticketNumber}<br>
                Issue ID: ${issueId}<br>
                Submitted: ${submittedTime}<br>
                <small>Expected response time: ${estimatedResponse}</small>
            `;
        }

        this.successDiv.classList.add('show');
        this.successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Hide after 10 seconds
        setTimeout(() => {
            this.successDiv.classList.remove('show');
        }, 10000);
    }

    showNotification(message, type) {
        // Remove existing notifications
        document.querySelectorAll('.issue-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `issue-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i data-feather="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add notification styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            transition: all 0.3s ease;
            max-width: 400px;
            background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
        `;

        document.body.appendChild(notification);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
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
            this.submitBtn.innerHTML = '<i data-feather="loader"></i> Submitting Report...';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.classList.remove('loading');
            this.submitBtn.innerHTML = '<i data-feather="send"></i> Submit Issue Report';
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    resetForm() {
        this.form.reset();

        // Reset selections
        this.selectedIssueType = null;
        this.selectedSeverity = null;
        this.issueTypeField.value = '';
        this.severityInput.value = '';

        // Reset UI states
        this.issueTypes.forEach(t => t.classList.remove('active'));
        this.severityOptions.forEach(o => o.classList.remove('active'));

        // Reset files
        this.uploadedFiles = [];
        this.uploadedFilesContainer.innerHTML = '';
        this.updateFileUploadDisplay();

        // Clear validation errors
        document.querySelectorAll('.form-field-error').forEach(field => {
            this.clearFieldError(field);
        });

        // Reset character counter
        const counterSpan = document.getElementById('descriptionCounter');
        if (counterSpan) {
            counterSpan.textContent = '0';
            counterSpan.parentNode.style.color = 'var(--text-muted)';
        }

        // Reset system info detection
        this.detectSystemInfo();

        // Re-load user info
        this.loadUserInfo();
    }

    setupAnalytics() {
        // Track page load
        if (window.gtag) {
            gtag('event', 'page_view', {
                'page_title': 'Report Issue',
                'page_location': window.location.href
            });
        }

        // Track engagement
        let startTime = Date.now();

        window.addEventListener('beforeunload', () => {
            const timeSpent = Date.now() - startTime;
            if (window.gtag && timeSpent > 10000) { // More than 10 seconds
                gtag('event', 'report_issue_engagement', {
                    'event_category': 'engagement',
                    'time_spent': Math.round(timeSpent / 1000),
                    'issue_type_selected': this.selectedIssueType || 'none',
                    'severity_selected': this.selectedSeverity || 'none',
                    'files_added': this.uploadedFiles.length
                });
            }
        });
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
}

// Initialize issue reporter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the report issue page
    if (document.getElementById('reportForm')) {
        window.issueReporter = new CineBrainIssueReporter();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainIssueReporter;
}