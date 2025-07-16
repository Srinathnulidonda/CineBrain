// Authentication Service
class AuthService {
    static TOKEN_KEY = 'auth_token';
    static USER_KEY = 'user_data';

    static isAuthenticated() {
        return !!this.getToken();
    }

    static getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    static setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    static getUser() {
        const userData = localStorage.getItem(this.USER_KEY);
        return userData ? JSON.parse(userData) : null;
    }

    static setUser(userData) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    }

    static async login(username, password) {
        try {
            const response = await API.login({ username, password });
            this.setToken(response.token);
            this.setUser({
                id: response.user_id,
                username: response.username
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    static async register(username, email, password) {
        try {
            const response = await API.register({ username, email, password });
            this.setToken(response.token);
            this.setUser({
                id: response.user_id,
                username: response.username
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    static logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        API.clearCache();
        window.location.href = '/';
    }

    static isAdmin() {
        const user = this.getUser();
        return user && user.username === 'admin';
    }
}