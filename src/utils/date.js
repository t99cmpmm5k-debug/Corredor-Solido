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