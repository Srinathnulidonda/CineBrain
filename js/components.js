// Reusable UI components and utilities

class UIComponents {
    // Create content card component
    static createContentCard(content, options = {}) {
        const {
            showActions = true,
            showGenres = true,
            cardType = 'normal' // 'normal', 'featured', 'large'
        } = options;

        const card = document.createElement('div');
        card.className = cardType === 'featured' ? 'featured-card' : 'content-card';
        card.setAttribute('data-content-id', content.id);

        const imageUrl = content.poster_path || '/assets/images/placeholder-poster.jpg';
        const title = content.title || content.original_title || 'Unknown Title';
        const year = content.release_date ? new Date(content.release_date).getFullYear() : '';
        const rating = content.rating ? content.rating.toFixed(1) : 'N/A';
        const genres = content.genre_names || [];

        let genresHtml = '';
        if (showGenres && genres.length > 0) {
            genresHtml = `
                <div class="content-card-genres">
                    ${genres.slice(0, 3).map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                </div>
            `;
        }

        let actionsHtml = '';
        if (showActions && authManager.isLoggedIn) {
            actionsHtml = `
                <div class="content-card-actions">
                    <div class="interaction-buttons">
                        <button class="action-btn like-btn" data-action="like" title="Like">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                        </button>
                        <button class="action-btn favorite-btn" data-action="favorite" title="Add to Favorites">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                            </svg>
                        </button>
                        <button class="action-btn wishlist-btn" data-action="wishlist" title="Add to Wishlist">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                            </svg>
                        </button>
                    </div>
                    <button class="action-btn" onclick="openContentModal(${content.id})" title="View Details">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </button>
                </div>
            `;
        }

        if (cardType === 'featured') {
            card.innerHTML = `
                <img src="${imageUrl}" alt="${title}" class="featured-card-image" loading="lazy">
                <div class="featured-card-content">
                    <h3 class="featured-card-title">${title}</h3>
                    ${content.admin_description ? `<p class="featured-card-description">${content.admin_description}</p>` : ''}
                    ${content.custom_tags ? `
                        <div class="featured-card-tags">
                            ${content.custom_tags.map(tag => `<span class="custom-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="flex items-center justify-between">
                        <div class="content-card-rating">
                            <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            <span class="text-sm">${rating}</span>
                        </div>
                        ${year ? `<span class="text-sm text-text-secondary">${year}</span>` : ''}
                    </div>
                    ${actionsHtml}
                </div>
            `;
        } else {
            card.innerHTML = `
                <img src="${imageUrl}" alt="${title}" class="content-card-image" loading="lazy">
                <div class="content-card-info">
                    <h3 class="content-card-title">${title}</h3>
                    <div class="content-card-meta">
                        <div class="content-card-rating">
                            <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            <span>${rating}</span>
                        </div>
                        ${year ? `<div>${year}</div>` : ''}
                    </div>
                    ${genresHtml}
                    ${actionsHtml}
                </div>
            `;
        }

        // Add click handler for main card area
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on action buttons
            if (!e.target.closest('.action-btn')) {
                openContentModal(content.id);
            }
        });

        // Add interaction button handlers
        if (showActions && authManager.isLoggedIn) {
            const actionBtns = card.querySelectorAll('.action-btn[data-action]');
            actionBtns.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const action = btn.getAttribute('data-action');
                    await handleInteraction(content.id, action, btn);
                });
            });
        }

        return card;
    }

    // Create skeleton loader
    static createSkeletonCard() {
        const skeleton = document.createElement('div');
        skeleton.className = 'content-card';
        skeleton.innerHTML = `
            <div class="skeleton-card"></div>
            <div class="p-4 space-y-2">
                <div class="skeleton-text"></div>
                <div class="skeleton-text w-3/4"></div>
                <div class="flex space-x-1">
                    <div class="skeleton w-12 h-5 rounded-full"></div>
                    <div class="skeleton w-16 h-5 rounded-full"></div>
                </div>
            </div>
        `;
        return skeleton;
    }

    // Create carousel component
    static createCarousel(containerId, items, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        if (!items || items.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-text-secondary">No content available</div>';
            return;
        }

        items.forEach(item => {
            const card = this.createContentCard(item, options);
            container.appendChild(card);
        });

        // Add smooth scrolling for touch devices
        this.initCarouselScrolling(container);
    }

    // Initialize carousel scrolling
    static initCarouselScrolling(container) {
        let isScrolling = false;
        let startX = 0;
        let scrollLeft = 0;

        container.addEventListener('touchstart', (e) => {
            isScrolling = true;
            startX = e.touches[0].pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        container.addEventListener('touchmove', (e) => {
            if (!isScrolling) return;
            e.preventDefault();
            const x = e.touches[0].pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });

        container.addEventListener('touchend', () => {
            isScrolling = false;
        });

        // Mouse drag for desktop
        container.addEventListener('mousedown', (e) => {
            isScrolling = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        container.addEventListener('mousemove', (e) => {
            if (!isScrolling) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });

        container.addEventListener('mouseup', () => {
            isScrolling = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mouseleave', () => {
            isScrolling = false;
            container.style.cursor = 'grab';
        });
    }

    // Create toast notification
    static showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <div class="flex items-start space-x-3">
                ${icon}
                <div class="flex-1">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <button class="text-text-secondary hover:text-white" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);

        return toast;
    }

    static getToastIcon(type) {
        const icons = {
            success: '<svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
            error: '<svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>',
            warning: '<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
            info: '<svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
        };
        return icons[type] || icons.info;
    }

    // Create modal
    static createModal(title, content, options = {}) {
        const { 
            size = 'md',
            showClose = true,
            onClose = null
        } = options;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content max-w-${size}">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    ${showClose ? `
                        <button class="modal-close">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        // Close handlers
        if (showClose) {
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.addEventListener('click', () => {
                this.closeModal(modal, onClose);
            });
        }

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal, onClose);
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal, onClose);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        document.body.appendChild(modal);
        return modal;
    }

    static closeModal(modal, onClose = null) {
        if (onClose && typeof onClose === 'function') {
            onClose();
        }
        modal.remove();
    }

    // Create loading state
    static showLoading(container, message = 'Loading...') {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (!container) return;

        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = `
            <div class="spinner"></div>
            <p class="text-text-secondary">${message}</p>
        `;

        container.innerHTML = '';
        container.appendChild(loader);
    }

    // Create search results
    static createSearchResults(results, container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (!container) return;

        container.innerHTML = '';

        if (!results || results.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-text-secondary">No results found</div>';
            return;
        }

        results.forEach(result => {
            const resultEl = document.createElement('div');
            resultEl.className = 'search-result';
            
            const imageUrl = result.poster_path || '/assets/images/placeholder-poster.jpg';
            const title = result.title || result.original_title || 'Unknown Title';
            const year = result.release_date ? new Date(result.release_date).getFullYear() : '';
            const type = result.content_type || 'movie';

            resultEl.innerHTML = `
                <img src="${imageUrl}" alt="${title}" class="search-result-image" loading="lazy">
                <div class="search-result-info">
                    <div class="search-result-title">${title}</div>
                    <div class="search-result-meta">
                        ${year} • ${type.charAt(0).toUpperCase() + type.slice(1)}
                        ${result.rating ? ` • ⭐ ${result.rating.toFixed(1)}` : ''}
                    </div>
                </div>
            `;

            resultEl.addEventListener('click', () => {
                openContentModal(result.id || result.tmdb_id);
                container.classList.add('hidden');
            });

            container.appendChild(resultEl);
        });

        container.classList.remove('hidden');
    }
}

