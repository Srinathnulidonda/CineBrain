// Modal Component
class Modal {
    constructor(options = {}) {
        this.options = {
            title: '',
            content: '',
            size: 'medium', // small, medium, large
            showHeader: true,
            showFooter: false,
            closeOnOverlayClick: true,
            ...options
        };
        this.id = Utils.generateId();
    }

    render() {
        const sizeClasses = {
            small: 'max-w-md',
            medium: 'max-w-2xl',
            large: 'max-w-4xl'
        };

        return `
            <div id="${this.id}" class="modal fixed inset-0 z-50 flex items-center justify-center p-4">
                <!-- Overlay -->
                <div class="modal-overlay absolute inset-0 bg-black/80" 
                     ${this.options.closeOnOverlayClick ? `onclick="Modal.close('${this.id}')"` : ''}></div>
                
                <!-- Modal Content -->
                <div class="modal-content relative bg-secondary-bg rounded-lg ${sizeClasses[this.options.size]} w-full max-h-[90vh] overflow-hidden">
                    ${this.options.showHeader ? `
                        <!-- Header -->
                        <div class="modal-header flex items-center justify-between p-6 border-b border-border-color">
                            <h3 class="text-xl font-bold">${this.options.title}</h3>
                            <button onclick="Modal.close('${this.id}')" 
                                    class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover-bg transition">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ` : `
                        <button onclick="Modal.close('${this.id}')" 
                                class="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition">
                            <i class="fas fa-times"></i>
                        </button>
                    `}
                    
                    <!-- Body -->
                    <div class="modal-body p-6 overflow-y-auto max-h-[60vh]">
                        ${this.options.content}
                    </div>
                    
                    ${this.options.showFooter ? `
                        <!-- Footer -->
                        <div class="modal-footer p-6 border-t border-border-color">
                            ${this.options.footer || ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    show() {
        const container = document.getElementById('modal-container');
        container.insertAdjacentHTML('beforeend', this.render());
        document.body.style.overflow = 'hidden';
    }

    static close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
            
            // Re-enable scrolling if no more modals
            const remainingModals = document.querySelectorAll('.modal');
            if (remainingModals.length === 0) {
                document.body.style.overflow = '';
            }
        }
    }

    static closeAll() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.remove());
        document.body.style.overflow = '';
    }
}