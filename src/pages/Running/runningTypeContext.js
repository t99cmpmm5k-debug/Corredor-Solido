// Contexto breve por tarjeta de entreno (prioridad 2 de la lista de
// mejoras de Running, 2026-09-03): compara UN entreno concreto contra el
// promedio histórico COMPLETO de su mismo tipo (Rodaje (Z2) solo se
// compara con Rodaje (Z2), nunca con Series/Tempo/otros) -- sin ventana
// temporal, a diferencia de runningEvolution.js (últimos 5, primero vs
// último) o runningProgress.js (grupo reciente vs grupo anterior). El
// propio entreno se excluye de la media contra la que se compara.

import { RUNNING_WORKOUT_TYPES } from "../../data/runningWorkoutTypes.js";

// Umbrales de "diferencia real, no ruido" -- mismos valores que ya usa
// buildTypeProgressInsight() en runningProgress.js (PACE_STABLE_THRESHOLD_SEC/
// HR_STABLE_THRESHOLD_BPM). Reutilizados aquí a propósito: lo que cuenta
// como ruido de GPS/sensor en una comparación de running no debería
// depender de qué parte de la pantalla la esté mostrando.
const PACE_SIGNIFICANT_THRESHOLD_SEC_PER_KM = 2;
const HR_SIGNIFICANT_THRESHOLD_BPM = 3;

// Mínimo de OTROS entrenos reales del mismo tipo (con el dato en
// cuestión) para que la media signifique algo -- con 1-2 un solo entreno
// atípico distorsiona demasiado la comparación. Se exige por separado
// para ritmo y para FC: un tipo puede tener de sobra ritmo pero casi
// ninguna FC real (o al revés).
const MIN_CONTEXT_SAMPLE = 3;

function average(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function typeLabel(type) {
    return RUNNING_WORKOUT_TYPES.find(t => t.id === type)?.label ?? type;
}

function buildPaceContext(workout, sameTypeOthers, label) {

    if (workout.avgPaceSecPerKm == null) return null;

    const samples = sameTypeOthers.map(w => w.avgPaceSecPerKm).filter(v => v != null);
    if (samples.length < MIN_CONTEXT_SAMPLE) return null;

    // Positivo = este entreno es más RÁPIDO que la media (menos
    // segundos/km que el promedio histórico del tipo).
    const deltaSecPerKm = Math.round(average(samples) - workout.avgPaceSecPerKm);

    if (Math.abs(deltaSecPerKm) < PACE_SIGNIFICANT_THRESHOLD_SEC_PER_KM) return null;

    const direction = deltaSecPerKm > 0 ? "más rápido" : "más lento";

    return { kind: "pace", text: `${label} · +${Math.abs(deltaSecPerKm)} s/km ${direction} que tu media` };

}

function buildHrContext(workout, sameTypeOthers, label) {

    if (workout.avgHr == null) return null;

    const samples = sameTypeOthers.map(w => w.avgHr).filter(v => v != null);
    if (samples.length < MIN_CONTEXT_SAMPLE) return null;

    // Positivo = la FC de este entreno fue más ALTA que la media.
    const deltaBpm = Math.round(workout.avgHr - average(samples));

    if (Math.abs(deltaBpm) < HR_SIGNIFICANT_THRESHOLD_BPM) return null;

    const sign = deltaBpm > 0 ? "+" : "";

    return { kind: "hr", text: `${label} · FC ${sign}${deltaBpm} ppm respecto a tu media` };

}

// { kind: "pace"|"hr", text } o null -- sin histórico suficiente del
// mismo tipo, o con ambas métricas dentro del margen de ruido, no hay
// contexto real que mostrar (nunca una comparación inventada ni un "sin
// cambios" de relleno).
//
// CRITERIO de qué métrica mostrar cuando las dos están disponibles
// (documentado aquí a propósito -- ver encargo): el RITMO manda siempre
// que su diferencia sea significativa (>= PACE_SIGNIFICANT_THRESHOLD_SEC_PER_KM)
// -- es el dato más directamente accionable de un entreno de running.
// Solo cuando el ritmo está dentro del margen de ruido (prácticamente
// igual a la media) Y la FC sí varía de forma notable se muestra la FC en
// su lugar -- ese caso suele significar "mismo ritmo, con más o menos
// esfuerzo real", que sigue siendo información útil. Ajustar el orden
// aquí si el criterio cambia.
export function buildWorkoutTypeContext(workout, allWorkouts) {

    if (!workout.type) return null;

    const sameTypeOthers = allWorkouts.filter(w => w.id !== workout.id && w.type === workout.type);
    const label = typeLabel(workout.type);

    return buildPaceContext(workout, sameTypeOthers, label) ?? buildHrContext(workout, sameTypeOthers, label);

}
