// app.js - Main application with routing, components, and performance optimization
class CineScopeApp {
    constructor() {
        this.router = new Router();
        this.components = new ComponentManager();
        this.performanceMonitor = new PerformanceMonitor();
        this.currentPage = null;
        this.init();
    }

    async init() {
        // Mark app initialization
        this.performanceMonitor.mark('app-init-start');

        // Initialize authentication
        Auth.init();

        // Register components
        this.registerComponents();

        // Setup routes
        this.setupRoutes();

        // Initialize UI
        this.initializeUI();

        // Setup event listeners
        this.setupEventListeners();

        // Start router
        this.router.init();

        // Prefetch critical data
        this.prefetchData();

        // Mark app ready
        this.performanceMonitor.mark('app-init-end');
        this.performanceMonitor.measure('app-initialization', 'app-init-start', 'app-init-end');
    }

    registerComponents() {
        // Content card component
        this.components.register('content-card', {
            render: (content) => {
                const poster = content.poster_path || '/images/placeholder.jpg';
                const rating = content.rating ? content.rating.toFixed(1) : 'N/A';

                return `
          <div class="content-card" data-content-id="${content.id}">
            <div class="card-poster">
              <img src="${poster}" alt="${content.title}" loading="lazy">
              ${content.youtube_trailer ? `
                <button class="play-trailer" data-trailer="${content.youtube_trailer}">
                  <i class="icon-play"></i>
                </button>
              ` : ''}
            </div>
            <div class="card-info">
              <h3 class="card-title">${content.title}</h3>
              <div class="card-meta">
                <span class="rating">⭐ ${rating}</span>
                <span class="type">${content.content_type}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="action-watchlist" data-id="${content.id}">
                <i class="icon-plus"></i>
              </button>
              <button class="action-favorite" data-id="${content.id}">
                <i class="icon-heart"></i>
              </button>
            </div>
          </div>
        `;
            }
        });

        // Carousel component
        this.components.register('content-carousel', {
            render: (title, items, id) => {
                return `
          <section class="content-section">
            <h2 class="section-title">${title}</h2>
            <div class="carousel-container" id="${id}">
              <button class="carousel-prev" data-carousel="${id}">‹</button>
              <div class="carousel-track">
                ${items.map(item => this.components.render('content-card', item)).join('')}
              </div>
              <button class="carousel-next" data-carousel="${id}">›</button>
            </div>
          </section>
        `;
            }
        });

        // Loading component
        this.components.register('loading', {
            render: () => `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading amazing content...</p>
        </div>
      `
        });

        // Toast component
        this.components.register('toast', {
            render: (message, type = 'info') => `
        <div class="toast toast-${type}">
          <p>${message}</p>
        </div>
      `
        });

        // Navigation components
        this.components.register('topbar', {
            render: () => {
                const user = Auth.getUser();
                return `
          <header class="topbar">
            <div class="topbar-content">
              <a href="/" class="logo">CineScope</a>
              
              <div class="search-container">
                <input type="search" class="search-input" placeholder="Search movies, shows, anime...">
                <div class="search-results"></div>
              </div>
              
              <nav class="topbar-nav">
                ${user ? `
                  <a href="${Auth.getUserProfileUrl()}" class="nav-link">
                    <i class="icon-user"></i>
                    ${user.username}
                  </a>
                  ${user.is_admin ? `
                    <a href="/admin" class="nav-link">
                      <i class="icon-admin"></i>
                      Admin
                    </a>
                  ` : ''}
                  <button class="logout-btn">Logout</button>
                ` : `
                  <a href="/auth/login.html" class="nav-link">Login</a>
                  <a href="/auth/register.html" class="nav-link btn-primary">Sign Up</a>
                `}
                <button class="theme-toggle">
                  <i class="icon-theme"></i>
                </button>
              </nav>
            </div>
          </header>
        `;
            }
        });

        this.components.register('mobile-nav', {
            render: () => {
                const user = Auth.getUser();
                return `
          <nav class="mobile-nav">
            <a href="/" class="nav-item active">
              <i class="icon-home"></i>
              <span>Home</span>
            </a>
            <a href="/content/search.html" class="nav-item">
              <i class="icon-search"></i>
              <span>Search</span>
            </a>
            ${user ? `
              <a href="${Auth.getUserProfileUrl()}/watchlist" class="nav-item">
                <i class="icon-bookmark"></i>
                <span>Watchlist</span>
              </a>
              <a href="${Auth.getUserProfileUrl()}" class="nav-item">
                <i class="icon-user"></i>
                <span>Profile</span>
              </a>
            ` : `
              <a href="/auth/login.html" class="nav-item">
                <i class="icon-login"></i>
                <span>Login</span>
              </a>
            `}
          </nav>
        `;
            }
        });
    }

