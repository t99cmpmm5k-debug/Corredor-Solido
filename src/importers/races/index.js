import { parseRacesFromJson } from "./json.js";

const parsers = {

    json: parseRacesFromJson

};

export function importRaces(format, raw) {

    const parser = parsers[format];
    if (!parser) throw new Error(`No hay adaptador para el formato "${format}"`);

    const fields = parser(raw);

    return {

        ...fields,
        source: { format, importedAt: new Date().toISOString() }

    };

}
