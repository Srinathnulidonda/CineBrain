// Content Grid Component
class ContentGrid {
    constructor(items, options = {}) {
        this.items = items;
        this.options = {
            columns: {
                mobile: 2,
                tablet: 4,
                desktop: 5
            },
            cardSize: 'medium',
            showLoadMore: false,
            loadMoreCallback: null,
            emptyMessage: 'No content found',
            ...options
        };
    }

    render() {
        if (!this.items || this.items.length === 0) {
            return `
                <div class="text-center py-16">
                    <i class="fas fa-film text-6xl text-text-muted mb-4"></i>
                    <p class="text-text-secondary">${this.options.emptyMessage}</p>
                </div>
            `;
        }

        const gridCols = {
            mobile: `grid-cols-${this.options.columns.mobile}`,
            tablet: `md:grid-cols-${this.options.columns.tablet}`,
            desktop: `lg:grid-cols-${this.options.columns.desktop}`
        };

        return `
            <div class="content-grid">
                <div class="grid ${gridCols.mobile} ${gridCols.tablet} ${gridCols.desktop} gap-4">
                    ${this.items.map(item => 
                        `<div class="w-full">${new ContentCard(item, {
                            size: this.options.cardSize,
                            showRating: true,
                            showGenres: false
                        }).render()}</div>`
                    ).join('')}
                </div>
                
                ${this.options.showLoadMore ? `
                    <div class="text-center mt-8">
                        <button onclick="ContentGridInstance.loadMore()" 
                                class="bg-netflix-red hover:bg-hover-red px-8 py-3 rounded font-medium transition">
                            Load More
                        </button>
                    </div>
                ` : ''}
                
                <!-- Infinite scroll sentinel -->
                <div class="infinite-scroll-sentinel"></div>
            </div>
        `;
    }

    static loadMore() {
        if (this.options.loadMoreCallback) {
            this.options.loadMoreCallback();
        }
    }
}

const ContentGridInstance = ContentGrid;