// Limitador simple en memoria -- un solo proceso (pm2-runtime, ver
// pm2-rasr1010.service en el VPS), sin Redis: de sobra para el volumen
// esperado (grupo beta). Se pierde al reiniciar el proceso -- aceptable,
// esto es solo para frenar abuso obvio, no un límite de facturación.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 3;

const hits = new Map();

// Por IP + email a la vez -- así una IP no bloquea a todo el mundo detrás
// de ella (NAT, red compartida) pero tampoco basta con cambiar de email
// para saltarse el límite desde la misma IP.
export function emailRateLimit(req, res, next) {

    const email = (req.body?.email || "").trim().toLowerCase();
    if (!email) return next();

    const key = `${req.ip}:${email}`;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter(timestamp => now - timestamp < WINDOW_MS);

    if (recent.length >= MAX_REQUESTS) {
        return res.status(429).json({ error: "Demasiados intentos. Inténtalo de nuevo más tarde." });
    }

    recent.push(now);
    hits.set(key, recent);

    next();

}

// Mismo patrón que emailRateLimit (en memoria, sin Redis) pero por IP sola
// -- las peticiones de tiles no llevan email ni sesión (Leaflet las carga
// como <img> normales, no puede mandar el JWT, ver routes/tiles.js). Límite
// mucho más alto y ventana más corta que el de email a propósito: un
// pellizco de zoom real dispara de golpe una docena+ de tiles nuevos en
// menos de un segundo -- esto no es para frenar el uso normal, solo un
// script que intente drenar la cuota gratuita de Esri a través de este
// proxy.
const TILE_WINDOW_MS = 60 * 1000;
const TILE_MAX_REQUESTS = 180;

const tileHits = new Map();

export function tileRateLimit(req, res, next) {

    const now = Date.now();
    const recent = (tileHits.get(req.ip) || []).filter(timestamp => now - timestamp < TILE_WINDOW_MS);

    if (recent.length >= TILE_MAX_REQUESTS) {
        return res.status(429).end();
    }

    recent.push(now);
    tileHits.set(req.ip, recent);

    next();

}
