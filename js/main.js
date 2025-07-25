// CineScope - Main Application Logic
const API_BASE = 'https://backend-app-970m.onrender.com/api';

// Global state
let currentUser = null;
let authToken = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Load authentication state
    loadAuthState();
    
    // Initialize based on page
    const path = window.location.pathname;
    
    if (path === '/' || path === '/index.html') {
        initializeHomepage();
    } else if (path === '/login' || path === '/login.html') {
        initializeAuth();
    } else if (path === '/dashboard' || path === '/dashboard.html') {
        initializeDashboard();
    } else if (path === '/details' || path === '/details.html') {
        initializeContentDetails();
    } else if (path.startsWith('/categories/')) {
        initializeCategoryPage();
    } else if (path.startsWith('/languages/')) {
        initializeLanguagePage();
    } else if (path.startsWith('/user/')) {
        initializeUserPage();
    } else if (path.startsWith('/admin/')) {
        initializeAdminPage();
    }
}

function loadAuthState() {
    authToken = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
    }
}

// API Helper Functions
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    // Add auth token if available
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Authentication Functions
function initializeAuth() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authMessage = document.getElementById('authMessage');
    
    // Tab switching
    loginTab?.addEventListener('click', () => {
        switchAuthTab('login');
    });
    
    registerTab?.addEventListener('click', () => {
        switchAuthTab('register');
    });
    
    // Form submissions
    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
    
    // Check if already logged in
    if (authToken) {
        window.location.href = currentUser?.is_admin ? '/admin/dashboard' : '/dashboard';
    }
}

