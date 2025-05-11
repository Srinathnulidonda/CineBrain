const CineBrainConfig = {
    apiBase: 'https://cinebrain.onrender.com/api',
    posterBase: 'https://image.tmdb.org/t/p/w500',
    backdropBase: 'https://image.tmdb.org/t/p/w1280'
};

window.CineBrainConfig = CineBrainConfig;

window.CineBrainUtils = {
    getProfileURL: function (username) {
        const isLocal = window.location.hostname === '127.0.0.1' ||
            window.location.hostname === 'localhost' ||
            window.location.port === '5500';

        if (isLocal) {
            return `/users/profile.html?username=${username}`;
        } else {
            return `/${username}/profile.html`;
        }
    },

    navigateToProfile: function (username) {
        window.location.href = this.getProfileURL(username);
    },

    isLocalDevelopment: function () {
        return window.location.hostname === '127.0.0.1' ||
            window.location.hostname === 'localhost' ||
            window.location.port === '5500';
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainConfig;
}