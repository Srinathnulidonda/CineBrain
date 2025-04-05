/**
 * Realtime Trailer Modal Component - Ultimate Version
 * Feature-rich, responsive, and highly customizable trailer player
 * Integrated with backend API for real-time data
 * 
 * Key Features:
 * - Real-time trailer fetching from backend
 * - Advanced YouTube player with error fallbacks
 * - Similar trailers carousel
 * - Volume control, fullscreen, share, quality selector
 * - Dark mode support
 * - Accessibility features (ARIA, keyboard nav)
 * - Smooth animations and transitions
 * - Performance optimizations (lazy loading)
 * 
 * Backend: https://backend-app-970m.onrender.com
 */

const RealtimeTrailerModal = (function () {
    'use strict';

    // Configuration
    const config = {
        apiBaseUrl: 'https://backend-app-970m.onrender.com/api',
        modalId: 'realtime-trailer-modal',
        playerId: 'realtime-trailer-player',
        overlayClass: 'rt-trailer-overlay',
        modalClass: 'rt-trailer-modal-content',
        closeButtonClass: 'rt-trailer-close',
        titleClass: 'rt-trailer-title',
        minWidth: 200,
        minHeight: 200,
        autoplay: 1,
        muted: 0,
        controls: 1,
        fullscreen: 1,
        animationDuration: 300,
        zIndex: 10000,
        cacheTimeout: 300000, // 5 minutes
        retryAttempts: 3,
        retryDelay: 1000,
        fallbackToYouTube: true,
        lazyLoadThreshold: 50, // pixels before viewport
        darkMode: true,
        accessibility: true,
        keyboardShortcuts: true,
        shareEnabled: true,
        qualitySelector: true,
        volumeControl: true,
        miniPlayer: true,
        pictureInPicture: true
    };

    // State
    let isInitialized = false;
    let player = null;
    let currentVideoId = null;
    let modal = null;
    let overlay = null;
    let isYouTubeAPIReady = false;
    let currentRequest = null;
    let lastContentData = null;
    let currentVolume = 100;
    let isMuted = false;
    let isDarkMode = true;
    let isFullscreen = false;
    let currentQuality = 'auto';
    let isMiniPlayer = false;
    let intersectionObserver = null;
    let performanceMonitor = null;

    /**
     * Performance monitoring
     */
    const PerformanceMonitor = {
        metrics: {
            loadTime: 0,
            apiCallTime: 0,
            renderTime: 0,
            interactionTime: 0
        },

        start(metric) {
            this[`${metric}Start`] = performance.now();
        },

        end(metric) {
            if (this[`${metric}Start`]) {
                this.metrics[`${metric}Time`] = performance.now() - this[`${metric}Start`];
                console.debug(`Performance: ${metric} took ${this.metrics[`${metric}Time`].toFixed(2)}ms`);
            }
        },

        getMetrics() {
            return this.metrics;
        }
    };

    /**
     * Cache manager for performance optimization
     */
    const CacheManager = {
        cache: new Map(),

        set(key, value, ttl = config.cacheTimeout) {
            const expiry = Date.now() + ttl;
            this.cache.set(key, { value, expiry });
        },

        get(key) {
            const item = this.cache.get(key);
            if (!item) return null;

            if (Date.now() > item.expiry) {
                this.cache.delete(key);
                return null;
            }

            return item.value;
        },

        clear() {
            this.cache.clear();
        }
    };

    /**
     * API Service with caching - FIXED URL PATHS
     */
    const APIService = {
        async getContentDetails(contentId) {
            const cacheKey = `content_${contentId}`;
            const cached = CacheManager.get(cacheKey);
            if (cached) return cached;

            try {
                PerformanceMonitor.start('apiCall');
                // Fixed: No double /api/
                const response = await this.fetchWithRetry(
                    `${config.apiBaseUrl}/content/${contentId}`
                );
                PerformanceMonitor.end('apiCall');
                CacheManager.set(cacheKey, response);
                return response;
            } catch (error) {
                console.error('Failed to fetch content details:', error);
                throw error;
            }
        },

        async searchContent(query, contentType = 'multi', page = 1) {
            const cacheKey = `search_${query}_${contentType}_${page}`;
            const cached = CacheManager.get(cacheKey);
            if (cached) return cached;

            try {
                const params = new URLSearchParams({
                    query: query,
                    type: contentType,
                    page: page
                });

                // Fixed: No double /api/
                const response = await this.fetchWithRetry(
                    `${config.apiBaseUrl}/search?${params}`
                );
                CacheManager.set(cacheKey, response, 60000); // Cache for 1 minute
                return response;
            } catch (error) {
                console.error('Search failed:', error);
                throw error;
            }
        },

        async getTrending(category = 'all', limit = 20) {
            const cacheKey = `trending_${category}_${limit}`;
            const cached = CacheManager.get(cacheKey);
            if (cached) return cached;

            try {
                const params = new URLSearchParams({
                    category: category,
                    limit: limit,
                    language_priority: 'true'
                });

                // Fixed: No double /api/
                const response = await this.fetchWithRetry(
                    `${config.apiBaseUrl}/recommendations/trending?${params}`
                );
                CacheManager.set(cacheKey, response);
                return response;
            } catch (error) {
                console.error('Failed to fetch trending:', error);
                throw error;
            }
        },

        async getSimilarContent(contentId, limit = 10) {
            const cacheKey = `similar_${contentId}_${limit}`;
            const cached = CacheManager.get(cacheKey);
            if (cached) return cached;

            try {
                const params = new URLSearchParams({
                    limit: limit,
                    strict_mode: 'true',
                    min_similarity: 0.5
                });

                // Fixed: No double /api/
                const response = await this.fetchWithRetry(
                    `${config.apiBaseUrl}/recommendations/similar/${contentId}?${params}`
                );
                CacheManager.set(cacheKey, response);
                return response;
            } catch (error) {
                console.error('Failed to fetch similar content:', error);
                throw error;
            }
        },

        async getUpcoming(region = 'IN', categories = 'movies,tv,anime') {
            try {
                const params = new URLSearchParams({
                    region: region,
                    categories: categories,
                    use_cache: 'true',
                    include_analytics: 'true'
                });

                // Fixed: No double /api/
                const response = await this.fetchWithRetry(
                    `${config.apiBaseUrl}/upcoming-sync?${params}`
                );
                return response;
            } catch (error) {
                console.error('Failed to fetch upcoming:', error);
                throw error;
            }
        },

        async fetchWithRetry(url, options = {}, attempt = 1) {
            if (currentRequest) {
                currentRequest.abort();
            }

            const controller = new AbortController();
            currentRequest = controller;

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                currentRequest = null;
                return data;

            } catch (error) {
                currentRequest = null;

                if (error.name === 'AbortError') {
                    throw error;
                }

                if (attempt < config.retryAttempts) {
                    console.log(`Retrying request (attempt ${attempt + 1})...`);
                    await new Promise(resolve =>
                        setTimeout(resolve, config.retryDelay * attempt)
                    );
                    return this.fetchWithRetry(url, options, attempt + 1);
                }

                throw error;
            }
        }
    };

    /**
     * Create the enhanced modal HTML structure
     */
    function createModalStructure() {
        if (document.getElementById(config.modalId)) {
            modal = document.getElementById(config.modalId);
            return;
        }

        modal = document.createElement('div');
        modal.id = config.modalId;
        modal.className = 'rt-trailer-modal-container';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'rt-trailer-title');

        modal.innerHTML = `
            <div class="${config.overlayClass}" role="presentation"></div>
            <div class="${config.modalClass}" role="document">
                <div class="rt-trailer-header">
                    <div class="rt-trailer-info">
                        <h3 id="rt-trailer-title" class="${config.titleClass}"></h3>
                        <div class="rt-trailer-meta" aria-label="Video metadata"></div>
                    </div>
                    <div class="rt-trailer-controls">
                        ${config.shareEnabled ? `
                        <button class="rt-control-btn rt-share-btn" 
                                aria-label="Share trailer"
                                title="Share">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                        </button>
                        ` : ''}
                        
                        ${config.miniPlayer ? `
                        <button class="rt-control-btn rt-mini-btn" 
                                aria-label="Mini player"
                                title="Mini player">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                                <polyline points="17 2 12 7 7 2"></polyline>
                            </svg>
                        </button>
                        ` : ''}
                        
                        ${config.pictureInPicture ? `
                        <button class="rt-control-btn rt-pip-btn" 
                                aria-label="Picture in Picture"
                                title="Picture in Picture">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <rect x="9" y="9" width="10" height="8" rx="1" ry="1"></rect>
                            </svg>
                        </button>
                        ` : ''}
                        
                        <button class="rt-control-btn rt-dark-mode-btn" 
                                aria-label="Toggle dark mode"
                                title="Toggle dark mode">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="5"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                            </svg>
                        </button>
                        
                        <button class="${config.closeButtonClass}" 
                                aria-label="Close trailer"
                                title="Close (Esc)">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="rt-trailer-video-wrapper">
                    <div id="${config.playerId}"></div>
                    
                    ${config.volumeControl ? `
                    <div class="rt-custom-controls">
                        <div class="rt-volume-control">
                            <button class="rt-volume-btn" aria-label="Toggle mute">
                                <svg class="volume-high" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
                                <svg class="volume-muted" style="display:none;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <line x1="23" y1="9" x2="17" y2="15"></line>
                                    <line x1="17" y1="9" x2="23" y2="15"></line>
                                </svg>
                            </button>
                            <input type="range" 
                                   class="rt-volume-slider" 
                                   min="0" 
                                   max="100" 
                                   value="100"
                                   aria-label="Volume slider">
                            <span class="rt-volume-value">100%</span>
                        </div>
                        
                        ${config.qualitySelector ? `
                        <div class="rt-quality-selector">
                            <button class="rt-quality-btn" aria-label="Quality settings">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M12 23v-6m0-6V5m-4.22 13.22l-4.24-4.24M22.46 22.46l-4.24-4.24"></path>
                                </svg>
                                <span class="rt-quality-label">Auto</span>
                            </button>
                            <div class="rt-quality-menu" role="menu" aria-label="Quality options">
                                <button data-quality="auto" class="active">Auto</button>
                                <button data-quality="1080">1080p HD</button>
                                <button data-quality="720">720p HD</button>
                                <button data-quality="480">480p</button>
                                <button data-quality="360">360p</button>
                                <button data-quality="240">240p</button>
                            </div>
                        </div>
                        ` : ''}
                        
                        <button class="rt-fullscreen-btn" aria-label="Toggle fullscreen">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <polyline points="9 21 3 21 3 15"></polyline>
                                <line x1="21" y1="3" x2="14" y2="10"></line>
                                <line x1="3" y1="21" x2="10" y2="14"></line>
                            </svg>
                        </button>
                    </div>
                    ` : ''}
                </div>
                
                <div class="rt-trailer-additional">
                    <div class="rt-similar-trailers" role="region" aria-label="Similar trailers"></div>
                </div>
                
                ${config.keyboardShortcuts ? `
                <div class="rt-keyboard-shortcuts" role="region" aria-label="Keyboard shortcuts">
                    <button class="rt-shortcuts-toggle" aria-label="Show keyboard shortcuts">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="14" width="20" height="7" rx="2" ry="2"></rect>
                            <path d="M5 17h2m2 0h2m2 0h2m2 0h2"></path>
                        </svg>
                    </button>
                    <div class="rt-shortcuts-menu" hidden>
                        <h4>Keyboard Shortcuts</h4>
                        <dl>
                            <dt>Space</dt><dd>Play/Pause</dd>
                            <dt>F</dt><dd>Fullscreen</dd>
                            <dt>M</dt><dd>Mute/Unmute</dd>
                            <dt>↑/↓</dt><dd>Volume</dd>
                            <dt>←/→</dt><dd>Seek</dd>
                            <dt>Esc</dt><dd>Close</dd>
                            <dt>P</dt><dd>Picture in Picture</dd>
                            <dt>D</dt><dd>Dark Mode</dd>
                        </dl>
                    </div>
                </div>
                ` : ''}
                
                ${config.shareEnabled ? `
                <div class="rt-share-panel" hidden role="dialog" aria-label="Share options">
                    <h4>Share Trailer</h4>
                    <div class="rt-share-options">
                        <button class="rt-share-copy" data-share="copy">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy Link
                        </button>
                        <button class="rt-share-twitter" data-share="twitter">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                            </svg>
                            Twitter
                        </button>
                        <button class="rt-share-facebook" data-share="facebook">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                            </svg>
                            Facebook
                        </button>
                        <button class="rt-share-whatsapp" data-share="whatsapp">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            WhatsApp
                        </button>
                    </div>
                    <button class="rt-share-close" aria-label="Close share panel">×</button>
                </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        overlay = modal.querySelector(`.${config.overlayClass}`);
        attachEventListeners();
    }

    /**
     * Create and inject enhanced CSS styles
     */
    function injectStyles() {
        if (document.getElementById('rt-trailer-modal-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'rt-trailer-modal-styles';
        styles.textContent = `
            /* Base styles */
            .rt-trailer-modal-container {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: ${config.zIndex};
                opacity: 0;
                transition: opacity ${config.animationDuration}ms ease-in-out;
            }

            .rt-trailer-modal-container.active {
                display: block;
                opacity: 1;
            }

            .${config.overlayClass} {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }

            .${config.modalClass} {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                width: 90%;
                max-width: 1200px;
                max-height: 90vh;
                background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
                transition: transform ${config.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            /* Light mode styles */
            .rt-trailer-modal-container.light-mode .${config.modalClass} {
                background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
                border-color: rgba(0, 0, 0, 0.1);
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
            }

            .rt-trailer-modal-container.light-mode .rt-trailer-header {
                background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%);
            }

            .rt-trailer-modal-container.light-mode .${config.titleClass},
            .rt-trailer-modal-container.light-mode .rt-trailer-meta {
                color: #333;
                text-shadow: none;
            }

            .rt-trailer-modal-container.light-mode .rt-control-btn {
                background: rgba(0, 0, 0, 0.05);
                border-color: rgba(0, 0, 0, 0.1);
                color: #333;
            }

            .rt-trailer-modal-container.light-mode .rt-control-btn:hover {
                background: rgba(0, 0, 0, 0.1);
            }

            /* Mini player mode */
            .rt-trailer-modal-container.mini-player .${config.modalClass} {
                position: fixed;
                top: auto;
                bottom: 20px;
                right: 20px;
                left: auto;
                transform: none;
                width: 400px;
                height: 250px;
                max-height: none;
            }

            .rt-trailer-modal-container.mini-player .rt-trailer-header {
                padding: 10px;
            }

            .rt-trailer-modal-container.mini-player .rt-trailer-additional {
                display: none;
            }

            .rt-trailer-modal-container.active .${config.modalClass} {
                transform: translate(-50%, -50%) scale(1);
            }

            .rt-trailer-modal-container.mini-player.active .${config.modalClass} {
                transform: none;
            }

            /* Header styles */
            .rt-trailer-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 20px 24px;
                background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10;
            }

            .rt-trailer-info {
                flex: 1;
                margin-right: 15px;
            }

            .${config.titleClass} {
                margin: 0;
                color: #fff;
                font-size: 20px;
                font-weight: 700;
                text-shadow: 0 2px 8px rgba(0,0,0,0.8);
                line-height: 1.3;
            }

            .rt-trailer-meta {
                margin-top: 6px;
                color: rgba(255, 255, 255, 0.7);
                font-size: 14px;
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }

            .rt-trailer-meta span {
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .rt-trailer-meta .rating {
                color: #ffd700;
                font-weight: 600;
            }

            /* Control buttons */
            .rt-trailer-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .rt-control-btn,
            .${config.closeButtonClass} {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                flex-shrink: 0;
            }

            .rt-control-btn:hover,
            .${config.closeButtonClass}:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.1);
                border-color: rgba(255, 255, 255, 0.4);
            }

            .${config.closeButtonClass}:hover {
                transform: rotate(90deg) scale(1.1);
            }

            /* Video wrapper */
            .rt-trailer-video-wrapper {
                position: relative;
                padding-bottom: 56.25%;
                height: 0;
                overflow: hidden;
                background: #000;
            }

            .rt-trailer-video-wrapper iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 0;
            }

            /* Custom controls */
            .rt-custom-controls {
                position: absolute;
                bottom: 20px;
                left: 20px;
                right: 20px;
                display: flex;
                align-items: center;
                gap: 20px;
                background: linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%);
                padding: 15px;
                border-radius: 12px;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 15;
            }

            .rt-trailer-video-wrapper:hover .rt-custom-controls {
                opacity: 1;
            }

            /* Volume control */
            .rt-volume-control {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .rt-volume-btn {
                background: none;
                border: none;
                color: #fff;
                cursor: pointer;
                padding: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .rt-volume-slider {
                width: 100px;
                height: 4px;
                -webkit-appearance: none;
                appearance: none;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                outline: none;
                transition: height 0.2s ease;
            }

            .rt-volume-slider:hover {
                height: 6px;
            }

            .rt-volume-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #fff;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .rt-volume-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            }

            .rt-volume-value {
                color: #fff;
                font-size: 12px;
                min-width: 35px;
                text-align: right;
            }

            /* Quality selector */
            .rt-quality-selector {
                position: relative;
            }

            .rt-quality-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                padding: 8px 12px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .rt-quality-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .rt-quality-label {
                font-size: 14px;
                font-weight: 500;
            }

            .rt-quality-menu {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 8px 0;
                margin-bottom: 10px;
                display: none;
                min-width: 120px;
                backdrop-filter: blur(10px);
            }

            .rt-quality-menu.active {
                display: block;
            }

            .rt-quality-menu button {
                display: block;
                width: 100%;
                padding: 8px 16px;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.8);
                text-align: left;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 14px;
            }

            .rt-quality-menu button:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            .rt-quality-menu button.active {
                color: #e50914;
                font-weight: 600;
            }

            /* Fullscreen button */
            .rt-fullscreen-btn {
                margin-left: auto;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                padding: 8px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .rt-fullscreen-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.1);
            }

            /* Share panel */
            .rt-share-panel {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 24px;
                z-index: 20;
                backdrop-filter: blur(10px);
                min-width: 320px;
            }

            .rt-share-panel h4 {
                margin: 0 0 20px 0;
                color: #fff;
                font-size: 18px;
                text-align: center;
            }

            .rt-share-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }

            .rt-share-options button {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: #fff;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 14px;
            }

            .rt-share-options button:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }

            .rt-share-twitter:hover {
                background: #1da1f2 !important;
                border-color: #1da1f2 !important;
            }

            .rt-share-facebook:hover {
                background: #1877f2 !important;
                border-color: #1877f2 !important;
            }

            .rt-share-whatsapp:hover {
                background: #25d366 !important;
                border-color: #25d366 !important;
            }

            .rt-share-close {
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
            }

            /* Keyboard shortcuts */
            .rt-keyboard-shortcuts {
                position: absolute;
                bottom: 20px;
                right: 20px;
                z-index: 15;
            }

            .rt-shortcuts-toggle {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                padding: 8px;
                border-radius: 8px;
                cursor: pointer;
                backdrop-filter: blur(10px);
            }

            .rt-shortcuts-menu {
                position: absolute;
                bottom: 100%;
                right: 0;
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 10px;
                min-width: 200px;
                backdrop-filter: blur(10px);
            }

            .rt-shortcuts-menu h4 {
                margin: 0 0 12px 0;
                color: #fff;
                font-size: 14px;
                font-weight: 600;
            }

            .rt-shortcuts-menu dl {
                margin: 0;
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 8px 16px;
            }

            .rt-shortcuts-menu dt {
                color: #e50914;
                font-weight: 600;
                font-size: 12px;
            }

            .rt-shortcuts-menu dd {
                margin: 0;
                color: rgba(255, 255, 255, 0.8);
                font-size: 12px;
            }

            /* Loading state */
            .rt-trailer-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
            }

            .rt-trailer-loading-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid rgba(255, 255, 255, 0.1);
                border-top-color: #e50914;
                border-radius: 50%;
                animation: rt-spin 1s linear infinite;
                margin: 0 auto 15px;
            }

            .rt-trailer-loading-text {
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                font-weight: 500;
            }

            @keyframes rt-spin {
                to { transform: rotate(360deg); }
            }

            /* Error state */
            .rt-trailer-error {
                color: #ff4444;
                text-align: center;
                padding: 60px 20px;
                background: rgba(255, 68, 68, 0.1);
                border-radius: 12px;
                margin: 20px;
                border: 1px solid rgba(255, 68, 68, 0.3);
            }

            .rt-trailer-error h4 {
                margin: 0 0 10px 0;
                font-size: 20px;
                font-weight: 600;
            }

            .rt-trailer-error p {
                margin: 0;
                color: rgba(255, 255, 255, 0.7);
                font-size: 14px;
                line-height: 1.5;
            }

            .rt-trailer-error button {
                margin-top: 20px;
                padding: 10px 24px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .rt-trailer-error button:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }

            /* No trailer available */
            .rt-no-trailer {
                padding: 60px 20px;
                text-align: center;
                color: rgba(255, 255, 255, 0.6);
            }

            .rt-no-trailer-icon {
                font-size: 64px;
                margin-bottom: 15px;
                opacity: 0.3;
            }

            .rt-no-trailer h4 {
                margin: 0 0 10px 0;
                font-size: 18px;
                color: rgba(255, 255, 255, 0.8);
            }

            .rt-no-trailer p {
                margin: 0 0 20px 0;
                font-size: 14px;
            }

            .rt-alternative-options {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .rt-youtube-search-btn,
            .rt-close-modal-btn {
                padding: 10px 20px;
                border-radius: 8px;
                border: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .rt-youtube-search-btn {
                background: #ff0000;
                color: white;
            }

            .rt-youtube-search-btn:hover {
                background: #cc0000;
                transform: translateY(-2px);
            }

            .rt-close-modal-btn {
                background: rgba(255,255,255,0.1);
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
            }

            .rt-close-modal-btn:hover {
                background: rgba(255,255,255,0.2);
            }

            /* Similar trailers section */
            .rt-trailer-additional {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.5s ease;
                background: rgba(0, 0, 0, 0.3);
            }

            .rt-trailer-additional.active {
                max-height: 300px;
                padding: 20px;
            }

            .rt-similar-trailers {
                display: flex;
                gap: 15px;
                overflow-x: auto;
                padding-bottom: 10px;
            }

            .rt-similar-trailer-item {
                flex: 0 0 150px;
                cursor: pointer;
                transition: transform 0.3s ease;
                position: relative;
            }

            .rt-similar-trailer-item:hover {
                transform: scale(1.05);
            }

            .rt-similar-trailer-item img {
                width: 100%;
                height: 85px;
                object-fit: cover;
                border-radius: 8px;
                loading: lazy;
            }

            .rt-similar-trailer-item .title {
                color: #fff;
                font-size: 12px;
                margin-top: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .rt-similar-trailer-item .play-icon {
                position: absolute;
                top: 35px;
                left: 50%;
                transform: translateX(-50%);
                width: 30px;
                height: 30px;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .rt-similar-trailer-item:hover .play-icon {
                opacity: 1;
            }

            /* Notification styles */
            .rt-notification {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #4CAF50;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                z-index: ${config.zIndex + 1};
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from {
                    transform: translate(-50%, 100%);
                    opacity: 0;
                }
                to {
                    transform: translate(-50%, 0);
                    opacity: 1;
                }
            }

            @keyframes slideDown {
                from {
                    transform: translate(-50%, 0);
                    opacity: 1;
                }
                to {
                    transform: translate(-50%, 100%);
                    opacity: 0;
                }
            }

            /* Accessibility focus styles */
            .rt-control-btn:focus,
            .${config.closeButtonClass}:focus,
            button:focus {
                outline: 2px solid #e50914;
                outline-offset: 2px;
            }

            /* Skip to content link for screen readers */
            .rt-skip-link {
                position: absolute;
                top: -40px;
                left: 0;
                background: #000;
                color: #fff;
                padding: 8px;
                text-decoration: none;
                z-index: 100;
            }

            .rt-skip-link:focus {
                top: 0;
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .rt-trailer-modal-container,
                .${config.modalClass},
                .rt-control-btn,
                .${config.closeButtonClass} {
                    transition: none !important;
                    animation: none !important;
                }
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .${config.modalClass} {
                    width: 100%;
                    height: 100%;
                    max-height: 100vh;
                    border-radius: 0;
                }

                .rt-trailer-header {
                    padding: 16px;
                }

                .${config.titleClass} {
                    font-size: 18px;
                }

                .rt-trailer-meta {
                    font-size: 12px;
                    gap: 10px;
                }

                .rt-control-btn,
                .${config.closeButtonClass} {
                    width: 36px;
                    height: 36px;
                }

                .rt-trailer-controls {
                    gap: 4px;
                }

                .rt-custom-controls {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 10px;
                }

                .rt-volume-control {
                    width: 100%;
                }

                .rt-volume-slider {
                    flex: 1;
                }

                .rt-quality-selector {
                    width: 100%;
                }

                .rt-quality-btn {
                    width: 100%;
                    justify-content: center;
                }

                .rt-share-options {
                    grid-template-columns: 1fr;
                }

                .rt-trailer-additional.active {
                    max-height: 200px;
                    padding: 15px;
                }

                .rt-keyboard-shortcuts {
                    display: none;
                }

                .rt-trailer-modal-container.mini-player .${config.modalClass} {
                    width: calc(100% - 20px);
                    right: 10px;
                    bottom: 10px;
                    height: 200px;
                }
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .${config.modalClass} {
                    border: 2px solid #fff;
                }

                .rt-control-btn,
                .${config.closeButtonClass} {
                    border-width: 2px;
                }

                .rt-trailer-error {
                    border-width: 2px;
                }
            }

            /* Print styles */
            @media print {
                .rt-trailer-modal-container {
                    display: none !important;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * Initialize lazy loading for similar trailers
     */
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: `${config.lazyLoadThreshold}px`
            });

            return imageObserver;
        }
        return null;
    }

    /**
     * Load YouTube IFrame API
     */
    function loadYouTubeAPI() {
        return new Promise((resolve, reject) => {
            if (window.YT && window.YT.Player) {
                isYouTubeAPIReady = true;
                resolve();
                return;
            }

            window.onYouTubeIframeAPIReady = function () {
                isYouTubeAPIReady = true;
                resolve();
            };

            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            tag.onerror = reject;
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        });
    }

    /**
     * Create YouTube player with advanced features
     */
    function createPlayer(videoId, retryCount = 0) {
        return new Promise((resolve, reject) => {
            if (!isYouTubeAPIReady) {
                reject(new Error('YouTube API not ready'));
                return;
            }

            PerformanceMonitor.start('render');
            showLoading('Loading trailer...');

            try {
                if (player && player.destroy) {
                    player.destroy();
                    player = null;
                }

                player = new YT.Player(config.playerId, {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: {
                        'autoplay': config.autoplay,
                        'mute': config.muted,
                        'controls': config.controls,
                        'rel': 0,
                        'showinfo': 0,
                        'modestbranding': 1,
                        'fs': config.fullscreen,
                        'cc_load_policy': 0,
                        'iv_load_policy': 3,
                        'autohide': 1,
                        'playsinline': 1,
                        'enablejsapi': 1,
                        'origin': window.location.origin
                    },
                    events: {
                        'onReady': function (event) {
                            currentVideoId = videoId;
                            hideLoading();
                            PerformanceMonitor.end('render');
                            initializeCustomControls();
                            resolve(event.target);
                        },
                        'onError': function (event) {
                            handlePlayerError(event.data, videoId, retryCount);
                            reject(new Error(`YouTube player error: ${event.data}`));
                        },
                        'onStateChange': function (event) {
                            handlePlayerStateChange(event.data);
                        }
                    }
                });
            } catch (error) {
                hideLoading();
                PerformanceMonitor.end('render');
                reject(error);
            }
        });
    }

    /**
     * Initialize custom controls
     */
    function initializeCustomControls() {
        if (!config.volumeControl && !config.qualitySelector) return;

        // Volume control
        if (config.volumeControl) {
            const volumeBtn = modal.querySelector('.rt-volume-btn');
            const volumeSlider = modal.querySelector('.rt-volume-slider');
            const volumeValue = modal.querySelector('.rt-volume-value');

            if (volumeBtn && volumeSlider && volumeValue) {
                volumeBtn.addEventListener('click', toggleMute);
                volumeSlider.addEventListener('input', (e) => {
                    const volume = e.target.value;
                    setVolume(volume);
                });
            }
        }

        // Quality selector
        if (config.qualitySelector) {
            const qualityBtn = modal.querySelector('.rt-quality-btn');
            const qualityMenu = modal.querySelector('.rt-quality-menu');

            if (qualityBtn && qualityMenu) {
                qualityBtn.addEventListener('click', () => {
                    qualityMenu.classList.toggle('active');
                });

                qualityMenu.querySelectorAll('button').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const quality = e.target.dataset.quality;
                        setQuality(quality);
                        qualityMenu.classList.remove('active');
                    });
                });
            }
        }

        // Fullscreen button
        const fullscreenBtn = modal.querySelector('.rt-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', toggleFullscreen);
        }
    }

    /**
     * Set volume
     */
    function setVolume(volume) {
        if (player && player.setVolume) {
            player.setVolume(volume);
            currentVolume = volume;
            isMuted = volume == 0;

            const volumeValue = modal.querySelector('.rt-volume-value');
            if (volumeValue) volumeValue.textContent = `${volume}%`;

            const volumeBtn = modal.querySelector('.rt-volume-btn');
            if (volumeBtn) {
                const highIcon = volumeBtn.querySelector('.volume-high');
                const mutedIcon = volumeBtn.querySelector('.volume-muted');
                if (highIcon && mutedIcon) {
                    highIcon.style.display = isMuted ? 'none' : 'block';
                    mutedIcon.style.display = isMuted ? 'block' : 'none';
                }
            }
        }
    }

    /**
     * Toggle mute
     */
    function toggleMute() {
        if (player) {
            if (isMuted) {
                player.unMute();
                setVolume(currentVolume || 100);
            } else {
                player.mute();
                setVolume(0);
            }
        }
    }

    /**
     * Set video quality
     */
    function setQuality(quality) {
        if (player && player.setPlaybackQuality) {
            const qualityMap = {
                'auto': 'auto',
                '1080': 'hd1080',
                '720': 'hd720',
                '480': 'large',
                '360': 'medium',
                '240': 'small'
            };

            player.setPlaybackQuality(qualityMap[quality] || 'auto');
            currentQuality = quality;

            const qualityLabel = modal.querySelector('.rt-quality-label');
            if (qualityLabel) {
                qualityLabel.textContent = quality === 'auto' ? 'Auto' : `${quality}p`;
            }

            // Update active state
            const qualityMenu = modal.querySelector('.rt-quality-menu');
            if (qualityMenu) {
                qualityMenu.querySelectorAll('button').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.quality === quality);
                });
            }
        }
    }

    /**
     * Toggle fullscreen
     */
    function toggleFullscreen() {
        const elem = modal.querySelector(`.${config.modalClass}`);

        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
            isFullscreen = true;
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            isFullscreen = false;
        }
    }

    /**
     * Toggle dark mode
     */
    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        modal.classList.toggle('light-mode', !isDarkMode);

        // Save preference
        localStorage.setItem('rt-trailer-dark-mode', isDarkMode ? 'true' : 'false');
    }

    /**
     * Toggle mini player
     */
    function toggleMiniPlayer() {
        isMiniPlayer = !isMiniPlayer;
        modal.classList.toggle('mini-player', isMiniPlayer);
    }

    /**
     * Toggle Picture in Picture
     */
    async function togglePictureInPicture() {
        const iframe = modal.querySelector('iframe');
        if (!iframe) return;

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                // For YouTube iframes, we need a different approach
                console.log('Picture-in-Picture requested for YouTube video');
            }
        } catch (error) {
            console.error('PiP error:', error);
        }
    }

    /**
     * Share functionality
     */
    function initShareFunctionality() {
        const shareBtn = modal.querySelector('.rt-share-btn');
        const sharePanel = modal.querySelector('.rt-share-panel');
        const shareClose = modal.querySelector('.rt-share-close');

        if (shareBtn && sharePanel) {
            shareBtn.addEventListener('click', () => {
                sharePanel.removeAttribute('hidden');
            });

            if (shareClose) {
                shareClose.addEventListener('click', () => {
                    sharePanel.setAttribute('hidden', '');
                });
            }

            // Share options
            sharePanel.querySelectorAll('[data-share]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const shareType = e.currentTarget.dataset.share;
                    handleShare(shareType);
                });
            });
        }
    }

    /**
     * Handle share action
     */
    function handleShare(type) {
        const url = `https://www.youtube.com/watch?v=${currentVideoId}`;
        const title = modal.querySelector(`.${config.titleClass}`).textContent;

        switch (type) {
            case 'copy':
                navigator.clipboard.writeText(url).then(() => {
                    showNotification('Link copied to clipboard!');
                });
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
                break;
        }
    }

    /**
     * Show notification
     */
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'rt-notification';
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Handle player errors
     */
    function handlePlayerError(errorCode, videoId, retryCount) {
        console.error('YouTube Error:', errorCode);

        switch (errorCode) {
            case 2:
                showErrorMessage('Invalid video ID. Please try another trailer.');
                break;
            case 5:
                if (retryCount < config.retryAttempts) {
                    config.muted = 1;
                    setTimeout(() => createPlayer(videoId, retryCount + 1), config.retryDelay);
                } else {
                    showErrorMessage('Player error occurred. Please try again later.');
                }
                break;
            case 100:
                showFallbackUI(videoId, 'Video not found or has been removed.');
                break;
            case 101:
            case 150:
                showFallbackUI(videoId, 'This video cannot be embedded. Watch on YouTube.');
                break;
            default:
                showErrorMessage(`An unknown error occurred (Code: ${errorCode}).`);
        }
    }

    /**
     * Show fallback UI
     */
    function showFallbackUI(videoId, message) {
        const playerContainer = document.getElementById(config.playerId);
        playerContainer.innerHTML = `
            <div class="rt-trailer-error">
                <h4>Video Unavailable</h4>
                <p>${message}</p>
                <button onclick="window.open('https://www.youtube.com/watch?v=${videoId}', '_blank')">
                    Watch on YouTube
                </button>
            </div>
        `;
    }

    /**
     * Show error message
     */
    function showErrorMessage(message) {
        const playerContainer = document.getElementById(config.playerId);
        playerContainer.innerHTML = `
            <div class="rt-trailer-error">
                <h4>Error</h4>
                <p>${message}</p>
                <button onclick="RealtimeTrailerModal.close()">Close</button>
            </div>
        `;
    }

    /**
     * Handle player state changes
     */
    function handlePlayerStateChange(state) {
        if (state === YT.PlayerState.ENDED) {
            showSimilarTrailers();
        }
    }

    /**
     * Attach event listeners with accessibility support
     */
    function attachEventListeners() {
        const closeButton = modal.querySelector(`.${config.closeButtonClass}`);
        closeButton.addEventListener('click', close);

        overlay.addEventListener('click', close);

        // Enhanced keyboard navigation
        if (config.keyboardShortcuts) {
            document.addEventListener('keydown', handleKeyPress);
        }

        // Dark mode toggle
        const darkModeBtn = modal.querySelector('.rt-dark-mode-btn');
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', toggleDarkMode);
        }

        // Mini player toggle
        const miniBtn = modal.querySelector('.rt-mini-btn');
        if (miniBtn) {
            miniBtn.addEventListener('click', toggleMiniPlayer);
        }

        // Picture in Picture
        const pipBtn = modal.querySelector('.rt-pip-btn');
        if (pipBtn) {
            pipBtn.addEventListener('click', togglePictureInPicture);
        }

        // Share functionality
        initShareFunctionality();

        // Keyboard shortcuts menu
        const shortcutsToggle = modal.querySelector('.rt-shortcuts-toggle');
        const shortcutsMenu = modal.querySelector('.rt-shortcuts-menu');
        if (shortcutsToggle && shortcutsMenu) {
            shortcutsToggle.addEventListener('click', () => {
                shortcutsMenu.toggleAttribute('hidden');
            });
        }

        const modalContent = modal.querySelector(`.${config.modalClass}`);
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Focus trap for accessibility
        setupFocusTrap();
    }

    /**
     * Setup focus trap for accessibility
     */
    function setupFocusTrap() {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }

    /**
     * Handle keyboard events with shortcuts
     */
    function handleKeyPress(e) {
        if (!modal || !modal.classList.contains('active')) return;

        switch (e.key) {
            case 'Escape':
                close();
                break;
            case ' ':
                e.preventDefault();
                if (player) {
                    const state = player.getPlayerState();
                    if (state === YT.PlayerState.PLAYING) {
                        player.pauseVideo();
                    } else {
                        player.playVideo();
                    }
                }
                break;
            case 'f':
            case 'F':
                toggleFullscreen();
                break;
            case 'm':
            case 'M':
                toggleMute();
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (currentVolume < 100) {
                    setVolume(Math.min(100, currentVolume + 10));
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (currentVolume > 0) {
                    setVolume(Math.max(0, currentVolume - 10));
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (player && player.getCurrentTime) {
                    const currentTime = player.getCurrentTime();
                    player.seekTo(Math.max(0, currentTime - 10));
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (player && player.getCurrentTime) {
                    const currentTime = player.getCurrentTime();
                    player.seekTo(currentTime + 10);
                }
                break;
            case 'p':
            case 'P':
                togglePictureInPicture();
                break;
            case 'd':
            case 'D':
                toggleDarkMode();
                break;
        }
    }

    /**
     * Extract video ID from YouTube URL
     */
    function extractVideoId(trailer) {
        if (!trailer) return null;

        if (/^[a-zA-Z0-9_-]{11}$/.test(trailer)) {
            return trailer;
        }

        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
            /^(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = trailer.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Update modal metadata
     */
    function updateModalMetadata(contentData) {
        const titleElement = modal.querySelector(`.${config.titleClass}`);
        const metaElement = modal.querySelector('.rt-trailer-meta');

        titleElement.textContent = contentData.title || 'Trailer';

        const metaInfo = [];

        if (contentData.rating) {
            metaInfo.push(`<span class="rating">⭐ ${contentData.rating.toFixed(1)}</span>`);
        }

        if (contentData.release_date) {
            const year = new Date(contentData.release_date).getFullYear();
            metaInfo.push(`<span>${year}</span>`);
        }

        if (contentData.content_type) {
            const typeLabel = contentData.content_type.charAt(0).toUpperCase() +
                contentData.content_type.slice(1);
            metaInfo.push(`<span>${typeLabel}</span>`);
        }

        if (contentData.genres && contentData.genres.length > 0) {
            const genreText = contentData.genres.slice(0, 3).join(', ');
            metaInfo.push(`<span>${genreText}</span>`);
        }

        metaElement.innerHTML = metaInfo.join('');
    }

    /**
     * Load and display similar content trailers with lazy loading
     */
    async function loadSimilarTrailers(contentId) {
        try {
            const response = await APIService.getSimilarContent(contentId, 6);
            const similarContainer = modal.querySelector('.rt-similar-trailers');

            if (!response || !response.similar_content || response.similar_content.length === 0) {
                return;
            }

            const trailerItems = response.similar_content
                .filter(item => item.youtube_trailer)
                .map(item => {
                    const videoId = extractVideoId(item.youtube_trailer);
                    if (!videoId) return '';

                    return `
                        <div class="rt-similar-trailer-item" 
                             data-video-id="${videoId}"
                             data-title="${item.title}"
                             onclick="RealtimeTrailerModal.switchTrailer('${videoId}', '${item.title.replace(/'/g, "\\'")}')">
                            <img data-src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" 
                                 alt="${item.title}"
                                 loading="lazy"
                                 onerror="this.src='https://via.placeholder.com/150x85?text=No+Image'">
                            <div class="play-icon">▶</div>
                            <div class="title">${item.title}</div>
                        </div>
                    `;
                }).join('');

            if (trailerItems) {
                similarContainer.innerHTML = `
                    <h4 style="color: #fff; margin: 0 0 15px 0; font-size: 16px;">Similar Trailers</h4>
                    <div style="display: flex; gap: 15px; overflow-x: auto;">
                        ${trailerItems}
                    </div>
                `;

                // Initialize lazy loading for images
                if (intersectionObserver) {
                    similarContainer.querySelectorAll('img[data-src]').forEach(img => {
                        intersectionObserver.observe(img);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load similar trailers:', error);
        }
    }

    /**
     * Show similar trailers section
     */
    function showSimilarTrailers() {
        const additionalSection = modal.querySelector('.rt-trailer-additional');
        if (additionalSection) {
            additionalSection.classList.add('active');
        }
    }

    /**
     * Show loading state
     */
    function showLoading(message = 'Loading...') {
        const playerContainer = document.getElementById(config.playerId);
        if (playerContainer) {
            playerContainer.innerHTML = `
                <div class="rt-trailer-loading">
                    <div class="rt-trailer-loading-spinner"></div>
                    <div class="rt-trailer-loading-text">${message}</div>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     */
    function hideLoading() {
        const loading = modal.querySelector('.rt-trailer-loading');
        if (loading) {
            loading.remove();
        }
    }

    /**
     * Open trailer by content ID
     */
    async function openByContentId(contentId, contentType = 'movie') {
        if (!contentId) {
            console.error('Content ID is required');
            return;
        }

        if (!isInitialized) {
            await init();
        }

        PerformanceMonitor.start('load');

        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        document.body.style.overflow = 'hidden';

        try {
            showLoading('Fetching trailer information...');

            const contentData = await APIService.getContentDetails(contentId);

            if (!contentData) {
                throw new Error('Failed to fetch content details');
            }

            lastContentData = contentData;
            updateModalMetadata(contentData);

            const videoId = extractVideoId(contentData.youtube_trailer);

            if (!videoId) {
                await searchAlternativeTrailer(contentData.title);
                return;
            }

            if (!isYouTubeAPIReady) {
                await loadYouTubeAPI();
            }

            try {
                await createPlayer(videoId);
            } catch (playerError) {
                console.error('Player creation failed:', playerError);
            }

            loadSimilarTrailers(contentId);

        } catch (error) {
            console.error('Failed to open trailer:', error);
            showErrorMessage('Unable to load trailer. Please try again.');
        } finally {
            PerformanceMonitor.end('load');
            console.log('Performance metrics:', PerformanceMonitor.getMetrics());
        }
    }

    /**
     * Search for alternative trailer
     */
    async function searchAlternativeTrailer(title) {
        if (!title) return;

        showLoading('Searching for alternative trailer...');

        try {
            const searchQuery = `${title} official trailer`;
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=5&key=AIzaSyDU-JLASTdIdoLOmlpWuJYLTZDUspqw2T4`);

            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        try {
                            await createPlayer(item.id.videoId);
                            return;
                        } catch (error) {
                            console.log('Video not embeddable, trying next...');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error searching for alternative:', error);
        }

        handleNoEmbeddableTrailer(title);
    }

    /**
     * Handle case when no embeddable trailer is found
     */
    function handleNoEmbeddableTrailer(title) {
        const playerContainer = document.getElementById(config.playerId);
        playerContainer.innerHTML = `
            <div class="rt-no-trailer">
                <div class="rt-no-trailer-icon">🎥</div>
                <h4>No Embeddable Trailer Found</h4>
                <p>Unfortunately, no embeddable trailer is available for "${title}"</p>
                <div class="rt-alternative-options">
                    <button class="rt-youtube-search-btn" onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' trailer')}', '_blank')">
                        Search on YouTube
                    </button>
                    <button class="rt-close-modal-btn" onclick="RealtimeTrailerModal.close()">
                        Close
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Switch to a different trailer
     */
    async function switchTrailer(videoId, title) {
        if (!videoId) return;

        try {
            const titleElement = modal.querySelector(`.${config.titleClass}`);
            titleElement.textContent = title || 'Trailer';

            const metaElement = modal.querySelector('.rt-trailer-meta');
            metaElement.innerHTML = '';

            await createPlayer(videoId);

        } catch (error) {
            console.error('Failed to switch trailer:', error);
            showErrorMessage('Failed to load trailer. Please try again.');
        }
    }

    /**
     * Open trending trailer
     */
    async function openTrendingTrailer(index = 0, category = 'all') {
        try {
            showLoading('Loading trending content...');

            const trending = await APIService.getTrending(category, 20);

            let trailerContent = null;

            if (category === 'all' && trending.categories) {
                for (const cat of Object.values(trending.categories)) {
                    if (Array.isArray(cat) && cat.length > index) {
                        trailerContent = cat[index];
                        break;
                    }
                }
            } else if (trending.recommendations) {
                trailerContent = trending.recommendations[index];
            }

            if (trailerContent && trailerContent.id) {
                await openByContentId(trailerContent.id, trailerContent.content_type);
            } else {
                throw new Error('No trending content with trailer found');
            }

        } catch (error) {
            console.error('Failed to open trending trailer:', error);
            showErrorMessage('Failed to load trending trailer.');
        }
    }

    /**
     * Open upcoming release trailer
     */
    async function openUpcomingTrailer(region = 'IN', index = 0) {
        try {
            showLoading('Loading upcoming releases...');

            const upcoming = await APIService.getUpcoming(region);

            if (!upcoming.success || !upcoming.data) {
                throw new Error('Failed to fetch upcoming content');
            }

            let trailerContent = null;
            const categories = ['telugu_priority', 'this_week', 'this_month', 'future'];

            for (const category of categories) {
                if (upcoming.data[category] && upcoming.data[category].length > index) {
                    trailerContent = upcoming.data[category][index];
                    if (trailerContent.youtube_trailer_id) {
                        break;
                    }
                }
            }

            if (trailerContent && trailerContent.youtube_trailer_id) {
                updateModalMetadata({
                    title: trailerContent.title,
                    rating: trailerContent.vote_average,
                    release_date: trailerContent.release_date,
                    content_type: trailerContent.media_type,
                    genres: trailerContent.genres
                });

                await createPlayer(trailerContent.youtube_trailer_id);
            } else {
                throw new Error('No upcoming content with trailer found');
            }

        } catch (error) {
            console.error('Failed to open upcoming trailer:', error);
            showErrorMessage('Failed to load upcoming trailer.');
        }
    }

    /**
     * Search and play trailer
     */
    async function searchAndPlay(query, contentType = 'multi') {
        if (!query) {
            console.error('Search query is required');
            return;
        }

        if (!isInitialized) {
            await init();
        }

        try {
            showLoading('Searching for content...');

            const searchResults = await APIService.searchContent(query, contentType);

            if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
                throw new Error('No results found');
            }

            const contentWithTrailer = searchResults.results.find(item => item.youtube_trailer);

            if (!contentWithTrailer) {
                throw new Error('No trailer available for search results');
            }

            await openByContentId(contentWithTrailer.id, contentWithTrailer.content_type);

        } catch (error) {
            console.error('Search and play failed:', error);
            showErrorMessage('No trailer found for your search.');
        }
    }

    /**
     * Close the modal
     */
    function close() {
        if (!modal) return;

        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
        }

        if (player && player.pauseVideo) {
            player.pauseVideo();
        }

        modal.classList.remove('active');

        setTimeout(() => {
            modal.style.display = 'none';

            if (player && player.destroy) {
                player.destroy();
                player = null;
            }

            currentVideoId = null;
            lastContentData = null;

            const playerContainer = document.getElementById(config.playerId);
            if (playerContainer) {
                playerContainer.innerHTML = '';
            }

            const similarContainer = modal.querySelector('.rt-similar-trailers');
            if (similarContainer) {
                similarContainer.innerHTML = '';
            }

            const additionalSection = modal.querySelector('.rt-trailer-additional');
            if (additionalSection) {
                additionalSection.classList.remove('active');
            }

            // Reset custom controls
            const volumeSlider = modal.querySelector('.rt-volume-slider');
            if (volumeSlider) volumeSlider.value = 100;

            const qualityMenu = modal.querySelector('.rt-quality-menu');
            if (qualityMenu) qualityMenu.classList.remove('active');

            const sharePanel = modal.querySelector('.rt-share-panel');
            if (sharePanel) sharePanel.setAttribute('hidden', '');

        }, config.animationDuration);

        document.body.style.overflow = '';
    }

    /**
     * Initialize the modal
     */
    async function init(customConfig = {}) {
        if (isInitialized) return;

        if (customConfig) {
            Object.assign(config, customConfig);
        }

        // Load dark mode preference
        const savedDarkMode = localStorage.getItem('rt-trailer-dark-mode');
        if (savedDarkMode !== null) {
            isDarkMode = savedDarkMode === 'true';
        }

        injectStyles();
        createModalStructure();

        // Apply dark mode
        if (!isDarkMode) {
            modal.classList.add('light-mode');
        }

        // Initialize lazy loading
        intersectionObserver = initLazyLoading();

        try {
            await loadYouTubeAPI();
        } catch (error) {
            console.warn('YouTube API preload failed, will retry on open', error);
        }

        isInitialized = true;
    }

    /**
     * Destroy the modal
     */
    function destroy() {
        close();

        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
        }

        if (intersectionObserver) {
            intersectionObserver.disconnect();
            intersectionObserver = null;
        }

        document.removeEventListener('keydown', handleKeyPress);

        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }

        const styles = document.getElementById('rt-trailer-modal-styles');
        if (styles && styles.parentNode) {
            styles.parentNode.removeChild(styles);
        }

        CacheManager.clear();

        modal = null;
        overlay = null;
        player = null;
        currentVideoId = null;
        isInitialized = false;
    }

    // Public API
    return {
        init,
        openByContentId,
        searchAndPlay,
        openTrendingTrailer,
        openUpcomingTrailer,
        switchTrailer,
        close,
        destroy,

        // Utility methods
        extractVideoId,

        // Check if modal is open
        isOpen: function () {
            return modal && modal.classList.contains('active');
        },

        // Retry last failed request
        retry: async function () {
            if (lastContentData && lastContentData.id) {
                await openByContentId(lastContentData.id, lastContentData.content_type);
            } else {
                close();
            }
        },

        // Configuration
        setConfig: function (newConfig) {
            Object.assign(config, newConfig);
        },

        // Get performance metrics
        getPerformanceMetrics: function () {
            return PerformanceMonitor.getMetrics();
        },

        // Clear cache
        clearCache: function () {
            CacheManager.clear();
        },

        // Direct API access for advanced usage
        api: APIService
    };
})();

// Make RealtimeTrailerModal globally available
window.RealtimeTrailerModal = RealtimeTrailerModal;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        RealtimeTrailerModal.init().then(() => {
            console.log('RealtimeTrailerModal initialized and ready');
        }).catch(err => {
            console.error('Failed to initialize RealtimeTrailerModal:', err);
        });
    });
} else {
    RealtimeTrailerModal.init().then(() => {
        console.log('RealtimeTrailerModal initialized and ready');
    }).catch(err => {
        console.error('Failed to initialize RealtimeTrailerModal:', err);
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealtimeTrailerModal;
}