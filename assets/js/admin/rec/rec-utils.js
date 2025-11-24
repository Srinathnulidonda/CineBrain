// rec-utils.js - Fixed version with proper null handling

class RecUtils {
    constructor() {
        this.placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2luZUJyYWluPC90ZXh0Pjwvc3ZnPg==';
    }

    createContentCard(content, context = 'search') {
        // Add null safety
        if (!content) {
            console.warn('createContentCard: content is null/undefined');
            return '';
        }

        const posterUrl = this.getPosterUrl(content);
        const rating = this.formatRating(content.rating || content.vote_average);
        const year = this.extractYear(content.release_date || content.first_air_date);
        const contentType = content.content_type || content.media_type || 'movie';
        const contentId = content.id || content.tmdb_id || content.mal_id || Date.now();
        const runtime = this.formatRuntime(content.runtime);
        const genres = this.getGenres(content);

        if (context === 'search') {
            return `
                <div class="content-card" data-content-id="${contentId}" data-source="${content.source || 'tmdb'}" tabindex="0">
                    <div class="card-poster-container">
                        <img class="card-poster" data-src="${posterUrl}" alt="${this.escapeHtml(content.title || content.name || 'Content')}" loading="lazy">
                        
                        <div class="content-type-badge ${contentType}">
                            ${contentType.toUpperCase()}
                        </div>

                        <div class="card-overlays">
                            <div class="card-top-overlay"></div>
                            <div class="card-bottom-overlay">
                                <div class="rating-badge">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                    <span>${rating}</span>
                                </div>
                                <div class="card-actions">
                                    <button class="action-btn recommend-btn" onclick="window.recSearch.recommendContent('${contentId}')" 
                                            title="Create Recommendation" aria-label="Create Recommendation">
                                        <i data-feather="star"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-info">
                        <div class="card-title">${this.escapeHtml(content.title || content.name || 'Unknown Title')}</div>
                        <div class="card-meta">
                            ${year ? `<span class="card-year">${year}</span>` : ''}
                            ${runtime ? `<span class="card-runtime">• ${runtime}</span>` : ''}
                        </div>
                        <div class="card-genres">
                            ${genres.map(genre => `<span class="genre-chip">${genre}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    getPosterUrl(content) {
        if (!content) return this.placeholderImage;

        if (content.poster_path) {
            if (content.poster_path.startsWith('http')) {
                return content.poster_path;
            } else {
                return `https://image.tmdb.org/t/p/w500${content.poster_path}`;
            }
        }

        return this.placeholderImage;
    }

    formatRating(rating) {
        if (!rating || rating === 0 || isNaN(rating)) return 'N/A';
        return Number(rating).toFixed(1);
    }

    formatRuntime(runtime) {
        if (!runtime || runtime === 0 || isNaN(runtime)) return '';
        const hours = Math.floor(runtime / 60);
        const minutes = runtime % 60;
        if (hours > 0) {
            return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
        }
        return `${minutes}m`;
    }

    getGenres(content) {
        if (!content) return [];

        if (!content.genres && !content.genre_ids) return [];

        if (content.genres && Array.isArray(content.genres)) {
            return content.genres.map(g => {
                if (typeof g === 'string') return g;
                if (g && g.name) return g.name;
                return 'Unknown';
            }).slice(0, 3);
        }

        const genreMap = {
            28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
            80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
            14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
            9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
            53: 'Thriller', 10752: 'War', 37: 'Western'
        };

        if (content.genre_ids && Array.isArray(content.genre_ids)) {
            return content.genre_ids
                .map(id => genreMap[id] || 'Unknown')
                .slice(0, 3);
        }

        return [];
    }

    formatRecommendationType(type) {
        // FIX: Add null/undefined check
        if (!type || typeof type !== 'string') {
            console.warn('formatRecommendationType: invalid type:', type);
            return 'General';
        }

        const typeMap = {
            'featured': 'Featured',
            'trending': 'Trending',
            'hidden_gem': 'Hidden Gem',
            'classic': 'Classic',
            'new_release': 'New Release'
        };

        // Return mapped value or format the string safely
        return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    extractYear(dateString) {
        if (!dateString) return '';
        try {
            const year = new Date(dateString).getFullYear();
            return isNaN(year) ? '' : year;
        } catch {
            return '';
        }
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    getEmptyState(icon, title, message, collapsed = true) {
        if (collapsed) {
            return `
                <div class="empty-state">
                    <i data-feather="${icon}"></i>
                    <div class="empty-state-title">${title}</div>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <i data-feather="${icon}"></i>
                    <div class="empty-state-title">${title}</div>
                    <div class="empty-state-message">${message}</div>
                </div>
            `;
        }
    }

    refreshFeatherIcons() {
        setTimeout(() => {
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }, 100);
    }
}

// Initialize and expose globally
window.recUtils = new RecUtils();