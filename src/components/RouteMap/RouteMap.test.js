import { describe, it, expect } from "vitest";
import { resolveMarkerOffsets, hasRouteTrace } from "./RouteMap.js";

describe("resolveMarkerOffsets", () => {

    it("no desplaza nada si todos los puntos están lejos entre sí", () => {

        const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];
        const directions = points.map(() => ({ x: 1, y: 0 }));

        const offsets = resolveMarkerOffsets(points, directions, 20);

        expect(offsets).toEqual([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);

    });

    it("desplaza dos puntos casi encima en lados opuestos de la línea, ninguno se oculta", () => {

        // Simula km 1 y km 5 casi encima en el mapa (recorrido con giro),
        // avanzando en horizontal -- la perpendicular es vertical (0,1).
        const points = [{ x: 0, y: 0 }, { x: 2, y: 1 }];
        const directions = [{ x: 0, y: 1 }, { x: 0, y: 1 }];

        const offsets = resolveMarkerOffsets(points, directions, 20);

        // Ambos se mueven (ninguno se queda en 0,0) y en direcciones
        // opuestas a lo largo del mismo eje perpendicular.
        expect(offsets[0]).not.toEqual({ x: 0, y: 0 });
        expect(offsets[1]).not.toEqual({ x: 0, y: 0 });
        expect(offsets[0].y).toBe(-offsets[1].y);

    });

    it("tras desplazar, las posiciones finales quedan separadas al menos spacingPx", () => {

        const points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
        const directions = points.map(() => ({ x: 0, y: 1 }));
        const spacing = 20;

        const offsets = resolveMarkerOffsets(points, directions, spacing);
        const finalPositions = points.map((p, i) => ({ x: p.x + offsets[i].x, y: p.y + offsets[i].y }));

        for (let i = 0; i < finalPositions.length; i++) {
            for (let j = i + 1; j < finalPositions.length; j++) {

                const dist = Math.hypot(
                    finalPositions[i].x - finalPositions[j].x,
                    finalPositions[i].y - finalPositions[j].y
                );

                expect(dist).toBeGreaterThanOrEqual(spacing - 0.001);

            }
        }

    });

    it("agrupa transitivamente 3 puntos encadenados en un único grupo apilado", () => {

        // A cerca de B, B cerca de C, pero A y C no están cerca directamente
        // entre sí -- deben entrar igualmente en el mismo grupo de 3.
        const points = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }];
        const directions = points.map(() => ({ x: 0, y: 1 }));

        const offsets = resolveMarkerOffsets(points, directions, 20);

        // El del medio (rank central) no se desplaza; los de los extremos
        // del grupo sí, en sentidos opuestos.
        expect(offsets[1]).toEqual({ x: 0, y: 0 });
        expect(offsets[0].y).toBe(-offsets[2].y);
        expect(offsets[0].y).not.toBe(0);

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
