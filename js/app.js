// Main Application Logic
let currentUser = null;
let currentTab = 'forYou';
let contentPage = 1;
let isLoading = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadInitialContent();
    setupEventListeners();
});

// Initialize Application
function initializeApp() {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (token) {
        validateToken();
    } else {
        updateAuthUI(false);
    }
    
    // Load theme preference
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('themeIcon').classList.replace('fa-moon', 'fa-sun');
    }
    
    // Setup scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Setup intersection observer for lazy loading
    setupLazyLoading();
}

// Load Initial Content
async function loadInitialContent() {
    try {
        // Load trending content
        const trending = await api.getTrending();
        displayTrendingContent(trending);
        
        // Load categories
        displayCategories();
        
        // Load recommendations
        if (currentUser) {
            const recommendations = await api.getPersonalizedRecommendations();
            displayRecommendations(recommendations);
        } else {
            const homepage = await api.getHomepageRecommendations();
            displayHomepageContent(homepage);
        }
    } catch (error) {
        console.error('Error loading content:', error);
        showToast('Failed to load content', 'error');
    }
}

// Display Trending Content
function displayTrendingContent(data) {
    const container = document.getElementById('trendingContainer');
    container.innerHTML = '';
    
    if (!data || !data.results) {
        container.innerHTML = '<p class="text-center">No trending content available</p>';
        return;
    }
    
    data.results.slice(0, 10).forEach(item => {
        const card = createContentCard(item);
        container.appendChild(card);
    });
}

// Display Categories
function displayCategories() {
    const categories = [
        { name: 'Action', icon: '💥', color: 'from-red-500 to-orange-500' },
        { name: 'Comedy', icon: '😂', color: 'from-yellow-400 to-yellow-600' },
        { name: 'Drama', icon: '🎭', color: 'from-purple-500 to-pink-500' },
        { name: 'Horror', icon: '👻', color: 'from-gray-700 to-gray-900' },
        { name: 'Sci-Fi', icon: '🚀', color: 'from-blue-500 to-indigo-500' },
        { name: 'Romance', icon: '💕', color: 'from-pink-400 to-red-400' },
        { name: 'Thriller', icon: '🔍', color: 'from-green-600 to-teal-600' },
        { name: 'Animation', icon: '🎨', color: 'from-indigo-400 to-purple-500' }
    ];
    
    const container = document.getElementById('categoriesGrid');
    container.innerHTML = '';
    
    categories.forEach(category => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-3';
        col.innerHTML = `
            <div class="category-card bg-gradient-to-br ${category.color}" onclick="filterByGenre('${category.name}')">
                <div class="category-icon">${category.icon}</div>
                <h3>${category.name}</h3>
            </div>
        `;
        container.appendChild(col);
    });
}

// Display Homepage Content
function displayHomepageContent(data) {
    const container = document.getElementById('contentGrid');
    container.innerHTML = '';
    
    // Display different sections
    if (data.trending && data.trending.length > 0) {
        displayContentSection(data.trending.slice(0, 12), container);
    }
}

