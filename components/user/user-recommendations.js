// Optimized User Recommendations Component
class UserRecommendations {
    constructor() {
        this.recommendations = null;
        this.lastFetch = null;
        this.cacheTime = 10 * 60 * 1000; // 10 minutes
    }

    async getRecommendations(forceRefresh = false) {
        if (!AuthService.isAuthenticated()) return null;

        // Use cache if available and not expired
        if (!forceRefresh && this.recommendations && this.lastFetch && 
            Date.now() - this.lastFetch < this.cacheTime) {
            return this.recommendations;
        }

        try {
            this.recommendations = await API.getPersonalizedRecommendations();
            this.lastFetch = Date.now();
            return this.recommendations;
        } catch (error) {
            console.error('Failed to fetch recommendations:', error);
            return null;
        }
    }

    renderRecommendationSection(title, items, reason = '') {
        if (!items?.length) return '';

        return `
            <section class="recommendation-section mb-8">
                <div class="mb-4">
                    <h2 class="text-xl md:text-2xl font-bold">${title}</h2>
                    ${reason ? `<p class="text-sm text-text-secondary mt-1">${reason}</p>` : ''}
                </div>
                ${new ContentSlider(title, items, { showViewAll: false }).render()}
            </section>
        `;
    }

    async renderPersonalizedHome() {
        const recommendations = await this.getRecommendations();
        if (!recommendations) return '';

        const sections = [];

        // Continue Watching
        if (recommendations.continue_watching?.length) {
            sections.push(this.renderRecommendationSection(
                'Continue Watching',
                recommendations.continue_watching
            ));
        }

        // Recommended for You
        if (recommendations.hybrid_recommendations?.length) {
            sections.push(this.renderRecommendationSection(
                'Recommended for You',
                recommendations.hybrid_recommendations,
                'Based on your viewing history and preferences'
            ));
        }

        // Because You Watched
        if (recommendations.watch_history_based?.length) {
            const lastWatched = recommendations.last_watched_title || 'your recent views';
            sections.push(this.renderRecommendationSection(
                `Because You Watched ${lastWatched}`,
                recommendations.watch_history_based
            ));
        }

        // Your Favorite Genres
        if (recommendations.genre_based) {
            Object.entries(recommendations.genre_based).forEach(([genre, items]) => {
                if (items.length) {
                    sections.push(this.renderRecommendationSection(
                        `Best in ${genre}`,
                        items,
                        'From genres you love'
                    ));
                }
            });
        }

        return sections.join('');
    }

    // Real-time preference learning
    async updatePreferences(interaction) {
        if (!AuthService.isAuthenticated()) return;

        // Send interaction to backend for ML processing
        try {
            await API.request('/ml/update-preferences', {
                method: 'POST',
                body: JSON.stringify(interaction)
            });
        } catch (error) {
            console.error('Failed to update preferences:', error);
        }
    }
}

const UserRecommendationsInstance = new UserRecommendations();