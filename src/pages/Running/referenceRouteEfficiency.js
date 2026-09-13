// Resuelve route.workoutIds (referenceRouteStore.js) a los objetos de
// entreno reales de workoutStore.js -- función pura (recibe `allWorkouts`
// ya cargado, no importa workoutStore.js aquí) para poder testear sin
// IndexedDB de por medio y para no crear un ciclo de imports entre las
// dos stores.
export function resolveRouteWorkouts(route, allWorkouts) {

    const ids = new Set(route.workoutIds);
    return allWorkouts.filter(w => ids.has(w.id));

}

// Regla de comparación de eficiencia aeróbica para Recorridos de
// referencia (V1) -- ritmo a FC similar, nunca "quién corrió más rápido"
// a secas. Constante con nombre (no un número embebido en la lógica) para
// poder ajustarla más adelante sin cazar el valor por todo el archivo.
export const FC_SIMILAR_THRESHOLD_PPM = 4;

export function isHrSimilar(hrA, hrB) {

    if (hrA == null || hrB == null) return false;
    return Math.abs(hrA - hrB) <= FC_SIMILAR_THRESHOLD_PPM;

}

// Comparación pareja a pareja, tal cual la especificación: FC similar (≤
// FC_SIMILAR_THRESHOLD_PPM ppm de diferencia) -> el de mejor ritmo es más
// eficiente. FC muy distinta -> comparable:false, SIN declarar cuál es
// "mejor" -- quien llame debe mostrar ambos con su contexto (temperatura,
// etc.) y dejar que el usuario lo interprete, nunca forzar un veredicto.
// Tampoco compara si a alguno de los dos le falta ritmo o FC real -- no
// hay dato suficiente para decir nada, ni a favor ni en contra.
export function compareEfficiency(workoutA, workoutB) {

    if (workoutA.avgPaceSecPerKm == null || workoutB.avgPaceSecPerKm == null || workoutA.avgHr == null || workoutB.avgHr == null) {
        return { comparable: false, reason: "missing-data", hrDeltaBpm: null };
    }

    const hrDeltaBpm = workoutA.avgHr - workoutB.avgHr;

    if (!isHrSimilar(workoutA.avgHr, workoutB.avgHr)) {
        return { comparable: false, reason: "hr-too-different", hrDeltaBpm };
    }

    const moreEfficient = workoutA.avgPaceSecPerKm <= workoutB.avgPaceSecPerKm ? workoutA : workoutB;

    return { comparable: true, moreEfficient, hrDeltaBpm };

}

// "Mejor eficiencia" de un recorrido entero (varios entrenos, no solo dos)
// -- generaliza la regla pareja-a-pareja a un conjunto encontrando el
// grupo más grande de entrenos mutuamente comparables entre sí (FC
// similar unos con otros -- el "esfuerzo típico" real de ese recorrido) y
// declarando ganador al de mejor ritmo DENTRO de ese grupo, nunca
// comparando ritmo entre un día fresco y un día muy caluroso/duro solo
// porque ambos están en el mismo recorrido.
//
// Se usa el grupo más grande por similitud mutua, NO la media aritmética
// de FC de todos los entrenos -- verificado real: con 2 entrenos a
// esfuerzo típico (150-151 ppm) y un tercero muy distinto (175 ppm, día
// duro/caluroso), la media de los tres (158,67 ppm) queda tan lejos de
// TODOS que ninguno pasaba el umbral con ella, perdiendo el par que sí
// era comparable entre sí. Contando, para cada entreno, cuántos OTROS
// entrenos tiene a FC similar, el ganador de ese recuento (y sus propios
// similares) sí encuentra el par real, sin que un solo valor atípico
// arrastre la referencia lejos de donde de verdad está el grupo.
//
// Si NINGÚN entreno tiene ni un solo otro FC-similar (recuento máximo 0 --
// posible con pocos entrenos y FC muy dispersa, p. ej. solo 2 entrenos a
// 140 y 170 ppm), no hay ningún par realmente comparable -- se devuelve
// null en vez de forzar un ganador arbitrario.
export function findBestEfficiencyWorkout(workouts) {

    const candidates = workouts.filter(w => w.avgPaceSecPerKm != null && w.avgHr != null);
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    let center = candidates[0];
    let bestNeighborCount = -1;

    candidates.forEach(w => {
        const neighborCount = candidates.filter(o => o !== w && isHrSimilar(o.avgHr, w.avgHr)).length;
        if (neighborCount > bestNeighborCount) { bestNeighborCount = neighborCount; center = w; }
    });

    if (bestNeighborCount === 0) return null;

    const comparableGroup = candidates.filter(w => isHrSimilar(w.avgHr, center.avgHr));

    return comparableGroup.reduce((best, w) => w.avgPaceSecPerKm < best.avgPaceSecPerKm ? w : best);

}

