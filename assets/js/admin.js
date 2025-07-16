// Admin functionality
class AdminManager {
    constructor() {
        this.isAdmin = auth.isAdmin;
    }

    // Check admin permissions
    requireAdmin() {
        if (!this.isAdmin) {
            window.location.href = '/';
            return false;
        }
        return true;
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Generate CSV export
    exportToCSV(data, filename) {
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    convertToCSV(objArray) {
        const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
        let str = '';

        // Get headers
        const headers = Object.keys(array[0]);
        str += headers.join(',') + '\r\n';

        // Add data
        for (let i = 0; i < array.length; i++) {
            let line = '';
            for (let index in array[i]) {
                if (line !== '') line += ',';
                line += '"' + array[i][index] + '"';
            }
            str += line + '\r\n';
        }

        return str;
    }

    // Show confirmation dialog
    showConfirmDialog(message, callback) {
        const modal = new Modal({
            title: 'Confirmation',
            content: `
                <p>${message}</p>
                <div class="modal-actions" style="margin-top: 1rem;">
                    <button class="btn btn-danger" id="confirmBtn">Confirm</button>
                    <button class="btn btn-outline" id="cancelBtn">Cancel</button>
                </div>
            `,
            closeOnBackdrop: false
        });

        modal.show();

        document.getElementById('confirmBtn').addEventListener('click', () => {
            modal.hide();
            callback(true);
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            modal.hide();
            callback(false);
        });
    }

    // Show loading overlay
    showLoading(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>${message}</p>
            </div>
        `;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        overlay.querySelector('.loading-content').style.cssText = `
            text-align: center;
            color: white;
            font-size: 1.125rem;
        `;
        overlay.querySelector('i').style.cssText = `
            font-size: 2rem;
            margin-bottom: 1rem;
            display: block;
        `;

        document.body.appendChild(overlay);
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Validate form data
    validateForm(formData, rules) {
        const errors = [];

        for (const field in rules) {
            const value = formData[field];
            const rule = rules[field];

            if (rule.required && (!value || value.trim() === '')) {
                errors.push(`${rule.label || field} is required`);
                continue;
            }

            if (value && rule.minLength && value.length < rule.minLength) {
                errors.push(`${rule.label || field} must be at least ${rule.minLength} characters`);
            }

            if (value && rule.maxLength && value.length > rule.maxLength) {
                errors.push(`${rule.label || field} must be no more than ${rule.maxLength} characters`);
            }

            if (value && rule.pattern && !rule.pattern.test(value)) {
                errors.push(`${rule.label || field} format is invalid`);
            }
        }

        return errors;
    }

    // Show form errors
    showFormErrors(errors, containerId = 'formErrors') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (errors.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = `
            <div class="alert alert-error">
                <strong>Please correct the following errors:</strong>
                <ul style="margin: 0.5rem 0 0 1rem;">
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;
        container.style.display = 'block';
    }

    // Debounced search
    createDebouncedSearch(callback, delay = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => callback.apply(this, args), delay);
        };
    }

    // Format date for admin displays
    formatAdminDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Create pagination
    createPagination(currentPage, totalPages, onPageChange) {
        const pagination = document.createElement('div');
        pagination.className = 'pagination';

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
        pagination.appendChild(prevBtn);

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.textContent = '1';
            firstBtn.addEventListener('click', () => onPageChange(1));
            pagination.appendChild(firstBtn);

            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '0.5rem';
                pagination.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.toggle('active', i === currentPage);
            pageBtn.addEventListener('click', () => onPageChange(i));
            pagination.appendChild(pageBtn);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '0.5rem';
                pagination.appendChild(ellipsis);
            }

            const lastBtn = document.createElement('button');
            lastBtn.textContent = totalPages;
            lastBtn.addEventListener('click', () => onPageChange(totalPages));
            pagination.appendChild(lastBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
        pagination.appendChild(nextBtn);

        return pagination;
    }

    // Create sortable table headers
    createSortableHeader(text, field, currentSort, onSort) {
        const header = document.createElement('th');
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        
        const isActive = currentSort.field === field;
        const direction = isActive ? currentSort.direction : 'asc';
        const nextDirection = isActive && direction === 'asc' ? 'desc' : 'asc';
        
        header.innerHTML = `
            ${text}
            <i class="fas fa-sort${isActive ? (direction === 'asc' ? '-up' : '-down') : ''}" 
               style="margin-left: 0.5rem; opacity: ${isActive ? 1 : 0.3};"></i>
        `;
        
        header.addEventListener('click', () => {
            onSort(field, nextDirection);
        });
        
        return header;
    }

    // Show success message
    showSuccess(message) {
        new Toast(message, 'success').show();
    }

    // Show error message
    showError(message) {
        new Toast(message, 'error').show();
    }

    // Show warning message
    showWarning(message) {
        new Toast(message, 'warning').show();
    }

    // Show info message
    showInfo(message) {
        new Toast(message, 'info').show();
    }
}

// Global admin instance
window.admin = new AdminManager();

// Common admin utilities
window.adminUtils = {
    formatDate: (date) => admin.formatAdminDate(date),
    formatFileSize: (size) => admin.formatFileSize(size),
    exportCSV: (data, filename) => admin.exportToCSV(data, filename),
    showConfirm: (message, callback) => admin.showConfirmDialog(message, callback),
    showLoading: (message) => admin.showLoading(message),
    hideLoading: () => admin.hideLoading(),
    validateForm: (data, rules) => admin.validateForm(data, rules),
    showFormErrors: (errors, container) => admin.showFormErrors(errors, container),
    createPagination: (current, total, callback) => admin.createPagination(current, total, callback),
    createSortableHeader: (text, field, sort, callback) => admin.createSortableHeader(text, field, sort, callback)
};