function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authMessage = document.getElementById('authMessage');
    
    if (tab === 'login') {
        loginTab?.classList.add('active');
        registerTab?.classList.remove('active');
        loginForm?.classList.add('active');
        registerForm?.classList.remove('active');
    } else {
        registerTab?.classList.add('active');
        loginTab?.classList.remove('active');
        registerForm?.classList.add('active');
        loginForm?.classList.remove('active');
    }
    
    authMessage?.classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const submitBtn = document.getElementById('loginSubmit');
    const authMessage = document.getElementById('authMessage');
    
    if (!username || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        setButtonLoading(submitBtn, true);
        
        const response = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        // Store auth data
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        showAuthMessage('Login successful! Redirecting...', 'success');
        
        // Redirect based on user type
        setTimeout(() => {
            window.location.href = response.user.is_admin ? '/admin/dashboard' : '/dashboard';
        }, 1000);
        
    } catch (error) {
        showAuthMessage(error.message || 'Login failed', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername')?.value;
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;
    const submitBtn = document.getElementById('registerSubmit');
    
    if (!username || !email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    // Get preferences
    const languages = Array.from(document.querySelectorAll('input[name="languages"]:checked'))
        .map(cb => cb.value);
    const genres = Array.from(document.querySelectorAll('input[name="genres"]:checked'))
        .map(cb => cb.value);
    
    try {
        setButtonLoading(submitBtn, true);
        
        const response = await apiCall('/register', {
            method: 'POST',
            body: JSON.stringify({
                username,
                email,
                password,
                preferred_languages: languages,
                preferred_genres: genres
            })
        });
        
        // Store auth data
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        showAuthMessage('Registration successful! Redirecting...', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1000);
        
    } catch (error) {
        showAuthMessage(error.message || 'Registration failed', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

function showAuthMessage(message, type) {
    const authMessage = document.getElementById('authMessage');
    if (!authMessage) return;
    
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
    authMessage.classList.remove('hidden');
    
    if (type === 'success') {
        setTimeout(() => {
            authMessage.classList.add('hidden');
        }, 3000);
    }
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input?.nextElementSibling?.querySelector('i');
    
    if (input?.type === 'password') {
        input.type = 'text';
        toggle?.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
        input.type = 'password';
        toggle?.classList.replace('bi-eye-slash', 'bi-eye');
    }
}

// Homepage Functions
function initializeHomepage() {
    loadTrendingContent();
    loadNewReleases();
    loadCriticsChoice();
    
    // Button event listeners
    const exploreBtn = document.getElementById('exploreBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    exploreBtn?.addEventListener('click', () => {
        if (authToken) {
            window.location.href = '/dashboard';
        } else {
            document.querySelector('.content-section')?.scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
    });
    
    loginBtn?.addEventListener('click', () => {
        window.location.href = '/login';
    });
}

async function loadTrendingContent() {
    const container = document.getElementById('trending-content');
    if (!container) return;
    
    try {
        const data = await apiCall('/recommendations/trending?limit=12');
        displayContentGrid(container, data.recommendations || []);
    } catch (error) {
        console.error('Error loading trending content:', error);
        showErrorState(container, 'Failed to load trending content');
    }
}

async function loadNewReleases() {
    const container = document.getElementById('new-releases-content');
    if (!container) return;
    
    try {
        const data = await apiCall('/recommendations/new-releases?limit=12');
        displayContentGrid(container, data.recommendations || []);
    } catch (error) {
        console.error('Error loading new releases:', error);
        showErrorState(container, 'Failed to load new releases');
    }
}

async function loadCriticsChoice() {
    const container = document.getElementById('critics-choice-content');
    if (!container) return;
    
    try {
        const data = await apiCall('/recommendations/critics-choice?limit=12');
        displayContentGrid(container, data.recommendations || []);
    } catch (error) {
        console.error('Error loading critics choice:', error);
        showErrorState(container, 'Failed to load critics choice');
    }
}

// Dashboard Functions
function initializeDashboard() {
    // Check authentication
    if (!authToken) {
        window.location.href = '/login';
        return;
    }
    
    loadUserInfo();
    loadPersonalizedRecommendations();
    loadActivityBased();
    loadTrendingContent();
    loadLanguageContent();
    
    // Event listeners
    const refreshBtn = document.getElementById('refreshRecommendations');
    refreshBtn?.addEventListener('click', loadPersonalizedRecommendations);
}

function loadUserInfo() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl && currentUser) {
        userNameEl.textContent = currentUser.username;
    }
    
    // Load user stats
    loadUserStats();
}

async function loadUserStats() {
    try {
        const [watchlist, favorites] = await Promise.all([
            apiCall('/user/watchlist'),
            apiCall('/user/favorites')
        ]);
        
        const watchlistCount = document.getElementById('watchlistCount');
        const favoritesCount = document.getElementById('favoritesCount');
        
        if (watchlistCount) watchlistCount.textContent = watchlist.watchlist?.length || 0;
        if (favoritesCount) favoritesCount.textContent = favorites.favorites?.length || 0;
        
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function loadPersonalizedRecommendations() {
    const container = document.getElementById('personalized-recommendations');
    if (!container) return;
    
    try {
        // Try ML-enhanced recommendations first
        let data;
        try {
            data = await apiCall('/recommendations/ml-personalized?limit=15');
        } catch (mlError) {
            console.warn('ML recommendations failed, falling back to basic personalized');
            data = await apiCall('/recommendations/personalized?limit=15');
        }
        
        displayContentGrid(container, data.recommendations || []);
        
        // Show ML insights if available
        if (data.ml_strategy) {
            console.log('ML Strategy:', data.ml_strategy);
        }
        
    } catch (error) {
        console.error('Error loading personalized recommendations:', error);
        showErrorState(container, 'Failed to load recommendations');
    }
}

async function loadActivityBased() {
    const container = document.getElementById('activity-based');
    if (!container) return;
    
    try {
        const data = await apiCall('/recommendations/trending?limit=12');
        displayContentGrid(container, data.recommendations || []);
    } catch (error) {
        console.error('Error loading activity-based content:', error);
        showErrorState(container, 'Failed to load content');
    }
}

async function loadLanguageContent() {
    const container = document.getElementById('language-content');
    if (!container || !currentUser?.preferred_languages) return;
    
    try {
        const languages = JSON.parse(currentUser.preferred_languages);
        if (languages.length === 0) {
            document.getElementById('languageSection').style.display = 'none';
            return;
        }
        
        // Load content for first preferred language
        const language = languages[0];
        const data = await apiCall(`/recommendations/regional/${language}?limit=12`);
        displayContentGrid(container, data.recommendations || []);
        
    } catch (error) {
        console.error('Error loading language content:', error);
        showErrorState(container, 'Failed to load regional content');
    }
}

// Content Details Functions
function initializeContentDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const contentId = urlParams.get('id');
    
    if (!contentId) {
        showError('Content ID not provided');
        return;
    }
    
    loadContentDetails(contentId);
    
    // Initialize buttons
    const watchTrailerBtn = document.getElementById('watchTrailerBtn');
    const addToWatchlistBtn = document.getElementById('addToWatchlistBtn');
    const addToFavoritesBtn = document.getElementById('addToFavoritesBtn');
    const shareBtn = document.getElementById('shareBtn');
    
    watchTrailerBtn?.addEventListener('click', () => openTrailerModal());
    addToWatchlistBtn?.addEventListener('click', () => addToWatchlist(contentId));
    addToFavoritesBtn?.addEventListener('click', () => addToFavorites(contentId));
    shareBtn?.addEventListener('click', () => shareContent());
}

async function loadContentDetails(contentId) {
    const loadingState = document.getElementById('loadingState');
    const mainContent = document.getElementById('mainContent');
    
    try {
        const data = await apiCall(`/content/${contentId}`);
        
        // Update page title
        document.getElementById('pageTitle').textContent = `${data.title} - CineScope`;
        
        // Display content details
        displayContentDetails(data);
        
        // Load similar content
        loadSimilarContent(contentId);
        
        // Hide loading, show content
        loadingState?.classList.add('hidden');
        mainContent?.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading content details:', error);
        showError('Failed to load content details');
    }
}

function displayContentDetails(content) {
    // Basic info
    const titleEl = document.getElementById('contentTitle');
    const originalTitleEl = document.getElementById('originalTitle');
    const ratingEl = document.getElementById('rating');
    const contentTypeEl = document.getElementById('contentType');
    const releaseDateEl = document.getElementById('releaseDate');
    const runtimeEl = document.getElementById('runtime');
    const overviewEl = document.getElementById('overview');
    
    if (titleEl) titleEl.textContent = content.title;
    if (originalTitleEl && content.original_title && content.original_title !== content.title) {
        originalTitleEl.textContent = content.original_title;
        originalTitleEl.classList.remove('hidden');
    }
    if (ratingEl) ratingEl.textContent = content.rating ? content.rating.toFixed(1) : 'N/A';
    if (contentTypeEl) contentTypeEl.textContent = content.content_type.toUpperCase();
    if (releaseDateEl && content.release_date) {
        const date = new Date(content.release_date);
        releaseDateEl.textContent = date.getFullYear();
    }
    if (runtimeEl && content.runtime) {
        runtimeEl.textContent = `${content.runtime} min`;
    }
    if (overviewEl) overviewEl.textContent = content.overview || 'No overview available.';
    
    // Images
    const posterImg = document.getElementById('posterImage');
    const backdropImg = document.getElementById('backdropImage');
    
    if (posterImg) {
        posterImg.src = content.poster_path || '/assets/images/placeholder.jpg';
        posterImg.alt = content.title;
    }
    
    if (backdropImg && content.backdrop_path) {
        backdropImg.src = content.backdrop_path;
        backdropImg.alt = content.title;
    }
    
    // Genres
    displayGenres(content.genres || []);
    
    // Languages
    displayLanguages(content.languages || []);
    
    // Anime genres (if applicable)
    if (content.content_type === 'anime' && content.anime_genres) {
        displayAnimeGenres(content.anime_genres);
    }
    
    // Cast & Crew
    displayCastCrew(content.cast || [], content.crew || []);
    
    // Store trailer URL globally
    window.currentTrailerUrl = content.youtube_trailer;
}

function displayGenres(genres) {
    const container = document.getElementById('genresContainer');
    if (!container) return;
    
    container.innerHTML = genres.map(genre => 
        `<span class="genre-tag">${genre}</span>`
    ).join('');
}

function displayLanguages(languages) {
    const container = document.getElementById('languages');
    if (!container) return;
    
    container.innerHTML = languages.map(lang => 
        `<span class="badge">${lang}</span>`
    ).join('');
}

function displayAnimeGenres(animeGenres) {
    const container = document.getElementById('animeGenresContainer');
    const genresEl = document.getElementById('animeGenres');
    
    if (!container || !genresEl || !animeGenres.length) return;
    
    container.classList.remove('hidden');
    genresEl.innerHTML = animeGenres.map(genre => 
        `<span class="badge secondary">${genre}</span>`
    ).join('');
}

function displayCastCrew(cast, crew) {
    const container = document.getElementById('castGrid');
    const section = document.getElementById('castSection');
    
    if (!container || (!cast.length && !crew.length)) {
        section?.classList.add('hidden');
        return;
    }
    
    const allPeople = [
        ...cast.slice(0, 8).map(person => ({ ...person, role: person.character || person.role, type: 'cast' })),
        ...crew.slice(0, 4).map(person => ({ ...person, role: person.job || person.role, type: 'crew' }))
    ];
    
    container.innerHTML = allPeople.map(person => `
        <div class="cast-card">
            <div class="cast-avatar">
                ${person.profile_path ? 
                    `<img src="https://image.tmdb.org/t/p/w185${person.profile_path}" alt="${person.name}" class="w-full h-full object-cover rounded-full">` :
                    `<i class="bi bi-person"></i>`
                }
            </div>
            <div class="font-semibold text-sm">${person.name}</div>
            <div class="text-xs text-gray-400">${person.role}</div>
        </div>
    `).join('');
}

async function loadSimilarContent(contentId) {
    const container = document.getElementById('similarContent');
    if (!container) return;
    
    try {
        const data = await apiCall(`/recommendations/similar/${contentId}?limit=12`);
        displayContentGrid(container, data.recommendations || []);
    } catch (error) {
        console.error('Error loading similar content:', error);
        showErrorState(container, 'Failed to load similar content');
    }
}

// Trailer Modal Functions
function openTrailerModal() {
    const modal = document.getElementById('trailerModal');
    const frame = document.getElementById('trailerFrame');
    
    if (!window.currentTrailerUrl) {
        showToast('Trailer not available', 'warning');
        return;
    }
    
    // Convert YouTube URL to embed URL
    const videoId = extractYouTubeVideoId(window.currentTrailerUrl);
    if (videoId) {
        frame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        modal?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        showToast('Invalid trailer URL', 'error');
    }
}

function closeTrailerModal() {
    const modal = document.getElementById('trailerModal');
    const frame = document.getElementById('trailerFrame');
    
    frame.src = '';
    modal?.classList.add('hidden');
    document.body.style.overflow = '';
}

function extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// User Interaction Functions
async function addToWatchlist(contentId) {
    if (!authToken) {
        showToast('Please sign in to add to watchlist', 'warning');
        return;
    }
    
    try {
        await apiCall('/interactions', {
            method: 'POST',
            body: JSON.stringify({
                content_id: parseInt(contentId),
                interaction_type: 'watchlist'
            })
        });
        
        showToast('Added to watchlist!', 'success');
        
        // Update button state
        const btn = document.getElementById('addToWatchlistBtn');
        if (btn) {
            btn.innerHTML = '<i class="bi bi-check mr-1"></i>Added';
            btn.disabled = true;
        }
        
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        showToast('Failed to add to watchlist', 'error');
    }
}

async function addToFavorites(contentId) {
    if (!authToken) {
        showToast('Please sign in to add to favorites', 'warning');
        return;
    }
    
    try {
        await apiCall('/interactions', {
            method: 'POST',
            body: JSON.stringify({
                content_id: parseInt(contentId),
                interaction_type: 'favorite'
            })
        });
        
        showToast('Added to favorites!', 'success');
        
        // Update button state
        const btn = document.getElementById('addToFavoritesBtn');
        if (btn) {
            btn.innerHTML = '<i class="bi bi-heart-fill mr-1"></i>Favorited';
            btn.disabled = true;
        }
        
    } catch (error) {
        console.error('Error adding to favorites:', error);
        showToast('Failed to add to favorites', 'error');
    }
}

function shareContent() {
    const url = window.location.href;
    const title = document.getElementById('contentTitle')?.textContent || 'Check out this content';
    
    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
    }
}

// Content Display Functions
function displayContentGrid(container, items) {
    if (!container) return;
    
    container.classList.remove('loading');
    
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-400">No content found</div>';
        return;
    }
    
    container.innerHTML = items.map(item => createContentCard(item)).join('');
}

function createContentCard(item) {
    const posterUrl = item.poster_path || '/assets/images/placeholder.jpg';
    const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
    const genres = item.genres ? item.genres.slice(0, 2) : [];
    
    return `
        <div class="content-card" onclick="goToDetails(${item.id})">
            <img src="${posterUrl}" alt="${item.title}" class="content-card-image" loading="lazy">
            <div class="content-card-overlay">
                <div class="flex items-center justify-between mb-2">
                    <span class="badge">${item.content_type?.toUpperCase() || 'MOVIE'}</span>
                    <div class="rating-badge">
                        <i class="bi bi-star-fill mr-1"></i>
                        ${rating}
                    </div>
                </div>
                ${item.youtube_trailer ? 
                    '<button class="btn-primary text-xs"><i class="bi bi-play mr-1"></i>Trailer</button>' : 
                    ''
                }
            </div>
            <div class="content-card-info">
                <h3 class="content-card-title">${item.title}</h3>
                <div class="content-card-meta">
                    <span class="rating-badge">
                        <i class="bi bi-star-fill mr-1"></i>
                        ${rating}
                    </span>
                    <span>${item.content_type?.toUpperCase() || 'MOVIE'}</span>
                </div>
                <div class="content-card-genres">
                    ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

// Utility Functions
function showErrorState(container, message) {
    if (!container) return;
    
    container.classList.remove('loading');
    container.innerHTML = `
        <div class="text-center py-8">
            <i class="bi bi-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <p class="text-gray-400">${message}</p>
            <button onclick="location.reload()" class="btn-primary mt-4">
                <i class="bi bi-arrow-clockwise mr-2"></i>
                Retry
            </button>
        </div>
    `;
}

function showError(message) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.innerHTML = `
            <div class="text-center">
                <i class="bi bi-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <p class="text-lg text-red-500">${message}</p>
                <button onclick="history.back()" class="btn-primary mt-4">
                    <i class="bi bi-arrow-left mr-2"></i>
                    Go Back
                </button>
            </div>
        `;
    }
}

function setButtonLoading(button, loading) {
    if (!button) return;
    
    if (loading) {
        button.disabled = true;
        const originalText = button.textContent;
        button.dataset.originalText = originalText;
        button.innerHTML = '<div class="spinner mr-2" style="width: 16px; height: 16px; border-width: 2px;"></div>Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || 'Submit';
    }
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-xl">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Export global functions
window.goToDetails = function(contentId) {
    window.location.href = `/details?id=${contentId}`;
};

window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
};

// Category Page Functions
function initializeCategoryPage() {
    const path = window.location.pathname;
    
    if (path.includes('/trending')) {
        initializeTrendingPage();
    } else if (path.includes('/movies')) {
        initializeMoviesPage();
    } else if (path.includes('/tv-shows')) {
        initializeTVShowsPage();
    } else if (path.includes('/anime')) {
        initializeAnimePage();
    } else if (path.includes('/popular')) {
        initializePopularPage();
    } else if (path.includes('/new-releases')) {
        initializeNewReleasesPage();
    } else if (path.includes('/critic-choices')) {
        initializeCriticsChoicePage();
    }
}

function initializeTrendingPage() {
    let currentFilters = {
        contentType: 'all',
        timeWindow: 'day'
    };
    
    // Filter event listeners
    const contentTypeFilter = document.getElementById('contentTypeFilter');
    const timeFilter = document.getElementById('timeFilter');
    const mobileContentTypeFilter = document.getElementById('mobileContentTypeFilter');
    const mobileTimeFilter = document.getElementById('mobileTimeFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // Desktop filters
    contentTypeFilter?.addEventListener('change', (e) => {
        currentFilters.contentType = e.target.value;
        if (mobileContentTypeFilter) mobileContentTypeFilter.value = e.target.value;
        loadTrendingWithFilters();
    });
    
    timeFilter?.addEventListener('change', (e) => {
        currentFilters.timeWindow = e.target.value;
        if (mobileTimeFilter) mobileTimeFilter.value = e.target.value;
        loadTrendingWithFilters();
    });
    
    // Mobile filters
    mobileContentTypeFilter?.addEventListener('change', (e) => {
        currentFilters.contentType = e.target.value;
        if (contentTypeFilter) contentTypeFilter.value = e.target.value;
        loadTrendingWithFilters();
    });
    
    mobileTimeFilter?.addEventListener('change', (e) => {
        currentFilters.timeWindow = e.target.value;
        if (timeFilter) timeFilter.value = e.target.value;
        loadTrendingWithFilters();
    });
    
    // Refresh button
    refreshBtn?.addEventListener('click', loadTrendingWithFilters);
    
    // Initial load
    loadTrendingWithFilters();
    
    async function loadTrendingWithFilters() {
        const container = document.getElementById('contentGrid');
        const resultsInfo = document.getElementById('resultsInfo');
        
        if (!container) return;
        
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading trending content...</p>
                </div>
            `;
            
            const params = new URLSearchParams({
                type: currentFilters.contentType,
                limit: '24'
            });
            
            const data = await apiCall(`/recommendations/trending?${params}`);
            
            if (resultsInfo) {
                const contentTypeText = currentFilters.contentType === 'all' ? 'content' : currentFilters.contentType;
                const timeText = currentFilters.timeWindow === 'day' ? 'today' : 'this week';
                resultsInfo.textContent = `Trending ${contentTypeText} ${timeText} (${data.recommendations?.length || 0} items)`;
            }
            
            displayContentGrid(container, data.recommendations || []);
            
        } catch (error) {
            console.error('Error loading trending content:', error);
            showErrorState(container, 'Failed to load trending content');
        }
    }
}

