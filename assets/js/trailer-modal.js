// Trailer Modal Component for CineBrain Details Page
class TrailerModal {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.modal = null;
        this.iframe = null;
        this.isOpen = false;
        this.currentTrailer = null;

        this.init();
    }

    init() {
        this.createModal();
        this.setupEventListeners();

        // Register with theme manager if available
        if (window.themeManager) {
            window.themeManager.register((theme) => this.onThemeChange(theme));
        }
    }

    onThemeChange(theme) {
        // Modal automatically inherits theme through CSS variables
        console.log('Trailer modal theme updated to:', theme);
    }

    createModal() {
        // Create modal HTML structure
        const modalHTML = `
            <div class="modal fade" id="trailerModal" tabindex="-1" aria-labelledby="trailerModalLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
                <div class="modal-dialog modal-dialog-centered modal-xl">
                    <div class="modal-content trailer-modal-content">
                        <div class="modal-header trailer-modal-header">
                            <h5 class="modal-title" id="trailerModalLabel">
                                <i data-feather="play-circle"></i>
                                <span class="trailer-title">Watch Trailer</span>
                            </h5>
                            <button type="button" class="btn-close trailer-close-btn" data-bs-dismiss="modal" aria-label="Close">
                                <i data-feather="x"></i>
                            </button>
                        </div>
                        <div class="modal-body trailer-modal-body">
                            <div class="trailer-container">
                                <div class="trailer-loading" id="trailerLoading">
                                    <div class="trailer-spinner"></div>
                                    <p>Loading trailer...</p>
                                </div>
                                <div class="trailer-error" id="trailerError" style="display: none;">
                                    <i data-feather="alert-circle"></i>
                                    <h4>Unable to Load Trailer</h4>
                                    <p>The trailer is currently unavailable. Please try again later.</p>
                                    <button class="btn btn-primary trailer-retry-btn" id="trailerRetry">
                                        <i data-feather="refresh-cw"></i>
                                        Retry
                                    </button>
                                </div>
                                <div class="trailer-iframe-container" id="trailerIframeContainer" style="display: none;">
                                    <iframe 
                                        id="trailerIframe"
                                        class="trailer-iframe"
                                        frameborder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen
                                        title="Movie Trailer">
                                    </iframe>
                                </div>
                            </div>
                            <div class="trailer-info" id="trailerInfo" style="display: none;">
                                <div class="trailer-meta">
                                    <span class="trailer-quality">HD</span>
                                    <span class="trailer-source">YouTube</span>
                                </div>
                                <div class="trailer-controls">
                                    <button class="trailer-control-btn" id="trailerFullscreen" title="Fullscreen">
                                        <i data-feather="maximize"></i>
                                    </button>
                                    <button class="trailer-control-btn" id="trailerShare" title="Share">
                                        <i data-feather="share-2"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get modal references
        this.modal = new bootstrap.Modal(document.getElementById('trailerModal'), {
            backdrop: true,
            keyboard: true,
            focus: true
        });

        this.iframe = document.getElementById('trailerIframe');

        // Add custom CSS
        this.addStyles();
    }

    addStyles() {
        const styles = `
            <style id="trailer-modal-styles">
                /* Trailer Modal Styles */
                .trailer-modal-content {
                    background: var(--card-bg);
                    border: 1px solid var(--content-border);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .trailer-modal-header {
                    background: var(--card-bg);
                    border-bottom: 1px solid var(--content-border);
                    padding: 1rem 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .trailer-modal-header .modal-title {
                    color: var(--text-primary);
                    font-weight: 600;
                    font-size: 1.1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                }

                .trailer-modal-header .modal-title svg {
                    width: 20px;
                    height: 20px;
                    stroke: var(--cinebrain-primary);
                }

                .trailer-close-btn {
                    background: var(--retry-btn-bg);
                    border: 1px solid var(--retry-btn-border);
                    border-radius: 6px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    padding: 0;
                }

                .trailer-close-btn:hover {
                    background: var(--retry-btn-hover-bg);
                    transform: scale(1.05);
                }

                .trailer-close-btn svg {
                    width: 16px;
                    height: 16px;
                    stroke: var(--text-primary);
                }

                .trailer-modal-body {
                    padding: 0;
                    background: #000;
                }

                .trailer-container {
                    position: relative;
                    width: 100%;
                    padding-bottom: 56.25%; /* 16:9 aspect ratio */
                    background: #000;
                }

                .trailer-loading,
                .trailer-error {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #000;
                    color: white;
                    text-align: center;
                    padding: 2rem;
                }

                .trailer-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-top-color: var(--cinebrain-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                .trailer-error svg {
                    width: 48px;
                    height: 48px;
                    stroke: #ff6b6b;
                    margin-bottom: 1rem;
                }

                .trailer-error h4 {
                    color: white;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                }

                .trailer-error p {
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 1.5rem;
                }

                .trailer-retry-btn {
                    background: var(--cinebrain-primary);
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    color: white;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.3s ease;
                }

                .trailer-retry-btn:hover {
                    background: var(--cinebrain-primary-light);
                    transform: translateY(-1px);
                }

                .trailer-iframe-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                }

                .trailer-iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                }

                .trailer-info {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .trailer-container:hover .trailer-info {
                    opacity: 1;
                }

                .trailer-meta {
                    display: flex;
                    gap: 0.5rem;
                }

                .trailer-quality,
                .trailer-source {
                    background: rgba(0, 0, 0, 0.6);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .trailer-controls {
                    display: flex;
                    gap: 0.5rem;
                }

                .trailer-control-btn {
                    background: rgba(0, 0, 0, 0.6);
                    border: none;
                    border-radius: 4px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .trailer-control-btn:hover {
                    background: rgba(0, 0, 0, 0.8);
                    transform: scale(1.1);
                }

                .trailer-control-btn svg {
                    width: 16px;
                    height: 16px;
                    stroke: white;
                }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .modal-xl {
                        max-width: 95%;
                    }
                    
                    .trailer-modal-header {
                        padding: 0.75rem 1rem;
                    }
                    
                    .trailer-modal-header .modal-title {
                        font-size: 1rem;
                    }
                    
                    .trailer-info {
                        padding: 0.75rem;
                        opacity: 1; /* Always show on mobile */
                    }
                }

                @media (max-width: 480px) {
                    .modal-xl {
                        max-width: 98%;
                        margin: 0.5rem;
                    }
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;

        if (!document.getElementById('trailer-modal-styles')) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }

    setupEventListeners() {
        const modalElement = document.getElementById('trailerModal');

        // Modal event listeners
        modalElement.addEventListener('shown.bs.modal', () => {
            this.isOpen = true;
            this.onModalShown();
        });

        modalElement.addEventListener('hidden.bs.modal', () => {
            this.isOpen = false;
            this.onModalHidden();
        });

        // Retry button
        document.getElementById('trailerRetry')?.addEventListener('click', () => {
            this.retryLoading();
        });

        // Control buttons
        document.getElementById('trailerFullscreen')?.addEventListener('click', () => {
            this.requestFullscreen();
        });

        document.getElementById('trailerShare')?.addEventListener('click', () => {
            this.shareTrailer();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isOpen) {
                switch (e.code) {
                    case 'Escape':
                        this.close();
                        break;
                    case 'Space':
                        e.preventDefault();
                        this.togglePlayPause();
                        break;
                    case 'KeyF':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.requestFullscreen();
                        }
                        break;
                }
            }
        });
    }

    /**
     * Open trailer modal with YouTube video
     * @param {Object} trailerData - Trailer information
     * @param {string} trailerData.youtube_id - YouTube video ID
     * @param {string} trailerData.title - Video title
     * @param {string} trailerData.thumbnail - Thumbnail URL
     */
    open(trailerData) {
        if (!trailerData || !trailerData.youtube_id) {
            this.showError('No trailer available');
            return;
        }

        this.currentTrailer = trailerData;

        // Update modal title
        const titleElement = document.querySelector('.trailer-title');
        if (titleElement) {
            titleElement.textContent = trailerData.title || 'Watch Trailer';
        }

        // Show modal
        this.modal.show();

        // Load trailer after modal is shown
        setTimeout(() => {
            this.loadTrailer(trailerData);
        }, 300);
    }

    loadTrailer(trailerData) {
        this.showLoading();

        try {
            // Construct YouTube embed URL with optimal parameters
            const embedUrl = this.buildYouTubeUrl(trailerData.youtube_id);

            // Load iframe
            this.iframe.src = embedUrl;

            // Set up iframe load handlers
            this.iframe.onload = () => {
                this.showTrailer();
            };

            this.iframe.onerror = () => {
                this.showError('Failed to load trailer');
            };

            // Fallback timeout
            setTimeout(() => {
                if (this.iframe.src && !this.iframe.contentDocument) {
                    this.showTrailer(); // Assume it loaded
                }
            }, 3000);

        } catch (error) {
            console.error('Error loading trailer:', error);
            this.showError('Failed to load trailer');
        }
    }

    buildYouTubeUrl(videoId) {
        const baseUrl = 'https://www.youtube-nocookie.com/embed/';
        const params = new URLSearchParams({
            autoplay: '1',
            rel: '0',
            modestbranding: '1',
            fs: '1',
            cc_load_policy: '0',
            iv_load_policy: '3',
            autohide: '1',
            enablejsapi: '1',
            origin: window.location.origin
        });

        return `${baseUrl}${videoId}?${params.toString()}`;
    }

    showLoading() {
        document.getElementById('trailerLoading').style.display = 'flex';
        document.getElementById('trailerError').style.display = 'none';
        document.getElementById('trailerIframeContainer').style.display = 'none';
        document.getElementById('trailerInfo').style.display = 'none';
    }

    showTrailer() {
        document.getElementById('trailerLoading').style.display = 'none';
        document.getElementById('trailerError').style.display = 'none';
        document.getElementById('trailerIframeContainer').style.display = 'block';
        document.getElementById('trailerInfo').style.display = 'flex';
    }

    showError(message = 'Unable to load trailer') {
        document.getElementById('trailerLoading').style.display = 'none';
        document.getElementById('trailerIframeContainer').style.display = 'none';
        document.getElementById('trailerInfo').style.display = 'none';

        const errorElement = document.getElementById('trailerError');
        errorElement.style.display = 'flex';

        const errorText = errorElement.querySelector('p');
        if (errorText) {
            errorText.textContent = message;
        }
    }

    retryLoading() {
        if (this.currentTrailer) {
            this.loadTrailer(this.currentTrailer);
        }
    }

    close() {
        this.modal.hide();
    }

    onModalShown() {
        // Focus management for accessibility
        const closeButton = document.querySelector('.trailer-close-btn');
        if (closeButton) {
            closeButton.focus();
        }
    }

    onModalHidden() {
        // Stop video playback by clearing iframe src
        if (this.iframe) {
            this.iframe.src = '';
        }

        // Reset state
        this.currentTrailer = null;
        this.showLoading();

        // Return focus to trigger element if available
        const triggerElement = document.querySelector('[data-trailer-trigger]');
        if (triggerElement) {
            triggerElement.focus();
        }
    }

    togglePlayPause() {
        // Send postMessage to YouTube iframe to toggle play/pause
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(
                '{"event":"command","func":"pauseVideo","args":""}',
                '*'
            );
        }
    }

    requestFullscreen() {
        const container = document.getElementById('trailerIframeContainer');
        if (container) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
        }
    }

    shareTrailer() {
        if (!this.currentTrailer) return;

        const shareData = {
            title: this.currentTrailer.title || 'Watch this trailer',
            text: `Check out this trailer on CineBrain!`,
            url: `https://www.youtube.com/watch?v=${this.currentTrailer.youtube_id}`
        };

        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareData.url).then(() => {
                // Show toast notification if available
                if (window.topbar?.notificationSystem) {
                    window.topbar.notificationSystem.show('Trailer link copied to clipboard!', 'success');
                }
            }).catch(console.error);
        }
    }

    /**
     * Static method to open trailer from anywhere in the app
     * @param {Object} trailerData - Trailer data
     */
    static openTrailer(trailerData) {
        if (!window.trailerModal) {
            window.trailerModal = new TrailerModal();
        }
        window.trailerModal.open(trailerData);
    }

    /**
     * Extract YouTube ID from various YouTube URL formats
     * @param {string} url - YouTube URL
     * @returns {string|null} - YouTube video ID
     */
    static extractYouTubeId(url) {
        if (!url) return null;

        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/,
            /youtube\.com\/.*[?&]v=([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }
}

// Initialize trailer modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on a page that needs it
    if (document.querySelector('#contentDetails')) {
        window.trailerModal = new TrailerModal();
        console.log('Trailer modal initialized');
    }
});

// Make TrailerModal available globally
window.TrailerModal = TrailerModal;