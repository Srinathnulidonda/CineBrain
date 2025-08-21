// Form Validation Utilities
const Validators = {
    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Username validation
    isValidUsername(username) {
        // 3-20 characters, alphanumeric and underscore only
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    },

    // Password strength validation
    isValidPassword(password) {
        // Minimum 6 characters
        if (password.length < 6) {
            return { valid: false, message: 'Password must be at least 6 characters' };
        }

        // Check for strong password
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*]/.test(password);

        const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

        return {
            valid: true,
            strength: strength,
            strengthText: ['Weak', 'Fair', 'Good', 'Strong'][strength - 1] || 'Weak'
        };
    },

    // Phone number validation
    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
        return phoneRegex.test(phone);
    },

    // Credit card validation (Luhn algorithm)
    isValidCreditCard(cardNumber) {
        const cleaned = cardNumber.replace(/\s/g, '');

        if (!/^\d{13,19}$/.test(cleaned)) {
            return false;
        }

        let sum = 0;
        let isEven = false;

        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned[i], 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    },

    // URL validation
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    // Date validation
    isValidDate(date, minDate = null, maxDate = null) {
        const d = new Date(date);

        if (isNaN(d.getTime())) {
            return false;
        }

        if (minDate && d < new Date(minDate)) {
            return false;
        }

        if (maxDate && d > new Date(maxDate)) {
            return false;
        }

        return true;
    },

    // Age validation
    isValidAge(birthDate, minAge = 13) {
        const today = new Date();
        const birth = new Date(birthDate);
        const age = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));

        return age >= minAge;
    },

    // File validation
    isValidFile(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024, // 5MB default
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
            allowedExtensions = ['jpg', 'jpeg', 'png', 'gif']
        } = options;

        // Check file size
        if (file.size > maxSize) {
            return { valid: false, message: `File size exceeds ${maxSize / 1024 / 1024}MB` };
        }

        // Check file type
        if (allowedTypes.length && !allowedTypes.includes(file.type)) {
            return { valid: false, message: 'Invalid file type' };
        }

        // Check file extension
        const extension = file.name.split('.').pop().toLowerCase();
        if (allowedExtensions.length && !allowedExtensions.includes(extension)) {
            return { valid: false, message: 'Invalid file extension' };
        }

        return { valid: true };
    },

    // Form validation
    validateForm(formData, rules) {
        const errors = {};

        for (const [field, value] of Object.entries(formData)) {
            if (rules[field]) {
                const fieldRules = rules[field];

                // Required validation
                if (fieldRules.required && !value) {
                    errors[field] = `${field} is required`;
                    continue;
                }

                // Min length validation
                if (fieldRules.minLength && value.length < fieldRules.minLength) {
                    errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
                    continue;
                }

                // Max length validation
                if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
                    errors[field] = `${field} must be less than ${fieldRules.maxLength} characters`;
                    continue;
                }

                // Pattern validation
                if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
                    errors[field] = fieldRules.message || `${field} is invalid`;
                    continue;
                }

                // Custom validation
                if (fieldRules.custom && typeof fieldRules.custom === 'function') {
                    const result = fieldRules.custom(value, formData);
                    if (result !== true) {
                        errors[field] = result;
                    }
                }
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    // Sanitize input
    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    // XSS prevention
    preventXSS(str) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            "/": '&#x2F;',
        };
        const reg = /[&<>"'/]/ig;
        return str.replace(reg, (match) => map[match]);
    }
};

// Export for global use
window.Validators = Validators;