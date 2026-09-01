// Deriva cardíaca real: ((FC media 2ª mitad − FC media 1ª mitad) / FC
// media 1ª mitad) × 100 -- fórmula estándar, comparando splits reales ya
// capturados por km. Solo tiene el mismo significado en un esfuerzo
// estable (Rodaje/Z2, workout.type "easy"): en Series u otro tipo con
// tramos de intensidad distinta a propósito, una FC más alta en la
// segunda mitad no es "deriva", es la propia estructura del entreno --
// null fuera de ese tipo, o sin suficiente FC real por km.
//
// Extraído de RunningDetailView.js (vivía privado ahí) para que
// referenceRouteEfficiency.js (Recorridos de referencia) pueda mostrar la
// misma deriva en la tarjeta resumen de un recorrido sin duplicar la
// fórmula ni los umbrales -- una sola fuente de verdad para "qué es una
// buena deriva" en toda la app.
const DRIFT_MIN_HR_SPLITS = 4;

// Umbrales fijos y trazables (ronda de insights avanzados) -- estándar de
// ciencia del deporte, la única fuente del calificativo: nunca se combina
// con ritmo o temperatura para decidir la etiqueta, precisamente para que
// siempre se pueda explicar con un solo número.
const DRIFT_GOOD_MAX = 5;
const DRIFT_OK_MAX = 10;

function driftTier(percent) {

    if (percent < DRIFT_GOOD_MAX) return { label: "Muy bueno", trend: "up" };
    if (percent <= DRIFT_OK_MAX) return { label: "Bueno", trend: "flat" };
    return { label: "Mejorable", trend: "down" };

}

export function buildCardiacDrift(workout, splits) {

    if (workout.type !== "easy") return null;

    const hrSplits = splits.filter(s => s.segmentType !== "rest" && s.avgHr != null);
    if (hrSplits.length < DRIFT_MIN_HR_SPLITS) return null;

    const half = Math.floor(hrSplits.length / 2);
    const firstHalf = hrSplits.slice(0, half);
    const secondHalf = hrSplits.slice(hrSplits.length - half);

    const average = list => list.reduce((sum, s) => sum + s.avgHr, 0) / list.length;

    const firstAvg = average(firstHalf);
    const secondAvg = average(secondHalf);

    const percent = ((secondAvg - firstAvg) / firstAvg) * 100;

    return { percent, ...driftTier(percent) };

}