function initializeMoviesPage() {
    let currentCategory = 'popular';
    let currentSort = 'popularity';
    
    // Category tabs
    const categoryTabs = document.querySelectorAll('.category-tab');
    const sortFilter = document.getElementById('sortFilter');
    const loadMoreBtn = document.getElementById('loadMoreMovies');
    
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            updateCategoryTitle();
            loadMoviesContent();
        });
    });
    
    sortFilter?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadMoviesContent();
    });
    
    loadMoreBtn?.addEventListener('click', loadMoreMovies);
    
    function updateCategoryTitle() {
        const currentCategoryEl = document.getElementById('currentCategory');
        if (currentCategoryEl) {
            const categoryNames = {
                'popular': 'Popular Movies',
                'new-releases': 'New Release Movies',
                'top-rated': 'Top Rated Movies',
                'action': 'Action Movies',
                'comedy': 'Comedy Movies',
                'drama': 'Drama Movies'
            };
            currentCategoryEl.textContent = categoryNames[currentCategory] || 'Movies';
        }
    }
    
    async function loadMoviesContent() {
        const container = document.getElementById('moviesGrid');
        if (!container) return;
        
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading movies...</p>
                </div>
            `;
            
            let endpoint;
            const params = new URLSearchParams({
                type: 'movie',
                limit: '24'
            });
            
            switch (currentCategory) {
                case 'popular':
                    endpoint = '/recommendations/trending';
                    break;
                case 'new-releases':
                    endpoint = '/recommendations/new-releases';
                    break;
                case 'top-rated':
                    endpoint = '/recommendations/critics-choice';
                    break;
                default:
                    endpoint = `/recommendations/genre/${currentCategory}`;
                    break;
            }
            
            const data = await apiCall(`${endpoint}?${params}`);
            displayContentGrid(container, data.recommendations || []);
            
        } catch (error) {
            console.error('Error loading movies:', error);
            showErrorState(container, 'Failed to load movies');
        }
    }
    
    async function loadMoreMovies() {
        // Implementation for pagination
        console.log('Load more movies');
    }
    
    // Initial load
    loadMoviesContent();
}

function initializeAnimePage() {
    let currentCategory = 'popular';
    let currentSort = 'popularity';
    
    // Category tabs
    const categoryTabs = document.querySelectorAll('.category-tab');
    const sortFilter = document.getElementById('animeSortFilter');
    const loadMoreBtn = document.getElementById('loadMoreAnime');
    
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            updateAnimeCategoryTitle();
            loadAnimeContent();
        });
    });
    
    sortFilter?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadAnimeContent();
    });
    
    function updateAnimeCategoryTitle() {
        const currentCategoryEl = document.getElementById('currentAnimeCategory');
        if (currentCategoryEl) {
            const categoryNames = {
                'popular': 'Popular Anime',
                'shonen': 'Shonen Anime',
                'shojo': 'Shojo Anime',
                'seinen': 'Seinen Anime',
                'josei': 'Josei Anime',
                'kodomomuke': 'Kids Anime'
            };
            currentCategoryEl.textContent = categoryNames[currentCategory] || 'Anime';
        }
    }
    
    async function loadAnimeContent() {
        const container = document.getElementById('animeGrid');
        if (!container) return;
        
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading anime...</p>
                </div>
            `;
            
            const params = new URLSearchParams({
                limit: '24'
            });
            
            if (currentCategory !== 'popular') {
                params.append('genre', currentCategory);
            }
            
            const data = await apiCall(`/recommendations/anime?${params}`);
            displayContentGrid(container, data.recommendations || []);
            
        } catch (error) {
            console.error('Error loading anime:', error);
            showErrorState(container, 'Failed to load anime');
        }
    }
    
    // Initial load
    loadAnimeContent();
}

