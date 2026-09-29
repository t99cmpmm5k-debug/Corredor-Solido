// Zona 2 personal (Perfil, 2026-09-29) -- mismos valores y mismas reglas
// que server/src/z2Zone.js. Aquí solo sirve para avisar ANTES de enviar
// (el backend vuelve a validar y es el que manda); si algún día cambian
// los límites, hay que tocar los dos archivos.

export const DEFAULT_Z2_MIN_BPM = 130;
export const DEFAULT_Z2_MAX_BPM = 150;

const Z2_BPM_LOWEST = 80;
const Z2_BPM_HIGHEST = 220;

// Texto de los dos <input> del formulario -> { value: { z2MinBpm, z2MaxBpm } }
// o { error }. Los dos vacíos = sin zona personal (null/null, vuelve al
// rango general); uno solo relleno es un error, nunca se completa el otro
// con un valor inventado.
export function parseZ2Inputs(minText, maxText) {

    const minRaw = (minText ?? "").trim();
    const maxRaw = (maxText ?? "").trim();

    if (!minRaw && !maxRaw) return { value: { z2MinBpm: null, z2MaxBpm: null } };

    if (!minRaw || !maxRaw) {
        return { error: "Indica el mínimo y el máximo de tu Zona 2, o deja los dos vacíos." };
    }

    const min = Number(minRaw);
    const max = Number(maxRaw);

    if (!Number.isInteger(min) || !Number.isInteger(max)) {
        return { error: "La Zona 2 tiene que ser en pulsaciones enteras (ppm)." };
    }

    if (min < Z2_BPM_LOWEST || max > Z2_BPM_HIGHEST) {
        return { error: `La Zona 2 tiene que estar entre ${Z2_BPM_LOWEST} y ${Z2_BPM_HIGHEST} ppm.` };
    }

    if (max <= min) {
        return { error: "El máximo de tu Zona 2 tiene que ser mayor que el mínimo." };
    }

    return { value: { z2MinBpm: min, z2MaxBpm: max } };

}

// "125–142 ppm" + si es personal o el general, para mostrarlo en Perfil.
export function describeZ2Range(z2MinBpm, z2MaxBpm) {

    const isPersonal = z2MinBpm != null && z2MaxBpm != null;
    const min = isPersonal ? z2MinBpm : DEFAULT_Z2_MIN_BPM;
    const max = isPersonal ? z2MaxBpm : DEFAULT_Z2_MAX_BPM;

    return { text: `${min}–${max} ppm`, isPersonal };

}
