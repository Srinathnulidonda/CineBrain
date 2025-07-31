// Base class for language pages
class LanguageBasePage {
    constructor(languageCode, languageName) {
        this.languageCode = languageCode;
        this.languageName = languageName;
        this.currentType = 'all';
        this.currentPage = 1;
    }

    init() {
        this.setupTypeFilters();
        this.loadContent();
    }

    setupTypeFilters() {
        document.querySelectorAll('.type-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentType = e.target.dataset.type;
                this.switchActiveTypeFilter(e.target);
                this.loadContent();
            });
        });
    }

    switchActiveTypeFilter(activeBtn) {
        document.querySelectorAll('.type-filter-btn').forEach(btn =>
            btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    switchActiveTab(activeBtn) {
        document.querySelectorAll('.tab-button').forEach(btn =>
            btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    async loadContent() {
        const container = document.getElementById('content-grid');
        UIComponents.showLoading(container);

        try {
            const response = await ApiService.getRegionalContent(this.languageCode, this.currentType, 24);
            this.renderContent(response.recommendations, container);
        } catch (error) {
            UIComponents.showError(container, `Failed to load ${this.languageName} content`);
        }
    }

    renderContent(items, container) {
        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                ${items.map(item => UIComponents.createContentCard(item).outerHTML).join('')}
            </div>
        `;
    }

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('last-updated').textContent = timeString;
    }

    startRealTimeUpdates() {
        // Update content every 10 minutes
        setInterval(() => {
            this.loadContent();
            this.updateLastUpdated();
        }, 10 * 60 * 1000);
    }
}