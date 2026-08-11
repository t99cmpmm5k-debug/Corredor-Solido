import { parsePlanFromJson } from "./json.js";
import { parsePlanFromCsv } from "./csv.js";
import { parsePlanFromPdfText } from "./pdf.js";

const parsers = {

    json: parsePlanFromJson,
    csv: parsePlanFromCsv,
    pdf: parsePlanFromPdfText

};

export function importPlan(format, raw) {

    const parser = parsers[format];
    if (!parser) throw new Error(`No hay adaptador para el formato "${format}"`);

    const fields = parser(raw);

    return {

        ...fields,
        source: { format, importedAt: new Date().toISOString() }

    };

}
