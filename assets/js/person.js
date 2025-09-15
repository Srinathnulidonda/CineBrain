// person.js - Person Details Page Handler
class PersonDetailsPage {
    constructor() {
        this.apiBase = 'https://backend-app-970m.onrender.com/api';
        this.personSlug = this.getPersonSlugFromUrl();
        this.personData = null;
        this.currentTab = 'all';

        this.init();
    }

    getPersonSlugFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('slug');
    }

    async init() {
        if (!this.personSlug) {
            this.showError('No person specified');
            return;
        }

        try {
            await this.loadPersonDetails();
            this.setupEventListeners();
            this.hideLoader();

            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        } catch (error) {
            console.error('Error initializing person page:', error);
            this.showError('Failed to load person details');
        }
    }

    async loadPersonDetails() {
        try {
            const response = await fetch(`${this.apiBase}/person/${this.personSlug}`);

            if (!response.ok) {
                throw new Error('Failed to load person details');
            }

            this.personData = await response.json();
            this.renderPersonDetails();
        } catch (error) {
            console.error('Error loading person:', error);
            throw error;
        }
    }

    renderPersonDetails() {
        const data = this.personData;

        // Update page title
        document.title = `${data.name} - CineBrain`;

        // Profile Image
        const profileImg = document.getElementById('profileImage');
        if (profileImg && data.profile_path) {
            const img = new Image();
            img.onload = () => {
                profileImg.src = data.profile_path;
                profileImg.classList.add('loaded');
            };
            img.src = data.profile_path;
            profileImg.alt = data.name;
        }

        // Name
        const nameEl = document.getElementById('personName');
        if (nameEl) {
            nameEl.textContent = data.name;
            const shimmer = nameEl.querySelector('.name-shimmer');
            if (shimmer) shimmer.remove();
        }

        // Meta Info
        const knownFor = document.getElementById('knownFor');
        if (knownFor) {
            knownFor.textContent = data.known_for_department || 'Acting';
        }

        const birthInfo = document.getElementById('birthInfo');
        if (birthInfo && data.birthday) {
            const birthDate = new Date(data.birthday);
            let text = `Born ${birthDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`;

            if (data.place_of_birth) {
                text += ` in ${data.place_of_birth}`;
            }

            if (data.deathday) {
                const deathDate = new Date(data.deathday);
                text += ` - Died ${deathDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}`;
            }

            birthInfo.textContent = text;
        }

        // Biography
        const bioEl = document.getElementById('personBio');
        if (bioEl && data.biography) {
            bioEl.textContent = data.biography;
        }

        // Social Links
        this.renderSocialLinks(data.social_media);

        // Filmography
        this.renderFilmography(data.filmography);

        // Photos
        this.renderPhotoGallery(data.images);
    }

    renderSocialLinks(socialMedia) {
        const container = document.getElementById('socialLinks');
        if (!container || !socialMedia) return;

        let html = '';

        if (socialMedia.twitter) {
            html += `
                <a href="${socialMedia.twitter}" target="_blank" class="social-link">
                    <i data-feather="twitter"></i>
                </a>
            `;
        }

        if (socialMedia.instagram) {
            html += `
                <a href="${socialMedia.instagram}" target="_blank" class="social-link">
                    <i data-feather="instagram"></i>
                </a>
            `;
        }

        if (socialMedia.facebook) {
            html += `
                <a href="${socialMedia.facebook}" target="_blank" class="social-link">
                    <i data-feather="facebook"></i>
                </a>
            `;
        }

        if (socialMedia.imdb) {
            html += `
                <a href="${socialMedia.imdb}" target="_blank" class="social-link">
                    <i data-feather="link"></i>
                </a>
            `;
        }

        container.innerHTML = html;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    renderFilmography(filmography) {
        if (!filmography) return;

        this.filmography = filmography;
        this.filterFilmography('all');
    }

    filterFilmography(tab) {
        const grid = document.getElementById('filmographyGrid');
        if (!grid || !this.filmography) return;

        let works = [];

        switch (tab) {
            case 'all':
                works = [
                    ...this.filmography.as_actor,
                    ...this.filmography.as_director,
                    ...this.filmography.as_writer,
                    ...this.filmography.as_producer
                ];
                break;
            case 'actor':
                works = this.filmography.as_actor;
                break;
            case 'director':
                works = this.filmography.as_director;
                break;
            case 'writer':
                works = this.filmography.as_writer;
                break;
            case 'producer':
                works = this.filmography.as_producer;
                break;
        }

        // Sort by year
        works.sort((a, b) => (b.year || 0) - (a.year || 0));

        // Remove duplicates
        const seen = new Set();
        works = works.filter(work => {
            const key = `${work.id}-${work.character || work.job}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        let html = '';
        works.forEach(work => {
            html += `
                <div class="filmography-card" onclick="window.location.href='/content/details.html?slug=${work.slug}'">
                    <img src="${work.poster_path || this.getPlaceholderImage()}" 
                         alt="${work.title}" 
                         class="filmography-poster">
                    <div class="filmography-title">${work.title}</div>
                    ${work.character ? `<div class="filmography-role">${work.character}</div>` : ''}
                    ${work.job ? `<div class="filmography-role">${work.job}</div>` : ''}
                    ${work.year ? `<div class="filmography-year">${work.year}</div>` : ''}
                </div>
            `;
        });

        grid.innerHTML = html || '<p>No works found</p>';
    }

    renderPhotoGallery(images) {
        const grid = document.getElementById('photoGrid');
        if (!grid || !images || images.length === 0) return;

        let html = '';
        images.forEach(image => {
            html += `
                <div class="photo-item">
                    <img src="${image}" alt="Photo" loading="lazy">
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    setupEventListeners() {
        // Tab buttons
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterFilmography(btn.dataset.tab);
            });
        });
    }

    hideLoader() {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 300);
        }
    }

    showError(message) {
        const container = document.querySelector('.person-header');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <a href="/" class="btn-action">Go Home</a>
                </div>
            `;
        }
        this.hideLoader();
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFhMWYzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY3IiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new PersonDetailsPage();
});