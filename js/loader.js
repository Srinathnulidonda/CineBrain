// CineBrain Loader Component
class CineBrainLoader {
    constructor() {
        this.loaderElement = null;
        this.loadingTexts = ['LOADING', 'ANALYZING', 'CURATING', 'THINKING'];
        this.textInterval = null;
        this.minLoadTime = 1500;
        this.startTime = Date.now();
        this.contentLoaded = false;
        this.init();
    }

    init() {
        this.createLoader();
        this.createParticles();
        this.animateLoadingText();
        this.trackContentLoading();
    }

    createLoader() {
        const loaderHTML = `
            <div class="loader-overlay" id="cinebrain-loader">
                <div class="particles"></div>
                <div class="vignette"></div>
                
                <div class="loading-container">
                    <h1 class="loader-brand">CineBrain</h1>
                    <p class="loader-tagline">The Mind Behind Your Next Favorite</p>
                    
                    <div class="loading-elements">
                        <!-- Perfect CineBrain Icon: Film Projector with Brain Elements -->
                        <div class="cinema-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <!-- Projector Body -->
                                <rect x="2" y="8" width="12" height="8" rx="2" fill="currentColor" opacity="0.9"/>
                                
                                <!-- Projector Lens -->
                                <circle cx="16" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
                                <circle cx="16" cy="12" r="2.5" fill="currentColor" opacity="0.7"/>
                                <circle cx="16" cy="12" r="1" fill="currentColor"/>
                                
                                <!-- Film Reels (Brain-like) -->
                                <circle cx="5" cy="5" r="2.5" fill="none" stroke="currentColor" stroke-width="1"/>
                                <circle cx="11" cy="5" r="2.5" fill="none" stroke="currentColor" stroke-width="1"/>
                                
                                <!-- Film connecting reels -->
                                <path d="M7.5 5 L8.5 5" stroke="currentColor" stroke-width="1"/>
                                <path d="M5 7.5 L5 8" stroke="currentColor" stroke-width="1"/>
                                <path d="M11 7.5 L11 8" stroke="currentColor" stroke-width="1"/>
                                
                                <!-- Brain-like patterns in reels -->
                                <path d="M4 4.5 Q5 3.5 6 4.5" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>
                                <path d="M10 4.5 Q11 3.5 12 4.5" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>
                                
                                <!-- Projection beam -->
                                <path d="M20 12 L22 10 L22 14 Z" fill="currentColor" opacity="0.5"/>
                                
                                <!-- Control knobs -->
                                <circle cx="4" cy="10" r="0.5" fill="currentColor"/>
                                <circle cx="6" cy="10" r="0.5" fill="currentColor"/>
                                
                                <!-- Lens details -->
                                <circle cx="16" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
                            </svg>
                        </div>
                        
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                    
                    <div class="loading-text">LOADING</div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
        this.loaderElement = document.getElementById('cinebrain-loader');
    }

    createParticles() {
        const particlesContainer = this.loaderElement.querySelector('.particles');
        const particleCount = window.innerWidth <= 768 ? 30 : 60;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 10 + 's';
            particle.style.animationDuration = (Math.random() * 6 + 8) + 's';
            particlesContainer.appendChild(particle);
        }
    }

    animateLoadingText() {
        const loadingText = this.loaderElement.querySelector('.loading-text');
        let currentIndex = 0;

        this.textInterval = setInterval(() => {
            loadingText.style.opacity = '0';
            loadingText.style.transform = 'scale(0.95)';

            setTimeout(() => {
                currentIndex = (currentIndex + 1) % this.loadingTexts.length;
                loadingText.textContent = this.loadingTexts[currentIndex];
                loadingText.style.opacity = '1';
                loadingText.style.transform = 'scale(1)';
            }, 300);
        }, 2800);
    }

    trackContentLoading() {
        window.addEventListener('contentCardsReady', () => {
            this.contentLoaded = true;
            this.checkHideLoader();
        });

        setTimeout(() => {
            const hasContent = document.querySelector('.content-card');
            if (hasContent) {
                this.contentLoaded = true;
                this.checkHideLoader();
            }
        }, 100);

        setTimeout(() => {
            this.hideLoader();
        }, 10000);
    }

    checkHideLoader() {
        const elapsed = Date.now() - this.startTime;
        const remainingTime = Math.max(0, this.minLoadTime - elapsed);

        setTimeout(() => {
            this.hideLoader();
        }, remainingTime);
    }

    hideLoader() {
        if (!this.loaderElement) return;

        if (this.textInterval) {
            clearInterval(this.textInterval);
        }

        this.loaderElement.classList.add('fade-out');

        setTimeout(() => {
            this.loaderElement.classList.add('hidden');
            setTimeout(() => {
                this.loaderElement.remove();
            }, 100);
        }, 600);

        window.dispatchEvent(new Event('loaderHidden'));
    }

    forceHide() {
        this.hideLoader();
    }
}

const cineBrainLoader = new CineBrainLoader();
window.cineBrainLoader = cineBrainLoader;