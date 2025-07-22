// Page-specific initialization functions

function initializeHomePage() {
    loadHomeContent();
    setupHeroCarousel();
}

async function loadHomeContent() {
    const sections = [
        { id: 'trending-content', api: () => ApiService.getTrending('all', 20) },
        { id: 'new-releases-content', api: () => ApiService.getNewReleases(null, 'movie', 20) },
        { id: 'critics-choice-content', api: () => ApiService.getCriticsChoice('movie', 20) },
        { id: 'admin-choice-content', api: () => ApiService.getAdminChoice(20) },
        { id: 'anime-content', api: () => ApiService.getAnimeRecommendations(null, 20) }
    ];

    sections.forEach(async section => {
        const container = document.getElementById(section.id);
        if (container) {
            try {
                showLoadingSkeleton(container);
                const response = await section.api();
                if (response.success && response.data.recommendations) {
                    renderContentCarousel(container, response.data.recommendations);
                } else {
                    showErrorMessage(container, 'Failed to load content');
                }
            } catch (error) {
                console.error(`Error loading ${section.id}:`, error);
                showErrorMessage(container, 'Failed to load content');
            }
        }
    });

    // Load anonymous recommendations if not authenticated
    if (!isAuthenticated()) {
        const anonymousContainer = document.getElementById('recommended-content');
        if (anonymousContainer) {
            try {
                const response = await ApiService.getAnonymousRecommendations(20);
                if (response.success && response.data.recommendations) {
                    renderContentCarousel(anonymousContainer, response.data.recommendations);
                }
            } catch (error) {
                console.error('Error loading anonymous recommendations:', error);
            }
        }
    }
}

function setupHeroCarousel() {
    const heroContainer = document.querySelector('.hero-carousel');
    if (!heroContainer) return;

    let currentSlide = 0;
    const slides = heroContainer.querySelectorAll('.hero-slide');
    const totalSlides = slides.length;

    if (totalSlides <= 1) return;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
    }

    // Auto-advance slides
    setInterval(nextSlide, 5000);

    // Navigation buttons
    const prevBtn = heroContainer.querySelector('.hero-prev');
    const nextBtn = heroContainer.querySelector('.hero-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            showSlide(currentSlide);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', nextSlide);
    }
}

