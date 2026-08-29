import * as U from "./garmin-utils.js";
import * as E from "./extractor-engine.js";

// Quita un fragmento suelto final -- mismo patrón que
// cleanLocationForRetry() en weatherEstimate.js y shortLocationLabel() en
// hourlyForecast.js (esos limpian al reintentar geocoding / al mostrar
// una location ya guardada; este se aplica ANTES de guardar location, así
// que cubre también el caso en que el geocoding con el texto sucio sí
// encontraba algo por casualidad). Dos casos, el mismo mecanismo: quitar
// la palabra de actividad del medio del título deja suelto lo que hubiera
// justo antes de ella, y .trim() no lo toca porque no es espacio en
// blanco.
//   - Una letra/token de 1-2 caracteres ("Puerto Lumbreras Carrera A" --
//     bug real 2026-08-26, quitar "Carrera" y colapsar el hueco doble
//     dejaba location="Puerto Lumbreras A").
//   - Un separador colgando sin nada detrás ("Puerto Lumbreras - Series"
//     -- bug real 2026-08-30, quitar "Series" deja location="Puerto
//     Lumbreras -"; cleanText() ya normaliza cualquier variante de guion
//     a "-" antes de llegar aquí, ver garmin-utils.js).
// Los dos pasos se aplican en orden por si se dan juntos ("... - A").
function stripTrailingLooseFragment(text) {
    return text
        .replace(/\s+[A-Za-z]{1,2}$/, "")
        .replace(/[\s:-]+$/, "")
        .trim() || null;
}

function findTitle(lines) {
    const noteIndex = lines.findIndex(x => /anadir notas|añadir notas/.test(U.normalize(x)));
    const blocked = /^(carrera|running|actividad|resumen|estadisticas|vueltas|graficos|equipo)$/i;

    const pool = noteIndex > 0
        ? lines.slice(Math.max(0, noteIndex - 5), noteIndex).reverse()
        : lines;

    for (const line of pool) {
        let candidate = U.cleanText(line)
            .replace(/^[<‹«>›»:\s-]+|[<‹«>›»:\s-]+$/g, "")
            .replace(/\s+(?:za|2a|z4|24|ia)$/i, "")
            .trim();

        if (!candidate) continue;
        const n = U.normalize(candidate);
        if (blocked.test(n)) continue;
        if (/\b\d{1,2}:\d{2}\b/.test(candidate)) continue;
        if (/\b\d+(?:[,.]\d+)?\s*(?:km|ppm|kcal|m)\b/i.test(candidate)) continue;
        if (/\b(carrera|rodaje|running|trail|tempo|series|entrenamiento)\b/.test(n)) {
            return candidate;
        }
    }
    return null;
}

export function parse(text) {
    const raw = U.cleanText(text), lines = U.linesOf(raw);
    const fields = {};

    // El espacio entre día y mes no siempre lo lee el OCR ("7ago" en vez
    // de "7 ago") — exigir \s+ ahí dejaba caer la fecha entera a null.
    const date = U.first(raw, new RegExp(`\\b([0-3]?[0-9])\\s*(${U.MONTHS})(?:\\s+(20[0-9]{2}))?\\b`, "i"));

    // La hora debe leerse junto a la fecha (p. ej. "23 jul @ 07:37"), no la
    // primera que aparezca en todo el texto — si no, coge el reloj del móvil.
    const time = date
        ? U.first(raw.slice(date.match.index, date.match.index + date.match[0].length + 15), /\b([0-2]?[0-9])[:.]([0-5][0-9])\b/)
        : null;

    const title = findTitle(lines);
    let location = null, activity = null;
    if (title) {
        const n = U.normalize(title);
        const m = n.match(/\b(carrera|rodaje|running|trail|tempo|series|entrenamiento)\b/);
        if (m) {
            activity = title.match(new RegExp(`\\b${m[1]}\\b`, "i"))?.[0] || m[1];
            // .trim() solo limpia los extremos -- si la palabra de actividad
            // va en medio del título ("Aguilas Carrera A"), quitarla deja un
            // hueco doble donde estaba ("Aguilas  A") que hay que colapsar.
            // stripTrailingLooseFragment() de arriba quita además la letra o
            // el separador suelto final que sobrevive a ese colapso (bugs
            // reales "Puerto Lumbreras A" / "Puerto Lumbreras -" guardados
            // tal cual, ver 2026-08-26/2026-08-30) -- se aplica aquí, no
            // solo al reintentar geocoding o al mostrar, para que quede bien
            // guardado desde el origen y no solo "arreglado" en el camino.
            const collapsed = title.replace(new RegExp(`\\b${m[1]}\\b`, "i"), "").replace(/\s+/g, " ").trim();
            location = collapsed ? stripTrailingLooseFragment(collapsed) : null;
        } else location = title;
    }

    const distance = E.distance(raw);
    const avgHr = E.avgHeartRate(raw);
    const pace = E.avgPace(raw);
    const total = E.totalTime(raw);
    const calories = E.calories(raw);

    fields.source = U.field("Garmin", "Pantalla Resumen", .99);
    fields.screen_type = U.field("summary", "Resumen", .99);
    fields.title = U.field(title, title, title ? .96 : 0);
    fields.location = U.field(location, title, location ? .94 : 0);
    fields.activity = U.field(activity, title, activity ? .94 : 0);
    fields.date = U.field(date ? `${Number(date.match[1])} ${date.match[2].toLowerCase()}${date.match[3] ? " " + date.match[3] : ""}` : null, date?.source, date ? .97 : 0);
    fields.time = U.field(time ? `${Number(time.match[1])}:${time.match[2]}` : null, time?.source, time ? .9 : 0);
    fields.distance_km = U.field(distance?.value ?? null, distance?.source, distance?.confidence || 0);
    fields.avg_heart_rate_bpm = U.field(avgHr?.value ?? null, avgHr?.source, avgHr?.confidence || 0);
    fields.avg_pace_min_km = U.field(pace?.value ?? null, pace?.source, pace?.confidence || 0);
    fields.total_time = U.field(total?.value ?? null, total?.source, total?.confidence || 0);
    fields.calories_kcal = U.field(calories?.value ?? null, calories?.source, calories?.confidence || 0);

    return { parser: "summary-v4-engine", fields };
}