    setupRoutes() {
        // Public routes
        this.router.on('/', () => this.loadHomePage());
        this.router.on('/content/search.html', () => this.loadSearchPage());
        this.router.on('/content/details.html', () => this.loadDetailsPage());
        this.router.on('/content/genre.html', () => this.loadGenrePage());
        this.router.on('/content/regional.html', () => this.loadRegionalPage());
        this.router.on('/content/anime.html', () => this.loadAnimePage());
        this.router.on('/content/trending.html', () => this.loadTrendingPage());

        // Auth routes
        this.router.on('/auth/login.html', () => this.loadLoginPage());
        this.router.on('/auth/register.html', () => this.loadRegisterPage());
        this.router.on('/auth/forgot-password.html', () => this.loadForgotPasswordPage());

        // User routes (with username)
        this.router.on('/:username/profile', (params) => this.loadProfilePage(params.username));
        this.router.on('/:username/watchlist', (params) => this.loadWatchlistPage(params.username));
        this.router.on('/:username/favorites', (params) => this.loadFavoritesPage(params.username));
        this.router.on('/:username/activity', (params) => this.loadActivityPage(params.username));
        this.router.on('/:username/settings', (params) => this.loadSettingsPage(params.username));

        // Admin routes
        this.router.on('/admin', () => this.loadAdminDashboard());
        this.router.on('/admin/content.html', () => this.loadAdminContent());
        this.router.on('/admin/users.html', () => this.loadAdminUsers());
        this.router.on('/admin/analytics.html', () => this.loadAdminAnalytics());
    }

    initializeUI() {
        // Render navigation
        const topbarEl = document.querySelector('#topbar');
        const mobileNavEl = document.querySelector('#mobile-nav');

        if (topbarEl) {
            topbarEl.innerHTML = this.components.render('topbar');
        }

        if (mobileNavEl) {
            mobileNavEl.innerHTML = this.components.render('mobile-nav');
        }

        // Apply saved theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Setup viewport for mobile
        this.setupMobileViewport();
    }

    setupEventListeners() {
        // Delegated event handling for performance
        document.addEventListener('click', (e) => {
            // Navigation links
            if (e.target.matches('a[href^="/"]')) {
                e.preventDefault();
                this.router.navigate(e.target.getAttribute('href'));
            }

            // Content card clicks
            if (e.target.closest('.content-card')) {
                const card = e.target.closest('.content-card');
                const contentId = card.dataset.contentId;

                if (e.target.closest('.play-trailer')) {
                    this.playTrailer(e.target.closest('.play-trailer').dataset.trailer);
                } else if (e.target.closest('.action-watchlist')) {
                    this.toggleWatchlist(contentId);
                } else if (e.target.closest('.action-favorite')) {
                    this.toggleFavorite(contentId);
                } else {
                    this.router.navigate(`/content/details.html?id=${contentId}`);
                }
            }

            // Carousel navigation
            if (e.target.matches('.carousel-prev, .carousel-next')) {
                this.handleCarouselNav(e.target);
            }

            // Theme toggle
            if (e.target.closest('.theme-toggle')) {
                this.toggleTheme();
            }

            // Logout
            if (e.target.matches('.logout-btn')) {
                Auth.logout();
            }
        });

        // Search functionality
        let searchTimeout;
        document.addEventListener('input', (e) => {
            if (e.target.matches('.search-input')) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            }
        });

