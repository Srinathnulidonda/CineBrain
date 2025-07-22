// Include Manager for loading reusable HTML components
class IncludeManager {
    static cache = new Map();
    
    static async loadIncludes() {
        const includes = document.querySelectorAll('[data-include]');
        const promises = [];
        
        includes.forEach(element => {
            const includeFile = element.getAttribute('data-include');
            const filePath = `/includes/${includeFile}.html`;
            
            promises.push(this.loadInclude(element, filePath));
        });
        
        await Promise.all(promises);
        
        // Initialize components after includes are loaded
        this.initializeComponents();
    }
    
    static async loadInclude(element, filePath) {
        try {
            // Check cache first
            if (this.cache.has(filePath)) {
                element.innerHTML = this.cache.get(filePath);
                return;
            }
            
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Cache the content
            this.cache.set(filePath, html);
            
            // Insert into element
            element.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading include:', error);
            element.innerHTML = `<!-- Failed to load ${filePath} -->`;
        }
    }
    
    static initializeComponents() {
        // Initialize dropdowns
        this.initializeDropdowns();
        
        // Initialize search
        this.initializeGlobalSearch();
        
        // Initialize mobile menu
        this.initializeMobileMenu();
        
        // Initialize tooltips
        this.initializeTooltips();
    }
    
    static initializeDropdowns() {
        document.addEventListener('click', (e) => {
            // Close all dropdowns when clicking outside
            if (!e.target.closest('.nav-dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.opacity = '0';
                    menu.style.visibility = 'hidden';
                    menu.style.transform = 'translateY(-10px)';
                });
            }
        });
        
        // Handle dropdown hovers
        document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
            const menu = dropdown.querySelector('.dropdown-menu');
            if (!menu) return;
            
            dropdown.addEventListener('mouseenter', () => {
                menu.style.opacity = '1';
                menu.style.visibility = 'visible';
                menu.style.transform = 'translateY(0)';
            });
            
            dropdown.addEventListener('mouseleave', () => {
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
                menu.style.transform = 'translateY(-10px)';
            });
        });
    }
    
    static initializeGlobalSearch() {
        const searchInput = document.getElementById('globalSearch');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput || !searchResults) return;
        
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(searchTimeout);
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    this.performQuickSearch(query);
                }, 300);
            } else {
                searchResults.classList.add('hidden');
            }
        });
        
        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults.classList.add('hidden');
            }
        });
        
        // Handle enter key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `/search?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }
    
    static async performQuickSearch(query) {
        const searchResults = document.getElementById('searchResults');
        
        try {
            searchResults.innerHTML = '<div class="p-4 text-center"><div class="spinner mx-auto"></div></div>';
            searchResults.classList.remove('hidden');
            
            const response = await APIService.searchContent(query);
            
            if (response && response.results && response.results.length > 0) {
                const resultsHTML = response.results.slice(0, 6).map(item => `
                    <div class="search-result-item" onclick="window.location.href='/details?id=${item.id}'">
                        <img src="${item.poster_path || '/assets/images/placeholder.jpg'}" 
                             alt="${item.title}" 
                             class="w-12 h-16 object-cover rounded mr-3 flex-shrink-0"
                             onerror="this.src='/assets/images/placeholder.jpg'">
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-white truncate">${item.title}</div>
                            <div class="text-sm text-gray-400">${item.content_type.toUpperCase()}</div>
                            ${item.rating ? `<div class="text-xs text-yellow-400">
                                <i class="fas fa-star"></i> ${item.rating.toFixed(1)}
                            </div>` : ''}
                        </div>
                    </div>
                `).join('');
                
                searchResults.innerHTML = resultsHTML + 
                    `<div class="p-3 border-t border-gray-700">
                        <a href="/search?q=${encodeURIComponent(query)}" 
                           class="text-primary-500 hover:text-primary-400 text-sm">
                            View all results for "${query}"
                        </a>
                    </div>`;
            } else {
                searchResults.innerHTML = `
                    <div class="p-4 text-center text-gray-400">
                        No results found for "${query}"
                    </div>
                `;
            }
        } catch (error) {
            console.error('Quick search error:', error);
            searchResults.innerHTML = `
                <div class="p-4 text-center text-red-400">
                    Search error. Please try again.
                </div>
            `;
        }
    }
    
    static initializeMobileMenu() {
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileNav = document.querySelector('.mobile-nav');
        
        if (!mobileMenuToggle || !mobileNav) return;
        
        mobileMenuToggle.addEventListener('click', () => {
            mobileNav.classList.toggle('hidden');
            const icon = mobileMenuToggle.querySelector('i');
            
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
        
        // Close mobile menu when clicking on a link
        mobileNav.addEventListener('click', (e) => {
            if (e.target.matches('a')) {
                mobileNav.classList.add('hidden');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            }
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-menu-toggle') && !e.target.closest('.mobile-nav')) {
                mobileNav.classList.add('hidden');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            }
        });
    }
    
    static initializeTooltips() {
        // Simple tooltip implementation
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = e.target.getAttribute('data-tooltip');
                document.body.appendChild(tooltip);
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
                tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
            });
            
            element.addEventListener('mouseleave', () => {
                document.querySelectorAll('.tooltip').forEach(tooltip => {
                    tooltip.remove();
                });
            });
        });
    }
    
    // Utility method to refresh includes
    static async refreshIncludes() {
        this.cache.clear();
        await this.loadIncludes();
    }
    
    // Method to preload includes for better performance
    static async preloadIncludes() {
        const includeFiles = ['header', 'footer', 'sidebar'];
        const promises = includeFiles.map(file => 
            fetch(`/includes/${file}.html`)
                .then(response => response.text())
                .then(html => this.cache.set(`/includes/${file}.html`, html))
                .catch(error => console.warn(`Failed to preload ${file}:`, error))
        );
        
        await Promise.all(promises);
    }
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        IncludeManager.loadIncludes();
    });
} else {
    IncludeManager.loadIncludes();
}

// Export for global access
window.IncludeManager = IncludeManager;