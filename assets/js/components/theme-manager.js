class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'dark';
        this.listeners = new Set();
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        this.applyTheme(this.currentTheme, false);

        this.setupKeyboardShortcut();

        this.initialized = true;
    }

    getStoredTheme() {
        return localStorage.getItem('cinebrain-theme');
    }

    register(callback) {
        this.listeners.add(callback);
        callback(this.currentTheme);
    }

    unregister(callback) {
        this.listeners.delete(callback);
    }

    applyTheme(theme, notify = true) {
        if (!['dark', 'light'].includes(theme)) {
            theme = 'dark';
        }

        this.currentTheme = theme;

        const elements = [
            document.documentElement,
            document.body
        ];

        requestAnimationFrame(() => {
            elements.forEach(element => {
                element.setAttribute('data-theme', theme);
                element.setAttribute('data-bs-theme', theme);
                element.dataset.theme = theme;
                element.dataset.bsTheme = theme;
            });

            document.body.offsetHeight;

            localStorage.setItem('cinebrain-theme', theme);

            if (notify) {
                this.notifyListeners(theme);
            }

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        });
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    notifyListeners(theme) {
        requestAnimationFrame(() => {
            this.listeners.forEach(callback => {
                try {
                    callback(theme);
                } catch (error) {
                    console.error('Error notifying theme listener:', error);
                }
            });
        });

        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme },
            bubbles: true
        }));
    }

    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }
}

const themeManager = new ThemeManager();

themeManager.init();

window.themeManager = themeManager;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = themeManager;
}