        // Infinite scroll
        if (CONFIG.FEATURES.INFINITE_SCROLL) {
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
                        this.loadMoreContent();
                    }
                }, 100);
            });
        }

        // Handle back/forward navigation
        window.addEventListener('popstate', () => {
            this.router.resolve();
        });
    }

    setupMobileViewport() {
        // Handle mobile viewport and safe areas
        const updateViewport = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);

            // Handle notch/safe areas
            const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0');
            const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0');

            document.documentElement.style.setProperty('--safe-area-top', `${safeAreaTop}px`);
            document.documentElement.style.setProperty('--safe-area-bottom', `${safeAreaBottom}px`);
        };

        updateViewport();
        window.addEventListener('resize', updateViewport);
    }

    async prefetchData() {
        // Prefetch critical data for performance
        const prefetchList = [
            { url: CONFIG.API_ENDPOINTS.TRENDING, params: { limit: 10 } },
            { url: CONFIG.API_ENDPOINTS.GENRES, params: {} }
        ];

        if (Auth.isAuthenticated()) {
            prefetchList.push({ url: CONFIG.API_ENDPOINTS.RECOMMENDATIONS, params: { limit: 10 } });
        }

        await API.client.prefetch(prefetchList);
    }

    // Page loaders
    async loadHomePage() {
        this.performanceMonitor.mark('home-load-start');

        const mainContent = document.querySelector('#main-content');
        mainContent.innerHTML = this.components.render('loading');

        try {
            // Fetch all homepage data in parallel
            const [trending, newReleases, criticsChoice, adminChoice] = await Promise.all([
                API.content.getTrending({ limit: 20 }),
                API.content.getNewReleases({ limit: 15 }),
                API.content.getCriticsChoice({ limit: 15 }),
                API.content.getAdminChoice({ limit: 10 })
            ]);

            // Get personalized recommendations if logged in
            let recommendations = null;
            if (Auth.isAuthenticated()) {
                recommendations = await API.user.getRecommendations({ limit: 20 });
            }

            // Build homepage HTML
            let html = '';

            // Hero section with trending content
            if (trending.recommendations && trending.recommendations.length > 0) {
                const hero = trending.recommendations[0];
                html += `
          <section class="hero-section" style="background-image: url('${hero.backdrop_path || hero.poster_path}')">
            <div class="hero-overlay"></div>
            <div class="hero-content">
              <h1 class="hero-title">${hero.title}</h1>
              <p class="hero-overview">${hero.overview || ''}</p>
              <div class="hero-actions">
                <button class="btn-primary" onclick="App.playTrailer('${hero.youtube_trailer}')">
                  <i class="icon-play"></i> Play Trailer
                </button>
                <button class="btn-secondary" onclick="App.router.navigate('/content/details.html?id=${hero.id}')">
                  <i class="icon-info"></i> More Info
                </button>
              </div>
            </div>
          </section>
        `;
            }

            // Content sections
            if (recommendations && recommendations.recommendations) {
                html += this.components.render('content-carousel', 'Recommended For You', recommendations.recommendations, 'recommended');
            }

            html += this.components.render('content-carousel', 'Trending Now', trending.recommendations || [], 'trending');
            html += this.components.render('content-carousel', 'New Releases', newReleases.recommendations || [], 'new-releases');
            html += this.components.render('content-carousel', "Critics' Choice", criticsChoice.recommendations || [], 'critics');

            if (adminChoice.recommendations && adminChoice.recommendations.length > 0) {
                html += this.components.render('content-carousel', "Admin's Picks", adminChoice.recommendations, 'admin-picks');
            }

            // Genre sections
            const genres = ['action', 'comedy', 'drama', 'thriller'];
            for (const genre of genres) {
                const genreContent = await API.content.getGenreContent(genre, { limit: 15 });
                if (genreContent.recommendations) {
                    html += this.components.render('content-carousel',
                        `${genre.charAt(0).toUpperCase() + genre.slice(1)} Movies`,
                        genreContent.recommendations,
                        `genre-${genre}`
                    );
                }
            }

            mainContent.innerHTML = html;

            // Initialize carousels
            this.initializeCarousels();

        } catch (error) {
            mainContent.innerHTML = `
        <div class="error-container">
          <h2>Unable to load content</h2>
          <p>Please check your connection and try again.</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
        }

        this.performanceMonitor.mark('home-load-end');
        this.performanceMonitor.measure('home-page-load', 'home-load-start', 'home-load-end');
    }

    async loadDetailsPage() {
        const params = new URLSearchParams(window.location.search);
        const contentId = params.get('id');

        if (!contentId) {
            this.router.navigate('/');
            return;
        }

        const mainContent = document.querySelector('#main-content');
        mainContent.innerHTML = this.components.render('loading');

        try {
            const [details, similar] = await Promise.all([
                API.content.getDetails(contentId),
                API.content.getSimilar(contentId, { limit: 12 })
            ]);

            // Record view interaction
            if (Auth.isAuthenticated()) {
                API.user.recordInteraction(contentId, 'view');
            }

            const genres = details.genres ? details.genres.join(', ') : 'N/A';
            const cast = details.cast ? details.cast.slice(0, 8).map(actor => actor.name).join(', ') : 'N/A';

            mainContent.innerHTML = `
        <div class="details-container">
          <div class="details-backdrop" style="background-image: url('${details.backdrop_path}')">
            <div class="backdrop-overlay"></div>
          </div>
          
          <div class="details-content">
            <div class="details-poster">
              <img src="${details.poster_path}" alt="${details.title}">
            </div>
            
            <div class="details-info">
              <h1 class="details-title">${details.title}</h1>
              ${details.original_title && details.original_title !== details.title ?
                    `<p class="details-original-title">${details.original_title}</p>` : ''
                }
              
              <div class="details-meta">
                <span class="rating">⭐ ${details.rating || 'N/A'}/10</span>
                <span class="release-date">${details.release_date || 'N/A'}</span>
                <span class="runtime">${details.runtime ? `${details.runtime} min` : 'N/A'}</span>
                <span class="content-type">${details.content_type.toUpperCase()}</span>
              </div>
              
              <div class="details-genres">
                ${details.genres.map(g => `<span class="genre-chip">${g}</span>`).join('')}
              </div>
              
              <p class="details-overview">${details.overview || 'No overview available.'}</p>
              
              <div class="details-actions">
                ${details.youtube_trailer ? `
                  <button class="btn-primary" onclick="App.playTrailer('${details.youtube_trailer}')">
                    <i class="icon-play"></i> Watch Trailer
                  </button>
                ` : ''}
                <button class="btn-secondary" onclick="App.toggleWatchlist(${contentId})">
                  <i class="icon-plus"></i> Add to Watchlist
                </button>
                <button class="btn-secondary" onclick="App.toggleFavorite(${contentId})">
                  <i class="icon-heart"></i> Add to Favorites
                </button>
              </div>
              
              <div class="details-cast">
                <h3>Cast</h3>
                <p>${cast}</p>
              </div>
            </div>
          </div>
          
          ${similar.recommendations && similar.recommendations.length > 0 ?
                    this.components.render('content-carousel', 'More Like This', similar.recommendations, 'similar')
                    : ''
                }
        </div>
      `;

            this.initializeCarousels();

        } catch (error) {
            mainContent.innerHTML = `
        <div class="error-container">
          <h2>Content not found</h2>
          <p>The requested content could not be loaded.</p>
          <button onclick="App.router.navigate('/')">Back to Home</button>
        </div>
      `;
        }
    }

    async loadSearchPage() {
        const mainContent = document.querySelector('#main-content');

        mainContent.innerHTML = `
      <div class="search-page">
        <h1>Search</h1>
        
        <div class="search-filters">
          <input type="search" class="search-main" placeholder="Search movies, TV shows, anime..." autofocus>
          
          <div class="filter-options">
            <select class="filter-type">
              <option value="multi">All</option>
              <option value="movie">Movies</option>
              <option value="tv">TV Shows</option>
              <option value="anime">Anime</option>
            </select>
            
            <select class="filter-genre">
              <option value="">All Genres</option>
              ${Object.entries(CONFIG.GENRES).map(([key, genre]) =>
            `<option value="${key}">${genre.name}</option>`
        ).join('')}
            </select>
          </div>
        </div>
        
        <div class="search-results-container">
          <div id="search-results"></div>
        </div>
      </div>
    `;

        // Setup search handlers
        const searchInput = document.querySelector('.search-main');
        const typeFilter = document.querySelector('.filter-type');
        const genreFilter = document.querySelector('.filter-genre');

        const performSearch = async () => {
            const query = searchInput.value.trim();
            if (!query) return;

            const resultsContainer = document.querySelector('#search-results');
            resultsContainer.innerHTML = this.components.render('loading');

            try {
                const results = await API.content.search(query, {
                    type: typeFilter.value,
                    genre: genreFilter.value
                });

                if (results.results && results.results.length > 0) {
                    resultsContainer.innerHTML = `
            <div class="content-grid">
              ${results.results.map(item => this.components.render('content-card', item)).join('')}
            </div>
          `;
                } else {
                    resultsContainer.innerHTML = `
            <div class="no-results">
              <p>No results found for "${query}"</p>
            </div>
          `;
                }
            } catch (error) {
                resultsContainer.innerHTML = `
          <div class="error-message">
            <p>Search failed. Please try again.</p>
          </div>
        `;
            }
        };

        searchInput.addEventListener('input', debounce(performSearch, 500));
        typeFilter.addEventListener('change', performSearch);
        genreFilter.addEventListener('change', performSearch);
    }

    async loadProfilePage(username) {
        if (!Auth.canAccessRoute(`/${username}/profile`)) {
            this.router.navigate('/auth/login.html');
            return;
        }

        const mainContent = document.querySelector('#main-content');
        const user = Auth.getUser();

        mainContent.innerHTML = `
      <div class="profile-page">
        <div class="profile-header">
          <div class="profile-avatar">
            <i class="icon-user-large"></i>
          </div>
          <div class="profile-info">
            <h1>${username}</h1>
            <p>${user.email}</p>
            <p>Member since ${new Date(user.created_at || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="profile-stats">
          <div class="stat-card">
            <h3>Watchlist</h3>
            <p class="stat-number" id="watchlist-count">-</p>
          </div>
          <div class="stat-card">
            <h3>Favorites</h3>
            <p class="stat-number" id="favorites-count">-</p>
          </div>
          <div class="stat-card">
            <h3>Ratings</h3>
            <p class="stat-number" id="ratings-count">-</p>
          </div>
        </div>
        
        <div class="profile-sections">
          <section class="profile-section">
            <h2>Recent Activity</h2>
            <div id="recent-activity"></div>
          </section>
          
          <section class="profile-section">
            <h2>Favorite Genres</h2>
            <div class="genre-preferences">
              ${user.preferred_genres ? user.preferred_genres.map(genre =>
            `<span class="genre-chip">${genre}</span>`
        ).join('') : '<p>No genres selected</p>'}
            </div>
          </section>
        </div>
      </div>
    `;

        // Load user stats
        try {
            const [watchlist, favorites] = await Promise.all([
                API.user.getWatchlist(),
                API.user.getFavorites()
            ]);

            document.querySelector('#watchlist-count').textContent = watchlist.watchlist?.length || 0;
            document.querySelector('#favorites-count').textContent = favorites.favorites?.length || 0;

        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }

    // Utility methods
    initializeCarousels() {
        document.querySelectorAll('.carousel-container').forEach(carousel => {
            const track = carousel.querySelector('.carousel-track');
            const cards = track.querySelectorAll('.content-card');
            const cardWidth = cards[0]?.offsetWidth || 200;
            const visibleCards = Math.floor(carousel.offsetWidth / cardWidth);

            let currentIndex = 0;

            const updateCarousel = () => {
                const offset = -currentIndex * cardWidth;
                track.style.transform = `translateX(${offset}px)`;
            };

            carousel.querySelector('.carousel-prev')?.addEventListener('click', () => {
                currentIndex = Math.max(0, currentIndex - visibleCards);
                updateCarousel();
            });

            carousel.querySelector('.carousel-next')?.addEventListener('click', () => {
                const maxIndex = Math.max(0, cards.length - visibleCards);
                currentIndex = Math.min(maxIndex, currentIndex + visibleCards);
                updateCarousel();
            });

            // Touch/swipe support for mobile
            let startX = 0;
            let currentX = 0;
            let isDragging = false;

            track.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                isDragging = true;
            });

            track.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                currentX = e.touches[0].clientX;
                const diff = currentX - startX;
                track.style.transform = `translateX(${(-currentIndex * cardWidth) + diff}px)`;
            });

            track.addEventListener('touchend', () => {
                if (!isDragging) return;
                isDragging = false;
                const diff = currentX - startX;

                if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                        currentIndex = Math.max(0, currentIndex - 1);
                    } else {
                        currentIndex = Math.min(cards.length - visibleCards, currentIndex + 1);
                    }
                }

                updateCarousel();
            });
        });
    }

    async handleSearch(query) {
        if (!query || query.length < 2) {
            document.querySelector('.search-results').innerHTML = '';
            return;
        }

        try {
            const results = await API.content.search(query, { limit: 5 });
            const resultsContainer = document.querySelector('.search-results');

            if (results.results && results.results.length > 0) {
                resultsContainer.innerHTML = `
          <div class="search-dropdown">
            ${results.results.map(item => `
              <a href="/content/details.html?id=${item.id}" class="search-result-item">
                <img src="${item.poster_path}" alt="${item.title}">
                <div class="result-info">
                  <h4>${item.title}</h4>
                  <p>${item.content_type} • ${item.rating || 'N/A'} ⭐</p>
                </div>
              </a>
            `).join('')}
            <a href="/content/search.html?q=${encodeURIComponent(query)}" class="search-all-results">
              View all results for "${query}"
            </a>
          </div>
        `;
            } else {
                resultsContainer.innerHTML = `
          <div class="search-dropdown">
            <p class="no-results">No results found</p>
          </div>
        `;
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    async toggleWatchlist(contentId) {
        if (!Auth.isAuthenticated()) {
            this.showToast('Please login to add to watchlist', 'warning');
            return;
        }

        try {
            await API.user.addToWatchlist(contentId);
            this.showToast('Added to watchlist', 'success');

            // Update UI
            const button = document.querySelector(`.action-watchlist[data-id="${contentId}"]`);
            if (button) {
                button.classList.add('active');
            }
        } catch (error) {
            this.showToast('Failed to add to watchlist', 'error');
        }
    }

    async toggleFavorite(contentId) {
        if (!Auth.isAuthenticated()) {
            this.showToast('Please login to add to favorites', 'warning');
            return;
        }

        try {
            await API.user.addToFavorites(contentId);
            this.showToast('Added to favorites', 'success');

            // Update UI
            const button = document.querySelector(`.action-favorite[data-id="${contentId}"]`);
            if (button) {
                button.classList.add('active');
            }
        } catch (error) {
            this.showToast('Failed to add to favorites', 'error');
        }
    }

    playTrailer(youtubeUrl) {
        if (!youtubeUrl) return;

        // Extract video ID
        const videoId = youtubeUrl.split('v=')[1];
        if (!videoId) return;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'trailer-modal';
        modal.innerHTML = `
      <div class="trailer-content">
        <button class="trailer-close">&times;</button>
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
          frameborder="0" 
          allowfullscreen
        ></iframe>
      </div>
    `;

        document.body.appendChild(modal);

        // Close on click
        modal.addEventListener('click', (e) => {
            if (e.target.matches('.trailer-close') || e.target === modal) {
                modal.remove();
            }
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.innerHTML = this.components.render('toast', message, type);
        document.body.appendChild(toast.firstElementChild);

        setTimeout(() => {
            toast.firstElementChild.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.firstElementChild.classList.remove('show');
            setTimeout(() => toast.firstElementChild.remove(), 300);
        }, 3000);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Haptic feedback on mobile
        if (CONFIG.FEATURES.HAPTIC_FEEDBACK && 'vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    async loadMoreContent() {
        // Implement infinite scroll loading
        console.log('Loading more content...');
    }
}

// Router implementation
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
    }

    on(pattern, handler) {
        this.routes.set(pattern, { pattern, handler });
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.resolve();
    }

    resolve() {
        const path = window.location.pathname;

        // Check auth requirements
        if (Auth.requiresAuth(path) && !Auth.canAccessRoute(path)) {
            this.navigate('/auth/login.html');
            return;
        }

        // Find matching route
        for (const [pattern, route] of this.routes) {
            const regex = new RegExp('^' + pattern.replace(/:\w+/g, '([^/]+)') + '$');
            const match = path.match(regex);

            if (match) {
                const params = {};
                const paramNames = pattern.match(/:(\w+)/g);

                if (paramNames) {
                    paramNames.forEach((name, index) => {
                        params[name.slice(1)] = match[index + 1];
                    });
                }

                this.currentRoute = path;
                route.handler(params);
                return;
            }
        }

        // Default to home
        this.navigate('/');
    }

    init() {
        this.resolve();
    }
}

// Component Manager
class ComponentManager {
    constructor() {
        this.components = new Map();
    }

    register(name, component) {
        this.components.set(name, component);
    }

    render(name, ...args) {
        const component = this.components.get(name);
        return component ? component.render(...args) : '';
    }
}

// Performance Monitor
class PerformanceMonitor {
    mark(name) {
        if ('performance' in window) {
            performance.mark(name);
        }
    }

    measure(name, startMark, endMark) {
        if ('performance' in window) {
            try {
                performance.measure(name, startMark, endMark);
                const measure = performance.getEntriesByName(name)[0];
                console.log(`Performance: ${name} took ${measure.duration.toFixed(2)}ms`);
            } catch (e) {
                // Marks may not exist
            }
        }
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.App = new CineScopeApp();
    });
} else {
    window.App = new CineScopeApp();
}