// Display Recommendations
function displayRecommendations(data) {
    const container = document.getElementById('contentGrid');
    container.innerHTML = '';
    
    if (!data || !data.recommendations || data.recommendations.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-gray-400">No recommendations available yet. Start watching to get personalized suggestions!</p>
            </div>
        `;
        return;
    }
    
    data.recommendations.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-3 col-lg-2';
        col.appendChild(createContentCard(item));
        container.appendChild(col);
    });
}

// Display Content Section
function displayContentSection(items, container) {
    items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-3 col-lg-2';
        col.appendChild(createContentCard(item));
        container.appendChild(col);
    });
}

// Create Content Card
function createContentCard(item) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.innerHTML = `
        <img src="${item.poster_path || '/images/placeholder.jpg'}" 
             alt="${item.title || item.name}" 
             loading="lazy"
             onerror="this.src='/images/placeholder.jpg'">
        <div class="content-info">
            <h3 class="content-title">${item.title || item.name}</h3>
            <div class="content-meta">
                <span>${item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}</span>
                <div class="rating">
                    <i class="fas fa-star"></i>
                    <span>${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
    
    card.onclick = () => showContentDetails(item.id);
    return card;
}

// Show Content Details
async function showContentDetails(contentId) {
    try {
        const details = await api.getContentDetails(contentId);
        showContentModal(details);
    } catch (error) {
        console.error('Error loading content details:', error);
        showToast('Failed to load details', 'error');
    }
}

// Show Content Modal
function showContentModal(content) {
    const modal = document.getElementById('contentModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="content-details">
            <div class="row">
                <div class="col-12 col-md-4">
                    <img src="${content.poster_path || '/images/placeholder.jpg'}" 
                         alt="${content.title}" 
                         class="img-fluid rounded">
                </div>
                <div class="col-12 col-md-8">
                    <h2>${content.title}</h2>
                    <div class="content-meta mb-3">
                        <span class="badge bg-primary">${content.content_type}</span>
                        ${content.genres ? content.genres.map(g => `<span class="badge bg-secondary">${g}</span>`).join(' ') : ''}
                    </div>
                    <p>${content.description || 'No description available'}</p>
                    <div class="content-stats">
                        <div class="stat">
                            <i class="fas fa-star text-warning"></i>
                            <span>${content.tmdb_rating || 'N/A'}/10</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-calendar"></i>
                            <span>${content.release_date || 'N/A'}</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-clock"></i>
                            <span>${content.runtime || 'N/A'} min</span>
                        </div>
                    </div>
                    <div class="content-actions mt-4">
                        ${currentUser ? `
                            <button class="btn-primary" onclick="addToWatchlist(${content.id})">
                                <i class="fas fa-plus"></i> Watchlist
                            </button>
                            <button class="btn-secondary" onclick="addToFavorites(${content.id})">
                                <i class="fas fa-heart"></i> Favorite
                            </button>
                            <button class="btn-secondary" onclick="rateContent(${content.id})">
                                <i class="fas fa-star"></i> Rate
                            </button>
                        ` : `
                            <button class="btn-primary" onclick="showSignupModal()">
                                Sign in to save
                            </button>
                        `}
                    </div>
                </div>
            </div>
            ${content.trailer_url ? `
                <div class="trailer-section mt-4">
                    <h3>Trailer</h3>
                    <div class="video-container">
                        <iframe src="${content.trailer_url}" 
                                frameborder="0" 
                                allowfullscreen></iframe>
                    </div>
                </div>
            ` : ''}
            ${content.similar_content && content.similar_content.length > 0 ? `
                <div class="similar-section mt-4">
                    <h3>Similar Content</h3>
                    <div class="row g-3">
                        ${content.similar_content.slice(0, 6).map(item => `
                            <div class="col-6 col-md-2">
                                ${createContentCard(item).outerHTML}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.add('show');
    document.body.classList.add('no-scroll');
}

// Close Modal
function closeModal() {
    const modal = document.getElementById('contentModal');
    modal.classList.remove('show');
    document.body.classList.remove('no-scroll');
}

// Tab Switching
function switchTab(tab) {
    currentTab = tab;
    contentPage = 1;
    
    // Update active tab
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === tab) {
            link.classList.add('active');
        }
    });
    
    // Load content for tab
    loadTabContent(tab);
}

// Load Tab Content
async function loadTabContent(tab) {
    const container = document.getElementById('contentGrid');
    container.innerHTML = '<div class="col-12 text-center"><i class="fas fa-spinner fa-spin fa-3x"></i></div>';
    
    try {
        let data;
        switch (tab) {
            case 'forYou':
                data = currentUser ? 
                    await api.getPersonalizedRecommendations() : 
                    await api.getHomepageRecommendations();
                break;
            case 'popular':
                data = await api.getPopular();
                break;
            case 'topRated':
                data = await api.getTopRated();
                break;
            case 'newReleases':
                data = await api.getNewReleases();
                break;
        }
        
        container.innerHTML = '';
        if (data && data.results) {
            displayContentSection(data.results, container);
        }
    } catch (error) {
        console.error('Error loading tab content:', error);
        container.innerHTML = '<div class="col-12 text-center"><p>Failed to load content</p></div>';
    }
}

// Load More Content
async function loadMoreContent() {
    if (isLoading) return;
    
    isLoading = true;
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.classList.remove('hidden');
    
    try {
        contentPage++;
        const data = await api.getContentPage(currentTab, contentPage);
        
        if (data && data.results) {
            const container = document.getElementById('contentGrid');
            displayContentSection(data.results, container);
        }
        
        if (!data || !data.results || data.results.length === 0) {
            document.getElementById('loadMoreBtn').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading more content:', error);
        showToast('Failed to load more content', 'error');
    } finally {
        isLoading = false;
        loadingSpinner.classList.add('hidden');
    }
}

// Search Functionality
async function performSearch() {
    const query = document.getElementById('searchInput').value || 
                  document.getElementById('mobileSearchInput').value;
    
    if (!query.trim()) return;
    
    try {
        const results = await api.search(query);
        displaySearchResults(results);
    } catch (error) {
        console.error('Error performing search:', error);
        showToast('Search failed', 'error');
    }
}

// Display Search Results
function displaySearchResults(results) {
    const container = document.getElementById('contentGrid');
    container.innerHTML = '';
    
    if (!results || results.results.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><p>No results found</p></div>';
        return;
    }
    
    displayContentSection(results.results, container);
    
    // Scroll to results
    document.getElementById('recommendationsSection').scrollIntoView({ behavior: 'smooth' });
}

// User Interactions
async function addToWatchlist(contentId) {
    if (!currentUser) {
        showSignupModal();
        return;
    }
    
    try {
        await api.addToWatchlist(contentId);
        showToast('Added to watchlist', 'success');
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        showToast('Failed to add to watchlist', 'error');
    }
}

async function addToFavorites(contentId) {
    if (!currentUser) {
        showSignupModal();
        return;
    }
    
    try {
        await api.addToFavorites(contentId);
        showToast('Added to favorites', 'success');
    } catch (error) {
        console.error('Error adding to favorites:', error);
        showToast('Failed to add to favorites', 'error');
    }
}

async function rateContent(contentId) {
    if (!currentUser) {
        showSignupModal();
        return;
    }
    
    const rating = prompt('Rate this content (1-10):');
    if (!rating || isNaN(rating) || rating < 1 || rating > 10) {
        showToast('Invalid rating', 'error');
        return;
    }
    
    try {
        await api.rateContent(contentId, parseFloat(rating));
        showToast('Rating submitted', 'success');
    } catch (error) {
        console.error('Error rating content:', error);
        showToast('Failed to submit rating', 'error');
    }
}

// Filter Functions
async function filterByGenre(genre) {
    try {
        const results = await api.getByGenre(genre);
        displaySearchResults(results);
    } catch (error) {
        console.error('Error filtering by genre:', error);
        showToast('Failed to filter content', 'error');
    }
}

async function filterByRegion(region) {
    try {
        const results = await api.getRegionalContent(region);
        displaySearchResults(results);
    } catch (error) {
        console.error('Error filtering by region:', error);
        showToast('Failed to filter content', 'error');
    }
}

// Slider Navigation
function slide(sliderId, direction) {
    const container = document.getElementById(`${sliderId}Container`);
    const scrollAmount = 220; // Card width + gap
    
    if (direction === 'prev') {
        container.scrollLeft -= scrollAmount;
    } else {
        container.scrollLeft += scrollAmount;
    }
}

// Theme Toggle
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.add('light-theme');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'light');
    }
}

