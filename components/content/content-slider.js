// Content Slider Component
class ContentSlider {
    constructor(title, items, options = {}) {
        this.id = Utils.generateId();
        this.title = title;
        this.items = items;
        this.options = {
            cardSize: 'medium',
            showViewAll: true,
            viewAllLink: '/browse',
            ...options
        };
    }

    render() {
        if (!this.items || this.items.length === 0) {
            return '';
        }

        return `
            <section class="content-slider mb-8">
                <!-- Header -->
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl md:text-2xl font-bold">${this.title}</h2>
                    ${this.options.showViewAll ? `
                        <a href="${this.options.viewAllLink}" class="text-sm text-text-secondary hover:text-netflix-red transition">
                            View All <i class="fas fa-chevron-right ml-1"></i>
                        </a>
                    ` : ''}
                </div>

                <!-- Slider Container -->
                <div class="relative">
                    <!-- Previous Button -->
                    <button onclick="ContentSliderInstance.slide('${this.id}', 'prev')" 
                            class="slider-nav-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition opacity-0 hover:opacity-100">
                        <i class="fas fa-chevron-left"></i>
                    </button>

                    <!-- Slider -->
                    <div id="${this.id}" class="slider-container overflow-x-auto scrollbar-hide">
                        <div class="flex space-x-4 pb-4">
                            ${this.items.map(item => 
                                new ContentCard(item, {
                                    size: this.options.cardSize,
                                    lazyLoad: true
                                }).render()
                            ).join('')}
                        </div>
                    </div>

                    <!-- Next Button -->
                    <button onclick="ContentSliderInstance.slide('${this.id}', 'next')" 
                            class="slider-nav-next absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition opacity-0 hover:opacity-100">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </section>
        `;
    }

    static slide(sliderId, direction) {
        const container = document.getElementById(sliderId);
        if (!container) return;

        const scrollAmount = container.offsetWidth * 0.8;
        const currentScroll = container.scrollLeft;

        if (direction === 'next') {
            container.scrollTo({
                left: currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        } else {
            container.scrollTo({
                left: currentScroll - scrollAmount,
                behavior: 'smooth'
            });
        }
    }
}

// Create global instance for event handlers
const ContentSliderInstance = ContentSlider;