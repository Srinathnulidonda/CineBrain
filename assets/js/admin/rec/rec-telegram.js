class RecTelegram {
    constructor(recommendationsManager) {
        this.manager = recommendationsManager;
        this.initializeModules();
        this.setupGlobalEventListeners();
        console.log('✅ RecTelegram coordinator initialized');
    }

    initializeModules() {
        // Initialize all sub-modules
        window.recSearch = new RecSearch(this.manager);
        window.recRecommendations = new RecRecommendations(this.manager);
        window.recUpcoming = new RecUpcoming(this.manager);

        // Expose methods for backwards compatibility
        this.setupCompatibilityMethods();
    }

    setupCompatibilityMethods() {
        // Expose commonly used methods on the main RecTelegram class
        this.performContentSearch = () => window.recSearch.performContentSearch();
        this.renderSearchResults = () => window.recSearch.renderSearchResults();
        this.renderRecommendations = () => window.recRecommendations.renderRecommendations();
        this.renderUpcomingRecommendations = () => window.recUpcoming.renderUpcomingRecommendations();
        this.changePage = (page) => window.recSearch.changePage(page);
        this.saveRecommendation = (id) => window.recSearch.saveRecommendation(id);
        this.recommendContent = (id) => window.recSearch.recommendContent(id);
        this.editRecommendation = (id) => window.recRecommendations.editRecommendation(id);
        this.publishRecommendation = (id) => window.recUpcoming.publishRecommendation(id);
        this.sendToTelegram = (id) => window.recRecommendations.sendToTelegram(id);
        this.showEnhancedCreateRecommendationModal = (content) => window.recUpcoming.showEnhancedCreateRecommendationModal(content);
        this.selectPublishTemplate = (template) => window.recUpcoming.selectPublishTemplate(template);
        this.refreshFeatherIcons = () => window.recUtils.refreshFeatherIcons();
    }

    setupGlobalEventListeners() {
        // Global keyboard shortcuts that work across all modules
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        if (this.manager.state.currentTab === 'search' && this.manager.state.searchResults.length > 0) {
                            e.preventDefault();
                            window.recSearch.saveRecommendation(this.manager.state.searchResults[0].id || this.manager.state.searchResults[0].tmdb_id);
                        }
                        break;
                    case 'n':
                        if (this.manager.state.currentTab === 'recommendations') {
                            e.preventDefault();
                            window.recUpcoming.showEnhancedCreateRecommendationModal();
                        }
                        break;
                }
            }
        });
    }

    // Cleanup method
    destroy() {
        // Clean up any global event listeners or resources
        console.log('🗑️ RecTelegram coordinator destroyed');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.recommendationsManager) {
        setTimeout(() => {
            window.recTelegram = new RecTelegram(window.recommendationsManager);
        }, 100);
    }
});

window.addEventListener('beforeunload', () => {
    if (window.recTelegram) {
        window.recTelegram.destroy();
    }
});