// Mobile Search Toggle
function toggleMobileSearch() {
    const mobileSearch = document.getElementById('mobileSearch');
    mobileSearch.classList.toggle('hidden');
    
    if (!mobileSearch.classList.contains('hidden')) {
        document.getElementById('mobileSearchInput').focus();
    }
}

// Scroll Handling
function handleScroll() {
    const navbar = document.getElementById('navbar');
    
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

// Scroll to Recommendations
function scrollToRecommendations() {
    document.getElementById('recommendationsSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Newsletter Subscription
function subscribeNewsletter(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    
    // Simulate subscription
    showToast('Successfully subscribed!', 'success');
    event.target.reset();
}

// Setup Event Listeners
function setupEventListeners() {
    // Search on Enter key
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    document.getElementById('mobileSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
            toggleMobileSearch();
        }
    });
    
    // Close modals on click outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            if (e.target.id === 'contentModal') {
                closeModal();
            } else if (e.target.id === 'authModal') {
                closeAuthModal();
            }
        }
    });
    
    // Handle back button for modals
    window.addEventListener('popstate', () => {
        closeModal();
        closeAuthModal();
    });
}

// Lazy Loading Setup
function setupLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.add('fade-in');
                observer.unobserve(img);
            }
        });
    });
    
    // Observe all images
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Show Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Export functions for use in other modules
window.app = {
    showToast,
    showContentDetails,
    loadInitialContent,
    currentUser,
    setCurrentUser: (user) => { currentUser = user; }
};