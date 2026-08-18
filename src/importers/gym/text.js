// Copia deliberada de plan/text.js -- cada importador es autocontenido,
// mismo criterio que garmin.js/plan/*.js hoy (ver comentario en CLAUDE.md).
export function normalizeText(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");

}

export function slugify(value) {

    return normalizeText(value)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}
