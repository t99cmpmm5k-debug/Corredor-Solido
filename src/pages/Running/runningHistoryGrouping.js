import { formatISODate, parseISODate, getWeekStartDate, addDays } from "../../utils/date.js";

// Agrupación del listado de entrenos por semana/mes (prioridad 3 de la
// lista de mejoras de Running) -- deliberadamente SOLO por fecha, nunca
// además por tipo (Rodaje/Series/...): eso ya lo cubren los chips
// superiores (RunningTypeFilters), agruparlo también aquí sería el mismo
// criterio aplicado dos veces con dos UI distintas.
const MONTH_LABELS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Ritmo medio del grupo = tiempo total ÷ km totales (mismo criterio que
// buildTypeSummary() en runningSummary.js -- un promedio de promedios
// pesaría igual una tirada de 3 km que una de 20 km), pero aquí además se
// necesita el km total en sí para la cabecera ("24,4 km"), no solo el
// ritmo -- de ahí no reutilizar buildTypeSummary() tal cual.
function buildGroupSummary(workouts) {

    const withDistanceAndDuration = workouts.filter(w => w.distanceKm > 0 && w.durationSec != null);

    const totalKm = workouts.reduce((sum, w) => sum + (w.distanceKm ?? 0), 0);
    const totalDurationSec = withDistanceAndDuration.reduce((sum, w) => sum + w.durationSec, 0);
    const totalKmForPace = withDistanceAndDuration.reduce((sum, w) => sum + w.distanceKm, 0);

    const avgPaceSecPerKm = totalKmForPace > 0 ? Math.round(totalDurationSec / totalKmForPace) : null;

    return {
        count: workouts.length,
        totalKm,
        avgPaceSecPerKm
    };

}

// Agrupa `workouts` (se espera ya ordenados de más reciente a más antiguo,
// mismo orden que pinta RunningIdleView -- si no vinieran así el orden de
// los GRUPOS entre sí saldría mal, aunque cada grupo siga siendo correcto
// por dentro) en: semana actual, semana pasada, y un grupo por mes natural
// para lo más antiguo (con el año añadido a la etiqueta solo si no es el
// año en curso -- "Agosto" vs. "Agosto 2025"). `now` inyectable solo para
// tests, mismo patrón que buildWeekInsight()/buildListInsight().
export function buildHistoryGroups(workouts, { now = new Date() } = {}) {

    if (!workouts.length) return [];

    const todayISO = formatISODate(now);
    const thisWeekStart = getWeekStartDate(todayISO);
    const lastWeekStart = addDays(thisWeekStart, -7);
    const currentYear = now.getFullYear();

    // Un Map preserva el orden de inserción de sus claves -- como
    // `workouts` ya viene ordenado de más reciente a más antiguo, el
    // primer entreno que "abre" cada grupo ya deja los grupos en el orden
    // correcto entre sí (esta semana, semana pasada, meses descendentes)
    // sin necesitar ordenar nada aparte.
    const buckets = new Map();

    for (const workout of workouts) {

        const weekStart = getWeekStartDate(workout.date);

        let key, label, defaultOpen;

        if (weekStart === thisWeekStart) {

            key = "this-week";
            label = "Esta semana";
            defaultOpen = true;

        } else if (weekStart === lastWeekStart) {

            key = "last-week";
            label = "Semana pasada";
            defaultOpen = true;

        } else {

            const date = parseISODate(workout.date);
            const year = date.getFullYear();
            const month = date.getMonth();

            key = `month-${year}-${month}`;
            label = year === currentYear ? MONTH_LABELS[month] : `${MONTH_LABELS[month]} ${year}`;
            defaultOpen = false;

        }

        if (!buckets.has(key)) buckets.set(key, { key, label, defaultOpen, workouts: [] });

        buckets.get(key).workouts.push(workout);

    }

    return [...buckets.values()].map(bucket => ({
        ...bucket,
        summary: buildGroupSummary(bucket.workouts)
    }));

}
