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

// Regresión (2026-09-04): transcrita a mano a partir del TCX real
// "activity_24219902217.tcx" que reveló el bug -- una carrera real de
// 4,26 km partida en 6 <Lap> irregulares (paradas de semáforo: 1000m,
// 1000m, 222,47m, 1000m, 1000m, 35,25m), donde el parser solo leía
// `getElementsByTagName("Lap")[0]` y la app mostraba ~1km (solo el
// primer Lap). Todos los campos por Lap (tiempo/distancia/calorías/FC/
// cadencia) son los valores reales del archivo, tal cual — igual que la
// fixture de Intervalos de Garmin, ningún Lap corto o irregular se
// inventa ni se ajusta para que "cuadre mejor". Solo se conserva el
// primer y último Trackpoint real de cada Lap (no los ~1200 reales del
// archivo) — de sobra para probar que TODOS los Laps se leen; por eso
// los splits/elevación calculados por GPS de este fixture reducido NO
// se comparan con el archivo completo (ver el test de splits más abajo).
function buildRealMultiLapTcx() {

    const laps = [
        { start: "2026-09-03T08:01:21.000Z", time: 282.37, dist: 1000.0, cal: 71, avgHr: 151, maxHr: 162, avgCad: 88, maxCad: 93,
          points: [
              { t: "2026-09-03T08:01:21.000Z", lat: 37.54662713035941, lon: -1.8121239636093378, alt: 449.8, hr: 118 },
              { t: "2026-09-03T08:06:04.000Z", lat: 37.54664749838412, lon: -1.8121270649135113, alt: 453.0, hr: 159 }
          ] },
        { start: "2026-09-03T08:06:04.000Z", time: 281.637, dist: 1000.0, cal: 75, avgHr: 164, maxHr: 167, avgCad: 89, maxCad: 92,
          points: [
              { t: "2026-09-03T08:06:04.000Z", lat: 37.54664749838412, lon: -1.8121270649135113, alt: 453.0, hr: 159 },
              { t: "2026-09-03T08:10:46.000Z", lat: 37.54678102210164, lon: -1.8122124765068293, alt: 451.4, hr: 163 }
          ] },
        // El Lap "sospechoso" del diagnóstico original: mucho más corto
        // (222,47m en 120s) que sus vecinos de 1000m -- debe sumarse igual,
        // nunca descartarse por parecer irregular.
        { start: "2026-09-03T08:10:46.000Z", time: 120.0, dist: 222.47, cal: 26, avgHr: 149, maxHr: 166, avgCad: 74, maxCad: 88,
          points: [
              { t: "2026-09-03T08:10:46.000Z", lat: 37.54678102210164, lon: -1.8122124765068293, alt: 451.4, hr: 163 },
              { t: "2026-09-03T08:12:45.000Z", lat: 37.54662008956075, lon: -1.8116248212754726, alt: 450.0, hr: 137 }
          ] },
        { start: "2026-09-03T08:12:45.000Z", time: 281.161, dist: 1000.0, cal: 73, avgHr: 160, maxHr: 168, avgCad: 89, maxCad: 91,
          points: [
              { t: "2026-09-03T08:12:45.000Z", lat: 37.54662008956075, lon: -1.8116248212754726, alt: 450.0, hr: 137 },
              { t: "2026-09-03T08:17:27.000Z", lat: 37.546516908332705, lon: -1.8117583449929953, alt: 450.6, hr: 167 }
          ] },
        { start: "2026-09-03T08:17:27.000Z", time: 280.574, dist: 1000.0, cal: 76, avgHr: 169, maxHr: 173, avgCad: 88, maxCad: 91,
          points: [
              { t: "2026-09-03T08:17:27.000Z", lat: 37.546516908332705, lon: -1.8117583449929953, alt: 450.6, hr: 167 },
              { t: "2026-09-03T08:22:08.000Z", lat: 37.54652579315007, lon: -1.8119909428060055, alt: 450.0, hr: 172 }
          ] },
        // Último Lap, el más corto de todos (35,25m en 24s) -- mismo
        // criterio: real, no se descarta.
        { start: "2026-09-03T08:22:08.000Z", time: 24.029, dist: 35.25, cal: 6, avgHr: 166, maxHr: 172, avgCad: 42, maxCad: 87,
          points: [
              { t: "2026-09-03T08:22:08.000Z", lat: 37.54652579315007, lon: -1.8119909428060055, alt: 450.0, hr: 172 },
              { t: "2026-09-03T08:22:31.000Z", lat: 37.54664557054639, lon: -1.8117487896233797, alt: 449.8, hr: 160 }
          ] }
    ];

    // <ns3:MaxRunCadence> con "M" mayúscula tal cual el archivo real -- el
    // código original solo buscaba "maxRunCadence" (m minúscula) y esta
    // variante de Zepp lo dejaba en null en silencio, un segundo bug
    // distinto encontrado al revisar los campos derivados.
    const lapXml = laps.map(lap => `
        <Lap StartTime="${lap.start}">
            <TotalTimeSeconds>${lap.time}</TotalTimeSeconds>
            <DistanceMeters>${lap.dist}</DistanceMeters>
            <Calories>${lap.cal}</Calories>
            <AverageHeartRateBpm><Value>${lap.avgHr}</Value></AverageHeartRateBpm>
            <MaximumHeartRateBpm><Value>${lap.maxHr}</Value></MaximumHeartRateBpm>
            <Intensity>Active</Intensity>
            <TriggerMethod>Manual</TriggerMethod>
            <Track>${lap.points.map(p => `
                <Trackpoint>
                    <Time>${p.t}</Time>
                    <Position>
                        <LatitudeDegrees>${p.lat}</LatitudeDegrees>
                        <LongitudeDegrees>${p.lon}</LongitudeDegrees>
                    </Position>
                    <AltitudeMeters>${p.alt}</AltitudeMeters>
                    <HeartRateBpm><Value>${p.hr}</Value></HeartRateBpm>
                </Trackpoint>`).join("")}
            </Track>
            <Extensions>
                <ns3:LX>
                    <ns3:AvgRunCadence>${lap.avgCad}</ns3:AvgRunCadence>
                    <ns3:MaxRunCadence>${lap.maxCad}</ns3:MaxRunCadence>
                </ns3:LX>
            </Extensions>
        </Lap>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
    <Activities>
        <Activity Sport="Running">
            <Id>2026-09-03T08:01:21.000Z</Id>
            ${lapXml}
        </Activity>
    </Activities>
</TrainingCenterDatabase>`;

}

describe("parseTcxWorkout — regresión: TCX real con 6 Laps irregulares (paradas de semáforo)", () => {

    it("suma la distancia de TODOS los Laps -- 4,26 km limpios, no 1 km (ni los 2 km que mostraba la app) ni ruido de punto flotante", () => {

        const workout = parseTcxWorkout(buildRealMultiLapTcx());

        // 1000 + 1000 + 222.47 + 1000 + 1000 + 35.25 = 4257.72m exacto, pero
        // sumar esos floats da 4257.719999999999 sin redondear (verificado
        // contra el archivo real) -- round2() debe dejarlo en 4.26 limpio,
        // no un valor "cercano".
        expect(workout.distanceKm).toBe(4.26);

    });

    it("suma la duración de TODOS los Laps, no solo el primero -- redondeada a segundos enteros", () => {

        const workout = parseTcxWorkout(buildRealMultiLapTcx());

        // 282.37 + 281.637 + 120 + 281.161 + 280.574 + 24.029 = 1269.771s,
        // redondeado a 1270 (mismo criterio que gpx.js). El ritmo medio se
        // calcula ANTES de este redondeo, sobre los valores completos.
        expect(workout.durationSec).toBe(1270);
        expect(workout.avgPaceSecPerKm).toBe(298);

    });

    it("suma calorías de todos los Laps y agrega FC media (ponderada por duración) / máxima (el máximo real) de todos", () => {

        const workout = parseTcxWorkout(buildRealMultiLapTcx());

        expect(workout.calories).toBe(327);
        expect(workout.avgHr).toBe(160);
        expect(workout.maxHr).toBe(173);

    });

    it("agrega cadencia media (ponderada) y máxima de todos los Laps, incluida la variante <ns3:MaxRunCadence> en mayúscula", () => {

        const workout = parseTcxWorkout(buildRealMultiLapTcx());

        expect(workout.avgCadence).toBe(86);
        expect(workout.maxCadence).toBe(93);

    });

    it("no descarta los Laps más cortos/irregulares (222,47m/120s y 35,25m/24s)", () => {

        const workout = parseTcxWorkout(buildRealMultiLapTcx());

        // Con el bug original (solo el primer Lap) esto habría dado 1 km.
        // Sin este fix, ni siquiera se habría acercado a los 4,26 km reales.
        expect(workout.distanceKm).toBeGreaterThan(4);

    });

    it("calcula splits sobre los puntos de todos los Laps sin lanzar -- no representativos del ritmo real por la baja densidad de puntos de este fixture reducido, solo se comprueba que no rompe", () => {

        expect(() => parseTcxWorkout(buildRealMultiLapTcx())).not.toThrow();

    });

    // Bug real (2026-09-04, mismo patrón ya arreglado en gpx.js): sumar el
    // <DistanceMeters>/<TotalTimeSeconds> de varios Laps arrastra ruido de
    // punto flotante ("4257.719999999999" en vez de "4257.72") que antes se
    // colaba tal cual en Revisar-datos y en el detalle del entreno -- no
    // pasaba con un solo Lap porque ese único valor ya venía limpio de la
    // fuente.
    it("redondea distanceKm a 2 decimales aunque la suma de los Laps no salga limpia", () => {

        const workout = parseTcxWorkout(buildRealMultiLapTcx());
        const decimals = String(workout.distanceKm).split(".")[1] ?? "";

        expect(decimals.length).toBeLessThanOrEqual(2);

    });

    it("redondea durationSec a segundos enteros", () => {

        const workout = parseTcxWorkout(buildRealMultiLapTcx());

        expect(Number.isInteger(workout.durationSec)).toBe(true);

    });

});

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

    it("calcula al menos un split por GPS con FC media (sale gratis de los Trackpoints)", () => {

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
