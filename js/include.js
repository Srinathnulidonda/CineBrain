// Include.js - HTML Include System for Movie Platform
// Handles loading reusable HTML components

class IncludeSystem {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
        this.errorRetryCount = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;

        this.init();
    }

    init() {
        // Auto-load includes on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.loadAllIncludes());
        } else {
            this.loadAllIncludes();
        }

        // Set up mutation observer for dynamic includes
        this.setupMutationObserver();
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let hasNewIncludes = false;

            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.hasAttribute && node.hasAttribute('data-include')) {
                            hasNewIncludes = true;
                        }

                        // Check child elements
                        const includeElements = node.querySelectorAll && node.querySelectorAll('[data-include]');
                        if (includeElements && includeElements.length > 0) {
                            hasNewIncludes = true;
                        }
                    }
                });
            });

            if (hasNewIncludes) {
                this.loadAllIncludes();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async loadAllIncludes() {
        const elements = document.querySelectorAll('[data-include]');
        const promises = Array.from(elements).map(element => this.loadInclude(element));

        try {
            await Promise.allSettled(promises);
            this.dispatchEvent('includesLoaded');
        } catch (error) {
            console.error('Error loading includes:', error);
            this.dispatchEvent('includesError', { error });
        }
    }

    async loadInclude(element) {
        const includePath = element.getAttribute('data-include');
        const includeData = element.getAttribute('data-include-data');
        const includeCache = element.getAttribute('data-include-cache') !== 'false';

        if (!includePath) {
            console.warn('Include element missing data-include attribute:', element);
            return;
        }

        try {
            // Show loading state
            this.showLoadingState(element);

            // Load the content
            const content = await this.fetchInclude(includePath, includeCache);

            // Process the content with data if provided
            const processedContent = this.processIncludeContent(content, includeData);

            // Insert the content
            await this.insertIncludeContent(element, processedContent);

            // Hide loading state
            this.hideLoadingState(element);

            // Dispatch success event
            this.dispatchEvent('includeLoaded', { element, includePath });

        } catch (error) {
            console.error(`Failed to load include: ${includePath}`, error);
            this.showErrorState(element, error);
            this.dispatchEvent('includeError', { element, includePath, error });
        }
    }

    async fetchInclude(path, useCache = true) {
        // Check cache first
        if (useCache && this.cache.has(path)) {
            return this.cache.get(path);
        }

        // Check if already loading
        if (this.loadingPromises.has(path)) {
            return this.loadingPromises.get(path);
        }

        // Create loading promise
        const loadingPromise = this.performFetch(path);
        this.loadingPromises.set(path, loadingPromise);

        try {
            const content = await loadingPromise;

            // Cache the result
            if (useCache) {
                this.cache.set(path, content);
            }

            // Reset retry count on success
            this.errorRetryCount.delete(path);

            return content;
        } catch (error) {
            // Handle retry logic
            const retryCount = this.errorRetryCount.get(path) || 0;

            if (retryCount < this.maxRetries) {
                this.errorRetryCount.set(path, retryCount + 1);

                // Wait before retry
                await this.delay(this.retryDelay * (retryCount + 1));

                // Clear loading promise and retry
                this.loadingPromises.delete(path);
                return this.fetchInclude(path, useCache);
            }

            throw error;
        } finally {
            this.loadingPromises.delete(path);
        }
    }

    async performFetch(path) {
        // Handle relative paths
        const fullPath = this.resolvePath(path);

        const response = await fetch(fullPath, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'X-Requested-With': 'XMLHttpRequest'
            },
            cache: 'default'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();

        if (!content.trim()) {
            throw new Error('Empty response');
        }

        return content;
    }

    resolvePath(path) {
        // Handle absolute paths
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
            return path;
        }

        // Handle relative paths
        const basePath = window.location.pathname.split('/').slice(0, -1).join('/');
        return `${basePath}/${path}`;
    }

    processIncludeContent(content, dataAttr) {
        if (!dataAttr) {
            return content;
        }

        try {
            const data = JSON.parse(dataAttr);
            return this.replaceTemplateVariables(content, data);
        } catch (error) {
            console.warn('Invalid include data JSON:', dataAttr, error);
            return content;
        }
    }

    replaceTemplateVariables(content, data) {
        return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data.hasOwnProperty(key) ? data[key] : match;
        });
    }

    async insertIncludeContent(element, content) {
        // Create a temporary container
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = content;

        // Extract scripts for later execution
        const scripts = tempContainer.querySelectorAll('script');
        const scriptContents = Array.from(scripts).map(script => ({
            content: script.innerHTML,
            src: script.src,
            type: script.type || 'text/javascript'
        }));

        // Remove scripts from content to avoid double execution
        scripts.forEach(script => script.remove());

        // Insert the content
        const insertMethod = element.getAttribute('data-include-method') || 'replace';

        switch (insertMethod) {
            case 'append':
                element.appendChild(tempContainer);
                break;
            case 'prepend':
                element.insertBefore(tempContainer, element.firstChild);
                break;
            case 'before':
                element.parentNode.insertBefore(tempContainer, element);
                break;
            case 'after':
                element.parentNode.insertBefore(tempContainer, element.nextSibling);
                break;
            case 'replace':
            default:
                element.innerHTML = tempContainer.innerHTML;
                break;
        }

        // Execute scripts
        await this.executeScripts(scriptContents);

        // Initialize any new components
        this.initializeComponents(element);
    }

    async executeScripts(scripts) {
        for (const script of scripts) {
            try {
                if (script.src) {
                    await this.loadExternalScript(script.src);
                } else if (script.content) {
                    this.executeInlineScript(script.content);
                }
            } catch (error) {
                console.error('Failed to execute script:', error);
            }
        }
    }

    loadExternalScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script already loaded
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    executeInlineScript(content) {
        try {
            const script = document.createElement('script');
            script.textContent = content;
            document.head.appendChild(script);
            document.head.removeChild(script);
        } catch (error) {
            console.error('Failed to execute inline script:', error);
        }
    }

    initializeComponents(container) {
        // Initialize Bootstrap components
        if (window.bootstrap) {
            // Initialize tooltips
            const tooltips = container.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));

            // Initialize popovers
            const popovers = container.querySelectorAll('[data-bs-toggle="popover"]');
            popovers.forEach(popover => new bootstrap.Popover(popover));

            // Initialize dropdowns
            const dropdowns = container.querySelectorAll('[data-bs-toggle="dropdown"]');
            dropdowns.forEach(dropdown => new bootstrap.Dropdown(dropdown));
        }

        // Initialize custom components
        this.dispatchEvent('componentsInit', { container });
    }

    showLoadingState(element) {
        element.classList.add('include-loading');

        // Add loading indicator if not present
        if (!element.querySelector('.include-loader')) {
            const loader = document.createElement('div');
            loader.className = 'include-loader';
            loader.innerHTML = `
        <div class="spinner-border spinner-border-sm" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      `;
            element.appendChild(loader);
        }
    }

    hideLoadingState(element) {
        element.classList.remove('include-loading');

        const loader = element.querySelector('.include-loader');
        if (loader) {
            loader.remove();
        }
    }

    showErrorState(element, error) {
        element.classList.remove('include-loading');
        element.classList.add('include-error');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'include-error-message alert alert-danger';
        errorDiv.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <div>
          <strong>Failed to load content</strong>
          <small class="d-block text-muted">${error.message}</small>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger ms-auto" onclick="includeSystem.retryInclude(this)">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;

        element.innerHTML = '';
        element.appendChild(errorDiv);
    }

    retryInclude(buttonElement) {
        const errorElement = buttonElement.closest('[data-include]');
        if (errorElement) {
            errorElement.classList.remove('include-error');
            this.loadInclude(errorElement);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(`include:${eventName}`, {
            detail: detail,
            bubbles: true,
            cancelable: true
        });

        document.dispatchEvent(event);
    }

    // Public API methods
    reloadInclude(element) {
        const includePath = element.getAttribute('data-include');
        if (includePath) {
            // Clear cache for this include
            this.cache.delete(includePath);
            return this.loadInclude(element);
        }
    }

    reloadAllIncludes() {
        // Clear cache
        this.cache.clear();
        return this.loadAllIncludes();
    }

    preloadInclude(path) {
        return this.fetchInclude(path, true);
    }

    clearCache(path = null) {
        if (path) {
            this.cache.delete(path);
        } else {
            this.cache.clear();
        }
    }

    getCache() {
        return Array.from(this.cache.keys());
    }

    getCacheSize() {
        return this.cache.size;
    }
}

