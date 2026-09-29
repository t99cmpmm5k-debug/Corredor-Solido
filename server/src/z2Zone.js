// Zona 2 por usuario (2026-09-29) -- una sola fuente para el rango por
// defecto, los límites razonables y la validación, compartida por
// routes/auth.js (guardar el rango en Perfil) y routes/community.js
// (calcular el % de tiempo en zona del Ranking). El frontend repite la
// misma validación en Perfil (src/pages/Profile/z2Zone.js) solo para dar
// el error antes de enviar; la que manda es esta.

// Rango fijo de siempre (confirmado con el usuario en la Fase 2 del
// Ranking) -- sigue siendo el que se usa para cualquiera que no haya
// configurado el suyo, así que nadie pierde su cálculo actual.
export const DEFAULT_Z2_MIN_BPM = 130;
export const DEFAULT_Z2_MAX_BPM = 150;

// Límites de "rango razonable" para una zona introducida a mano -- fuera
// de esto es casi seguro un error de tecleo (p. ej. 15 en vez de 150).
export const Z2_BPM_LOWEST = 80;
export const Z2_BPM_HIGHEST = 220;

// { minBpm, maxBpm, isPersonal } -- el rango personal solo cuenta si están
// los DOS valores (la migración y PATCH /perfil los guardan siempre juntos,
// pero una fila a medias nunca debe producir un rango raro).
export function resolveZ2Range(minBpm, maxBpm) {

    if (minBpm != null && maxBpm != null) {
        return { minBpm: Number(minBpm), maxBpm: Number(maxBpm), isPersonal: true };
    }

    return { minBpm: DEFAULT_Z2_MIN_BPM, maxBpm: DEFAULT_Z2_MAX_BPM, isPersonal: false };

}

// null si es válido; si no, el mensaje de error (en español, se muestra
// tal cual en Perfil). null/null es válido: borra el rango personal y
// vuelve al rango general.
export function validateZ2Range(minBpm, maxBpm) {

    if (minBpm === null && maxBpm === null) return null;

    if (minBpm == null || maxBpm == null) {
        return "Indica el mínimo y el máximo de tu Zona 2, o deja los dos vacíos.";
    }

    if (!Number.isInteger(minBpm) || !Number.isInteger(maxBpm)) {
        return "La Zona 2 tiene que ser en pulsaciones enteras (ppm).";
    }

    if (minBpm < Z2_BPM_LOWEST || maxBpm > Z2_BPM_HIGHEST) {
        return `La Zona 2 tiene que estar entre ${Z2_BPM_LOWEST} y ${Z2_BPM_HIGHEST} ppm.`;
    }

    if (maxBpm <= minBpm) {
        return "El máximo de tu Zona 2 tiene que ser mayor que el mínimo.";
    }

    return null;

}
