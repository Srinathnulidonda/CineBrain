// Data Formatting Utilities
const Formatters = {
    // Format currency
    currency(amount, currency = 'USD', locale = 'en-US') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // Format date
    date(date, format = 'short', locale = 'en-US') {
        const d = new Date(date);

        if (format === 'short') {
            return d.toLocaleDateString(locale);
        } else if (format === 'long') {
            return d.toLocaleDateString(locale, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (format === 'time') {
            return d.toLocaleTimeString(locale);
        } else if (format === 'datetime') {
            return d.toLocaleString(locale);
        } else if (format === 'relative') {
            return this.relativeTime(d);
        } else if (format === 'iso') {
            return d.toISOString();
        }

        return d.toString();
    },

    // Format relative time
    relativeTime(date) {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const now = new Date();
        const target = new Date(date);
        const diff = target - now;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (Math.abs(years) > 0) return rtf.format(years, 'year');
        if (Math.abs(months) > 0) return rtf.format(months, 'month');
        if (Math.abs(weeks) > 0) return rtf.format(weeks, 'week');
        if (Math.abs(days) > 0) return rtf.format(days, 'day');
        if (Math.abs(hours) > 0) return rtf.format(hours, 'hour');
        if (Math.abs(minutes) > 0) return rtf.format(minutes, 'minute');
        return rtf.format(seconds, 'second');
    },

    // Format duration
    duration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    },

    // Format file size
    fileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    // Format number
    number(num, options = {}) {
        const {
            decimals = 0,
            locale = 'en-US',
            notation = 'standard',
            compactDisplay = 'short'
        } = options;

        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            notation: notation,
            compactDisplay: compactDisplay
        }).format(num);
    },

    // Format percentage
    percentage(value, decimals = 0) {
        return `${(value * 100).toFixed(decimals)}%`;
    },

    // Format phone number
    phone(phoneNumber, format = 'US') {
        const cleaned = phoneNumber.replace(/\D/g, '');

        if (format === 'US' && cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        } else if (format === 'INTL' && cleaned.length > 10) {
            return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
        }

        return phoneNumber;
    },

    // Format credit card
    creditCard(cardNumber, mask = true) {
        const cleaned = cardNumber.replace(/\s/g, '');

        if (mask) {
            const masked = cleaned.slice(0, -4).replace(/\d/g, '*') + cleaned.slice(-4);
            return masked.match(/.{1,4}/g)?.join(' ') || masked;
        } else {
            return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        }
    },

    // Format name
    name(name, format = 'full') {
        const parts = name.trim().split(/\s+/);

        if (format === 'initials') {
            return parts.map(part => part[0].toUpperCase()).join('');
        } else if (format === 'first') {
            return parts[0];
        } else if (format === 'last') {
            return parts[parts.length - 1];
        } else if (format === 'firstLast') {
            return `${parts[0]} ${parts[parts.length - 1]}`;
        }

        return name;
    },

    // Format title case
    titleCase(str) {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    },

    // Format slug
    slug(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    // Format truncate
    truncate(str, length = 100, suffix = '...') {
        if (str.length <= length) return str;
        return str.substr(0, length - suffix.length) + suffix;
    },

    // Format plural
    plural(count, singular, plural = null) {
        if (count === 1) return `${count} ${singular}`;
        return `${count} ${plural || singular + 's'}`;
    },

    // Format list
    list(items, conjunction = 'and', locale = 'en-US') {
        const formatter = new Intl.ListFormat(locale, {
            style: 'long',
            type: 'conjunction'
        });
        return formatter.format(items);
    },

    // Format rating
    rating(value, maxValue = 10, format = 'stars') {
        if (format === 'stars') {
            const stars = Math.round((value / maxValue) * 5);
            return '★'.repeat(stars) + '☆'.repeat(5 - stars);
        } else if (format === 'percentage') {
            return this.percentage(value / maxValue, 0);
        } else {
            return `${value}/${maxValue}`;
        }
    },

    // Format content runtime
    contentRuntime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }
};

// Export for global use
window.Formatters = Formatters;