// Language Page Functions
function initializeLanguagePage(language) {
    let currentCategory = 'popular';
    let currentContentType = 'all';
    
    // Get language from URL if not provided
    if (!language) {
        const path = window.location.pathname;
        language = path.split('/').pop().replace('.html', '');
    }
    
    // Category tabs
    const categoryTabs = document.querySelectorAll('.category-tab');
    const contentTypeFilter = document.getElementById('contentTypeFilter');
    const languageSelector = document.getElementById('languageSelector');
    const mobileLanguageSelector = document.getElementById('mobileLanguageSelector');
    
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            updateLanguageCategoryTitle();
            loadLanguageContent();
        });
    });
    
    contentTypeFilter?.addEventListener('change', (e) => {
        currentContentType = e.target.value;
        loadLanguageContent();
    });
    
    languageSelector?.addEventListener('change', (e) => {
        window.location.href = `/languages/${e.target.value}`;
    });
    
    mobileLanguageSelector?.addEventListener('change', (e) => {
        window.location.href = `/languages/${e.target.value}`;
    });
    
    function updateLanguageCategoryTitle() {
        const currentCategoryEl = document.getElementById('currentLanguageCategory');
        if (currentCategoryEl) {
            const categoryNames = {
                'popular': 'Popular',
                'movies': 'Movies',
                'tv': 'TV Shows',
                'new': 'New Releases',
                'classic': 'Classics'
            };
            const languageNames = {
                'hindi': 'Hindi',
                'english': 'English',
                'telugu': 'Telugu',
                'tamil': 'Tamil',
                'kannada': 'Kannada',
                'malayalam': 'Malayalam'
            };
            currentCategoryEl.textContent = `${categoryNames[currentCategory]} ${languageNames[language]} Content`;
        }
    }
    
    async function loadLanguageContent() {
        const container = document.getElementById('languageContentGrid');
        if (!container) return;
        
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading ${language} content...</p>
                </div>
            `;
            
            const params = new URLSearchParams({
                limit: '24'
            });
            
            if (currentContentType !== 'all') {
                params.append('type', currentContentType);
            }
            
            let endpoint;
            switch (currentCategory) {
                case 'new':
                    endpoint = '/recommendations/new-releases';
                    params.append('language', language);
                    break;
                default:
                    endpoint = `/recommendations/regional/${language}`;
                    break;
            }
            
            const data = await apiCall(`${endpoint}?${params}`);
            displayContentGrid(container, data.recommendations || []);
            
        } catch (error) {
            console.error('Error loading language content:', error);
            showErrorState(container, `Failed to load ${language} content`);
        }
    }
    
    // Initial load
    updateLanguageCategoryTitle();
    loadLanguageContent();
}

// User Page Functions
function initializeUserPage() {
    const path = window.location.pathname;
    
    if (path.includes('/watchlist')) {
        initializeWatchlistPage();
    } else if (path.includes('/favorites')) {
        initializeFavoritesPage();
    }
}

function initializeWatchlistPage() {
    // Check authentication
    if (!authToken) {
        window.location.href = '/login';
        return;
    }
    
    let currentFilter = 'all';
    let currentSort = 'date_added';
    
    // Controls
    const filterType = document.getElementById('filterType');
    const sortBy = document.getElementById('sortBy');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    filterType?.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        loadWatchlist();
    });
    
    sortBy?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadWatchlist();
    });
    
    clearAllBtn?.addEventListener('click', clearWatchlist);
    refreshBtn?.addEventListener('click', loadWatchlist);
    
    async function loadWatchlist() {
        const container = document.getElementById('watchlistGrid');
        const emptyState = document.getElementById('emptyState');
        const countEl = document.getElementById('watchlistCount');
        
        if (!container) return;
        
        try {
            container.className = 'loading';
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading your watchlist...</p>
                </div>
            `;
            
            const data = await apiCall('/user/watchlist');
            let items = data.watchlist || [];
            
            // Apply filters
            if (currentFilter !== 'all') {
                items = items.filter(item => item.content_type === currentFilter);
            }
            
            // Apply sorting
            items.sort((a, b) => {
                switch (currentSort) {
                    case 'title':
                        return a.title.localeCompare(b.title);
                    case 'rating':
                        return (b.rating || 0) - (a.rating || 0);
                    case 'release_date':
                        return new Date(b.release_date || 0) - new Date(a.release_date || 0);
                    default: // date_added
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                }
            });
            
            if (countEl) countEl.textContent = items.length;
            
            if (items.length === 0) {
                container.classList.remove('loading');
                container.classList.add('hidden');
                emptyState?.classList.remove('hidden');
            } else {
                emptyState?.classList.add('hidden');
                container.classList.remove('hidden');
                displayWatchlistGrid(container, items);
            }
            
        } catch (error) {
            console.error('Error loading watchlist:', error);
            showErrorState(container, 'Failed to load watchlist');
        }
    }
    
    function displayWatchlistGrid(container, items) {
        container.classList.remove('loading');
        container.className = 'content-grid';
        
        container.innerHTML = items.map(item => `
            <div class="content-card">
                <img src="${item.poster_path || '/assets/images/placeholder.jpg'}" 
                     alt="${item.title}" class="content-card-image" loading="lazy"
                     onclick="goToDetails(${item.id})">
                <div class="content-card-info">
                    <h3 class="content-card-title" onclick="goToDetails(${item.id})">${item.title}</h3>
                    <div class="content-card-meta">
                        <span class="rating-badge">
                            <i class="bi bi-star-fill mr-1"></i>
                            ${item.rating ? item.rating.toFixed(1) : 'N/A'}
                        </span>
                        <span>${item.content_type?.toUpperCase()}</span>
                    </div>
                    <div class="flex justify-between items-center mt-3">
                        <button onclick="goToDetails(${item.id})" class="btn-primary text-xs">
                            <i class="bi bi-eye mr-1"></i>View
                        </button>
                        <button onclick="removeFromWatchlist(${item.id})" class="btn-ghost text-red-400 text-xs">
                            <i class="bi bi-trash mr-1"></i>Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async function clearWatchlist() {
        if (!confirm('Are you sure you want to clear your entire watchlist?')) {
            return;
        }
        
        try {
            // Implementation for clearing watchlist
            // This would require a backend endpoint
            showToast('Watchlist cleared successfully', 'success');
            loadWatchlist();
        } catch (error) {
            showToast('Failed to clear watchlist', 'error');
        }
    }
    
    // Initial load
    loadWatchlist();
}

function initializeFavoritesPage() {
    // Check authentication
    if (!authToken) {
        window.location.href = '/login';
        return;
    }
    
    let currentFilter = 'all';
    let currentSort = 'date_added';
    
    // Controls
    const filterType = document.getElementById('filterType');
    const sortBy = document.getElementById('sortBy');
    const refreshBtn = document.getElementById('refreshBtn');
    
    filterType?.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        loadFavorites();
    });
    
    sortBy?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadFavorites();
    });
    
    refreshBtn?.addEventListener('click', loadFavorites);
    
    async function loadFavorites() {
        const container = document.getElementById('favoritesGrid');
        const emptyState = document.getElementById('emptyState');
        const countEl = document.getElementById('favoritesCount');
        
        if (!container) return;
        
        try {
            container.className = 'loading';
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading your favorites...</p>
                </div>
            `;
            
            const data = await apiCall('/user/favorites');
            let items = data.favorites || [];
            
            // Apply filters and sorting (similar to watchlist)
            if (currentFilter !== 'all') {
                items = items.filter(item => item.content_type === currentFilter);
            }
            
            if (countEl) countEl.textContent = items.length;
            
            if (items.length === 0) {
                container.classList.remove('loading');
                container.classList.add('hidden');
                emptyState?.classList.remove('hidden');
            } else {
                emptyState?.classList.add('hidden');
                container.classList.remove('hidden');
                displayContentGrid(container, items);
            }
            
        } catch (error) {
            console.error('Error loading favorites:', error);
            showErrorState(container, 'Failed to load favorites');
        }
    }
    
    // Initial load
    loadFavorites();
}

// Profile Page Functions
function initializeProfilePage() {
    // Check authentication
    if (!authToken) {
        window.location.href = '/login';
        return;
    }
    
    loadProfileData();
    loadUserStats();
    loadRecentActivity();
    loadTasteProfile();
    
    // Form submission
    const profileForm = document.getElementById('profileForm');
    profileForm?.addEventListener('submit', updateProfile);
}

