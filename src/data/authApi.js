// Cliente del backend de sincronización (server/src/routes/auth.js) --
// un único backend real (VPS, api.corredorsolido.es), no hay servidor
// local para desarrollo todavía.
const API_BASE_URL = "https://api.corredorsolido.es";

async function authRequest(path, body) {

    let res;

    try {

        res = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

    } catch {

        // fetch rechaza ANTES de llegar a una respuesta HTTP si no hay red
        // o el backend está caído -- distinto de un 401/409 real, que sí
        // responde. Tratamiento más fino de "sin conexión" pendiente para
        // la Fase 4 (gestión de sesión y offline).
        throw new Error("No se pudo conectar con el servidor. Comprueba tu conexión.");

    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {

        const error = new Error(data.error || "No se pudo completar la operación.");
        // "code" (ej. EMAIL_NOT_VERIFIED) deja que quien llame decida qué
        // hacer sin comparar el texto del mensaje -- frágil si cambia la
        // redacción.
        if (data.code) error.code = data.code;

        throw error;

    }

    return data;

}

export function registro(email, password) {

    return authRequest("registro", { email, password });

}

export function login(email, password) {

    return authRequest("login", { email, password });

}

export function verificar(token) {

    return authRequest("verificar", { token });

}

export function reenviarVerificacion(email) {

    return authRequest("reenviar-verificacion", { email });

}

export function recuperar(email) {

    return authRequest("recuperar", { email });

}

export function restablecer(token, nuevaPassword) {

    return authRequest("restablecer", { token, nuevaPassword });

}