function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleBtns = document.querySelectorAll('.toggle-form');

    // Handle form toggle
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-target');
            
            if (target === 'register') {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            } else {
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
            }
        });
    });

    // Handle login form
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const credentials = {
                username: formData.get('username'),
                password: formData.get('password')
            };
            
            const remember = formData.get('remember') === 'on';
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading"></span> Signing in...';
                
                const result = await Auth.login(credentials, remember);
                
                if (!result.success) {
                    showToast(result.error || 'Login failed', 'error');
                }
            } catch (error) {
                showToast('Login failed. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // Handle register form
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: password,
                preferred_languages: Array.from(formData.getAll('languages')),
                preferred_genres: Array.from(formData.getAll('genres'))
            };
            
            const remember = formData.get('remember') === 'on';
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading"></span> Creating account...';
                
                const result = await Auth.register(userData, remember);
                
                if (!result.success) {
                    showToast(result.error || 'Registration failed', 'error');
                }
            } catch (error) {
                showToast('Registration failed. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
}

function initializeDashboard() {
    if (!requireAuth()) return;
    
    loadPersonalizedContent();
    setupDashboardFilters();
}

async function loadPersonalizedContent() {
    const sections = [
        { id: 'continue-watching', api: () => loadContinueWatching() },
        { id: 'recommended-for-you', api: () => ApiService.getPersonalizedRecommendations(20) },
        { id: 'trending-now', api: () => ApiService.getTrending('all', 15) },
        { id: 'new-releases', api: () => ApiService.getNewReleases(null, 'movie', 15) }
    ];

    sections.forEach(async section => {
        const container = document.getElementById(section.id);
        if (container) {
            try {
                showLoadingSkeleton(container);
                const response = await section.api();
                if (response.success && response.data) {
                    const content = response.data.recommendations || response.data;
                    renderContentCarousel(container, content);
                }
            } catch (error) {
                console.error(`Error loading ${section.id}:`, error);
                showErrorMessage(container, 'Failed to load content');
            }
        }
    });
}

async function loadContinueWatching() {
    // This would typically load from user's viewing history
    // For now, return recent interactions
    try {
        const response = await ApiService.getPersonalizedRecommendations(10);
        return response;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function setupDashboardFilters() {
    const genreFilter = document.getElementById('genreFilter');
    const typeFilter = document.getElementById('typeFilter');
    const languageFilter = document.getElementById('languageFilter');

    if (genreFilter) {
        genreFilter.addEventListener('change', filterDashboardContent);
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', filterDashboardContent);
    }
    if (languageFilter) {
        languageFilter.addEventListener('change', filterDashboardContent);
    }
}

function filterDashboardContent() {
    const genre = document.getElementById('genreFilter')?.value;
    const type = document.getElementById('typeFilter')?.value;
    const language = document.getElementById('languageFilter')?.value;

    // Apply filters to content sections
    // This would involve re-querying the API with filters
    // Implementation depends on specific requirements
}

function initializeDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const contentId = urlParams.get('id');
    
    if (contentId) {
        loadContentDetails(contentId);
    } else {
        showToast('Content not found', 'error');
        window.location.href = '/';
    }
}

async function loadContentDetails(contentId) {
    try {
        showDetailsSkeleton();
        
        const response = await ApiService.getContentDetails(contentId);
        
        if (response.success && response.data) {
            renderContentDetails(response.data);
            
            // Record view interaction
            if (isAuthenticated()) {
                ApiService.recordInteraction(contentId, 'view');
            }
        } else {
            throw new Error('Content not found');
        }
    } catch (error) {
        console.error('Error loading content details:', error);
        showErrorMessage(document.querySelector('.details-container'), 'Failed to load content details');
    }
}

function renderContentDetails(content) {
    const container = document.querySelector('.details-container');
    if (!container) return;

    const trailerEmbed = content.youtube_trailer ? 
        `<iframe src="https://www.youtube.com/embed/${content.youtube_trailer.split('v=')[1]}" 
                 frameborder="0" allowfullscreen class="trailer-video"></iframe>` : '';

    container.innerHTML = `
        <div class="details-hero">
            <div class="details-backdrop">
                <img src="${content.backdrop_path || content.poster_path}" alt="${content.title}" class="backdrop-image">
            </div>
            <div class="details-content">
                <div class="details-poster">
                    <img src="${content.poster_path}" alt="${content.title}" class="poster-image">
                </div>
                <div class="details-info">
                    <h1 class="details-title">${content.title}</h1>
                    ${content.original_title !== content.title ? `<p class="original-title">${content.original_title}</p>` : ''}
                    
                    <div class="details-meta">
                        <span class="content-type">${content.content_type.toUpperCase()}</span>
                        ${content.rating ? `<span class="rating">⭐ ${content.rating}/10</span>` : ''}
                        ${content.release_date ? `<span class="release-date">${new Date(content.release_date).getFullYear()}</span>` : ''}
                        ${content.runtime ? `<span class="runtime">${content.runtime} min</span>` : ''}
                    </div>

                    <div class="genres">
                        ${content.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                    </div>

                    <p class="overview">${content.overview}</p>

                    <div class="action-buttons">
                        ${content.youtube_trailer ? `<button class="btn btn-primary" onclick="playTrailer('${content.youtube_trailer}')">
                            <i class="icon-play"></i> Watch Trailer
                        </button>` : ''}
                        ${isAuthenticated() ? `
                            <button class="btn btn-outline" onclick="addToWatchlist(${content.id})">
                                <i class="icon-plus"></i> Watchlist
                            </button>
                            <button class="btn btn-outline" onclick="addToFavorites(${content.id})">
                                <i class="icon-heart"></i> Favorite
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>

        <div class="details-sections">
            ${content.cast && content.cast.length > 0 ? `
                <section class="cast-section">
                    <h2>Cast</h2>
                    <div class="cast-grid">
                        ${content.cast.slice(0, 10).map(actor => `
                            <div class="cast-member">
                                <img src="${actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : '/assets/images/person-placeholder.jpg'}" 
                                     alt="${actor.name}" class="cast-photo">
                                <h4 class="cast-name">${actor.name}</h4>
                                <p class="cast-character">${actor.character || ''}</p>
                            </div>
                        `).join('')}
                    </div>
                </section>
            ` : ''}

            ${content.similar_content && content.similar_content.length > 0 ? `
                <section class="similar-section">
                    <h2>Similar Content</h2>
                    <div class="content-carousel" id="similar-content">
                        ${content.similar_content.map(item => createContentCard(item).outerHTML).join('')}
                    </div>
                </section>
            ` : ''}
        </div>

        ${trailerEmbed ? `
            <div id="trailerModal" class="modal">
                <div class="modal-content trailer-modal">
                    <button class="modal-close">&times;</button>
                    <div class="trailer-container">
                        ${trailerEmbed}
                    </div>
                </div>
            </div>
        ` : ''}
    `;

    // Re-initialize components
    initializeModals();
    initializeLazyLoading();
}

function playTrailer(trailerUrl) {
    openModal('trailerModal');
}

function initializeAdminPage() {
    if (!requireAdmin()) return;

    const path = window.location.pathname;
    
    if (path.includes('/admin/dashboard')) {
        loadAdminDashboard();
    } else if (path.includes('/admin/content-browser')) {
        initializeContentBrowser();
    } else if (path.includes('/admin/analytics')) {
        loadAnalytics();
    }
}

async function loadAdminDashboard() {
    try {
        const [analyticsResponse, mlServiceResponse] = await Promise.all([
            ApiService.getAnalytics(),
            ApiService.checkMLService()
        ]);

        if (analyticsResponse.success) {
            renderAnalyticsSummary(analyticsResponse.data);
        }

        if (mlServiceResponse.success) {
            renderMLServiceStatus(mlServiceResponse.data);
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

function initializeContentBrowser() {
    const searchForm = document.getElementById('contentSearchForm');
    const sourceSelect = document.getElementById('sourceSelect');
    
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(searchForm);
            const query = formData.get('query');
            const source = formData.get('source');
            
            if (query) {
                await searchExternalContent(query, source);
            }
        });
    }
}

async function searchExternalContent(query, source) {
    const resultsContainer = document.getElementById('searchResults');
    
    try {
        showLoadingSkeleton(resultsContainer);
        
        const response = await ApiService.adminSearch(query, source);
        
        if (response.success && response.data.results) {
            renderExternalSearchResults(resultsContainer, response.data.results);
        } else {
            showErrorMessage(resultsContainer, 'No results found');
        }
    } catch (error) {
        console.error('Search error:', error);
        showErrorMessage(resultsContainer, 'Search failed');
    }
}

function renderExternalSearchResults(container, results) {
    container.innerHTML = results.map(item => `
        <div class="external-content-card">
            <img src="${item.poster_path || '/assets/images/placeholder.jpg'}" alt="${item.title}">
            <div class="content-info">
                <h3>${item.title}</h3>
                <p class="content-meta">${item.content_type} • ${item.release_date || 'N/A'}</p>
                <p class="content-overview">${(item.overview || '').substring(0, 150)}...</p>
                <div class="content-actions">
                    <button class="btn btn-primary" onclick="saveExternalContent(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        Save to Database
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function saveExternalContent(contentData) {
    try {
        const response = await ApiService.saveExternalContent(contentData);
        
        if (response.success) {
            showToast('Content saved successfully', 'success');
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        handleApiError(error, 'Failed to save content');
    }
}

function initializeCategoryPage() {
    const pathParts = window.location.pathname.split('/');
    const category = pathParts[pathParts.length - 1];
    
    loadCategoryContent(category);
    setupCategoryFilters();
}

async function loadCategoryContent(category) {
    const container = document.getElementById('categoryContent');
    if (!container) return;

    try {
        showLoadingSkeleton(container);
        
        let response;
        switch (category) {
            case 'trending':
                response = await ApiService.getTrending('all', 40);
                break;
            case 'popular':
                response = await ApiService.getTrending('week', 40);
                break;
            case 'new-releases':
                response = await ApiService.getNewReleases(null, 'movie', 40);
                break;
            case 'critic-choices':
                response = await ApiService.getCriticsChoice('movie', 40);
                break;
            case 'movies':
                response = await ApiService.getTrending('movie', 40);
                break;
            case 'tv-shows':
                response = await ApiService.getTrending('tv', 40);
                break;
            case 'anime':
                response = await ApiService.getAnimeRecommendations(null, 40);
                break;
            default:
                throw new Error('Unknown category');
        }

        if (response.success && response.data.recommendations) {
            renderContentGrid(container, response.data.recommendations);
        } else {
            throw new Error('Failed to load content');
        }
    } catch (error) {
        console.error('Error loading category content:', error);
        showErrorMessage(container, 'Failed to load content');
    }
}

function initializeLanguagePage() {
    const pathParts = window.location.pathname.split('/');
    const language = pathParts[pathParts.length - 1];
    
    loadLanguageContent(language);
}

async function loadLanguageContent(language) {
    const container = document.getElementById('languageContent');
    if (!container) return;

    try {
        showLoadingSkeleton(container);
        
        const response = await ApiService.getRegionalContent(language, 'movie', 40);
        
        if (response.success && response.data.recommendations) {
            renderContentGrid(container, response.data.recommendations);
        } else {
            throw new Error('Failed to load content');
        }
    } catch (error) {
        console.error('Error loading language content:', error);
        showErrorMessage(container, 'Failed to load content');
    }
}

function initializeUserPage() {
    if (!requireAuth()) return;

    const path = window.location.pathname;
    
    if (path.includes('/user/watchlist')) {
        loadWatchlist();
    } else if (path.includes('/user/favorites')) {
        loadFavorites();
    }
}

async function loadWatchlist() {
    const container = document.getElementById('watchlistContent');
    if (!container) return;

    try {
        showLoadingSkeleton(container);
        
        const response = await ApiService.getWatchlist();
        
        if (response.success && response.data.watchlist) {
            renderContentGrid(container, response.data.watchlist);
        } else {
            container.innerHTML = '<div class="empty-state">Your watchlist is empty</div>';
        }
    } catch (error) {
        console.error('Error loading watchlist:', error);
        showErrorMessage(container, 'Failed to load watchlist');
    }
}

async function loadFavorites() {
    const container = document.getElementById('favoritesContent');
    if (!container) return;

    try {
        showLoadingSkeleton(container);
        
        const response = await ApiService.getFavorites();
        
        if (response.success && response.data.favorites) {
            renderContentGrid(container, response.data.favorites);
        } else {
            container.innerHTML = '<div class="empty-state">No favorites yet</div>';
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        showErrorMessage(container, 'Failed to load favorites');
    }
}

// Utility functions for rendering
function renderContentCarousel(container, content) {
    container.innerHTML = content.map(item => createContentCard(item).outerHTML).join('');
    initializeLazyLoading();
}

function renderContentGrid(container, content) {
    container.className = 'content-grid';
    container.innerHTML = content.map(item => createContentCard(item).outerHTML).join('');
    initializeLazyLoading();
}

function showLoadingSkeleton(container) {
    container.innerHTML = Array(8).fill().map(() => `
        <div class="content-card skeleton">
            <div class="skeleton-poster"></div>
        </div>
    `).join('');
}

function showDetailsSkeleton() {
    const container = document.querySelector('.details-container');
    if (container) {
        container.innerHTML = `
            <div class="details-skeleton">
                <div class="skeleton-backdrop"></div>
                <div class="skeleton-content">
                    <div class="skeleton-poster"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-meta"></div>
                        <div class="skeleton-overview"></div>
                    </div>
                </div>
            </div>
        `;
    }
}

function showErrorMessage(container, message) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

function setupCategoryFilters() {
    const filterForm = document.getElementById('categoryFilters');
    if (filterForm) {
        filterForm.addEventListener('change', () => {
            // Re-load content with new filters
            const category = window.location.pathname.split('/').pop();
            loadCategoryContent(category);
        });
    }
}

// Export additional functions
window.playTrailer = playTrailer;
window.saveExternalContent = saveExternalContent;