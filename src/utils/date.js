/**
 * ==========================================================
 * Inicial de cada día de la semana (para etiquetas compactas)
 * ==========================================================
 */

export const DAY_INITIALS = {
    LUN:"L", MAR:"M", MIÉ:"X", JUE:"J", VIE:"V", SÁB:"S", DOM:"D"
};

/**
 * ==========================================================
 * Formatea la fecha actual
 * ==========================================================
 */

export function formatCurrentDate(date = new Date()) {

    return new Intl.DateTimeFormat("es-ES", {

        weekday: "long",
        day: "numeric",
        month: "long"

    }).format(date);

}

/**
 * ==========================================================
 * Fechas ISO ("AAAA-MM-DD") en hora local
 * Evita el bug de new Date("AAAA-MM-DD") interpretándose en UTC
 * y desplazando el día según la zona horaria.
 * ==========================================================
 */

export function parseISODate(iso) {

    const [year, month, day] = iso.split("-").map(Number);

    return new Date(year, month - 1, day);

}

export function formatISODate(date) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}

export function isToday(iso) {

    const a = parseISODate(iso);
    const b = new Date();

    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );

}

export function formatDayNumber(iso) {

    return parseISODate(iso).getDate();

}

export function formatDayMonth(iso) {

    return new Intl.DateTimeFormat("es-ES", { day:"numeric", month:"short" })
        .format(parseISODate(iso))
        .toUpperCase()
        .replace(".", "");

}

export function formatWeekday(iso) {

    return new Intl.DateTimeFormat("es-ES", { weekday:"long" }).format(parseISODate(iso));

}

/**
 * ==========================================================
 * Número de semana ISO 8601 (lunes=inicio, semana 1 = la que
 * contiene el primer jueves del año)
 * ==========================================================
 */

export function getISOWeekNumber(date) {

    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const dayNumber = target.getDay() || 7;

    target.setDate(target.getDate() + 4 - dayNumber);

    const yearStart = new Date(target.getFullYear(), 0, 1);

    return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);

}

/**
 * ==========================================================
 * Lunes de la semana ISO-8601 que contiene la fecha dada
 * (misma convención lunes=inicio que getISOWeekNumber).
 * ==========================================================
 */

export function getWeekStartDate(iso) {

    const date = parseISODate(iso);
    const dayNumber = date.getDay() || 7; // domingo (0) pasa a 7

    date.setDate(date.getDate() - (dayNumber - 1));

    return formatISODate(date);

}

/**
 * ==========================================================
 * Fecha ISO desplazada N días (negativo hacia atrás) — para
 * navegar semanas (±7) o calcular el domingo de una semana
 * (+6) a partir de su lunes.
 * ==========================================================
 */

export function addDays(iso, days) {

    const date = parseISODate(iso);
    date.setDate(date.getDate() + days);

    return formatISODate(date);

}

/**
 * ==========================================================
 * Abreviatura de día de la semana (LUN..DOM) a partir de una
 * fecha — mismas claves que DAY_INITIALS, en sentido inverso
 * (ahí se va de abreviatura a letra suelta, no de fecha a
 * abreviatura).
 * ==========================================================
 */

const WEEKDAY_ABBREVIATIONS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

export function getDayAbbreviation(iso) {

    return WEEKDAY_ABBREVIATIONS[parseISODate(iso).getDay()];

}