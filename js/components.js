// Reusable UI Components
class UIComponents {
    constructor() {
        this.toastContainer = null;
        this.loadingSpinner = null;
        this.modalStack = [];
        
        this.initializeComponents();
    }
    
    initializeComponents() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toastContainer')) {
            this.createToastContainer();
        }
        
        // Create loading spinner if it doesn't exist
        if (!document.getElementById('loadingSpinner')) {
            this.createLoadingSpinner();
        }
        
        // Setup global event listeners
        this.setupGlobalListeners();
    }
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
        this.toastContainer = container;
    }
    
    createLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.id = 'loadingSpinner';
        spinner.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 hidden flex items-center justify-center';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
        this.loadingSpinner = spinner;
    }
    
    setupGlobalListeners() {
                // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                this.closeTopModal();
            }
        });
        
        // Close modals on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeTopModal();
            }
        });
        
        // Handle swipe gestures on touch devices
        this.setupSwipeGestures();
        
        // Setup intersection observer for lazy loading
        this.setupLazyLoading();
    }
    
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Detect swipe direction
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.handleSwipeRight(e.target);
                } else {
                    this.handleSwipeLeft(e.target);
                }
            }
        });
    }
    
    handleSwipeLeft(target) {
        // Find carousel container
        const carousel = target.closest('.carousel-container');
        if (carousel) {
            const carouselId = carousel.closest('[id]')?.id;
            if (carouselId) {
                slideCarousel(carouselId.replace('Carousel', ''), 1);
            }
        }
    }
    
    handleSwipeRight(target) {
        // Find carousel container
        const carousel = target.closest('.carousel-container');
        if (carousel) {
            const carouselId = carousel.closest('[id]')?.id;
            if (carouselId) {
                slideCarousel(carouselId.replace('Carousel', ''), -1);
            }
        }
    }
    
    setupLazyLoading() {
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        this.imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });
    }
    
    // Toast Notifications
    showToast(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type);
        this.toastContainer.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        return toast;
    }
    
    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon ${icons[type] || icons.info}"></i>
                <div class="toast-message">${message}</div>
                <button class="toast-close" onclick="this.closest('.toast').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        return toast;
    }
    
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.classList.add('removing');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }
    
    // Loading Spinner
    showLoading(show = true) {
        if (this.loadingSpinner) {
            this.loadingSpinner.classList.toggle('hidden', !show);
        }
    }
    
    // Modal Management
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            this.modalStack.push(modalId);
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            this.modalStack = this.modalStack.filter(id => id !== modalId);
            
            if (this.modalStack.length === 0) {
                document.body.style.overflow = '';
            }
        }
    }
    
    closeTopModal() {
        if (this.modalStack.length > 0) {
            const topModalId = this.modalStack[this.modalStack.length - 1];
            this.closeModal(topModalId);
        }
    }
    
    // Movie Card Component
    // Update the createMovieCard function in components.js
