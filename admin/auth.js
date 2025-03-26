(function() {
            // Load authentication data from localStorage
            function loadAuthData() {
                try {
                    const storedUser = localStorage.getItem('currentUser');
                    const storedToken = localStorage.getItem('authToken');
                    
                    if (storedUser && storedToken) {
                        window.currentUser = JSON.parse(storedUser);
                        window.authToken = storedToken;
                        return true;
                    }
                } catch (error) {
                    console.error('Error loading auth data:', error);
                    clearAuthData();
                }
                return false;
            }

            // Clear authentication data
            function clearAuthData() {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                window.currentUser = null;
                window.authToken = null;
            }

            // Save authentication data
            function saveAuthData(user, token) {
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('authToken', token);
                window.currentUser = user;
                window.authToken = token;
            }

            // Global logout function
            function logout() {
                clearAuthData();
                window.location.href = '/login.html';
            }

            // Expose globally
            window.loadAuthData = loadAuthData;
            window.clearAuthData = clearAuthData;
            window.saveAuthData = saveAuthData;
            window.globalLogout = logout;

            // Auto-load on page load
            loadAuthData();
        })();
