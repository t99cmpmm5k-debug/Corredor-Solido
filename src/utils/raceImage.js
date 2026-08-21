import { RACE_RU_IMAGES, RACE_FALLBACK_IMAGE } from "../assets/races/index.js";

// djb2 — barata, determinista y con buena distribución para strings
// cortos como "nombre+fecha" de una carrera. No necesita ser
// criptográfica, solo repartir de forma estable entre las 4 fotos.
export function djb2Hash(text) {

    let hash = 5381;

    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
    }

    return Math.abs(hash);

}

// Misma carrera (mismo nombre+fecha) siempre devuelve la misma foto, en
// cualquier render o sesión — el hash es puro, no hay estado ni azar de
// por medio. Solo las de asfalto (type "RU") pasan por el reparto de las
// 4 siluetas; cualquier otro type (o sin type) cae siempre al degradado,
// sin gastar una foto de corredor pensada para asfalto.
export function getRaceImage(race) {

    if (race?.type !== "RU") return RACE_FALLBACK_IMAGE;

    const key = `${race.name ?? ""}${race.date ?? ""}`;
    const index = djb2Hash(key) % RACE_RU_IMAGES.length;

    return RACE_RU_IMAGES[index];

}
