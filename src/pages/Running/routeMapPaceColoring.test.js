import { describe, it, expect } from "vitest";
import {
    cumulativeDistancesMeters,
    buildKmMarkers,
    buildPaceColorSegments,
    ROUTE_COLOR_NORMAL,
    ROUTE_COLOR_FAST,
    ROUTE_COLOR_SLOW,
    ROUTE_COLOR_REST
} from "./routeMapPaceColoring.js";

// ~111320m por grado de latitud -- suficiente para que dos puntos
// consecutivos generados así queden a ~stepMeters de distancia haversine
// real (no hace falta exactitud perfecta, solo puntos "a ~20m entre sí"
// como los que produce buildRouteTrace en geoTrace.js).
const METERS_PER_DEGREE_LAT = 111320;

function straightTrace(totalMeters, stepMeters = 20) {

    const stepDeg = stepMeters / METERS_PER_DEGREE_LAT;
    const points = [];

    for (let d = 0; d <= totalMeters; d += stepMeters) {
        points.push({ lat: 37.58 + (d / METERS_PER_DEGREE_LAT), lon: -1.73 });
    }

    // Punto final exacto, igual que buildRouteTrace añade el último fix real
    // aunque no caiga justo en un múltiplo de stepMeters.
    const last = points[points.length - 1];
    if (last.lat !== 37.58 + (totalMeters / METERS_PER_DEGREE_LAT)) {
        points.push({ lat: 37.58 + (totalMeters / METERS_PER_DEGREE_LAT), lon: -1.73 });
    }

    return points;

}

describe("cumulativeDistancesMeters", () => {

    it("empieza en 0 y crece de forma monótona hasta ~la distancia total", () => {

        const trace = straightTrace(200);
        const distances = cumulativeDistancesMeters(trace);

        expect(distances[0]).toBe(0);
        expect(distances[distances.length - 1]).toBeCloseTo(200, 0);

        for (let i = 1; i < distances.length; i++) {
            expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
        }

    });

});

describe("buildKmMarkers", () => {

    it("coloca un marcador por cada km completo, ninguno por el tramo final parcial", () => {

        const trace = straightTrace(2500);
        const markers = buildKmMarkers(trace);

        expect(markers.map(m => m.km)).toEqual([1, 2]);

    });

    it("cada marcador trae dirA/dirB (los puntos en bruto que lo rodean, para calcular dirección perpendicular en RouteMap.js)", () => {

        // 1200m, no 1000m exactos -- straightTrace() aproxima grados a
        // metros con una constante que no coincide al milímetro con la
        // fórmula haversine real que usa cumulativeDistancesMeters(), así
        // que una distancia justo en el límite de 1km es frágil por un
        // motivo de la propia fixture del test, no del código real.
        const trace = straightTrace(1200);
        const [marker] = buildKmMarkers(trace);

        expect(marker.dirA).toHaveProperty("lat");
        expect(marker.dirA).toHaveProperty("lon");
        expect(marker.dirB).toHaveProperty("lat");
        expect(marker.dirB).toHaveProperty("lon");
        // dirA/dirB son dos puntos DISTINTOS de la traza (si no, no habría
        // ninguna dirección real que calcular).
        expect(marker.dirA).not.toEqual(marker.dirB);

    });

    it("no coloca ningún marcador si el recorrido no llega a 1km", () => {

        const trace = straightTrace(800);
        expect(buildKmMarkers(trace)).toEqual([]);

    });

});

describe("buildPaceColorSegments", () => {

    it("sin splits, devuelve un único segmento con el color normal", () => {

        const trace = straightTrace(200);
        const segments = buildPaceColorSegments(trace, []);

        expect(segments).toHaveLength(1);
        expect(segments[0].color).toBe(ROUTE_COLOR_NORMAL);
        expect(segments[0].latlngs).toHaveLength(trace.length);

    });

    it("colorea un km notablemente más rápido en verde y uno más lento en naranja", () => {

        const trace = straightTrace(2000);
        const splits = [
            { lap: 1, distanceKm: 1, paceSecPerKm: 250 }, // media de los dos: 300
            { lap: 2, distanceKm: 1, paceSecPerKm: 350 }
        ];

        const segments = buildPaceColorSegments(trace, splits);
        const colors = segments.map(s => s.color);

        expect(colors[0]).toBe(ROUTE_COLOR_FAST);
        expect(colors[colors.length - 1]).toBe(ROUTE_COLOR_SLOW);

    });

    // Bug real ya corregido dos veces: 1) usar la media del entreno COMPLETO
    // como referencia (en vez del rango real de estos mismos splits) podía
    // dejar el mapa entero en un solo color; 2) un umbral FIJO sobre una
    // media también podía dejarlo casi entero en el color normal si la
    // variación real del entreno era más sutil que ese umbral, aunque
    // hubiera un km claramente más rápido y otro más lento dentro de ESE
    // entreno. El degradado continuo (anclado al propio min/max del
    // entreno, ver paceColorFor) garantiza que el km más rápido de estos 4
    // sea SIEMPRE el color más rápido posible, y el más lento el más lento
    // posible, con variación real y visible entre medias.
    it("con variación real entre splits, el más rápido y el más lento anclan los extremos del degradado", () => {

        const trace = straightTrace(4000);
        const splits = [
            { lap: 1, distanceKm: 1, paceSecPerKm: 340 }, // el más rápido de los 4
            { lap: 2, distanceKm: 1, paceSecPerKm: 360 },
            { lap: 3, distanceKm: 1, paceSecPerKm: 380 },
            { lap: 4, distanceKm: 1, paceSecPerKm: 400 }  // el más lento de los 4
        ];

        const segments = buildPaceColorSegments(trace, splits);
        const colors = segments.map(s => s.color);

        expect(colors[0]).toBe(ROUTE_COLOR_FAST);
        expect(colors[colors.length - 1]).toBe(ROUTE_COLOR_SLOW);

        // Los dos intermedios deben ser colores REALMENTE distintos entre sí
        // y de los extremos -- un degradado de verdad, no 3 bloques planos.
        const uniqueColors = new Set(colors);
        expect(uniqueColors.size).toBeGreaterThanOrEqual(4);

    });

    it("un split de Recuperación siempre sale gris, aunque su ritmo sea muy lento", () => {

        const trace = straightTrace(1000);
        const splits = [
            { lap: 1, distanceKm: 1, paceSecPerKm: 600, segmentType: "rest" }
        ];

        const segments = buildPaceColorSegments(trace, splits);

        expect(segments.every(s => s.color === ROUTE_COLOR_REST)).toBe(true);

    });

    // MIN_PACE_RANGE_SEC (suelo de 20s): sin esto, un entreno muy uniforme
    // se pintaría con el degradado a tope de saturación (verde/naranja
    // puros) por una diferencia de solo 2-3 segundos entre kms, exagerando
    // una variación insignificante como si fuera real.
    it("con un rango de ritmo por debajo del suelo (variación normal de carrera), todo se queda en el color normal", () => {

        const trace = straightTrace(3000);
        const splits = [
            { lap: 1, distanceKm: 1, paceSecPerKm: 295 },
            { lap: 2, distanceKm: 1, paceSecPerKm: 300 },
            { lap: 3, distanceKm: 1, paceSecPerKm: 305 }
        ];

        const segments = buildPaceColorSegments(trace, splits);

        expect(segments.every(s => s.color === ROUTE_COLOR_NORMAL)).toBe(true);

    });

});
