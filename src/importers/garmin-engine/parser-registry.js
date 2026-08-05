import * as GarminSummaryParser from "./parser-summary.js";
import * as GarminStatisticsParser from "./parser-statistics.js";
import * as GarminTrainingEffectParser from "./parser-training-effect.js";
import * as GarminSplitsParser from "./parser-splits.js";

function available(parser) {
    return parser && typeof parser.parse === "function";
}

export function get(type) {
    const requested = {
        summary: GarminSummaryParser,
        statistics: GarminStatisticsParser,
        training_effect: GarminTrainingEffectParser,
        splits: GarminSplitsParser
    }[type];

    if (available(requested)) return requested;

    // Never stop the whole OCR because an optional parser file is missing.
    if (available(GarminStatisticsParser)) return GarminStatisticsParser;
    if (available(GarminSummaryParser)) return GarminSummaryParser;

    return null;
}

export function registered() {
    return [
        ["summary", GarminSummaryParser],
        ["statistics", GarminStatisticsParser],
        ["training_effect", GarminTrainingEffectParser],
        ["splits", GarminSplitsParser]
    ].filter(([, parser]) => available(parser)).map(([name]) => name);
}
