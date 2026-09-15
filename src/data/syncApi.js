// Cliente de POST/GET /api/sync (server/src/routes/sync.js) -- separado
// de authApi.js porque estas rutas van autenticadas (Authorization:
// Bearer), a diferencia de /api/auth/*.
const API_BASE_URL = "https://api.corredorsolido.es";

// Sin esto, un fetch colgado (backend caído a medias, red rara) esperaría
// indefinidamente y bloquearía runSync() para siempre en vez de que el
// siguiente disparador (próxima escritura, próximo primer plano) lo
// reintente -- ver Fase 4 (gestión de sesión y offline).
const REQUEST_TIMEOUT_MS = 15000;

// code "OFFLINE": fetch rechazó antes de llegar a una respuesta HTTP (sin
// red, backend caído, o el timeout de arriba) -- syncManager.js lo trata
// como "sin conexión, reintentar en el próximo disparador", nunca como un
// error real. code "UNAUTHORIZED": 401 -- token caducado o inválido,
// syncManager.js limpia la sesión y manda a Login.
async function syncRequest(method, token, body) {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;

    try {

        res = await fetch(`${API_BASE_URL}/api/sync`, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });

    } catch {

        const err = new Error("No se pudo conectar con el servidor. Comprueba tu conexión.");
        err.code = "OFFLINE";
        throw err;

    } finally {

        clearTimeout(timeout);

    }

    if (res.status === 401) {

        const err = new Error("Token inválido o caducado. Vuelve a iniciar sesión.");
        err.code = "UNAUTHORIZED";
        throw err;

    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "No se pudo sincronizar.");

    return data;

}

export function pushSync(payload, token) {

    return syncRequest("POST", token, payload);

}

export function pullSync(token) {

    return syncRequest("GET", token);

}
