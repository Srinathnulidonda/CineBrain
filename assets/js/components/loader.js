class LoaderManager {
    constructor() {
        this.loaders = new Map();
        this.globalLoader = null;
        this.init();
    }

    init() {
        this.createGlobalLoader();
        this.setupStyles();
    }

    createGlobalLoader() {
        this.globalLoader = document.createElement('div');
        this.globalLoader.id = 'global-loader';
        this.globalLoader.className = 'global-loader hidden';
        this.globalLoader.innerHTML = `
            <div class="loader-backdrop"></div>
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-text">Loading...</div>
            </div>
        `;
        document.body.appendChild(this.globalLoader);
    }

    setupStyles() {
        if (document.getElementById('loader-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'loader-styles';
        styles.textContent = `
            .global-loader {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 1;
                visibility: visible;
                transition: all 0.3s ease;
            }

            .global-loader.hidden {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }

            .loader-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(15, 15, 15, 0.9);
                backdrop-filter: blur(4px);
            }

            .loader-content {
                position: relative;
                text-align: center;
                z-index: 1;
            }

            .loader-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid var(--border-color);
                border-top: 3px solid var(--accent-primary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }

            .loader-text {
                color: var(--text-primary);
                font-size: 16px;
                font-weight: 500;
            }

            .inline-loader {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                color: var(--text-secondary);
                font-size: 14px;
            }

            .inline-loader .mini-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid var(--border-color);
                border-top: 2px solid var(--accent-primary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .section-loader {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                min-height: 200px;
            }

            .section-loader .loader-spinner {
                margin-bottom: 16px;
            }

            .skeleton-loader {
                background: linear-gradient(90deg, 
                    var(--bg-secondary) 25%, 
                    var(--bg-tertiary) 50%, 
                    var(--bg-secondary) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: var(--radius-md);
            }

            .skeleton-text {
                height: 1em;
                margin-bottom: 8px;
            }

            .skeleton-text.short {
                width: 60%;
            }

            .skeleton-text.medium {
                width: 80%;
            }

            .skeleton-text.long {
                width: 100%;
            }

            .skeleton-card {
                aspect-ratio: 2/3;
                border-radius: var(--radius-lg);
            }

            .skeleton-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }

            @media (max-width: 768px) {
                .loader-spinner {
                    width: 40px;
                    height: 40px;
                }
                
                .loader-text {
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    show(text = 'Loading...') {
        if (this.globalLoader) {
            this.globalLoader.querySelector('.loader-text').textContent = text;
            this.globalLoader.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hide() {
        if (this.globalLoader) {
            this.globalLoader.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    showInline(container, text = 'Loading...') {
        const id = this.generateId();
        const loader = document.createElement('div');
        loader.className = 'inline-loader';
        loader.innerHTML = `
            <div class="mini-spinner"></div>
            <span>${text}</span>
        `;
        
        container.appendChild(loader);
        this.loaders.set(id, { element: loader, container });
        return id;
    }

    showSection(container, text = 'Loading...') {
        const id = this.generateId();
        const loader = document.createElement('div');
        loader.className = 'section-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-text">${text}</div>
            </div>
        `;
        
        container.innerHTML = '';
        container.appendChild(loader);
        this.loaders.set(id, { element: loader, container });
        return id;
    }

    hideLoader(id) {
        const loaderData = this.loaders.get(id);
        if (loaderData) {
            const { element } = loaderData;
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.loaders.delete(id);
        }
    }

    createSkeleton(type, count = 1) {
        const skeletons = [];
        
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            
            switch (type) {
                case 'card':
                    skeleton.className = 'skeleton-loader skeleton-card';
                    break;
                case 'text':
                    skeleton.className = 'skeleton-loader skeleton-text';
                    break;
                case 'avatar':
                    skeleton.className = 'skeleton-loader skeleton-avatar';
                    break;
                case 'movie-card':
                    skeleton.className = 'movie-card-skeleton';
                    skeleton.innerHTML = `
                        <div class="skeleton-loader skeleton-card"></div>
                        <div style="padding: 12px;">
                            <div class="skeleton-loader skeleton-text medium"></div>
                            <div class="skeleton-loader skeleton-text short"></div>
                        </div>
                    `;
                    break;
                default:
                    skeleton.className = 'skeleton-loader';
            }
            
            skeletons.push(skeleton);
        }
        
        return count === 1 ? skeletons[0] : skeletons;
    }

    showSkeletonGrid(container, type = 'movie-card', count = 6) {
        const id = this.generateId();
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < count; i++) {
            const skeleton = this.createSkeleton(type);
            fragment.appendChild(skeleton);
        }
        
        container.innerHTML = '';
        container.appendChild(fragment);
        
        this.loaders.set(id, { container, type: 'skeleton' });
        return id;
    }

    showProgress(container, percentage = 0) {
        const id = this.generateId();
        const progress = document.createElement('div');
        progress.className = 'progress-loader';
        progress.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="progress-text">${percentage}%</div>
        `;
        
        const styles = `
            .progress-loader {
                text-align: center;
                padding: 20px;
            }
            
            .progress-bar {
                width: 100%;
                height: 6px;
                background-color: var(--bg-tertiary);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .progress-fill {
                height: 100%;
                background-color: var(--accent-primary);
                transition: width 0.3s ease;
                border-radius: 3px;
            }
            
            .progress-text {
                color: var(--text-secondary);
                font-size: 14px;
            }
        `;
        
        if (!document.getElementById('progress-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'progress-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
        
        container.appendChild(progress);
        this.loaders.set(id, { element: progress, container, type: 'progress' });
        return id;
    }

    updateProgress(id, percentage) {
        const loaderData = this.loaders.get(id);
        if (loaderData && loaderData.type === 'progress') {
            const fill = loaderData.element.querySelector('.progress-fill');
            const text = loaderData.element.querySelector('.progress-text');
            
            if (fill) fill.style.width = `${percentage}%`;
            if (text) text.textContent = `${percentage}%`;
        }
    }

    generateId() {
        return 'loader-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Utility methods
    showButton(button, text = 'Loading...') {
        const originalText = button.textContent;
        const originalHtml = button.innerHTML;
        
        button.disabled = true;
        button.innerHTML = `
            <div class="mini-spinner"></div>
            <span>${text}</span>
        `;
        
        return () => {
            button.disabled = false;
            button.innerHTML = originalHtml;
        };
    }

    showInput(input, placeholder = 'Loading...') {
        const originalPlaceholder = input.placeholder;
        const originalDisabled = input.disabled;
        
        input.placeholder = placeholder;
        input.disabled = true;
        input.classList.add('loading');
        
        return () => {
            input.placeholder = originalPlaceholder;
            input.disabled = originalDisabled;
            input.classList.remove('loading');
        };
    }
}

// Create global instance
window.LoaderManager = LoaderManager;
window.loader = new LoaderManager();