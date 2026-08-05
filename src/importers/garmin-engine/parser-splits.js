import * as U from "./garmin-utils.js";

export function parse(text) {
    const raw = U.cleanText(text);
    const lines = U.linesOf(raw);
    const laps = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // La fila de resumen ("Total") no es una vuelta — se descarta antes
        // de intentar leerla, en vez de fiarlo a que la forma numérica falle.
        if (/total/i.test(U.normalize(line))) continue;

        // La fila real tiene 4 columnas: vuelta, TIEMPO de vuelta (con
        // decimales, "5:48.3"), distancia, ritmo. Sin anclar al inicio y
        // sin consumir la columna del tiempo, una distancia con forma de
        // hora ("5:48.3") hacía fallar el intento en la vuelta real y la
        // búsqueda se deslizaba hasta encontrar un ajuste dentro del propio
        // decimal del tiempo — devolviendo ese dígito como si fuera la vuelta.
        const match = line.match(/^\s*([0-9]{1,2})\s+[0-9]{1,2}:[0-5][0-9](?:[.,][0-9]+)?\s+([0-9]{1,3}[,.][0-9]{1,2})\s*(?:km)?\s+([0-9]{1,2}:[0-5][0-9])(?:\s*\/\s*km)?/i);
        if (!match) continue;

        laps.push({
            lap: Number(match[1]),
            distance_km: U.num(match[2]),
            pace_min_km: U.pace(match[3])
        });
    }

    return {
        parser: "splits-v4.3",
        fields: {
            source: U.field("Garmin", "Pantalla Vueltas", .99),
            screen_type: U.field("splits", "Vueltas", .98)
        },
        extras: { laps }
    };
}
