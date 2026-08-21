import { parseISODate, formatDayMonth } from "../../utils/date.js";

const URGENT_DEADLINE_DAYS = 3;

// Segunda mitad de formatDayMonth() ("22 AGO" -> "AGO") — para los date
// badges de la tarjeta de lista y el detalle, que pintan día y mes en dos
// líneas separadas en vez de "22 AGO" seguido.
export function monthAbbrev(iso) {

    return formatDayMonth(iso).split(" ")[1];

}

// 2 decimales fijos con coma — mismo formato que ya usaba CarreraRow.
export function formatDistance(distanceKm) {

    return `${distanceKm.toFixed(2).replace(".", ",")} km`;

}

// "AAAA-MM-DDTHH:MM(:SS)?" en hora LOCAL de quien lo lea — igual que
// parseISODate(), evitando el bug de new Date("AAAA-MM-DD...") interpretado
// en UTC y desplazando el día/hora según la zona horaria de quien mire la
// app.
export function formatDeadline(iso) {

    const [datePart, timePart] = iso.split("T");
    const date = parseISODate(datePart);

    const dateLabel = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" })
        .format(date)
        .replace(".", "");

    const timeLabel = timePart ? timePart.slice(0, 5) : null;

    return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;

}

export function isDeadlineUrgent(iso) {

    const [datePart, timePart] = iso.split("T");
    const date = parseISODate(datePart);

    if (timePart) {
        const [hours, minutes] = timePart.split(":").map(Number);
        date.setHours(hours, minutes, 0, 0);
    }

    const msUntil = date.getTime() - Date.now();

    return msUntil >= 0 && msUntil <= URGENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000;

}

// Solo el host, para no imprimir una URL larga entera en la tabla de
// detalles — si no es una URL válida (dato suelto raro en el archivo
// importado) se muestra tal cual en vez de ocultarla.
export function formatUrlHost(url) {

    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }

}
