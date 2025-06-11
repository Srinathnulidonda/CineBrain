// assets/js/support/faq.js

class CineBrainFAQManager {
    constructor() {
        this.apiBase = window.CineBrainConfig.apiBase;
        this.allFAQs = [];
        this.allCategories = [];
        this.currentCategory = null;
        this.currentSearch = '';
        this.votedFAQs = new Set(JSON.parse(localStorage.getItem('cinebrain-voted-faqs') || '[]'));
        this.viewedFAQs = new Set(JSON.parse(localStorage.getItem('cinebrain-viewed-faqs') || '[]'));

        this.init();
    }

    async init() {
        this.setupElements();
        this.parseURLParams();
        this.setupEventListeners();
        await this.loadFAQs();
        this.setupAnalytics();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    setupElements() {
        this.searchInput = document.getElementById('faqSearch');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.categoryTabs = document.getElementById('categoryTabs');
        this.faqList = document.getElementById('faqList');
        this.noResults = document.getElementById('noResults');
    }

    parseURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentSearch = urlParams.get('search') || '';
        this.currentCategory = urlParams.get('category') ? parseInt(urlParams.get('category')) : null;

        if (this.searchInput && this.currentSearch) {
            this.searchInput.value = this.currentSearch;
        }
    }

    async loadFAQs() {
        this.showLoading();

        try {
            // Try to load from backend first
            const backendFAQs = await this.loadFromBackend();

            if (backendFAQs) {
                this.allFAQs = backendFAQs.faqs || [];
                this.allCategories = backendFAQs.categories || [];
            } else {
                // Fallback to static FAQ data
                await this.loadStaticFAQs();
            }

            this.renderCategories();
            this.renderFAQs();

        } catch (error) {
            console.error('Error loading FAQs:', error);
            await this.loadStaticFAQs(); // Fallback to static data
            this.renderCategories();
            this.renderFAQs();
        }
    }

