// Admin Content Browser Page
class AdminContentBrowser {
    constructor() {
        this.currentSource = 'tmdb';
        this.currentPage = 1;
        this.results = [];
        this.isLoading = false;
    }

    async init() {
        if (!AuthService.isAdmin()) {
            window.location.href = '/';
            return;
        }

        this.render();
        await this.loadContent();
    }

    async loadContent() {
        try {
            this.isLoading = true;
            this.renderResults();
            
            const params = {
                source: this.currentSource,
                page: this.currentPage,
                type: document.getElementById('content-type')?.value || 'movie',
                language: document.getElementById('content-language')?.value || 'en'
            };

            const response = await API.adminBrowseContent(params);
            this.results = response.results || [];
            
            this.renderResults();
        } catch (error) {
            console.error('Failed to browse content:', error);
            new Toast('Failed to load content', 'error').show();
        } finally {
            this.isLoading = false;
        }
    }

    render() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="admin-content-browser">
                <!-- Header -->
                <div class="bg-secondary-bg mb-8">
                    <div class="container mx-auto px-4 py-6">
                        <div class="flex items-center justify-between">
                            <h1 class="text-3xl font-bold">Browse Content</h1>
                            <a href="/admin" class="text-text-secondary hover:text-netflix-red transition">
                                <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                            </a>
                        </div>
                    </div>
                </div>

                <div class="container mx-auto px-4">
                    <!-- Filters -->
                    <div class="bg-card-bg rounded-lg p-6 mb-8">
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <!-- Source -->
                            <select id="content-source" onchange="AdminContentBrowserInstance.changeSource()" 
                                    class="bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                                <option value="tmdb">TMDB</option>
                                <option value="regional">Regional</option>
                                <option value="anime">Anime (Jikan)</option>
                            </select>

                            <!-- Type -->
                            <select id="content-type" onchange="AdminContentBrowserInstance.loadContent()"
                                    class="bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                                <option value="movie">Movies</option>
                                <option value="tv">TV Shows</option>
                            </select>

                            <!-- Language -->
                            <select id="content-language" onchange="AdminContentBrowserInstance.loadContent()"
                                    class="bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                                <option value="en">English</option>
                                <option value="te">Telugu</option>
                                <option value="hi">Hindi</option>
                                <option value="ta">Tamil</option>
                                <option value="kn">Kannada</option>
                            </select>

                            <!-- Search -->
                            <div class="relative">
                                <input type="text" id="content-search" placeholder="Search content..."
                                       class="w-full bg-secondary-bg border border-border-color rounded pl-10 pr-4 py-2 focus:outline-none focus:border-netflix-red">
                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Results -->
                    <div id="browse-results">
                        ${this.renderResults()}
                    </div>

                    <!-- Pagination -->
                    <div class="flex justify-center mt-8 space-x-2">
                        <button onclick="AdminContentBrowserInstance.changePage(-1)" 
                                class="px-4 py-2 bg-secondary-bg rounded hover:bg-hover-bg transition disabled:opacity-50"
                                ${this.currentPage === 1 ? 'disabled' : ''}>
                            Previous
                        </button>
                        <span class="px-4 py-2">Page ${this.currentPage}</span>
                        <button onclick="AdminContentBrowserInstance.changePage(1)" 
                                class="px-4 py-2 bg-secondary-bg rounded hover:bg-hover-bg transition">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderResults() {
        const container = document.getElementById('browse-results');
        if (!container) return '';

        if (this.isLoading) {
            container.innerHTML = Loading.skeleton(12, 'card');
            return;
        }

        if (this.results.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16">
                    <i class="fas fa-inbox text-6xl text-text-muted mb-4"></i>
                    <p class="text-text-secondary">No content found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                ${this.results.map(item => this.renderContentItem(item)).join('')}
            </div>
        `;
    }

    renderContentItem(item) {
        const posterUrl = item.poster_path ? 
            `https://image.tmdb.org/t/p/w500${item.poster_path}` : 
            (item.image?.jpg?.image_url || '/assets/images/placeholders/no-poster.png');

        return `
            <div class="bg-card-bg rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-netflix-red transition"
                 onclick="AdminContentBrowserInstance.selectContent(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <div class="aspect-[2/3] relative">
                    <img src="${posterUrl}" alt="${item.title || item.name}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='/assets/images/placeholders/no-poster.png'">
                    ${item.vote_average ? `
                        <div class="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded">
                            <i class="fas fa-star text-yellow-500 text-xs mr-1"></i>
                            <span class="text-xs">${item.vote_average.toFixed(1)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="p-3">
                    <h3 class="font-medium text-sm line-clamp-2">${item.title || item.name}</h3>
                    <p class="text-xs text-text-muted mt-1">
                        ${item.release_date || item.first_air_date || ''}
                    </p>
                </div>
            </div>
        `;
    }

    selectContent(item) {
        // Store selected content and navigate to post creator
        sessionStorage.setItem('selectedContent', JSON.stringify(item));
        window.location.href = '/admin/create-post';
    }

    changeSource() {
        this.currentSource = document.getElementById('content-source').value;
        this.currentPage = 1;
        this.loadContent();
    }

    changePage(direction) {
        this.currentPage = Math.max(1, this.currentPage + direction);
        this.loadContent();
    }
}

const AdminContentBrowserInstance = new AdminContentBrowser();
