// /js/auth.js

// Global variable to hold the JWT token
let authToken = null;
let currentUser = null; // Store user data if needed

/**
 * Sets the authentication token and user data.
 * @param {string} token - The JWT token.
 * @param {object} user - The user object from the login response.
 */
function setAuth(token, user) {
    authToken = token;
    currentUser = user;
    console.log("Auth set:", { authToken, currentUser });
    // Update UI based on auth status (call from main.js after header loads)
    // updateAuthUI();
}

/**
 * Clears the authentication token and user data.
 */
function clearAuth() {
    authToken = null;
    currentUser = null;
    console.log("Auth cleared");
    // Update UI based on auth status (call from main.js after header loads)
    // updateAuthUI();
}

/**
 * Checks if the user is currently authenticated.
 * @returns {boolean} True if authenticated, false otherwise.
 */
function isAuthenticated() {
    return !!authToken; // Returns true if authToken is not null/undefined/empty
}

/**
 * Checks if the authenticated user is an admin.
 * @returns {boolean} True if admin, false otherwise.
 */
function isAdmin() {
    return isAuthenticated() && currentUser && currentUser.is_admin;
}

/**
 * Gets the current authentication token.
 * @returns {string|null} The JWT token or null if not authenticated.
 */
function getAuthToken() {
    return authToken;
}

/**
 * Gets the current user object.
 * @returns {object|null} The user object or null if not authenticated.
 */
function getCurrentUser() {
    return currentUser;
}