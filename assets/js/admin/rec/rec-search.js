class RecSearch {
    constructor(manager) {
        this.manager = manager;
        this.initializeElements();
        this.setupEventListeners();
        console.log('✅ RecSearch module initialized');
    }

    initializeElements() {
        this.elements = {
            contentSearchInput: document.getElementById('contentSearchInput'),
            searchSource: document.getElementById('searchSource'),
            searchType: document.getElementById('searchType'),
            performSearch: document.getElementById('performSearch'),
            searchResultsGrid: document.getElementById('searchResultsGrid'),
            searchResultsContainer: document.getElementById('searchResultsContainer'),
            searchPagination: document.getElementById('searchPagination'),
            resultsCount: document.getElementById('resultsCount'),
            searchClear: document.getElementById('contentSearchClear'),
            resultsSource: document.getElementById('resultsSource'),
            resultsSortBy: document.getElementById('resultsSortBy')
        };
    }

    setupEventListeners() {
        const searchInput = this.elements.contentSearchInput;
        const clearButton = this.elements.searchClear;

        if (searchInput && clearButton) {
            searchInput.addEventListener('input', function () {
                clearButton.style.display = this.value ? 'flex' : 'none';
            });

            clearButton.addEventListener('click', () => {
                searchInput.value = '';
                searchInput.focus();
                clearButton.style.display = 'none';
                this.clearSearch();
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performContentSearch();
                }
            });
        }

        this.elements.contentSearchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performContentSearch();
            }
        });

        this.elements.performSearch?.addEventListener('click', () => {
            this.performContentSearch();
        });

        this.elements.contentSearchInput?.addEventListener('input',
            this.manager.debounce(() => {
                if (this.elements.contentSearchInput.value.length >= 3) {
                    this.performContentSearch();
                }
            }, 500)
        );

        this.elements.searchSource?.addEventListener('change', () => {
            if (this.manager.state.searchQuery) {
                this.performContentSearch();
            }
        });

        this.elements.searchType?.addEventListener('change', () => {
            if (this.manager.state.searchQuery) {
                this.performContentSearch();
            }
        });

        this.elements.resultsSortBy?.addEventListener('change', () => {
            if (this.manager.state.searchResults.length > 0) {
                this.sortSearchResults();
            }
        });

        this.setupCardClickHandlers();
    }

    setupCardClickHandlers() {
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.content-card');
            if (card && !e.target.closest('.action-btn')) {
                e.preventDefault();
                this.handleCardClick(card);
            }
        });

        document.addEventListener('keydown', (e) => {
            const card = e.target.closest('.content-card');
            if (card && (e.key === 'Enter' || e.key === ' ') && !e.target.closest('.action-btn')) {
                e.preventDefault();
                this.handleCardClick(card);
            }
        });
    }

    handleCardClick(card) {
        try {
            card.style.transform = 'scale(0.98)';
            card.style.transition = 'transform 0.1s ease';

            setTimeout(() => {
                card.style.transform = '';

                const contentData = this.extractContentDataFromCard(card);
                if (contentData) {
                    this.navigateToContentDetails(contentData);
                } else {
                    this.manager.showError('Unable to open content details');
                }
            }, 100);
        } catch (error) {
            console.error('Card click error:', error);
            this.manager.showError('Navigation failed');
        }
    }

    extractContentDataFromCard(card) {
        try {
            const contentId = card.dataset.contentId;
            let content = this.manager.state.searchResults.find(c =>
                (c.id || c.tmdb_id || c.mal_id) == contentId
            );

            if (!content) {
                const titleEl = card.querySelector('.card-title');
                const typeEl = card.querySelector('.content-type-badge');
                const yearEl = card.querySelector('.card-year');
                const posterEl = card.querySelector('.card-poster');
                const ratingEl = card.querySelector('.rating-badge span');

                content = {
                    id: contentId || Date.now(),
                    title: titleEl?.textContent?.trim() || 'Unknown',
                    content_type: typeEl?.textContent?.toLowerCase()?.trim() || 'movie',
                    release_date: yearEl?.textContent ? `${yearEl.textContent}-01-01` : null,
                    poster_path: posterEl?.getAttribute('data-src') || posterEl?.src || '',
                    rating: ratingEl?.textContent && ratingEl.textContent !== 'N/A' ?
                        parseFloat(ratingEl.textContent) : null,
                    tmdb_id: card.dataset.tmdbId ? parseInt(card.dataset.tmdbId) : null
                };
            }

            return content;
        } catch (error) {
            console.error('Error extracting content data from card:', error);
            return null;
        }
    }

    navigateToContentDetails(content) {
        try {
            this.showLoadingIndicator();

            let slug = content.slug;

            if (!slug && content.title) {
                slug = this.generateContentSlug(content);
            }

            if (slug && slug.length >= 2) {
                const cleanSlug = slug.replace(/[^a-z0-9\-]/gi, '').toLowerCase();
                if (cleanSlug.length >= 2) {
                    const targetUrl = `/explore/details.html?${encodeURIComponent(cleanSlug)}`;
                    window.location.href = targetUrl;
                    return;
                }
            }

            if (content.id) {
                const fallbackSlug = `content-${content.id}`;
                window.location.href = `/explore/details.html?${encodeURIComponent(fallbackSlug)}`;
                return;
            }

            if (content.title) {
                const titleSlug = this.generateContentSlug(content);
                if (titleSlug) {
                    window.location.href = `/explore/details.html?${encodeURIComponent(titleSlug)}`;
                    return;
                }
            }

            throw new Error('No valid identifier for navigation');

        } catch (error) {
            console.error('Navigation error:', error);
            this.manager.showError('Unable to open content details');
        } finally {
            this.hideLoadingIndicator();
        }
    }

    generateContentSlug(content) {
        try {
            if (!content.title) return '';

            const { cleanTitle, extractedYear } = this.extractYearFromTitle(content.title);
            const finalTitle = cleanTitle || content.title;

            let year = null;
            if (content.release_date) {
                year = window.recUtils.extractYear(content.release_date);
            } else if (extractedYear) {
                year = extractedYear;
            }

            let slug = finalTitle.toLowerCase()
                .trim()
                .replace(/[^\w\s\-']/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');

            if (!slug || slug.length < 2) {
                slug = this.manualSlugify(finalTitle);
            }

            const contentType = content.content_type || 'movie';
            if (contentType === 'anime' && !slug.startsWith('anime-')) {
                slug = `anime-${slug}`;
            } else if (contentType === 'tv' && !slug.startsWith('tv-')) {
                slug = `tv-${slug}`;
            } else if (contentType === 'movie' && slug.length < 10) {
                slug = `movie-${slug}`;
            }

            if (year && (contentType === 'movie' || contentType === 'anime') &&
                year >= 1900 && year <= 2030) {
                slug += `-${year}`;
            }

            if (content.tmdb_id && slug.length < 15) {
                slug += `-${content.tmdb_id}`;
            }

            if (slug.length > 120) {
                const parts = slug.substring(0, 117).split('-');
                if (parts.length > 1) {
                    parts.pop();
                    slug = parts.join('-');
                } else {
                    slug = slug.substring(0, 117);
                }
            }

            return slug || `content-${content.tmdb_id || content.id || Date.now()}`;

        } catch (error) {
            console.error('Slug generation error:', error);
            return `content-${content.tmdb_id || content.id || Date.now()}`;
        }
    }

    extractYearFromTitle(title) {
        try {
            const yearPatterns = [
                /\((\d{4})\)$/,
                /\s(\d{4})$/,
                /-(\d{4})$/,
                /\[(\d{4})\]$/
            ];

            for (const pattern of yearPatterns) {
                const match = title.match(pattern);
                if (match) {
                    const year = parseInt(match[1]);
                    if (year >= 1900 && year <= 2030) {
                        const cleanTitle = title.replace(pattern, '').trim();
                        return { cleanTitle, extractedYear: year };
                    }
                }
            }

            return { cleanTitle: title, extractedYear: null };
        } catch (error) {
            console.error('Year extraction error:', error);
            return { cleanTitle: title, extractedYear: null };
        }
    }

    manualSlugify(text) {
        try {
            if (!text) return '';
            return text.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[-\s]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 70);
        } catch (error) {
            return '';
        }
    }

    async performContentSearch() {
        const query = this.elements.contentSearchInput?.value.trim();
        if (!query || query.length < 2) {
            this.clearSearchResults();
            return;
        }

        const cacheKey = `${query}_${this.elements.searchSource?.value}_${this.manager.state.currentPage}`;
        if (this.manager.cache.searchResults.has(cacheKey)) {
            const cachedData = this.manager.cache.searchResults.get(cacheKey);
            this.manager.state.searchResults = cachedData.results;
            this.manager.state.totalPages = cachedData.totalPages;
            this.renderSearchResults();
            this.updateSearchResultsHeader(cachedData);
            return;
        }

        this.manager.state.searchQuery = query;
        this.manager.state.currentPage = 1;
        this.manager.state.isLoading = true;

        this.showSearchLoading();

        try {
            const source = this.elements.searchSource?.value || 'tmdb';
            const type = this.elements.searchType?.value || 'all';

            const params = new URLSearchParams({
                query: query,
                source: source,
                page: this.manager.state.currentPage
            });

            if (type !== 'all') {
                params.append('type', type);
            }

            const response = await this.manager.makeAuthenticatedRequest(`/api/admin/search?${params}`);

            if (response.ok) {
                const data = await response.json();
                this.manager.state.searchResults = data.results || [];
                this.manager.state.totalPages = data.total_pages || 1;

                this.manager.cache.searchResults.set(cacheKey, {
                    results: this.manager.state.searchResults,
                    totalPages: this.manager.state.totalPages,
                    totalResults: data.total_results || 0
                });

                this.renderSearchResults();
                this.updateSearchResultsHeader(data);

                if (this.elements.searchClear) {
                    this.elements.searchClear.style.display = 'flex';
                }
            }
        } catch (error) {
            console.error('Error performing search:', error);
            this.manager.showError('Search failed. Please try again.');
        } finally {
            this.manager.state.isLoading = false;
            this.hideSearchLoading();
        }
    }

    async changePage(newPage) {
        if (newPage < 1 || newPage > this.manager.state.totalPages) {
            return;
        }

        this.manager.state.currentPage = newPage;
        await this.performContentSearch();
    }

    sortSearchResults() {
        const sortBy = this.elements.resultsSortBy?.value || 'popularity';

        switch (sortBy) {
            case 'popularity':
                this.manager.state.searchResults.sort((a, b) =>
                    (b.popularity || 0) - (a.popularity || 0)
                );
                break;
            case 'rating':
                this.manager.state.searchResults.sort((a, b) =>
                    (b.vote_average || b.rating || 0) - (a.vote_average || a.rating || 0)
                );
                break;
            case 'release_date':
                this.manager.state.searchResults.sort((a, b) => {
                    const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
                    const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
                    return dateB - dateA;
                });
                break;
            case 'title':
                this.manager.state.searchResults.sort((a, b) =>
                    (a.title || a.name || '').localeCompare(b.title || b.name || '')
                );
                break;
        }

        this.renderSearchResults();
    }

    renderSearchResults() {
        if (!this.elements.searchResultsGrid) return;

        if (this.manager.state.searchResults.length === 0) {
            if (this.elements.searchResultsContainer) {
                this.elements.searchResultsContainer.classList.remove('active');
                this.elements.searchResultsGrid.innerHTML = window.recUtils.getEmptyState('search', 'No results found', 'Try different keywords or change search source');
            }
            this.updateTabContainerHeight();
            window.recUtils.refreshFeatherIcons();
            return;
        }

        this.elements.searchResultsGrid.innerHTML = this.manager.state.searchResults.map(content =>
            window.recUtils.createContentCard(content, 'search')
        ).join('');

        if (this.manager.state.totalPages > 1) {
            this.renderSearchPagination();
        }

        this.setupLazyLoadingForCards();

        if (this.elements.searchResultsContainer) {
            this.elements.searchResultsContainer.classList.add('active');
            const header = this.elements.searchResultsContainer.querySelector('.search-results-header');
            if (header) {
                header.style.display = 'flex';
            }
        }

        this.updateTabContainerHeight();
        window.recUtils.refreshFeatherIcons();
    }

    renderSearchPagination() {
        if (!this.elements.searchPagination) return;

        const currentPage = this.manager.state.currentPage;
        const totalPages = this.manager.state.totalPages;

        let paginationHTML = '';

        paginationHTML += `
            <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                    onclick="window.recSearch.changePage(${currentPage - 1})"
                    ${currentPage === 1 ? 'disabled' : ''}>
                <i data-feather="chevron-left"></i>
            </button>
        `;

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" onclick="window.recSearch.changePage(1)">1</button>
            `;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="window.recSearch.changePage(${i})">${i}</button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
            paginationHTML += `
                <button class="pagination-btn" onclick="window.recSearch.changePage(${totalPages})">${totalPages}</button>
            `;
        }

        paginationHTML += `
            <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="window.recSearch.changePage(${currentPage + 1})"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                <i data-feather="chevron-right"></i>
            </button>
        `;

        this.elements.searchPagination.innerHTML = paginationHTML;
        this.elements.searchPagination.style.display = 'flex';
        window.recUtils.refreshFeatherIcons();
    }

    setupLazyLoadingForCards(container = null) {
        const targetContainer = container || this.elements.searchResultsGrid;
        const cards = targetContainer?.querySelectorAll('.content-card img[data-src]');
        if (!cards || cards.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const imgSrc = img.dataset.src;

                    if (imgSrc) {
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            img.src = imgSrc;
                            img.classList.add('loaded');
                        };
                        tempImg.onerror = () => {
                            img.src = this.manager.placeholderImage;
                            img.classList.add('loaded');
                        };
                        tempImg.src = imgSrc;
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: this.manager.isMobile ? '50px' : '100px',
            threshold: 0.01
        });

        cards.forEach(img => observer.observe(img));
    }

    updateSearchResultsHeader(data) {
        if (this.elements.resultsCount) {
            const count = data.total_results || this.manager.state.searchResults.length;
            this.elements.resultsCount.textContent = `${this.manager.formatNumber(count)} results`;
        }

        if (this.elements.resultsSource) {
            const source = this.elements.searchSource?.value || 'TMDB';
            this.elements.resultsSource.textContent = source.toUpperCase();
        }
    }

    showSearchLoading() {
        if (this.elements.searchResultsContainer) {
            this.elements.searchResultsContainer.classList.add('active');

            if (this.elements.searchResultsGrid) {
                this.elements.searchResultsGrid.innerHTML = Array(12).fill(0).map(() => `
                    <div class="skeleton-card">
                        <div class="skeleton skeleton-poster">
                            <div class="skeleton-shimmer"></div>
                        </div>
                        <div class="skeleton-info">
                            <div class="skeleton skeleton-title">
                                <div class="skeleton-shimmer"></div>
                            </div>
                            <div class="skeleton skeleton-meta">
                                <div class="skeleton-shimmer"></div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    hideSearchLoading() {
    }

    clearSearch() {
        if (this.elements.contentSearchInput) {
            this.elements.contentSearchInput.value = '';
            this.elements.contentSearchInput.focus();
        }
        if (this.elements.searchClear) {
            this.elements.searchClear.style.display = 'none';
        }
        this.clearSearchResults();
    }

    clearSearchResults() {
        this.manager.state.searchResults = [];
        this.manager.state.searchQuery = '';
        this.manager.state.currentPage = 1;
        this.manager.state.totalPages = 0;

        if (this.elements.searchResultsContainer) {
            this.elements.searchResultsContainer.classList.remove('active');
        }

        if (this.elements.searchPagination) {
            this.elements.searchPagination.style.display = 'none';
        }

        if (this.elements.searchClear) {
            this.elements.searchClear.style.display = 'none';
        }

        this.updateTabContainerHeight();
    }

    updateTabContainerHeight() {
        const contentTabs = document.querySelector('.content-tabs');
        const activeTabPane = document.querySelector('.tab-pane.active');

        if (contentTabs && activeTabPane) {
            const hasExpandedContent = activeTabPane.querySelector('.active');

            if (hasExpandedContent) {
                contentTabs.classList.add('has-expanded-content');
            } else {
                contentTabs.classList.remove('has-expanded-content');
            }
        }
    }

    showLoadingIndicator() {
        const indicator = document.getElementById('page-loading-indicator');
        if (indicator) {
            indicator.style.transform = 'scaleX(1)';
        }
    }

    hideLoadingIndicator() {
        setTimeout(() => {
            const indicator = document.getElementById('page-loading-indicator');
            if (indicator) {
                indicator.style.transform = 'scaleX(0)';
            }
        }, 300);
    }

    async saveRecommendation(contentId) {
        try {
            const content = this.findContentById(contentId);
            if (!content) {
                this.manager.showError('Content not found');
                return;
            }

            this.manager.state.selectedContent = content;
            if (window.recUpcoming) {
                window.recUpcoming.showEnhancedCreateRecommendationModal(content);
            }

        } catch (error) {
            console.error('Save recommendation error:', error);
            this.manager.showError('Failed to save recommendation');
        }
    }

    async recommendContent(contentId) {
        try {
            const content = this.findContentById(contentId);
            if (!content) {
                this.manager.showError('Content not found');
                return;
            }

            this.manager.state.selectedContent = content;
            if (window.recUpcoming) {
                window.recUpcoming.showEnhancedCreateRecommendationModal(content);
            }

        } catch (error) {
            console.error('Recommend error:', error);
            this.manager.showError('Failed to open recommendation form');
        }
    }

    findContentById(contentId) {
        let content = this.manager.state.searchResults.find(c =>
            (c.id || c.tmdb_id || c.mal_id) == contentId
        );

        if (!content) {
            content = this.manager.state.upcomingRecommendations.find(r =>
                r.content_id == contentId || r.id == contentId)?.content;
        }

        return content;
    }
}

window.recSearch = null;