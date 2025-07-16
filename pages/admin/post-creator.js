// Admin Post Creator Page
class AdminPostCreator {
    constructor() {
        this.selectedContent = null;
        this.contentDetails = null;
    }

    async init() {
        if (!AuthService.isAdmin()) {
            window.location.href = '/';
            return;
        }

        // Get selected content from session
        const storedContent = sessionStorage.getItem('selectedContent');
        if (storedContent) {
            this.selectedContent = JSON.parse(storedContent);
            sessionStorage.removeItem('selectedContent');
        }

        this.render();
    }

    render() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="admin-post-creator">
                <!-- Header -->
                <div class="bg-secondary-bg mb-8">
                    <div class="container mx-auto px-4 py-6">
                        <div class="flex items-center justify-between">
                            <h1 class="text-3xl font-bold">Create Admin Post</h1>
                            <a href="/admin/browse" class="text-text-secondary hover:text-netflix-red transition">
                                <i class="fas fa-arrow-left mr-2"></i>Browse Content
                            </a>
                        </div>
                    </div>
                </div>

                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto">
                        ${this.selectedContent ? this.renderPostForm() : this.renderNoContent()}
                    </div>
                </div>
            </div>
        `;
    }

    renderNoContent() {
        return `
            <div class="text-center py-16">
                <i class="fas fa-film text-6xl text-text-muted mb-4"></i>
                <p class="text-xl mb-6">No content selected</p>
                <a href="/admin/browse" class="bg-netflix-red hover:bg-hover-red px-6 py-3 rounded font-medium transition">
                    Browse Content
                </a>
            </div>
        `;
    }

    renderPostForm() {
        const { title, overview, poster_path, vote_average } = this.selectedContent;
        const posterUrl = poster_path ? 
            `https://image.tmdb.org/t/p/w500${poster_path}` : 
            '/assets/images/placeholders/no-poster.png';

        return `
            <form onsubmit="AdminPostCreatorInstance.handleSubmit(event)">
                <!-- Selected Content -->
                <div class="bg-card-bg rounded-lg p-6 mb-8">
                    <h2 class="text-xl font-bold mb-4">Selected Content</h2>
                    <div class="flex gap-6">
                        <img src="${posterUrl}" alt="${title}" 
                             class="w-32 rounded-lg"
                             onerror="this.src='/assets/images/placeholders/no-poster.png'">
                        <div>
                            <h3 class="text-lg font-medium mb-2">${title}</h3>
                            <p class="text-text-secondary text-sm mb-2">${overview || 'No description'}</p>
                            ${vote_average ? `
                                <div class="flex items-center">
                                    <i class="fas fa-star text-yellow-500 mr-1"></i>
                                    <span>${vote_average.toFixed(1)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Post Details -->
                <div class="bg-card-bg rounded-lg p-6 mb-8">
                    <h2 class="text-xl font-bold mb-4">Post Details</h2>
                    
                    <!-- Title -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Post Title *</label>
                        <input type="text" name="title" required
                               placeholder="e.g., Must-Watch Action Thriller!"
                               class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                    </div>

                    <!-- Description -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Description *</label>
                        <textarea name="description" rows="4" required
                                  placeholder="Why should people watch this? What makes it special?"
                                  class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red"></textarea>
                    </div>

                    <!-- Tags -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Tags (comma separated)</label>
                        <input type="text" name="tags"
                               placeholder="thriller, action, must-watch"
                               class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                    </div>

                    <!-- Priority -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Priority</label>
                        <select name="priority" 
                                class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                            <option value="1">Normal</option>
                            <option value="2">High</option>
                            <option value="3">Featured</option>
                        </select>
                    </div>

                    <!-- Expiry -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Expires On (optional)</label>
                        <input type="date" name="expires_at"
                               min="${new Date().toISOString().split('T')[0]}"
                               class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                    </div>
                </div>

                <!-- Publishing Options -->
                <div class="bg-card-bg rounded-lg p-6 mb-8">
                    <h2 class="text-xl font-bold mb-4">Publishing Options</h2>
                    
                    <label class="flex items-center mb-3">
                        <input type="checkbox" name="post_to_website" checked
                               class="mr-3 accent-netflix-red">
                        <span>Post to Website</span>
                    </label>
                    
                    <label class="flex items-center">
                        <input type="checkbox" name="post_to_telegram"
                               class="mr-3 accent-netflix-red">
                        <span>Share on Telegram Channel</span>
                    </label>
                </div>

                <!-- Submit -->
                <div class="flex justify-end space-x-4">
                    <a href="/admin" class="px-6 py-3 bg-secondary-bg hover:bg-hover-bg rounded transition">
                        Cancel
                    </a>
                    <button type="submit" class="px-6 py-3 bg-netflix-red hover:bg-hover-red rounded font-medium transition">
                        Create Post
                    </button>
                </div>
            </form>
        `;
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const tags = formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [];
        
        const postData = {
            tmdb_id: this.selectedContent.id,
            tmdb_data: this.selectedContent,
            title: formData.get('title'),
            description: formData.get('description'),
            custom_tags: tags,
            priority: parseInt(formData.get('priority')),
            post_to_website: formData.get('post_to_website') === 'on',
            post_to_telegram: formData.get('post_to_telegram') === 'on',
            expires_at: formData.get('expires_at') || null
        };

        try {
            Loading.show('Creating post...');
            const response = await API.adminCreatePost(postData);
            
            new Toast('Post created successfully!', 'success').show();
            
            if (response.telegram_sent) {
                new Toast('Also shared on Telegram!', 'success').show();
            }
            
            window.location.href = '/admin/posts';
        } catch (error) {
            new Toast('Failed to create post', 'error').show();
        } finally {
            Loading.hide();
        }
    }
}

const AdminPostCreatorInstance = new AdminPostCreator();