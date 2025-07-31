// TV Shows page functionality
class TVShowsPage {
    constructor() {
        this.currentStatus = 'all';
        this.currentGenre = 'all';
        this.currentSort = 'popularity';
        this.shows = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAiringShows();
        this.loadNewEpisodes();
        this.loadAllShows();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Status pills
        document.querySelectorAll('.status-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentStatus = e.target.dataset.status;
                this.switchActiveStatus(e.target);
                this.filterShows();
            });
        });

        // Genre pills
        document.querySelectorAll('.genre-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentGenre = e.target.dataset.genre;
                this.switchActiveGenre(e.target);
                this.filterShows();
            });
        });

        // Sort dropdown
        document.getElementById('sort-shows').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortShows();
        });

        // Collection cards
        window.TVShowsManager = {
            filterByCollection: (collection) => {
                this.filterByCollection(collection);
            },
            showSchedule: () => {
                this.showTVSchedule();
            }
        };
    }

    switchActiveStatus(activeBtn) {
        document.querySelectorAll('.status-pill').forEach(btn =>
            btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    switchActiveGenre(activeBtn) {
        document.querySelectorAll('.genre-pill').forEach(btn =>
            btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    async loadAiringShows() {
        try {
            // Simulate currently airing shows
            const airingShows = await ApiService.getTrending('tv', 10);

            // Add airing status
            const showsWithStatus = airingShows.recommendations.map(show => ({
                ...show,
                nextEpisode: this.generateNextEpisode(),
                isLive: Math.random() > 0.7
            }));

            UIComponents.createCarousel(
                'Currently Airing',
                showsWithStatus,
                'airing-shows',
                true
            );

            // Add live indicators
            setTimeout(() => {
                this.addLiveIndicators();
            }, 100);
        } catch (error) {
            console.error('Failed to load airing shows:', error);
        }
    }

    generateNextEpisode() {
        const days = ['Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const times = ['8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'];

        return {
            day: days[Math.floor(Math.random() * days.length)],
            time: times[Math.floor(Math.random() * times.length)],
            episode: `S${Math.floor(Math.random() * 5) + 1}E${Math.floor(Math.random() * 20) + 1}`
        };
    }

    addLiveIndicators() {
        const airingCards = document.querySelectorAll('#airing-shows .content-card');
        airingCards.forEach((card, index) => {
            if (Math.random() > 0.7) {
                const liveIndicator = document.createElement('div');
                liveIndicator.className = 'absolute top-2 right-2 bg-error text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1';
                liveIndicator.innerHTML = '<div class="w-2 h-2 bg-white rounded-full animate-pulse"></div> LIVE';
                card.appendChild(liveIndicator);
            }
        });
    }

    async loadNewEpisodes() {
        const container = document.getElementById('new-episodes-today');

        try {
            // Simulate new episodes data
            const newEpisodes = [
                {
                    show: 'Popular Drama Series',
                    episode: 'S2E15: The Revelation',
                    time: '9:00 PM',
                    network: 'Netflix',
                    isNew: true
                },
                {
                    show: 'Hit Comedy Show',
                    episode: 'S5E8: The Reunion',
                    time: '8:30 PM',
                    network: 'Prime Video',
                    isNew: true
                },
                {
                    show: 'Thriller Series',
                    episode: 'S1E10: Season Finale',
                    time: '10:00 PM',
                    network: 'HBO Max',
                    isNew: true
                }
            ];

            container.innerHTML = newEpisodes.map(ep => `
                <div class="card p-6">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold">${ep.show}</h4>
                        ${ep.isNew ? '<span class="badge badge-success">NEW</span>' : ''}
                    </div>
                    <p class="text-sm text-secondary mb-3">${ep.episode}</p>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-muted">${ep.time} on ${ep.network}</span>
                        <button class="btn btn-primary btn-sm">Watch Now</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load new episodes:', error);
        }
    }

    async loadAllShows() {
        const container = document.getElementById('shows-grid');
        UIComponents.showLoading(container);

        try {
            const response = await ApiService.getTrending('tv', 24);
            this.shows = response.recommendations;
            this.renderShows();
            this.updateStats();
        } catch (error) {
            UIComponents.showError(container, 'Failed to load TV shows');
        }
    }

    renderShows() {
        const container = document.getElementById('shows-grid');
        const filteredShows = this.filterShowsData();

        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                ${filteredShows.map(show => this.createShowCard(show)).join('')}
            </div>
        `;

        document.getElementById('shows-count').textContent = `${filteredShows.length} shows`;
    }

    createShowCard(show) {
        const card = UIComponents.createContentCard(show);

        // Add TV-specific elements
        if (show.nextEpisode) {
            const nextEpBadge = document.createElement('div');
            nextEpBadge.className = 'absolute bottom-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs';
            nextEpBadge.textContent = `Next: ${show.nextEpisode.day}`;
            card.appendChild(nextEpBadge);
        }

        return card.outerHTML;
    }

    filterShowsData() {
        return this.shows.filter(show => {
            if (this.currentStatus !== 'all') {
                // Filter by status (simulated)
                if (this.currentStatus === 'returning' && Math.random() < 0.3) return false;
                if (this.currentStatus === 'ended' && Math.random() < 0.7) return false;
                if (this.currentStatus === 'canceled' && Math.random() < 0.9) return false;
            }

            if (this.currentGenre !== 'all') {
                const genres = show.genres || [];
                if (!genres.some(g => g.toLowerCase() === this.currentGenre)) return false;
            }

            return true;
        });
    }

    filterShows() {
        this.renderShows();
    }

    sortShows() {
        const sortedShows = [...this.shows];

        switch (this.currentSort) {
            case 'rating':
                sortedShows.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'newest':
                sortedShows.sort((a, b) =>
                    new Date(b.release_date || 0) - new Date(a.release_date || 0));
                break;
            case 'episodes':
                sortedShows.sort((a, b) => (b.episode_count || 0) - (a.episode_count || 0));
                break;
            case 'title':
                sortedShows.sort((a, b) => a.title.localeCompare(b.title));
                break;
            default: // popularity
                sortedShows.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        }

        this.shows = sortedShows;
        this.renderShows();
    }

    filterByCollection(collection) {
        console.log(`Filtering by collection: ${collection}`);

        // Filter shows based on collection type
        switch (collection) {
            case 'marathon':
                // Shows good for binge-watching
                this.shows = this.shows.filter(show =>
                    show.episode_count > 20 || Math.random() > 0.5);
                break;
            case 'quick':
                // Shows with short seasons
                this.shows = this.shows.filter(show =>
                    show.episode_count < 10 || Math.random() > 0.5);
                break;
            case 'classic':
                // Older shows
                this.shows = this.shows.filter(show => {
                    const year = show.release_date ? new Date(show.release_date).getFullYear() : 2020;
                    return year < 2015;
                });
                break;
            case 'international':
                // Non-English shows
                this.shows = this.shows.filter(show => {
                    const languages = show.languages || [];
                    return !languages.includes('english') || Math.random() > 0.7;
                });
                break;
        }

        this.renderShows();
    }

    showTVSchedule() {
        const modal = document.getElementById('schedule-modal');
        const scheduleContainer = document.getElementById('tv-schedule');

        // Generate weekly schedule
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const schedule = days.map(day => ({
            day,
            shows: this.generateDaySchedule()
        }));

        scheduleContainer.innerHTML = `
            <div class="space-y-4">
                ${schedule.map(day => `
                    <div class="border-b border-white/10 pb-4">
                        <h4 class="font-semibold mb-3">${day.day}</h4>
                        <div class="space-y-2">
                            ${day.shows.map(show => `
                                <div class="flex justify-between items-center p-2 bg-bg-tertiary rounded">
                                    <div>
                                        <span class="font-medium">${show.title}</span>
                                        <span class="text-sm text-muted ml-2">${show.episode}</span>
                                    </div>
                                    <span class="text-sm text-primary-blue">${show.time}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        modal.classList.add('active');
    }

    generateDaySchedule() {
        const shows = [];
        const numShows = Math.floor(Math.random() * 4) + 2;

        for (let i = 0; i < numShows; i++) {
            shows.push({
                title: `TV Show ${Math.floor(Math.random() * 100)}`,
                episode: `S${Math.floor(Math.random() * 5) + 1}E${Math.floor(Math.random() * 20) + 1}`,
                time: `${Math.floor(Math.random() * 4) + 8}:00 PM`
            });
        }

        return shows;
    }

    updateStats() {
        // Update real-time TV show stats
        const totalShows = (Math.random() * 500 + 7800).toFixed(1) + 'K';
        const newEpisodes = Math.floor(Math.random() * 20 + 35);
        const trendingCount = Math.floor(Math.random() * 5 + 10);

        document.getElementById('total-shows').textContent = totalShows;
        document.getElementById('new-episodes').textContent = newEpisodes;
        document.getElementById('trending-count').textContent = trendingCount;
    }

    startRealTimeUpdates() {
        // Update stats every minute
        setInterval(() => {
            this.updateStats();
        }, 60000);

        // Update new episodes every 30 minutes
        setInterval(() => {
            this.loadNewEpisodes();
        }, 30 * 60 * 1000);

        // Subscribe to real-time episode updates
        if (window.realTimeManager) {
            window.realTimeManager.subscribe('episode_update', (data) => {
                this.handleEpisodeUpdate(data);
            });
        }
    }

    handleEpisodeUpdate(data) {
        // Show notification for new episode
        UIComponents.showToast(
            `New episode of "${data.show_title}" is now available!`,
            'info'
        );

        // Update the show if it's in the list
        const showCard = document.querySelector(`[data-content-id="${data.show_id}"]`);
        if (showCard) {
            // Add new episode indicator
            const newBadge = document.createElement('div');
            newBadge.className = 'absolute top-2 left-2 bg-success text-white px-2 py-1 rounded text-xs animate-pulse';
            newBadge.textContent = 'NEW EP';
            showCard.appendChild(newBadge);
        }

        // Refresh new episodes section
        this.loadNewEpisodes();
    }
}

// Initialize TV shows page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/categories/tv-shows') {
        new TVShowsPage();
    }
});
