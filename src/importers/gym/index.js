import { parseGymRoutineFromRows } from "./pdf.js";

const parsers = {

    pdf: parseGymRoutineFromRows

};

export function importGymRoutine(format, raw) {

    const parser = parsers[format];
    if (!parser) throw new Error(`No hay adaptador para el formato "${format}"`);

    return parser(raw);

}
