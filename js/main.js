// Global Configuration
const CONFIG = {
    API_BASE: 'https://backend-app-970m.onrender.com/api',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',
    DEFAULT_POSTER: '/assets/images/no-poster.jpg',
    ITEMS_PER_PAGE: 20,
    CAROUSEL_SCROLL_AMOUNT: 3,
    DEBOUNCE_DELAY: 300,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

// State Management
const AppState = {
    user: null,
    token: null,
    searchQuery: '',
    currentPage: 'home',
    cache: new Map(),
    isLoading: false,
    selectedLanguage: 'hindi',
    watchlist: [],
    favorites: []
};

// Cache Management
class CacheManager {
    static set(key, data, duration = CONFIG.CACHE_DURATION) {
        const expiry = Date.now() + duration;
        AppState.cache.set(key, { data, expiry });
    }

    static get(key) {
        const cached = AppState.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() > cached.expiry) {
            AppState.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    static clear() {
        AppState.cache.clear();
    }
}

// API Service
class APIService {
    static async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (AppState.token) {
            headers['Authorization'] = `Bearer ${AppState.token}`;
        }

        try {
            showLoader();
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleLogout();
                    throw new Error('Unauthorized');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error:', error);
            showNotification('error', 'Something went wrong. Please try again.');
            throw error;
        } finally {
            hideLoader();
        }
    }

    static async get(endpoint, useCache = true) {
        if (useCache) {
            const cached = CacheManager.get(endpoint);
            if (cached) return cached;
        }

        const data = await this.request(endpoint);
        if (useCache) {
            CacheManager.set(endpoint, data);
        }
        return data;
    }

    static async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// Authentication
async function login(username, password) {
    try {
        const response = await APIService.post('/login', { username, password });
        
        if (response.token) {
            AppState.token = response.token;
            AppState.user = response.user;
            
            // Store in sessionStorage for persistence
            sessionStorage.setItem('token', response.token);
            sessionStorage.setItem('user', JSON.stringify(response.user));
            
            showNotification('success', `Welcome back, ${response.user.username}!`);
            
            // Redirect based on user role
            if (response.user.is_admin) {
                window.location.href = '/admin/dashboard';
            } else {
                window.location.href = '/dashboard';
            }
        }
    } catch (error) {
        showNotification('error', 'Invalid credentials. Please try again.');
    }
}

async function register(userData) {
    try {
        const response = await APIService.post('/register', userData);
        
        if (response.token) {
            AppState.token = response.token;
            AppState.user = response.user;
            
            sessionStorage.setItem('token', response.token);
            sessionStorage.setItem('user', JSON.stringify(response.user));
            
            showNotification('success', 'Registration successful! Welcome to CineScope!');
            window.location.href = '/dashboard';
        }
    } catch (error) {
        showNotification('error', 'Registration failed. Please try again.');
    }
}

function handleLogout() {
    AppState.token = null;
    AppState.user = null;
    sessionStorage.clear();
    window.location.href = '/';
}

// Content Loading Functions
async function loadHomepageContent() {
    try {
        // Load all sections in parallel
        await Promise.all([
            loadTrending(),
            loadNewReleases(),
            loadCriticsChoice(),
            loadRegionalContent('hindi'),
            loadAnime(),
            loadHeroSlider()
        ]);
    } catch (error) {
        console.error('Error loading homepage:', error);
    }
}

async function loadTrending() {
    try {
        const data = await APIService.get('/recommendations/trending?limit=20');
        renderCarousel('trendingTrack', data.recommendations);
    } catch (error) {
        console.error('Error loading trending:', error);
    }
}

async function loadNewReleases() {
    try {
        const data = await APIService.get('/recommendations/new-releases?limit=20');
        renderCarousel('newReleasesTrack', data.recommendations);
    } catch (error) {
        console.error('Error loading new releases:', error);
    }
}

async function loadCriticsChoice() {
    try {
        const data = await APIService.get('/recommendations/critics-choice?limit=20');
        renderCarousel('criticsChoiceTrack', data.recommendations);
    } catch (error) {
        console.error('Error loading critics choice:', error);
    }
}

async function loadRegionalContent(language) {
    try {
        AppState.selectedLanguage = language;
        const data = await APIService.get(`/recommendations/regional/${language}?limit=20`);
        renderCarousel('regionalTrack', data.recommendations);
        
        // Update active tab
        document.querySelectorAll('.regional-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.toLowerCase() === language) {
                tab.classList.add('active');
            }
        });
    } catch (error) {
        console.error('Error loading regional content:', error);
    }
}

