

// HTML Include System
async function includeHTML(containerId, filePath) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container with ID "${containerId}" not found`);
        return false;
    }

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: ${response.status}`);
        }
        
        const html = await response.text();
        container.innerHTML = html;
        
        // Trigger custom event for include loaded
        const event = new CustomEvent('includeLoaded', {
            detail: { containerId, filePath }
        });
        document.dispatchEvent(event);
        
        return true;
    } catch (error) {
        console.error(`Error including ${filePath}:`, error);
        
        // Show fallback content for critical includes
        if (containerId === 'header-container') {
            container.innerHTML = createFallbackHeader();
        } else if (containerId === 'footer-container') {
            container.innerHTML = createFallbackFooter();
        }
        
        return false;
    }
}

function createFallbackHeader() {
    return `
        <nav class="navbar fixed-top" style="background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(20px); border-bottom: 1px solid #333;">
            <div class="nav-container" style="max-width: 1400px; margin: 0 auto; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                <div class="nav-brand">
                    <a href="/" style="text-decoration: none;">
                        <span style="font-size: 1.8rem; font-weight: 700; background: linear-gradient(135deg, #2E86AB, #A23B72); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">CineScope</span>
                    </a>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <a href="/" style="color: #B8B8B8; text-decoration: none;">Home</a>
                    <a href="/search" style="color: #B8B8B8; text-decoration: none;">Search</a>
                    <button onclick="showLogin()" style="background: linear-gradient(135deg, #2E86AB, #A23B72); color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 2rem; cursor: pointer;">
                        Sign In
                    </button>
                </div>
            </div>
        </nav>
    `;
}

function createFallbackFooter() {
    return `
        <footer style="background: #1A1A1A; padding: 2rem 0; margin-top: 4rem; border-top: 1px solid #333;">
            <div style="max-width: 1400px; margin: 0 auto; padding: 0 1.5rem; text-align: center;">
                <p style="color: #8A8A8A; margin: 0;">© 2024 CineScope. All rights reserved.</p>
            </div>
        </footer>
    `;
}

// Auto-include system for data-include attributes
document.addEventListener('DOMContentLoaded', () => {
    const includeElements = document.querySelectorAll('[data-include]');
    
    const loadPromises = Array.from(includeElements).map(element => {
        const filePath = element.dataset.include;
        const containerId = element.id || `include-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        if (!element.id) {
            element.id = containerId;
        }
        
        return includeHTML(containerId, filePath);
    });
    
    Promise.allSettled(loadPromises).then(results => {
        const failed = results.filter(result => result.status === 'rejected').length;
        if (failed > 0) {
            console.warn(`${failed} includes failed to load`);
        }
    });
});

// Dynamic include loader
class IncludeManager {
    constructor() {
        this.cache = new Map();
        this.loading = new Set();
    }

    async load(containerId, filePath, useCache = true) {
        // Prevent duplicate loads
        const loadKey = `${containerId}:${filePath}`;
        if (this.loading.has(loadKey)) {
            return false;
        }

        this.loading.add(loadKey);

        try {
            let html;
            
            if (useCache && this.cache.has(filePath)) {
                html = this.cache.get(filePath);
            } else {
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                html = await response.text();
                
                if (useCache) {
                    this.cache.set(filePath, html);
                }
            }

            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = html;
                
                // Process any nested includes
                await this.processNestedIncludes(container);
                
                // Trigger loaded event
                container.dispatchEvent(new CustomEvent('includeLoaded', {
                    detail: { filePath, cached: useCache && this.cache.has(filePath) }
                }));
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Failed to load include ${filePath}:`, error);
            return false;
        } finally {
            this.loading.delete(loadKey);
        }
    }

    async processNestedIncludes(container) {
        const nestedIncludes = container.querySelectorAll('[data-include]');
        
        if (nestedIncludes.length > 0) {
            const nestedPromises = Array.from(nestedIncludes).map(element => {
                const filePath = element.dataset.include;
                const containerId = element.id || `nested-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                if (!element.id) {
                    element.id = containerId;
                }
                
                return this.load(containerId, filePath);
            });
            
            await Promise.allSettled(nestedPromises);
        }
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheSize() {
        return this.cache.size;
    }

    preload(filePaths) {
        return Promise.allSettled(
            filePaths.map(async filePath => {
                try {
                    const response = await fetch(filePath);
                    if (response.ok) {
                        const html = await response.text();
                        this.cache.set(filePath, html);
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.warn(`Preload failed for ${filePath}:`, error);
                    return false;
                }
            })
        );
    }
}

// Global include manager
window.IncludeManager = new IncludeManager();

// Preload common includes
document.addEventListener('DOMContentLoaded', () => {
    window.IncludeManager.preload([
        '/includes/header.html',
        '/includes/footer.html'
    ]);
});