import { formatISODate } from "./date.js";

const MIN_MONTHS_OF_HISTORY = 2;
const CHART_MONTHS = 6;

function monthKeyOf(iso) {
    return iso.slice(0, 7); // "AAAA-MM-DD" -> "AAAA-MM"
}

function shiftMonthKey(key, delta) {

    const [year, month] = key.split("-").map(Number);
    const shifted = new Date(year, month - 1 + delta, 1);

    return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;

}

// Suma de km y nº de entrenos reales por mes (clave "AAAA-MM") -- solo
// entrenos con fecha, nunca un mes inventado. count cuenta CUALQUIER
// entreno real de ese mes (aunque no traiga distanceKm), para que el
// detalle interactivo del gráfico ("Julio · 35,1 km · 7 entrenamientos",
// ver MonthlyKmWidget.js) no diga "0 entrenamientos" en un mes que sí
// tuvo actividad real sin distancia registrada.
function statsByMonth(workouts) {

    const totals = new Map();

    workouts.forEach(w => {

        if (!w.date) return;

        const key = monthKeyOf(w.date);
        const current = totals.get(key) ?? { km: 0, count: 0 };

        totals.set(key, { km: current.km + (w.distanceKm || 0), count: current.count + 1 });

    });

    return totals;

}

// Estadísticas del widget "Km totales" de Inicio (ver MonthlyKmWidget.js).
// Todo sale de entrenos reales (workouts, de getWorkouts()) -- nunca se
// estima ni se rellena un mes sin datos:
//
// - currentMonthKm: suma real del mes en curso (0 si todavía no hay
//   ningún entreno este mes, que es un dato real, no inventado).
// - comparisonPercent: variación % frente al mes anterior INMEDIATO,
//   solo si ese mes anterior tiene al menos un entreno real -- null si
//   no (nunca se compara contra un "0 km" fabricado).
// - chartMonths: null si el usuario tiene menos de MIN_MONTHS_OF_HISTORY
//   meses distintos con algún entreno real en todo su historial (caso
//   "usuario nuevo", ver requisito 4) -- si no, los últimos CHART_MONTHS
//   meses (el actual incluido) con su suma real. Un mes sin entrenos
//   dentro de esa ventana sí puede llevar 0 km real (el usuario ya tiene
//   historial de sobra para que sea un dato genuino, no un hueco de
//   "todavía no usabas la app").
export function buildMonthlyKmStats(workouts, referenceDate = new Date()) {

    const totals = statsByMonth(workouts);
    const currentMonthKey = monthKeyOf(formatISODate(referenceDate));
    const currentMonthKm = totals.get(currentMonthKey)?.km ?? 0;
    const previousMonthKey = shiftMonthKey(currentMonthKey, -1);

    if (totals.size < MIN_MONTHS_OF_HISTORY) {
        return { currentMonthKey, currentMonthKm, previousMonthKey, comparisonPercent: null, chartMonths: null };
    }

    const previousMonthKm = totals.get(previousMonthKey)?.km;

    const comparisonPercent = (previousMonthKm != null && previousMonthKm > 0)
        ? Math.round(((currentMonthKm - previousMonthKm) / previousMonthKm) * 100)
        : null;

    // count real (nº de entrenos, ver statsByMonth) junto al km real de
    // siempre -- para el detalle interactivo al tocar una barra (ver
    // MonthlyKmWidget.js), 0 si ese mes no tuvo ningún entreno.
    const chartMonths = Array.from({ length: CHART_MONTHS }, (_, i) => {

        const key = shiftMonthKey(currentMonthKey, i - (CHART_MONTHS - 1));
        const stats = totals.get(key);

        return { key, km: stats?.km ?? 0, count: stats?.count ?? 0, isCurrent: key === currentMonthKey };

    });

    return { currentMonthKey, currentMonthKm, previousMonthKey, comparisonPercent, chartMonths };

}
