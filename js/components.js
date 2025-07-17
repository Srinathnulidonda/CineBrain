class ComponentBuilder {
    static createContentCard(content, size = 'normal') {
        const cardClass = size === 'large' ? 'col-md-3 col-sm-4 col-6' : 'col-lg-2 col-md-3 col-sm-4 col-6';
        const imageHeight = size === 'large' ? '400px' : '300px';
        
        return `
            <div class="${cardClass} mb-4">
                <div class="content-card h-100" onclick="app.showContentDetails(${content.id})">
                    <img src="${content.poster_path || 'https://via.placeholder.com/300x450'}" 
                         alt="${content.title}" style="height: ${imageHeight};">
                    <div class="p-3">
                        <h6 class="text-white mb-2">${content.title}</h6>
                        ${content.genre_names ? content.genre_names.slice(0, 2).map(genre => 
                            `<span class="genre-tag">${genre}</span>`
                        ).join('') : ''}
                        ${content.rating ? `
                            <div class="mt-2">
                                <span class="rating-stars">${'★'.repeat(Math.floor(content.rating / 2))}</span>
                                <span class="text-light ms-1">${content.rating}/10</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    static createHeroCarousel(trending) {
        if (!trending || trending.length === 0) return '';
        
        const carouselItems = trending.slice(0, 5).map((item, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="https://image.tmdb.org/t/p/w1280${item.backdrop_path}" alt="${item.title || item.name}">
                <div class="carousel-caption d-block">
                    <h2 class="display-4 fw-bold">${item.title || item.name}</h2>
                    <p class="lead">${(item.overview || '').substring(0, 150)}...</p>
                    <div class="mb-3">
                        ${item.youtube_videos && item.youtube_videos.length > 0 ? `
                            <button class="btn btn-netflix me-2" onclick="app.playVideo('${item.youtube_videos[0].video_id}')">
                                <i class="fas fa-play me-2"></i>Play Trailer
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-light" onclick="app.showContentDetails(${item.id})">
                            <i class="fas fa-info-circle me-2"></i>More Info
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <div id="heroCarousel" class="carousel slide mb-5" data-bs-ride="carousel">
                <div class="carousel-inner">
                    ${carouselItems}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#heroCarousel" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#heroCarousel" data-bs-slide="next">
                    <span class="carousel-control-next-icon"></span>
                </button>
            </div>
        `;
    }

    static createContentSection(title, content, sectionId = '') {
        if (!content || content.length === 0) return '';
        
        return `
            <section class="mb-5" ${sectionId ? `id="${sectionId}"` : ''}>
                <h3 class="text-white mb-3 fw-bold">${title}</h3>
                <div class="content-scroll">
                    ${content.map(item => `
                        <div class="content-card flex-shrink-0" style="width: 200px;" onclick="app.showContentDetails(${item.id})">
                            <img src="${item.poster_path || 'https://via.placeholder.com/200x300'}" 
                                 alt="${item.title}" style="width: 200px; height: 300px; object-fit: cover;">
                            <div class="p-2">
                                <h6 class="text-white mb-1 small">${item.title}</h6>
                                ${item.rating ? `<small class="text-netflix">${item.rating}/10</small>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    static createLoadingSkeleton(count = 10) {
        return Array(count).fill().map(() => `
            <div class="col-lg-2 col-md-3 col-sm-4 col-6 mb-4">
                <div class="loading-skeleton" style="height: 300px; border-radius: 8px;"></div>
                <div class="loading-skeleton mt-2" style="height: 20px; border-radius: 4px;"></div>
                <div class="loading-skeleton mt-1" style="height: 15px; width: 60%; border-radius: 4px;"></div>
            </div>
        `).join('');
    }

    static createSearchResults(results) {
        if (!results || (results.database_results.length === 0 && results.tmdb_results.length === 0)) {
            return '<div class="text-center text-light p-5"><h4>No results found</h4></div>';
        }

        const allResults = [...results.database_results, ...results.tmdb_results];
        
        return `
            <div class="container mt-4">
                <h3 class="text-white mb-4">Search Results (${allResults.length} found)</h3>
                <div class="row">
                    ${allResults.map(item => this.createContentCard(item)).join('')}
                </div>
            </div>
        `;
    }

    static createUserProfile(user) {
        return `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-md-8 mx-auto">
                        <div class="content-card p-4">
                            <h2 class="text-white mb-4">Profile</h2>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label text-white">Username</label>
                                        <input type="text" class="form-control" value="${user.username}" readonly>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label text-white">Email</label>
                                        <input type="email" class="form-control" value="${user.email || 'Not provided'}" readonly>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-4">
                                <div class="col-md-6">
                                    <button class="btn btn-netflix w-100" onclick="app.showWatchlist()">
                                        <i class="fas fa-list me-2"></i>My Watchlist
                                    </button>
                                </div>
                                <div class="col-md-6">
                                    <button class="btn btn-outline-light w-100" onclick="app.showFavorites()">
                                        <i class="fas fa-heart me-2"></i>My Favorites
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}