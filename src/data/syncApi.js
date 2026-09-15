// Cliente de POST/GET /api/sync (server/src/routes/sync.js) -- separado
// de authApi.js porque estas rutas van autenticadas (Authorization:
// Bearer), a diferencia de /api/auth/*.
const API_BASE_URL = "https://api.corredorsolido.es";

export async function pushSync(payload, token) {

    let res;

    try {

        res = await fetch(`${API_BASE_URL}/api/sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

    } catch {

        throw new Error("No se pudo conectar con el servidor. Comprueba tu conexión.");

    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "No se pudo sincronizar.");

    return data;

}
