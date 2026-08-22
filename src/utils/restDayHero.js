import { getWeekStartDate, addDays, formatISODate, formatWeekday, parseISODate } from "./date.js";

// Umbrales para que cada variante solo aparezca cuando el dato es fiable,
// nunca "casi" un patrón — mejor caer al mensaje neutro que sugerir una
// racha o una mejora que no se sostiene con los datos reales.
const RECENCY_LIMIT_DAYS = 10;
const MIN_STREAK_WEEKS = 2;
const RECENT_WINDOW_DAYS = 7;
const MIN_PACE_SAMPLE = 3;
const MIN_PACE_IMPROVEMENT_SEC = 2;
const LAST_WORKOUT_STALE_DAYS = 30;

function daysBetween(isoFrom, isoTo) {
    return Math.round((parseISODate(isoTo) - parseISODate(isoFrom)) / 86400000);
}

function formatKm(km) {
    const rounded = Math.round(km * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function mostRecentWorkout(workouts) {
    return workouts.reduce((latest, w) => (!latest || w.date > latest.date) ? w : latest, null);
}

// Racha de semanas consecutivas con al menos un entreno, contando hacia
// atrás desde la semana del último entreno registrado (no desde "hoy" —
// si el usuario aún no ha entrenado esta semana no rompe la racha por sí
// solo). Si el último entreno es demasiado viejo, la racha ya no describe
// nada relevante para "ahora mismo" y se descarta.
function computeWeekStreak(workouts, todayIso) {

    const latest = mostRecentWorkout(workouts);
    if (!latest || daysBetween(latest.date, todayIso) > RECENCY_LIMIT_DAYS) return null;

    const weeksWithWorkout = new Set(workouts.map(w => getWeekStartDate(w.date)));

    let cursor = getWeekStartDate(latest.date);
    let streak = 0;

    while (weeksWithWorkout.has(cursor)) {
        streak++;
        cursor = addDays(cursor, -7);
    }

    return streak >= MIN_STREAK_WEEKS ? streak : null;

}

function computeRecentStats(workouts, todayIso) {

    const cutoff = addDays(todayIso, -RECENT_WINDOW_DAYS);
    const recent = workouts.filter(w => w.date >= cutoff && w.date <= todayIso);
    if (!recent.length) return null;

    const totalKm = recent.reduce((sum, w) => sum + (w.distanceKm || 0), 0);
    if (totalKm <= 0) return null;

    return { count: recent.length, totalKm };

}

// Compara el ritmo medio de los últimos MIN_PACE_SAMPLE entrenos con
// ritmo registrado frente a los MIN_PACE_SAMPLE anteriores a esos —
// requiere el doble de muestra para que la comparación tenga sentido, y
// un margen mínimo para no anunciar "mejora" por ruido de un segundo.
function computePaceImprovement(workouts) {

    const withPace = workouts
        .filter(w => w.avgPaceSecPerKm != null)
        .sort((a, b) => a.date.localeCompare(b.date));

    if (withPace.length < MIN_PACE_SAMPLE * 2) return null;

    const recentGroup = withPace.slice(-MIN_PACE_SAMPLE);
    const previousGroup = withPace.slice(-MIN_PACE_SAMPLE * 2, -MIN_PACE_SAMPLE);

    const avg = group => group.reduce((sum, w) => sum + w.avgPaceSecPerKm, 0) / group.length;
    const improvementSec = Math.round(avg(previousGroup) - avg(recentGroup));

    return improvementSec >= MIN_PACE_IMPROVEMENT_SEC ? improvementSec : null;

}

function buildVariants(workouts, todayIso) {

    const variants = [];
    const lastWorkout = mostRecentWorkout(workouts);
    const lastWorkoutIsFresh = lastWorkout && daysBetween(lastWorkout.date, todayIso) <= LAST_WORKOUT_STALE_DAYS;

    const streak = computeWeekStreak(workouts, todayIso);
    if (streak) {
        variants.push({
            title: ["Racha de", `${streak} semanas`],
            coachTitle: "Constancia",
            coachMessages: [
                `Llevas ${streak} semanas seguidas entrenando.`,
                "Así se construye una base sólida."
            ]
        });
    }

    const recentStats = computeRecentStats(workouts, todayIso);
    if (recentStats) {
        variants.push({
            title: ["Esta semana", `${formatKm(recentStats.totalKm)} km`],
            coachTitle: "Tu semana",
            coachMessages: [
                `${recentStats.count} entreno${recentStats.count === 1 ? "" : "s"} y ${formatKm(recentStats.totalKm)} km en los últimos 7 días.`,
                "Sigue así."
            ]
        });
    }

    const paceImprovement = computePaceImprovement(workouts);
    if (paceImprovement) {
        variants.push({
            title: ["Vas más", "rápido"],
            coachTitle: "Progreso",
            coachMessages: [
                `Tu ritmo medio ha bajado ${paceImprovement} seg/km en tus últimos entrenos.`,
                "El trabajo se nota."
            ]
        });
    }

    if (lastWorkoutIsFresh) {
        variants.push({
            title: ["Último", "entreno"],
            coachTitle: "Tu último registro",
            coachMessages: [
                lastWorkout.distanceKm
                    ? `El ${formatWeekday(lastWorkout.date)} recorriste ${formatKm(lastWorkout.distanceKm)} km.`
                    : `El ${formatWeekday(lastWorkout.date)} completaste tu entreno.`,
                "Descansa o suma otro cuando quieras."
            ]
        });
    }

    return variants;

}

const NEUTRAL_HERO = {
    title: ["Descansa", "hoy"],
    coachTitle: "Día libre",
    coachMessages: [
        "Hoy no tienes ningún entrenamiento planificado.",
        "Aprovecha para descansar o moverte con calma."
    ]
};

// Contenido del Hero para un día sin sesión planificada — se recalcula en
// cada llamada (nunca cachea un texto viejo) y elige al azar entre las
// variantes que de verdad se puedan calcular con datos reales; si ninguna
// aplica (usuario nuevo, sin workouts o muy pocos) cae al mensaje neutro.
export function buildRestDayHero(workouts, today = new Date()) {

    const variants = buildVariants(workouts, formatISODate(today));
    if (!variants.length) return NEUTRAL_HERO;

    const index = Math.min(variants.length - 1, Math.floor(Math.random() * variants.length));
    return variants[index];

}
