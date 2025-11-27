// assets/js/support/help-center.js

class CineBrainHelpCenter {
    constructor() {
        this.apiBase = window.CineBrainConfig?.apiBase || 'https://cinebrain.onrender.com/api';
        this.helpCategories = [];
        this.helpArticles = [];
        this.popularArticles = [];
        this.searchResults = [];
        this.currentSearch = '';
        this.recentSearches = JSON.parse(localStorage.getItem('cinebrain-recent-help-searches') || '[]');
        this.bookmarkedArticles = new Set(JSON.parse(localStorage.getItem('cinebrain-bookmarked-articles') || '[]'));
        this.viewedArticles = new Set(JSON.parse(localStorage.getItem('cinebrain-viewed-articles') || '[]'));

        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        await this.loadHelpContent();
        this.setupSearchFunctionality();
        this.updateCategoryData();
        this.setupAnalytics();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    setupElements() {
        this.helpSearchInput = document.getElementById('helpSearchInput');
        this.categoriesContainer = document.querySelector('.help-categories');
        this.popularArticlesContainer = document.querySelector('.articles-list');
        this.quickLinksContainer = document.querySelector('.links-grid');
    }

    async loadHelpContent() {
        try {
            // Try to load from backend first
            const backendContent = await this.loadFromBackend();

            if (backendContent) {
                this.helpCategories = backendContent.categories || [];
                this.helpArticles = backendContent.articles || [];
                this.popularArticles = backendContent.popular || [];
            } else {
                // Fallback to static content
                this.loadStaticContent();
            }

        } catch (error) {
            console.error('Error loading help content:', error);
            this.loadStaticContent();
        }
    }

    async loadFromBackend() {
        try {
            const response = await fetch(`${this.apiBase}/support/help-center`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('cinebrain_token') && {
                        'Authorization': `Bearer ${localStorage.getItem('cinebrain_token')}`
                    })
                }
            });

