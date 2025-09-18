class PersonPage {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.personSlug = this.getPersonSlugFromUrl();
        this.personData = null;
        this.authToken = localStorage.getItem('cinebrain-token');
        this.isAuthenticated = !!this.authToken;
        this.currentTab = 'overview';
        this.currentFilter = 'all';
        this.currentImageIndex = 0;
        this.currentImageSet = [];
        this.filmographyData = null;
        this.allFilmographyWorks = [];
        this.setupSmoothScrolling();

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.currentFilter && this.allFilmographyWorks.length > 0) {
                    this.filterFilmography(this.currentFilter);
                }
            }, 300);
        });

        this.init();
    }

    setupSmoothScrolling() {
        if (!CSS.supports('scroll-behavior', 'smooth')) {
            const style = document.createElement('style');
            style.textContent = `* { scroll-behavior: smooth !important; }`;
            document.head.appendChild(style);
        }
    }

    getPersonSlugFromUrl() {
        const queryString = window.location.search.substring(1);
        return decodeURIComponent(queryString);
    }

    async init() {
        try {
            if (!this.personSlug) {
                this.showError('No person specified');
                this.hideLoader();
                return;
            }

            await this.loadPersonDetails();
            this.setupEventListeners();
            this.setupTabNavigation();
            this.setupModals();

            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            this.hideLoader();

        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(error.message);
            this.hideLoader();
        }
    }

    async loadPersonDetails() {
        const url = `${this.apiBase}/person/${encodeURIComponent(this.personSlug)}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load person (${response.status})`);
            }

            this.personData = await response.json();
            this.filmographyData = this.personData.filmography;
            await this.renderPerson();

        } catch (error) {
            console.error('Error loading person:', error);
            throw error;
        }
    }

    async renderPerson() {
        const data = this.personData;
        if (!data) return;

        this.updatePageMeta(data);
        this.renderHero(data);
        this.renderOverview(data);
        this.renderFilmography(data.filmography);
        this.renderPhotos(data.images);
        this.renderSocial(data.social_media);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    updatePageMeta(data) {
        const title = `${data.name || 'Person'} - CineBrain`;
        const description = data.biography ?
            data.biography.substring(0, 160) + '...' :
            `Learn about ${data.name}, ${data.known_for_department || 'entertainment professional'} on CineBrain.`;

        document.title = title;

        this.updateMetaTag('meta-title', 'content', title);
        this.updateMetaTag('meta-description', 'content', description);
        this.updateMetaTag('og-title', 'content', title);
        this.updateMetaTag('og-description', 'content', description);

        if (data.profile_path) {
            this.updateMetaTag('og-image', 'content', data.profile_path);
        }

        const canonicalUrl = window.location.href;
        this.updateMetaTag('canonical-url', 'href', canonicalUrl);
        this.updateMetaTag('og-url', 'content', canonicalUrl);
    }

    updateMetaTag(id, attribute, value) {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute(attribute, value);
        }
    }

    renderHero(data) {
        if (data.profile_path) {
            const backdrop = document.getElementById('heroBackdrop');
            if (backdrop) {
                backdrop.style.backgroundImage = `url(${data.profile_path})`;
                backdrop.style.filter = 'blur(20px) brightness(0.3)';
            }
        }

        const photo = document.getElementById('personPhoto');
        if (photo && data.profile_path) {
            const img = new Image();
            img.onload = () => {
                photo.src = img.src;
                photo.classList.add('loaded');
            };
            img.onerror = () => {
                photo.src = this.getPlaceholderAvatar();
                photo.classList.add('loaded');
            };
            img.src = data.profile_path;
            photo.alt = data.name || 'Person Photo';
        }

        const departmentBadge = document.getElementById('departmentBadge');
        if (departmentBadge) {
            departmentBadge.textContent = (data.known_for_department || 'ACTOR').toUpperCase();
        }

        this.updateElement('personName', data.name);
        this.updateElement('knownFor', data.known_for_department || 'Actor');

        if (data.personal_info?.age) {
            const ageElement = document.getElementById('personAge');
            if (ageElement) {
                ageElement.style.display = 'inline-flex';
                ageElement.querySelector('span').textContent = `Age: ${data.personal_info.age}`;
            }
        }

        const totalWorksSpan = document.querySelector('#totalWorks span');
        if (totalWorksSpan) {
            const total = data.total_works || 0;
            const upcomingCount = data.upcoming_projects_count || 0;
            totalWorksSpan.textContent = upcomingCount > 0 ?
                `${total} Works (${upcomingCount} Upcoming)` :
                `${total} Works`;
        }

        const popularitySpan = document.querySelector('#personPopularity span');
        if (popularitySpan) {
            popularitySpan.textContent = Number(data.popularity || 0).toFixed(1);
        }

        if (data.place_of_birth) {
            const birthPlaceElement = document.getElementById('birthPlace');
            if (birthPlaceElement) {
                birthPlaceElement.style.display = 'inline-flex';
                birthPlaceElement.querySelector('span').textContent = this.truncateText(data.place_of_birth, 20);
            }
        }

        const bioPreview = document.getElementById('bioPreview');
        if (bioPreview) {
            const bio = data.biography || 'No biography available.';
            bioPreview.textContent = bio.substring(0, 200) + (bio.length > 200 ? '...' : '');
        }

        this.updateElement('yearsActive', data.personal_info?.career_span ||
            (data.filmography?.statistics?.years_active ? `${data.filmography.statistics.years_active} years` : '0'));

        this.updateElement('totalProjects', data.filmography?.statistics?.total_projects || '0');

        if (data.filmography?.statistics?.highest_rated) {
            document.getElementById('highestRatedStat').style.display = 'block';
            this.updateElement('highestRated', data.filmography.statistics.highest_rated.rating?.toFixed(1) || 'N/A');
        }

        if (data.filmography?.statistics?.most_popular) {
            document.getElementById('mostPopularStat').style.display = 'block';
            this.updateElement('mostPopular', Math.round(data.filmography.statistics.most_popular.popularity || 0));
        }
    }

    renderOverview(data) {
        const biographyText = document.getElementById('biographyText');
        const expandBtn = document.getElementById('expandBiographyBtn');

        if (biographyText) {
            const bio = data.biography || 'No biography available.';
            biographyText.textContent = bio;

            if (bio.length > 500) {
                expandBtn.style.display = 'inline-flex';
            }
        }

        this.updateElement('knownForDepartment', data.known_for_department || 'Unknown');

        if (data.birthday) {
            document.getElementById('birthdayRow').style.display = 'flex';
            this.updateElement('birthday', this.formatDate(data.birthday));

            if (data.personal_info?.age) {
                const birthdayElement = document.getElementById('birthday');
                if (birthdayElement) {
                    birthdayElement.textContent += ` (Age ${data.personal_info.age})`;
                }
            }
        }

        if (data.deathday) {
            document.getElementById('deathdayRow').style.display = 'flex';
            this.updateElement('deathday', this.formatDate(data.deathday));

            if (data.personal_info?.age_at_death) {
                const deathdayElement = document.getElementById('deathday');
                if (deathdayElement) {
                    deathdayElement.textContent += ` (Age ${data.personal_info.age_at_death})`;
                }
            }
        }

        if (data.place_of_birth) {
            document.getElementById('placeOfBirthRow').style.display = 'flex';
            this.updateElement('placeOfBirth', data.place_of_birth);
        }

        if (data.gender) {
            document.getElementById('genderRow').style.display = 'flex';
            this.updateElement('gender', this.getGenderText(data.gender));
        }

        this.updateElement('popularityScore', Number(data.popularity || 0).toFixed(1));

        if (data.also_known_as && data.also_known_as.length > 0) {
            const card = document.getElementById('alsoKnownAsCard');
            const list = document.getElementById('alsoKnownAsList');

            if (card && list) {
                card.style.display = 'block';
                list.innerHTML = data.also_known_as.slice(0, 8).map(name => `
                    <div class="also-known-item">${this.escapeHtml(name)}</div>
                `).join('');
            }
        }

        this.renderCareerHighlights(data.career_highlights, data.filmography?.statistics);
        this.renderQuickStats(data);
    }

    renderCareerHighlights(highlights, statistics) {
        const container = document.getElementById('careerHighlights');
        if (!container) return;

        const highlightItems = [];

        if (this.personData.personal_info?.career_span) {
            highlightItems.push({
                icon: 'calendar',
                title: 'Career Span',
                value: this.personData.personal_info.career_span
            });
        } else if (highlights?.debut_work || statistics?.debut_year) {
            highlightItems.push({
                icon: 'calendar',
                title: 'Career Debut',
                value: highlights?.debut_work?.title || statistics?.debut_year || 'N/A'
            });
        }

        if (highlights?.most_successful_decade) {
            const decade = highlights.most_successful_decade;
            highlightItems.push({
                icon: 'trending-up',
                title: 'Most Active',
                value: typeof decade === 'object' ?
                    `${decade.decade} (${decade.projects} projects)` :
                    decade
            });
        }

        if (statistics?.highest_rated) {
            highlightItems.push({
                icon: 'star',
                title: 'Highest Rated',
                value: `${statistics.highest_rated.title} (${statistics.highest_rated.rating?.toFixed(1)})`
            });
        }

        if (statistics?.most_popular) {
            highlightItems.push({
                icon: 'award',
                title: 'Most Popular',
                value: statistics.most_popular.title || 'N/A'
            });
        }

        if (this.personData.upcoming_projects_count > 0) {
            highlightItems.push({
                icon: 'clock',
                title: 'Upcoming Projects',
                value: `${this.personData.upcoming_projects_count} projects`
            });
        }

        if (highlightItems.length > 0) {
            container.innerHTML = highlightItems.slice(0, 6).map(item => `
                <div class="career-highlight-item">
                    <i data-feather="${item.icon}" class="highlight-icon"></i>
                    <div class="highlight-title">${item.title}</div>
                    <div class="highlight-value">${this.escapeHtml(item.value)}</div>
                </div>
            `).join('');

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    renderQuickStats(data) {
        const container = document.getElementById('quickStats');
        if (!container) return;

        const stats = [];

        if (data.filmography) {
            const actorCount = data.filmography.as_actor?.length || 0;
            const directorCount = data.filmography.as_director?.length || 0;
            const writerCount = data.filmography.as_writer?.length || 0;
            const producerCount = data.filmography.as_producer?.length || 0;
            const upcomingCount = (data.filmography.upcoming?.length || 0) + (data.filmography.tba?.length || 0);

            if (actorCount > 0) {
                stats.push({ label: 'Actor', value: actorCount });
            }
            if (directorCount > 0) {
                stats.push({ label: 'Director', value: directorCount });
            }
            if (writerCount > 0) {
                stats.push({ label: 'Writer', value: writerCount });
            }
            if (producerCount > 0) {
                stats.push({ label: 'Producer', value: producerCount });
            }
            if (upcomingCount > 0) {
                stats.push({ label: 'Upcoming', value: upcomingCount, highlight: true });
            }
        }

        if (stats.length > 0) {
            container.innerHTML = stats.slice(0, 5).map(stat => `
                <div class="quick-stat-item ${stat.highlight ? 'highlight' : ''}">
                    <div class="quick-stat-value">${stat.value}</div>
                    <div class="quick-stat-label">${stat.label}</div>
                </div>
            `).join('');
        }
    }

    renderFilmography(filmography) {
        if (!filmography) {
            document.getElementById('noFilmography').style.display = 'flex';
            return;
        }

        this.allFilmographyWorks = [];

        if (filmography.as_actor?.length > 0) {
            filmography.as_actor.forEach(work => {
                this.allFilmographyWorks.push({ ...work, category: 'actor' });
            });
        }

        if (filmography.as_director?.length > 0) {
            filmography.as_director.forEach(work => {
                this.allFilmographyWorks.push({ ...work, category: 'director' });
            });
        }

        if (filmography.as_writer?.length > 0) {
            filmography.as_writer.forEach(work => {
                this.allFilmographyWorks.push({ ...work, category: 'writer' });
            });
        }

        if (filmography.as_producer?.length > 0) {
            filmography.as_producer.forEach(work => {
                this.allFilmographyWorks.push({ ...work, category: 'producer' });
            });
        }

        if (filmography.upcoming?.length > 0) {
            filmography.upcoming.forEach(work => {
                this.allFilmographyWorks.push({ ...work, category: 'upcoming', isUpcoming: true });
            });
        }

        if (filmography.tba?.length > 0) {
            filmography.tba.forEach(work => {
                this.allFilmographyWorks.push({
                    ...work,
                    category: 'upcoming',
                    isUpcoming: true,
                    isTBA: true,
                    year: work.year || 'TBA'
                });
            });
        }

        const allWorks = [
            ...(filmography.as_actor || []),
            ...(filmography.as_director || []),
            ...(filmography.as_writer || []),
            ...(filmography.as_producer || []),
            ...(filmography.upcoming || []),
            ...(filmography.tba || [])
        ];

        allWorks.forEach(work => {
            if (!work.year || work.year === 'TBA' || work.year === null || work.year === undefined) {
                const existingWork = this.allFilmographyWorks.find(w =>
                    (w.id === work.id || w.tmdb_id === work.tmdb_id) &&
                    w.title === work.title
                );
                if (existingWork && existingWork.category !== 'upcoming') {
                    existingWork.category = 'upcoming';
                    existingWork.isUpcoming = true;
                    existingWork.isTBA = true;
                    existingWork.year = 'TBA';
                } else if (!existingWork) {
                    this.allFilmographyWorks.push({
                        ...work,
                        category: 'upcoming',
                        isUpcoming: true,
                        isTBA: true,
                        year: 'TBA'
                    });
                }
            }
        });

        this.updateFilterButtons();
        this.filterFilmography('all');
    }

    updateFilterButtons() {
        const categories = ['all', 'actor', 'director', 'writer', 'producer', 'upcoming'];

        categories.forEach(category => {
            const button = document.querySelector(`.filter-tab[data-filter="${category}"]`);
            if (button) {
                if (category === 'all') {
                    button.style.display = this.allFilmographyWorks.length > 0 ? 'block' : 'none';
                } else {
                    const count = this.allFilmographyWorks.filter(work => work.category === category).length;
                    button.style.display = count > 0 ? 'block' : 'none';
                }
            }
        });
    }

    filterFilmography(filterType) {
        this.currentFilter = filterType;

        let filteredWorks = [];

        if (filterType === 'all') {
            filteredWorks = [...this.allFilmographyWorks];
        } else {
            filteredWorks = this.allFilmographyWorks.filter(work => work.category === filterType);
        }

        filteredWorks.sort((a, b) => {
            if (a.isTBA && !b.isTBA) return -1;
            if (!a.isTBA && b.isTBA) return 1;

            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            return yearB - yearA;
        });

        this.renderFilmographyCarousel(filteredWorks);
    }

    renderFilmographyCarousel(works) {
        const container = document.getElementById('filmographyContent');

        if (!container) return;

        if (works.length === 0) {
            container.innerHTML = '';
            document.getElementById('noFilmography').style.display = 'flex';
            return;
        }

        document.getElementById('noFilmography').style.display = 'none';
        container.innerHTML = '';

        works.forEach(work => {
            const card = this.createFilmographyCard(work, work.isUpcoming, work.isTBA);
            if (card) {
                container.appendChild(card);
            }
        });

        const carouselContainer = container.closest('.carousel-container');
        if (carouselContainer) {
            this.setupCarouselNavigation(carouselContainer);
            this.setupKeyboardNavigation(carouselContainer);
            this.setupSwipeGestures(carouselContainer);
        }
    }

    createFilmographyCard(work, isUpcoming = false, isTBA = false) {
        const card = document.createElement('div');
        card.className = `content-card ${isUpcoming ? 'upcoming' : ''}`;
        card.dataset.contentId = work.id || work.tmdb_id;
        card.dataset.contentSlug = work.slug || '';

        const posterUrl = this.formatPosterUrl(work.poster_path);
        const rating = work.rating ? work.rating.toFixed(1) : null;
        const year = work.year || 'TBA';
        const releaseDate = work.release_date;

        let releaseInfo = year;
        if (isTBA || year === 'TBA') {
            releaseInfo = 'TBA';
        } else if (isUpcoming && releaseDate) {
            const date = new Date(releaseDate);
            const now = new Date();
            if (date > now) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                releaseInfo = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
            }
        }

        const isMobile = window.innerWidth <= 767;

        let roleInfo = '';
        if (!isMobile) {
            if (work.character) {
                roleInfo = `<span class="card-role">• ${this.escapeHtml(work.character)}</span>`;
            } else if (work.job) {
                roleInfo = `<span class="card-role">• ${this.escapeHtml(work.job)}</span>`;
            }
        } else {
            if (work.character) {
                roleInfo = `<span class="card-role">${this.escapeHtml(work.character)}</span>`;
            } else if (work.job) {
                roleInfo = `<span class="card-role">${this.escapeHtml(work.job)}</span>`;
            }
        }

        let badge = '';
        if (isUpcoming) {
            badge = '<div class="upcoming-badge">Upcoming</div>';
        }

        card.innerHTML = `
            <div class="card-poster-container">
                <img 
                    class="card-poster" 
                    data-src="${posterUrl}" 
                    alt="${this.escapeHtml(work.title || 'Content')}"
                    loading="lazy"
                >
                ${badge}
                <div class="card-overlays">
                    <div class="card-top-overlay">
                        <button class="wishlist-btn" 
                                data-content-id="${work.id || work.tmdb_id}" 
                                title="Add to Favorites"
                                aria-label="Add to Favorites">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                    </div>
                    ${rating ? `
                        <div class="card-bottom-overlay">
                            <div class="rating-badge">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                                <span>${rating}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-info">
                <div class="card-title">${this.escapeHtml(work.title || 'Unknown')}</div>
                <div class="card-meta">
                    <span class="card-year">${releaseInfo}</span>
                    ${roleInfo}
                </div>
            </div>
        `;

        this.setupLazyLoading(card);
        this.setupCardHandlers(card, work, isUpcoming, isTBA);

        return card;
    }

    setupCardHandlers(card, work, isUpcoming, isTBA) {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.wishlist-btn')) {
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';

                    if (work.slug) {
                        window.location.href = `/content/details.html?${encodeURIComponent(work.slug)}`;
                    } else if (isUpcoming || isTBA) {
                        this.showToast(isTBA ? 'Release date TBA' : 'Coming soon', 'info');
                    } else {
                        const slug = this.generateSlug(work.title, work.year);
                        if (slug) {
                            window.location.href = `/content/details.html?${encodeURIComponent(slug)}`;
                        }
                    }
                }, 100);
            }
        });

        const wishlistBtn = card.querySelector('.wishlist-btn');
        wishlistBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleFavoriteClick(work.id || work.tmdb_id, wishlistBtn);
        });
    }

    setupCarouselNavigation(carouselContainer) {
        const wrapper = carouselContainer.querySelector('.carousel-wrapper');
        const prevBtn = carouselContainer.querySelector('.carousel-nav.prev');
        const nextBtn = carouselContainer.querySelector('.carousel-nav.next');

        if (!wrapper) return;

        const getScrollAmount = () => {
            const containerWidth = wrapper.clientWidth;
            const cardWidth = wrapper.querySelector('.content-card')?.offsetWidth || 180;
            const gap = parseInt(getComputedStyle(wrapper).gap) || 16;
            const visibleCards = Math.floor(containerWidth / (cardWidth + gap));
            return (cardWidth + gap) * Math.max(1, visibleCards - 1);
        };

        const updateNavButtons = () => {
            if (!prevBtn || !nextBtn) return;

            const scrollLeft = wrapper.scrollLeft;
            const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;

            prevBtn.classList.toggle('disabled', scrollLeft <= 0);
            nextBtn.classList.toggle('disabled', scrollLeft >= maxScroll - 1);
        };

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                wrapper.scrollBy({
                    left: -getScrollAmount(),
                    behavior: 'smooth'
                });
            });

            nextBtn.addEventListener('click', () => {
                wrapper.scrollBy({
                    left: getScrollAmount(),
                    behavior: 'smooth'
                });
            });

            wrapper.addEventListener('scroll', updateNavButtons);
            updateNavButtons();
        }
    }

    setupKeyboardNavigation(carouselContainer) {
        const wrapper = carouselContainer.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        wrapper.addEventListener('keydown', (e) => {
            const cardWidth = wrapper.querySelector('.content-card')?.offsetWidth || 180;
            const gap = parseInt(getComputedStyle(wrapper).gap) || 16;
            const scrollAmount = cardWidth + gap;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    wrapper.scrollBy({
                        left: -scrollAmount,
                        behavior: 'smooth'
                    });
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    wrapper.scrollBy({
                        left: scrollAmount,
                        behavior: 'smooth'
                    });
                    break;
                case 'Home':
                    e.preventDefault();
                    wrapper.scrollTo({
                        left: 0,
                        behavior: 'smooth'
                    });
                    break;
                case 'End':
                    e.preventDefault();
                    wrapper.scrollTo({
                        left: wrapper.scrollWidth,
                        behavior: 'smooth'
                    });
                    break;
            }
        });
    }

    setupSwipeGestures(carouselContainer) {
        const wrapper = carouselContainer.querySelector('.carousel-wrapper');
        if (!wrapper) return;

        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let velocity = 0;
        let momentumID = null;
        let lastX = 0;
        let lastTime = Date.now();

        const startDragging = (pageX) => {
            isDown = true;
            startX = pageX;
            scrollLeft = wrapper.scrollLeft;
            lastX = pageX;
            lastTime = Date.now();
            wrapper.style.scrollBehavior = 'auto';
            wrapper.style.cursor = 'grabbing';

            if (momentumID) {
                cancelAnimationFrame(momentumID);
                momentumID = null;
            }
        };

        const stopDragging = () => {
            if (!isDown) return;
            isDown = false;
            wrapper.style.scrollBehavior = 'smooth';
            wrapper.style.cursor = 'grab';

            if (Math.abs(velocity) > 0.5) {
                const deceleration = 0.95;
                const momentum = () => {
                    wrapper.scrollLeft += velocity;
                    velocity *= deceleration;

                    if (Math.abs(velocity) > 0.5) {
                        momentumID = requestAnimationFrame(momentum);
                    }
                };
                momentumID = requestAnimationFrame(momentum);
            }
        };

        const handleMove = (pageX) => {
            if (!isDown) return;

            const now = Date.now();
            const dt = now - lastTime;
            const dx = pageX - lastX;

            velocity = dx / dt * 16;

            const x = pageX;
            const walk = (x - startX) * 1.5;
            wrapper.scrollLeft = scrollLeft - walk;

            lastX = pageX;
            lastTime = now;
        };

        wrapper.addEventListener('mousedown', (e) => startDragging(e.pageX));
        wrapper.addEventListener('mouseleave', stopDragging);
        wrapper.addEventListener('mouseup', stopDragging);
        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            handleMove(e.pageX);
        });

        wrapper.addEventListener('touchstart', (e) => {
            startDragging(e.touches[0].pageX);
        }, { passive: true });

        wrapper.addEventListener('touchend', stopDragging);
        wrapper.addEventListener('touchmove', (e) => {
            handleMove(e.touches[0].pageX);
        }, { passive: true });
    }

    setupLazyLoading(card) {
        const img = card.querySelector('.card-poster');
        if (!img) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const imgSrc = img.dataset.src;
                    if (imgSrc) {
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            img.src = imgSrc;
                            img.classList.add('loaded');
                            img.style.opacity = '1';
                        };
                        tempImg.onerror = () => {
                            img.src = this.getPlaceholderImage();
                            img.classList.add('loaded');
                            img.style.opacity = '1';
                        };
                        tempImg.src = imgSrc;
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.01
        });
        observer.observe(img);
    }

    async handleFavoriteClick(contentId, button) {
        if (!this.isAuthenticated) {
            this.showToast('Login required', 'warning');
            return;
        }

        try {
            button.disabled = true;
            const isActive = button.classList.contains('active');

            await new Promise(resolve => setTimeout(resolve, 300));

            button.classList.toggle('active');
            const icon = button.querySelector('svg path');
            if (icon) {
                if (button.classList.contains('active')) {
                    icon.setAttribute('fill', 'currentColor');
                    this.showToast('Added to favorites', 'success');
                } else {
                    icon.setAttribute('fill', 'none');
                    this.showToast('Removed from favorites', 'success');
                }
            }
        } catch (error) {
            console.error('Error updating favorites:', error);
            this.showToast('Failed to update', 'error');
        } finally {
            button.disabled = false;
        }
    }

    renderPhotos(images) {
        const container = document.getElementById('photosGrid');
        const noPhotos = document.getElementById('noPhotos');

        if (!container) return;

        if (!images || images.length === 0) {
            container.innerHTML = '';
            noPhotos.style.display = 'flex';
            return;
        }

        noPhotos.style.display = 'none';
        this.currentImageSet = images;

        container.innerHTML = images.map((image, index) => {
            const imageUrl = image.url || image;
            return `
                <div class="photo-card" 
                     data-image-url="${imageUrl}" 
                     data-image-index="${index}"
                     tabindex="0" 
                     role="button"
                     title="Click to view full size">
                    <img src="${imageUrl}" 
                         alt="Photo ${index + 1}"
                         loading="lazy">
                </div>
            `;
        }).join('');

        container.querySelectorAll('.photo-card').forEach((card, index) => {
            const clickHandler = () => {
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';
                    this.openLightbox(index);
                }, 100);
            };

            card.addEventListener('click', clickHandler);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clickHandler();
                }
            });
        });
    }

    renderSocial(socialMedia) {
        const container = document.querySelector('.social-grid');
        if (!container) return;

        if (!socialMedia || Object.keys(socialMedia).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-feather="link"></i>
                    <h3>No Social Media Links</h3>
                    <p>No social media profiles available for this person.</p>
                </div>
            `;
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        const socialLinks = Object.entries(socialMedia)
            .map(([platform, data]) => this.createSocialLink(platform, data))
            .filter(link => link !== null);

        container.innerHTML = socialLinks.join('');

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    createSocialLink(platform, data) {
        const url = typeof data === 'string' ? data : data?.url;
        if (!url) return null;

        const platformInfo = this.getSocialPlatformInfo(platform, data);
        if (!platformInfo) return null;

        return `
            <a href="${url}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="social-link"
               data-platform="${platformInfo.platform}">
                <div class="social-icon-wrapper">
                    <i data-feather="${platformInfo.icon}"></i>
                </div>
                <div class="social-info">
                    <div class="social-platform">${platformInfo.name}</div>
                    <div class="social-username">${platformInfo.handle}</div>
                </div>
                <div class="social-arrow">
                    <i data-feather="external-link"></i>
                </div>
            </a>
        `;
    }

    getSocialPlatformInfo(platform, data) {
        const platformLower = platform.toLowerCase();
        const url = typeof data === 'string' ? data : data.url;
        const handle = data.handle || this.extractHandle(url, platform);
        const platformName = data.platform || platform;

        if (!url) return null;

        switch (platformLower) {
            case 'twitter':
            case 'x':
                return {
                    platform: 'twitter',
                    name: platformName || 'Twitter',
                    icon: 'twitter',
                    url: url,
                    handle: handle || this.extractHandle(url, 'twitter.com/')
                };
            case 'instagram':
                return {
                    platform: 'instagram',
                    name: platformName || 'Instagram',
                    icon: 'instagram',
                    url: url,
                    handle: handle || this.extractHandle(url, 'instagram.com/')
                };
            case 'facebook':
                return {
                    platform: 'facebook',
                    name: platformName || 'Facebook',
                    icon: 'facebook',
                    url: url,
                    handle: handle || this.extractHandle(url, 'facebook.com/')
                };
            case 'imdb':
                return {
                    platform: 'imdb',
                    name: platformName || 'IMDb',
                    icon: 'film',
                    url: url,
                    handle: handle || 'View Profile'
                };
            case 'tiktok':
                return {
                    platform: 'tiktok',
                    name: platformName || 'TikTok',
                    icon: 'music',
                    url: url,
                    handle: handle || this.extractHandle(url, 'tiktok.com/@')
                };
            case 'youtube':
                return {
                    platform: 'youtube',
                    name: platformName || 'YouTube',
                    icon: 'youtube',
                    url: url,
                    handle: handle || 'View Channel'
                };
            case 'wikidata':
                return {
                    platform: 'wikidata',
                    name: platformName || 'Wikidata',
                    icon: 'external-link',
                    url: url,
                    handle: handle || 'View Entry'
                };
            default:
                return {
                    platform: 'external',
                    name: platformName || platform.charAt(0).toUpperCase() + platform.slice(1),
                    icon: 'external-link',
                    url: url,
                    handle: handle || 'Visit Link'
                };
        }
    }

    extractHandle(url, pattern) {
        try {
            if (typeof pattern === 'string') {
                const match = url.match(new RegExp(pattern + '([^/?]+)'));
                return match ? '@' + match[1] : 'Visit Profile';
            }

            const patterns = [
                /(?:twitter\.com|x\.com)\/([^/?]+)/,
                /instagram\.com\/([^/?]+)/,
                /facebook\.com\/([^/?]+)/,
                /tiktok\.com\/@([^/?]+)/,
                /youtube\.com\/(?:channel\/|user\/|c\/)?([^/?]+)/
            ];

            for (const regex of patterns) {
                const match = url.match(regex);
                if (match && match[1]) {
                    return match[1].startsWith('@') ? match[1] : '@' + match[1];
                }
            }

            return 'Visit Profile';
        } catch {
            return 'Visit Profile';
        }
    }

    setupEventListeners() {
        const viewFilmographyBtn = document.getElementById('viewFilmographyBtn');
        if (viewFilmographyBtn) {
            viewFilmographyBtn.addEventListener('click', () => {
                document.querySelector('[data-tab="filmography"]').click();
            });
        }

        ['shareBtn', 'mobileShareBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.openShareModal());
            }
        });

        ['followBtn', 'mobileFollowBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.showToast('Coming soon!', 'info');
                });
            }
        });

        const expandBiographyBtn = document.getElementById('expandBiographyBtn');
        if (expandBiographyBtn) {
            expandBiographyBtn.addEventListener('click', () => {
                const biographyText = document.getElementById('biographyText');
                const isExpanded = biographyText.classList.contains('expanded');

                biographyText.classList.toggle('expanded');
                expandBiographyBtn.classList.toggle('expanded');
                expandBiographyBtn.querySelector('span').textContent = isExpanded ? 'Show More' : 'Show Less';

                if (!isExpanded) {
                    setTimeout(() => {
                        biographyText.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 200);
                }
            });
        }

        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.filterFilmography(tab.dataset.filter);
            });
        });
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.nav-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                const currentPane = document.querySelector('.tab-pane.active');
                if (currentPane) {
                    currentPane.style.opacity = '0';
                    setTimeout(() => {
                        currentPane.classList.remove('active');

                        tabs.forEach(t => {
                            t.classList.remove('active');
                            t.setAttribute('aria-selected', 'false');
                        });

                        tab.classList.add('active');
                        tab.setAttribute('aria-selected', 'true');

                        const newPane = document.getElementById(`${targetTab}Tab`);
                        if (newPane) {
                            newPane.classList.add('active');
                            newPane.style.opacity = '0';
                            setTimeout(() => {
                                newPane.style.opacity = '1';
                            }, 50);
                        }

                        this.currentTab = targetTab;

                        if (typeof feather !== 'undefined') {
                            feather.replace();
                        }
                    }, 150);
                }
            });
        });
    }

    setupModals() {
        this.setupShareHandlers();
        this.setupLightbox();
    }

    setupShareHandlers() {
        const shareUrl = window.location.href;
        const shareTitle = this.personData?.name || 'Check out this person on CineBrain';
        const shareText = `${shareTitle}\n\n${this.personData?.biography?.substring(0, 100) || 'Discover amazing talent on CineBrain'}...`;

        const handlers = {
            shareWhatsApp: () => {
                const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
                window.open(url, '_blank');
            },
            shareTwitter: () => {
                const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
                window.open(url, '_blank');
            },
            shareFacebook: () => {
                const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                window.open(url, '_blank');
            },
            shareLinkedIn: () => {
                const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                window.open(url, '_blank');
            },
            copyLink: async () => {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    this.showToast('Link copied!', 'success');

                    const modal = bootstrap.Modal.getInstance(document.getElementById('shareModal'));
                    if (modal) modal.hide();
                } catch (error) {
                    this.showToast('Failed to copy', 'error');
                }
            },
            shareMore: async () => {
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            url: shareUrl
                        });
                    } catch (error) {
                        console.log('Share cancelled or failed');
                    }
                } else {
                    this.showToast('Not supported', 'warning');
                }
            }
        };

        Object.entries(handlers).forEach(([id, handler]) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', handler);
            }
        });
    }

    setupLightbox() { }

    openLightbox(imageIndex = 0) {
        if (!this.currentImageSet || this.currentImageSet.length === 0) return;

        this.currentImageIndex = imageIndex;
        const lightbox = document.getElementById('imageLightbox');
        const lightboxImage = document.getElementById('lightboxImage');

        if (!lightbox || !lightboxImage) return;

        this.updateLightboxImage();

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        const closeBtn = document.getElementById('closeLightbox');
        const prevBtn = document.getElementById('lightboxPrev');
        const nextBtn = document.getElementById('lightboxNext');

        const closeLightbox = () => {
            lightbox.style.opacity = '0';
            setTimeout(() => {
                lightbox.classList.remove('active');
                lightbox.style.opacity = '1';
                document.body.style.overflow = '';
                document.removeEventListener('keydown', this.handleLightboxKeyboard);
            }, 200);
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeLightbox, { once: true });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateLightbox(-1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateLightbox(1));
        }

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        }, { once: true });

        this.handleLightboxKeyboard = (e) => {
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    closeLightbox();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateLightbox(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateLightbox(1);
                    break;
            }
        };

        document.addEventListener('keydown', this.handleLightboxKeyboard);
    }

    updateLightboxImage() {
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxCounter = document.getElementById('lightboxCounter');
        const prevBtn = document.getElementById('lightboxPrev');
        const nextBtn = document.getElementById('lightboxNext');

        if (!lightboxImage || !this.currentImageSet.length) return;

        const currentImage = this.currentImageSet[this.currentImageIndex];
        const imageUrl = currentImage.url || currentImage;

        lightboxImage.style.opacity = '0.5';
        lightboxImage.src = imageUrl;
        lightboxImage.alt = `Photo ${this.currentImageIndex + 1} of ${this.currentImageSet.length}`;

        lightboxImage.onload = () => {
            lightboxImage.style.opacity = '1';
        };

        if (lightboxCounter) {
            lightboxCounter.textContent = `${this.currentImageIndex + 1} / ${this.currentImageSet.length}`;
        }

        if (prevBtn) {
            prevBtn.classList.toggle('disabled', this.currentImageIndex === 0);
        }

        if (nextBtn) {
            nextBtn.classList.toggle('disabled', this.currentImageIndex === this.currentImageSet.length - 1);
        }
    }

    navigateLightbox(direction) {
        if (!this.currentImageSet.length) return;

        const newIndex = this.currentImageIndex + direction;

        if (newIndex >= 0 && newIndex < this.currentImageSet.length) {
            this.currentImageIndex = newIndex;
            this.updateLightboxImage();
        }
    }

    openShareModal() {
        const modal = new bootstrap.Modal(document.getElementById('shareModal'));
        modal.show();
    }

    hideLoader() {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.classList.add('hidden');
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                }, 300);
            }, 200);
        }
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value || '';
        }
    }

    formatPosterUrl(posterPath) {
        if (!posterPath) {
            return this.getPlaceholderImage();
        }
        if (posterPath.startsWith('http')) {
            return posterPath;
        }
        return `https://image.tmdb.org/t/p/w300${posterPath}`;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    getGenderText(gender) {
        const genderMap = {
            0: 'Not specified',
            1: 'Female',
            2: 'Male',
            3: 'Non-binary'
        };
        return genderMap[gender] || 'Not specified';
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    generateSlug(title, year) {
        if (!title) return '';

        let slug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .trim();

        if (year) {
            slug += `-${year}`;
        }

        return slug;
    }

    showToast(message, type = 'success') {
        if (window.topbar?.notificationSystem) {
            window.topbar.notificationSystem.show(message, type);
        } else {
            console.log(`Toast: ${message} (${type})`);
        }
    }

    showError(message) {
        const container = document.querySelector('#main-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px; min-height: 400px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <i data-feather="alert-circle" style="width: 64px; height: 64px; color: var(--text-secondary); margin-bottom: 16px;"></i>
                    <h2 style="color: var(--text-primary); margin-bottom: 8px;">Error</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">${this.escapeHtml(message)}</p>
                    <a href="/" style="color: var(--cinebrain-primary); text-decoration: none; padding: 12px 24px; border: 1px solid var(--cinebrain-primary); border-radius: 8px;">Go Home</a>
                </div>
            `;

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
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

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    }

    getPlaceholderAvatar() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gUGhvdG88L3RleHQ+PC9zdmc+';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const personPage = new PersonPage();
        window.personPage = personPage;
    } catch (error) {
        console.error('Failed to initialize person page:', error);
    }
});