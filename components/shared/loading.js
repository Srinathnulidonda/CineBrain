// Loading Component
class Loading {
    static show(message = 'Loading...') {
        const existing = document.getElementById('global-loading');
        if (existing) return;

        const loader = document.createElement('div');
        loader.id = 'global-loading';
        loader.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';
        loader.innerHTML = `
            <div class="bg-secondary-bg rounded-lg p-8 flex flex-col items-center">
                <div class="loader mb-4"></div>
                <p class="text-text-secondary">${message}</p>
            </div>
        `;
        
        document.body.appendChild(loader);
    }

    static hide() {
        const loader = document.getElementById('global-loading');
        if (loader) {
            loader.remove();
        }
    }

    static skeleton(count = 1, type = 'card') {
        const skeletons = {
            card: `
                <div class="skeleton-card w-40 md:w-48 flex-shrink-0">
                    <div class="bg-card-bg rounded-lg overflow-hidden">
                        <div class="aspect-[2/3] bg-secondary-bg animate-pulse"></div>
                        <div class="p-3">
                            <div class="h-4 bg-secondary-bg rounded animate-pulse mb-2"></div>
                            <div class="h-3 bg-secondary-bg rounded animate-pulse w-2/3"></div>
                        </div>
                    </div>
                </div>
            `,
            row: `
                <div class="skeleton-row bg-card-bg rounded-lg p-4 mb-4">
                    <div class="flex items-center space-x-4">
                        <div class="w-16 h-16 bg-secondary-bg rounded animate-pulse"></div>
                        <div class="flex-1">
                            <div class="h-4 bg-secondary-bg rounded animate-pulse mb-2 w-1/3"></div>
                            <div class="h-3 bg-secondary-bg rounded animate-pulse w-1/2"></div>
                        </div>
                    </div>
                </div>
            `,
            text: `
                <div class="skeleton-text">
                    <div class="h-4 bg-secondary-bg rounded animate-pulse mb-2"></div>
                    <div class="h-4 bg-secondary-bg rounded animate-pulse mb-2 w-5/6"></div>
                    <div class="h-4 bg-secondary-bg rounded animate-pulse w-2/3"></div>
                </div>
            `
        };

        return Array(count).fill(skeletons[type]).join('');
    }
}

// Add loading styles to CSS
const style = document.createElement('style');
style.textContent = `
    .loader {
        width: 48px;
        height: 48px;
        border: 4px solid var(--border-color);
        border-top-color: var(--netflix-red);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);