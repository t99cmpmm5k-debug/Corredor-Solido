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