// Global utility functions
function showLoader(show, message = 'Loading...') {
    let loader = document.getElementById('globalLoader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.className = 'fixed inset-0 bg-black/75 flex items-center justify-center z-50';
            loader.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="text-white">${message}</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.classList.remove('hidden');
    } else {
        if (loader) {
            loader.classList.add('hidden');
        }
    }
}

async function handleInteraction(contentId, action, buttonEl) {
    try {
        if (!authManager.isLoggedIn) {
            UIComponents.showToast('Please login to interact with content', 'warning');
            return;
        }

        // Visual feedback
        buttonEl.classList.add('opacity-50');
        
        await apiService.recordInteraction({
            content_id: contentId,
            interaction_type: action
        });

        // Update button state
        buttonEl.classList.remove('opacity-50');
        buttonEl.classList.toggle('active');
        
        const messages = {
            like: 'Added to liked',
            favorite: 'Added to favorites',
            wishlist: 'Added to wishlist',
            view: 'Marked as viewed'
        };

        UIComponents.showToast(messages[action] || 'Action completed', 'success');
        
    } catch (error) {
        buttonEl.classList.remove('opacity-50');
        UIComponents.showToast('Failed to record interaction', 'error');
        console.error('Interaction error:', error);
    }
}

async function openContentModal(contentId) {
    try {
        showLoader(true, 'Loading content details...');
        
        const details = await apiService.getContentDetails(contentId);
        const content = details.content;
        
        // Record view interaction
        if (authManager.isLoggedIn) {
            apiService.recordInteraction({
                content_id: contentId,
                interaction_type: 'view'
            }).catch(console.error);
        }

        const modalContent = `
            <div class="space-y-6">
                <div class="flex flex-col md:flex-row gap-6">
                    <img src="${content.poster_path || '/assets/images/placeholder-poster.jpg'}" 
                         alt="${content.title}" 
                         class="w-full md:w-64 h-auto rounded-lg">
                    <div class="flex-1">
                        <h2 class="text-2xl font-bold mb-2">${content.title}</h2>
                        ${content.original_title !== content.title ? `<p class="text-text-secondary mb-2">Original: ${content.original_title}</p>` : ''}
                        <div class="flex items-center space-x-4 mb-4">
                            ${content.release_date ? `<span>${new Date(content.release_date).getFullYear()}</span>` : ''}
                            ${content.rating ? `<span class="flex items-center"><svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>${content.rating}</span>` : ''}
                            ${content.runtime ? `<span>${content.runtime} min</span>` : ''}
                        </div>
                        ${content.genre_names && content.genre_names.length > 0 ? `
                            <div class="flex flex-wrap gap-2 mb-4">
                                ${content.genre_names.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${content.overview ? `<p class="text-text-secondary leading-relaxed">${content.overview}</p>` : ''}
                    </div>
                </div>
                
                ${authManager.isLoggedIn ? `
                    <div class="flex space-x-4 pt-4 border-t border-border-color">
                        <button class="btn-primary" onclick="handleInteraction(${contentId}, 'favorite', this)">Add to Favorites</button>
                        <button class="btn-secondary" onclick="handleInteraction(${contentId}, 'wishlist', this)">Add to Wishlist</button>
                        <button class="btn-ghost" onclick="handleInteraction(${contentId}, 'like', this)">Like</button>
                    </div>
                ` : ''}
                
                ${details.youtube_videos && (details.youtube_videos.trailers?.length > 0 || details.youtube_videos.teasers?.length > 0) ? `
                    <div class="pt-4 border-t border-border-color">
                        <h3 class="text-lg font-semibold mb-4">Videos</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${details.youtube_videos.trailers?.slice(0, 2).map(video => `
                                <div class="bg-secondary-bg rounded-lg overflow-hidden">
                                    <img src="${video.thumbnail}" alt="${video.title}" class="w-full h-32 object-cover">
                                    <div class="p-3">
                                        <p class="text-sm font-medium">${video.title}</p>
                                        <a href="${video.url}" target="_blank" class="text-accent-red text-xs hover:underline">Watch on YouTube</a>
                                    </div>
                                </div>
                            `).join('') || ''}
                        </div>
                    </div>
                ` : ''}
                
                ${details.similar_content && details.similar_content.length > 0 ? `
                    <div class="pt-4 border-t border-border-color">
                        <h3 class="text-lg font-semibold mb-4">Similar Content</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            ${details.similar_content.slice(0, 4).map(similar => `
                                <div class="cursor-pointer hover:scale-105 transition-transform" onclick="openContentModal(${similar.id})">
                                    <img src="${similar.poster_path || '/assets/images/placeholder-poster.jpg'}" alt="${similar.title}" class="w-full h-32 object-cover rounded">
                                    <p class="text-xs mt-2 text-center">${similar.title}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        showLoader(false);
        UIComponents.createModal(content.title, modalContent, { size: '4xl' });
        
    } catch (error) {
        showLoader(false);
        UIComponents.showToast('Failed to load content details', 'error');
        console.error('Modal error:', error);
    }
}

// Make components globally available
window.UIComponents = UIComponents;