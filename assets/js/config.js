// config.js - CineBrain API Configuration

const CineBrainConfig = {
    // Main API Base
    apiBase: 'https://cinebrain.onrender.com/api',
    // apiBase: 'http://127.0.0.1:5000/api',

    // Image API Bases
    posterBase: 'https://image.tmdb.org/t/p/w500',
    backdropBase: 'https://image.tmdb.org/t/p/w1280'
};

// Make globally available
window.CineBrainConfig = CineBrainConfig;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainConfig;
}