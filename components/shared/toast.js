// Toast Notification Component
class Toast {
    constructor(message, type = 'info', duration = 3000) {
        this.message = message;
        this.type = type; // success, error, warning, info
        this.duration = duration;
        this.id = Utils.generateId();
    }

    render() {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const colors = {
            success: 'bg-success',
            error: 'bg-error',
            warning: 'bg-warning',
            info: 'bg-netflix-red'
        };

        return `
            <div id="${this.id}" class="toast ${colors[this.type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 mb-4 transform translate-x-full transition-transform duration-300">
                <i class="fas ${icons[this.type]} text-xl"></i>
                <span>${this.message}</span>
                <button onclick="Toast.close('${this.id}')" class="ml-4 hover:opacity-70 transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    show() {
        const container = document.getElementById('toast-container');
        container.insertAdjacentHTML('beforeend', this.render());
        
        // Animate in
        setTimeout(() => {
            const toast = document.getElementById(this.id);
            if (toast) {
                toast.classList.remove('translate-x-full');
            }
        }, 10);

        // Auto close
        if (this.duration > 0) {
            setTimeout(() => this.close(), this.duration);
        }
    }

    close() {
        Toast.close(this.id);
    }

    static close(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }
    }
}