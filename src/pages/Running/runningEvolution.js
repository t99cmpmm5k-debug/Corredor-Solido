// Evolución por tipo de entreno: compara el PRIMERO y el ÚLTIMO de los
// últimos `groupSize` entrenos reales de un mismo tipo, ordenados por
// fecha -- a diferencia de buildTypeProgressInsight() (runningProgress.js),
// que compara la MEDIA de un grupo reciente contra la MEDIA del grupo
// anterior, este bloque es una comparación directa de dos entrenos
// concretos (el ejemplo que se acordó para Z2: "5:53/km → 5:42/km"), no
// un promedio.
//
// Nació como "Evolución Z2" (solo tipo "easy", groupSize 5) y se
// generalizó para Series/Tempo (Capa 3, cierre del documento de 35
// propuestas) -- mismo motor, groupSize más corto para esos dos tipos
// porque previsiblemente hay bastante menos volumen acumulado que de Z2
// (ver EVOLUTION_TYPE_CONFIG en Running.js). "Tirada larga" y "Carrera"
// se quedan fuera a propósito en Running.js: el ritmo de una tirada larga
// o de una carrera varía mucho con la distancia de cada sesión/carrera
// concreta -- un "primero vs último" entre dos de longitud muy distinta
// compararía esfuerzos que no son comparables entre sí, el mismo motivo
// por el que Z2 siempre se limitó a un único tipo de esfuerzo homogéneo.
export const EVOLUTION_GROUP_SIZE = 5;

// Con menos de esto no hay "evolución" real que mostrar -- 1 entreno no
// tiene con qué compararse. Mismo umbral para todos los tipos.
const EVOLUTION_MIN_WORKOUTS = 2;

// { available: false, count } o { available: true, count, groupSize,
// first, last, paceDeltaSecPerKm, hrDeltaBpm }. Solo entran workouts con
// avgPaceSecPerKm real (mismo criterio que buildTypeProgressInsight() en
// runningProgress.js) -- un entreno sin ritmo no cuenta como parte de
// "los últimos N". hrDeltaBpm es null si a cualquiera de los dos extremos
// le falta FC real (nunca se rellena con un valor inventado).
export function buildTypeEvolution(workouts, { type = "easy", groupSize = EVOLUTION_GROUP_SIZE } = {}) {

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

// Alias histórico -- "Evolución Z2" (Inicio/Running) sigue llamando a esta
// función con su nombre original, mismos defaults (type "easy", groupSize
// EVOLUTION_GROUP_SIZE). Comportamiento idéntico a antes de generalizar el
// motor -- Series/Tempo llaman a buildTypeEvolution() directamente con su
// propio type/groupSize (ver EVOLUTION_TYPE_CONFIG en Running.js).
export const buildZ2Evolution = buildTypeEvolution;
