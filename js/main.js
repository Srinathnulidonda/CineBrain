// /js/main.js

const API_BASE = 'https://backend-app-970m.onrender.com/api'; // Use your actual backend URL

// --- Utility Functions ---

/**
 * Shows the preloader.
 */
function showPreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.remove('hidden');
}

/**
 * Hides the preloader.
 */
function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.add('hidden');
}

/**
 * Fetches data from the API with error handling and auth header.
 * @param {string} endpoint - The API endpoint (e.g., '/recommendations/trending').
 * @param {object} options - Optional fetch options (method, body, etc.).
 * @returns {Promise<object|null>} The parsed JSON response or null on error.
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (authToken) {
        defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {}),
        },
    };

    try {
        showPreloader();
        const response = await fetch(url, config);
        hidePreloader();

        if (!response.ok) {
            if (response.status === 401) {
                console.warn("Unauthorized access, clearing auth.");
                clearAuth(); // Clear token if unauthorized
                window.location.href = '/login'; // Redirect to login
                return null;
            }
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        hidePreloader();
        console.error(`Error fetching ${url}:`, error);
        alert(`An error occurred: ${error.message}`);
        return null;
    }
}

/**
 * Creates a content card element.
 * @param {object} item - The content item data.
 * @returns {HTMLElement} The card element.
 */
function createContentCard(item) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-content-id', item.id);
    card.setAttribute('data-content-type', item.content_type);

    const placeholder = document.createElement('div');
    placeholder.className = 'card-placeholder';

    const img = document.createElement('img');
    img.className = 'card-img loading';
    img.alt = item.title;
    img.loading = 'lazy'; // Enable lazy loading
    img.src = item.poster_path || './assets/images/placeholder-poster.jpg'; // Fallback

    // Simulate image load for placeholder effect
    img.onload = function () {
        img.classList.remove('loading');
        img.classList.add('loaded');
        if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
    };
    img.onerror = function () {
        img.src = './assets/images/placeholder-poster.jpg'; // Final fallback
        img.classList.remove('loading');
        img.classList.add('loaded');
        if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
    };

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = item.title;

    card.appendChild(placeholder);
    card.appendChild(img);
    card.appendChild(title);

    // Add click listener to navigate to details
    card.addEventListener('click', () => {
        const params = new URLSearchParams({ id: item.id });
        window.location.href = `/details?${params.toString()}`;
    });

    return card;
}

/**
 * Populates a container with content cards.
 * @param {string} containerId - The ID of the container element.
 * @param {Array} items - Array of content item objects.
 */
function populateContent(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // Clear previous content

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="text-gray-500 p-4">No content found.</p>';
        return;
    }

    items.forEach(item => {
        const card = createContentCard(item);
        container.appendChild(card);
    });
}

// --- Page-Specific Logic ---

/**
 * Initializes the homepage.
 */
async function initHomepage() {
    console.log("Initializing Homepage...");
    // Hero Section - Use a popular/new release for hero
    const trendingData = await apiFetch('/recommendations/trending?limit=1');
    if (trendingData && trendingData.recommendations.length > 0) {
        const heroItem = trendingData.recommendations[0];
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${heroItem.backdrop_path})`;
            document.querySelector('.hero-title').textContent = heroItem.title;
            document.querySelector('.hero-description').textContent = heroItem.overview?.substring(0, 150) + '...';
            const heroButton = document.querySelector('.hero-button');
            if (heroButton) {
                 heroButton.onclick = () => {
                     const params = new URLSearchParams({ id: heroItem.id });
                     window.location.href = `/details?${params.toString()}`;
                 };
            }
        }
    }

    // Load Carousels
    const carousels = [
        { id: 'trending-carousel', endpoint: '/recommendations/trending?limit=10', title: 'Trending Now' },
        { id: 'new-releases-carousel', endpoint: '/recommendations/new-releases?limit=10', title: 'New Releases' },
        { id: 'critics-choice-carousel', endpoint: '/recommendations/critics-choice?limit=10', title: 'Critics\' Choice' },
        { id: 'action-carousel', endpoint: '/recommendations/genre/action?limit=10', title: 'Action Movies' },
        { id: 'comedy-carousel', endpoint: '/recommendations/genre/comedy?limit=10', title: 'Comedy Hits' },
        { id: 'anime-carousel', endpoint: '/recommendations/anime?limit=10', title: 'Popular Anime' },
    ];

    for (const carousel of carousels) {
        const data = await apiFetch(carousel.endpoint);
        if (data && data.recommendations) {
            populateContent(carousel.id, data.recommendations);
            // Update carousel title if needed (assuming a sibling h2 or similar)
            const titleElement = document.querySelector(`#${carousel.id}`).previousElementSibling?.querySelector('.carousel-title');
            if(titleElement) titleElement.textContent = carousel.title;
        }
    }
}

/**
 * Initializes the details page.
 */
