export function renderMovieCard(content, options = {}) {
  const poster = getPosterUrl(content);
  return `
    <div class="movie-card medium" data-movie-id="${content.id}">
      <div class="movie-poster">
        <img src="${poster}" alt="${content.title}" loading="lazy" class="lazy-img">
        <div class="movie-overlay">
          <button class="play-btn" title="Watch Trailer"><i class="fas fa-play"></i></button>
          <button class="wishlist-btn" title="Add to Wishlist"><i class="far fa-heart"></i></button>
        </div>
        ${content.admin_title ? `<span class="card-badge admin">Admin</span>` : ''}
        ${content.content_type === 'anime' ? `<span class="card-badge anime">Anime</span>` : ''}
        ${content.content_type === 'tv' ? `<span class="card-badge tv">TV</span>` : ''}
        ${content.content_type === 'movie' ? `<span class="card-badge trending">Movie</span>` : ''}
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${content.title}</h3>
        <div class="movie-meta">${content.release_date ? content.release_date.substring(0,4) : ''} &middot; <span class="movie-rating"><i class="fas fa-star"></i> ${content.rating ? content.rating.toFixed(1) : 'N/A'}</span></div>
        <div class="movie-genres">${(content.genre_names || []).join(', ')}</div>
      </div>
    </div>
  `;
}