class FavoritesPageController {
    constructor() {
        this.favorites = [];
        this.filteredFavorites = [];
        this.currentView = 'grid';
        this.currentFilters = {
            type: '',
            genre: '',
            sort: 'date_added'
        };
        this.searchQuery = '';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.isLoading = false;
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            await this.loadFavorites();
            this.renderPage();
        } catch (error) {
            console.error('Failed to initialize favorites page:', error);
            this.showError('Failed to load favorites');
        }
    }

    setupEventListeners() {
        // Filter controls
        document.getElementById('type-filter')?.addEventListener('change', () => {
            this.currentFilters.type = document.getElementById('type-filter').value;
            this.applyFilters();
        });

        document.getElementById('genre-filter')?.addEventListener('change', () => {
            this.currentFilters.genre = document.getElementById('genre-filter').value;
            this.applyFilters();
        });

        document.getElementById('sort-filter')?.addEventListener('change', () => {
            this.currentFilters.sort = document.getElementById('sort-filter').value;
            this.applySorting();
        });

        // Search
        const searchInput = document.getElementById('favorites-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value.toLowerCase();
                    this.applyFilters();
                }, 300);
            });
        }

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // Export and share buttons
        document.getElementById('export-btn')?.addEventListener('click', () => {
            this.exportFavorites();
        });

        document.getElementById('share-btn')?.addEventListener('click', () => {
            this.shareCollection();
        });

        // Quick actions
        document.getElementById('create-playlist')?.addEventListener('click', () => {
            this.createPlaylist();
        });

        document.getElementById('get-recommendations')?.addEventListener('click', () => {
            this.getRecommendations();
        });

        document.getElementById('share-collection')?.addEventListener('click', () => {
            this.shareCollection();
        });
    }

    async loadFavorites() {
        this.showLoading();
        
        try {
            // Load favorites from API
            const favoritesData = await window.apiService.getUserFavorites();
            this.favorites = favoritesData.favorites || [];
            
            // Update stats
            this.updateStats();
            
            // Populate genre filter
            this.populateGenreFilter();
            
            // Apply initial filters
            this.applyFilters();
            
        } catch (error) {
            console.error('Failed to load favorites:', error);
            // Fallback to local storage
            this.loadFavoritesFromStorage();
        } finally {
            this.hideLoading();
        }
    }

    loadFavoritesFromStorage() {
        // Fallback method to load from local storage
        const storedFavorites = window.storageService?.get('favorites') || [];
        this.favorites = storedFavorites;
        this.updateStats();
        this.populateGenreFilter();
        this.applyFilters();
    }

    updateStats() {
        const movieCount = this.favorites.filter(item => item.content_type === 'movie').length;
        const tvCount = this.favorites.filter(item => item.content_type === 'tv').length;
        const avgRating = this.favorites.reduce((sum, item) => sum + (item.rating || 0), 0) / this.favorites.length || 0;
        const totalRuntime = this.favorites.reduce((sum, item) => sum + (item.runtime || 0), 0);

        document.getElementById('movies-count').textContent = movieCount;
        document.getElementById('tv-count').textContent = tvCount;
        document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
        document.getElementById('total-runtime').textContent = `${Math.floor(totalRuntime / 60)}h`;
    }

    populateGenreFilter() {
        const genreFilter = document.getElementById('genre-filter');
        if (!genreFilter) return;

        const genres = new Set();
        this.favorites.forEach(item => {
            if (item.genre_names) {
                item.genre_names.forEach(genre => genres.add(genre));
            }
        });

        // Clear existing options except "All Genres"
        genreFilter.innerHTML = '<option value="">All Genres</option>';
        
        // Add genre options
        Array.from(genres).sort().forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });
    }

    applyFilters() {
        let filtered = [...this.favorites];

        // Filter by type
        if (this.currentFilters.type) {
            filtered = filtered.filter(item => item.content_type === this.currentFilters.type);
        }

        // Filter by genre
        if (this.currentFilters.genre) {
            filtered = filtered.filter(item => 
                item.genre_names && item.genre_names.includes(this.currentFilters.genre)
            );
        }

        // Filter by search query
        if (this.searchQuery) {
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(this.searchQuery) ||
                (item.overview && item.overview.toLowerCase().includes(this.searchQuery))
            );
        }

        this.filteredFavorites = filtered;
        this.applySorting();
    }

    applySorting() {
        const sortBy = this.currentFilters.sort;
        
        this.filteredFavorites.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'rating':
                    return (b.rating || 0) - (a.rating || 0);
                case 'release_date':
                    return new Date(b.release_date || 0) - new Date(a.release_date || 0);
                case 'date_added':
                default:
                    return new Date(b.date_added || 0) - new Date(a.date_added || 0);
            }
        });

        this.currentPage = 1;
        this.renderFavorites();
    }

    renderPage() {
        if (this.favorites.length === 0) {
            this.showEmptyState();
        } else {
            this.showFavorites();
            this.renderFavorites();
        }
    }

    renderFavorites() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedItems = this.filteredFavorites.slice(startIndex, endIndex);

        switch (this.currentView) {
            case 'grid':
                this.renderGridView(paginatedItems);
                break;
            case 'list':
                this.renderListView(paginatedItems);
                break;
            case 'table':
                this.renderTableView(paginatedItems);
                break;
        }

        this.renderPagination();
    }

    renderGridView(items) {
        const container = document.getElementById('favorites-grid');
        container.innerHTML = '';

        items.forEach(item => {
            const card = new MovieCardComponent().createMovieCard(item, {
                showActions: true,
                showRemoveFromFavorites: true
            });
            
            // Add remove from favorites functionality
            this.addRemoveFromFavoritesHandler(card, item);
            container.appendChild(card);
        });
    }

    renderListView(items) {
        const container = document.getElementById('favorites-list');
        container.innerHTML = '';

        items.forEach(item => {
            const listItem = this.createListItem(item);
            container.appendChild(listItem);
        });
    }

    renderTableView(items) {
        const tbody = document.getElementById('favorites-table-body');
        tbody.innerHTML = '';

        items.forEach(item => {
            const row = this.createTableRow(item);
            tbody.appendChild(row);
        });
    }

    createListItem(item) {
        const listItem = document.createElement('div');
        listItem.className = 'favorites-list-item';
        listItem.innerHTML = `
            <div class="list-item-poster">
                <img src="${item.poster_path || 'assets/images/placeholder.jpg'}" alt="${item.title}">
            </div>
            <div class="list-item-content">
                <h3 class="list-item-title">${item.title}</h3>
                <div class="list-item-meta">
                    <span class="item-type">${item.content_type}</span>
                    <span class="item-year">${item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}</span>
                    ${item.rating ? `<span class="item-rating">⭐ ${item.rating.toFixed(1)}</span>` : ''}
                </div>
                <p class="list-item-overview">${(item.overview || '').substring(0, 150)}${item.overview && item.overview.length > 150 ? '...' : ''}</p>
                <div class="list-item-genres">
                    ${(item.genre_names || []).slice(0, 3).map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn-secondary btn-sm view-details-btn" data-content-id="${item.id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn-danger btn-sm remove-favorite-btn" data-content-id="${item.id}">
                    <i class="fas fa-heart-broken"></i> Remove
                </button>
            </div>
        `;

        // Add event listeners
        this.addListItemEventListeners(listItem, item);
        return listItem;
    }

    createTableRow(item) {
        const row = document.createElement('tr');
        row.className = 'favorites-table-row';
        row.innerHTML = `
            <td class="poster-cell">
                <img src="${item.poster_path || 'assets/images/placeholder.jpg'}" alt="${item.title}" class="table-poster">
            </td>
            <td class="title-cell">
                <div class="title-content">
                    <h4>${item.title}</h4>
                    ${item.original_title && item.original_title !== item.title ? `<small>${item.original_title}</small>` : ''}
                </div>
            </td>
            <td class="type-cell">
                <span class="content-type-badge ${item.content_type}">${item.content_type}</span>
            </td>
            <td class="rating-cell">
                ${item.rating ? `⭐ ${item.rating.toFixed(1)}` : 'N/A'}
            </td>
            <td class="year-cell">
                ${item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}
            </td>
            <td class="genre-cell">
                ${(item.genre_names || []).slice(0, 2).join(', ')}
            </td>
            <td class="added-cell">
                ${item.date_added ? new Date(item.date_added).toLocaleDateString() : 'N/A'}
            </td>
            <td class="actions-cell">
                <div class="table-actions">
                    <button class="table-action-btn view-btn" data-content-id="${item.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="table-action-btn remove-btn" data-content-id="${item.id}" title="Remove from Favorites">
                        <i class="fas fa-heart-broken"></i>
                    </button>
                </div>
            </td>
        `;

        // Add event listeners
        this.addTableRowEventListeners(row, item);
        return row;
    }

    addListItemEventListeners(listItem, item) {
        const viewBtn = listItem.querySelector('.view-details-btn');
        const removeBtn = listItem.querySelector('.remove-favorite-btn');

        viewBtn?.addEventListener('click', () => {
            this.viewContentDetails(item);
        });

        removeBtn?.addEventListener('click', () => {
            this.removeFromFavorites(item);
        });
    }

    addTableRowEventListeners(row, item) {
        const viewBtn = row.querySelector('.view-btn');
        const removeBtn = row.querySelector('.remove-btn');

        viewBtn?.addEventListener('click', () => {
            this.viewContentDetails(item);
        });

        removeBtn?.addEventListener('click', () => {
            this.removeFromFavorites(item);
        });
    }

    addRemoveFromFavoritesHandler(card, item) {
        const favoriteBtn = card.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.classList.add('active');
            favoriteBtn.querySelector('i').className = 'fas fa-heart';
            
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromFavorites(item);
            });
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Show/hide appropriate containers
        document.getElementById('favorites-grid').style.display = view === 'grid' ? 'block' : 'none';
        document.getElementById('favorites-list').style.display = view === 'list' ? 'block' : 'none';
        document.getElementById('favorites-table-container').style.display = view === 'table' ? 'block' : 'none';

        // Re-render
        this.renderFavorites();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredFavorites.length / this.itemsPerPage);
        const paginationContainer = document.getElementById('pagination-container');
        const paginationList = document.getElementById('pagination-list');

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'block';
        paginationList.innerHTML = '';

        // Previous button
        const prevBtn = this.createPaginationButton('Previous', this.currentPage - 1, this.currentPage === 1);
        paginationList.appendChild(prevBtn);

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationList.appendChild(this.createPaginationButton('1', 1));
            if (startPage > 2) {
                paginationList.appendChild(this.createPaginationEllipsis());
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = this.createPaginationButton(i.toString(), i, false, i === this.currentPage);
            paginationList.appendChild(pageBtn);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationList.appendChild(this.createPaginationEllipsis());
            }
            paginationList.appendChild(this.createPaginationButton(totalPages.toString(), totalPages));
        }

        // Next button
        const nextBtn = this.createPaginationButton('Next', this.currentPage + 1, this.currentPage === totalPages);
        paginationList.appendChild(nextBtn);
    }

    createPaginationButton(text, page, disabled = false, active = false) {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        
        if (!disabled) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToPage(page);
            });
        }
        
        li.appendChild(a);
        return li;
    }

    createPaginationEllipsis() {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        li.innerHTML = '<span class="page-link">...</span>';
        return li;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderFavorites();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async removeFromFavorites(item) {
        try {
            // Show confirmation
            const confirmed = await this.showConfirmation(
                'Remove from Favorites',
                `Are you sure you want to remove "${item.title}" from your favorites?`
            );
            
            if (!confirmed) return;

            // Remove from API
            await window.apiService.userInteraction({
                content_id: item.id,
                interaction_type: 'unfavorite'
            });

            // Remove from local array
            this.favorites = this.favorites.filter(fav => fav.id !== item.id);
            
            // Update display
            this.updateStats();
            this.applyFilters();
            
            // Show success message
            this.showToast(`"${item.title}" removed from favorites`, 'success');
            
        } catch (error) {
            console.error('Failed to remove from favorites:', error);
            this.showToast('Failed to remove from favorites', 'error');
        }
    }

    viewContentDetails(item) {
        if (window.modalComponent) {
            window.modalComponent.showContentModal(item.id);
        }
    }

    async exportFavorites() {
        try {
            const exportData = {
                exported_at: new Date().toISOString(),
                user: window.authService?.getCurrentUser()?.username || 'Anonymous',
                total_count: this.favorites.length,
                favorites: this.favorites.map(item => ({
                    title: item.title,
                    type: item.content_type,
                    rating: item.rating,
                    release_date: item.release_date,
                    genres: item.genre_names,
                    date_added: item.date_added
                }))
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `cinestream-favorites-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showToast('Favorites exported successfully', 'success');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Failed to export favorites', 'error');
        }
    }

    shareCollection() {
        const shareData = {
            title: 'My CineStream Favorites',
            text: `Check out my collection of ${this.favorites.length} favorite movies and TV shows on CineStream!`,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`).then(() => {
                this.showToast('Share link copied to clipboard!', 'success');
            });
        }
    }

    createPlaylist() {
        // Implementation for creating playlists
        this.showToast('Playlist feature coming soon!', 'info');
    }

    getRecommendations() {
        // Navigate to recommendations based on favorites
        window.location.href = '../index.html#recommendations';
    }

    showLoading() {
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('favorites-grid').style.display = 'none';
        document.getElementById('favorites-list').style.display = 'none';
        document.getElementById('favorites-table-container').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading-state').style.display = 'none';
    }

    showEmptyState() {
        document.getElementById('empty-state').style.display = 'block';
        document.getElementById('favorites-grid').style.display = 'none';
        document.getElementById('favorites-list').style.display = 'none';
        document.getElementById('favorites-table-container').style.display = 'none';
    }

    showFavorites() {
        document.getElementById('empty-state').style.display = 'none';
        this.switchView(this.currentView);
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        if (window.modalComponent) {
            window.modalComponent.showToast(message, type);
        }
    }

    async showConfirmation(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content confirmation-modal">
                    <div class="modal-body">
                        <h2>${title}</h2>
                        <p>${message}</p>
                        <div class="confirmation-actions">
                            <button class="btn-secondary" id="cancel-btn">Cancel</button>
                            <button class="btn-danger" id="confirm-btn">Confirm</button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modal-container').appendChild(modal);

            modal.querySelector('#cancel-btn').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            modal.querySelector('#confirm-btn').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
        });
    }
}

// Export for use in other modules
window.FavoritesPageController = FavoritesPageController;