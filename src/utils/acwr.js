// ACWR (Acute:Chronic Workload Ratio) -- ratio entre la carga reciente
// (aguda) y la carga habitual (crónica) de entrenamiento, para avisar de
// picos de riesgo de lesión por subir el volumen/intensidad demasiado
// rápido. Motor puro (sin tocar IndexedDB ni el DOM) para que Running,
// Inicio o quien sea pueda pintar el resultado como quiera.
//
// SOLO RUNNING por ahora: Gimnasio tiene duración de sesión real
// (gymSessionStore.js), pero con apenas un puñado de sesiones con
// duración fiable y solo unos días de rango a fecha de este diseño --
// muy por debajo de los ACWR_CHRONIC_DAYS que hacen falta para que la
// carga crónica signifique algo. buildAcwrInsight() ya recibe
// "loadEntries" genéricos ({date, load}), no workouts de running
// directamente -- el día que Gimnasio acumule suficiente historial,
// basta con construir sus propios loadEntries (duración, sin FC/RPE) y
// concatenarlos con buildRunningLoadEntries() antes de llamar a
// buildAcwrInsight(), sin tocar el motor.

import { parseISODate, formatISODate, addDays } from "./date.js";

export const ACWR_ACUTE_DAYS = 7;
export const ACWR_CHRONIC_DAYS = 28;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Franjas estándar de interpretación del ratio (mismos cortes que usan
// las guías de carga de entrenamiento habituales). 1.3-1.5 no se pidió
// explícitamente, pero dejarlo sin clasificar entre "zona óptima" y
// "riesgo elevado" sería un hueco -- se etiqueta aparte como riesgo
// moderado en vez de forzarlo a una de las otras dos franjas.
export const ACWR_ZONES = [
    { id: "detrained", label: "Desentrenado" },
    { id: "optimal", label: "Zona óptima" },
    { id: "moderateRisk", label: "Riesgo moderado" },
    { id: "highRisk", label: "Riesgo elevado" }
];

const [DETRAINED, OPTIMAL, MODERATE_RISK, HIGH_RISK] = ACWR_ZONES;

// Los tres cortes (0.8/1.3/1.5) caen siempre en la franja de ABAJO --
// p. ej. 1.3 en punto todavía es "zona óptima", no "riesgo moderado".
export function classifyAcwrZone(ratio) {

    if (ratio < 0.8) return DETRAINED;
    if (ratio <= 1.3) return OPTIMAL;
    if (ratio <= 1.5) return MODERATE_RISK;

    return HIGH_RISK;

}

// No existe ningún ajuste de FC máx configurado por el usuario en la app
// (Perfil no tiene ajustes todavía) -- se usa la FC máx más alta REAL
// registrada en el histórico de running como valor de referencia. Es una
// aproximación (un entreno normal rara vez toca el máximo real de
// esfuerzo), pero es el dato real disponible más razonable; nunca se
// inventa un valor por edad/fórmula genérica.
export function resolveReferenceMaxHr(workouts) {

    const values = workouts.map(w => w.maxHr).filter(v => v != null);

    if (!values.length) return null;

    return Math.max(...values);

}

// TRIMP simplificado: duración (min) x FC media del entreno relativa a la
// FC máx de referencia. Sin FC media, sin duración, o sin referencia real
// contra la que comparar, ese entreno no aporta carga -- null, no 0 (0
// significaría "descanso real", no "dato ausente").
export function computeRunningWorkoutLoad(workout, referenceMaxHr) {

    if (workout.avgHr == null || workout.durationSec == null || !referenceMaxHr) return null;

    const intensityFactor = workout.avgHr / referenceMaxHr;
    const durationMin = workout.durationSec / 60;

    return durationMin * intensityFactor;

}

// Convierte workouts de running en loadEntries genéricos ({date, load}) --
// la forma de entrada que espera buildAcwrInsight(), sea cual sea el
// origen de la carga.
export function buildRunningLoadEntries(workouts) {

    const referenceMaxHr = resolveReferenceMaxHr(workouts);
    if (!referenceMaxHr) return [];

    return workouts
        .map(w => ({ date: w.date, load: computeRunningWorkoutLoad(w, referenceMaxHr) }))
        .filter(entry => entry.load != null);

}

function sumLoadInWindow(entries, windowStartISO, windowEndISO) {

    return entries
        .filter(e => e.date >= windowStartISO && e.date <= windowEndISO)
        .reduce((sum, e) => sum + e.load, 0);

}

// loadEntries: [{date: "AAAA-MM-DD", load: number}] -- fuente-agnóstico a
// propósito (ver cabecera del archivo). Nunca calcula un ratio con menos
// de ACWR_CHRONIC_DAYS días de historial real: "available: false" con el
// motivo, para que quien pinte esto muestre un aviso en vez de un número
// poco fiable.
export function buildAcwrInsight(loadEntries, { referenceDate = new Date() } = {}) {

    const referenceISO = formatISODate(referenceDate);

    if (!loadEntries.length) {
        return { available: false, reason: "no-data", daysOfHistory: 0, missingDays: ACWR_CHRONIC_DAYS };
    }

    const earliestDate = [...loadEntries].map(e => e.date).sort()[0];
    const daysOfHistory = Math.round((parseISODate(referenceISO) - parseISODate(earliestDate)) / MS_PER_DAY) + 1;

    if (daysOfHistory < ACWR_CHRONIC_DAYS) {

        return {
            available: false,
            reason: "insufficient-history",
            daysOfHistory,
            missingDays: ACWR_CHRONIC_DAYS - daysOfHistory
        };

    }

    const acuteStart = addDays(referenceISO, -(ACWR_ACUTE_DAYS - 1));
    const chronicStart = addDays(referenceISO, -(ACWR_CHRONIC_DAYS - 1));

    const acuteLoad = sumLoadInWindow(loadEntries, acuteStart, referenceISO) / ACWR_ACUTE_DAYS;
    const chronicLoad = sumLoadInWindow(loadEntries, chronicStart, referenceISO) / ACWR_CHRONIC_DAYS;

    // Historial de sobra pero sin ninguna carga en las últimas
    // ACWR_CHRONIC_DAYS (p. ej. una racha larga sin correr) -- el ratio no
    // se puede calcular (0/0), no que valga 0.
    if (chronicLoad === 0) {
        return { available: false, reason: "no-recent-load", daysOfHistory, missingDays: 0 };
    }

    const ratio = acuteLoad / chronicLoad;

    return {
        available: true,
        ratio,
        zone: classifyAcwrZone(ratio),
        acuteLoad,
        chronicLoad,
        daysOfHistory
    };

}
