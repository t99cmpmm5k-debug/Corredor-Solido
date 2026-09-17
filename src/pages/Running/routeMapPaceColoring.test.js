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

    it("no coloca ningún marcador si el recorrido no llega a 1km", () => {

        const trace = straightTrace(800);
        expect(buildKmMarkers(trace)).toEqual([]);

    });

});

describe("buildPaceColorSegments", () => {

    it("sin splits, devuelve un único segmento con el color normal", () => {

        const trace = straightTrace(200);
        const segments = buildPaceColorSegments(trace, [], null);

        expect(segments).toHaveLength(1);
        expect(segments[0].color).toBe(ROUTE_COLOR_NORMAL);
        expect(segments[0].latlngs).toHaveLength(trace.length);

    });

    it("colorea un km notablemente más rápido en verde y uno más lento en naranja", () => {

        const trace = straightTrace(2000);
        const splits = [
            { lap: 1, distanceKm: 1, paceSecPerKm: 250 }, // 50s más rápido que la media
            { lap: 2, distanceKm: 1, paceSecPerKm: 350 }  // 50s más lento que la media
        ];
        const avgPaceRef = 300;

        const segments = buildPaceColorSegments(trace, splits, avgPaceRef);
        const colors = segments.map(s => s.color);

        expect(colors[0]).toBe(ROUTE_COLOR_FAST);
        expect(colors[colors.length - 1]).toBe(ROUTE_COLOR_SLOW);

    });

    it("un split de Recuperación siempre sale gris, aunque su ritmo sea muy lento", () => {

        const trace = straightTrace(1000);
        const splits = [
            { lap: 1, distanceKm: 1, paceSecPerKm: 600, segmentType: "rest" }
        ];

        const segments = buildPaceColorSegments(trace, splits, 300);

        expect(segments.every(s => s.color === ROUTE_COLOR_REST)).toBe(true);

    });

    it("un ritmo dentro del margen de la media se queda en el color normal", () => {

        const trace = straightTrace(1000);
        const splits = [{ lap: 1, distanceKm: 1, paceSecPerKm: 305 }];

        const segments = buildPaceColorSegments(trace, splits, 300);

        expect(segments.every(s => s.color === ROUTE_COLOR_NORMAL)).toBe(true);

    });

});
