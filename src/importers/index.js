import { parseGarminWorkout } from "./garmin.js";
import { parseTcxWorkout } from "./tcx.js";
import { parseGpxWorkout } from "./gpx.js";

const parsers = {

    garmin: parseGarminWorkout,
    tcx: parseTcxWorkout,
    gpx: parseGpxWorkout

};

export function importWorkout(device, raw) {

    const parser = parsers[device];
    if (!parser) throw new Error(`No hay adaptador para el reloj "${device}"`);

    const fields = parser(raw);

    return {

        ...fields,
        source: { device, importedAt: new Date().toISOString() }

    };

}
