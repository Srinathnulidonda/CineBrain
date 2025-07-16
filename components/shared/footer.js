// Footer Component
class Footer {
    render() {
        return `
            <footer class="bg-secondary-bg border-t border-border-color mt-16">
                <div class="container mx-auto px-4 py-8">
                    <!-- Main Footer Content -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                        <!-- About -->
                        <div>
                            <h4 class="font-bold mb-4">About MovieRec</h4>
                            <ul class="space-y-2 text-sm text-text-secondary">
                                <li><a href="/about" class="hover:text-netflix-red transition">About Us</a></li>
                                <li><a href="/how-it-works" class="hover:text-netflix-red transition">How It Works</a></li>
                                <li><a href="/careers" class="hover:text-netflix-red transition">Careers</a></li>
                            </ul>
                        </div>
                        
                        <!-- Browse -->
                        <div>
                            <h4 class="font-bold mb-4">Browse</h4>
                            <ul class="space-y-2 text-sm text-text-secondary">
                                <li><a href="/movies" class="hover:text-netflix-red transition">Movies</a></li>
                                <li><a href="/tv-shows" class="hover:text-netflix-red transition">TV Shows</a></li>
                                <li><a href="/anime" class="hover:text-netflix-red transition">Anime</a></li>
                                <li><a href="/genres" class="hover:text-netflix-red transition">Genres</a></li>
                            </ul>
                        </div>
                        
                        <!-- Support -->
                        <div>
                            <h4 class="font-bold mb-4">Support</h4>
                            <ul class="space-y-2 text-sm text-text-secondary">
                                <li><a href="/help" class="hover:text-netflix-red transition">Help Center</a></li>
                                <li><a href="/contact" class="hover:text-netflix-red transition">Contact Us</a></li>
                                <li><a href="/faq" class="hover:text-netflix-red transition">FAQ</a></li>
                            </ul>
                        </div>
                        
                        <!-- Social -->
                        <div>
                            <h4 class="font-bold mb-4">Follow Us</h4>
                            <div class="flex space-x-4">
                                <a href="#" class="text-text-secondary hover:text-netflix-red transition">
                                    <i class="fab fa-facebook text-xl"></i>
                                </a>
                                <a href="#" class="text-text-secondary hover:text-netflix-red transition">
                                    <i class="fab fa-twitter text-xl"></i>
                                </a>
                                <a href="#" class="text-text-secondary hover:text-netflix-red transition">
                                    <i class="fab fa-instagram text-xl"></i>
                                </a>
                                <a href="#" class="text-text-secondary hover:text-netflix-red transition">
                                    <i class="fab fa-youtube text-xl"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Bottom Bar -->
                    <div class="pt-8 border-t border-border-color text-center text-sm text-text-muted">
                        <p>&copy; 2024 MovieRec. All rights reserved.</p>
                        <div class="mt-2">
                            <a href="/privacy" class="hover:text-netflix-red transition">Privacy Policy</a>
                            <span class="mx-2">|</span>
                            <a href="/terms" class="hover:text-netflix-red transition">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    init() {
        document.getElementById('footer').innerHTML = this.render();
    }
}
