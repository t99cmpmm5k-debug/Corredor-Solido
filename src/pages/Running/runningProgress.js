import { RUNNING_WORKOUT_TYPES } from "../../data/runningWorkoutTypes.js";

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
