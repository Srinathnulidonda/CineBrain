// Modal Management System
class ModalManager {
    constructor() {
        this.activeModals = [];
        this.init();
    }

    init() {
        // Close modals on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                this.close(this.activeModals[this.activeModals.length - 1]);
            }
        });

        // Setup backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.classList.contains('modal--open')) {
                this.close(e.target.id);
            }
        });
    }

    // Create modal dynamically
    create(options) {
        const {
            id = `modal-${Date.now()}`,
            title = '',
            content = '',
            size = 'medium',
            closable = true,
            actions = [],
            onOpen = null,
            onClose = null
        } = options;

        // Remove existing modal with same ID
        const existing = document.getElementById(id);
        if (existing) {
            existing.remove();
        }

        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = id;

        const sizeClass = {
            small: 'max-width: 400px',
            medium: 'max-width: 600px',
            large: 'max-width: 900px',
            full: 'max-width: 100%; width: 90vw; height: 90vh'
        }[size] || 'max-width: 600px';

        modal.innerHTML = `
            <div class="modal__content" style="${sizeClass}">
                ${title || closable ? `
                    <div class="modal__header">
                        ${title ? `<h3 class="modal__title">${title}</h3>` : '<div></div>'}
                        ${closable ? `
                            <button class="modal__close" onclick="modalManager.close('${id}')">
                                <i class="bi bi-x"></i>
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
                <div class="modal__body">
                    ${content}
                </div>
                ${actions.length > 0 ? `
                    <div class="modal__footer">
                        ${actions.map(action => `
                            <button class="btn ${action.class || 'btn-secondary'}" 
                                    onclick="${action.handler}">
                                ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Store callbacks
        modal.dataset.onOpen = onOpen ? onOpen.toString() : '';
        modal.dataset.onClose = onClose ? onClose.toString() : '';

        // Add to DOM
        document.body.appendChild(modal);

        return id;
    }

    // Open modal
    open(id) {
        const modal = document.getElementById(id);
        if (!modal) return;

        modal.classList.add('modal--open');
        this.activeModals.push(id);

        // Call onOpen callback
        if (modal.dataset.onOpen) {
            try {
                eval(`(${modal.dataset.onOpen})()`);
            } catch (e) {
                console.error('Modal onOpen error:', e);
            }
        }

        // Trap focus
        this.trapFocus(modal);
    }

    // Close modal
    close(id) {
        const modal = typeof id === 'string' ? document.getElementById(id) : id;
        if (!modal) return;

        modal.classList.remove('modal--open');

        // Remove from active modals
        const modalId = modal.id;
        this.activeModals = this.activeModals.filter(m => m !== modalId);

        // Call onClose callback
        if (modal.dataset.onClose) {
            try {
                eval(`(${modal.dataset.onClose})()`);
            } catch (e) {
                console.error('Modal onClose error:', e);
            }
        }

        // Remove focus trap
        this.releaseFocus();
    }

    // Close all modals
    closeAll() {
        this.activeModals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.classList.remove('modal--open');
            }
        });
        this.activeModals = [];
    }

    // Trap focus within modal
    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        firstElement.focus();

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }

    // Release focus trap
    releaseFocus() {
        // Focus returns to triggering element if available
    }

    // Confirmation modal
    confirm(message, onConfirm, onCancel = null) {
        const id = this.create({
            title: 'Confirm',
            content: `<p>${message}</p>`,
            size: 'small',
            actions: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    handler: `modalManager.close('${id}'); ${onCancel ? `(${onCancel})()` : ''}`
                },
                {
                    text: 'Confirm',
                    class: 'btn-primary',
                    handler: `modalManager.close('${id}'); (${onConfirm})()`
                }
            ]
        });

        this.open(id);
    }

    // Alert modal
    alert(message, title = 'Alert') {
        const id = this.create({
            title: title,
            content: `<p>${message}</p>`,
            size: 'small',
            actions: [
                {
                    text: 'OK',
                    class: 'btn-primary',
                    handler: `modalManager.close('${id}')`
                }
            ]
        });

        this.open(id);
    }

    // Loading modal
    loading(message = 'Loading...') {
        const id = 'loading-modal';

        this.create({
            id: id,
            content: `
                <div class="text-center">
                    <div class="spinner mx-auto mb-md"></div>
                    <p>${message}</p>
                </div>
            `,
            size: 'small',
            closable: false
        });

        this.open(id);

        return id;
    }

    // Video modal
    video(videoUrl, title = '') {
        const id = 'video-modal';
        const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');

        let embedUrl = videoUrl;
        if (isYouTube) {
            const videoId = videoUrl.split('v=')[1] || videoUrl.split('/').pop();
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }

        this.create({
            id: id,
            title: title,
            content: `
                <div class="ratio ratio-16x9">
                    <iframe src="${embedUrl}" 
                            frameborder="0" 
                            allowfullscreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                    </iframe>
                </div>
            `,
            size: 'large',
            onClose: () => {
                // Stop video on close
                const iframe = document.querySelector('#video-modal iframe');
                if (iframe) {
                    iframe.src = '';
                }
            }
        });

        this.open(id);
    }

    // Image gallery modal
    gallery(images, startIndex = 0) {
        const id = 'gallery-modal';
        let currentIndex = startIndex;

        const updateImage = () => {
            const img = document.querySelector('#gallery-modal .gallery-image');
            const counter = document.querySelector('#gallery-modal .gallery-counter');
            if (img) {
                img.src = images[currentIndex];
                counter.textContent = `${currentIndex + 1} / ${images.length}`;
            }
        };

        this.create({
            id: id,
            content: `
                <div class="gallery-modal">
                    <div class="gallery-controls">
                        <button class="btn btn-secondary" onclick="modalManager.galleryPrev()">
                            <i class="bi bi-chevron-left"></i>
                        </button>
                        <span class="gallery-counter">${currentIndex + 1} / ${images.length}</span>
                        <button class="btn btn-secondary" onclick="modalManager.galleryNext()">
                            <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                    <img src="${images[currentIndex]}" class="gallery-image" style="width: 100%; height: auto;">
                </div>
            `,
            size: 'large'
        });

        // Add navigation methods
        this.galleryPrev = () => {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            updateImage();
        };

        this.galleryNext = () => {
            currentIndex = (currentIndex + 1) % images.length;
            updateImage();
        };

        this.open(id);
    }
}

// Create global instance
const modalManager = new ModalManager();

// Export for global use
window.modalManager = modalManager;