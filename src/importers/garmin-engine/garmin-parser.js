import * as GarminScreenDetector from "./screen-detector.js";
import * as GarminSummaryParser from "./parser-summary.js";
import * as GarminStatisticsParser from "./parser-statistics.js";
import * as GarminFusion from "./fusion.js";

export function parse(text) {
    const screen = GarminScreenDetector.detect(text);
    let parsed;

    if (screen.type === "summary") {
        parsed = GarminSummaryParser.parse(text);
    } else {
        parsed = GarminStatisticsParser.parse(text);
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
