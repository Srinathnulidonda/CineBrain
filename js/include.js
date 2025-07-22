// Include.js - For loading reusable HTML components
function loadIncludes() {
    // Load header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        fetch('/includes/header.html')
            .then(response => response.text())
            .then(html => {
                headerContainer.innerHTML = html;
                // Execute any scripts in the loaded HTML
                const scripts = headerContainer.querySelectorAll('script');
                scripts.forEach(script => {
                    const newScript = document.createElement('script');
                    newScript.innerHTML = script.innerHTML;
                    document.head.appendChild(newScript);
                });
            })
            .catch(error => console.error('Error loading header:', error));
    }
    
    // Load footer
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        fetch('/includes/footer.html')
            .then(response => response.text())
            .then(html => {
                footerContainer.innerHTML = html;
            })
            .catch(error => console.error('Error loading footer:', error));
    }
}

// Auto-load includes when DOM is ready
document.addEventListener('DOMContentLoaded', loadIncludes);
