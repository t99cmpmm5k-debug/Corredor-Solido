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
