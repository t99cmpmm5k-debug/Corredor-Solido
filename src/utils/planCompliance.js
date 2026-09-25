// Único tipo de plannedSession que representa gimnasio (ver
// planDayColor.js/PlanTimeline.js) -- todo lo demás en plannedSessions es
// running (incluida "race", una carrera cuenta como sesión de running).
const NON_RUNNING_TYPES = ["strength"];

// "Cumplimiento del plan" (Inicio) -- compara lo planificado en Plan para
// la semana real actual contra lo realmente corrido, SOLO running (nunca
// gimnasio). Dos métricas separadas a propósito (nunca mezcladas en un
// único %, ver requisito del pulido):
//
// - sesiones: cuántas de las sesiones de running planificadas esta
//   semana ya tienen un entreno real enlazado (session.status ===
//   "completed", el mismo mecanismo de enlace que ya usa Plan/Running,
//   ver getSessionStatus() en workoutStore.js).
// - km: planificado (objetivo de esas sesiones) vs. realizado.
//
// FUENTE ÚNICA (corregido en el rediseño de Inicio, 2026-09-25): antes
// `actualKm` sumaba TODOS los entrenos reales de la semana por rango de
// fecha (workouts.filter(fecha-en-semana)), incluidos los NO enlazados a
// ninguna sesión del plan -- eso hacía que "Cumplimiento del plan"
// mostrara un km "realizado" distinto (mayor) del que ya mostraba "Esta
// semana" (getWeekVolume() en workoutStore.js, que solo suma sesiones
// CON status "completed"), un bug real visto en pantalla (8 km en un
// sitio, 12,3 km en otro para la misma semana). Causa: dos definiciones
// de "realizado" distintas para el mismo concepto. Ahora actualKm sale
// SOLO de sesiones del plan completadas/enlazadas (igual criterio que
// sessionsCompleted, mismo volume ya derivado por withDerivedFields()) --
// una carrera real suelta sin sesión planificada sigue viéndose entera en
// Running, pero ya no altera este %. Ya no hace falta el parámetro
// `workouts` ni ningún rango de fechas -- todo sale de weekSessions.
//
// weekSessions ya viene derivado (status/volume/type, ver
// withDerivedFields() en workoutStore.js) -- normalmente el resultado de
// getCurrentWeekSessions(), NUNCA la semana que se esté navegando en Plan
// (ver Home.js).
export function buildPlanCompliance(weekSessions) {

    const runningSessions = (weekSessions ?? []).filter(s => !NON_RUNNING_TYPES.includes(s.type));

    // Semana de descanso o sin plan importado -- nunca un cálculo con
    // denominador cero ni un 0/0 inventado, el bloque entero se omite
    // (ver Home.js).
    if (runningSessions.length === 0) {
        return { hasPlan: false, sessionsPlanned: 0, sessionsCompleted: 0, plannedKm: 0, actualKm: 0, kmPercent: null };
    }

    const completedSessions = runningSessions.filter(s => s.status === "completed");
    const sessionsCompleted = completedSessions.length;
    const plannedKm = runningSessions.reduce((sum, s) => sum + s.volume, 0);
    const actualKm = completedSessions.reduce((sum, s) => sum + s.volume, 0);

    return {
        hasPlan: true,
        sessionsPlanned: runningSessions.length,
        sessionsCompleted,
        plannedKm,
        actualKm,
        // null (no un 0% engañoso) si ninguna sesión de esta semana trae
        // un objetivo de km real (p. ej. semana solo de series/recovery
        // sin distancia objetivo) -- Home.js omite el % en ese caso, no
        // divide entre 0.
        kmPercent: plannedKm > 0 ? Math.round((actualKm / plannedKm) * 100) : null
    };

}

// Hasta qué % por encima del 100% se considera un exceso "moderado" --
// mismo criterio que ya se aplica en ACWR (utils/acwr.js): cumplir de más
// no es automáticamente "mejor" sin más contexto, así que un kmPercent
// por encima de 100% no debe leerse implícitamente como un logro mayor
// cuanto más alto sea. 120% es el extremo superior del rango "hasta
// 15-20% por encima" que se pidió como referencia -- una primera
// aproximación razonable, no una cifra clínica; se puede ajustar si el
// uso real muestra que el corte queda mal puesto.
export const PLAN_OVER_TARGET_MODERATE_MAX_PERCENT = 120;

// null si no hay exceso (kmPercent nulo o <=100%) -- "moderate" hasta
// PLAN_OVER_TARGET_MODERATE_MAX_PERCENT inclusive, "high" por encima.
// Nunca decide si eso es "bueno" o "malo" -- solo clasifica el dato real
// para que quien lo muestre añada contexto en vez de un veredicto.
export function classifyPlanOverage(kmPercent) {

    if (kmPercent == null || kmPercent <= 100) return null;

    return kmPercent <= PLAN_OVER_TARGET_MODERATE_MAX_PERCENT ? "moderate" : "high";

}