async function initDetailsPage() {
    console.log("Initializing Details Page...");
    const urlParams = new URLSearchParams(window.location.search);
    const contentId = urlParams.get('id');

    if (!contentId) {
        document.getElementById('detail-content-placeholder').innerHTML = '<p class="text-red-500">Content ID not provided.</p>';
        return;
    }

    const data = await apiFetch(`/content/${contentId}`);
    if (!data) {
        document.getElementById('detail-content-placeholder').innerHTML = '<p class="text-red-500">Failed to load content details.</p>';
        return;
    }

    // Populate Details
    const backdropElement = document.querySelector('.detail-backdrop');
    if(backdropElement && data.backdrop_path) {
        backdropElement.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path})`;
    }

    document.querySelector('.detail-title').textContent = data.title;
    document.querySelector('.detail-meta').innerHTML = `
        <span>⭐ ${data.rating || 'N/A'}</span>
        <span>${data.release_date ? new Date(data.release_date).getFullYear() : 'N/A'}</span>
        <span>${data.runtime ? `${data.runtime} min` : ''}</span>
        <span>${data.genres ? data.genres.join(', ') : 'N/A'}</span>
    `;
    document.querySelector('.detail-overview').textContent = data.overview;

    const posterImg = document.querySelector('.detail-poster');
    if(posterImg) {
        posterImg.src = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : './assets/images/placeholder-poster.jpg';
        posterImg.alt = data.title;
    }

    // Populate Cast & Crew (basic)
    const castContainer = document.getElementById('cast-list');
    if (castContainer && data.cast) {
        castContainer.innerHTML = data.cast.slice(0, 10).map(person =>
            `<div class="mb-2"><span class="font-medium">${person.name}</span> as ${person.character || person.role || 'N/A'}</div>`
        ).join('');
    }

    // Populate Similar Content Carousel
    const similarData = await apiFetch(`/recommendations/similar/${contentId}?limit=10`);
    if (similarData && similarData.recommendations) {
        populateContent('similar-content', similarData.recommendations);
    }

    // Populate Trailer (if available)
    const trailerContainer = document.getElementById('trailer-container');
    if (trailerContainer && data.youtube_trailer) {
        trailerContainer.innerHTML = `
            <iframe class="w-full aspect-video rounded-lg" src="https://www.youtube.com/embed/${new URL(data.youtube_trailer).searchParams.get('v')}" 
            title="Trailer" frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen></iframe>
        `;
    }
}

/**
 * Initializes the login page.
 */
function initLoginPage() {
    console.log("Initializing Login Page...");
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            const response = await apiFetch('/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response && response.token) {
                setAuth(response.token, response.user);
                alert('Login successful!');
                window.location.href = '/dashboard'; // Redirect to dashboard
            } else {
                alert(response?.error || 'Login failed.');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;

            const response = await apiFetch('/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password })
            });

            if (response && response.token) {
                setAuth(response.token, response.user);
                alert('Registration successful!');
                window.location.href = '/dashboard'; // Redirect to dashboard
            } else {
                alert(response?.error || 'Registration failed.');
            }
        });
    }
}

/**
 * Initializes the dashboard page.
 */
async function initDashboardPage() {
     console.log("Initializing Dashboard Page...");
     if (!isAuthenticated()) {
         window.location.href = '/login';
         return;
     }

     const user = getCurrentUser();
     if (user) {
         document.getElementById('welcome-user').textContent = user.username;
         // Load personalized recommendations
         const personalizedData = await apiFetch('/recommendations/personalized?limit=10');
         if (personalizedData && personalizedData.recommendations) {
             populateContent('personalized-recommendations', personalizedData.recommendations);
         } else {
              // Fallback to trending if personalized fails
              const trendingData = await apiFetch('/recommendations/trending?limit=10');
              if (trendingData && trendingData.recommendations) {
                  populateContent('personalized-recommendations', trendingData.recommendations);
              }
         }
         // Load Watchlist Quick Access
         const watchlistData = await apiFetch('/user/watchlist');
         if (watchlistData && watchlistData.watchlist) {
             populateContent('watchlist-preview', watchlistData.watchlist);
         }
     }
}

/**
 * Initializes category pages (e.g., trending, anime).
 */
async function initCategoryPage() {
    console.log("Initializing Category Page...");
    const path = window.location.pathname;
    let endpoint = '';
    let title = 'Content';

    if (path.includes('/categories/trending')) {
        endpoint = '/recommendations/trending';
        title = 'Trending';
    } else if (path.includes('/categories/popular')) {
        endpoint = '/recommendations/trending'; // Assuming popular is trending for now
        title = 'Popular';
    } else if (path.includes('/categories/new-releases')) {
        endpoint = '/recommendations/new-releases';
        title = 'New Releases';
    } else if (path.includes('/categories/critic-choices')) {
        endpoint = '/recommendations/critics-choice';
        title = 'Critics\' Choice';
    } else if (path.includes('/categories/movies')) {
        endpoint = '/recommendations/trending?type=movie'; // Or a dedicated movie endpoint
        title = 'Movies';
    } else if (path.includes('/categories/tv-shows')) {
        endpoint = '/recommendations/trending?type=tv'; // Or a dedicated tv endpoint
        title = 'TV Shows';
    } else if (path.includes('/categories/anime')) {
        endpoint = '/recommendations/anime';
        title = 'Anime';
    } else if (path.includes('/languages/')) {
        const lang = path.split('/').pop(); // Get language from URL
        endpoint = `/recommendations/regional/${lang}`;
        title = `${lang.charAt(0).toUpperCase() + lang.slice(1)} Content`;
    } else if (path.includes('/user/watchlist')) {
         if (!isAuthenticated()) { window.location.href = '/login'; return; }
         endpoint = '/user/watchlist';
         title = 'Your Watchlist';
    } else if (path.includes('/user/favorites')) {
         if (!isAuthenticated()) { window.location.href = '/login'; return; }
         endpoint = '/user/favorites';
         title = 'Your Favorites';
    }


    if (endpoint) {
        document.title = `${title} - CineScope`;
        const pageTitleElement = document.querySelector('h1'); // Assuming an <h1> for the page title
        if (pageTitleElement) pageTitleElement.textContent = title;

        const data = await apiFetch(`${endpoint}?limit=50`); // Load more for category pages
        let items = [];
        if (data) {
            if (data.recommendations) items = data.recommendations;
            else if (data.watchlist) items = data.watchlist;
            else if (data.favorites) items = data.favorites;
        }
        populateContent('category-content', items);
    }
}


// --- Header Scripts (called by include.js) ---
function initHeaderScripts() {
    console.log("Initializing Header Scripts...");
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileNav = document.getElementById('mobile-nav');
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutButton = document.getElementById('logout-button');

    if (mobileMenuButton && mobileNav) {
        mobileMenuButton.addEventListener('click', () => {
            mobileNav.classList.toggle('hidden');
        });
    }

    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent immediate closing
            userDropdown.classList.toggle('hidden');
        });

        // Close dropdown if clicked outside
        document.addEventListener('click', (e) => {
            if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            clearAuth();
            alert('You have been logged out.');
            window.location.href = '/'; // Redirect to homepage
        });
    }

    // Update UI based on auth status
    updateAuthUI();
}

function updateAuthUI() {
    const authLinks = document.getElementById('auth-links');
    const userSection = document.getElementById('user-section');
    const userInitials = document.getElementById('user-initials');
    const adminLink = document.getElementById('admin-link');

    if (isAuthenticated()) {
        authLinks?.classList.add('hidden');
        userSection?.classList.remove('hidden');
        const user = getCurrentUser();
        if (userInitials && user) {
            userInitials.textContent = user.username.charAt(0).toUpperCase();
        }
        if (adminLink) {
            if (isAdmin()) {
                adminLink.classList.remove('hidden');
            } else {
                adminLink.classList.add('hidden');
            }
        }
        // Show user-specific links in mobile nav if needed
    } else {
        authLinks?.classList.remove('hidden');
        userSection?.classList.add('hidden');
        adminLink?.classList.add('hidden');
         // Hide user-specific links in mobile nav if needed
    }
}


// --- Carousel Navigation ---
document.addEventListener('click', (e) => {
    if (e.target.closest('.carousel-arrow')) {
        const arrow = e.target.closest('.carousel-arrow');
        const carouselTrack = arrow.closest('.carousel-container').querySelector('.carousel-track');
        const scrollAmount = carouselTrack.clientWidth * 0.8; // Scroll 80% of viewport width

        if (arrow.dataset.direction === 'left') {
            carouselTrack.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else if (arrow.dataset.direction === 'right') {
            carouselTrack.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }
});

// --- Initialize on Page Load ---
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a tiny bit for includes to load
    setTimeout(() => {
         // Determine which page to initialize
        const path = window.location.pathname;

        if (path === '/' || path === '/index.html') {
            initHomepage();
        } else if (path === '/login' || path === '/login.html') {
            initLoginPage();
        } else if (path === '/dashboard' || path === '/dashboard.html') {
            initDashboardPage();
        } else if (path === '/details' || path === '/details.html') {
            initDetailsPage();
        } else if (path.startsWith('/categories/') ||
                   path.startsWith('/languages/') ||
                   path.startsWith('/user/watchlist') ||
                   path.startsWith('/user/favorites')) {
            initCategoryPage();
        } else if (path.startsWith('/admin/')) {
             // Basic check, redirect if not admin
             if(isAuthenticated() && isAdmin()) {
                 // Specific admin page init can go here if needed
                 console.log("Admin page loaded");
             } else {
                 window.location.href = '/'; // Redirect non-admins
             }
        } else {
            console.log("No specific initialization for this page:", path);
        }

        hidePreloader(); // Ensure preloader hides after page logic
    }, 100); // Adjust timeout if needed

});