import { RUNNING_WORKOUT_TYPES } from "../../data/runningWorkoutTypes.js";
import { parseISODate } from "../../utils/date.js";
import { formatSecondsAsClock } from "../../utils/format.js";

// Compara los últimos N entrenos de un tipo contra los N anteriores del
// mismo tipo — comparar ritmo entre tipos distintos (Rodaje vs. Series)
// no dice nada, son esfuerzos distintos.
const GROUP_SIZE = 3;

// Diferencias por debajo de esto son ruido de redondeo/GPS o de sensor de
// muñeca, no una tendencia real.
const PACE_STABLE_THRESHOLD_SEC = 2;
const HR_STABLE_THRESHOLD_BPM = 3;

function average(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// FC como control, no como dato decorativo: si el ritmo mejora pero la FC
// media sube en una proporción igual o mayor que la del ritmo, no es una
// mejora real de forma física — es que se ha corrido más fuerte.
function classifyHrTrend(recent, previous, paceDeltaSecPerKm, previousPace) {

    const recentHr = recent.filter(w => w.avgHr != null).map(w => w.avgHr);
    const previousHr = previous.filter(w => w.avgHr != null).map(w => w.avgHr);

    if (recentHr.length === 0 || previousHr.length === 0) return null;

    const hrDeltaBpm = average(recentHr) - average(previousHr);

    if (Math.abs(hrDeltaBpm) <= HR_STABLE_THRESHOLD_BPM) return "stable";
    if (hrDeltaBpm < 0) return "lower";

    const hrPct = hrDeltaBpm / average(previousHr);
    const pacePct = paceDeltaSecPerKm / previousPace;

    return hrPct < pacePct ? "higher-partial" : "higher-proportional";

}

// { status, type, groupSize, paceDeltaSecPerKm, hrTrend } o null si no hay
// ni un solo entreno de ese tipo con ritmo — nada que reportar.
export function buildTypeProgressInsight(workouts, { type, groupSize = GROUP_SIZE } = {}) {

    const sameType = workouts
        .filter(w => w.type === type && w.avgPaceSecPerKm != null && w.date)
        .sort((a, b) => a.date.localeCompare(b.date));

    if (sameType.length === 0) return null;

    const minWorkouts = groupSize * 2;

    if (sameType.length < minWorkouts) {
        return { status: "insufficient-data", type, groupSize, paceDeltaSecPerKm: null, hrTrend: null };
    }

    const recent = sameType.slice(-groupSize);
    const previous = sameType.slice(-groupSize * 2, -groupSize);

    const recentPace = average(recent.map(w => w.avgPaceSecPerKm));
    const previousPace = average(previous.map(w => w.avgPaceSecPerKm));
    const paceDeltaSecPerKm = Math.round(previousPace - recentPace);

    if (Math.abs(paceDeltaSecPerKm) < PACE_STABLE_THRESHOLD_SEC) {

        const hrTrend = classifyHrTrend(recent, previous, paceDeltaSecPerKm, previousPace);
        return { status: "pace-stable", type, groupSize, paceDeltaSecPerKm, hrTrend };

    }

    if (paceDeltaSecPerKm < 0) {

        const hrTrend = classifyHrTrend(recent, previous, paceDeltaSecPerKm, previousPace);
        return { status: "worse", type, groupSize, paceDeltaSecPerKm, hrTrend };

    }

    const hrTrend = classifyHrTrend(recent, previous, paceDeltaSecPerKm, previousPace);
    return { status: "improved", type, groupSize, paceDeltaSecPerKm, hrTrend };

}

// Comparación real por CALENDARIO (distinta de buildTypeProgressInsight()
// de arriba, que compara por nº de entrenos) -- "hace ~30 días" es una
// ventana de 2 semanas centrada en ese día (23-37 días atrás), no un
// único día exacto (con entrenos reales pero espaciados, un día exacto
// casi nunca tendría ninguno). Mínimo 2 entrenos reales con ritmo dentro
// de esa ventana para contar como "suficientes datos históricos" -- con
// menos, un solo entreno aislado podría no ser representativo.
const COMPARISON_DAYS_AGO = 30;
const COMPARISON_WINDOW_HALF_SPAN_DAYS = 7;
const MIN_COMPARISON_WORKOUTS = 2;

// { currentPaceSecPerKm, pastPaceSecPerKm, deltaSecPerKm } o null si no hay
// suficiente histórico real de hace ~30 días de ese tipo -- nunca una
// cifra de relleno. `currentAvgPaceSecPerKm` se recibe ya calculado (mismo
// dato que ya muestra RunningTypeSummary, buildTypeSummary() en
// runningSummary.js) para no duplicar ese cálculo aquí.
export function buildPaceComparison(filteredWorkouts, currentAvgPaceSecPerKm, now = new Date()) {

    if (currentAvgPaceSecPerKm == null) return null;

    const dayMs = 86400000;
    const nowMs = now.getTime();
    const windowStart = nowMs - (COMPARISON_DAYS_AGO + COMPARISON_WINDOW_HALF_SPAN_DAYS) * dayMs;
    const windowEnd = nowMs - (COMPARISON_DAYS_AGO - COMPARISON_WINDOW_HALF_SPAN_DAYS) * dayMs;

    const inWindow = filteredWorkouts.filter(w => {

        if (w.avgPaceSecPerKm == null || !w.date) return false;

        const t = parseISODate(w.date).getTime();
        return t >= windowStart && t <= windowEnd;

    });

    if (inWindow.length < MIN_COMPARISON_WORKOUTS) return null;

    const pastPaceSecPerKm = Math.round(average(inWindow.map(w => w.avgPaceSecPerKm)));
    const deltaSecPerKm = Math.round(currentAvgPaceSecPerKm - pastPaceSecPerKm);

    return { currentPaceSecPerKm: currentAvgPaceSecPerKm, pastPaceSecPerKm, deltaSecPerKm };

}

// Texto real de la comparación -- "Mejora" solo cuando de verdad se corre
// más rápido ahora (delta negativo); en el sentido contrario no se
// reclama una mejora que no existe, "Cambio" es neutro.
export function buildComparisonMessage(comparison) {

    const label = comparison.deltaSecPerKm < 0 ? "Mejora" : comparison.deltaSecPerKm > 0 ? "Cambio" : "Sin cambio";
    const sign = comparison.deltaSecPerKm > 0 ? "+" : "";

    return `Ritmo medio: ${formatSecondsAsClock(comparison.currentPaceSecPerKm)}/km · Hace 30 días: ${formatSecondsAsClock(comparison.pastPaceSecPerKm)}/km · ${label}: ${sign}${comparison.deltaSecPerKm} s/km`;

}

function typeLabel(type) {

    return RUNNING_WORKOUT_TYPES.find(t => t.id === type)?.label || type;

}

// La FC actúa como control: si el ritmo mejora pero la FC sube en
// proporción parecida o mayor (ver classifyHrTrend() más arriba), no es
// una mejora real y el verbo cambia — nunca se dice "has mejorado" sin
// que la FC lo respalde.
function hrClause(hrTrend) {

    if (hrTrend === "stable") return " con una FC media estable";
    if (hrTrend === "lower") return " con la FC media más baja";
    if (hrTrend === "higher-partial") return ", aunque con la FC media algo más alta";
    return "";

}

// Texto real de la segunda línea de "Tu resumen" (ver RunningTypeSummary()
// en Running.js) -- antes vivía en su propia tarjeta separada
// (RunningProgressCard.js, retirada: nunca tuvo otro consumidor) por
// debajo de los chips de filtro; ahora es la línea de insight dentro de
// la misma tarjeta de resumen, mismo criterio de fiabilidad de
// buildTypeProgressInsight() de arriba -- null (sin insight) se traduce
// en no pintar nada, nunca en un texto de relleno.
export function buildProgressMessage(insight) {

    const label = typeLabel(insight.type);

    if (insight.status === "insufficient-data") {
        return {
            icon: "solar:chart-2-bold-duotone",
            trend: "flat",
            html: `Necesitas más entrenos de ${label} para ver tu progreso.`
        };
    }

    if (insight.status === "pace-stable") {
        return {
            icon: "solar:chart-2-bold-duotone",
            trend: "flat",
            html: `Tu ritmo se mantiene estable en tus últimos ${insight.groupSize} entrenos de ${label}${hrClause(insight.hrTrend)}.`
        };
    }

    if (insight.status === "worse") {
        const value = Math.abs(insight.paceDeltaSecPerKm);
        return {
            icon: "solar:graph-down-bold-duotone",
            trend: "down",
            html: `Tu ritmo medio ha subido <span class="progress-value">${value} s/km</span> en tus últimos ${insight.groupSize} entrenos de ${label}${hrClause(insight.hrTrend)}.`
        };
    }

    // "improved" — pero si la FC subió en proporción igual o mayor que lo
    // que bajó el ritmo, no se reclama mejora real (ver classifyHrTrend()).
    const value = insight.paceDeltaSecPerKm;

    if (insight.hrTrend === "higher-proportional") {
        return {
            icon: "solar:chart-2-bold-duotone",
            trend: "flat",
            html: `Corres <span class="progress-value">${value} s/km</span> más rápido en tus últimos ${insight.groupSize} entrenos de ${label}, pero con la FC media también más alta — no parece una mejora real de forma física.`
        };
    }

    return {
        icon: "solar:graph-up-bold-duotone",
        trend: "up",
        html: `Has mejorado <span class="progress-value">${value} s/km</span> en tus últimos ${insight.groupSize} entrenos de ${label}${hrClause(insight.hrTrend)}.`
    };

}

// Comparación por ENTRENO (distinta de buildTypeProgressInsight(), que
// compara grupo reciente vs. grupo anterior en la LISTA -- esta compara
// el entreno que se está viendo AHORA en el detalle contra sus últimos
// `groupSize` entrenos reales del mismo tipo, anteriores a su propia
// fecha). Reutiliza classifyHrTrend() tal cual, pasando el propio
// entreno como "recent" (array de 1) -- misma lógica de control por FC,
// ni un criterio nuevo. Solo compara dentro del mismo tipo (Rodaje vs.
// Series no dice nada, son esfuerzos distintos) -- null sin fecha/ritmo
// real del propio entreno, sin tipo, o sin al menos `groupSize` entrenos
// reales anteriores del mismo tipo con los que comparar.
export function buildWorkoutComparison(workout, allWorkouts, { groupSize = GROUP_SIZE } = {}) {

    if (workout.avgPaceSecPerKm == null || !workout.type || !workout.date) return null;

    const baseline = allWorkouts
        .filter(w =>
            w.id !== workout.id &&
            w.type === workout.type &&
            w.avgPaceSecPerKm != null &&
            w.date != null &&
            w.date < workout.date
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, groupSize);

    if (baseline.length < groupSize) return null;

    const baselinePace = average(baseline.map(w => w.avgPaceSecPerKm));

    // Positivo = este entreno es más rápido que la línea base (menos
    // segundos por km que la media de los anteriores).
    const paceDeltaSecPerKm = Math.round(baselinePace - workout.avgPaceSecPerKm);

    const hrTrend = classifyHrTrend([workout], baseline, paceDeltaSecPerKm, baselinePace);

    return { type: workout.type, groupSize, paceDeltaSecPerKm, hrTrend };

}

// Texto real de la comparación de arriba -- mismo hrClause()/typeLabel()
// que el resto del archivo, ninguna cláusula nueva.
export function buildWorkoutComparisonMessage(comparison) {

    const label = typeLabel(comparison.type);

    if (Math.abs(comparison.paceDeltaSecPerKm) < PACE_STABLE_THRESHOLD_SEC) {
        return `Ritmo similar a tus últimos ${comparison.groupSize} ${label}${hrClause(comparison.hrTrend)}.`;
    }

    if (comparison.paceDeltaSecPerKm > 0) {

        if (comparison.hrTrend === "higher-proportional") {
            return `Respecto a tus últimos ${comparison.groupSize} ${label}: ${comparison.paceDeltaSecPerKm} s/km más rápido, pero con la FC media también más alta — no parece una mejora real.`;
        }

        return `Respecto a tus últimos ${comparison.groupSize} ${label}: ${comparison.paceDeltaSecPerKm} s/km más rápido${hrClause(comparison.hrTrend)}.`;

    }

    return `Respecto a tus últimos ${comparison.groupSize} ${label}: ${Math.abs(comparison.paceDeltaSecPerKm)} s/km más lento${hrClause(comparison.hrTrend)}.`;

}
