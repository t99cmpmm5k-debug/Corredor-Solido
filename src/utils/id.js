// crypto.randomUUID() solo existe en contexto seguro (HTTPS o localhost).
// Entrando por IP local en la red (p. ej. para probar en el móvil) Safari
// no lo expone, y el guardado fallaba entero. crypto.getRandomValues() sí
// funciona en cualquier contexto — con eso se arma un UUID v4 a mano.
export function generateId() {

    if (typeof crypto?.randomUUID === "function") {
        return crypto.randomUUID();
    }

    if (typeof crypto?.getRandomValues === "function") {

        const bytes = crypto.getRandomValues(new Uint8Array(16));

        bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

        const hex = [...bytes].map(b => b.toString(16).padStart(2, "0"));

        return [
            hex.slice(0, 4).join(""),
            hex.slice(4, 6).join(""),
            hex.slice(6, 8).join(""),
            hex.slice(8, 10).join(""),
            hex.slice(10, 16).join("")
        ].join("-");

    }

    // Último recurso — no debería hacer falta en un navegador real, pero
    // mejor un id menos "canónico" que dejar el guardado roto del todo.
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

}