            if (response.ok) {
                return await response.json();
            } else if (response.status === 404) {
                return null; // Endpoint doesn't exist yet
            }
        } catch (error) {
            console.warn('Backend help center loading failed:', error);
            return null;
        }
    }

    loadStaticContent() {
        // Static help categories with comprehensive information
        this.helpCategories = [
            {
                id: 1,
                name: 'Getting Started',
                icon: 'help-circle',
                description: 'Learn the basics of using CineBrain, setting up your account, and understanding AI recommendations',
                articleCount: 12,
                slug: 'getting-started',
                color: '#10b981'
            },
            {
                id: 2,
                name: 'Account Management',
                icon: 'settings',
                description: 'Manage your profile, preferences, privacy settings, and subscription details',
                articleCount: 8,
                slug: 'account-management',
                color: '#3b82f6'
            },
            {
                id: 3,
                name: 'AI Recommendations',
                icon: 'cpu',
                description: 'Understand how our recommendation system works and how to improve your suggestions',
                articleCount: 15,
                slug: 'ai-recommendations',
                color: '#8b5cf6'
            },
            {
                id: 4,
                name: 'Mobile App',
                icon: 'smartphone',
                description: 'Get help with the CineBrain mobile app features, notifications, and troubleshooting',
                articleCount: 10,
                slug: 'mobile-app',
                color: '#f59e0b'
            },
            {
                id: 5,
                name: 'Privacy & Security',
                icon: 'shield',
                description: 'Learn about data protection, privacy controls, and keeping your account secure',
                articleCount: 6,
                slug: 'privacy-security',
                color: '#ef4444'
            },
            {
                id: 6,
                name: 'Troubleshooting',
                icon: 'alert-circle',
                description: 'Resolve common issues with playback, loading, search, and other technical problems',
                articleCount: 20,
                slug: 'troubleshooting',
                color: '#f97316'
            }
        ];

        // Comprehensive help articles
        this.helpArticles = [
            // Getting Started
            {
                id: 1,
                title: 'How to Create Your CineBrain Account',
                summary: 'Step-by-step guide to signing up and getting started with personalized recommendations.',
                content: this.getArticleContent('account-creation'),
                category: 'Getting Started',
                categoryId: 1,
                readTime: '3 min read',
                updatedAt: '2 days ago',
                views: 1250,
                helpful: 89,
                tags: ['account', 'signup', 'getting-started'],
                difficulty: 'Beginner',
                slug: 'create-account'
            },
            {
                id: 2,
                title: 'Setting Up Your Preferences',
                summary: 'Customize your language, region, and genre preferences for better recommendations.',
                content: this.getArticleContent('preferences-setup'),
                category: 'Getting Started',
                categoryId: 1,
                readTime: '4 min read',
                updatedAt: '1 week ago',
                views: 980,
                helpful: 76,
                tags: ['preferences', 'languages', 'setup'],
                difficulty: 'Beginner',
                slug: 'setup-preferences'
            },
            {
                id: 3,
                title: 'Understanding CineBrain\'s Interface',
                summary: 'Navigate the CineBrain platform like a pro with this comprehensive interface guide.',
                content: this.getArticleContent('interface-guide'),
                category: 'Getting Started',
                categoryId: 1,
                readTime: '5 min read',
                updatedAt: '3 days ago',
                views: 756,
                helpful: 67,
                tags: ['interface', 'navigation', 'guide'],
                difficulty: 'Beginner',
                slug: 'interface-guide'
            },

            // AI Recommendations
            {
                id: 4,
                title: 'How CineBrain\'s AI Recommendation System Works',
                summary: 'Deep dive into the machine learning algorithms that power our personalized suggestions.',
                content: this.getArticleContent('ai-system'),
                category: 'AI Recommendations',
                categoryId: 3,
                readTime: '6 min read',
                updatedAt: '2 days ago',
                views: 2341,
                helpful: 189,
                tags: ['ai', 'algorithms', 'recommendations'],
                difficulty: 'Intermediate',
                slug: 'how-ai-works'
            },
            {
                id: 5,
                title: 'Improving Your Recommendation Quality',
                summary: 'Learn how to train CineBrain\'s AI to better understand your entertainment preferences.',
                content: this.getArticleContent('improve-recommendations'),
                category: 'AI Recommendations',
                categoryId: 3,
                readTime: '4 min read',
                updatedAt: '1 day ago',
                views: 1876,
                helpful: 134,
                tags: ['recommendations', 'training', 'preferences'],
                difficulty: 'Beginner',
                slug: 'improve-recommendations'
            },

            // Account Management
            {
                id: 6,
                title: 'Managing Your Watchlist',
                summary: 'Create, organize, and manage your personal watchlist for movies, shows, and anime.',
                content: this.getArticleContent('watchlist-management'),
                category: 'Account Management',
                categoryId: 2,
                readTime: '3 min read',
                updatedAt: '4 days ago',
                views: 1432,
                helpful: 112,
                tags: ['watchlist', 'organization', 'features'],
                difficulty: 'Beginner',
                slug: 'manage-watchlist'
            },
            {
                id: 7,
                title: 'Privacy Settings and Data Control',
                summary: 'Understand and control what data CineBrain collects and how it\'s used.',
                content: this.getArticleContent('privacy-settings'),
                category: 'Privacy & Security',
                categoryId: 5,
                readTime: '5 min read',
                updatedAt: '1 week ago',
                views: 890,
                helpful: 78,
                tags: ['privacy', 'data', 'security'],
                difficulty: 'Intermediate',
                slug: 'privacy-settings'
            },

            // Troubleshooting
            {
                id: 8,
                title: 'Fixing Slow Loading and Performance Issues',
                summary: 'Troubleshoot common performance problems and optimize your CineBrain experience.',
                content: this.getArticleContent('performance-troubleshooting'),
                category: 'Troubleshooting',
                categoryId: 6,
                readTime: '4 min read',
                updatedAt: '3 days ago',
                views: 1654,
                helpful: 145,
                tags: ['performance', 'loading', 'troubleshooting'],
                difficulty: 'Intermediate',
                slug: 'performance-issues'
            },
            {
                id: 9,
                title: 'Search Not Working Properly',
                summary: 'Resolve issues with search functionality and improve your content discovery.',
                content: this.getArticleContent('search-troubleshooting'),
                category: 'Troubleshooting',
                categoryId: 6,
                readTime: '3 min read',
                updatedAt: '5 days ago',
                views: 723,
                helpful: 56,
                tags: ['search', 'issues', 'troubleshooting'],
                difficulty: 'Beginner',
                slug: 'search-issues'
            },

            // Mobile App
            {
                id: 10,
                title: 'Getting Started with CineBrain Mobile App',
                summary: 'Download and set up the CineBrain mobile app for on-the-go entertainment discovery.',
                content: this.getArticleContent('mobile-app-setup'),
                category: 'Mobile App',
                categoryId: 4,
                readTime: '4 min read',
                updatedAt: '1 week ago',
                views: 967,
                helpful: 81,
                tags: ['mobile', 'app', 'setup'],
                difficulty: 'Beginner',
                slug: 'mobile-app-setup'
            }
        ];

        // Popular articles (sorted by views and helpfulness)
        this.popularArticles = this.helpArticles
            .sort((a, b) => (b.views + b.helpful * 10) - (a.views + a.helpful * 10))
            .slice(0, 5);
    }

    getArticleContent(type) {
        const contents = {
            'account-creation': `
                <h2>Creating Your CineBrain Account</h2>
                <p>Welcome to CineBrain! Creating an account unlocks personalized AI recommendations and advanced features.</p>
                
                <h3>Step 1: Sign Up</h3>
                <ol>
                    <li>Click "Sign Up" in the top-right corner</li>
                    <li>Enter your email address</li>
                    <li>Create a secure password (8+ characters)</li>
                    <li>Choose a unique username</li>
                    <li>Verify your email address</li>
                </ol>
                
                <h3>Step 2: Initial Setup</h3>
                <ul>
                    <li><strong>Language Preferences:</strong> Select your preferred languages</li>
                    <li><strong>Regional Content:</strong> Choose your region for localized content</li>
                    <li><strong>Favorite Genres:</strong> Pick genres you enjoy</li>
                </ul>
                
                <h3>Step 3: Start Rating</h3>
                <p>Rate at least 10 movies or shows you've watched to help our AI understand your taste!</p>
                
                <div class="help-tip">
                    <strong>Pro Tip:</strong> The more you rate, the better your recommendations become!
                </div>
            `,
            'preferences-setup': `
                <h2>Customizing Your CineBrain Experience</h2>
                
                <h3>Language Settings</h3>
                <p>CineBrain supports multiple languages including:</p>
                <ul>
                    <li>🇮🇳 Telugu, Hindi, Tamil, Kannada, Malayalam</li>
                    <li>🇺🇸 English</li>
                    <li>🌍 Japanese (for anime)</li>
                </ul>
                
                <h3>How to Update Preferences</h3>
                <ol>
                    <li>Go to your Profile Settings</li>
                    <li>Click "Content Preferences"</li>
                    <li>Select your preferred languages</li>
                    <li>Choose favorite genres</li>
                    <li>Set maturity rating filters</li>
                    <li>Save changes</li>
                </ol>
                
                <h3>Regional Content</h3>
                <p>Enable regional content to discover:</p>
                <ul>
                    <li>Bollywood and regional Indian cinema</li>
                    <li>Popular local TV shows</li>
                    <li>Dubbed and subtitled content</li>
                    <li>Festival and award-winning films</li>
                </ul>
            `,
            'ai-system': `
                <h2>Understanding CineBrain's AI Technology</h2>
                
                <h3>How Our AI Works</h3>
                <p>CineBrain uses advanced machine learning algorithms to understand your entertainment preferences:</p>
                
                <h4>1. Collaborative Filtering</h4>
                <ul>
                    <li>Analyzes users with similar tastes</li>
                    <li>Finds patterns in viewing behavior</li>
                    <li>Recommends content liked by similar users</li>
                </ul>
                
                <h4>2. Content-Based Filtering</h4>
                <ul>
                    <li>Analyzes movie/show attributes</li>
                    <li>Matches genres, themes, directors, actors</li>
                    <li>Considers mood and tone</li>
                </ul>
                
                <h4>3. Hybrid Approach</h4>
                <p>We combine multiple techniques for the most accurate recommendations:</p>
                <ul>
                    <li>Deep learning neural networks</li>
                    <li>Natural language processing for reviews</li>
                    <li>Temporal analysis (what you watch when)</li>
                    <li>Regional and cultural preferences</li>
                </ul>
                
                <h3>Continuous Learning</h3>
                <p>Our AI improves with every interaction:</p>
                <ul>
                    <li>Your ratings and reviews</li>
                    <li>Items you add to watchlist</li>
                    <li>Content you skip or dismiss</li>
                    <li>Time spent viewing details</li>
                </ul>
            `,
            'improve-recommendations': `
                <h2>Getting Better Recommendations</h2>
                
                <h3>Rate Content You've Watched</h3>
                <p>The foundation of great recommendations:</p>
                <ul>
                    <li><strong>Rate honestly:</strong> Use the full 1-5 star scale</li>
                    <li><strong>Rate variety:</strong> Include different genres and types</li>
                    <li><strong>Rate regularly:</strong> Update as your tastes change</li>
                </ul>
                
                <h3>Use the Thumbs Up/Down System</h3>
                <p>Quick feedback on recommendations:</p>
                <ul>
                    <li>👍 for recommendations you like</li>
                    <li>👎 for recommendations that miss the mark</li>
                    <li>This helps fine-tune future suggestions</li>
                </ul>
                
                <h3>Update Your Preferences</h3>
                <ul>
                    <li>Regularly review your genre preferences</li>
                    <li>Update language settings as needed</li>
                    <li>Adjust content maturity filters</li>
                </ul>
                
                <h3>Be Active</h3>
                <ul>
                    <li>Create and maintain watchlists</li>
                    <li>Write detailed reviews</li>
                    <li>Explore different content categories</li>
                    <li>Use search to discover new content</li>
                </ul>
                
                <div class="help-warning">
                    <strong>Note:</strong> It may take 1-2 weeks of active use for recommendations to significantly improve.
                </div>
            `,
            'performance-troubleshooting': `
                <h2>Fixing Performance Issues</h2>
                
                <h3>Common Symptoms</h3>
                <ul>
                    <li>Slow page loading</li>
                    <li>Images not loading</li>
                    <li>Search taking too long</li>
                    <li>Recommendations not updating</li>
                </ul>
                
                <h3>Quick Fixes</h3>
                
                <h4>1. Browser Issues</h4>
                <ol>
                    <li><strong>Clear Cache:</strong> Ctrl+Shift+Delete (Chrome/Firefox)</li>
                    <li><strong>Disable Extensions:</strong> Try incognito/private mode</li>
                    <li><strong>Update Browser:</strong> Use the latest version</li>
                    <li><strong>Check Hardware Acceleration:</strong> Enable in browser settings</li>
                </ol>
                
                <h4>2. Connection Issues</h4>
                <ul>
                    <li>Test internet speed (recommended: 5+ Mbps)</li>
                    <li>Try different network (mobile data vs WiFi)</li>
                    <li>Restart router/modem</li>
                    <li>Use Ethernet instead of WiFi if possible</li>
                </ul>
                
                <h4>3. Device Performance</h4>
                <ul>
                    <li>Close unnecessary browser tabs</li>
                    <li>Free up RAM (close other applications)</li>
                    <li>Restart your device</li>
                    <li>Check available storage space</li>
                </ul>
                
                <h3>Advanced Solutions</h3>
                <ul>
                    <li>Flush DNS cache</li>
                    <li>Update graphics drivers</li>
                    <li>Check firewall/antivirus settings</li>
                    <li>Try different DNS servers (8.8.8.8, 1.1.1.1)</li>
                </ul>
            `,
            'search-troubleshooting': `
                <h2>Search Troubleshooting</h2>
                
                <h3>Search Best Practices</h3>
                
                <h4>Effective Search Techniques</h4>
                <ul>
                    <li><strong>Use partial titles:</strong> "Avengers" instead of "Avengers: Endgame"</li>
                    <li><strong>Try alternative names:</strong> Original titles, nicknames</li>
                    <li><strong>Search by cast:</strong> Actor or director names</li>
                    <li><strong>Include year:</strong> "Dune 2021" vs "Dune 1984"</li>
                    <li><strong>Use genres:</strong> "action movies 2023"</li>
                </ul>
                
                <h3>Common Search Issues</h3>
                
                <h4>No Results Found</h4>
                <ol>
                    <li>Check spelling and typos</li>
                    <li>Try simpler search terms</li>
                    <li>Search in different languages</li>
                    <li>Use filters to narrow results</li>
                </ol>
                
                <h4>Wrong Results</h4>
                <ul>
                    <li>Be more specific with titles</li>
                    <li>Include year or additional context</li>
                    <li>Use content type filters (movie/TV/anime)</li>
                </ul>
                
                <h4>Search Not Working</h4>
                <ol>
                    <li>Refresh the page</li>
                    <li>Clear browser cache</li>
                    <li>Try searching from homepage</li>
                    <li>Check internet connection</li>
                </ol>
                
                <h3>Request Missing Content</h3>
                <p>Can't find something? <a href="/support/contact.html">Let us know</a> and we'll add it!</p>
            `
        };

        return contents[type] || '<p>Content not available.</p>';
    }

    setupSearchFunctionality() {
        let searchTimeout;

        this.helpSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentSearch = e.target.value.trim();
                this.performSearch();
            }, 300);
        });

        // Setup search autocomplete
        this.setupSearchAutocomplete();
    }

    setupSearchAutocomplete() {
        const searchContainer = this.helpSearchInput.parentNode;
        const autocompleteDiv = document.createElement('div');
        autocompleteDiv.className = 'help-search-autocomplete';
        autocompleteDiv.style.display = 'none';
        searchContainer.appendChild(autocompleteDiv);

        this.helpSearchInput.addEventListener('focus', () => {
            if (this.recentSearches.length > 0) {
                this.showSearchSuggestions(autocompleteDiv);
            }
        });

        this.helpSearchInput.addEventListener('blur', () => {
            setTimeout(() => {
                autocompleteDiv.style.display = 'none';
            }, 200);
        });
    }

    showSearchSuggestions(container) {
        const suggestions = [
            ...this.recentSearches.slice(0, 3).map(search => ({
                type: 'recent',
                text: search,
                icon: 'clock'
            })),
            ...[
                { type: 'suggestion', text: 'How to improve recommendations', icon: 'trending-up' },
                { type: 'suggestion', text: 'Account settings', icon: 'settings' },
                { type: 'suggestion', text: 'Mobile app download', icon: 'smartphone' },
                { type: 'suggestion', text: 'Privacy controls', icon: 'shield' }
            ].slice(0, 4)
        ];

        container.innerHTML = suggestions.map(suggestion => `
            <div class="search-suggestion" data-text="${suggestion.text}">
                <i data-feather="${suggestion.icon}"></i>
                <span>${suggestion.text}</span>
                ${suggestion.type === 'recent' ? '<i data-feather="x" class="remove-recent"></i>' : ''}
            </div>
        `).join('');

        container.style.display = 'block';

        // Add event listeners
        container.querySelectorAll('.search-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const text = suggestion.dataset.text;
                this.helpSearchInput.value = text;
                this.currentSearch = text;
                this.performSearch();
                container.style.display = 'none';
            });
        });

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    performSearch() {
        if (!this.currentSearch) {
            this.clearSearchResults();
            return;
        }

        // Add to recent searches
        this.addToRecentSearches(this.currentSearch);

        // Search through articles
        const searchLower = this.currentSearch.toLowerCase();
        this.searchResults = this.helpArticles.filter(article =>
            article.title.toLowerCase().includes(searchLower) ||
            article.summary.toLowerCase().includes(searchLower) ||
            article.content.toLowerCase().includes(searchLower) ||
            article.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
            article.category.toLowerCase().includes(searchLower)
        );

        this.displaySearchResults();

        // Track search
        if (window.gtag) {
            gtag('event', 'help_search', {
                'event_category': 'engagement',
                'search_term': this.currentSearch,
                'results_count': this.searchResults.length
            });
        }
    }

    displaySearchResults() {
        if (this.searchResults.length === 0) {
            this.showNoSearchResults();
            return;
        }

        // Create search results section
        const searchSection = this.createSearchResultsSection();

        // Insert after help header
        const helpHeader = document.querySelector('.help-header');
        helpHeader.insertAdjacentElement('afterend', searchSection);

        // Hide other sections
        this.hideMainSections();
    }

    createSearchResultsSection() {
        const section = document.createElement('section');
        section.className = 'search-results-section';
        section.innerHTML = `
            <div class="search-results-header">
                <h2>Search Results for "${this.escapeHtml(this.currentSearch)}"</h2>
                <p>Found ${this.searchResults.length} article${this.searchResults.length !== 1 ? 's' : ''}</p>
                <button class="clear-search-btn" onclick="window.helpCenter.clearSearchResults()">
                    <i data-feather="x"></i> Clear Search
                </button>
            </div>
            <div class="search-results-list">
                ${this.searchResults.map(article => this.createArticleCard(article, true)).join('')}
            </div>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        return section;
    }

    createArticleCard(article, isSearchResult = false) {
        const isBookmarked = this.bookmarkedArticles.has(article.id);
        const isViewed = this.viewedArticles.has(article.id);

        return `
            <div class="article-card ${isViewed ? 'viewed' : ''}" data-article-id="${article.id}">
                <div class="article-header">
                    <div class="article-category-badge" style="background-color: ${this.getCategoryColor(article.categoryId)}">
                        ${article.category}
                    </div>
                    <div class="article-actions">
                        <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" 
                                data-article-id="${article.id}" 
                                title="${isBookmarked ? 'Remove bookmark' : 'Bookmark article'}">
                            <i data-feather="bookmark"></i>
                        </button>
                        <span class="difficulty-badge difficulty-${article.difficulty.toLowerCase()}">
                            ${article.difficulty}
                        </span>
                    </div>
                </div>
                
                <h3 class="article-title">
                    <a href="#article-${article.slug}" data-article-id="${article.id}">
                        ${this.escapeHtml(article.title)}
                    </a>
                </h3>
                
                <p class="article-summary">${this.escapeHtml(article.summary)}</p>
                
                <div class="article-meta">
                    <div class="meta-left">
                        <span class="meta-item">
                            <i data-feather="clock"></i>
                            ${article.readTime}
                        </span>
                        <span class="meta-item">
                            <i data-feather="eye"></i>
                            ${article.views} views
                        </span>
                        <span class="meta-item">
                            <i data-feather="thumbs-up"></i>
                            ${article.helpful} helpful
                        </span>
                    </div>
                    <div class="meta-right">
                        <span class="updated-date">Updated ${article.updatedAt}</span>
                        ${isViewed ? '<span class="viewed-indicator">Read</span>' : ''}
                    </div>
                </div>
                
                ${isSearchResult ? `
                    <div class="search-match-info">
                        <small>Matches: ${this.getSearchMatches(article).join(', ')}</small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getSearchMatches(article) {
        const searchLower = this.currentSearch.toLowerCase();
        const matches = [];

        if (article.title.toLowerCase().includes(searchLower)) matches.push('title');
        if (article.summary.toLowerCase().includes(searchLower)) matches.push('description');
        if (article.category.toLowerCase().includes(searchLower)) matches.push('category');
        if (article.tags.some(tag => tag.toLowerCase().includes(searchLower))) matches.push('tags');

        return matches.length > 0 ? matches : ['content'];
    }

    getCategoryColor(categoryId) {
        const category = this.helpCategories.find(cat => cat.id === categoryId);
        return category ? category.color : '#6b7280';
    }

    showNoSearchResults() {
        const section = document.createElement('section');
        section.className = 'search-results-section';
        section.innerHTML = `
            <div class="no-search-results">
                <i data-feather="search" class="no-results-icon"></i>
                <h2>No articles found for "${this.escapeHtml(this.currentSearch)}"</h2>
                <p>Try different keywords or browse our help categories below.</p>
                <div class="search-suggestions">
                    <h4>Popular searches:</h4>
                    <div class="suggestion-tags">
                        <button class="suggestion-tag" data-search="recommendations">AI recommendations</button>
                        <button class="suggestion-tag" data-search="account setup">Account setup</button>
                        <button class="suggestion-tag" data-search="mobile app">Mobile app</button>
                        <button class="suggestion-tag" data-search="troubleshooting">Troubleshooting</button>
                    </div>
                </div>
                <div class="contact-help">
                    <a href="/support/contact.html" class="help-contact-btn">
                        <i data-feather="mail"></i>
                        Contact Support
                    </a>
                </div>
            </div>
        `;

        const helpHeader = document.querySelector('.help-header');
        helpHeader.insertAdjacentElement('afterend', section);
        this.hideMainSections();

        // Add suggestion tag listeners
        section.querySelectorAll('.suggestion-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                this.helpSearchInput.value = tag.dataset.search;
                this.currentSearch = tag.dataset.search;
                this.performSearch();
            });
        });

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    clearSearchResults() {
        this.currentSearch = '';
        this.helpSearchInput.value = '';
        this.searchResults = [];

        // Remove search results section
        const searchSection = document.querySelector('.search-results-section');
        if (searchSection) {
            searchSection.remove();
        }

        // Show main sections
        this.showMainSections();
    }

    hideMainSections() {
        const sections = ['.help-categories', '.quick-links', '.popular-articles', '.contact-support'];
        sections.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.style.display = 'none';
        });
    }

    showMainSections() {
        const sections = ['.help-categories', '.quick-links', '.popular-articles', '.contact-support'];
        sections.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.style.display = '';
        });
    }

    addToRecentSearches(search) {
        if (this.recentSearches.includes(search)) {
            this.recentSearches = this.recentSearches.filter(s => s !== search);
        }

        this.recentSearches.unshift(search);
        this.recentSearches = this.recentSearches.slice(0, 10);

        localStorage.setItem('cinebrain-recent-help-searches', JSON.stringify(this.recentSearches));
    }

    updateCategoryData() {
        // Update category article counts based on actual data
        this.helpCategories.forEach(category => {
            const articles = this.helpArticles.filter(article => article.categoryId === category.id);
            category.actualCount = articles.length;
        });

        // Update category display
        this.renderCategories();
    }

    renderCategories() {
        if (!this.categoriesContainer) return;

        this.categoriesContainer.innerHTML = this.helpCategories.map(category => `
            <a href="#category-${category.slug}" class="help-category" data-category-id="${category.id}">
                <div class="category-icon" style="color: ${category.color}">
                    <i data-feather="${category.icon}"></i>
                </div>
                <h3 class="category-title">${category.name}</h3>
                <p class="category-description">${category.description}</p>
                <span class="category-articles">${category.actualCount || category.articleCount} articles</span>
            </a>
        `).join('');

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    setupEventListeners() {
        // Article click handlers
        document.addEventListener('click', (e) => {
            // Article links
            if (e.target.closest('a[data-article-id]')) {
                e.preventDefault();
                const articleId = parseInt(e.target.closest('a[data-article-id]').dataset.articleId);
                this.openArticle(articleId);
            }

            // Category links
            if (e.target.closest('.help-category[data-category-id]')) {
                e.preventDefault();
                const categoryId = parseInt(e.target.closest('.help-category[data-category-id]').dataset.categoryId);
                this.showCategoryArticles(categoryId);
            }

            // Bookmark buttons
            if (e.target.closest('.bookmark-btn')) {
                e.preventDefault();
                const articleId = parseInt(e.target.closest('.bookmark-btn').dataset.articleId);
                this.toggleBookmark(articleId);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.helpSearchInput.focus();
            }

            // Escape to clear search
            if (e.key === 'Escape' && this.currentSearch) {
                this.clearSearchResults();
            }
        });
    }

    async openArticle(articleId) {
        const article = this.helpArticles.find(a => a.id === articleId);
        if (!article) return;

        // Mark as viewed
        this.viewedArticles.add(articleId);
        localStorage.setItem('cinebrain-viewed-articles', JSON.stringify([...this.viewedArticles]));

        // Track article view
        if (window.gtag) {
            gtag('event', 'help_article_view', {
                'event_category': 'engagement',
                'article_id': articleId,
                'article_title': article.title,
                'category': article.category
            });
        }

        // Create article modal
        this.showArticleModal(article);
    }

    showArticleModal(article) {
        const modal = document.createElement('div');
        modal.className = 'article-modal';
        modal.innerHTML = `
            <div class="article-modal-content">
                <div class="article-modal-header">
                    <div class="article-breadcrumb">
                        <span>Help Center</span>
                        <i data-feather="chevron-right"></i>
                        <span>${article.category}</span>
                        <i data-feather="chevron-right"></i>
                        <span>${article.title}</span>
                    </div>
                    <button class="close-article-btn">
                        <i data-feather="x"></i>
                    </button>
                </div>
                
                <div class="article-modal-body">
                    <div class="article-content">
                        ${article.content}
                    </div>
                    
                    <div class="article-footer">
                        <div class="article-feedback">
                            <p>Was this article helpful?</p>
                            <div class="feedback-buttons">
                                <button class="feedback-btn helpful" data-article-id="${article.id}" data-helpful="true">
                                    <i data-feather="thumbs-up"></i>
                                    Yes
                                </button>
                                <button class="feedback-btn not-helpful" data-article-id="${article.id}" data-helpful="false">
                                    <i data-feather="thumbs-down"></i>
                                    No
                                </button>
                            </div>
                        </div>
                        
                        <div class="article-share">
                            <button class="share-btn" data-article-id="${article.id}">
                                <i data-feather="share-2"></i>
                                Share Article
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup modal event listeners
        modal.querySelector('.close-article-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Feedback buttons
        modal.querySelectorAll('.feedback-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.submitArticleFeedback(article.id, btn.dataset.helpful === 'true');
                btn.style.opacity = '0.6';
                btn.disabled = true;
            });
        });

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async submitArticleFeedback(articleId, helpful) {
        try {
            // Try backend submission first
            const response = await fetch(`${this.apiBase}/support/help-article/${articleId}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('cinebrain_token') && {
                        'Authorization': `Bearer ${localStorage.getItem('cinebrain_token')}`
                    })
                },
                body: JSON.stringify({ helpful })
            });

            if (!response.ok) {
                throw new Error('Backend submission failed');
            }
        } catch (error) {
            // Store locally for future sync
            const localFeedback = JSON.parse(localStorage.getItem('cinebrain-pending-article-feedback') || '[]');
            localFeedback.push({
                article_id: articleId,
                helpful,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('cinebrain-pending-article-feedback', JSON.stringify(localFeedback));
        }

        // Track feedback
        if (window.gtag) {
            gtag('event', 'help_article_feedback', {
                'event_category': 'engagement',
                'article_id': articleId,
                'helpful': helpful
            });
        }

        this.showNotification('Thank you for your feedback!', 'success');
    }

    toggleBookmark(articleId) {
        if (this.bookmarkedArticles.has(articleId)) {
            this.bookmarkedArticles.delete(articleId);
            this.showNotification('Bookmark removed', 'info');
        } else {
            this.bookmarkedArticles.add(articleId);
            this.showNotification('Article bookmarked', 'success');
        }

        localStorage.setItem('cinebrain-bookmarked-articles', JSON.stringify([...this.bookmarkedArticles]));

        // Update bookmark button
        const bookmarkBtn = document.querySelector(`[data-article-id="${articleId}"].bookmark-btn`);
        if (bookmarkBtn) {
            bookmarkBtn.classList.toggle('bookmarked');
            bookmarkBtn.title = this.bookmarkedArticles.has(articleId) ? 'Remove bookmark' : 'Bookmark article';
        }

        // Track bookmark
        if (window.gtag) {
            gtag('event', 'help_article_bookmark', {
                'event_category': 'engagement',
                'article_id': articleId,
                'action': this.bookmarkedArticles.has(articleId) ? 'add' : 'remove'
            });
        }
    }

    showCategoryArticles(categoryId) {
        const category = this.helpCategories.find(cat => cat.id === categoryId);
        if (!category) return;

        const categoryArticles = this.helpArticles.filter(article => article.categoryId === categoryId);

        // Create category view
        const categorySection = document.createElement('section');
        categorySection.className = 'category-articles-section';
        categorySection.innerHTML = `
            <div class="category-header">
                <div class="category-breadcrumb">
                    <button class="back-to-help">
                        <i data-feather="arrow-left"></i>
                        Back to Help Center
                    </button>
                </div>
                <div class="category-info">
                    <div class="category-title-section">
                        <i data-feather="${category.icon}" class="category-icon" style="color: ${category.color}"></i>
                        <h2>${category.name}</h2>
                    </div>
                    <p class="category-description">${category.description}</p>
                    <p class="category-count">${categoryArticles.length} articles</p>
                </div>
            </div>
            <div class="category-articles-list">
                ${categoryArticles.map(article => this.createArticleCard(article)).join('')}
            </div>
        `;

        // Replace main content
        const helpHeader = document.querySelector('.help-header');
        helpHeader.insertAdjacentElement('afterend', categorySection);
        this.hideMainSections();

        // Back button
        categorySection.querySelector('.back-to-help').addEventListener('click', () => {
            categorySection.remove();
            this.showMainSections();
        });

        // Track category view
        if (window.gtag) {
            gtag('event', 'help_category_view', {
                'event_category': 'engagement',
                'category_id': categoryId,
                'category_name': category.name
            });
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    setupAnalytics() {
        // Track page load
        if (window.gtag) {
            gtag('event', 'page_view', {
                'page_title': 'Help Center',
                'page_location': window.location.href
            });
        }

        // Track user engagement
        let startTime = Date.now();

        window.addEventListener('beforeunload', () => {
            const timeSpent = Date.now() - startTime;
            if (window.gtag && timeSpent > 5000) { // More than 5 seconds
                gtag('event', 'help_center_engagement', {
                    'event_category': 'engagement',
                    'time_spent': Math.round(timeSpent / 1000),
                    'articles_viewed': this.viewedArticles.size,
                    'searches_performed': this.recentSearches.length
                });
            }
        });
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `help-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i data-feather="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Enhanced CSS styles
const helpCenterStyles = `
    .help-search-autocomplete {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--card-background);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-height: 300px;
        overflow-y: auto;
    }

    .search-suggestion {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .search-suggestion:hover {
        background-color: var(--background-muted);
    }

    .search-suggestion:not(:last-child) {
        border-bottom: 1px solid var(--border-color);
    }

    .search-results-section {
        margin: 2rem 0;
        padding: 2rem;
        background: var(--card-background);
        border-radius: 12px;
        border: 1px solid var(--border-color);
    }

    .search-results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
    }

    .clear-search-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--background-muted);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .clear-search-btn:hover {
        background: var(--border-color);
    }

    .article-card {
        background: var(--card-background);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        transition: all 0.3s ease;
    }

    .article-card:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(17, 60, 207, 0.1);
    }

    .article-card.viewed {
        opacity: 0.8;
    }

    .article-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .article-category-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .article-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .bookmark-btn {
        background: none;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 0.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .bookmark-btn.bookmarked {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
    }

    .difficulty-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .difficulty-beginner {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
    }

    .difficulty-intermediate {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
    }

    .difficulty-advanced {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }

    .article-title a {
        color: var(--text-primary);
        text-decoration: none;
        font-weight: 600;
        font-size: 1.1rem;
    }

    .article-title a:hover {
        color: var(--primary-color);
    }

    .article-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    .meta-left {
        display: flex;
        gap: 1rem;
    }

    .meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .viewed-indicator {
        background: var(--success-color);
        color: white;
        padding: 0.125rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
    }

    .article-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }

    .article-modal-content {
        background: var(--card-background);
        border-radius: 12px;
        width: 100%;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
    }

    .article-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }

    .article-breadcrumb {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-muted);
        font-size: 0.875rem;
    }

    .close-article-btn {
        background: none;
        border: none;
        padding: 0.5rem;
        cursor: pointer;
        color: var(--text-muted);
    }

    .article-modal-body {
        padding: 2rem;
    }

    .article-content h2 {
        color: var(--text-primary);
        margin-top: 2rem;
        margin-bottom: 1rem;
    }

    .article-content h3 {
        color: var(--text-primary);
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
    }

    .help-tip {
        background: rgba(17, 60, 207, 0.1);
        border: 1px solid rgba(17, 60, 207, 0.3);
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
        color: var(--primary-color);
    }

    .help-warning {
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
        color: #f59e0b;
    }

    .article-footer {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid var(--border-color);
    }

    .article-feedback {
        text-align: center;
        margin-bottom: 1rem;
    }

    .feedback-buttons {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 1rem;
    }

    .feedback-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--card-background);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .feedback-btn.helpful:hover {
        border-color: var(--success-color);
        color: var(--success-color);
    }

    .feedback-btn.not-helpful:hover {
        border-color: var(--error-color);
        color: var(--error-color);
    }

    .help-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        transition: all 0.3s ease;
    }

    .help-notification.success {
        background: var(--success-color);
    }

    .help-notification.error {
        background: var(--error-color);
    }

    .help-notification.info {
        background: var(--primary-color);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    @media (max-width: 768px) {
        .article-modal {
            padding: 1rem;
        }
        
        .article-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }
        
        .search-results-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
    }
`;

// Initialize help center when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = helpCenterStyles;
    document.head.appendChild(style);

    // Initialize help center
    if (document.querySelector('.help-page')) {
        window.helpCenter = new CineBrainHelpCenter();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainHelpCenter;
}