// "Tendencia" de la tarjeta resumen: cómo se compara el ÚLTIMO entreno
// contra el de mejor eficiencia -- reutiliza compareEfficiency() para no
// duplicar el umbral de FC. comparable:false aquí NO significa "sin
// tendencia que mostrar": significa "esta comparación de ritmo no es
// directa, mira el contexto" -- quien renderice debe mostrar la FC de
// ambos en vez de un simple "+X s/km" quien la trate como si lo fuera.
export function buildEfficiencyTrend(lastWorkout, bestWorkout) {

    if (!lastWorkout || !bestWorkout || lastWorkout.id === bestWorkout.id) return null;

    const comparison = compareEfficiency(lastWorkout, bestWorkout);

    if (!comparison.comparable) {
        return { comparable: false, reason: comparison.reason, lastWorkout, bestWorkout };
    }

    return {
        comparable: true,
        deltaSecPerKm: lastWorkout.avgPaceSecPerKm - bestWorkout.avgPaceSecPerKm
    };

}

// Diferencia de temperatura a partir de la cual merece la pena mencionarla
// como posible explicación de un ritmo/FC distintos -- no es un umbral
// físico exacto, es "suficiente para notarse corriendo" (un día de 29°C
// frente a uno de 18°C no es la misma carrera). Solo se usa como contexto
// informativo, nunca para decidir si el par es comparable (eso lo decide
// solo la FC, ver isHrSimilar).
export const FIRST_LAST_TEMP_NOTE_THRESHOLD_C = 5;

// Comparación cronológica PRIMERA vez vs ÚLTIMA vez en un recorrido de
// referencia -- distinta de buildEfficiencyTrend() (que compara el
// ÚLTIMO entreno contra el de MEJOR eficiencia, no el primero). El
// objetivo aquí es literal: "¿cómo me fue la primera vez que corrí esto
// frente a la más reciente?", en lenguaje natural, reutilizando el mismo
// umbral de FC similar que el resto del motor (FC_SIMILAR_THRESHOLD_PPM)
// para no forzar un veredicto de mejora/empeoramiento cuando el esfuerzo
// cardíaco no fue comparable entre ambos días.
//
// Con menos de 2 entrenos reales con fecha, o si el primero y el último
// acaban siendo el mismo entreno (mismo id), no hay "primera vs última"
// que comparar -- null, no una comparación de un solo dato consigo mismo.
export function buildFirstLastComparison(workouts) {

    const chronological = [...workouts]
        .filter(w => w.date)
        .sort((a, b) => a.date.localeCompare(b.date));

    if (chronological.length < 2) return null;

    const first = chronological[0];
    const last = chronological[chronological.length - 1];

    if (first.id === last.id) return null;

    const comparison = compareEfficiency(first, last);

    if (!comparison.comparable) {
        return { comparable: false, reason: comparison.reason, first, last };
    }

    const deltaSecPerKm = first.avgPaceSecPerKm - last.avgPaceSecPerKm; // positivo = más rápido ahora que la primera vez

    return {
        comparable: true,
        verdict: deltaSecPerKm > 0 ? "improved" : deltaSecPerKm < 0 ? "worsened" : "unchanged",
        deltaSecPerKm,
        first,
        last
    };

}
