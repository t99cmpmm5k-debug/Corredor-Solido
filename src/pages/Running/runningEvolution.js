// Evolución Z2: compara el PRIMERO y el ÚLTIMO de los últimos
// EVOLUTION_GROUP_SIZE Rodajes (Z2) reales, ordenados por fecha -- a
// diferencia de buildTypeProgressInsight() (runningProgress.js), que
// compara la MEDIA de un grupo reciente contra la MEDIA del grupo
// anterior, este bloque es una comparación directa de dos entrenos
// concretos (el ejemplo que se acordó: "5:53/km → 5:42/km"), no un
// promedio. Solo running, solo tipo "easy" (Rodaje Z2) por ahora.

const EVOLUTION_GROUP_SIZE = 5;

// Con menos de esto no hay "evolución" real que mostrar -- 1 entreno no
// tiene con qué compararse.
const EVOLUTION_MIN_WORKOUTS = 2;

// { available: false, count } o { available: true, count, groupSize,
// first, last, paceDeltaSecPerKm, hrDeltaBpm }. Solo entran workouts con
// avgPaceSecPerKm real (mismo criterio que buildTypeProgressInsight() en
// runningProgress.js) -- un rodaje sin ritmo no cuenta como parte de "los
// últimos N". hrDeltaBpm es null si a cualquiera de los dos extremos le
// falta FC real (nunca se rellena con un valor inventado).
export function buildZ2Evolution(workouts, { type = "easy", groupSize = EVOLUTION_GROUP_SIZE } = {}) {

    const sameType = workouts
        .filter(w => w.type === type && w.date && w.avgPaceSecPerKm != null)
        .sort((a, b) => a.date.localeCompare(b.date));

    if (sameType.length < EVOLUTION_MIN_WORKOUTS) {
        return { available: false, count: sameType.length };
    }

    const recent = sameType.slice(-groupSize);
    const first = recent[0];
    const last = recent[recent.length - 1];

    const hrDeltaBpm = (first.avgHr != null && last.avgHr != null)
        ? Math.round(last.avgHr - first.avgHr)
        : null;

    return {

        available: true,
        count: recent.length,
        groupSize,

        first: { date: first.date, avgPaceSecPerKm: first.avgPaceSecPerKm, avgHr: first.avgHr ?? null },
        last: { date: last.date, avgPaceSecPerKm: last.avgPaceSecPerKm, avgHr: last.avgHr ?? null },

        paceDeltaSecPerKm: Math.round(first.avgPaceSecPerKm - last.avgPaceSecPerKm),
        hrDeltaBpm

    };

}
