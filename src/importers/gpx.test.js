// @vitest-environment happy-dom
//
// gpx.js depende de DOMParser (API de navegador, no de Node) — igual que
// tcx.test.js, scoped aquí en vez de cambiar el entorno global de vitest.
import { describe, it, expect } from "vitest";
import { parseGpxWorkout } from "./gpx.js";

// Estructura típica de un GPX exportado por Garmin Connect/Strava: <trk>
// con <name>, un único <trkseg>, y hr/cad por trackpoint vía la extensión
// gpxtpx:TrackPointExtension. Sin Lap agregado (no existe en GPX) — todo
// se deriva de los propios puntos.
function buildGpx({ missingFields = true, name = "Rodaje suave" } = {}) {

    const points = [
        { t: "00", lat: 37.579470, lon: -1.736270, ele: 329.03, hr: 94, cad: 58 },
        { t: "01", lat: 37.580470, lon: -1.736270, ele: 329.50, hr: 120, cad: 80 },
        { t: "02", lat: 37.581470, lon: -1.736270, ele: 330.10, hr: 130, cad: 82 },
        { t: "03", lat: 37.582470, lon: -1.736270, ele: 329.80, hr: null, cad: null },
        { t: "04", lat: 37.583470, lon: -1.736270, ele: 331.00, hr: 135, cad: 83 },
        { t: "05", lat: 37.584470, lon: -1.736270, ele: 330.50, hr: 138, cad: 84 },
        { t: "06", lat: 37.585470, lon: -1.736270, ele: 332.00, hr: null, cad: null }
    ];

    const trkpts = points.map(p => `
        <trkpt lat="${p.lat}" lon="${p.lon}">
            <ele>${p.ele}</ele>
            <time>2026-05-05T17:29:${p.t}Z</time>
            ${(missingFields && p.hr == null) ? "" : `
            <extensions>
                <gpxtpx:TrackPointExtension>
                    <gpxtpx:hr>${p.hr ?? 100}</gpxtpx:hr>
                    ${(missingFields && p.cad == null) ? "" : `<gpxtpx:cad>${p.cad ?? 70}</gpxtpx:cad>`}
                </gpxtpx:TrackPointExtension>
            </extensions>
            `}
        </trkpt>
    `).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin Connect" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
    <metadata>
        <time>2026-05-05T17:29:00.000Z</time>
    </metadata>
    <trk>
        <name>${name}</name>
        <type>running</type>
        <trkseg>${trkpts}</trkseg>
    </trk>
</gpx>`;

}

describe("parseGpxWorkout", () => {

    it("deriva distancia y duración de los trackpoints (GPX no trae ningún agregado)", () => {

        const workout = parseGpxWorkout(buildGpx());

        expect(workout.distanceKm).toBeGreaterThan(0.6);
        expect(workout.distanceKm).toBeLessThan(0.7);
        expect(workout.durationSec).toBe(6);

    });

    it("deriva FC media/máxima de los propios puntos", () => {

        const workout = parseGpxWorkout(buildGpx());

        expect(workout.avgHr).toBeGreaterThan(0);
        expect(workout.maxHr).toBe(138);

    });

    it("dobla la cadencia por analogía con tcx.js (dato por una sola pierna)", () => {

        const workout = parseGpxWorkout(buildGpx());

        expect(workout.maxCadence).toBe(168);

    });

    it("no rompe con trackpoints sin extensión hr/cad", () => {

        expect(() => parseGpxWorkout(buildGpx({ missingFields: true }))).not.toThrow();

    });

    it("no hay calorías ni temperatura en el estándar GPX — quedan null, no inventadas", () => {

        const workout = parseGpxWorkout(buildGpx());

        expect(workout.calories).toBeNull();
        expect(workout.temperatureC).toBeNull();

    });

    it("usa <trk><name> como título", () => {

        const workout = parseGpxWorkout(buildGpx({ name: "Rodaje suave" }));
        expect(workout.title).toBe("Rodaje suave");

    });

    it("calcula al menos un split por GPS con FC media", () => {

        const workout = parseGpxWorkout(buildGpx());

        expect(workout.splits.length).toBeGreaterThan(0);

        const first = workout.splits[0];
        expect(first.lap).toBe(1);
        expect(first.paceSecPerKm).toBeGreaterThan(0);
        expect(first.avgHr).toBeGreaterThan(0);

    });

    it("lanza un error legible si el archivo no es un GPX válido", () => {

        expect(() => parseGpxWorkout("esto no es xml <<<")).toThrow();

    });

    it("lanza un error legible si no hay ningún trackpoint", () => {

        const empty = `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg></trkseg></trk></gpx>`;
        expect(() => parseGpxWorkout(empty)).toThrow();

    });

});
