import { getWeekStartDate, formatISODate, addDays } from "../../utils/date.js";

// "Progreso" (Running, Capa 2) -- volumen y ritmo medio de las últimas
// WEEKS_COUNT semanas reales (lunes-domingo, misma convención que
// getCurrentWeekSessions()/buildPlanCompliance()), para ver de un vistazo
// si el volumen sube/baja y si el ritmo acompaña.
//
// Solo 2 métricas a propósito, no las 4 candidatas:
// - Volumen (km/semana): ningún otro bloque de la app enseña esto como
//   tendencia semana a semana (MonthlyKmWidget de Inicio es un total
//   mensual, no un desglose por semana).
// - Ritmo medio (ponderado por distancia, TODOS los tipos): tampoco
//   existe en ningún sitio como serie temporal por semana -- Evolución
//   Z2 compara solo Rodaje (Z2) (primero vs. último de los últimos 5),
//   y RunningTypeSummary da una media global por tipo filtrado, ninguno
//   de los dos es "¿cómo evoluciona mi ritmo medio semana a semana?".
// - FC media semanal se descarta: mezclar tipos tan distintos de
//   esfuerzo (series/tempo/rodaje) en una única FC media por semana no
//   da una señal fiable (una semana con más series sube la media sin que
//   eso signifique nada sobre forma física real).
// - Ritmo específico de Z2 se descarta por ser justo lo que ya cubre
//   Evolución Z2 -- repetirlo aquí sería redundante.
const WEEKS_COUNT = 4;

// Con menos de esto no hay "progreso" real que enseñar -- 1 semana con
// datos (o 0) no tiene con qué compararse, igual que
// EVOLUTION_MIN_WORKOUTS en runningEvolution.js.
const MIN_WEEKS_WITH_DATA = 2;

// Los WEEKS_COUNT lunes-domingo más recientes, incluida la semana actual
// aunque esté a medias -- las semanas sin ningún entreno real dentro del
// rango SIGUEN apareciendo (con totalKm 0), nunca se saltan del eje
// temporal (ver buildWeeklyProgress).
function buildWeekRanges(referenceDate) {

    const currentWeekStart = getWeekStartDate(formatISODate(referenceDate));

    const ranges = [];

    for (let i = WEEKS_COUNT - 1; i >= 0; i--) {

        const start = addDays(currentWeekStart, -7 * i);
        ranges.push({ start, end: addDays(start, 6) });

    }

    return ranges;

}

// Ritmo medio de la semana ponderado por distancia (no la media simple de
// los avgPaceSecPerKm de cada entreno) -- una tirada larga de 20km pesa
// más en el ritmo medio real de la semana que un rodaje corto de 5km.
// null si ningún entreno de la semana trae ritmo real (nunca inventado).
function weightedAvgPace(weekWorkouts) {

    const withPace = weekWorkouts.filter(w => w.avgPaceSecPerKm != null && w.distanceKm > 0);
    if (!withPace.length) return null;

    const totalKm = withPace.reduce((sum, w) => sum + w.distanceKm, 0);
    const weightedSum = withPace.reduce((sum, w) => sum + (w.avgPaceSecPerKm * w.distanceKm), 0);

    return weightedSum / totalKm;

}

// { available: false, weeksWithData } o { available: true, weeks }, donde
// cada week es { weekStart, weekEnd, totalKm, avgPaceSecPerKm, hasWorkouts }.
// referenceDate solo se pasa distinto de new Date() en tests.
export function buildWeeklyProgress(workouts, referenceDate = new Date()) {

    const weeks = buildWeekRanges(referenceDate).map(({ start, end }) => {

        const weekWorkouts = (workouts ?? []).filter(w => w.date >= start && w.date <= end);

        return {
            weekStart: start,
            weekEnd: end,
            totalKm: weekWorkouts.reduce((sum, w) => sum + (w.distanceKm || 0), 0),
            avgPaceSecPerKm: weightedAvgPace(weekWorkouts),
            hasWorkouts: weekWorkouts.length > 0
        };

    });

    const weeksWithData = weeks.filter(w => w.hasWorkouts).length;

    if (weeksWithData < MIN_WEEKS_WITH_DATA) {
        return { available: false, weeksWithData };
    }

    return { available: true, weeks };

}
