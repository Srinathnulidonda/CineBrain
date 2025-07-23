// /js/include.js

/**
 * Dynamically loads an HTML fragment from a file.
 * @param {string} url - The URL of the HTML file to load.
 * @param {string} elementId - The ID of the element to insert the HTML into.
 */
async function loadHTML(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
        // Re-initialize any event listeners that might be in the included HTML
        if (elementId === 'header-placeholder') {
             initHeaderScripts(); // We'll define this in main.js
        }
    } catch (error) {
        console.error('Error loading HTML:', error);
        document.getElementById(elementId).innerHTML = `<p>Error loading ${url}</p>`;
    }
}

// Load header and footer on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    loadHTML('./includes/header.html', 'header-placeholder');
    loadHTML('./includes/footer.html', 'footer-placeholder');
});