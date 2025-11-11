// /assets/js/analytics.js
(function () {
    const GA_ID = "G-0E63MLYS28";

    // Step 1: Load the GA4 script dynamically
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(gtagScript);

    // Step 2: Setup the global gtag function
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;

    // Step 3: Initialize GA
    gtag("js", new Date());

    // Step 4: Send an initial page_view event after load (with UTM tracking)
    window.addEventListener("load", () => {
        const params = new URLSearchParams(window.location.search);
        const utm_source = params.get("utm_source") || "(direct)";
        const utm_medium = params.get("utm_medium") || "(none)";
        const utm_campaign = params.get("utm_campaign") || "(unspecified)";
        const utm_content = params.get("utm_content") || "(none)";

        gtag("config", GA_ID, {
            page_path: window.location.pathname,
            page_location: window.location.href,
            send_page_view: true,
            campaign_source: utm_source,
            campaign_medium: utm_medium,
            campaign_name: utm_campaign,
            campaign_content: utm_content
        });

        console.log(`🎬 CineBrain Analytics sent → source=${utm_source}, medium=${utm_medium}`);
    });
})();
