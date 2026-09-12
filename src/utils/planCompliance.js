import { getWeekStartDate, formatISODate, addDays } from "./date.js";

// Único tipo de plannedSession que representa gimnasio (ver
// planDayColor.js/PlanTimeline.js) -- todo lo demás en plannedSessions es
// running (incluida "race", una carrera cuenta como sesión de running).
const NON_RUNNING_TYPES = ["strength"];

// "Cumplimiento del plan" (Inicio, Capa 2) -- compara lo planificado en
// Plan para la semana real actual contra lo realmente corrido, SOLO
// running (nunca gimnasio). Dos métricas separadas a propósito (nunca
// mezcladas en un único %, ver requisito del pulido):
//
// - sesiones: cuántas de las sesiones de running planificadas esta
//   semana ya tienen un entreno real enlazado (session.status ===
//   "completed", el mismo mecanismo de enlace que ya usa Plan/Running,
//   ver getSessionStatus() en workoutStore.js).
// - km: planificado (objetivo de esas sesiones) vs. realizado (TODOS
//   los entrenos reales de esta semana, workouts -- no solo los
//   enlazados a una sesión, para reflejar lo realmente corrido aunque
//   incluya una carrera suelta sin sesión planificada).
//
// weekSessions ya viene derivado (status/volume/type, ver
// withDerivedFields() en workoutStore.js) -- normalmente el resultado de
// getCurrentWeekSessions(), NUNCA la semana que se esté navegando en
// Plan (ver Home.js). referenceDate solo se pasa distinto de new Date()
// en tests, para no depender del reloj real.
export function buildPlanCompliance(weekSessions, workouts, referenceDate = new Date()) {

    const runningSessions = (weekSessions ?? []).filter(s => !NON_RUNNING_TYPES.includes(s.type));

    // Semana de descanso o sin plan importado -- nunca un cálculo con
    // denominador cero ni un 0/0 inventado, el bloque entero se omite
    // (ver PlanComplianceWidget.js).
    if (runningSessions.length === 0) {
        return { hasPlan: false, sessionsPlanned: 0, sessionsCompleted: 0, plannedKm: 0, actualKm: 0, kmPercent: null };
    }

    const sessionsCompleted = runningSessions.filter(s => s.status === "completed").length;
    const plannedKm = runningSessions.reduce((sum, s) => sum + s.volume, 0);

    const weekStart = getWeekStartDate(formatISODate(referenceDate));
    const weekEnd = addDays(weekStart, 6);

    const actualKm = (workouts ?? [])
        .filter(w => w.date >= weekStart && w.date <= weekEnd)
        .reduce((sum, w) => sum + (w.distanceKm || 0), 0);

    return {
        hasPlan: true,
        sessionsPlanned: runningSessions.length,
        sessionsCompleted,
        plannedKm,
        actualKm,
        // null (no un 0% engañoso) si ninguna sesión de esta semana trae
        // un objetivo de km real (p. ej. semana solo de series/recovery
        // sin distancia objetivo) -- PlanComplianceWidget.js omite el %
        // en ese caso, no divide entre 0.
        kmPercent: plannedKm > 0 ? Math.round((actualKm / plannedKm) * 100) : null
    };

}
