// Optimized User Interactions Component
class UserInteractions {
    static async recordView(contentId) {
        if (!AuthService.isAuthenticated()) return;
        
        try {
            await API.recordInteraction(contentId, 'view');
        } catch (error) {
            console.error('Failed to record view:', error);
        }
    }

    static async toggleWishlist(contentId, button) {
        if (!AuthService.isAuthenticated()) {
            new Toast('Please sign in to add to wishlist', 'warning').show();
            return false;
        }

        try {
            const isInWishlist = button.classList.contains('active');
            await API.recordInteraction(contentId, isInWishlist ? 'remove_wishlist' : 'wishlist');
            
            button.classList.toggle('active');
            button.querySelector('i').classList.toggle('fas');
            button.querySelector('i').classList.toggle('far');
            
            new Toast(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist', 'success').show();
            return !isInWishlist;
        } catch (error) {
            new Toast('Action failed', 'error').show();
            return false;
        }
    }

    static async toggleFavorite(contentId, button) {
        if (!AuthService.isAuthenticated()) {
            new Toast('Please sign in to add to favorites', 'warning').show();
            return false;
        }

        try {
            const isFavorite = button.classList.contains('active');
            await API.recordInteraction(contentId, isFavorite ? 'remove_favorite' : 'favorite');
            
            button.classList.toggle('active');
            button.querySelector('i').classList.toggle('fas');
            button.querySelector('i').classList.toggle('far');
            
            new Toast(isFavorite ? 'Removed from favorites' : 'Added to favorites', 'success').show();
            return !isFavorite;
        } catch (error) {
            new Toast('Action failed', 'error').show();
            return false;
        }
    }

    static async rateContent(contentId, rating) {
        if (!AuthService.isAuthenticated()) {
            new Toast('Please sign in to rate', 'warning').show();
            return;
        }

        try {
            await API.recordInteraction(contentId, 'rating', rating);
            new Toast(`Rated ${rating}/10`, 'success').show();
        } catch (error) {
            new Toast('Failed to submit rating', 'error').show();
        }
    }

    static renderRatingStars(contentId, currentRating = 0) {
        return `
            <div class="rating-stars-interactive" data-content-id="${contentId}">
                ${Array.from({length: 10}, (_, i) => `
                    <button onclick="UserInteractions.rateContent(${contentId}, ${i + 1})" 
                            class="star-btn ${i < currentRating ? 'active' : ''}"
                            onmouseover="UserInteractions.hoverRating(event, ${i + 1})"
                            onmouseout="UserInteractions.resetRating(event, ${currentRating})">
                        <i class="fas fa-star"></i>
                    </button>
                `).join('')}
                <span class="ml-2 text-sm">${currentRating > 0 ? `${currentRating}/10` : 'Rate this'}</span>
            </div>
        `;
    }

    static hoverRating(event, rating) {
        const container = event.target.closest('.rating-stars-interactive');
        const stars = container.querySelectorAll('.star-btn');
        stars.forEach((star, index) => {
            star.classList.toggle('hover', index < rating);
        });
    }

    static resetRating(event, currentRating) {
        const container = event.target.closest('.rating-stars-interactive');
        const stars = container.querySelectorAll('.star-btn');
        stars.forEach((star, index) => {
            star.classList.remove('hover');
            star.classList.toggle('active', index < currentRating);
        });
    }
}