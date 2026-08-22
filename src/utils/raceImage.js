import { RACE_RU_IMAGES, RACE_TRAIL_IMAGES, RACE_FALLBACK_IMAGE } from "../assets/races/index.js";

// Un pool de imágenes por type -- añadir una disciplina nueva es añadir
// una entrada aquí (y sus fotos en assets/races/index.js), sin tocar
// getRaceImage() ni duplicar el hash por cada type.
const IMAGES_BY_TYPE = {
    RU: RACE_RU_IMAGES,
    TRS: RACE_TRAIL_IMAGES
};

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
// por medio. Solo los types con pool propio (RU, TRS) pasan por el
// reparto de sus 4 siluetas; cualquier otro type (o sin type) cae
// siempre al degradado, sin gastar una foto pensada para otra disciplina.
export function getRaceImage(race) {

    const images = IMAGES_BY_TYPE[race?.type];
    if (!images) return RACE_FALLBACK_IMAGE;

    const key = `${race.name ?? ""}${race.date ?? ""}`;
    const index = djb2Hash(key) % images.length;

    return images[index];

}
