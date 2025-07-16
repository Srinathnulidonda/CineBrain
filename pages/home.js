// Home Page
class HomePage {
    constructor() {
        this.data = null;
        this.isLoading = true;
    }

    async init() {
        try {
            Loading.show();
            
            if (AuthService.isAuthenticated()) {
                await this.loadPersonalizedHome();
            } else {
                await this.loadPublicHome();
            }

            this.render();
        } catch (error) {
            console.error('Failed to load homepage:', error);
            new Toast('Failed to load content', 'error').show();
        } finally {
            Loading.hide();
        }
    }

    async loadPublicHome() {
        this.data = await API.getHomepage();
    }

    async loadPersonalizedHome() {
        const [homepage, personalized] = await Promise.all([
            API.getHomepage(),
            API.getPersonalizedRecommendations()
        ]);

        this.data = {
            ...homepage,
            personalized
        };
    }

    render() {
        const mainContent = document.getElementById('main-content');
        
        if (!this.data) {
            mainContent.innerHTML = '<div class="container mx-auto px-4 py-8">Loading...</div>';
            return;
        }

        const { 
            trending, 
            whats_hot, 
            critics_choice, 
            regional, 
            user_favorites,
            admin_curated,
            personalized 
        } = this.data;

        mainContent.innerHTML = `
            <div class="homepage">
                <!-- Hero Section -->
                ${this.renderHero(trending.movies[0])}

                <!-- Main Content -->
                <div class="container mx-auto px-4 py-8">
                    ${personalized ? this.renderPersonalizedSections(personalized) : ''}
                    
                    <!-- Admin Curated -->
                    ${admin_curated && admin_curated.length > 0 ? 
                        new ContentSlider('Featured Picks', admin_curated).render() : ''}
                    
                    <!-- What's Hot -->
                    ${new ContentSlider("What's Hot", whats_hot).render()}
                    
                    <!-- Trending Movies -->
                    ${new ContentSlider('Trending Movies', trending.movies).render()}
                    
                    <!-- Trending TV Shows -->
                    ${new ContentSlider('Trending TV Shows', trending.tv).render()}
                    
                    <!-- Critics Choice -->
                    ${new ContentSlider("Critics' Choice", critics_choice).render()}
                    
                    <!-- Regional Content -->
                    ${this.renderRegionalContent(regional)}
                    
                    <!-- User Favorites -->
                    ${user_favorites && user_favorites.length > 0 ? 
                        new ContentSlider('Popular with Users', user_favorites).render() : ''}
                    
                    <!-- Trending Anime -->
                    ${trending.anime && trending.anime.length > 0 ? 
                        new ContentSlider('Trending Anime', this.formatAnimeData(trending.anime)).render() : ''}
                </div>
            </div>
        `;

        // Initialize any interactive elements
        this.initializeInteractions();
    }

    renderHero(content) {
        if (!content) return '';

        const backdropUrl = Utils.getImageUrl(content.backdrop_path, 'backdrop', 'large');

        return `
            <section class="hero relative h-[70vh] min-h-[500px] overflow-hidden">
                <!-- Background -->
                <div class="absolute inset-0">
                    <img 
                        src="${backdropUrl}"
                        alt="${content.title}"
                        class="w-full h-full object-cover"
                        onerror="this.style.display='none'"
                    >
                    <div class="absolute inset-0 bg-gradient-to-t from-primary-bg via-primary-bg/50 to-transparent"></div>
                </div>

                <!-- Content -->
                <div class="relative container mx-auto px-4 h-full flex items-end pb-16">
                    <div class="max-w-2xl">
                        <h1 class="text-4xl md:text-6xl font-bold mb-4">${content.title}</h1>
                        <p class="text-lg text-text-secondary mb-6 line-clamp-3">
                            ${content.overview || 'No description available'}
                        </p>
                        <div class="flex items-center space-x-4">
                            <button onclick="window.location.href='/content/${content.id}'" 
                                    class="bg-netflix-red hover:bg-hover-red px-8 py-3 rounded font-medium transition flex items-center space-x-2">
                                <i class="fas fa-play"></i>
                                <span>More Info</span>
                            </button>
                            <button onclick="ContentCardInstance.addToWishlist(event, ${content.id})" 
                                    class="bg-white/20 hover:bg-white/30 backdrop-blur px-8 py-3 rounded font-medium transition">
                                <i class="fas fa-plus mr-2"></i>
                                My List
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderPersonalizedSections(personalized) {
        const sections = [];

        if (personalized.watch_history_based?.length > 0) {
            sections.push(new ContentSlider('Because You Watched', personalized.watch_history_based).render());
        }

        if (personalized.favorites_based?.length > 0) {
            sections.push(new ContentSlider('Based on Your Favorites', personalized.favorites_based).render());
        }

        if (personalized.hybrid_recommendations?.length > 0) {
            sections.push(new ContentSlider('Recommended for You', personalized.hybrid_recommendations).render());
        }

        return sections.join('');
    }

    renderRegionalContent(regional) {
        if (!regional) return '';

        const sections = [];
        const languages = ['Telugu', 'Hindi', 'Tamil', 'Kannada'];

        languages.forEach(lang => {
            if (regional[lang] && regional[lang].length > 0) {
                sections.push(new ContentSlider(`${lang} Cinema`, regional[lang]).render());
            }
        });

        return sections.join('');
    }

    formatAnimeData(animeList) {
        return animeList.map(anime => ({
            id: anime.mal_id,
            title: anime.title || anime.title_english,
            poster_path: anime.images?.jpg?.image_url,
            rating: anime.score,
            overview: anime.synopsis,
            release_date: anime.aired?.from,
            genre_names: anime.genres?.map(g => g.name) || []
        }));
    }

    initializeInteractions() {
        // Add any page-specific interactions here
    }
}