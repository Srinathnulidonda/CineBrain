// assets/js/analytics.js
(function () {
    // Load Google Analytics gtag script dynamically
    const script = document.createElement('script');
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-0E63MLYS28";
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());

    // Wait until the page is loaded (so correct title, UTM, etc.)
    window.addEventListener('load', () => {
        try {
            // Parse UTM parameters (for Telegram tracking)
            const urlParams = new URLSearchParams(window.location.search);
            const utm_source = urlParams.get('utm_source') || 'direct';
            const utm_medium = urlParams.get('utm_medium') || 'web';
            const utm_campaign = urlParams.get('utm_campaign') || 'organic';
            const utm_content = urlParams.get('utm_content') || 'default';

            // Fire GA page view with rich data
            gtag('config', 'G-0E63MLYS28', {
                page_title: document.title || 'CineBrain',
                page_path: window.location.pathname + window.location.search,
                page_location: window.location.href,
                send_page_view: true,
                campaign: {
                    source: utm_source,
                    medium: utm_medium,
                    name: utm_campaign,
                    content: utm_content
                }
            });

            console.log(`🎬 CineBrain Analytics: GA4 fired successfully! 
Source: ${utm_source}, Medium: ${utm_medium}, Campaign: ${utm_campaign}`);
        } catch (err) {
            console.error('⚠️ CineBrain Analytics error:', err);
        }
    });
})();
