// Cliente de GET /api/community/entrenos (server/src/routes/community.js) --
// archivo propio, no authApi.js/syncApi.js: esta ruta no es de sesión
// (login/perfil) ni de sincronización de MIS datos, es la agregada de
// TODOS los usuarios que consume Comunidad (Fase 1: Mapas). Mismo
// tratamiento de red que syncApi.js (timeout + distinguir "sin conexión"
// de un error real del servidor) -- la app siempre requiere sesión
// iniciada para llegar aquí (ver main.js: start(isLoggedIn() ? Home :
// Login)), así que el token nunca falta en la práctica.
const API_BASE_URL = "https://api.corredorsolido.es";

const REQUEST_TIMEOUT_MS = 15000;

export async function getEntrenosComunidad(token) {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;

    try {

        res = await fetch(`${API_BASE_URL}/api/community/entrenos`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            signal: controller.signal
        });

    } catch {

        throw new Error("No se pudo conectar con el servidor. Comprueba tu conexión.");

    } finally {

        clearTimeout(timeout);

    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "No se pudieron cargar los entrenos de la comunidad.");

    return data;

}

// Cliente de GET /api/community/entrenos/:id -- detalle completo de UN
// entreno (con `splits`), de CUALQUIER usuario, para abrir el mapa
// fullscreen desde una tarjeta de Mapas (ver initComunidadEvents.js). Mismo
// tratamiento de red que getEntrenosComunidad de arriba -- timeout propio,
// "sin conexión" separado de un error real del servidor (incluido el 404
// de un id inexistente, que llega aquí como cualquier otro !res.ok con su
// propio mensaje).
export async function getEntrenoComunidadDetail(id, token) {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;

    try {

        res = await fetch(`${API_BASE_URL}/api/community/entrenos/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            signal: controller.signal
        });

    } catch {

        throw new Error("No se pudo conectar con el servidor. Comprueba tu conexión.");

    } finally {

        clearTimeout(timeout);

    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "No se pudo cargar el detalle de este entreno.");

    return data;

}

// Cliente de POST/DELETE /api/community/entrenos/:id/like (Fase 3b) -- dar/
// quitar like a CUALQUIER entreno, de cualquier usuario. Mismo tratamiento
// de red que las dos funciones de arriba. Devuelven `{ liked, likesCount }`
// -- el conteo real que devuelve el servidor, para que comunidadStore.js
// pueda reconciliar el update optimista con el valor autoritativo tras la
// respuesta (nunca confiar solo en el +1/-1 local para siempre).
export async function likeComunidadEntreno(id, token) {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;

    try {

        res = await fetch(`${API_BASE_URL}/api/community/entrenos/${id}/like`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            signal: controller.signal
        });

    } catch {

        throw new Error("No se pudo conectar con el servidor. Comprueba tu conexión.");

    } finally {

        clearTimeout(timeout);

    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "No se pudo dar like a este entreno.");

    return data;

}

export async function unlikeComunidadEntreno(id, token) {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;

    try {

        res = await fetch(`${API_BASE_URL}/api/community/entrenos/${id}/like`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            signal: controller.signal
        });

    } catch {

        throw new Error("No se pudo conectar con el servidor. Comprueba tu conexión.");

    } finally {

        clearTimeout(timeout);

    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "No se pudo quitar el like de este entreno.");

    return data;

}
