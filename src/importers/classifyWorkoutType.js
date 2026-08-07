// Propone un tipo de entrenamiento (easy/series/tempo/long/race) a partir
// de tres señales, por orden de fiabilidad: título de Garmin > patrón de
// los parciales > distancia. Si ninguna es clara, "easy" con confianza
// baja — el usuario lo confirma o lo cambia en Revisar (ver
// RunningReviewStep.js, mismo mecanismo de fieldMeta que el resto de
// campos).
//
// Umbrales de arrancar, sin datos reales todavía para calibrarlos —
// todos nombrados aquí para poder ajustarlos en un solo sitio.
const RESIDUAL_LAP_THRESHOLD_KM = 0.3;
const MIN_SPLITS_FOR_PATTERN = 3;
const ALTERNATION_RATIO_THRESHOLD = 0.6;
const SERIES_CV_THRESHOLD = 0.08;
const LONG_RUN_DISTANCE_KM = 13;

export const TYPE_CONFIDENCE = {
    title: 0.95,
    splits: 0.85,
    distance: 0.75,
    default: 0.5
};

// Con límites de palabra para no disparar por un substring suelto dentro
// de otra palabra. Lista de partida a partir de cómo nombra sus
// actividades el usuario — ampliar aquí según haga falta.
const TITLE_PATTERNS = [
    { type: "race", pattern: /\bcarreras?\b|\bcompetici[oó]n\b/i },
    { type: "series", pattern: /\bseries?\b|\brepeticiones\b/i },
    { type: "tempo", pattern: /\btempo\b|\bumbral\b/i },
    { type: "long", pattern: /\btirada\b|\bfondo\b/i },
    { type: "easy", pattern: /\brodaje\b|\bsuave\b|\brecuperaci[oó]n\b/i }
];

function matchTitle(title) {

    if (!title) return null;

    const match = TITLE_PATTERNS.find(({ pattern }) => pattern.test(title));

    return match ? match.type : null;

}

// Misma vuelta residual que descarta el gráfico de ritmo del detalle
// (RunningDetailView.js) — Garmin cierra la vuelta en curso al parar el
// cronómetro, y esa última vuelta corta distorsiona la variación.
function usableSplits(splits) {

    const withPace = (splits || []).filter(s => s.paceSecPerKm != null);
    if (!withPace.length) return [];

    const last = withPace[withPace.length - 1];

    return last.distanceKm != null && last.distanceKm < RESIDUAL_LAP_THRESHOLD_KM
        ? withPace.slice(0, -1)
        : withPace;

}

// Series se reconoce por ALTERNANCIA (rápido-lento-rápido-lento), no solo
// por varianza alta — una tirada larga que se va apagando también varía,
// sin ser series. Devuelve "series" o null; no intenta detectar tempo
// (un tempo bien corrido tiene ritmo bastante estable, más rápido de lo
// normal — sin saber el ritmo habitual del usuario no hay huella clara
// en los splits, así que tempo depende casi en exclusiva del título).
function matchSplitsPattern(splits) {

    const usable = usableSplits(splits);
    if (usable.length < MIN_SPLITS_FOR_PATTERN) return null;

    const paces = usable.map(s => s.paceSecPerKm);
    const mean = paces.reduce((sum, p) => sum + p, 0) / paces.length;

    if (!mean) return null;

    const variance = paces.reduce((sum, p) => sum + (p - mean) ** 2, 0) / paces.length;
    const cv = Math.sqrt(variance) / mean;

    const deltas = [];
    for (let i = 1; i < paces.length; i++) deltas.push(paces[i] - paces[i - 1]);

    let reversals = 0;
    for (let i = 1; i < deltas.length; i++) {
        if (Math.sign(deltas[i]) !== 0 && Math.sign(deltas[i - 1]) !== 0 && Math.sign(deltas[i]) !== Math.sign(deltas[i - 1])) {
            reversals++;
        }
    }

    const alternationRatio = deltas.length > 1 ? reversals / (deltas.length - 1) : 0;

    return alternationRatio >= ALTERNATION_RATIO_THRESHOLD && cv >= SERIES_CV_THRESHOLD
        ? "series"
        : null;

}

function matchDistance(distanceKm) {

    if (distanceKm == null) return null;

    return distanceKm >= LONG_RUN_DISTANCE_KM ? "long" : "easy";

}

export function inferWorkoutType({ title, distanceKm, splits }) {

    const fromTitle = matchTitle(title);
    if (fromTitle) return { type: fromTitle, confidence: TYPE_CONFIDENCE.title };

    if (matchSplitsPattern(splits) === "series") {
        return { type: "series", confidence: TYPE_CONFIDENCE.splits };
    }

    const fromDistance = matchDistance(distanceKm);
    if (fromDistance) return { type: fromDistance, confidence: TYPE_CONFIDENCE.distance };

    return { type: "easy", confidence: TYPE_CONFIDENCE.default };

}
