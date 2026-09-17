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

    it("agrupa transitivamente 3 puntos encadenados en un único grupo, alternando de lado", () => {

        // A cerca de B, B cerca de C, pero A y C no están cerca directamente
        // entre sí -- deben entrar igualmente en el mismo grupo de 3.
        const points = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }];
        const directions = points.map(() => ({ x: 0, y: 1 }));

        const offsets = resolveMarkerOffsets(points, directions, 20);

        // Los 3 se desplazan (ninguno se queda quieto); A y C (rank par)
        // van al mismo lado, B (rank impar) al opuesto.
        expect(offsets[0].y).not.toBe(0);
        expect(offsets[1].y).not.toBe(0);
        expect(offsets[2].y).not.toBe(0);
        expect(Math.sign(offsets[0].y)).toBe(Math.sign(offsets[2].y));
        expect(Math.sign(offsets[1].y)).toBe(-Math.sign(offsets[0].y));

    });

    it("cada marcador usa SU PROPIA dirección local, no la de otro miembro del grupo -- caso real de ida y vuelta por la misma zona", () => {

        // km 1 (yendo) y km 4 (volviendo) casi encima en pantalla, pero el
        // recorrido va en sentidos opuestos en cada uno -- la perpendicular
        // real de cada punto también es opuesta. Con un eje compartido
        // (el algoritmo anterior) ambos se habrían desplazado a lo largo del
        // eje de km 1, ignorando el rumbo real bajo km 4.
        const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
        const directions = [{ x: 0, y: 1 }, { x: 0, y: -1 }];

        const offsets = resolveMarkerOffsets(points, directions, 20);

        // km 1 se desplaza sobre SU propio eje (0,1); km 4 sobre el suyo
        // (0,-1) -- nunca el prestado del otro miembro del grupo.
        expect(offsets[0].x).toBeCloseTo(0);
        expect(offsets[1].x).toBeCloseTo(0);
        expect(offsets[0].y).not.toBe(0);
        expect(offsets[1].y).not.toBe(0);

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