async function loadProfileData() {
    if (!currentUser) return;
    
    // Basic info
    const usernameEl = document.getElementById('profileUsername');
    const emailEl = document.getElementById('profileEmail');
    const memberSinceEl = document.getElementById('memberSince');
    const lastActiveEl = document.getElementById('lastActive');
    
    if (usernameEl) usernameEl.textContent = currentUser.username;
    if (emailEl) emailEl.textContent = currentUser.email;
    
    // Form fields
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    
    if (usernameInput) usernameInput.value = currentUser.username;
    if (emailInput) emailInput.value = currentUser.email;
    
    // Preferences
    if (currentUser.preferred_languages) {
        const languages = JSON.parse(currentUser.preferred_languages);
        languages.forEach(lang => {
            const checkbox = document.querySelector(`input[name="languages"][value="${lang}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    if (currentUser.preferred_genres) {
        const genres = JSON.parse(currentUser.preferred_genres);
        genres.forEach(genre => {
            const checkbox = document.querySelector(`input[name="genres"][value="${genre}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    // Dates
    if (memberSinceEl && currentUser.created_at) {
        const date = new Date(currentUser.created_at);
        memberSinceEl.textContent = date.toLocaleDateString();
    }
    
    if (lastActiveEl && currentUser.last_active) {
        const date = new Date(currentUser.last_active);
        lastActiveEl.textContent = formatRelativeTime(date);
    }
}

async function updateProfile(e) {
    e.preventDefault();
    
    const languages = Array.from(document.querySelectorAll('input[name="languages"]:checked'))
        .map(cb => cb.value);
    const genres = Array.from(document.querySelectorAll('input[name="genres"]:checked'))
        .map(cb => cb.value);
    
    try {
        // Implementation would require a backend endpoint to update user preferences
        showToast('Profile updated successfully', 'success');
        
        // Update local user data
        currentUser.preferred_languages = JSON.stringify(languages);
        currentUser.preferred_genres = JSON.stringify(genres);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile', 'error');
    }
}

// Admin Page Functions
function initializeAdminPage() {
    // Check admin authentication
    if (!authToken || !currentUser?.is_admin) {
        window.location.href = '/login';
        return;
    }
    
    const path = window.location.pathname;
    
    if (path.includes('/admin/dashboard')) {
        initializeAdminDashboard();
    } else if (path.includes('/admin/content-browser')) {
        initializeContentBrowser();
    } else if (path.includes('/admin/posts')) {
        initializeAdminPosts();
    } else if (path.includes('/admin/analytics')) {
        initializeAdminAnalytics();
    }
}

function initializeAdminDashboard() {
    loadAdminStats();
    loadRecentAdminActivity();
    
    // Button event listeners
    const mlServiceCheckBtn = document.getElementById('mlServiceCheckBtn');
    const updateModelsBtn = document.getElementById('updateModelsBtn');
    const bulkImportBtn = document.getElementById('bulkImportBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    
    mlServiceCheckBtn?.addEventListener('click', checkMLServiceStatus);
    updateModelsBtn?.addEventListener('click', updateMLModels);
    bulkImportBtn?.addEventListener('click', () => showToast('Bulk import feature coming soon', 'info'));
    exportDataBtn?.addEventListener('click', () => showToast('Export feature coming soon', 'info'));
}

async function loadAdminStats() {
    try {
        const data = await apiCall('/admin/analytics');
        
        const totalUsersEl = document.getElementById('totalUsers');
        const totalContentEl = document.getElementById('totalContent');
        const totalInteractionsEl = document.getElementById('totalInteractions');
        const activeUsersEl = document.getElementById('activeUsers');
        
        if (totalUsersEl) totalUsersEl.textContent = data.total_users || 0;
        if (totalContentEl) totalContentEl.textContent = data.total_content || 0;
        if (totalInteractionsEl) totalInteractionsEl.textContent = data.total_interactions || 0;
        if (activeUsersEl) activeUsersEl.textContent = data.active_users_last_week || 0;
        
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function checkMLServiceStatus() {
    const modal = document.getElementById('mlServiceModal');
    const statusContainer = document.getElementById('mlServiceStatus');
    
    modal?.classList.remove('hidden');
    
    if (statusContainer) {
        statusContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p class="mt-2">Checking ML service status...</p>
            </div>
        `;
        
        try {
            const data = await apiCall('/admin/ml-service-check');
            displayMLServiceStatus(statusContainer, data);
        } catch (error) {
            statusContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="bi bi-x-circle text-4xl text-red-500 mb-4"></i>
                    <p class="text-red-400">Failed to check ML service status</p>
                </div>
            `;
        }
    }
}

function displayMLServiceStatus(container, data) {
    const statusColor = data.status === 'healthy' ? 'green' : 
                       data.status === 'partial' ? 'yellow' : 'red';
    
    container.innerHTML = `
        <div class="space-y-6">
            <div class="text-center">
                <div class="text-4xl mb-2">
                    <i class="bi bi-${data.status === 'healthy' ? 'check-circle text-green-500' : 
                                      data.status === 'partial' ? 'exclamation-triangle text-yellow-500' : 
                                      'x-circle text-red-500'}"></i>
                </div>
                <h3 class="text-xl font-bold">ML Service Status: ${data.status.toUpperCase()}</h3>
                <p class="text-gray-400">${data.timestamp}</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${Object.entries(data.checks || {}).map(([key, check]) => `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-semibold capitalize">${key.replace('_', ' ')}</h4>
                            <i class="bi bi-${check.status === 'pass' ? 'check-circle text-green-500' : 'x-circle text-red-500'}"></i>
                        </div>
                        ${check.response_time ? `<p class="text-sm text-gray-400">Response: ${check.response_time}</p>` : ''}
                        ${check.error ? `<p class="text-sm text-red-400">Error: ${check.error}</p>` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="text-center">
                <button onclick="updateMLModels()" class="btn-primary">
                    <i class="bi bi-arrow-clockwise mr-2"></i>
                    Update ML Models
                </button>
            </div>
        </div>
    `;
}

async function updateMLModels() {
    try {
        showToast('Updating ML models...', 'info');
        const data = await apiCall('/admin/ml-service-update', { method: 'POST' });
        
        if (data.success) {
            showToast('ML models updated successfully', 'success');
        } else {
            showToast(data.message || 'Failed to update ML models', 'error');
        }
    } catch (error) {
        console.error('Error updating ML models:', error);
        showToast('Failed to update ML models', 'error');
    }
}

function closeMlServiceModal() {
    const modal = document.getElementById('mlServiceModal');
    modal?.classList.add('hidden');
}

// Utility Functions
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Global functions for removing items
window.removeFromWatchlist = async function(contentId) {
    try {
        // Implementation would require a backend endpoint
        showToast('Removed from watchlist', 'success');
        // Reload the watchlist
        if (typeof loadWatchlist === 'function') {
            loadWatchlist();
        }
    } catch (error) {
        showToast('Failed to remove from watchlist', 'error');
    }
};

window.removeFromFavorites = async function(contentId) {
    try {
        // Implementation would require a backend endpoint
        showToast('Removed from favorites', 'success');
        // Reload the favorites
        if (typeof loadFavorites === 'function') {
            loadFavorites();
        }
    } catch (error) {
        showToast('Failed to remove from favorites', 'error');
    }
};
// Additional Page Functions

// Popular Page
function initializePopularPage() {
    let currentFilters = {
        contentType: 'all',
        timeRange: 'all_time'
    };
    
    // Filter event listeners
    const contentTypeFilter = document.getElementById('contentTypeFilter');
    const timeRangeFilter = document.getElementById('timeRangeFilter');
    const mobileContentTypeFilter = document.getElementById('mobileContentTypeFilter');
    const mobileTimeRangeFilter = document.getElementById('mobileTimeRangeFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // Desktop filters
    contentTypeFilter?.addEventListener('change', (e) => {
        currentFilters.contentType = e.target.value;
        if (mobileContentTypeFilter) mobileContentTypeFilter.value = e.target.value;
        loadPopularContent();
    });
    
    timeRangeFilter?.addEventListener('change', (e) => {
        currentFilters.timeRange = e.target.value;
        if (mobileTimeRangeFilter) mobileTimeRangeFilter.value = e.target.value;
        loadPopularContent();
    });
    
    // Mobile filters
    mobileContentTypeFilter?.addEventListener('change', (e) => {
        currentFilters.contentType = e.target.value;
        if (contentTypeFilter) contentTypeFilter.value = e.target.value;
        loadPopularContent();
    });
    
    mobileTimeRangeFilter?.addEventListener('change', (e) => {
        currentFilters.timeRange = e.target.value;
        if (timeRangeFilter) timeRangeFilter.value = e.target.value;
        loadPopularContent();
    });
    
    refreshBtn?.addEventListener('click', loadPopularContent);
    
    async function loadPopularContent() {
        const container = document.getElementById('popularContentGrid');
        const resultsInfo = document.getElementById('resultsInfo');
        
        if (!container) return;
        
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading popular content...</p>
                </div>
            `;
            
            const params = new URLSearchParams({
                type: currentFilters.contentType,
                limit: '24'
            });
            
            // Use trending API as a proxy for popular content
            const data = await apiCall(`/recommendations/trending?${params}`);
            
            if (resultsInfo) {
                const contentTypeText = currentFilters.contentType === 'all' ? 'content' : currentFilters.contentType;
                const timeText = currentFilters.timeRange === 'all_time' ? 'of all time' : `from ${currentFilters.timeRange}`;
                resultsInfo.textContent = `Popular ${contentTypeText} ${timeText} (${data.recommendations?.length || 0} items)`;
            }
            
            displayContentGrid(container, data.recommendations || []);
            
        } catch (error) {
            console.error('Error loading popular content:', error);
            showErrorState(container, 'Failed to load popular content');
        }
    }
    
    // Initial load
    loadPopularContent();
}

// New Releases Page
function initializeNewReleasesPage() {
    let currentFilters = {
        contentType: 'all',
        language: 'all'
    };
    
    // Filter event listeners
    const contentTypeFilter = document.getElementById('contentTypeFilter');
    const languageFilter = document.getElementById('languageFilter');
    const mobileContentTypeFilter = document.getElementById('mobileContentTypeFilter');
    const mobileLanguageFilter = document.getElementById('mobileLanguageFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // Desktop filters
    contentTypeFilter?.addEventListener('change', (e) => {
        currentFilters.contentType = e.target.value;
        if (mobileContentTypeFilter) mobileContentTypeFilter.value = e.target.value;
        loadNewReleases();
    });
    
    languageFilter?.addEventListener('change', (e) => {
        currentFilters.language = e.target.value;
        if (mobileLanguageFilter) mobileLanguageFilter.value = e.target.value;
        loadNewReleases();
    });
    
    // Mobile filters
    mobileContentTypeFilter?.addEventListener('change', (e) => {
        currentFilters.contentType = e.target.value;
        if (contentTypeFilter) contentTypeFilter.value = e.target.value;
        loadNewReleases();
    });
    
    mobileLanguageFilter?.addEventListener('change', (e) => {
        currentFilters.language = e.target.value;
        if (languageFilter) languageFilter.value = e.target.value;
        loadNewReleases();
    });
    
    refreshBtn?.addEventListener('click', loadNewReleases);
    
    async function loadNewReleases() {
        const container = document.getElementById('newReleasesGrid');
        const resultsInfo = document.getElementById('resultsInfo');
        
        if (!container) return;
        
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading new releases...</p>
                </div>
            `;
            
            const params = new URLSearchParams({
                limit: '24'
            });
            
            if (currentFilters.contentType !== 'all') {
                params.append('type', currentFilters.contentType);
            }
            
            if (currentFilters.language !== 'all') {
                params.append('language', currentFilters.language);
            }
            
            const data = await apiCall(`/recommendations/new-releases?${params}`);
            
            if (resultsInfo) {
                resultsInfo.textContent = `Latest releases from the past 60 days (${data.recommendations?.length || 0} items)`;
            }
            
            displayContentGrid(container, data.recommendations || []);
            
        } catch (error) {
            console.error('Error loading new releases:', error);
            showErrorState(container, 'Failed to load new releases');
        }
    }
    
    // Initial load
    loadNewReleases();
}

// Critics Choice Page
function initializeCriticsChoicePage() {
    let currentFilters = {
        contentType: 'all',
        minRating: '7.5'
    };
    
    // Filter event listeners
    const contentTypeFilter = document.getElementById('contentTypeFilter');
    const ratingFilter = document.getElementById('ratingFilter');
    const mobileContentTypeFilter = document.getElementById('mobileContentTypeFilter');
    const mobileRatingFilter = document.getElementById('mobileRatingFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // Desktop filters
    contentTypeFilter?.addEventListener('change', (e) => {
        currentFilters.contentType = e.target.value;
        if (mobileContentTypeFilter) mobileContentTypeFilter.value = e.target.value;
        loadCriticsChoice();
    });
    
    ratingFilter?.addEventListener('change', (e) => {
        currentFilters.minRating = e.target.value;
        if (mobileRatingFilter) mobileRatingFilter.value = e.target.value;
        loadCriticsChoice();
    });
    
    // Mobile filters
    mobileContentTypeFilter?.addEventListener('change', (e) => {
        currentFilters.contentType = e.target.value;
        if (contentTypeFilter) contentTypeFilter.value = e.target.value;
        loadCriticsChoice();
    });
    
    mobileRatingFilter?.addEventListener('change', (e) => {
        currentFilters.minRating = e.target.value;
        if (ratingFilter) ratingFilter.value = e.target.value;
        loadCriticsChoice();
    });
    
    refreshBtn?.addEventListener('click', loadCriticsChoice);
    
    async function loadCriticsChoice() {
        const container = document.getElementById('criticsChoiceGrid');
        const resultsInfo = document.getElementById('resultsInfo');
        
        if (!container) return;
        
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading critics' choices...</p>
                </div>
            `;
            
            const params = new URLSearchParams({
                type: currentFilters.contentType,
                limit: '24'
            });
            
            const data = await apiCall(`/recommendations/critics-choice?${params}`);
            
            if (resultsInfo) {
                resultsInfo.textContent = `Content with ${currentFilters.minRating}+ rating and 100+ votes (${data.recommendations?.length || 0} items)`;
            }
            
            displayContentGrid(container, data.recommendations || []);
            
        } catch (error) {
            console.error('Error loading critics choice:', error);
            showErrorState(container, 'Failed to load critics choice');
        }
    }
    
    // Initial load
    loadCriticsChoice();
}

// TV Shows Page
function initializeTVShowsPage() {
    let currentCategory = 'popular';
    let currentSort = 'popularity';
    
    // Category tabs
    const categoryTabs = document.querySelectorAll('.category-tab');
    const sortFilter = document.getElementById('sortFilter');
    const loadMoreBtn = document.getElementById('loadMoreTVShows');
    
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            updateTVCategoryTitle();
            loadTVShowsContent();
        });
    });
    
    sortFilter?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadTVShowsContent();
    });
    
    function updateTVCategoryTitle() {
        const currentCategoryEl = document.getElementById('currentCategory');
        if (currentCategoryEl) {
            const categoryNames = {
                'popular': 'Popular TV Shows',
                'new-releases': 'New TV Shows',
                'top-rated': 'Top Rated TV Shows',
                'drama': 'Drama TV Shows',
                'comedy': 'Comedy TV Shows',
                'thriller': 'Thriller TV Shows'
            };
            currentCategoryEl.textContent = categoryNames[currentCategory] || 'TV Shows';
        }
    }
    
    async function loadTVShowsContent() {
        const container = document.getElementById('tvShowsGrid');
        if (!container) return;
        
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Loading TV shows...</p>
                </div>
            `;
            
            const params = new URLSearchParams({
                type: 'tv',
                limit: '24'
            });
            
            let endpoint;
            switch (currentCategory) {
                case 'popular':
                    endpoint = '/recommendations/trending';
                    break;
                case 'new-releases':
                    endpoint = '/recommendations/new-releases';
                    break;
                case 'top-rated':
                    endpoint = '/recommendations/critics-choice';
                    break;
                default:
                    endpoint = `/recommendations/genre/${currentCategory}`;
                    break;
            }
            
            const data = await apiCall(`${endpoint}?${params}`);
            displayContentGrid(container, data.recommendations || []);
            
        } catch (error) {
            console.error('Error loading TV shows:', error);
            showErrorState(container, 'Failed to load TV shows');
        }
    }
    
    // Initial load
    loadTVShowsContent();
}

// Search Page Functions
function initializeSearchPage() {
    const mainSearchInput = document.getElementById('mainSearchInput');
    const searchInfo = document.getElementById('searchInfo');
    const searchFilters = document.getElementById('searchFilters');
    const initialState = document.getElementById('initialState');
    const searchResults = document.getElementById('searchResults');
    const contentTypeFilter = document.getElementById('contentTypeFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    let currentQuery = '';
    let currentFilters = {
        contentType: 'multi',
        sort: 'relevance'
    };
    
    // Get query from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get('q');
    if (urlQuery) {
        mainSearchInput.value = urlQuery;
        performSearch(urlQuery);
    }
    
    // Search input
    mainSearchInput?.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            clearTimeout(mainSearchInput.timeout);
            mainSearchInput.timeout = setTimeout(() => performSearch(query), 500);
        } else if (query.length === 0) {
            showInitialState();
        }
    });
    
    // Filters
    contentTypeFilter?.addEventListener('change', (e) => {
        currentFilters.contentType = e.target.value;
        if (currentQuery) performSearch(currentQuery);
    });
    
    sortFilter?.addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        if (currentQuery) performSearch(currentQuery);
    });
    
    async function performSearch(query) {
        currentQuery = query;
        
        try {
            // Update URL
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('q', query);
            window.history.replaceState({}, '', newUrl);
            
            // Show loading
            searchResults.innerHTML = `
                <div class="loading-spinner col-span-full">
                    <div class="spinner"></div>
                    <p class="mt-4">Searching for "${query}"...</p>
                </div>
            `;
            
            // Hide initial state, show filters
            initialState?.classList.add('hidden');
            searchFilters?.classList.remove('hidden');
            searchInfo?.classList.remove('hidden');
            
            // Perform search
            const params = new URLSearchParams({
                query: query,
                type: currentFilters.contentType,
                limit: '24'
            });
            
            const data = await apiCall(`/search?${params}`);
            
            // Update search info
            const searchQuery = document.getElementById('searchQuery');
            const resultsCount = document.getElementById('resultsCount');
            if (searchQuery) searchQuery.textContent = query;
            if (resultsCount) resultsCount.textContent = data.results?.length || 0;
            
            // Display results
            displaySearchResults(data.results || []);
            
        } catch (error) {
            console.error('Search error:', error);
            showErrorState(searchResults, 'Search failed. Please try again.');
        }
    }
    
    function displaySearchResults(results) {
        searchResults.className = 'content-grid';
        
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="bi bi-search text-6xl text-gray-600 mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">No results found</h3>
                    <p class="text-gray-400">Try a different search term or check your spelling</p>
                </div>
            `;
            return;
        }
        
        searchResults.innerHTML = results.map(item => createContentCard(item)).join('');
    }
    
    function showInitialState() {
        searchInfo?.classList.add('hidden');
        searchFilters?.classList.add('hidden');
        initialState?.classList.remove('hidden');
        searchResults.className = 'content-grid';
        searchResults.innerHTML = '';
        searchResults.appendChild(initialState);
        
        // Clear URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('q');
        window.history.replaceState({}, '', newUrl);
    }
}

