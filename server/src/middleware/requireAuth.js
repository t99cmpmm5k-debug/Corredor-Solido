import { verifyToken } from "../authUtils.js";

// Exige "Authorization: Bearer <token>" en la petición -- sin token válido,
// 401 antes de llegar a la ruta real. req.userId queda disponible para las
// rutas protegidas (sync.js), siempre el id real del usuario del token,
// nunca uno que venga del cuerpo de la petición (evita que alguien pida
// los datos de OTRO usuario simplemente cambiando un id en el JSON).
export function requireAuth(req, res, next) {

    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Falta el token de sesión (Authorization: Bearer ...)." });
    }

    try {

        const payload = verifyToken(token);
        req.userId = payload.userId;
        next();

    } catch {

        res.status(401).json({ error: "Token inválido o caducado. Vuelve a iniciar sesión." });

    }

}