async function loadAnime() {
    try {
        const data = await APIService.get('/recommendations/anime?limit=20');
        renderCarousel('animeTrack', data.recommendations);
    } catch (error) {
        console.error('Error loading anime:', error);
    }
}

async function loadHeroSlider() {
    try {
        const data = await APIService.get('/recommendations/trending?limit=5');
        const heroSlider = document.getElementById('heroSlider');
        
        heroSlider.innerHTML = data.recommendations.map((item, index) => `
            <div class="hero-slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
                <img src="${getImageUrl(item.backdrop_path || item.poster_path, 'original')}" 
                     alt="${item.title}" class="hero-backdrop">
                <div class="hero-content">
                    <h1 class="hero-title">${item.title}</h1>
                    <div class="hero-meta">
                        <span class="hero-rating">
                            <i class="fas fa-star"></i> ${item.rating ? item.rating.toFixed(1) : 'N/A'}
                        </span>
                        <span>${item.content_type}</span>
                        <span>${item.genres ? item.genres.slice(0, 3).join(' • ') : ''}</span>
                    </div>
                    <p class="hero-description">${item.overview || ''}</p>
                    <div class="hero-buttons">
                        <button class="btn btn-primary" onclick="viewDetails(${item.id})">
                            <i class="fas fa-play"></i> Watch Now
                        </button>
                        <button class="btn btn-secondary" onclick="viewDetails(${item.id})">
                            <i class="fas fa-info-circle"></i> More Info
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Start auto-slide
        if (data.recommendations.length > 1) {
            startHeroSlider();
        }
    } catch (error) {
        console.error('Error loading hero slider:', error);
    }
}

// Hero Slider Functions
let heroSliderInterval;
let currentSlide = 0;

function startHeroSlider() {
    heroSliderInterval = setInterval(() => {
        const slides = document.querySelectorAll('.hero-slide');
        if (slides.length <= 1) return;
        
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
}

// Content Rendering
function renderCarousel(trackId, items) {
    const track = document.getElementById(trackId);
    
    if (!items || items.length === 0) {
        track.innerHTML = '<p class="text-gray-500">No content available</p>';
        return;
    }
    
    track.innerHTML = items.map(item => createContentCard(item)).join('');
    
    // Add lazy loading for images
    lazyLoadImages(track);
}

function createContentCard(item) {
    const posterUrl = getImageUrl(item.poster_path, 'w300');
    const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
    
    return `
        <div class="content-card" onclick="viewDetails(${item.id})">
            <div class="card-poster">
                <img data-src="${posterUrl}" 
                     src="${CONFIG.DEFAULT_POSTER}" 
                     alt="${item.title}"
                     class="lazy-image">
                ${item.is_new_release ? '<span class="card-badge">New</span>' : ''}
                ${item.is_trending ? '<span class="card-badge">Trending</span>' : ''}
                ${item.is_critics_choice ? '<span class="card-badge">Critics Choice</span>' : ''}
            </div>
            <div class="card-overlay">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-meta">
                    <span class="card-rating">
                        <i class="fas fa-star"></i> ${rating}
                    </span>
                    <span>${item.content_type}</span>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn" onclick="toggleWatchlist(${item.id}, event)">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="card-action-btn" onclick="playTrailer('${item.youtube_trailer}', event)">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Carousel Navigation
function scrollCarousel(carouselId, direction) {
    const track = document.getElementById(carouselId).querySelector('.carousel-track');
    const cardWidth = 220; // card width + gap
    const scrollAmount = cardWidth * CONFIG.CAROUSEL_SCROLL_AMOUNT;
    
    if (direction === 'prev') {
        track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

// Search Functionality
let searchDebounceTimeout;

async function handleSearch(query) {
    clearTimeout(searchDebounceTimeout);
    
    if (!query || query.trim().length < 2) {
        hideSuggestions();
        return;
    }
    
    searchDebounceTimeout = setTimeout(async () => {
        try {
            const data = await APIService.get(`/search?query=${encodeURIComponent(query)}&type=multi`);
            showSuggestions(data.results);
        } catch (error) {
            console.error('Search error:', error);
        }
    }, CONFIG.DEBOUNCE_DELAY);
}

function showSuggestions(results) {
    const suggestionsContainer = document.querySelector('.search-suggestions');
    
    if (!results || results.length === 0) {
        suggestionsContainer.innerHTML = '<div class="suggestion-item">No results found</div>';
    } else {
        suggestionsContainer.innerHTML = results.slice(0, 5).map(item => `
            <div class="suggestion-item" onclick="viewDetails(${item.id})">
                <img src="${getImageUrl(item.poster_path, 'w92')}" 
                     alt="${item.title}" 
                     class="suggestion-poster">
                <div>
                    <div class="font-semibold">${item.title}</div>
                    <div class="text-sm text-gray-500">${item.content_type} • ${item.rating || 'N/A'}</div>
                </div>
            </div>
        `).join('');
    }
    
    suggestionsContainer.classList.add('active');
}

function hideSuggestions() {
    const suggestionsContainer = document.querySelector('.search-suggestions');
    suggestionsContainer.classList.remove('active');
}

// Navigation Functions
function viewDetails(contentId) {
    // Store content ID for details page
    sessionStorage.setItem('selectedContentId', contentId);
    window.location.href = `/details?id=${contentId}`;
}

function toggleWatchlist(contentId, event) {
    event.stopPropagation();
    
    if (!AppState.user) {
        showNotification('info', 'Please login to add to watchlist');
        window.location.href = '/login';
        return;
    }
    
    // Add to watchlist logic
    addToWatchlist(contentId);
}

async function addToWatchlist(contentId) {
    try {
        await APIService.post('/interactions', {
            content_id: contentId,
            interaction_type: 'watchlist'
        });
        
        showNotification('success', 'Added to watchlist');
        
        // Update UI
        const button = event.target.closest('.card-action-btn');
        button.innerHTML = '<i class="fas fa-check"></i>';
    } catch (error) {
        console.error('Error adding to watchlist:', error);
    }
}

function playTrailer(trailerUrl, event) {
    event.stopPropagation();
    
    if (!trailerUrl) {
        showNotification('info', 'Trailer not available');
        return;
    }
    
    // Open trailer in modal or new tab
    window.open(trailerUrl, '_blank');
}

// Utility Functions
function getImageUrl(path, size = 'w500') {
    if (!path) return CONFIG.DEFAULT_POSTER;
    if (path.startsWith('http')) return path;
    return `${CONFIG.TMDB_IMAGE_BASE}/${size}${path}`;
}

function showLoader() {
    AppState.isLoading = true;
    // Show your loader UI
}

function hideLoader() {
    AppState.isLoading = false;
    // Hide your loader UI
}

function showNotification(type, message) {
    // Create and show notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Lazy Loading
function lazyLoadImages(container) {
    const images = container.querySelectorAll('.lazy-image');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy-image');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Header Scroll Effect
function handleHeaderScroll() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// Initialize App
async function initializeApp() {
    // Check for saved auth
    const savedToken = sessionStorage.getItem('token');
    const savedUser = sessionStorage.getItem('user');
    
    if (savedToken && savedUser) {
        AppState.token = savedToken;
        AppState.user = JSON.parse(savedUser);
    }
    
    // Load header and footer
    await loadIncludes();
    
    // Setup event listeners
    setupEventListeners();
    
    // Hide preloader
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        preloader.classList.add('fade-out');
        setTimeout(() => preloader.remove(), 500);
    }, 1000);
}

// Event Listeners
function setupEventListeners() {
    // Header scroll
    window.addEventListener('scroll', handleHeaderScroll);
    
    // Search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.length >= 2) {
                document.querySelector('.search-suggestions').classList.add('active');
            }
        });
    }
    
    // Click outside to close search suggestions
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSuggestions();
        }
    });
    
    // Prevent card action bubbling
    document.addEventListener('click', (e) => {
        if (e.target.closest('.card-action-btn')) {
            e.stopPropagation();
        }
    });
}

// Export functions for global use
window.scrollCarousel = scrollCarousel;
window.viewDetails = viewDetails;
window.toggleWatchlist = toggleWatchlist;
window.playTrailer = playTrailer;
window.loadRegionalContent = loadRegionalContent;
window.handleSearch = handleSearch;
