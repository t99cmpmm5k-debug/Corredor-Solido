import { describe, it, expect } from "vitest";
import { haversineMeters, buildRouteTrace, ROUTE_TRACE_STEP_METERS } from "./geoTrace.js";

describe("haversineMeters", () => {

    it("da 0 para el mismo punto", () => {
        expect(haversineMeters(37.58, -1.73, 37.58, -1.73)).toBe(0);
    });

    it("da una distancia razonable para dos puntos separados ~111m (0.001° de latitud)", () => {
        const d = haversineMeters(37.58, -1.73, 37.581, -1.73);
        expect(d).toBeGreaterThan(100);
        expect(d).toBeLessThan(120);
    });

});

describe("buildRouteTrace", () => {

    it("devuelve null con menos de 2 puntos con GPS real", () => {
        expect(buildRouteTrace([])).toBeNull();
        expect(buildRouteTrace([{ lat: 37.58, lon: -1.73 }])).toBeNull();
        expect(buildRouteTrace([{ lat: null, lon: null }, { lat: 37.58, lon: -1.73 }])).toBeNull();
    });

    it("ignora puntos sin lat/lon (huecos de señal) sin romper", () => {
        const points = [
            { lat: 37.5800, lon: -1.7300 },
            { lat: null, lon: null },
            { lat: 37.5810, lon: -1.7300 }
        ];
        expect(() => buildRouteTrace(points)).not.toThrow();
        expect(buildRouteTrace(points).length).toBeGreaterThan(0);
    });

    it("siempre incluye el primer y el último punto real", () => {
        const points = [
            { lat: 37.5800, lon: -1.7300 },
            { lat: 37.5805, lon: -1.7302 },
            { lat: 37.5830, lon: -1.7310 }
        ];
        const trace = buildRouteTrace(points);

        expect(trace[0]).toEqual({ lat: 37.5800, lon: -1.7300 });
        expect(trace[trace.length - 1]).toEqual({ lat: 37.5830, lon: -1.7310 });
    });

    // ~333m de recorrido total (3 tramos de ~111m, línea recta en latitud)
    // -- con el paso por defecto (20m) deben salir del orden de 333/20 ≈ 16
    // marcas intermedias más el punto de arranque.
    it("re-muestrea a intervalos de ROUTE_TRACE_STEP_METERS, no uno por punto crudo", () => {
        const points = [
            { lat: 37.5800, lon: -1.7300 },
            { lat: 37.5810, lon: -1.7300 },
            { lat: 37.5820, lon: -1.7300 },
            { lat: 37.5830, lon: -1.7300 }
        ];
        const trace = buildRouteTrace(points);

        expect(trace.length).toBeGreaterThan(points.length);

        for (let i = 1; i < trace.length - 1; i++) {
            const step = haversineMeters(trace[i - 1].lat, trace[i - 1].lon, trace[i].lat, trace[i].lon);
            expect(step).toBeCloseTo(ROUTE_TRACE_STEP_METERS, -1);
        }
    });

    it("un paso mayor produce una traza con menos puntos para el mismo recorrido", () => {
        const points = [
            { lat: 37.5800, lon: -1.7300 },
            { lat: 37.5810, lon: -1.7300 },
            { lat: 37.5820, lon: -1.7300 },
            { lat: 37.5830, lon: -1.7300 }
        ];
        const fine = buildRouteTrace(points, 10);
        const coarse = buildRouteTrace(points, 50);

        expect(coarse.length).toBeLessThan(fine.length);
    });

});
