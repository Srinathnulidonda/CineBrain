// Optimized Content Detail Component
class ContentDetail {
    static renderDetailHeader(content) {
        const backdropUrl = Utils.getImageUrl(content.backdrop_path, 'backdrop', 'large');
        const posterUrl = Utils.getImageUrl(content.poster_path, 'poster', 'large');

        return `
            <section class="detail-header relative">
                <!-- Backdrop -->
                <div class="absolute inset-0 h-[60vh]">
                    <img src="${backdropUrl}" alt="${content.title}" 
                         class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-primary-bg/70 to-primary-bg"></div>
                </div>

                <!-- Content -->
                <div class="relative container mx-auto px-4 pt-32 pb-8">
                    <div class="flex flex-col md:flex-row gap-8">
                        <!-- Poster -->
                        <div class="flex-shrink-0">
                            <img src="${posterUrl}" alt="${content.title}" 
                                 class="w-48 md:w-64 rounded-lg shadow-2xl">
                        </div>

                        <!-- Info -->
                        <div class="flex-1">
                            <h1 class="text-3xl md:text-5xl font-bold mb-4">${content.title}</h1>
                            ${this.renderMetaInfo(content)}
                            ${this.renderActionButtons(content)}
                            ${this.renderOverview(content)}
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    static renderMetaInfo(content) {
        const year = content.release_date ? new Date(content.release_date).getFullYear() : '';
        
        return `
            <div class="flex flex-wrap items-center gap-4 mb-6 text-sm">
                ${year ? `<span>${year}</span>` : ''}
                ${content.runtime ? `<span>${Utils.formatRuntime(content.runtime)}</span>` : ''}
                ${content.rating ? `
                    <span class="flex items-center">
                        <i class="fas fa-star text-yellow-500 mr-1"></i>
                        ${content.rating.toFixed(1)}
                    </span>
                ` : ''}
                ${content.content_type ? `
                    <span class="px-2 py-1 bg-secondary-bg rounded text-xs uppercase">
                        ${content.content_type}
                    </span>
                ` : ''}
            </div>
        `;
    }

    static renderActionButtons(content) {
        return `
            <div class="flex flex-wrap gap-4 mb-8">
                <button onclick="ContentDetail.playTrailer(${content.id})" 
                        class="bg-netflix-red hover:bg-hover-red px-6 py-3 rounded font-medium transition">
                    <i class="fas fa-play mr-2"></i>Play Trailer
                </button>
                <button onclick="UserInteractions.toggleWishlist(${content.id}, this)" 
                        class="bg-secondary-bg hover:bg-hover-bg px-6 py-3 rounded font-medium transition">
                    <i class="far fa-bookmark mr-2"></i>Watchlist
                </button>
                <button onclick="UserInteractions.toggleFavorite(${content.id}, this)" 
                        class="bg-secondary-bg hover:bg-hover-bg px-6 py-3 rounded font-medium transition">
                    <i class="far fa-heart mr-2"></i>Favorite
                </button>
                <button onclick="ContentDetail.share(${content.id})" 
                        class="bg-secondary-bg hover:bg-hover-bg px-6 py-3 rounded font-medium transition">
                    <i class="fas fa-share mr-2"></i>Share
                </button>
            </div>
        `;
    }

    static renderOverview(content) {
        return `
            <div class="mb-8">
                <h2 class="text-xl font-bold mb-3">Overview</h2>
                <p class="text-text-secondary leading-relaxed">
                    ${content.overview || 'No overview available'}
                </p>
            </div>
        `;
    }

    static async playTrailer(contentId) {
        // Implementation handled in detail page
    }

    static async share(contentId) {
        const url = `${window.location.origin}/content/${contentId}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this content!',
                    url: url
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    this.copyToClipboard(url);
                }
            }
        } else {
            this.copyToClipboard(url);
        }
    }

    static copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            new Toast('Link copied to clipboard!', 'success').show();
        }).catch(() => {
            new Toast('Failed to copy link', 'error').show();
        });
    }
}