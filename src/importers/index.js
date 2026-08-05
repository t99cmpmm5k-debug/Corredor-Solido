import { parseGarminWorkout } from "./garmin.js";

const parsers = {

    garmin: parseGarminWorkout

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
