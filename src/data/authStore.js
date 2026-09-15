// Sesión del backend de sincronización -- el JWT vive en localStorage (no
// IndexedDB: es estado de sesión, no un dato de usuario), mismo criterio
// que themeManager.js con "corredor-solido-theme".
const TOKEN_KEY = "corredor-solido-token";

export function getToken() {

    return localStorage.getItem(TOKEN_KEY);

}

export function setToken(token) {

    localStorage.setItem(TOKEN_KEY, token);

}

export function clearToken() {

    localStorage.removeItem(TOKEN_KEY);

}

export function isLoggedIn() {

    return !!getToken();

}