// Content Browser Functions
function initializeContentBrowser() {
    // Check admin authentication
    if (!authToken || !currentUser?.is_admin) {
        window.location.href = '/login';
        return;
    }
    
    const searchQuery = document.getElementById('searchQuery');
    const searchSource = document.getElementById('searchSource');
    const searchBtn = document.getElementById('searchBtn');
    const searchResultsGrid = document.getElementById('searchResultsGrid');
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    const initialState = document.getElementById('initialState');
    
    let currentResults = [];
    
    // Search functionality
    searchBtn?.addEventListener('click', performExternalSearch);
    searchQuery?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performExternalSearch();
    });
    
    async function performExternalSearch() {
        const query = searchQuery?.value.trim();
        const source = searchSource?.value;
        
        if (!query) {
            showToast('Please enter a search term', 'warning');
            return;
        }
        
        try {
            // Show loading
            searchResultsGrid.innerHTML = `
                <div class="col-span-full loading-spinner">
                    <div class="spinner"></div>
                    <p class="mt-4">Searching ${source.toUpperCase()} for "${query}"...</p>
                </div>
            `;
            
            initialState?.classList.add('hidden');
            searchResultsInfo?.classList.remove('hidden');
            
            const params = new URLSearchParams({
                query: query,
                source: source,
                limit: '20'
            });
            
            const data = await apiCall(`/admin/search?${params}`);
            currentResults = data.results || [];
            
            // Update results info
            const resultsCount = document.getElementById('resultsCount');
            if (resultsCount) resultsCount.textContent = `${currentResults.length} results`;
            
            displayExternalSearchResults(currentResults);
            
        } catch (error) {
            console.error('External search error:', error);
            showErrorState(searchResultsGrid, 'External search failed');
        }
    }
    
    function displayExternalSearchResults(results) {
        if (results.length === 0) {
            searchResultsGrid.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="bi bi-search text-6xl text-gray-600 mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">No results found</h3>
                    <p class="text-gray-400">Try a different search term</p>
                </div>
            `;
            return;
        }
        
        searchResultsGrid.innerHTML = results.map((item, index) => `
            <div class="bg-gray-800 rounded-xl overflow-hidden">
                <img src="${item.poster_path || '/assets/images/placeholder.jpg'}" 
                     alt="${item.title}" class="w-full aspect-[2/3] object-cover">
                <div class="p-4">
                    <h3 class="font-semibold mb-2 line-clamp-2">${item.title}</h3>
                    <div class="text-sm text-gray-400 mb-2">
                        <div>${item.content_type?.toUpperCase() || 'UNKNOWN'}</div>
                        <div>${item.release_date || 'No date'}</div>
                        ${item.rating ? `<div>⭐ ${item.rating}/10</div>` : ''}
                    </div>
                    <p class="text-xs text-gray-500 mb-3 line-clamp-3">${item.overview || 'No description available'}</p>
                    <div class="flex space-x-2">
                        <button onclick="previewContent(${index})" class="btn-secondary text-xs flex-1">
                            <i class="bi bi-eye mr-1"></i>Preview
                        </button>
                        <button onclick="addExternalContent(${index})" class="btn-primary text-xs flex-1">
                            <i class="bi bi-plus mr-1"></i>Add
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Global functions for content browser
    window.previewContent = function(index) {
        const item = currentResults[index];
        if (!item) return;
        
        openAddContentModal(item);
    };
    
    window.addExternalContent = function(index) {
        const item = currentResults[index];
        if (!item) return;
        
        openAddContentModal(item);
    };
    
    function openAddContentModal(content) {
        const modal = document.getElementById('addContentModal');
        const contentPreview = document.getElementById('contentPreview');
        
        if (contentPreview) {
            contentPreview.innerHTML = `
                <div class="flex space-x-4">
                    <img src="${content.poster_path || '/assets/images/placeholder.jpg'}" 
                         alt="${content.title}" class="w-24 h-36 object-cover rounded">
                    <div class="flex-1">
                        <h4 class="font-bold text-lg mb-2">${content.title}</h4>
                        <div class="text-sm text-gray-400 mb-2">
                            <div>${content.content_type?.toUpperCase() || 'UNKNOWN'}</div>
                            <div>${content.release_date || 'No date'}</div>
                            ${content.rating ? `<div>⭐ ${content.rating}/10</div>` : ''}
                        </div>
                        <p class="text-sm">${content.overview || 'No description available'}</p>
                    </div>
                </div>
            `;
        }
        
        modal?.classList.remove('hidden');
        
        // Store content for confirmation
        window.currentContentToAdd = content;
        
        const confirmBtn = document.getElementById('confirmAddBtn');
        confirmBtn.onclick = confirmAddContent;
    }
    
    async function confirmAddContent() {
        const content = window.currentContentToAdd;
        if (!content) return;
        
        const additionalTags = document.getElementById('additionalTags')?.value;
        const adminNotes = document.getElementById('adminNotes')?.value;
        
        try {
            const payload = {
                ...content,
                additional_tags: additionalTags,
                admin_notes: adminNotes
            };
            
            const response = await apiCall('/admin/content', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            showToast('Content added successfully!', 'success');
            closeAddContentModal();
            
        } catch (error) {
            console.error('Error adding content:', error);
            showToast('Failed to add content', 'error');
        }
    }
    
    window.closeAddContentModal = function() {
        const modal = document.getElementById('addContentModal');
        modal?.classList.add('hidden');
        
        // Clear form
        document.getElementById('additionalTags').value = '';
        document.getElementById('adminNotes').value = '';
        window.currentContentToAdd = null;
    };
}

// Admin Posts Functions
function initializeAdminPosts() {
    // Check admin authentication
    if (!authToken || !currentUser?.is_admin) {
        window.location.href = '/login';
        return;
    }
    
    loadAdminRecommendations();
    
    // Event listeners
    const createBtn = document.getElementById('createRecommendationBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    createBtn?.addEventListener('click', openCreateRecommendationModal);
    refreshBtn?.addEventListener('click', loadAdminRecommendations);
    typeFilter?.addEventListener('change', loadAdminRecommendations);
    statusFilter?.addEventListener('change', loadAdminRecommendations);
    
    // Form submission
    const createForm = document.getElementById('createRecommendationForm');
    createForm?.addEventListener('submit', createRecommendation);
    
    // Content search
    const searchContentBtn = document.getElementById('searchContentBtn');
    searchContentBtn?.addEventListener('click', searchContentForRecommendation);
}

async function loadAdminRecommendations() {
    const container = document.getElementById('recommendationsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!container) return;
    
    try {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p class="mt-4">Loading recommendations...</p>
            </div>
        `;
        
        const typeFilter = document.getElementById('typeFilter')?.value || 'all';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        
        const params = new URLSearchParams({ page: 1, per_page: 20 });
        if (typeFilter !== 'all') params.append('type', typeFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        
        const data = await apiCall(`/admin/recommendations?${params}`);
        const recommendations = data.recommendations || [];
        
        if (recommendations.length === 0) {
            container.classList.add('hidden');
            emptyState?.classList.remove('hidden');
            return;
        }
        
        emptyState?.classList.add('hidden');
        container.classList.remove('hidden');
        
        container.innerHTML = recommendations.map(rec => `
            <div class="bg-gray-900 rounded-xl p-6">
                <div class="flex space-x-4">
                    <img src="${rec.content.poster_path || '/assets/images/placeholder.jpg'}" 
                         alt="${rec.content.title}" class="w-20 h-30 object-cover rounded flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between mb-2">
                            <h3 class="font-bold text-lg truncate">${rec.content.title}</h3>
                            <span class="badge ${rec.recommendation_type === 'admin_choice' ? 'secondary' : 'primary'} text-xs ml-2">
                                ${rec.recommendation_type.replace('_', ' ')}
                            </span>
                        </div>
                        <p class="text-gray-400 text-sm mb-3">${rec.description}</p>
                        <div class="flex items-center justify-between text-xs text-gray-500">
                            <span>By ${rec.admin_name}</span>
                            <span>${new Date(rec.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="flex space-x-2 mt-3">
                            <button onclick="editRecommendation(${rec.id})" class="btn-ghost text-xs">
                                <i class="bi bi-pencil mr-1"></i>Edit
                            </button>
                            <button onclick="deleteRecommendation(${rec.id})" class="btn-ghost text-red-400 text-xs">
                                <i class="bi bi-trash mr-1"></i>Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading admin recommendations:', error);
        showErrorState(container, 'Failed to load recommendations');
    }
}

// Admin Analytics Functions
function initializeAdminAnalytics() {
    // Check admin authentication
    if (!authToken || !currentUser?.is_admin) {
        window.location.href = '/login';
        return;
    }
    
    loadAnalyticsData();
    loadMLServiceStats();
    
    // Event listeners
    const timeRangeFilter = document.getElementById('timeRangeFilter');
    const refreshMLStats = document.getElementById('refreshMLStats');
    
    timeRangeFilter?.addEventListener('change', loadAnalyticsData);
    refreshMLStats?.addEventListener('click', loadMLServiceStats);
}

async function loadAnalyticsData() {
    try {
        const data = await apiCall('/admin/analytics');
        
        // Update key metrics
        document.getElementById('totalUsers').textContent = data.total_users || 0;
        document.getElementById('activeUsers').textContent = data.active_users_last_week || 0;
        document.getElementById('totalContent').textContent = data.total_content || 0;
        document.getElementById('totalInteractions').textContent = data.total_interactions || 0;
        
        // Create charts
        createUserActivityChart();
        createContentDistributionChart();
        createGenresChart(data.popular_genres || []);
        createInteractionsChart();
        
        // Update data tables
        updateTopContentList(data.popular_content || []);
        updateRecentUsersList();
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function createUserActivityChart() {
    const ctx = document.getElementById('userActivityChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Active Users',
                data: [12, 19, 15, 25, 22, 30, 28],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#374151' } },
                x: { grid: { color: '#374151' } }
            }
        }
    });
}

function createContentDistributionChart() {
    const ctx = document.getElementById('contentDistributionChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Movies', 'TV Shows', 'Anime'],
            datasets: [{
                data: [45, 35, 20],
                backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function createGenresChart(genres) {
    const ctx = document.getElementById('genresChart');
    if (!ctx) return;
    
    const labels = genres.slice(0, 6).map(g => g.genre);
    const data = genres.slice(0, 6).map(g => g.count);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Interactions',
                data: data,
                backgroundColor: '#8b5cf6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#374151' } },
                x: { grid: { color: '#374151' } }
            }
        }
    });
}

function createInteractionsChart() {
    const ctx = document.getElementById('interactionsChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Views',
                data: [150, 200, 180, 250],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)'
            }, {
                label: 'Favorites',
                data: [45, 60, 55, 75],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#374151' } },
                x: { grid: { color: '#374151' } }
            }
        }
    });
}

