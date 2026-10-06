// Línea semanal de Composición (Gimnasio): peso medio, cintura y
// cumplimiento de dieta por semana, para seguir lo que pide la dieta
// (mirar peso medio semanal y cintura 2-3 semanas antes de tocar
// calorías). Solo datos: ni interpretación ni recomendación.
//
// Reglas (ninguna inventa un valor):
// - Semanas lunes-domingo con getWeekStartDate()/getISOWeekNumber(), las
//   mismas que usa Plan.
// - Peso: media de los pesajes de esa semana, solo con 2 o más; si no, null.
// - Cintura: el ÚLTIMO registro con cintura de esa semana (no una media:
//   se mide pocas veces), con 1 basta.
// - Cambio: solo si la semana anterior tiene ese mismo dato.
// - Dieta: getWeekDietCompliance() (dietStore.js), solo días transcurridos.
// - Semanas sin ningún dato: fuera.
import { getBodyCompositionEntries } from "./bodyCompositionStore.js";
import { getWeekDietCompliance } from "./dietStore.js";
import { addDays, getWeekStartDate, getISOWeekNumber, parseISODate } from "../utils/date.js";

const MIN_WEIGHINGS_FOR_AVERAGE = 2;

function round1(value) {

    return Math.round(value * 10) / 10;

}

function weightAverage(weekEntries) {

    const weights = weekEntries.map(e => e.weightKg).filter(w => w != null);
    if (weights.length < MIN_WEIGHINGS_FOR_AVERAGE) return null;

    return weights.reduce((sum, w) => sum + w, 0) / weights.length;

}

// Último registro con cintura de la semana: el de fecha más reciente y, a
// igual fecha, el último creado (mismo orden que getBodyCompositionEntries).
function lastWaist(weekEntries) {

    const sorted = weekEntries
        .filter(e => e.waistCm != null)
        .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    return sorted[0]?.waistCm ?? null;

}

function delta(current, previous) {

    return current != null && previous != null ? round1(current - previous) : null;

}

// Pura (sin stores) para poder probarla con datos fijos. entries: registros
// de composición; dietForWeek(weekStart) -> { percent } | null. Devuelve
// las últimas `weeks` semanas hasta la de `today`, la más reciente primero,
// solo las que tienen algún dato.
export function buildWeeklyBodySummary({ entries, today, weeks = 4, dietForWeek = () => null }) {

    const currentWeek = getWeekStartDate(today);

    // Una semana más de las que se muestran: la más antigua también
    // necesita la anterior para su cambio.
    const starts = Array.from({ length: weeks + 1 }, (_, i) => addDays(currentWeek, -7 * (weeks - i)));

    const rows = starts.map(weekStart => {

        const weekEnd = addDays(weekStart, 6);
        const weekEntries = entries.filter(e => e.date >= weekStart && e.date <= weekEnd);
        const average = weightAverage(weekEntries);

        return {
            weekStart,
            weekNumber: getISOWeekNumber(parseISODate(weekStart)),
            // Redondeada ya aquí: el cambio se calcula sobre lo que se ve
            // (80,9 vs 81,3 -> −0,4), así cuadra al restarlo a mano.
            weightKg: average == null ? null : round1(average),
            waistCm: lastWaist(weekEntries),
            dietPercent: dietForWeek(weekStart)?.percent ?? null
        };

    });

    return rows
        .map((row, i) => {

            const previous = rows[i - 1] ?? null;

            return {
                weekStart: row.weekStart,
                weekNumber: row.weekNumber,
                weightKg: row.weightKg,
                weightDelta: previous ? delta(row.weightKg, previous.weightKg) : null,
                waistCm: row.waistCm,
                waistDelta: previous ? delta(row.waistCm, previous.waistCm) : null,
                dietPercent: row.dietPercent
            };

        })
        .slice(1)
        .filter(row => row.weightKg != null || row.waistCm != null || row.dietPercent != null)
        .reverse();

}

export function getWeeklyBodySummary(today, weeks = 4) {

    return buildWeeklyBodySummary({
        entries: getBodyCompositionEntries(),
        today,
        weeks,
        dietForWeek: weekStart => getWeekDietCompliance(weekStart, today)
    });

}
