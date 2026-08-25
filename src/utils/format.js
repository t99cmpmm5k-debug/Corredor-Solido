export function formatSecondsAsClock(totalSeconds) {

    if (totalSeconds == null || Number.isNaN(totalSeconds)) return "";

    const abs = Math.max(0, Math.round(totalSeconds));

    const hours = Math.floor(abs / 3600);
    const minutes = Math.floor((abs % 3600) / 60);
    const seconds = abs % 60;

    const ss = String(seconds).padStart(2, "0");

    if (hours > 0) {
        const mm = String(minutes).padStart(2, "0");
        return `${hours}:${mm}:${ss}`;
    }

    return `${minutes}:${ss}`;

}

// Algunas zapatillas se guardaron con la marca ya repetida dentro del
// modelo (tecleado a mano en el formulario, sin ningún autocompletado de
// por medio) — sin esta comprobación, concatenar brand+model a ciegas
// muestra "Adidas Adidas zero evo sl" en vez de "Adidas zero evo sl".
export function formatShoeName(shoe) {

    const brand = shoe.brand?.trim() ?? "";
    const model = shoe.model?.trim() ?? "";

    if (model.toLowerCase().startsWith(brand.toLowerCase()) && brand) return model;

    return `${brand} ${model}`.trim();

}

// Un decimal como mucho, sin arrastrar ceros de sobra ("56" en vez de
// "56,0") -- coma decimal, convención española usada en el resto de la
// app (ver raceFormat.js/Running.js).
export function formatKm(km) {

    const rounded = Math.round((km ?? 0) * 10) / 10;

    return (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)).replace(".", ",");

}

export function parseClockToSeconds(text) {

    const trimmed = String(text ?? "").trim();
    if (!trimmed) return null;

    const parts = trimmed.split(":").map(Number);
    if (parts.some(Number.isNaN)) return null;

    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

    return null;

}
