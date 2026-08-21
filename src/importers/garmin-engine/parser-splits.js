import * as U from "./garmin-utils.js";
import * as V from "./validators.js";

// Fila de la vista estándar de Vueltas: vuelta, TIEMPO de vuelta (con
// decimales, "5:48.3"), distancia, ritmo. Sin anclar al inicio y sin
// consumir la columna del tiempo, una distancia con forma de hora
// ("5:48.3") hacía fallar el intento en la vuelta real y la búsqueda se
// deslizaba hasta encontrar un ajuste dentro del propio decimal del
// tiempo — devolviendo ese dígito como si fuera la vuelta.
const STANDARD_ROW = /^\s*([0-9]{1,2})\s+[0-9]{1,2}:[0-5][0-9](?:[.,][0-9]+)?\s+([0-9]{1,3}[,.][0-9]{1,2})\s*(?:km)?\s+([0-9]{1,2}:[0-5][0-9])(?:\s*\/\s*km)?/i;

// Fila de la vista de Vueltas desplazada a la derecha (columnas GAP
// medio/FC media/FC máx./Ascenso total, ver screen-detector.js) — no hay
// distancia aquí, así que esta vista nunca aporta ritmo/distancia por
// vuelta, solo FC media y máxima. El primer token (número de vuelta) se
// ignora a propósito: verificado contra una captura real que el motor OCR
// lo confunde con frecuencia ("&", "o)"...) en esta columna concreta —
// las vueltas se numeran por orden de aparición en vez de fiarse de ese
// dígito. El ascenso (última columna) no se captura, no hace falta hoy.
const HR_ROW = /^\S+\s+[0-9]{1,2}:[0-5][0-9]\s+([0-9]{2,3})\s+([0-9]{2,3})\b/;

function parseStandardRows(lines) {

    const laps = [];

    lines.forEach(line => {

        const match = line.match(STANDARD_ROW);
        if (!match) return;

        laps.push({
            lap: Number(match[1]),
            distance_km: U.num(match[2]),
            pace_min_km: U.pace(match[3])
        });

    });

    return laps;

}

function parseHrRows(lines) {

    const laps = [];

    lines.forEach(line => {

        const match = line.match(HR_ROW);
        if (!match) return;

        const avgHr = U.num(match[1]);
        const maxHr = U.num(match[2]);
        if (!V.heartRate(avgHr) || !V.heartRate(maxHr) || avgHr > maxHr) return;

        laps.push({ avg_heart_rate_bpm: avgHr, max_heart_rate_bpm: maxHr });

    });

    laps.forEach((lap, index) => { lap.lap = index + 1; });

    return laps;

}

export function parse(text) {
    const raw = U.cleanText(text);

    // La fila de resumen ("Total") no es una vuelta — se descarta antes
    // de intentar leerla, en vez de fiarlo a que la forma numérica falle.
    const lines = U.linesOf(raw).filter(line => !/total/i.test(U.normalize(line)));

    const standardLaps = parseStandardRows(lines);
    const laps = standardLaps.length ? standardLaps : parseHrRows(lines);

    return {
        parser: "splits-v4.3",
        fields: {
            source: U.field("Garmin", "Pantalla Vueltas", .99),
            screen_type: U.field("splits", "Vueltas", .98)
        },
        extras: { laps }
    };
}
