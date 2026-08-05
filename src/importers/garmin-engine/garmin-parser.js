import * as U from "./garmin-utils.js";
import * as GarminScreenDetector from "./screen-detector.js";
import * as GarminSummaryParser from "./parser-summary.js";
import * as GarminStatisticsParser from "./parser-statistics.js";
import * as GarminFusion from "./fusion.js";

export function parse(text) {
    // La primera línea de una captura del móvil es siempre la barra de
    // estado del sistema (hora, wifi, batería) — nunca es dato del entreno.
    const withoutStatusBar = U.linesOf(text).slice(1).join("\n");

    const screen = GarminScreenDetector.detect(withoutStatusBar);
    let parsed;

    if (screen.type === "summary") {
        parsed = GarminSummaryParser.parse(withoutStatusBar);
    } else {
        parsed = GarminStatisticsParser.parse(withoutStatusBar);
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
        raw_text: text
    };
}

export function merge(results) {
    return GarminFusion.merge(results);
}