    async loadFromBackend() {
        try {
            const params = new URLSearchParams();
            if (this.currentCategory) params.append('category_id', this.currentCategory);
            if (this.currentSearch) params.append('search', this.currentSearch);

            const response = await fetch(`${this.apiBase}/support/faq?${params}`, {
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
                // FAQ endpoint doesn't exist yet
                return null;
            }
        } catch (error) {
            console.warn('Backend FAQ loading failed:', error);
            return null;
        }
    }

    async loadStaticFAQs() {
        // Static FAQ data organized by categories
        this.allCategories = [
            { id: 1, name: 'Getting Started', icon: '🚀', description: 'Basic questions about using CineBrain' },
            { id: 2, name: 'AI Recommendations', icon: '🧠', description: 'How our AI works and recommendations' },
            { id: 3, name: 'Account & Profile', icon: '👤', description: 'Account management and profile settings' },
            { id: 4, name: 'Content & Search', icon: '🔍', description: 'Finding and exploring content' },
            { id: 5, name: 'Technical Support', icon: '⚙️', description: 'Technical issues and troubleshooting' },
            { id: 6, name: 'Privacy & Security', icon: '🔒', description: 'Data protection and account security' }
        ];

        this.allFAQs = [
            // Getting Started
            {
                id: 1,
                category: { id: 1, name: 'Getting Started', icon: '🚀' },
                question: 'What is CineBrain and how does it work?',
                answer: `<p>CineBrain is an AI-powered entertainment recommendation platform that helps you discover movies, TV shows, and anime based on your preferences.</p>
                <p><strong>How it works:</strong></p>
                <ul>
                    <li><strong>AI Analysis:</strong> Our algorithms analyze your viewing history and preferences</li>
                    <li><strong>Smart Recommendations:</strong> We suggest content tailored to your taste</li>
                    <li><strong>Continuous Learning:</strong> The more you use CineBrain, the better our recommendations become</li>
                    <li><strong>Multi-Platform:</strong> Access your recommendations anywhere, anytime</li>
                </ul>`,
                view_count: 1250,
                helpful_count: 89,
                tags: ['basics', 'ai', 'recommendations']
            },
            {
                id: 2,
                category: { id: 1, name: 'Getting Started', icon: '🚀' },
                question: 'Do I need to create an account to use CineBrain?',
                answer: `<p>You can browse CineBrain without an account, but creating one unlocks powerful features:</p>
                <p><strong>Without Account:</strong> Basic search and browse functionality</p>
                <p><strong>With Account:</strong></p>
                <ul>
                    <li>Personalized AI recommendations</li>
                    <li>Watch history and favorites</li>
                    <li>Custom watchlists</li>
                    <li>Review and rating system</li>
                    <li>Cross-device synchronization</li>
                </ul>
                <p>Creating an account is free and takes less than a minute!</p>`,
                view_count: 890,
                helpful_count: 67,
                tags: ['account', 'signup', 'features']
            },
            {
                id: 3,
                category: { id: 1, name: 'Getting Started', icon: '🚀' },
                question: 'Is CineBrain free to use?',
                answer: `<p>Yes! CineBrain is completely free to use. All features including:</p>
                <ul>
                    <li>AI-powered recommendations</li>
                    <li>Content search and discovery</li>
                    <li>Personal watchlists</li>
                    <li>Reviews and ratings</li>
                    <li>Mobile and desktop access</li>
                </ul>
                <p>We're committed to keeping CineBrain free while continuously improving our service.</p>`,
                view_count: 1456,
                helpful_count: 134,
                tags: ['free', 'pricing', 'cost']
            },

            // AI Recommendations
            {
                id: 4,
                category: { id: 2, name: 'AI Recommendations', icon: '🧠' },
                question: 'How accurate are CineBrain\'s AI recommendations?',
                answer: `<p>Our AI recommendations achieve high accuracy through:</p>
                <p><strong>Advanced Algorithms:</strong></p>
                <ul>
                    <li><strong>Collaborative Filtering:</strong> Learns from similar user preferences</li>
                    <li><strong>Content-Based Analysis:</strong> Analyzes genres, themes, and content attributes</li>
                    <li><strong>Hybrid Approach:</strong> Combines multiple recommendation techniques</li>
                    <li><strong>Regional Intelligence:</strong> Understands local content preferences</li>
                </ul>
                <p><strong>Accuracy improves as you:</strong></p>
                <ul>
                    <li>Rate more content</li>
                    <li>Add items to favorites</li>
                    <li>Use the platform regularly</li>
                    <li>Provide feedback on recommendations</li>
                </ul>`,
                view_count: 987,
                helpful_count: 78,
                tags: ['ai', 'accuracy', 'algorithms']
            },
            {
                id: 5,
                category: { id: 2, name: 'AI Recommendations', icon: '🧠' },
                question: 'Why am I seeing recommendations I don\'t like?',
                answer: `<p>If recommendations seem off, here are some common reasons and solutions:</p>
                <p><strong>Common Causes:</strong></p>
                <ul>
                    <li><strong>Limited Data:</strong> Not enough ratings or interactions</li>
                    <li><strong>Mixed Preferences:</strong> Liking very different genres</li>
                    <li><strong>Profile Learning:</strong> AI is still learning your taste</li>
                </ul>
                <p><strong>How to Improve:</strong></p>
                <ul>
                    <li>Rate at least 10-15 movies/shows you've watched</li>
                    <li>Use the 👍/👎 buttons on recommendations</li>
                    <li>Add content to your favorites</li>
                    <li>Update your genre preferences in settings</li>
                    <li>Be consistent with your ratings</li>
                </ul>`,
                view_count: 756,
                helpful_count: 52,
                tags: ['recommendations', 'improve', 'preferences']
            },

            // Account & Profile
            {
                id: 6,
                category: { id: 3, name: 'Account & Profile', icon: '👤' },
                question: 'How do I reset my password?',
                answer: `<p>To reset your password:</p>
                <ol>
                    <li>Click "Sign In" on the homepage</li>
                    <li>Click "Forgot Password?" below the login form</li>
                    <li>Enter your email address</li>
                    <li>Check your email for a reset link</li>
                    <li>Follow the link to create a new password</li>
                </ol>
                <p><strong>Didn't receive the email?</strong></p>
                <ul>
                    <li>Check your spam/junk folder</li>
                    <li>Make sure you used the correct email</li>
                    <li>Try again after a few minutes</li>
                    <li>Contact support if issues persist</li>
                </ul>`,
                view_count: 643,
                helpful_count: 41,
                tags: ['password', 'reset', 'account']
            },
            {
                id: 7,
                category: { id: 3, name: 'Account & Profile', icon: '👤' },
                question: 'How do I delete my account?',
                answer: `<p>To delete your CineBrain account:</p>
                <ol>
                    <li>Go to your Profile Settings</li>
                    <li>Scroll to "Account Management"</li>
                    <li>Click "Delete Account"</li>
                    <li>Confirm your decision</li>
                </ol>
                <p><strong>What happens when you delete:</strong></p>
                <ul>
                    <li>All personal data is permanently removed</li>
                    <li>Ratings and reviews are anonymized</li>
                    <li>Watchlists and favorites are deleted</li>
                    <li>This action cannot be undone</li>
                </ul>
                <p>Need help? Contact our support team first - we might be able to resolve any issues without deletion.</p>`,
                view_count: 234,
                helpful_count: 18,
                tags: ['delete', 'account', 'privacy']
            },

            // Content & Search
            {
                id: 8,
                category: { id: 4, name: 'Content & Search', icon: '🔍' },
                question: 'Why can\'t I find a specific movie or show?',
                answer: `<p>If you can't find content, it might be because:</p>
                <p><strong>Possible Reasons:</strong></p>
                <ul>
                    <li><strong>Different Title:</strong> Try searching by original title or alternative names</li>
                    <li><strong>Recent Release:</strong> Very new content may take time to be added</li>
                    <li><strong>Regional Availability:</strong> Some content is region-specific</li>
                    <li><strong>Spelling:</strong> Check for typos in your search</li>
                </ul>
                <p><strong>Search Tips:</strong></p>
                <ul>
                    <li>Use partial titles (e.g., "Avengers" instead of "Avengers: Endgame")</li>
                    <li>Search by actor or director names</li>
                    <li>Try the year of release</li>
                    <li>Use genre filters to narrow results</li>
                </ul>
                <p>Still can't find it? <a href="/support/contact.html">Let us know</a> and we'll add it!</p>`,
                view_count: 892,
                helpful_count: 67,
                tags: ['search', 'content', 'missing']
            },
            {
                id: 9,
                category: { id: 4, name: 'Content & Search', icon: '🔍' },
                question: 'How do I request missing content?',
                answer: `<p>We're constantly expanding our database. To request missing content:</p>
                <p><strong>Quick Request:</strong></p>
                <ol>
                    <li>Use the search bar</li>
                    <li>If content isn't found, click "Request this content"</li>
                    <li>Fill in basic details</li>
                    <li>Submit your request</li>
                </ol>
                <p><strong>Detailed Request:</strong></p>
                <ol>
                    <li>Go to <a href="/support/contact.html">Contact Us</a></li>
                    <li>Choose "Content & Recommendations" category</li>
                    <li>Provide title, year, and any additional details</li>
                    <li>Include IMDB or other links if available</li>
                </ol>
                <p>Most requests are processed within 48-72 hours!</p>`,
                view_count: 567,
                helpful_count: 45,
                tags: ['request', 'content', 'missing']
            },

            // Technical Support
            {
                id: 10,
                category: { id: 5, name: 'Technical Support', icon: '⚙️' },
                question: 'CineBrain is loading slowly. What can I do?',
                answer: `<p>If CineBrain is slow, try these solutions:</p>
                <p><strong>Quick Fixes:</strong></p>
                <ul>
                    <li><strong>Refresh the page:</strong> Press F5 or Ctrl+R</li>
                    <li><strong>Clear browser cache:</strong> Settings > Privacy > Clear Data</li>
                    <li><strong>Check internet connection:</strong> Test other websites</li>
                    <li><strong>Close other tabs:</strong> Free up browser memory</li>
                </ul>
                <p><strong>Browser Optimization:</strong></p>
                <ul>
                    <li>Update to the latest browser version</li>
                    <li>Disable unnecessary extensions</li>
                    <li>Enable hardware acceleration in browser settings</li>
                    <li>Try incognito/private mode</li>
                </ul>
                <p><strong>Still slow?</strong> <a href="/support/report-issue.html">Report the issue</a> with your browser and device details.</p>`,
                view_count: 432,
                helpful_count: 34,
                tags: ['performance', 'slow', 'technical']
            },

            // Privacy & Security
            {
                id: 11,
                category: { id: 6, name: 'Privacy & Security', icon: '🔒' },
                question: 'What data does CineBrain collect?',
                answer: `<p>We collect minimal data to provide our service:</p>
                <p><strong>Account Data:</strong></p>
                <ul>
                    <li>Email address (for account access)</li>
                    <li>Username (public display name)</li>
                    <li>Password (encrypted and secure)</li>
                </ul>
                <p><strong>Usage Data:</strong></p>
                <ul>
                    <li>Content ratings and reviews</li>
                    <li>Search queries and browsing history</li>
                    <li>Watchlist and favorites</li>
                    <li>General usage analytics</li>
                </ul>
                <p><strong>We Never Collect:</strong></p>
                <ul>
                    <li>Personal identification documents</li>
                    <li>Payment information (we're free!)</li>
                    <li>Social media passwords</li>
                    <li>Sensitive personal data</li>
                </ul>
                <p>Read our full <a href="/legal/privacy-policy.html">Privacy Policy</a> for details.</p>`,
                view_count: 345,
                helpful_count: 28,
                tags: ['privacy', 'data', 'security']
            }
        ];

        // Filter FAQs based on current search and category
        this.filterFAQs();
    }

    filterFAQs() {
        let filteredFAQs = [...this.allFAQs];

        // Filter by category
        if (this.currentCategory) {
            filteredFAQs = filteredFAQs.filter(faq => faq.category.id === this.currentCategory);
        }

        // Filter by search
        if (this.currentSearch) {
            const searchLower = this.currentSearch.toLowerCase();
            filteredFAQs = filteredFAQs.filter(faq =>
                faq.question.toLowerCase().includes(searchLower) ||
                faq.answer.toLowerCase().includes(searchLower) ||
                (faq.tags && faq.tags.some(tag => tag.toLowerCase().includes(searchLower)))
            );
        }

        this.allFAQs = filteredFAQs;
    }

    renderCategories() {
        // Render category tabs
        if (this.categoryTabs) {
            const allTab = `<button class="category-tab ${!this.currentCategory ? 'active' : ''}" data-category="">
                <span class="tab-icon">📋</span>
                <span class="tab-text">All Categories</span>
            </button>`;

            const categoryTabsHTML = this.allCategories.map(cat =>
                `<button class="category-tab ${this.currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                    <span class="tab-icon">${cat.icon || '📄'}</span>
                    <span class="tab-text">${cat.name}</span>
                </button>`
            ).join('');

            this.categoryTabs.innerHTML = allTab + categoryTabsHTML;
        }

        // Render category filter dropdown
        if (this.categoryFilter) {
            this.categoryFilter.innerHTML = '<option value="">All Categories</option>';
            this.allCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.icon || ''} ${category.name}`.trim();
                option.selected = this.currentCategory === category.id;
                this.categoryFilter.appendChild(option);
            });
        }
    }

    renderFAQs() {
        this.hideLoading();

        if (this.allFAQs.length === 0) {
            this.showNoResults();
            return;
        }

        this.faqList.style.display = 'block';
        this.noResults.style.display = 'none';

        const faqHTML = this.allFAQs.map((faq, index) => {
            const isVoted = this.votedFAQs.has(faq.id);
            const isViewed = this.viewedFAQs.has(faq.id);

            return `
                <div class="faq-item" data-faq-id="${faq.id}">
                    <button class="faq-header-btn" aria-expanded="false" aria-controls="faq-content-${index}">
                        <span class="faq-question">${this.escapeHtml(faq.question)}</span>
                        <div class="faq-header-meta">
                            <span class="faq-category">${faq.category.icon || '📄'} ${faq.category.name}</span>
                            <i data-feather="chevron-down" class="faq-toggle"></i>
                        </div>
                    </button>
                    <div class="faq-content" id="faq-content-${index}">
                        <div class="faq-content-inner">
                            ${faq.answer || '<p>Answer not available.</p>'}
                        </div>
                        <div class="faq-actions">
                            <div class="faq-meta">
                                <span class="meta-item">
                                    <i data-feather="eye"></i>
                                    ${faq.view_count || 0} views
                                </span>
                                <span class="meta-item">
                                    <i data-feather="thumbs-up"></i>
                                    ${faq.helpful_count || 0} helpful
                                </span>
                                ${isViewed ? '<span class="viewed-badge">Viewed</span>' : ''}
                            </div>
                            <div class="faq-vote">
                                <button class="vote-btn helpful ${isVoted ? 'voted' : ''}" 
                                        data-faq-id="${faq.id}" 
                                        data-helpful="true"
                                        ${isVoted ? 'disabled' : ''}>
                                    <i data-feather="thumbs-up"></i>
                                    Helpful
                                </button>
                                <button class="vote-btn not-helpful" 
                                        data-faq-id="${faq.id}" 
                                        data-helpful="false"
                                        ${isVoted ? 'disabled' : ''}>
                                    <i data-feather="thumbs-down"></i>
                                    Not helpful
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.faqList.innerHTML = faqHTML;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Auto-expand FAQ if URL has hash
        this.handleURLHash();
    }

    showLoading() {
        this.faqList.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <p>Loading FAQs...</p>
            </div>
        `;
        this.faqList.style.display = 'block';
        this.noResults.style.display = 'none';
    }

    hideLoading() {
        const loadingContainer = this.faqList.querySelector('.loading-container');
        if (loadingContainer) {
            loadingContainer.remove();
        }
    }

    showNoResults() {
        this.faqList.style.display = 'none';
        this.noResults.style.display = 'block';

        const noResultsHTML = `
            <div class="no-results-content">
                <i data-feather="search" class="no-results-icon"></i>
                <h3>No FAQs found</h3>
                <p>We couldn't find any FAQs matching "${this.currentSearch}". Try different keywords or browse by category.</p>
                <div class="no-results-actions">
                    <button class="btn btn-secondary" onclick="document.getElementById('faqSearch').value = ''; window.faqManager.currentSearch = ''; window.faqManager.loadFAQs();">
                        Clear Search
                    </button>
                    <a href="/support/contact.html" class="btn btn-primary">Contact Support</a>
                </div>
            </div>
        `;
        this.noResults.innerHTML = noResultsHTML;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    setupEventListeners() {
        // Search functionality with debouncing
        let searchTimeout;
        this.searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentSearch = e.target.value.trim();
                this.updateURL();
                this.loadFAQs();

                // Track search
                if (window.gtag && this.currentSearch) {
                    gtag('event', 'faq_search', {
                        'event_category': 'engagement',
                        'search_term': this.currentSearch
                    });
                }
            }, 500);
        });

        // Category filter dropdown
        this.categoryFilter?.addEventListener('change', (e) => {
            this.currentCategory = e.target.value ? parseInt(e.target.value) : null;
            this.updateURL();
            this.loadFAQs();

            // Track category filter
            if (window.gtag) {
                gtag('event', 'faq_category_filter', {
                    'event_category': 'engagement',
                    'category_id': this.currentCategory || 'all'
                });
            }
        });

        // Category tabs
        document.addEventListener('click', (e) => {
            if (e.target.closest('.category-tab')) {
                const tab = e.target.closest('.category-tab');
                this.currentCategory = tab.dataset.category ? parseInt(tab.dataset.category) : null;
                this.updateURL();
                this.loadFAQs();
            }
        });

        // FAQ expand/collapse
        document.addEventListener('click', (e) => {
            const faqHeader = e.target.closest('.faq-header-btn');
            if (faqHeader) {
                this.toggleFAQ(faqHeader);
            }
        });

        // FAQ voting
        document.addEventListener('click', async (e) => {
            const voteBtn = e.target.closest('.vote-btn');
            if (voteBtn && !voteBtn.disabled) {
                await this.handleFAQVote(voteBtn);
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.matches('.faq-header-btn')) {
                this.toggleFAQ(e.target);
            }
        });
    }

    toggleFAQ(headerButton) {
        const faqItem = headerButton.closest('.faq-item');
        const faqId = parseInt(faqItem.dataset.faqId);
        const isActive = faqItem.classList.contains('active');

        // Close other open FAQs (accordion behavior)
        document.querySelectorAll('.faq-item.active').forEach(item => {
            if (item !== faqItem) {
                item.classList.remove('active');
                const header = item.querySelector('.faq-header-btn');
                if (header) header.setAttribute('aria-expanded', 'false');
            }
        });

        // Toggle current FAQ
        if (isActive) {
            faqItem.classList.remove('active');
            headerButton.setAttribute('aria-expanded', 'false');
        } else {
            faqItem.classList.add('active');
            headerButton.setAttribute('aria-expanded', 'true');

            // Mark as viewed
            this.markFAQAsViewed(faqId);

            // Track FAQ view
            if (window.gtag) {
                gtag('event', 'faq_view', {
                    'event_category': 'engagement',
                    'faq_id': faqId
                });
            }
        }
    }

    markFAQAsViewed(faqId) {
        if (!this.viewedFAQs.has(faqId)) {
            this.viewedFAQs.add(faqId);
            localStorage.setItem('cinebrain-viewed-faqs', JSON.stringify([...this.viewedFAQs]));

            // Update view count in UI
            const faqItem = document.querySelector(`[data-faq-id="${faqId}"]`);
            if (faqItem) {
                const viewedBadge = '<span class="viewed-badge">Viewed</span>';
                const metaDiv = faqItem.querySelector('.faq-meta');
                if (metaDiv && !metaDiv.querySelector('.viewed-badge')) {
                    metaDiv.insertAdjacentHTML('beforeend', viewedBadge);
                }
            }
        }
    }

    async handleFAQVote(button) {
        const faqId = parseInt(button.dataset.faqId);
        const isHelpful = button.dataset.helpful === 'true';

        if (this.votedFAQs.has(faqId)) {
            return;
        }

        // Optimistic UI update
        button.disabled = true;
        const originalText = button.innerHTML;

        try {
            // Try backend vote first
            let success = await this.submitVoteToBackend(faqId, isHelpful);

            if (!success) {
                // Fallback to local storage
                success = this.submitVoteLocally(faqId, isHelpful);
            }

            if (success) {
                this.votedFAQs.add(faqId);
                localStorage.setItem('cinebrain-voted-faqs', JSON.stringify([...this.votedFAQs]));

                if (isHelpful) {
                    button.classList.add('voted');
                    button.innerHTML = '<i data-feather="check"></i> Voted';
                }

                // Disable both vote buttons
                const faqItem = button.closest('.faq-item');
                faqItem.querySelectorAll('.vote-btn').forEach(btn => {
                    btn.disabled = true;
                });

                this.showNotification('Thank you for your feedback!', 'success');

                // Track vote
                if (window.gtag) {
                    gtag('event', 'faq_vote', {
                        'event_category': 'engagement',
                        'faq_id': faqId,
                        'helpful': isHelpful
                    });
                }

                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            } else {
                throw new Error('Vote submission failed');
            }
        } catch (error) {
            console.error('Error voting on FAQ:', error);
            button.disabled = false;
            button.innerHTML = originalText;
            this.showNotification('Failed to record your vote. Please try again.', 'error');
        }
    }

    async submitVoteToBackend(faqId, isHelpful) {
        try {
            const response = await fetch(`${this.apiBase}/support/faq/${faqId}/helpful`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('cinebrain_token') && {
                        'Authorization': `Bearer ${localStorage.getItem('cinebrain_token')}`
                    })
                },
                body: JSON.stringify({ helpful: isHelpful })
            });

            return response.ok;
        } catch (error) {
            console.warn('Backend vote submission failed:', error);
            return false;
        }
    }

    submitVoteLocally(faqId, isHelpful) {
        // Store vote locally for future backend sync
        const localVotes = JSON.parse(localStorage.getItem('cinebrain-pending-faq-votes') || '[]');
        localVotes.push({
            faq_id: faqId,
            helpful: isHelpful,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('cinebrain-pending-faq-votes', JSON.stringify(localVotes));
        return true;
    }

    handleURLHash() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#faq-')) {
            const faqId = hash.replace('#faq-', '');
            const faqElement = document.querySelector(`[data-faq-id="${faqId}"]`);
            if (faqElement) {
                const headerButton = faqElement.querySelector('.faq-header-btn');
                if (headerButton) {
                    // Expand the FAQ
                    this.toggleFAQ(headerButton);

                    // Scroll to it
                    setTimeout(() => {
                        faqElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                }
            }
        }
    }

    updateURL() {
        const params = new URLSearchParams();
        if (this.currentSearch) params.set('search', this.currentSearch);
        if (this.currentCategory) params.set('category', this.currentCategory);

        const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newURL);
    }

    setupAnalytics() {
        // Track page load
        if (window.gtag) {
            gtag('event', 'page_view', {
                'page_title': 'FAQ',
                'page_location': window.location.href
            });
        }

        // Track search usage
        if (this.currentSearch) {
            gtag('event', 'faq_page_search', {
                'event_category': 'engagement',
                'search_term': this.currentSearch
            });
        }
    }

    showNotification(message, type) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i data-feather="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Auto-remove after 3 seconds
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

// Add CSS for enhanced styling
const faqStyles = `
    .faq-item {
        border: 1px solid var(--border-color);
        border-radius: 12px;
        margin-bottom: 1rem;
        overflow: hidden;
        transition: all 0.3s ease;
        background: var(--card-background);
    }

    .faq-item:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(17, 60, 207, 0.1);
    }

    .faq-header-btn {
        width: 100%;
        padding: 1.5rem;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
    }

    .faq-question {
        font-weight: 600;
        font-size: 1.1rem;
        color: var(--text-primary);
        line-height: 1.4;
        flex-grow: 1;
    }

    .faq-header-meta {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-shrink: 0;
    }

    .faq-category {
        font-size: 0.875rem;
        color: var(--text-muted);
        background: var(--background-muted);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
    }

    .faq-toggle {
        transition: transform 0.3s ease;
        color: var(--primary-color);
    }

    .faq-item.active .faq-toggle {
        transform: rotate(180deg);
    }

    .faq-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
    }