// Initialize the include system
const includeSystem = new IncludeSystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IncludeSystem;
}

// AMD support
if (typeof define === 'function' && define.amd) {
    define(() => IncludeSystem);
}

// Global namespace
window.IncludeSystem = IncludeSystem;
window.includeSystem = includeSystem;

// CSS styles for loading states
const includeStyles = document.createElement('style');
includeStyles.textContent = `
  .include-loading {
    position: relative;
    min-height: 50px;
    opacity: 0.7;
  }
  
  .include-loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
  }
  
  .include-error {
    position: relative;
  }
  
  .include-error-message {
    margin: 0;
    border-radius: var(--radius-md, 0.5rem);
  }
  
  .include-error-message .btn {
    transition: all 0.2s ease;
  }
  
  .include-error-message .btn:hover {
    transform: translateY(-1px);
  }
  
  /* Animation for smooth content insertion */
  [data-include] {
    transition: opacity 0.3s ease;
  }
  
  .include-loading [data-include] {
    opacity: 0.5;
  }
`;

// Add styles to head
if (!document.querySelector('#include-styles')) {
    includeStyles.id = 'include-styles';
    document.head.appendChild(includeStyles);
}

// Event listeners for debugging (remove in production)
if (process?.env?.NODE_ENV === 'development') {
    document.addEventListener('include:includesLoaded', () => {
        console.log('All includes loaded successfully');
    });

    document.addEventListener('include:includeError', (e) => {
        console.error('Include error:', e.detail);
    });

    document.addEventListener('include:includeLoaded', (e) => {
        console.log('Include loaded:', e.detail.includePath);
    });
}