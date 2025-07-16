// Content Card Component
class ContentCard {
    constructor(content, options = {}) {
        this.content = content;
        this.options = {
            showRating: true,
            showYear: true,
            showGenres: true,
            size: 'medium', // small, medium, large
            lazyLoad: true,
            ...options
        };
    }

    render() {
        const {
            id,
            title,
            poster_path,
            backdrop_path,
            rating,
            release_date,
            genre_names,
            overview
        } = this.content;

        const imageUrl = Utils.getImageUrl(
            poster_path || backdrop_path, 
            'poster', 
            this.options.size
        );

        const year = release_date ? new Date(release_date).getFullYear() : '';

        const sizeClasses = {
            small: 'w-32 md:w-40',
            medium: 'w-40 md:w-48',
            large: 'w-48 md:w-64'
        };

        return `
            <div class="content-card ${sizeClasses[this.options.size]} flex-shrink-0 group cursor-pointer"
                 onclick="ContentCardInstance.handleClick(${id})">
                <div class="relative overflow-hidden rounded-lg bg-card-bg">
                    <!-- Image -->
                    <div class="aspect-[2/3] relative">
                        <img 
                            ${this.options.lazyLoad ? 'loading="lazy"' : ''}
                            src="${imageUrl}"
                            alt="${title}"
                            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            onerror="this.src='/assets/images/placeholders/no-poster.png'"
                        >
                        
                        <!-- Overlay -->
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div class="absolute bottom-0 left-0 right-0 p-3">
                                <p class="text-xs text-text-secondary line-clamp-3">
                                    ${Utils.truncateText(overview, 100) || 'No description available'}
                                </p>
                            </div>
                        </div>

                        <!-- Rating Badge -->
                        ${this.options.showRating && rating ? `
                            <div class="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded flex items-center space-x-1">
                                <i class="fas fa-star text-yellow-500 text-xs"></i>
                                <span class="text-xs font-semibold">${rating.toFixed(1)}</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Content Info -->
                    <div class="p-3">
                        <h3 class="font-medium text-sm line-clamp-2 mb-1">${title}</h3>
                        
                        <div class="flex items-center justify-between text-xs text-text-muted">
                            ${this.options.showYear && year ? `<span>${year}</span>` : '<span></span>'}
                            ${this.options.showGenres && genre_names && genre_names.length > 0 ? `
                                <span class="line-clamp-1">${genre_names[0]}</span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Quick Actions (Show on hover) -->
                    <div class="absolute top-2 left-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button onclick="ContentCardInstance.addToWishlist(event, ${id})" 
                                class="w-8 h-8 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-netflix-red transition">
                            <i class="fas fa-plus text-xs"></i>
                        </button>
                        <button onclick="ContentCardInstance.likeContent(event, ${id})" 
                                class="w-8 h-8 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-netflix-red transition">
                            <i class="fas fa-heart text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    static handleClick(contentId) {
        window.location.href = `/content/${contentId}`;
    }

    static async addToWishlist(event, contentId) {
        event.stopPropagation();
        if (!AuthService.isAuthenticated()) {
            new Toast('Please sign in to add to wishlist', 'warning').show();
            return;
        }

        try {
            await API.recordInteraction(contentId, 'wishlist');
            new Toast('Added to wishlist!', 'success').show();
        } catch (error) {
            new Toast('Failed to add to wishlist', 'error').show();
        }
    }

    static async likeContent(event, contentId) {
        event.stopPropagation();
        if (!AuthService.isAuthenticated()) {
            new Toast('Please sign in to like content', 'warning').show();
            return;
        }

        try {
            await API.recordInteraction(contentId, 'like');
            new Toast('Added to favorites!', 'success').show();
        } catch (error) {
            new Toast('Failed to add to favorites', 'error').show();
        }
    }
}

// Create global instance for event handlers
const ContentCardInstance = ContentCard;