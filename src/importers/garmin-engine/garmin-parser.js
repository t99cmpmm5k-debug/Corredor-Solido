import * as U from "./garmin-utils.js";
import * as GarminScreenDetector from "./screen-detector.js";
import * as GarminSummaryParser from "./parser-summary.js";
import * as GarminStatisticsParser from "./parser-statistics.js";
import * as GarminSplitsParser from "./parser-splits.js";
import * as GarminIntervalsParser from "./parser-intervals.js";
import * as GarminIntervalsRoadParser from "./parser-intervals-road.js";
import * as GarminFusion from "./fusion.js";

export function parse(text) {
    // La primera línea de una captura del móvil es siempre la barra de
    // estado del sistema (hora, wifi, batería) — nunca es dato del entreno.
    const lines = U.linesOf(text);

    // Salvo cuando la captura llega recortada justo en el encabezado
    // "Seleccionar tipo de paso" (pantallas Intervalos, ver
    // screen-detector.js): esa frase nunca es la barra de estado del móvil,
    // así que quitarla a ciegas por ser la primera línea destruye la única
    // señal que distingue "Intervalos de una Carrera normal" de la vista de
    // Vueltas con FC (parser-splits.js) -- y, a diferencia del resto de
    // casos recortados, lo que queda SÍ basta para una detección (la
    // equivocada) por sí sola, así que el reintento de más abajo -- que
    // solo se dispara si el resultado es "unknown" -- nunca llega a
    // activarse para corregirlo.
    const firstLineIsStatusBar = !/seleccionar tipo de paso/i.test(lines[0] || "");
    const withoutStatusBar = (firstLineIsStatusBar ? lines.slice(1) : lines).join("\n");

    let screen = GarminScreenDetector.detect(withoutStatusBar);
    let bodyText = withoutStatusBar;

    // La tabla de Vueltas desplazada a la derecha (FC por vuelta) a veces
    // llega recortada justo a la tabla, sin barra de estado encima —
    // verificado contra una captura real. Ahí la cabecera con "GAP medio"
    // es la propia primera línea, y quitarla a ciegas deja la pantalla sin
    // identificar. Si eso pasa, se reintenta sin descartar esa línea antes
    // de rendirse a "unknown" — no cambia nada para una captura normal,
    // donde la primera línea de verdad es la barra de estado y el
    // reintento nunca hace falta.
    if (screen.type === "unknown") {
        const withFirstLine = lines.join("\n");
        const retryScreen = GarminScreenDetector.detect(withFirstLine);
        if (retryScreen.type !== "unknown") {
            screen = retryScreen;
            bodyText = withFirstLine;
        }
    }

    let parsed;

    // "unknown" NO es "estadísticas" — antes caía en el else y se
    // parseaba como si lo fuera, quedando etiquetada "statistics-v4-engine"
    // con casi todo en null. Con la prioridad de fusion.js (Estadísticas
    // manda sobre Resumen en las métricas), esa etiqueta falsa le daba
    // vía libre para ganarle a un Resumen correcto con basura.
    if (screen.type === "summary") {
        parsed = GarminSummaryParser.parse(bodyText);
    } else if (screen.type === "statistics") {
        parsed = GarminStatisticsParser.parse(bodyText);
    } else if (screen.type === "splits") {
        parsed = GarminSplitsParser.parse(bodyText);
    } else if (screen.type === "intervals") {
        parsed = GarminIntervalsParser.parse(bodyText);
    } else if (screen.type === "intervals-road") {
        parsed = GarminIntervalsRoadParser.parse(bodyText);
    } else {
        parsed = { parser: "unknown-screen", fields: {} };
    }

    const data = Object.fromEntries(
        Object.entries(parsed.fields).map(([k, v]) => [k, v.value])
    );

    return {
        parser: parsed.parser,
        screen,
        found: Object.values(data).filter(v => v != null).length,
        data,
        fields: parsed.fields,
        // Los parciales de Vueltas viven aquí, no en fields — sin pasarlo
        // se pierden aunque el despacho a GarminSplitsParser sea correcto.
        extras: parsed.extras,
        raw_text: text
    };
}

export function merge(results) {
    return GarminFusion.merge(results);
}
