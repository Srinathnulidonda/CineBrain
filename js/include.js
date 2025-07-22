// Dynamic include loader for reusable components
async function loadIncludes() {
    const includeElements = document.querySelectorAll('[id$="-container"]');
    
    for (const element of includeElements) {
        const includeName = element.id.replace('-container', '');
        try {
            const response = await fetch(`/includes/${includeName}.html`);
            if (response.ok) {
                const html = await response.text();
                element.innerHTML = html;
            }
        } catch (error) {
            console.error(`Error loading ${includeName}:`, error);
        }
    }
    
    // Update navigation active state
    updateActiveNavigation();
}

function updateActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}