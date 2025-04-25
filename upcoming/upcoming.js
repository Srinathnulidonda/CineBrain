// Simple Upcoming Releases App
class UpcomingApp {
    constructor() {
        this.apiUrl = 'https://cinebrain.onrender.com/api/upcoming-sync';
        this.data = {
            movies: [],
            tv_series: [],
            anime: []
        };
        this.currentCategory = 'all';
        this.region = 'IN';
        this.timezone = 'Asia/Kolkata';

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUpcomingReleases();
    }

    setupEventListeners() {
        // Category tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchCategory(e.target.dataset.category);
            });
        });

        // Region select
        document.getElementById('regionSelect').addEventListener('change', (e) => {
            this.region = e.target.value;
            this.loadUpcomingReleases();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadUpcomingReleases(false);
        });
    }

    async loadUpcomingReleases(useCache = true) {
        this.showLoading();

        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.classList.add('spinning');

        try {
            const params = new URLSearchParams({
                region: this.region,
                timezone: this.timezone,
                categories: 'movies,tv,anime',
                use_cache: useCache,
                include_analytics: 'true'
            });

            const response = await fetch(`${this.apiUrl}?${params}`);
            const result = await response.json();

            if (result.success) {
                this.data = result.data;
                this.displayContent();
                this.updateStats();
                this.showContent();
            } else {
                this.showError(result.error || 'Failed to load data');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            refreshBtn.classList.remove('spinning');
        }
    }

    displayContent() {
        // Display based on current category
        if (this.currentCategory === 'all') {
            this.displayMovies(this.data.movies.slice(0, 12));
            this.displayTVSeries(this.data.tv_series.slice(0, 12));
            this.displayAnime(this.data.anime.slice(0, 12));

            document.getElementById('moviesSection').style.display = 'block';
            document.getElementById('tvSection').style.display = 'block';
            document.getElementById('animeSection').style.display = 'block';
        } else if (this.currentCategory === 'movies') {
            this.displayMovies(this.data.movies);
            document.getElementById('moviesSection').style.display = 'block';
            document.getElementById('tvSection').style.display = 'none';
            document.getElementById('animeSection').style.display = 'none';
        } else if (this.currentCategory === 'tv') {
            this.displayTVSeries(this.data.tv_series);
            document.getElementById('moviesSection').style.display = 'none';
            document.getElementById('tvSection').style.display = 'block';
            document.getElementById('animeSection').style.display = 'none';
        } else if (this.currentCategory === 'anime') {
            this.displayAnime(this.data.anime);
            document.getElementById('moviesSection').style.display = 'none';
            document.getElementById('tvSection').style.display = 'none';
            document.getElementById('animeSection').style.display = 'block';
        }

        // Update counts
        document.getElementById('moviesCount').textContent = `(${this.data.movies.length})`;
        document.getElementById('tvCount').textContent = `(${this.data.tv_series.length})`;
        document.getElementById('animeCount').textContent = `(${this.data.anime.length})`;
    }

    displayMovies(movies) {
        const grid = document.getElementById('moviesGrid');
        grid.innerHTML = movies.map(movie => this.createCard(movie)).join('');
    }

    displayTVSeries(series) {
        const grid = document.getElementById('tvGrid');
        grid.innerHTML = series.map(show => this.createCard(show)).join('');
    }

    displayAnime(animeList) {
        const grid = document.getElementById('animeGrid');
        grid.innerHTML = animeList.map(anime => this.createCard(anime)).join('');
    }

    createCard(item) {
        const isTeluguPriority = item.is_telugu_priority || item.language_priority === 1;
        const releaseDate = new Date(item.release_date);
        const formattedDate = releaseDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const daysUntil = item.days_until_release || 0;
        const daysText = daysUntil === 0 ? 'Today' :
            daysUntil === 1 ? 'Tomorrow' :
                daysUntil > 0 ? `${daysUntil} days` : 'Released';

        const badges = [];
        if (isTeluguPriority) {
            badges.push('<span class="card-badge badge-telugu">TELUGU</span>');
        }
        if (item.buzz_level === 'high' || item.buzz_level === 'viral') {
            badges.push('<span class="card-badge badge-buzz">HOT</span>');
        }

        const rating = item.vote_average || item.score || 0;
        const primaryLang = this.getLanguageName(item.languages?.[0] || '');

        return `
            <div class="card ${isTeluguPriority ? 'telugu-priority' : ''}" 
                 onclick="app.showDetails('${item.id}', '${item.content_type}')">
                <div class="card-image">
                    <img src="${item.poster_path || 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         alt="${item.title}" loading="lazy">
                    ${badges.join('')}
                    <span class="card-days">${daysText}</span>
                </div>
                <div class="card-body">
                    <div class="card-title">${item.title}</div>
                    <div class="card-date">${formattedDate}</div>
                    <div class="card-footer">
                        ${rating > 0 ? `
                            <span class="card-rating">
                                <i class="fas fa-star"></i> ${rating.toFixed(1)}
                            </span>
                        ` : '<span></span>'}
                        <span class="card-lang">${primaryLang}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getLanguageName(langCode) {
        const languages = {
            'te': 'Telugu',
            'en': 'English',
            'hi': 'Hindi',
            'ml': 'Malayalam',
            'kn': 'Kannada',
            'ta': 'Tamil',
            'ja': 'Japanese',
            'ko': 'Korean'
        };
        return languages[langCode] || langCode.toUpperCase();
    }

    showDetails(id, type) {
        let item = null;

        if (type === 'movie') {
            item = this.data.movies.find(m => m.id === id);
        } else if (type === 'tv') {
            item = this.data.tv_series.find(t => t.id === id);
        } else if (type === 'anime') {
            item = this.data.anime.find(a => a.id === id);
        }

        if (!item) return;

        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');

        const releaseDate = new Date(item.release_date);
        const genres = (item.genres || []).join(', ');

        modalBody.innerHTML = `
            <div class="modal-detail">
                <img src="${item.poster_path || 'https://via.placeholder.com/300x450'}" 
                     alt="${item.title}" class="modal-poster">
                <h2 class="modal-title">${item.title}</h2>
                ${item.original_title && item.original_title !== item.title ?
                `<p style="text-align: center; color: var(--text-dim); margin-bottom: 1rem;">
                        ${item.original_title}
                    </p>` : ''}
                <div class="modal-info">
                    <span><i class="fas fa-calendar"></i> ${releaseDate.toLocaleDateString()}</span>
                    ${item.vote_average ? `<span><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</span>` : ''}
                    ${item.anticipation_score ? `<span><i class="fas fa-fire"></i> ${Math.round(item.anticipation_score)}% Hype</span>` : ''}
                    ${item.buzz_level ? `<span>${item.buzz_level.toUpperCase()} Buzz</span>` : ''}
                </div>
                ${genres ? `<p style="text-align: center; margin-bottom: 1rem;">${genres}</p>` : ''}
                <div class="modal-overview">
                    ${item.overview || 'No description available.'}
                </div>
            </div>
        `;

        modal.classList.add('show');
    }

    updateStats() {
        const stats = this.data.metadata?.statistics || {};

        // Total count
        const total = (this.data.movies?.length || 0) +
            (this.data.tv_series?.length || 0) +
            (this.data.anime?.length || 0);
        document.getElementById('totalCount').textContent = total;

        // Telugu count
        const teluguCount = (stats.telugu_movies || 0) + (stats.telugu_tv_series || 0);
        document.getElementById('teluguCount').textContent = teluguCount;

        // High buzz count
        document.getElementById('buzzCount').textContent = stats.high_anticipation_count || 0;

        // This month count
        let thisMonthCount = 0;
        const now = new Date();
        const currentMonth = now.getMonth();

        [...this.data.movies, ...this.data.tv_series, ...this.data.anime].forEach(item => {
            const releaseDate = new Date(item.release_date);
            if (releaseDate.getMonth() === currentMonth) {
                thisMonthCount++;
            }
        });
        document.getElementById('monthCount').textContent = thisMonthCount;
    }

    switchCategory(category) {
        this.currentCategory = category;

        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.category === category) {
                tab.classList.add('active');
            }
        });

        this.displayContent();
    }

    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('error').style.display = 'none';
        document.getElementById('content').style.display = 'none';
    }

    showContent() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'none';
        document.getElementById('content').style.display = 'block';
    }

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }
}

// Global functions for onclick handlers
function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

function loadUpcomingReleases() {
    app.loadUpcomingReleases();
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new UpcomingApp();
});