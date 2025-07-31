// Anime page functionality
class AnimePage {
    constructor() {
        this.currentCategory = 'all';
        this.currentGenre = 'all';
        this.currentSeason = 'current';
        this.currentSort = 'popularity';
        this.animeList = [];
        this.airingSchedule = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSeasonalAnime();
        this.loadAiringAnime();
        this.loadTopAnime();
        this.loadAnimeSchedule();
        this.loadAllAnime();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Category pills
        document.querySelectorAll('.anime-category-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentCategory = e.target.dataset.category;
                this.switchActiveCategory(e.target);
                this.filterAnime();
            });
        });

        // Genre pills
        document.querySelectorAll('.genre-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentGenre = e.target.dataset.genre;
                this.switchActiveGenre(e.target);
                this.filterAnime();
            });
        });

        // Season filter
        document.getElementById('season-filter').addEventListener('change', (e) => {
            this.currentSeason = e.target.value;
            this.loadSeasonalAnime();
        });

        // Sort dropdown
        document.getElementById('sort-anime').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortAnime();
        });

        // Studio cards
        document.querySelectorAll('.studio-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const studio = e.currentTarget.dataset.studio;
                this.filterByStudio(studio);
            });
        });
    }

    switchActiveCategory(activeBtn) {
        document.querySelectorAll('.anime-category-pill').forEach(btn =>
            btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    switchActiveGenre(activeBtn) {
        document.querySelectorAll('.genre-pill').forEach(btn =>
            btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    async loadSeasonalAnime() {
        try {
            const response = await ApiService.getAnimeRecommendations(null, 12);

            // Add seasonal metadata
            const seasonalAnime = response.recommendations.map(anime => ({
                ...anime,
                season: this.getCurrentSeason(),
                episodeCount: Math.floor(Math.random() * 24) + 1,
                currentEpisode: Math.floor(Math.random() * 12) + 1,
                airingDay: this.getRandomAiringDay()
            }));

            UIComponents.createCarousel(
                `${this.getCurrentSeasonName()} Anime`,
                seasonalAnime,
                'seasonal-anime-grid',
                true
            );
        } catch (error) {
            console.error('Failed to load seasonal anime:', error);
        }
    }

    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 0 && month <= 2) return 'winter';
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        return 'fall';
    }

    getCurrentSeasonName() {
        const season = this.getCurrentSeason();
        const year = new Date().getFullYear();
        return `${season.charAt(0).toUpperCase() + season.slice(1)} ${year}`;
    }

    getRandomAiringDay() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days[Math.floor(Math.random() * days.length)];
    }

    async loadAiringAnime() {
        const container = document.getElementById('airing-anime');

        try {
            // Simulate currently airing anime
            const airingAnime = [
                {
                    title: 'Popular Shonen Series',
                    episode: 'Episode 245',
                    timeUntil: '2 hours',
                    isAiring: false
                },
                {
                    title: 'Seasonal Romance',
                    episode: 'Episode 12 (Finale)',
                    timeUntil: 'Airing Now',
                    isAiring: true
                },
                {
                    title: 'Action Anime',
                    episode: 'Episode 8',
                    timeUntil: '1 day',
                    isAiring: false
                }
            ];

            container.innerHTML = airingAnime.map(anime => `
                <div class="card p-6 ${anime.isAiring ? 'border-l-4 border-error' : ''}">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold">${anime.title}</h4>
                        ${anime.isAiring ?
                    '<div class="flex items-center gap-2 text-error"><div class="w-2 h-2 bg-error rounded-full animate-pulse"></div>LIVE</div>' :
                    ''
                }
                    </div>
                    <p class="text-sm text-secondary mb-3">${anime.episode}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-muted">${anime.timeUntil}</span>
                        <button class="btn btn-primary btn-sm">
                            ${anime.isAiring ? 'Watch Now' : 'Set Reminder'}
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load airing anime:', error);
        }
    }

    async loadTopAnime() {
        try {
            const response = await ApiService.getAnimeRecommendations(null, 10);

            // Add ranking metadata
            const topAnime = response.recommendations.map((anime, index) => ({
                ...anime,
                rank: index + 1,
                score: (Math.random() * 2 + 8).toFixed(2),
                members: Math.floor(Math.random() * 500000) + 100000
            }));

            UIComponents.createCarousel(
                'Top Anime of All Time',
                topAnime,
                'top-anime',
                true
            );

            // Add ranking badges
            setTimeout(() => {
                this.addRankingBadges();
            }, 100);
        } catch (error) {
            console.error('Failed to load top anime:', error);
        }
    }

    addRankingBadges() {
        const topAnimeCards = document.querySelectorAll('#top-anime .content-card');
        topAnimeCards.forEach((card, index) => {
            const rankBadge = document.createElement('div');
            rankBadge.className = `absolute top-2 left-2 w-8 h-8 ${index === 0 ? 'bg-warning' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-primary-blue'
                } text-white rounded-full flex items-center justify-center font-bold text-sm`;
            rankBadge.textContent = index + 1;
            card.appendChild(rankBadge);
        });
    }

    async loadAnimeSchedule() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        // Simulate weekly schedule
        days.forEach(day => {
            const container = document.getElementById(`${day}-releases`);
            const daySchedule = this.generateDaySchedule();

            container.innerHTML = daySchedule.map(anime => `
                <div class="p-2 bg-bg-tertiary rounded text-sm hover:bg-bg-secondary cursor-pointer">
                    <div class="font-medium truncate">${anime.title}</div>
                    <div class="text-xs text-muted">${anime.time}</div>
                </div>
            `).join('');
        });
    }

    generateDaySchedule() {
        const schedule = [];
        const numShows = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numShows; i++) {
            schedule.push({
                title: `Anime Title ${Math.floor(Math.random() * 100)}`,
                time: `${Math.floor(Math.random() * 12) + 1}:00 ${Math.random() > 0.5 ? 'PM' : 'AM'} JST`
            });
        }

        return schedule;
    }

    async loadAllAnime() {
        const container = document.getElementById('anime-grid');
        UIComponents.showLoading(container);

        try {
            const response = await ApiService.getAnimeRecommendations(null, 24);
            this.animeList = response.recommendations;
            this.renderAnime();
            this.updateStats();
        } catch (error) {
            UIComponents.showError(container, 'Failed to load anime');
        }
    }

    renderAnime() {
        const container = document.getElementById('anime-grid');
        const filteredAnime = this.filterAnimeData();

        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                ${filteredAnime.map(anime => this.createAnimeCard(anime)).join('')}
            </div>
        `;

        document.getElementById('anime-count').textContent = `${filteredAnime.length} anime`;
    }

    createAnimeCard(anime) {
        const card = UIComponents.createContentCard(anime);

        // Add anime-specific elements
        if (anime.score) {
            const malScore = document.createElement('div');
            malScore.className = 'absolute top-2 right-2 bg-primary-purple text-white px-2 py-1 rounded text-xs font-bold';
            malScore.textContent = `MAL ${anime.score}`;
            card.appendChild(malScore);
        }

        if (anime.currentEpisode && anime.episodeCount) {
            const progress = document.createElement('div');
            progress.className = 'absolute bottom-0 left-0 right-0 h-1 bg-black/50';
            progress.innerHTML = `<div class="h-full bg-primary-blue" style="width: ${(anime.currentEpisode / anime.episodeCount) * 100}%"></div>`;
            card.appendChild(progress);
        }

        return card.outerHTML;
    }

    filterAnimeData() {
        return this.animeList.filter(anime => {
            if (this.currentCategory !== 'all') {
                // Filter by category (simulated)
                const categories = anime.anime_genres || [];
                if (!categories.includes(this.currentCategory)) return false;
            }

            if (this.currentGenre !== 'all') {
                const genres = anime.genres || [];
                if (!genres.some(g => g.toLowerCase().includes(this.currentGenre))) return false;
            }

            return true;
        });
    }

    filterAnime() {
        this.renderAnime();
    }

    sortAnime() {
        const sortedAnime = [...this.animeList];

        switch (this.currentSort) {
            case 'score':
                sortedAnime.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'newest':
                sortedAnime.sort((a, b) =>
                    new Date(b.release_date || 0) - new Date(a.release_date || 0));
                break;
            case 'episodes':
                sortedAnime.sort((a, b) => (b.episodeCount || 0) - (a.episodeCount || 0));
                break;
            case 'title':
                sortedAnime.sort((a, b) => a.title.localeCompare(b.title));
                break;
            default: // popularity
                sortedAnime.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        }

        this.animeList = sortedAnime;
        this.renderAnime();
    }

    filterByStudio(studio) {
        console.log(`Filtering by studio: ${studio}`);

        // In a real implementation, this would filter by actual studio data
        UIComponents.showToast(`Showing anime from ${studio.replace('-', ' ').toUpperCase()}`, 'info');

        // Simulate filtering
        this.animeList = this.animeList.filter(() => Math.random() > 0.5);
        this.renderAnime();
    }

    updateStats() {
        // Update real-time anime stats
        const totalAnime = (Math.random() * 1000 + 15000).toFixed(1) + 'K';
        const seasonalAnime = Math.floor(Math.random() * 50 + 100);
        const topRated = Math.floor(Math.random() * 100 + 800);

        document.getElementById('total-anime').textContent = totalAnime;
        document.getElementById('seasonal-anime').textContent = seasonalAnime;
        document.getElementById('top-rated').textContent = topRated;
    }

    startRealTimeUpdates() {
        // Update stats every 2 minutes
        setInterval(() => {
            this.updateStats();
        }, 2 * 60 * 1000);

        // Update airing anime every 30 seconds
        setInterval(() => {
            this.updateAiringStatus();
        }, 30000);

