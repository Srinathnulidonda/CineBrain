// assets/js/analytics.js
(function () {
    const GA_ID = 'G-0E63MLYS28';

    // --- Load Google Analytics (gtag.js) dynamically ---
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(gaScript);

    // --- Initialize Google Analytics ---
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_ID, {
        transport_type: 'beacon',
        anonymize_ip: true, // privacy-friendly
    });

    console.log('🎬 CineBrain Analytics initialized ✅');
})();
