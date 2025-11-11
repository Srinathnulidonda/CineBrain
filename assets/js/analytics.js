(function () {
    const GA_ID = 'G-0E63MLYS28';

    // Load GA script dynamically
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());

    // Wait for full page load to capture final title and UTM
    window.addEventListener('load', () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const utm_source = params.get('utm_source') || 'direct';
            const utm_medium = params.get('utm_medium') || 'web';
            const utm_campaign = params.get('utm_campaign') || 'organic';
            const utm_content = params.get('utm_content') || 'default';

            // Fire GA configuration
            gtag('config', GA_ID, {
                page_title: document.title || 'CineBrain',
                page_path: window.location.pathname + window.location.search,
                page_location: window.location.href,
                send_page_view: false // we’ll send it manually below
            });

            // Send manual page_view event including UTM parameters
            gtag('event', 'page_view', {
                page_title: document.title || 'CineBrain',
                page_location: window.location.href,
                page_path: window.location.pathname + window.location.search,
                source: utm_source,
                medium: utm_medium,
                campaign: utm_campaign,
                content: utm_content
            });

            console.log(`🎬 CineBrain Analytics Sent:
  🔹 Source: ${utm_source}
  🔹 Medium: ${utm_medium}
  🔹 Campaign: ${utm_campaign}
  🔹 Title: ${document.title}`);

        } catch (err) {
            console.error('⚠️ CineBrain Analytics error:', err);
        }
    });
})();
