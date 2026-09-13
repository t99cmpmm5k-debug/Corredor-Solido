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

// Día 0 del mes SIGUIENTE = último día real de este mes (28/29/30/31) --
// truco estándar de Date, no un cálculo propio con reglas de año bisiesto.
function daysInMonth(monthKey) {

    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, month, 0).getDate();

}

// Suma de km reales entre dos fechas ISO, ambas inclusive -- para la
// comparación justa (mismo rango de días en ambos meses) y la proyección,
// ninguna de las dos puede salir del totales-por-mes ya agregado de
// statsByMonth() porque necesitan un corte a mitad de mes.
function sumKmInRange(workouts, startISO, endISO) {

    return workouts
        .filter(w => w.date && w.date >= startISO && w.date <= endISO)
        .reduce((sum, w) => sum + (w.distanceKm || 0), 0);

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
// - currentMonthKm: suma real del mes en curso HASTA HOY (0 si todavía no
//   hay ningún entreno este mes, que es un dato real, no inventado) --
//   nunca puede incluir días futuros porque no hay entrenos ahí.
// - comparisonPercent / comparisonDays: comparación JUSTA (Capa 3, punto 2
//   del documento de mejoras) -- antes comparaba el mes en curso
//   (incompleto) contra el mes anterior COMPLETO, lo que daba caídas
//   falsas a mitad de mes solo porque el mes no había terminado. Ahora
//   compara los mismos `comparisonDays` días de calendario en ambos meses
//   (día 1 al día actual) -- si el mes anterior tiene menos días que ese
//   rango (p. ej. hoy es 30 y el mes anterior es febrero), se usa el mes
//   anterior COMPLETO en su lugar (comparisonDays queda en el nº real de
//   días usado, nunca se inventan días que ese mes no tuvo). null si esos
//   mismos días del mes anterior no tienen ni un solo km real -- nunca se
//   compara contra un "0 km" fabricado ni se divide entre cero.
// - projectedKm: proyección simple (km actuales ÷ días transcurridos ×
//   días totales del mes) -- independiente de la comparación de arriba,
//   se calcula en cuanto hay algún km real este mes, aunque sea el primer
//   mes de historial del usuario (ver requisito 4 del encargo: no depende
//   de tener mes anterior). null sin ningún km real todavía este mes (no
//   tiene sentido proyectar "0 km/día" hacia delante).
// - chartMonths: null si el usuario tiene menos de MIN_MONTHS_OF_HISTORY
//   meses distintos con algún entreno real en todo su historial (caso
//   "usuario nuevo", ver requisito 4) -- si no, los últimos CHART_MONTHS
//   meses (el actual incluido) con su suma real, TOTAL del mes (esto no
//   cambia con el punto 2 -- las barras del histórico siguen mostrando el
//   total real de cada mes, la comparación justa es solo para el número
//   grande de cabecera). Un mes sin entrenos dentro de esa ventana sí
//   puede llevar 0 km real (el usuario ya tiene historial de sobra para
//   que sea un dato genuino, no un hueco de "todavía no usabas la app").
export function buildMonthlyKmStats(workouts, referenceDate = new Date()) {

    const totals = statsByMonth(workouts);
    const currentMonthKey = monthKeyOf(formatISODate(referenceDate));
    const currentMonthKm = totals.get(currentMonthKey)?.km ?? 0;
    // count real del mes en curso -- independiente de que haya o no
    // suficiente historial para gráfico/comparación (ver más abajo), la
    // línea de resumen del widget ("9 entrenamientos · 5,8 km/sesión") lo
    // necesita también para un usuario nuevo con un único mes de datos.
    const currentMonthCount = totals.get(currentMonthKey)?.count ?? 0;
    const previousMonthKey = shiftMonthKey(currentMonthKey, -1);

    // Proyección: siempre que haya algo real este mes, sin depender de
    // tener mes anterior ni historial mínimo (requisito 4).
    const daysElapsed = referenceDate.getDate();
    const projectedKm = currentMonthKm > 0
        ? (currentMonthKm / daysElapsed) * daysInMonth(currentMonthKey)
        : null;

    // Comparación justa: mismo nº de días de calendario en ambos meses,
    // recortado al nº de días reales del mes anterior si este es más
    // corto (nunca se piden días que ese mes no tuvo).
    const comparisonDays = Math.min(daysElapsed, daysInMonth(previousMonthKey));
    const previousRangeStart = `${previousMonthKey}-01`;
    const previousRangeEnd = `${previousMonthKey}-${String(comparisonDays).padStart(2, "0")}`;
    const previousMonthKmSameRange = sumKmInRange(workouts, previousRangeStart, previousRangeEnd);

    const comparisonPercent = previousMonthKmSameRange > 0
        ? Math.round(((currentMonthKm - previousMonthKmSameRange) / previousMonthKmSameRange) * 100)
        : null;

    if (totals.size < MIN_MONTHS_OF_HISTORY) {

        return {
            currentMonthKey, currentMonthKm, currentMonthCount, previousMonthKey,
            comparisonPercent: null, comparisonDays: null, projectedKm, chartMonths: null
        };

    }

    // count real (nº de entrenos, ver statsByMonth) junto al km real de
    // siempre -- para el detalle interactivo al tocar una barra (ver
    // MonthlyKmWidget.js), 0 si ese mes no tuvo ningún entreno.
    const chartMonths = Array.from({ length: CHART_MONTHS }, (_, i) => {

        const key = shiftMonthKey(currentMonthKey, i - (CHART_MONTHS - 1));
        const stats = totals.get(key);

        return { key, km: stats?.km ?? 0, count: stats?.count ?? 0, isCurrent: key === currentMonthKey };

    });

    return {
        currentMonthKey, currentMonthKm, currentMonthCount, previousMonthKey,
        comparisonPercent, comparisonDays: comparisonPercent != null ? comparisonDays : null,
        projectedKm, chartMonths
    };

}