    .faq-item.active .faq-content {
        max-height: 1000px;
    }

    .faq-content-inner {
        padding: 0 1.5rem 1rem;
        color: var(--text-secondary);
        line-height: 1.6;
    }

    .faq-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: var(--background-muted);
        border-top: 1px solid var(--border-color);
    }

    .faq-meta {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    .viewed-badge {
        background: var(--success-color);
        color: white;
        padding: 0.125rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .faq-vote {
        display: flex;
        gap: 0.5rem;
    }

    .vote-btn {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--card-background);
        color: var(--text-secondary);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .vote-btn:hover:not(:disabled) {
        border-color: var(--primary-color);
        color: var(--primary-color);
    }

    .vote-btn.voted {
        background: var(--success-color);
        border-color: var(--success-color);
        color: white;
    }

    .vote-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .category-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 2rem;
        overflow-x: auto;
        padding-bottom: 0.5rem;
    }

    .category-tab {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--card-background);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .category-tab:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
    }

    .category-tab.active {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
    }

    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        transition: all 0.3s ease;
        opacity: 1;
        transform: translateY(0);
    }

    .notification.success {
        background: var(--success-color);
    }

    .notification.error {
        background: var(--error-color);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    @media (max-width: 768px) {
        .faq-header-btn {
            padding: 1rem;
        }
        
        .faq-header-meta {
            flex-direction: column;
            align-items: flex-end;
        }
        
        .faq-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
            padding: 1rem;
        }
        
        .faq-vote {
            justify-content: center;
        }
    }
`;

// Initialize FAQ manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = faqStyles;
    document.head.appendChild(style);

    // Initialize FAQ manager if we're on the FAQ page
    if (document.getElementById('faqList')) {
        window.faqManager = new CineBrainFAQManager();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CineBrainFAQManager;
}