createMovieCard(movie, options = {}) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => this.openMovieDetail(movie.id);
    
    // Handle poster URL with fallback
    let posterUrl = movie.poster_path;
    if (!posterUrl || posterUrl === 'null') {
        posterUrl = 'https://via.placeholder.com/300x450/333/fff?text=No+Image';
    } else if (!posterUrl.startsWith('http')) {
        // If it's a relative path, make it absolute
        posterUrl = `https://image.tmdb.org/t/p/w500${posterUrl}`;
    }
    
    const rating = movie.rating ? movie.rating.toFixed(1) : 'N/A';
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
    
    card.innerHTML = `
        <img class="movie-card-image" 
             ${options.lazy ? `data-src="${posterUrl}"` : `src="${posterUrl}"`}
             alt="${movie.title}"
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x450/333/fff?text=No+Image'">
        <div class="movie-card-content">
            <h3 class="movie-card-title">${movie.title}</h3>
            <div class="movie-card-meta">
                <span>${year}</span>
                <div class="movie-card-rating">
                    <i class="fas fa-star"></i>
                    <span>${rating}</span>
                </div>
            </div>
            <div class="movie-card-actions">
                <button class="movie-card-action" onclick="event.stopPropagation(); toggleWatchlist(${movie.id})" title="Add to Watchlist">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="movie-card-action" onclick="event.stopPropagation(); toggleFavorite(${movie.id})" title="Add to Favorites">
                    <i class="far fa-heart"></i>
                </button>
                <button class="movie-card-action" onclick="event.stopPropagation(); shareMovie(${movie.id})" title="Share">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </div>
    `;
    
    // Setup lazy loading
    if (options.lazy) {
        const img = card.querySelector('img');
        this.imageObserver.observe(img);
    }
    
    return card;
}
    
    // Video Card Component
    createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.onclick = () => this.playVideo(video.video_id);
        
        card.innerHTML = `
            <img class="video-thumbnail" src="${video.thumbnail}" alt="${video.title}">
            <div class="video-overlay">
                <button class="video-play-btn">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <div class="video-info">
                <h4 class="video-title">${video.title}</h4>
                <span class="video-type">${video.type}</span>
            </div>
        `;
        
        return card;
    }
    
    // Cast Card Component
    createCastCard(person) {
        const card = document.createElement('div');
        card.className = 'cast-card';
        
        const photoUrl = person.profile_path 
            ? `https://image.tmdb.org/t/p/w200${person.profile_path}`
            : '/api/placeholder/150/200';
        
        card.innerHTML = `
            <img class="cast-photo" src="${photoUrl}" alt="${person.name}">
            <div class="cast-info">
                <h4 class="cast-name">${person.name}</h4>
                <p class="cast-character">${person.character || person.job || ''}</p>
            </div>
        `;
        
        return card;
    }
    
    // Review Card Component
    createReviewCard(review) {
        const card = document.createElement('div');
        card.className = 'review-card';
        
        const stars = this.createStarRating(review.rating, false);
        const initials = review.username.substring(0, 2).toUpperCase();
        const date = new Date(review.created_at).toLocaleDateString();
        
        card.innerHTML = `
            <div class="review-header">
                <div class="review-user">
                    <div class="review-avatar">${initials}</div>
                    <div>
                        <div class="review-username">${review.username}</div>
                        <div class="review-date">${date}</div>
                    </div>
                </div>
                <div class="review-rating">${stars}</div>
            </div>
            <p class="review-text">${review.review_text || 'No written review'}</p>
            <div class="review-actions">
                <button class="review-action" onclick="likeReview(${review.id})">
                    <i class="far fa-thumbs-up"></i>
                    <span>Helpful</span>
                </button>
                <button class="review-action" onclick="reportReview(${review.id})">
                    <i class="fas fa-flag"></i>
                    <span>Report</span>
                </button>
            </div>
        `;
        
        return card;
    }
    
    // Star Rating Component
    createStarRating(rating, interactive = true) {
        const container = document.createElement('div');
        container.className = 'star-rating';
        
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('button');
            star.type = 'button';
            star.className = `rating-star ${i <= rating ? 'active' : ''}`;
            star.innerHTML = '<i class="fas fa-star"></i>';
            
            if (interactive) {
                star.dataset.rating = i;
                star.onclick = () => this.setRating(container, i);
            } else {
                star.disabled = true;
                star.style.cursor = 'default';
            }
            
            container.appendChild(star);
        }
        
        return container.outerHTML;
    }
    
    setRating(container, rating) {
        const stars = container.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
        
        // Trigger custom event
        container.dispatchEvent(new CustomEvent('ratingChanged', {
            detail: { rating }
        }));
    }
    
    // Skeleton Loading Component
    createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'skeleton-card skeleton';
        return card;
    }
    
    createSkeletonText(width = 'full') {
        const text = document.createElement('div');
        text.className = `skeleton-text skeleton ${width}`;
        return text;
    }
    
    // Error State Component
    createErrorState(message, actionText = 'Try Again', actionCallback = null) {
        const container = document.createElement('div');
        container.className = 'error-state';
        
        container.innerHTML = `
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 class="error-title">Oops! Something went wrong</h3>
            <p class="error-message">${message}</p>
            ${actionCallback ? `<button class="error-action" onclick="(${actionCallback})()">${actionText}</button>` : ''}
        `;
        
        return container;
    }
    
    // Empty State Component
    createEmptyState(title, message, actionText = null, actionCallback = null) {
        const container = document.createElement('div');
        container.className = 'empty-state';
        
        container.innerHTML = `
            <div class="empty-icon">
                <i class="fas fa-film"></i>
            </div>
            <h3 class="empty-title">${title}</h3>
            <p class="empty-message">${message}</p>
            ${actionText && actionCallback ? `<button class="empty-action" onclick="(${actionCallback})()">${actionText}</button>` : ''}
        `;
        
        return container;
    }
    
    // Progress Bar Component
    createProgressBar(progress = 0, showText = true) {
        const container = document.createElement('div');
        container.className = 'progress-container';
        
        container.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            ${showText ? `<div class="progress-text">${progress}%</div>` : ''}
        `;
        
        return container;
    }
    
    updateProgress(container, progress) {
        const fill = container.querySelector('.progress-fill');
        const text = container.querySelector('.progress-text');
        
        if (fill) fill.style.width = `${progress}%`;
        if (text) text.textContent = `${progress}%`;
    }
    
    // Utility Methods
    openMovieDetail(movieId) {
        window.location.href = `movie-detail.html?id=${movieId}`;
    }
    
    playVideo(videoId) {
        const modal = document.getElementById('videoModal');
        const player = document.getElementById('videoPlayer');
        
        if (modal && player) {
            player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            this.openModal('videoModal');
        }
    }
    
    closeVideoModal() {
        const player = document.getElementById('videoPlayer');
        if (player) {
            player.src = '';
        }
        this.closeModal('videoModal');
    }
    
    // Carousel Management
    initializeCarousel(carouselId) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        
        const track = carousel.querySelector('.carousel-track');
        const prevBtn = carousel.querySelector('.carousel-btn-prev');
        const nextBtn = carousel.querySelector('.carousel-btn-next');
        
        if (!track) return;
        
        let currentIndex = 0;
        const itemWidth = 200; // Approximate item width
        const visibleItems = Math.floor(carousel.offsetWidth / itemWidth);
                const totalItems = track.children.length;
        const maxIndex = Math.max(0, totalItems - visibleItems);
        
        const updateButtons = () => {
            if (prevBtn) prevBtn.disabled = currentIndex <= 0;
            if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
        };
        
        const slide = (direction) => {
            currentIndex = Math.max(0, Math.min(maxIndex, currentIndex + direction));
            const translateX = -currentIndex * itemWidth;
            track.style.transform = `translateX(${translateX}px)`;
            updateButtons();
        };
        
        if (prevBtn) prevBtn.onclick = () => slide(-1);
        if (nextBtn) nextBtn.onclick = () => slide(1);
        
        updateButtons();
        
        // Store carousel state
        carousel.carouselState = {
            currentIndex,
            slide,
            updateButtons
        };
    }
    
    // Form Validation
    validateForm(form) {
        const errors = [];
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                errors.push(`${input.name || input.id} is required`);
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
            
            // Email validation
            if (input.type === 'email' && input.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    errors.push('Please enter a valid email address');
                    input.classList.add('error');
                }
            }
            
            // Password validation
            if (input.type === 'password' && input.value && input.value.length < 6) {
                errors.push('Password must be at least 6 characters long');
                input.classList.add('error');
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // Search Functionality
    setupSearch(inputId, resultsContainerId, searchFunction) {
        const input = document.getElementById(inputId);
        const resultsContainer = document.getElementById(resultsContainerId);
        
        if (!input || !resultsContainer) return;
        
        let searchTimeout;
        
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                resultsContainer.classList.add('hidden');
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                try {
                    const results = await searchFunction(query);
                    this.displaySearchResults(results, resultsContainer);
                } catch (error) {
                    console.error('Search error:', error);
                    resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-400">Search failed. Please try again.</div>';
                }
            }, 300);
        });
        
        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });
    }
    
    displaySearchResults(results, container) {
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-gray-400">No results found</div>';
            container.classList.remove('hidden');
            return;
        }
        
        container.innerHTML = results.map(item => `
            <div class="search-result-item" onclick="openMovieDetail(${item.id})">
                <img class="search-result-poster" 
                     src="${item.poster_path || '/api/placeholder/60/80'}" 
                     alt="${item.title}">
                <div class="search-result-info">
                    <h4 class="search-result-title">${item.title}</h4>
                    <div class="search-result-meta">
                        <span class="search-result-type">${item.content_type || 'movie'}</span>
                        <span>${item.release_date ? new Date(item.release_date).getFullYear() : ''}</span>
                        ${item.rating ? `<span>★ ${item.rating.toFixed(1)}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        container.classList.remove('hidden');
    }
    
    // Infinite Scroll
    setupInfiniteScroll(container, loadMoreFunction) {
        let loading = false;
        let page = 1;
        
        const observer = new IntersectionObserver(async (entries) => {
            const lastEntry = entries[0];
            
            if (lastEntry.isIntersecting && !loading) {
                loading = true;
                
                try {
                    const newItems = await loadMoreFunction(page + 1);
                    if (newItems && newItems.length > 0) {
                        page++;
                        // Append new items to container
                        newItems.forEach(item => {
                            container.appendChild(this.createMovieCard(item, { lazy: true }));
                        });
                    }
                } catch (error) {
                    console.error('Load more error:', error);
                } finally {
                    loading = false;
                }
            }
        }, {
            rootMargin: '100px'
        });
        
        // Observe the last item in the container
        const observeLastItem = () => {
            const items = container.children;
            if (items.length > 0) {
                observer.observe(items[items.length - 1]);
            }
        };
        
        // Initial observation
        observeLastItem();
        
        // Re-observe when new items are added
        const mutationObserver = new MutationObserver(observeLastItem);
        mutationObserver.observe(container, { childList: true });
        
        return { observer, mutationObserver };
    }
    
    // Local Storage Helpers
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save to storage:', error);
        }
    }
    
    loadFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Failed to load from storage:', error);
            return defaultValue;
        }
    }
    
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove from storage:', error);
        }
    }
    
    // Theme Management
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.saveToStorage('theme', theme);
    }
    
    getTheme() {
        return this.loadFromStorage('theme', 'dark');
    }
    
    initializeTheme() {
        const savedTheme = this.getTheme();
        this.setTheme(savedTheme);
    }
    
    // Accessibility Helpers
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
        
        firstElement?.focus();
    }
    
    // Performance Monitoring
    measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    }
    
    // Debounce Utility
    debounce(func, wait) {
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
    
    // Throttle Utility
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Create global UI components instance
const ui = new UIComponents();

// Global utility functions
function showToast(message, type = 'info', duration = 5000) {
    return ui.showToast(message, type, duration);
}

function showLoading(show = true) {
    ui.showLoading(show);
}

function openModal(modalId) {
    ui.openModal(modalId);
}

function closeModal(modalId) {
    ui.closeModal(modalId);
}

function createMovieCard(movie, options = {}) {
    return ui.createMovieCard(movie, options);
}

function createVideoCard(video) {
    return ui.createVideoCard(video);
}

function createCastCard(person) {
    return ui.createCastCard(person);
}

function createReviewCard(review) {
    return ui.createReviewCard(review);
}

function slideCarousel(carouselName, direction) {
    const carousel = document.getElementById(`${carouselName}Carousel`);
    if (carousel && carousel.carouselState) {
        carousel.carouselState.slide(direction);
    }
}

function openMovieDetail(movieId) {
    ui.openMovieDetail(movieId);
}

function playVideo(videoId) {
    ui.playVideo(videoId);
}

function closeVideoModal() {
    ui.closeVideoModal();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ui, 
        showToast, 
        showLoading, 
        openModal, 
        closeModal, 
        createMovieCard, 
        slideCarousel 
    };
}