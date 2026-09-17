import { describe, it, expect } from "vitest";
import { declutterMarkers, hasRouteTrace } from "./RouteMap.js";

describe("declutterMarkers", () => {

    it("mantiene todos los puntos si están lejos entre sí", () => {

        const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];
        expect(declutterMarkers(points, 20)).toEqual([0, 1, 2]);

    });

    it("descarta un punto demasiado cerca de otro ya colocado, gana el primero", () => {

        // Simula km 1 y km 5 casi encima en el mapa (recorrido con giro)
        // aunque estén lejos en la ruta real.
        const points = [
            { x: 0, y: 0 },   // km 1 -- se mantiene
            { x: 100, y: 0 }, // km 2 -- lejos, se mantiene
            { x: 5, y: 3 }    // km 5 -- a ~6px de km 1, se descarta
        ];

        expect(declutterMarkers(points, 20)).toEqual([0, 1]);

    });

    it("nunca deja dos puntos retenidos por debajo de la distancia mínima", () => {

        const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 19, y: 0 }, { x: 50, y: 0 }];
        const kept = declutterMarkers(points, 20).map(i => points[i]);

        for (let i = 0; i < kept.length; i++) {
            for (let j = i + 1; j < kept.length; j++) {
                const dist = Math.hypot(kept[i].x - kept[j].x, kept[i].y - kept[j].y);
                expect(dist).toBeGreaterThanOrEqual(20);
            }
        }

    });

});

describe("hasRouteTrace", () => {

    it("false sin routeTrace ni con menos de 2 puntos", () => {

        expect(hasRouteTrace({})).toBe(false);
        expect(hasRouteTrace({ routeTrace: null })).toBe(false);
        expect(hasRouteTrace({ routeTrace: [{ lat: 1, lon: 1 }] })).toBe(false);

    });

    it("true con 2 o más puntos", () => {

        expect(hasRouteTrace({ routeTrace: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] })).toBe(true);

    });

});
