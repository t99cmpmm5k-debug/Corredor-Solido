import { describe, it, expect } from "vitest";
import { mergeOverlappingKmMarkers, hasRouteTrace } from "./RouteMap.js";

function marker(km, overrides) {
    return { km, lat: km, lon: 0, paceSecPerKm: 300, avgHr: 150, ...overrides };
}

describe("mergeOverlappingKmMarkers", () => {

    it("sin ningún par cerca en pantalla, cada km sale como su propio grupo, en su posición real", () => {

        const markers = [marker(1), marker(2), marker(3)];
        const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];

        const groups = mergeOverlappingKmMarkers(markers, points, 20);

        expect(groups).toHaveLength(3);
        expect(groups.map(g => g.label)).toEqual(["1", "2", "3"]);
        // Posición geométrica real de cada uno, SIN ningún desplazamiento.
        expect(groups[0]).toMatchObject({ lat: 1, lon: 0 });
        expect(groups[1]).toMatchObject({ lat: 2, lon: 0 });

    });

    it("dos marcas casi encima en pantalla (km 1 y km 5, recorrido con giro) se funden en un único grupo, sin mover ninguna de su sitio", () => {

        const markers = [marker(1), marker(5)];
        const points = [{ x: 0, y: 0 }, { x: 2, y: 1 }]; // a 2.24px, por debajo de spacing=20

        const groups = mergeOverlappingKmMarkers(markers, points, 20);

        expect(groups).toHaveLength(1);
        expect(groups[0].label).toBe("1·5");
        // En la posición real del PRIMERO cronológicamente (km 1) -- nunca
        // un punto medio inventado ni un desplazamiento lateral.
        expect(groups[0].lat).toBe(1);
        expect(groups[0].lon).toBe(0);
        // Ninguno de los dos kilómetros se pierde -- ambos siguen
        // consultables en el popup.
        expect(groups[0].entries.map(e => e.km)).toEqual([1, 5]);

    });

    it("agrupa transitivamente 3 puntos encadenados en un único grupo fusionado", () => {

        // A cerca de B, B cerca de C, pero A y C no están cerca directamente
        // entre sí -- deben entrar igualmente en el mismo grupo de 3.
        const markers = [marker(1), marker(2), marker(3)];
        const points = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }];

        const groups = mergeOverlappingKmMarkers(markers, points, 20);

        expect(groups).toHaveLength(1);
        expect(groups[0].label).toBe("1·2·3");
        expect(groups[0].entries.map(e => e.km)).toEqual([1, 2, 3]);

    });

    it("cada entrada del grupo conserva su propio ritmo/FC real -- nunca se promedian ni se pierden", () => {

        const markers = [marker(1, { paceSecPerKm: 300, avgHr: 145 }), marker(5, { paceSecPerKm: 320, avgHr: null })];
        const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

        const [group] = mergeOverlappingKmMarkers(markers, points, 20);

        expect(group.entries).toEqual([
            { km: 1, paceSecPerKm: 300, avgHr: 145 },
            { km: 5, paceSecPerKm: 320, avgHr: null }
        ]);

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