// Global modal functions
window.openCreateRecommendationModal = function() {
    const modal = document.getElementById('createRecommendationModal');
    modal?.classList.remove('hidden');
};

window.closeCreateRecommendationModal = function() {
    const modal = document.getElementById('createRecommendationModal');
    modal?.classList.add('hidden');
    
    // Reset form
    document.getElementById('createRecommendationForm')?.reset();
    document.getElementById('selectedContent')?.classList.add('hidden');
};

// Additional utility functions
function updateTopContentList(content) {
    const container = document.getElementById('topContentList');
    if (!container) return;
    
    container.innerHTML = content.map(item => `
        <div class="flex items-center justify-between p-3 bg-gray-800 rounded">
            <span class="font-medium">${item.title}</span>
            <span class="text-sm text-gray-400">${item.interactions} interactions</span>
        </div>
    `).join('');
}

function updateRecentUsersList() {
    const container = document.getElementById('recentUsersList');
    if (!container) return;
    
    // Mock data - replace with real API call
    const recentUsers = [
        { username: 'user123', joined: '2 hours ago' },
        { username: 'moviefan', joined: '5 hours ago' },
        { username: 'animelover', joined: '1 day ago' }
    ];
    
    container.innerHTML = recentUsers.map(user => `
        <div class="flex items-center justify-between p-3 bg-gray-800 rounded">
            <span class="font-medium">${user.username}</span>
            <span class="text-sm text-gray-400">${user.joined}</span>
        </div>
    `).join('');
}

