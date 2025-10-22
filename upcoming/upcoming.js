// Enhanced Upcoming Releases App with 100% Accuracy
class EnhancedUpcomingApp {
    constructor() {
        this.apiUrl = 'https://cinebrain.onrender.com/api/upcoming-sync';
        this.data = {
            movies: [],
            tv_series: [],
            anime: [],
            metadata: {}
        };
        this.currentCategory = 'all';
        this.region = 'IN';
        this.timezone = 'Asia/Kolkata';
        this.filters = {
            month: 'all',
            releaseType: 'all',
            language: 'all',
            confidence: 'all',
            sort: 'telugu_first'
        };
        this.filtersVisible = false;

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

        // Filters toggle
        document.getElementById('filtersToggle').addEventListener('click', () => {
            this.toggleFilters();
        });

        // Filter controls
        document.getElementById('monthFilter').addEventListener('change', (e) => {
            this.filters.month = e.target.value;
            this.applyFilters();
        });

        document.getElementById('releaseTypeFilter').addEventListener('change', (e) => {
            this.filters.releaseType = e.target.value;
            this.applyFilters();
        });

        document.getElementById('languageFilter').addEventListener('change', (e) => {
            this.filters.language = e.target.value;
            this.applyFilters();
        });

        document.getElementById('confidenceFilter').addEventListener('change', (e) => {
            this.filters.confidence = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sortFilter').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.applyFilters();
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
                this.processData();
                this.displayContent();
                this.updateStats();
                this.updateMonthNavigation();
                this.showContent();
            } else {
                this.showError(result.error || 'Failed to load accurate data');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Network error. Please check your connection.');
        } finally {
            refreshBtn.classList.remove('spinning');
        }
    }

    processData() {
        // Ensure data arrays exist
        this.data.movies = this.data.movies || [];
        this.data.tv_series = this.data.tv_series || [];
        this.data.anime = this.data.anime || [];

        // Process each item for enhanced display
        [...this.data.movies, ...this.data.tv_series, ...this.data.anime].forEach(item => {
            // Calculate additional display properties
            item.displayReleaseDate = new Date(item.release_date);
            item.monthIndex = item.displayReleaseDate.getMonth() - new Date().getMonth();
            if (item.monthIndex < 0) item.monthIndex += 12;

            // Confidence level
            if (item.data_confidence >= 0.8) {
                item.confidenceLevel = 'high';
            } else if (item.data_confidence >= 0.5) {
                item.confidenceLevel = 'medium';
            } else {
                item.confidenceLevel = 'low';
            }
        });
    }

    applyFilters() {
        this.displayContent();
    }

    filterContent(content) {
        return content.filter(item => {
            // Month filter
            if (this.filters.month !== 'all') {
                const monthIndex = parseInt(this.filters.month);
                if (item.monthIndex !== monthIndex) return false;
            }

            // Release type filter
            if (this.filters.releaseType !== 'all') {
                switch (this.filters.releaseType) {
                    case 'cinema':
                        if (!item.cinema_release) return false;
                        break;
                    case 'ott':
                        if (!item.ott_release) return false;
                        break;
                    case 'confirmed':
                        if (!item.confirmed_release_date) return false;
                        break;
                }
            }

            // Language filter
            if (this.filters.language !== 'all') {
                switch (this.filters.language) {
                    case 'telugu':
                        if (!item.is_telugu_content) return false;
                        break;
                    case 'english':
                        if (!item.languages.includes('en')) return false;
                        break;
                    case 'hindi':
                        if (!item.languages.includes('hi')) return false;
                        break;
                    case 'regional':
                        if (!['te', 'ml', 'kn', 'ta'].some(lang => item.languages.includes(lang))) return false;
                        break;
                }
            }

            // Confidence filter
            if (this.filters.confidence !== 'all') {
                switch (this.filters.confidence) {
                    case 'high':
                        if (item.data_confidence < 0.8) return false;
                        break;
                    case 'medium':
                        if (item.data_confidence < 0.5) return false;
                        break;
                    case 'verified':
                        if (!item.confirmed_release_date) return false;
                        break;
                }
            }

            return true;
        });
    }

    sortContent(content) {
        return content.sort((a, b) => {
            switch (this.filters.sort) {
                case 'date_asc':
                    return a.displayReleaseDate - b.displayReleaseDate;
                case 'date_desc':
                    return b.displayReleaseDate - a.displayReleaseDate;
                case 'telugu_first':
                    // Telugu first, then by date
                    if (a.is_telugu_content !== b.is_telugu_content) {
                        return b.is_telugu_content - a.is_telugu_content;
                    }
                    return a.displayReleaseDate - b.displayReleaseDate;
                case 'confidence':
                    return (b.data_confidence || 0) - (a.data_confidence || 0);
                case 'popularity':
                    return (b.popularity || 0) - (a.popularity || 0);
                default:
                    return a.displayReleaseDate - b.displayReleaseDate;
            }
        });
    }

    displayContent() {
        // Filter and sort content
        const filteredMovies = this.sortContent(this.filterContent(this.data.movies));
        const filteredTVSeries = this.sortContent(this.filterContent(this.data.tv_series));
        const filteredAnime = this.sortContent(this.filterContent(this.data.anime));

        // Display based on current category
        if (this.currentCategory === 'all') {
            this.displayMovies(filteredMovies.slice(0, 20));
            this.displayTVSeries(filteredTVSeries.slice(0, 20));
            this.displayAnime(filteredAnime.slice(0, 20));

            document.getElementById('moviesSection').style.display = 'block';
            document.getElementById('tvSection').style.display = 'block';
            document.getElementById('animeSection').style.display = 'block';
        } else if (this.currentCategory === 'movies') {
            this.displayMovies(filteredMovies);
            document.getElementById('moviesSection').style.display = 'block';
            document.getElementById('tvSection').style.display = 'none';
            document.getElementById('animeSection').style.display = 'none';
        } else if (this.currentCategory === 'tv') {
            this.displayTVSeries(filteredTVSeries);
            document.getElementById('moviesSection').style.display = 'none';
            document.getElementById('tvSection').style.display = 'block';
            document.getElementById('animeSection').style.display = 'none';
        } else if (this.currentCategory === 'anime') {
            this.displayAnime(filteredAnime);
            document.getElementById('moviesSection').style.display = 'none';
            document.getElementById('tvSection').style.display = 'none';
            document.getElementById('animeSection').style.display = 'block';
        }

        // Update counts
        document.getElementById('moviesCount').textContent = `(${filteredMovies.length})`;
        document.getElementById('tvCount').textContent = `(${filteredTVSeries.length})`;
        document.getElementById('animeCount').textContent = `(${filteredAnime.length})`;
    }

    displayMovies(movies) {
        const grid = document.getElementById('moviesGrid');
        grid.innerHTML = movies.map(movie => this.createEnhancedCard(movie)).join('');
    }

    displayTVSeries(series) {
        const grid = document.getElementById('tvGrid');
        grid.innerHTML = series.map(show => this.createEnhancedCard(show)).join('');
    }

    displayAnime(animeList) {
        const grid = document.getElementById('animeGrid');
        grid.innerHTML = animeList.map(anime => this.createEnhancedCard(anime)).join('');
    }

    createEnhancedCard(item) {
        const isTeluguPriority = item.is_telugu_content || item.is_telugu_priority;
        const formattedDate = item.displayReleaseDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const daysUntil = item.days_until_release || 0;
        const daysText = daysUntil === 0 ? 'Today' :
            daysUntil === 1 ? 'Tomorrow' :
                daysUntil > 0 ? `${daysUntil} days` : 'Released';

        // Create badges
        const badges = [];
        if (isTeluguPriority) {
            badges.push('<span class="card-badge badge-telugu">TELUGU</span>');
        }
        if (item.confirmed_release_date) {
            badges.push('<span class="card-badge badge-confirmed">CONFIRMED</span>');
        }
        if (item.cinema_release) {
            badges.push('<span class="card-badge badge-cinema">CINEMA</span>');
        }
        if (item.ott_release && !item.cinema_release) {
            badges.push('<span class="card-badge badge-ott">OTT</span>');
        }

        // Confidence badge
        const confidenceColor = item.confidenceLevel === 'high' ? 'confidence-high' :
            item.confidenceLevel === 'medium' ? 'confidence-medium' : 'confidence-low';
        const confidenceText = Math.round((item.data_confidence || 0) * 100);

        if (confidenceText > 0) {
            badges.push(`<span class="card-badge ${confidenceColor}">${confidenceText}%</span>`);
        }

        const rating = item.vote_average || 0;
        const primaryLang = this.getLanguageName(item.languages?.[0] || '');
        const originalTitle = item.original_title && item.original_title !== item.title ?
            `<div class="card-original-title">${item.original_title}</div>` : '';

        // Metadata
        const metadata = [];
        if (item.runtime_minutes) {
            metadata.push(`<div class="card-meta-item"><i class="fas fa-clock"></i> ${item.runtime_minutes}m</div>`);
        }
        if (item.director) {
            metadata.push(`<div class="card-meta-item"><i class="fas fa-user"></i> ${item.director}</div>`);
        }
        if (item.studio) {
            metadata.push(`<div class="card-meta-item"><i class="fas fa-building"></i> ${item.studio}</div>`);
        }
        if (item.ott_platform && item.ott_platform !== 'Various') {
            metadata.push(`<div class="card-meta-item"><i class="fas fa-tv"></i> ${item.ott_platform}</div>`);
        }

        return `
            <div class="card ${isTeluguPriority ? 'telugu-priority' : ''}" 
                 onclick="app.showDetails('${item.id}', '${item.content_type}')">
                <div class="card-image">
                    <img src="${item.poster_path || 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         alt="${item.title}" loading="lazy">
                    <div class="card-badges">
                        ${badges.join('')}
                    </div>
                    <div class="card-release-info">
                        <span class="card-days">${daysText}</span>
                        ${item.release_quarter ? `<span class="card-quarter">${item.release_quarter}</span>` : ''}
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-title">${item.title}</div>
                    ${originalTitle}
                    <div class="card-date">
                        <i class="fas fa-calendar"></i>
                        ${formattedDate}
                    </div>
                    ${metadata.length > 0 ? `
                        <div class="card-metadata">
                            ${metadata.join('')}
                        </div>
                    ` : ''}
                    <div class="card-footer">
                        ${rating > 0 ? `
                            <span class="card-rating">
                                <i class="fas fa-star"></i> ${rating.toFixed(1)}
                            </span>
                        ` : '<span></span>'}
                        <span class="card-lang ${isTeluguPriority ? 'telugu' : ''}">${primaryLang}</span>
                    </div>
                </div>
            </div>
        `;
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

        const formattedDate = item.displayReleaseDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const genres = (item.genres || []).join(' • ');
        const cast = (item.cast || []).slice(0, 5);

        // Modal badges
        const modalBadges = [];
        if (item.is_telugu_content) {
            modalBadges.push('<span class="card-badge badge-telugu">TELUGU PRIORITY</span>');
        }
        if (item.confirmed_release_date) {
            modalBadges.push('<span class="card-badge badge-confirmed">CONFIRMED DATE</span>');
        }
        if (item.cinema_release) {
            modalBadges.push('<span class="card-badge badge-cinema">CINEMA RELEASE</span>');
        }
        if (item.ott_release) {
            modalBadges.push('<span class="card-badge badge-ott">OTT PLATFORM</span>');
        }

        // Info items
        const infoItems = [];

        infoItems.push(`
            <div class="modal-info-item">
                <div class="modal-info-label">Release Date</div>
                <div class="modal-info-value">${formattedDate}</div>
            </div>
        `);

        if (item.vote_average) {
            infoItems.push(`
                <div class="modal-info-item">
                    <div class="modal-info-label">Rating</div>
                    <div class="modal-info-value">${item.vote_average.toFixed(1)}/10</div>
                </div>
            `);
        }

        if (item.data_confidence) {
            infoItems.push(`
                <div class="modal-info-item">
                    <div class="modal-info-label">Data Confidence</div>
                    <div class="modal-info-value">${Math.round(item.data_confidence * 100)}%</div>
                </div>
            `);
        }

        if (item.runtime_minutes) {
            infoItems.push(`
                <div class="modal-info-item">
                    <div class="modal-info-label">Runtime</div>
                    <div class="modal-info-value">${item.runtime_minutes} min</div>
                </div>
            `);
        }

        if (item.director) {
            infoItems.push(`
                <div class="modal-info-item">
                    <div class="modal-info-label">Director</div>
                    <div class="modal-info-value">${item.director}</div>
                </div>
            `);
        }

        if (item.studio) {
            infoItems.push(`
                <div class="modal-info-item">
                    <div class="modal-info-label">Studio</div>
                    <div class="modal-info-value">${item.studio}</div>
                </div>
            `);
        }

        modalBody.innerHTML = `
            <div class="modal-detail">
                <div class="modal-header">
                    <img src="${item.poster_path || 'https://via.placeholder.com/300x450'}" 
                         alt="${item.title}" class="modal-poster">
                    <h2 class="modal-title">${item.title}</h2>
                    ${item.original_title && item.original_title !== item.title ?
                `<p class="modal-original-title">${item.original_title}</p>` : ''}
                    
                    <div class="modal-badges">
                        ${modalBadges.join('')}
                    </div>
                </div>

                <div class="modal-info">
                    ${infoItems.join('')}
                </div>

                ${genres ? `<p style="text-align: center; margin-bottom: 1.5rem; color: var(--text-dim);">${genres}</p>` : ''}

                ${item.overview ? `
                    <div class="modal-overview">
                        ${item.overview}
                    </div>
                ` : ''}

                ${cast.length > 0 ? `
                    <div class="modal-cast">
                        <h4>Cast</h4>
                        <div class="cast-list">
                            ${cast.map(actor => `<span class="cast-member">${actor}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        modal.classList.add('show');
    }

    updateStats() {
        const stats = this.data.metadata?.statistics || {};
        const total = stats.total_releases || 0;

        document.getElementById('totalCount').textContent = total;
        document.getElementById('teluguCount').textContent = stats.telugu_releases || 0;
        document.getElementById('teluguPercentage').textContent = `${stats.telugu_percentage || 0}%`;
        document.getElementById('confirmedCount').textContent = stats.confirmed_dates || 0;
        document.getElementById('confirmedPercentage').textContent = `${stats.confirmed_percentage || 0}%`;
        document.getElementById('highConfidenceCount').textContent = stats.high_confidence_releases || 0;
        document.getElementById('confidencePercentage').textContent = `${stats.confidence_percentage || 0}%`;

        // Calculate cinema releases
        const cinemaReleases = [...this.data.movies, ...this.data.tv_series, ...this.data.anime]
            .filter(item => item.cinema_release).length;
        document.getElementById('cinemaCount').textContent = cinemaReleases;

        // Last updated
        if (this.data.metadata?.fetched_at) {
            const lastUpdated = new Date(this.data.metadata.fetched_at).toLocaleString();
            document.getElementById('lastUpdated').textContent = `Last updated: ${lastUpdated}`;
        }
    }

    updateMonthNavigation() {
        const monthNavigation = document.getElementById('monthNavigation');
        const monthCards = document.querySelector('.month-cards');

        if (!this.data.metadata?.windows) {
            monthNavigation.style.display = 'none';
            return;
        }

        const windows = this.data.metadata.windows;
        const currentMonth = new Date().getMonth();

        monthCards.innerHTML = windows.map((window, index) => {
            const startDate = new Date(window.start);
            const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            // Count releases in this month
            const monthReleases = [...this.data.movies, ...this.data.tv_series, ...this.data.anime]
                .filter(item => {
                    const releaseMonth = item.displayReleaseDate.getMonth();
                    return releaseMonth === startDate.getMonth();
                }).length;

            return `
                <div class="month-card ${window.is_current ? 'current' : ''}" 
                     onclick="app.filterByMonth(${index})">
                    <div class="month-name">${monthName}</div>
                    <div class="month-count">${monthReleases} releases</div>
                    ${window.is_current ? '<div style="color: var(--success); font-size: 0.75rem;">Current</div>' : ''}
                </div>
            `;
        }).join('');

        monthNavigation.style.display = 'block';
    }

    filterByMonth(monthIndex) {
        this.filters.month = monthIndex.toString();
        document.getElementById('monthFilter').value = monthIndex.toString();
        this.applyFilters();

        // Update active month card
        document.querySelectorAll('.month-card').forEach((card, index) => {
            card.classList.toggle('active', index === monthIndex);
        });
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
            'ko': 'Korean',
            'fr': 'French',
            'es': 'Spanish',
            'de': 'German'
        };
        return languages[langCode] || langCode.toUpperCase();
    }

    toggleFilters() {
        this.filtersVisible = !this.filtersVisible;
        const filtersElement = document.getElementById('advancedFilters');
        const toggleButton = document.getElementById('filtersToggle');

        filtersElement.classList.toggle('show', this.filtersVisible);
        toggleButton.classList.toggle('active', this.filtersVisible);
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

// Global functions
function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

function loadUpcomingReleases() {
    app.loadUpcomingReleases();
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new EnhancedUpcomingApp();
});