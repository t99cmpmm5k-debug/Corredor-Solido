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
// las guías de carga de entrenamiento habituales: 0.8/1.3/1.5). 1.3-1.5
// no se pidió explícitamente, pero dejarlo sin clasificar entre "zona
// óptima" y la franja alta sería un hueco -- se etiqueta aparte en vez de
// forzarlo a una de las otras dos.
//
// Dos etiquetas por franja a propósito: barLabel (corta, para la barra de
// zonas) y badgeLabel (para el badge junto al ratio) -- ambas evitan
// lenguaje de diagnóstico médico ("Riesgo elevado" sonaba a predicción de
// lesión). El corte de la franja más alta sigue en 1.5, no en 1.8 -- una
// imagen de referencia (mockup generado por IA) usaba 1.8, pero no es
// fuente de verdad sobre el umbral real ya testeado.
export const ACWR_ZONES = [
    { id: "detrained", barLabel: "Baja", badgeLabel: "Carga baja" },
    { id: "optimal", barLabel: "Óptima", badgeLabel: "Carga óptima" },
    { id: "moderateRisk", barLabel: "Alta", badgeLabel: "Carga alta" },
    { id: "highRisk", barLabel: "Muy alta", badgeLabel: "Carga muy alta" }
];

const [DETRAINED, OPTIMAL, MODERATE_RISK, HIGH_RISK] = ACWR_ZONES;

// Cortes reales de clasificación -- también usados para dibujar los
// límites de la barra de zonas (ver ratioToBarPercent()/ACWR_BAR_STOPS).
export const ACWR_ZONE_THRESHOLDS = { low: 0.8, optimal: 1.3, high: 1.5 };

// Los tres cortes caen siempre en la franja de ABAJO -- p. ej. 1.3 en
// punto todavía es "óptima", no "alta".
export function classifyAcwrZone(ratio) {

    if (ratio < ACWR_ZONE_THRESHOLDS.low) return DETRAINED;
    if (ratio <= ACWR_ZONE_THRESHOLDS.optimal) return OPTIMAL;
    if (ratio <= ACWR_ZONE_THRESHOLDS.high) return MODERATE_RISK;

    return HIGH_RISK;

}

// Tope visual de la barra de zonas -- el ratio real puede superarlo (una
// racha muy intensa), la marca simplemente se queda pegada al borde
// derecho en vez de salirse de la tarjeta. No afecta a la clasificación
// real (classifyAcwrZone no tiene techo).
export const ACWR_BAR_DOMAIN_MAX = 2;

// Posición (0-100) de un ratio dentro de la barra de zonas, recortado al
// dominio visual -- para el marcador del ratio actual y las dos barras de
// comparación (7 días / base 28 días, esta última siempre en 1.00 por
// definición).
export function ratioToBarPercent(ratio, domainMax = ACWR_BAR_DOMAIN_MAX) {

    const clamped = Math.max(0, Math.min(ratio, domainMax));

    return (clamped / domainMax) * 100;

}

// Recomendación en lenguaje natural por franja. Alta/Muy alta llevan
// además un matiz condicional de escucha corporal ("si notas...") --
// nunca una predicción de lesión, solo una señal de cuándo NO forzar más
// esta semana. Frase adicional, no sustituye a la recomendación base.
const ACWR_RECOMMENDATION_BY_ZONE = {
    detrained: "Tu carga actual es más baja que tu media de las últimas 4 semanas -- buen momento para retomar el ritmo con normalidad.",
    optimal: "Tu carga actual está en una proporción saludable respecto a tu base de las últimas 4 semanas.",
    moderateRisk: "Mantén o reduce ligeramente la carga antes de volver a aumentarla.",
    highRisk: "Tu carga ha subido mucho más rápido de lo habitual -- dale prioridad al descanso antes de sumar más volumen o intensidad."
};

const ACWR_BODY_AWARENESS_HINT = "Si notas fatiga, piernas pesadas o peor recuperación, evita aumentar más la carga esta semana.";

export function buildAcwrRecommendation(zone) {

    const base = ACWR_RECOMMENDATION_BY_ZONE[zone.id];

    if (zone.id === "moderateRisk" || zone.id === "highRisk") {
        return `${base} ${ACWR_BODY_AWARENESS_HINT}`;
    }

    return base;

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
        // Carga crónica normalizada a 1.00 (es la base) -- el ratio ES
        // directamente cuánto más/menos está la aguda respecto a esa base,
        // así que el % es (ratio-1)*100, sin recalcular nada aparte.
        percentVsBase: Math.round((ratio - 1) * 100),
        daysOfHistory
    };

}
