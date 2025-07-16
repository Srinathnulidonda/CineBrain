// Content Detail Page
class DetailPage {
    constructor(contentId) {
        this.contentId = contentId;
        this.data = null;
    }

    async init() {
        try {
            Loading.show();
            this.data = await API.getContentDetails(this.contentId);
            this.render();
        } catch (error) {
            console.error('Failed to load content details:', error);
            new Toast('Failed to load content details', 'error').show();
        } finally {
            Loading.hide();
        }
    }

    render() {
        const mainContent = document.getElementById('main-content');
        
        if (!this.data) {
            mainContent.innerHTML = '<div class="container mx-auto px-4 py-8">Content not found</div>';
            return;
        }

        const { content, tmdb_details, youtube_videos, user_reviews, similar_content } = this.data;
        const backdropUrl = Utils.getImageUrl(content.backdrop_path, 'backdrop', 'large');
        const posterUrl = Utils.getImageUrl(content.poster_path, 'poster', 'large');

        mainContent.innerHTML = `
            <div class="detail-page">
                <!-- Hero Section -->
                <section class="relative h-[50vh] md:h-[70vh] overflow-hidden">
                    <!-- Background -->
                    <div class="absolute inset-0">
                        <img 
                            src="${backdropUrl}"
                            alt="${content.title}"
                            class="w-full h-full object-cover"
                            onerror="this.style.display='none'"
                        >
                        <div class="absolute inset-0 bg-gradient-to-t from-primary-bg via-primary-bg/70 to-transparent"></div>
                    </div>

                    <!-- Back Button -->
                    <button onclick="history.back()" 
                            class="absolute top-4 left-4 z-20 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                </section>

                <!-- Content Details -->
                <div class="container mx-auto px-4 -mt-32 relative z-10">
                    <div class="flex flex-col md:flex-row gap-8">
                        <!-- Poster -->
                        <div class="flex-shrink-0">
                            <img 
                                src="${posterUrl}"
                                alt="${content.title}"
                                class="w-48 md:w-64 rounded-lg shadow-2xl"
                                onerror="this.src='/assets/images/placeholders/no-poster.png'"
                            >
                        </div>

                        <!-- Info -->
                        <div class="flex-1">
                            <h1 class="text-3xl md:text-5xl font-bold mb-4">${content.title}</h1>
                            
                            <!-- Meta Info -->
                            <div class="flex flex-wrap items-center gap-4 mb-6 text-sm text-text-secondary">
                                ${content.release_date ? `
                                    <span>${new Date(content.release_date).getFullYear()}</span>
                                ` : ''}
                                ${content.runtime ? `
                                    <span>${Utils.formatRuntime(content.runtime)}</span>
                                ` : ''}
                                ${content.rating ? `
                                    <span class="flex items-center">
                                        <i class="fas fa-star text-yellow-500 mr-1"></i>
                                        ${content.rating.toFixed(1)}
                                    </span>
                                ` : ''}
                            </div>

                            <!-- Genres -->
                            ${content.genre_names && content.genre_names.length > 0 ? `
                                <div class="flex flex-wrap gap-2 mb-6">
                                    ${content.genre_names.map(genre => `
                                        <span class="px-3 py-1 bg-secondary-bg rounded-full text-sm">
                                            ${genre}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}

                            <!-- Actions -->
                            <div class="flex flex-wrap gap-4 mb-8">
                                ${youtube_videos?.trailers?.length > 0 ? `
                                    <button onclick="DetailPageInstance.playTrailer('${youtube_videos.trailers[0].video_id}')" 
                                            class="bg-netflix-red hover:bg-hover-red px-6 py-3 rounded font-medium transition flex items-center">
                                        <i class="fas fa-play mr-2"></i>
                                        Play Trailer
                                    </button>
                                ` : ''}
                                <button onclick="DetailPageInstance.addToWishlist()" 
                                        class="bg-secondary-bg hover:bg-hover-bg px-6 py-3 rounded font-medium transition">
                                    <i class="fas fa-plus mr-2"></i>
                                    My List
                                </button>
                                <button onclick="DetailPageInstance.likeContent()" 
                                        class="bg-secondary-bg hover:bg-hover-bg px-6 py-3 rounded font-medium transition">
                                    <i class="fas fa-heart mr-2"></i>
                                    Like
                                </button>
                            </div>

                            <!-- Overview -->
                            <div class="mb-8">
                                <h2 class="text-xl font-bold mb-3">Overview</h2>
                                <p class="text-text-secondary leading-relaxed">
                                    ${content.overview || 'No overview available'}
                                </p>
                            </div>

                            <!-- Cast & Crew -->
                            ${tmdb_details?.credits ? this.renderCastCrew(tmdb_details.credits) : ''}
                        </div>
                    </div>

                    <!-- Videos Section -->
                    ${youtube_videos ? this.renderVideos(youtube_videos) : ''}

                    <!-- Reviews -->
                    ${user_reviews && user_reviews.length > 0 ? this.renderReviews(user_reviews) : ''}

                    <!-- Similar Content -->
                    ${similar_content && similar_content.length > 0 ? `
                        <div class="mt-12">
                            ${new ContentSlider('More Like This', similar_content).render()}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderCastCrew(credits) {
        const cast = credits.cast?.slice(0, 10) || [];
        if (cast.length === 0) return '';

        return `
            <div class="mb-8">
                <h2 class="text-xl font-bold mb-4">Cast</h2>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    ${cast.map(person => `
                        <div class="text-center">
                            <div class="w-20 h-20 mx-auto mb-2 bg-secondary-bg rounded-full overflow-hidden">
                                ${person.profile_path ? `
                                    <img 
                                        src="${Utils.getImageUrl(person.profile_path, 'poster', 'small')}"
                                        alt="${person.name}"
                                        class="w-full h-full object-cover"
                                    >
                                ` : `
                                    <div class="w-full h-full flex items-center justify-center">
                                        <i class="fas fa-user text-2xl text-text-muted"></i>
                                    </div>
                                `}
                            </div>
                            <p class="text-sm font-medium">${person.name}</p>
                            <p class="text-xs text-text-muted">${person.character}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderVideos(videos) {
        const allVideos = [...(videos.trailers || []), ...(videos.teasers || [])];
        if (allVideos.length === 0) return '';

        return `
            <div class="mt-12">
                <h2 class="text-xl font-bold mb-4">Videos</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${allVideos.slice(0, 6).map(video => `
                        <div class="cursor-pointer group" onclick="DetailPageInstance.playTrailer('${video.video_id}')">
                            <div class="relative aspect-video rounded-lg overflow-hidden bg-secondary-bg">
                                <img 
                                    src="${video.thumbnail}"
                                    alt="${video.title}"
                                    class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                >
                                <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div class="w-16 h-16 bg-netflix-red rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <i class="fas fa-play text-white text-xl ml-1"></i>
                                    </div>
                                </div>
                            </div>
                            <p class="mt-2 text-sm line-clamp-2">${video.title}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderReviews(reviews) {
        return `
            <div class="mt-12">
                <h2 class="text-xl font-bold mb-4">User Reviews</h2>
                <div class="space-y-4">
                    ${reviews.map(review => `
                        <div class="bg-secondary-bg rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-medium">${review.username}</span>
                                <div class="flex items-center">
                                    <i class="fas fa-star text-yellow-500 mr-1"></i>
                                    <span>${review.rating}/10</span>
                                </div>
                            </div>
                            <p class="text-sm text-text-secondary">
                                ${new Date(review.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async addToWishlist() {
        if (!AuthService.isAuthenticated()) {
            new Toast('Please sign in to add to wishlist', 'warning').show();
            return;
        }

        try {
            await API.recordInteraction(this.contentId, 'wishlist');
            new Toast('Added to wishlist!', 'success').show();
        } catch (error) {
            new Toast('Failed to add to wishlist', 'error').show();
        }
    }

    async likeContent() {
        if (!AuthService.isAuthenticated()) {
            new Toast('Please sign in to like content', 'warning').show();
            return;
        }

        try {
            await API.recordInteraction(this.contentId, 'like');
            new Toast('Added to favorites!', 'success').show();
        } catch (error) {
            new Toast('Failed to add to favorites', 'error').show();
        }
    }

    playTrailer(videoId) {
        const modal = new Modal({
            title: '',
            content: `
                <div class="aspect-video">
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                    ></iframe>
                </div>
            `,
            size: 'large',
            showHeader: false
        });
        modal.show();
    }
}

// Create global instance for event handlers
const DetailPageInstance = DetailPage;