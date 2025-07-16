// Optimized Carousel Component
class Carousel {
    constructor(items, options = {}) {
        this.items = items;
        this.currentIndex = 0;
        this.intervalId = null;
        this.options = {
            autoPlay: true,
            interval: 5000,
            showIndicators: true,
            showControls: true,
            height: '70vh',
            ...options
        };
        this.id = Utils.generateId();
    }

    render() {
        if (!this.items?.length) return '';

        return `
            <div id="${this.id}" class="carousel relative overflow-hidden" style="height: ${this.options.height}">
                <!-- Slides -->
                <div class="carousel-track flex transition-transform duration-500 h-full">
                    ${this.items.map((item, index) => this.renderSlide(item, index)).join('')}
                </div>
                
                ${this.options.showControls ? this.renderControls() : ''}
                ${this.options.showIndicators ? this.renderIndicators() : ''}
            </div>
        `;
    }

    renderSlide(item, index) {
        const backdropUrl = Utils.getImageUrl(item.backdrop_path, 'backdrop', 'large');
        
        return `
            <div class="carousel-slide flex-shrink-0 w-full h-full relative" data-index="${index}">
                <img src="${backdropUrl}" alt="${item.title}" 
                     class="w-full h-full object-cover"
                     loading="${index === 0 ? 'eager' : 'lazy'}">
                <div class="absolute inset-0 bg-gradient-to-t from-primary-bg via-primary-bg/50 to-transparent">
                    <div class="container mx-auto px-4 h-full flex items-end pb-16">
                        <div class="max-w-2xl">
                            <h2 class="text-3xl md:text-5xl font-bold mb-4">${item.title}</h2>
                            <p class="text-lg text-text-secondary mb-6 line-clamp-3">
                                ${item.overview || ''}
                            </p>
                            <button onclick="window.location.href='/content/${item.id}'" 
                                    class="bg-netflix-red hover:bg-hover-red px-6 py-3 rounded font-medium transition">
                                <i class="fas fa-info-circle mr-2"></i>More Info
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderControls() {
        return `
            <button onclick="CarouselInstance.prev('${this.id}')" 
                    class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button onclick="CarouselInstance.next('${this.id}')" 
                    class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    renderIndicators() {
        return `
            <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
                ${this.items.map((_, index) => `
                    <button onclick="CarouselInstance.goTo('${this.id}', ${index})" 
                            class="w-2 h-2 rounded-full transition-all ${index === 0 ? 'w-8 bg-netflix-red' : 'bg-white/50'}"></button>
                `).join('')}
            </div>
        `;
    }

    init() {
        if (this.options.autoPlay) {
            this.startAutoPlay();
        }
    }

    startAutoPlay() {
        this.intervalId = setInterval(() => {
            this.next(this.id);
        }, this.options.interval);
    }

    stopAutoPlay() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    static next(carouselId) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        
        const track = carousel.querySelector('.carousel-track');
        const slides = carousel.querySelectorAll('.carousel-slide');
        const currentIndex = parseInt(carousel.dataset.currentIndex || 0);
        const nextIndex = (currentIndex + 1) % slides.length;
        
        this.updateCarousel(carousel, track, nextIndex);
    }

    static prev(carouselId) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        
        const track = carousel.querySelector('.carousel-track');
        const slides = carousel.querySelectorAll('.carousel-slide');
        const currentIndex = parseInt(carousel.dataset.currentIndex || 0);
        const prevIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
        
        this.updateCarousel(carousel, track, prevIndex);
    }

    static goTo(carouselId, index) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        
        const track = carousel.querySelector('.carousel-track');
        this.updateCarousel(carousel, track, index);
    }

    static updateCarousel(carousel, track, index) {
        carousel.dataset.currentIndex = index;
        track.style.transform = `translateX(-${index * 100}%)`;
        
        // Update indicators
        const indicators = carousel.querySelectorAll('.absolute.bottom-8 button');
        indicators.forEach((indicator, i) => {
            if (i === index) {
                indicator.classList.add('w-8', 'bg-netflix-red');
                indicator.classList.remove('bg-white/50');
            } else {
                indicator.classList.remove('w-8', 'bg-netflix-red');
                indicator.classList.add('bg-white/50');
            }
        });
    }
}

const CarouselInstance = Carousel;