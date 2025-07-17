class MovieApp {
    constructor() {
        this.currentUser = null;
        this.searchTimeout = null;
        this.isLoggedIn = !!localStorage.getItem('authToken');
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.updateAuthUI();
        await this.loadHomepageData();
        this.setupSearch();
        this.setupServiceWorker();
    }

    setupEventListeners() {
        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Modal event listeners
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal-backdrop')) {
                this.closeAllModals();
            }
        });

        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    async loadHomepageData() {
        try {
            const data = await apiService.getHomepage();
            
            // Load different sections
            this.renderContentSection('trending-track', data.whats_hot || [], 'What\'s Hot');
            this.renderContentSection('critics-track', data.critics_choice || [], 'Critics\' Choice');
            
            // Load regional content
            if (data.regional) {
                const regionalContent = Object.values(data.regional).flat();
                this.renderContentSection('regional-track', regionalContent, 'Regional Favorites');
            }

            // Load anime
            if (data.trending && data.trending.anime) {
                this.renderContentSection('anime-track', data.trending.anime, 'Trending Anime');
            }

            // Load personalized recommendations if logged in
            if (this.isLoggedIn) {
                await this.loadPersonalizedRecommendations();
            } else {
                this.renderContentSection('recommendations-track', data.trending?.movies || [], 'Popular Movies');
            }

        } catch (error) {
            console.error('Error loading homepage:', error);
            this.showErrorMessage('Failed to load content. Please refresh the page.');
        }
    }

    async loadPersonalizedRecommendations() {
        try {
            const recommendations = await apiService.getRecommendations();
            this.renderContentSection('recommendations-track', 
                recommendations.hybrid_recommendations || [], 
                'Recommended for You'
            );
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    renderContentSection(trackId, items, title) {
        const track = document.getElementById(trackId);
        if (!track || !items.length) return;

        track.innerHTML = items.map(item => this.createMovieCard(item)).join('');
    }

    createMovieCard(item) {
        const title = item.title || item.name || 'Unknown Title';
        const posterUrl = item.poster_path || item.poster_url || item.image_url || 'assets/images/placeholder-poster.jpg';
        const rating = item.rating || item.vote_average || item.score || 0;
        const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
        const genres = this.formatGenres(item.genre_names || item.genres || []);
        
        return `
            <div class="movie-card" onclick="this.showContentDetails(${item.id || item.tmdb_id})">
                <div class="movie-poster">
                    <img src="${posterUrl}" alt="${title}" loading="lazy" 
                         onerror="this.src='assets/images/placeholder-poster.jpg'">
                    <div class="movie-overlay">
                        <button class="play-btn" onclick="event.stopPropagation(); this.playContent(${item.id})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="wishlist-btn" onclick="event.stopPropagation(); this.toggleWishlist(${item.id})">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">${title}</h3>
                    <div class="movie-meta">
                        ${rating > 0 ? `
                            <span class="movie-rating">
                                <i class="fas fa-star"></i>
                                ${rating.toFixed(1)}
                            </span>
                        ` : ''}
                        ${year ? `<span class="movie-year">${year}</span>` : ''}
                    </div>
                    ${genres ? `<div class="genre-tags">${genres}</div>` : ''}
                </div>
            </div>
        `;
    }

    formatGenres(genres) {
        if (!genres || !genres.length) return '';
        return genres.slice(0, 3).map(genre => 
            `<span class="genre-tag">${genre}</span>`
        ).join('');
    }

    async showContentDetails(contentId) {
        try {
            const data = await apiService.getContentDetails(contentId);
            this.openContentModal(data);
        } catch (error) {
            console.error('Error loading content details:', error);
            this.showErrorMessage('Failed to load content details.');
        }
    }

    openContentModal(data) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">${data.content.title}</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="content-details">
                    <div class="row">
                        <div class="col-md-4">
                            <img src="${data.content.poster_path || 'assets/images/placeholder-poster.jpg'}" 
                                 alt="${data.content.title}" class="w-100" style="border-radius: 0.5rem;">
                        </div>
                        <div class="col-md-8">
                            <p style="color: var(--text-secondary); margin-bottom: 1rem;">${data.content.overview || 'No description available.'}</p>
                            ${data.content.rating ? `
                                <div style="margin-bottom: 1rem;">
                                    <strong>Rating:</strong> 
                                    <span class="movie-rating">
                                        <i class="fas fa-star"></i>
                                        ${data.content.rating.toFixed(1)}/10
                                    </span>
                                </div>
                            ` : ''}
                            ${data.content.genre_names ? `
                                <div style="margin-bottom: 1rem;">
                                    <strong>Genres:</strong> ${data.content.genre_names.join(', ')}
                                </div>
                            ` : ''}
                            ${data.content.release_date ? `
                                <div style="margin-bottom: 1rem;">
                                    <strong>Release Date:</strong> ${new Date(data.content.release_date).toLocaleDateString()}
                                </div>
                            ` : ''}
                            <div class="action-buttons" style="margin-top: 2rem;">
                                <button class="btn-primary" onclick="this.playContent(${data.content.id})">
                                    <i class="fas fa-play"></i> Watch Now
                                </button>
                                <button class="btn-secondary" onclick="this.toggleWishlist(${data.content.id})">
                                    <i class="far fa-heart"></i> Add to Wishlist
                                </button>
                            </div>
                        </div>
                    </div>
                    ${data.youtube_videos && data.youtube_videos.trailers.length > 0 ? `
                        <div style="margin-top: 2rem;">
                            <h4>Trailers & Videos</h4>
                            <div class="video-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem;">
                                ${data.youtube_videos.trailers.slice(0, 3).map(video => `
                                    <div class="video-card" style="background: var(--secondary-bg); border-radius: 0.5rem; overflow: hidden;">
                                        <img src="${video.thumbnail}" alt="${video.title}" class="w-100" style="height: 150px; object-fit: cover;">
                                        <div style="padding: 1rem;">
                                            <h5 style="font-size: 0.9rem; margin-bottom: 0.5rem;">${video.title}</h5>
                                            <a href="${video.url}" target="_blank" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                                                <i class="fab fa-youtube"></i> Watch
                                            </a>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async toggleWishlist(contentId) {
        if (!this.isLoggedIn) {
            this.showModal('loginModal');
            return;
        }

        try {
            await apiService.recordInteraction({
                content_id: contentId,
                interaction_type: 'wishlist'
            });
            this.showSuccessMessage('Added to wishlist!');
        } catch (error) {
            this.showErrorMessage('Failed to update wishlist.');
        }
    }

    async playContent(contentId) {
        if (!this.isLoggedIn) {
            this.showModal('loginModal');
            return;
        }

        try {
            await apiService.recordInteraction({
                content_id: contentId,
                interaction_type: 'view'
            });
            // Here you would implement actual video playing logic
            this.showSuccessMessage('Playing content...');
        } catch (error) {
            this.showErrorMessage('Failed to play content.');
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();

            if (query.length > 2) {
                this.searchTimeout = setTimeout(() => {
                    this.performSearch(query);
                }, 300);
            }
        });
    }

    async performSearch(query) {
        try {
            const results = await apiService.searchContent(query);
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    displaySearchResults(results) {
        // Implementation for search results display
        console.log('Search results:', results);
    }

    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userInitial = document.getElementById('userInitial');

        if (this.isLoggedIn) {
            const username = localStorage.getItem('username') || 'User';
            authButtons.style.display = 'none';
            userMenu.style.display = 'block';
            if (userInitial) {
                userInitial.textContent = username.charAt(0).toUpperCase();
            }
        } else {
            authButtons.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await apiService.login({ username, password });
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('userId', response.user_id);
            localStorage.setItem('username', response.username);
            
            this.isLoggedIn = true;
            this.updateAuthUI();
            this.hideModal('loginModal');
            this.showSuccessMessage('Login successful!');
            await this.loadPersonalizedRecommendations();
        } catch (error) {
            this.showAlert('loginAlert', error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const response = await apiService.register({ username, email, password });
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('userId', response.user_id);
            localStorage.setItem('username', response.username);
            
            this.isLoggedIn = true;
            this.updateAuthUI();
            this.hideModal('registerModal');
            this.showSuccessMessage('Account created successfully!');
            await this.loadPersonalizedRecommendations();
        } catch (error) {
            this.showAlert('registerAlert', error.message);
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        
        this.isLoggedIn = false;
        this.updateAuthUI();
        this.showSuccessMessage('Logged out successfully!');
        
        // Reload homepage with public content
        this.loadHomepageData();
    }

    // Utility methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal-backdrop');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }

    showAlert(containerId, message, type = 'error') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        }
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${type === 'success' ? 'var(--success)' : 'var(--error)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
        }
    }
}

// Global functions for inline event handlers
function scrollCarousel(trackId, direction) {
    const track = document.getElementById(trackId);
    if (!track) return;
    
    const scrollAmount = 300;
    track.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

function toggleDropdown() {
    const dropdown = document.getElementById('dropdownMenu');
    dropdown.classList.toggle('show');
}

function showModal(modalId) {
    app.showModal(modalId);
}

function hideModal(modalId) {
    app.hideModal(modalId);
}

function closeModalOnBackdrop(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        app.closeAllModals();
    }
}

function logout() {
    app.logout();
}

function scrollToRecommendations() {
    document.getElementById('recommendations').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Initialize app
const app = new MovieApp();

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        const dropdown = document.getElementById('dropdownMenu');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
});