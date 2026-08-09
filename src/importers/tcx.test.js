// @vitest-environment happy-dom
//
// tcx.js depende de DOMParser (API de navegador, no de Node) — este
// archivo es el único que necesita entorno DOM, así que se scoped aquí
// en vez de cambiar el entorno global de vitest para el resto de tests.
import { describe, it, expect } from "vitest";
import { parseTcxWorkout } from "./tcx.js";

// Réplica reducida (7 trackpoints, ~1.1 km) de la estructura real
// verificada contra un TCX exportado por Zepp desde un Amazfit: un solo
// Lap, ns3:LX con AvgSpeed deliberadamente inconsistente con
// distancia/duración (para probar que se ignora), y un par de
// trackpoints sin HeartRateBpm/Cadence (campos ausentes sueltos, como en
// el archivo real).
function buildTcx({ missingFields = true } = {}) {

    const points = [
        { t: "00", lat: 37.579470, lon: -1.736270, alt: 329.03, hr: 94, cad: 58 },
        { t: "01", lat: 37.580470, lon: -1.736270, alt: 329.50, hr: 120, cad: 80 },
        { t: "02", lat: 37.581470, lon: -1.736270, alt: 330.10, hr: 130, cad: 82 },
        { t: "03", lat: 37.582470, lon: -1.736270, alt: 329.80, hr: null, cad: null },
        { t: "04", lat: 37.583470, lon: -1.736270, alt: 331.00, hr: 135, cad: 83 },
        { t: "05", lat: 37.584470, lon: -1.736270, alt: 330.50, hr: 138, cad: 84 },
        { t: "06", lat: 37.585470, lon: -1.736270, alt: 332.00, hr: null, cad: null }
    ];

    const trackpoints = points.map(p => `
        <Trackpoint>
            <Time>2026-05-05T17:29:${p.t}Z</Time>
            <Position>
                <LatitudeDegrees>${p.lat}</LatitudeDegrees>
                <LongitudeDegrees>${p.lon}</LongitudeDegrees>
            </Position>
            <AltitudeMeters>${p.alt}</AltitudeMeters>
            ${(missingFields && p.hr == null) ? "" : `<HeartRateBpm><Value>${p.hr ?? 100}</Value></HeartRateBpm>`}
            ${(missingFields && p.cad == null) ? "" : `<Cadence>${p.cad ?? 70}</Cadence>`}
            <Extensions><ns3:TPX><ns3:Speed>1.5</ns3:Speed></ns3:TPX></Extensions>
        </Trackpoint>
    `).join("");

    return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
    <Activities>
        <Activity Sport="Running">
            <Id>2026-05-05T17:29:00Z</Id>
            <Notes>A pie·Instructor Zepp</Notes>
            <Lap StartTime="2026-05-05T17:29:00Z">
                <TotalTimeSeconds>420</TotalTimeSeconds>
                <DistanceMeters>1100</DistanceMeters>
                <MaximumSpeed>0</MaximumSpeed>
                <Calories>70</Calories>
                <AverageHeartRateBpm><Value>123</Value></AverageHeartRateBpm>
                <MaximumHeartRateBpm><Value>138</Value></MaximumHeartRateBpm>
                <Extensions>
                    <ns3:LX>
                        <ns3:AvgSpeed>0.1</ns3:AvgSpeed>
                        <ns3:maxRunCadence>168</ns3:maxRunCadence>
                        <ns3:AvgRunCadence>140</ns3:AvgRunCadence>
                    </ns3:LX>
                </Extensions>
                <Track>${trackpoints}</Track>
            </Lap>
            <Creator xsi:type="Device_t"><Name>Amazfit Active 2 NFC (Square)</Name></Creator>
        </Activity>
    </Activities>
    <Author xsi:type="Application_t"><Name>Zepp</Name></Author>
</TrainingCenterDatabase>`;

}

describe("parseTcxWorkout", () => {

    it("lee distancia, duración, FC y calorías directamente del Lap", () => {

        const workout = parseTcxWorkout(buildTcx());

        expect(workout.distanceKm).toBe(1.1);
        expect(workout.durationSec).toBe(420);
        expect(workout.avgHr).toBe(123);
        expect(workout.maxHr).toBe(138);
        expect(workout.calories).toBe(70);

    });

    it("deriva el ritmo de distancia/duración, no de ns3:AvgSpeed", () => {

        const workout = parseTcxWorkout(buildTcx());

        // 420s / 1.1km = 381.8 s/km — nada que ver con ns3:AvgSpeed=0.1
        // (que daría 10000 s/km si se usara tal cual).
        expect(workout.avgPaceSecPerKm).toBe(Math.round(420 / 1.1));

    });

    it("usa la cadencia de Lap tal cual (ya viene doblada) sin multiplicar otra vez", () => {

        const workout = parseTcxWorkout(buildTcx());

        expect(workout.avgCadence).toBe(140);
        expect(workout.maxCadence).toBe(168);

    });

    it("no rompe con trackpoints sin HeartRateBpm ni Cadence", () => {

        expect(() => parseTcxWorkout(buildTcx({ missingFields: true }))).not.toThrow();

    });

    it("no hay temperatura en el TCX de Zepp — queda null, no inventada", () => {

        const workout = parseTcxWorkout(buildTcx());
        expect(workout.temperatureC).toBeNull();

    });

    it("calcula al menos un split por GPS con FC media (dato que el OCR de Garmin no da)", () => {

        const workout = parseTcxWorkout(buildTcx());

        expect(workout.splits.length).toBeGreaterThan(0);

        const first = workout.splits[0];
        expect(first.lap).toBe(1);
        expect(first.paceSecPerKm).toBeGreaterThan(0);
        expect(first.avgHr).toBeGreaterThan(0);

    });

    it("lanza un error legible si el archivo no es un TCX válido", () => {

        expect(() => parseTcxWorkout("esto no es xml <<<")).toThrow();

    });

    it("lanza un error legible si no hay ninguna actividad", () => {

        const empty = `<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities></Activities></TrainingCenterDatabase>`;
        expect(() => parseTcxWorkout(empty)).toThrow();

    });

});
