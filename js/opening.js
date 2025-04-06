/**
 * CineBrain Opening Animation
 * Optimized with requestAnimationFrame and reduced reflows
 * @version 2.0.0
 */

(function () {
    'use strict';

    // Skip animation if user prefers reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    // Check if animation was already shown in this session
    if (sessionStorage.getItem('cinebrain-opening-shown')) {
        return;
    }

    // Create and inject optimized styles
    const styles = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #113CCF;
            --primary-light: #1E4FE5;
            --primary-dark: #0A2A9F;
            --accent: #FFD700;
            --white: #FFFFFF;
            --black: #000000;
            --dark-bg: #0E0E0E;
        }

        .cinebrain-opening-container {
            width: 100vw;
            height: 100vh;
            height: 100dvh; /* Dynamic viewport height for mobile */
            display: flex;
            align-items: center;
            justify-content: center;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 999999;
            background: var(--black);
            animation: cinebrain-bg-fade 3s ease-out;
            will-change: background;
            pointer-events: none;
        }

        .cinebrain-logo-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            transform: translateZ(0); /* Hardware acceleration */
        }

        .cinebrain-logo {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            font-size: clamp(60px, 15vw, 100px);
            font-weight: 200;
            letter-spacing: -0.02em;
            color: var(--white);
            opacity: 0;
            animation: cinebrain-fade 3s ease-out forwards;
            will-change: opacity, color, letter-spacing;
        }

        .cinebrain-tagline {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            font-size: clamp(14px, 3vw, 18px);
            font-weight: 300;
            color: var(--white);
            white-space: nowrap;
            margin-top: clamp(18px, 3vh, 20px);
            opacity: 0;
            letter-spacing: 0.08em;
            animation: cinebrain-tagline-fade 3s ease-out 0.5s forwards;
            will-change: opacity, transform, letter-spacing;
        }

        @keyframes cinebrain-fade {
            0% {
                opacity: 0;
                letter-spacing: 0.5em;
            }
            50% {
                opacity: 1;
                letter-spacing: -0.02em;
            }
            100% {
                opacity: 1;
                letter-spacing: -0.02em;
                color: var(--primary);
            }
        }

        @keyframes cinebrain-tagline-fade {
            0% {
                opacity: 0;
                transform: translateY(20px);
                letter-spacing: 0.2em;
            }
            50% {
                opacity: 0.7;
                transform: translateY(0);
                letter-spacing: 0.05em;
            }
            100% {
                opacity: 1;
                transform: translateY(0);
                letter-spacing: 0.05em;
            }
        }

        @keyframes cinebrain-bg-fade {
            0%, 70% {
                background: var(--black);
            }
            100% {
                background: var(--dark-bg);
            }
        }

        @keyframes cinebrain-fadeout {
            0% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .cinebrain-opening-container,
            .cinebrain-logo,
            .cinebrain-tagline {
                animation: none !important;
                opacity: 1 !important;
            }
        }

        /* Ultra-wide screens */
        @media (min-width: 1920px) {
            .cinebrain-logo {
                font-size: 120px;
            }
            .cinebrain-tagline {
                font-size: 22px;
            }
        }
    `;

    // Create and inject style element
    const styleElement = document.createElement('style');
    styleElement.id = 'cinebrain-opening-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    // Create opening animation HTML
    const openingHTML = `
        <div class="cinebrain-opening-container" id="cinebrain-opening" role="presentation" aria-hidden="true">
            <div class="cinebrain-logo-container">
                <div class="cinebrain-logo">CINEBRAIN</div>
                <div class="cinebrain-tagline">the mind behind your next favorite</div>
            </div>
        </div>
    `;

    // Initialize opening animation
    function initOpening() {
        // Use requestAnimationFrame for smooth insertion
        requestAnimationFrame(() => {
            // Insert opening animation at the beginning of body
            document.body.insertAdjacentHTML('afterbegin', openingHTML);

            // Mark as shown in session
            sessionStorage.setItem('cinebrain-opening-shown', 'true');

            // Schedule removal
            scheduleRemoval();
        });
    }

    // Schedule removal with optimized animation
    function scheduleRemoval() {
        const duration = 3500; // Total animation duration
        const fadeOutDuration = 500;

        setTimeout(() => {
            const openingElement = document.getElementById('cinebrain-opening');
            if (openingElement) {
                // Use requestAnimationFrame for smooth animation
                requestAnimationFrame(() => {
                    openingElement.style.animation = `cinebrain-fadeout ${fadeOutDuration}ms ease-out forwards`;

                    setTimeout(() => {
                        requestAnimationFrame(() => {
                            openingElement.remove();
                            // Clean up styles
                            const styleEl = document.getElementById('cinebrain-opening-styles');
                            if (styleEl) {
                                styleEl.remove();
                            }
                        });
                    }, fadeOutDuration);
                });
            }
        }, duration);
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOpening);
    } else {
        initOpening();
    }
})();