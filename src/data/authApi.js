// Cliente del backend de sincronización (server/src/routes/auth.js) --
// un único backend real (VPS, api.corredorsolido.es), no hay servidor
// local para desarrollo todavía.
const API_BASE_URL = "https://api.corredorsolido.es";

// token opcional -- las rutas de antes de iniciar sesión (registro/login/
// verificar/recuperar/restablecer) nunca lo llevan; /perfil (ver más abajo)
// sí, con el mismo header Bearer que ya usa syncApi.js. method GET no
// manda body (undefined, no "{}").
async function authRequest(path, body, { method = "POST", token = null } = {}) {

    let res;

    try {

        res = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: body ? JSON.stringify(body) : undefined
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

// authToken: el JWT de sesión (getToken() de authStore.js) -- nombrado
// distinto al `token` de arriba (el de un solo uso de verificar/
// restablecer) para no confundir los dos conceptos.
export function getPerfil(authToken) {

    return authRequest("perfil", null, { method: "GET", token: authToken });

}

// aliasPublico/localidad, cada uno opcional (Perfil, rediseño 2026-09-25:
// el hero edita los dos a la vez, pero el mecanismo tiene que servir
// también para tocar solo uno) -- solo se manda al body el campo que de
// verdad se pasó, nunca `undefined` explícito (el backend distingue "no
// venía este campo" de "se mandó vacío", ver updatePerfil() en
// server/src/routes/auth.js).
export function actualizarPerfil(authToken, { aliasPublico, localidad } = {}) {

    const body = {};
    if (aliasPublico !== undefined) body.aliasPublico = aliasPublico;
    if (localidad !== undefined) body.localidad = localidad;

    return authRequest("perfil", body, { method: "PATCH", token: authToken });

}
