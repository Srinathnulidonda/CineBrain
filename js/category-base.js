// Base class for category pages
class CategoryBasePage {
    constructor(categoryType, categoryName) {
        this.categoryType = categoryType;
        this.categoryName = categoryName;
        this.currentType = 'all';
        this.currentPage = 1;
        this.loading = false;
    }

    init() {
        this.setupTypeFilters();
        this.setupInfiniteScroll();
        this.loadContent();
    }

    setupTypeFilters() {
        document.querySelectorAll('.type-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentType = e.target.dataset.type;
                this.switchActiveTypeFilter(e.target);
                this.currentPage = 1;
                this.loadContent();
            });
        });
    }

    switchActiveTypeFilter(activeBtn) {
        document.querySelectorAll('.type-filter-btn').forEach(btn =>
            btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    switchActiveTab(activeBtn) {
        document.querySelectorAll('.tab-button').forEach(btn =>
            btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    renderContent(items, container) {
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4';

        items.forEach(item => {
            const card = UIComponents.createContentCard(item);
            grid.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(grid);

        // Show load more button if there are enough items
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = items.length >= 20 ? 'block' : 'none';
        }
    }

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const element = document.getElementById('last-updated');
        if (element) {
            element.textContent = timeString;
        }
    }

    setupInfiniteScroll() {
        window.addEventListener('scroll', () => {
            if (this.loading) return;

            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

            if (scrollTop + clientHeight >= scrollHeight - 1000) {
                this.loadMoreContent();
            }
        });
    }

    async loadMoreContent() {
        if (this.loading) return;

        this.loading = true;
        this.currentPage++;

        try {
            // This would be implemented by each specific category page
            console.log(`Loading more ${this.categoryType} content, page ${this.currentPage}`);
        } catch (error) {
            console.error('Failed to load more content:', error);
        } finally {
            this.loading = false;
        }
    }
}