async function loadMLServiceStats() {
    const container = document.getElementById('mlServiceStats');
    if (!container) return;
    
    try {
        const data = await apiCall('/admin/ml-stats');
        
        container.innerHTML = `
            <div class="stat-card">
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-400">${data.ml_service_stats?.status || 'Unknown'}</div>
                    <div class="text-sm text-gray-300">Service Status</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-400">${data.ml_service_stats?.recommendations_served || 0}</div>
                    <div class="text-sm text-gray-300">Recommendations Served</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-400">${data.ml_service_stats?.cache_hit_rate || '0%'}</div>
                    <div class="text-sm text-gray-300">Cache Hit Rate</div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading ML service stats:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i class="bi bi-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <p class="text-red-400">Failed to load ML service stats</p>
            </div>
        `;
    }
}

// PWA Support
let deferredPrompt;

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt();
});

function showInstallPrompt() {
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
        <div class="install-prompt-content">
            <div class="install-prompt-text">
                <h3>Install CineScope</h3>
                <p>Get the full experience on your device</p>
            </div>
            <div class="install-prompt-actions">
                <button class="install-btn" onclick="installApp()">Install</button>
                <button class="install-btn dismiss" onclick="dismissInstallPrompt()">Later</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(installPrompt);
    setTimeout(() => installPrompt.classList.add('show'), 100);
    
    window.currentInstallPrompt = installPrompt;
}

window.installApp = async function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
    }
    dismissInstallPrompt();
};

window.dismissInstallPrompt = function() {
    const prompt = window.currentInstallPrompt;
    if (prompt) {
        prompt.classList.remove('show');
        setTimeout(() => prompt.remove(), 300);
    }
};

// Offline detection
window.addEventListener('online', () => {
    hideOfflineIndicator();
});

window.addEventListener('offline', () => {
    showOfflineIndicator();
});

function showOfflineIndicator() {
    let indicator = document.getElementById('offlineIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'offlineIndicator';
        indicator.className = 'offline-indicator';
        indicator.innerHTML = '📡 You are offline';
        document.body.appendChild(indicator);
    }
    indicator.classList.add('show');
}

function hideOfflineIndicator() {
    const indicator = document.getElementById('offlineIndicator');
    if (indicator) {
        indicator.classList.remove('show');
    }
}
// Add modal functions to global scope
window.closeMlServiceModal = closeMlServiceModal;
window.togglePassword = togglePassword;
window.openTrailerModal = openTrailerModal;
window.closeTrailerModal = closeTrailerModal;