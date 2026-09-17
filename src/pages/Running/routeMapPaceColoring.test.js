import { describe, it, expect } from "vitest";
import {
    cumulativeDistancesMeters,
    buildKmMarkers,
    buildDirectionArrows,
    buildPaceColorSegments,
    ROUTE_COLOR_NORMAL,
    ROUTE_COLOR_FAST,
    ROUTE_COLOR_SLOW,
    ROUTE_COLOR_REST
} from "./routeMapPaceColoring.js";

// Metros por grado de latitud que usa la propia fórmula haversine de
// geoTrace.js (R=6371000, arco = R * ángulo en radianes) -- antes era una
// aproximación suelta (111320) que no coincidía exactamente con lo que
// cumulativeDistancesMeters() recalcula, y esa diferencia (~0,1%) bastaba
// para que un total "de 2000m" generado aquí resultase en ~1997m reales al
// recalcularlo -- suficiente para perder un marcador de km entero justo en
// el límite (bug de la propia fixture, no del código real, pero rompía
// tests que pedían un total exacto).
const METERS_PER_DEGREE_LAT = (Math.PI / 180) * 6371000;

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

    it("sin splits, cada marcador sale sin ritmo/FC (nunca un dato inventado)", () => {

        const trace = straightTrace(2000);
        const markers = buildKmMarkers(trace);

        expect(markers.every(m => m.paceSecPerKm === null && m.avgHr === null)).toBe(true);

    });

    it("con splits, cada marcador trae el ritmo/FC de SU propio km (splits[km-1]) -- mismo dato que el gráfico de abajo", () => {

        const trace = straightTrace(2000);
        const splits = [
            { lap: 1, distanceKm: 1, paceSecPerKm: 340, avgHr: 145 },
            { lap: 2, distanceKm: 1, paceSecPerKm: 355, avgHr: 150 }
        ];

        const markers = buildKmMarkers(trace, splits);

        expect(markers[0]).toMatchObject({ km: 1, paceSecPerKm: 340, avgHr: 145 });
        expect(markers[1]).toMatchObject({ km: 2, paceSecPerKm: 355, avgHr: 150 });

    });

    it("un split sin FC deja avgHr en null, sin inventar un valor", () => {

        const trace = straightTrace(1200); // no 1000 exactos, ver nota más arriba
        const splits = [{ lap: 1, distanceKm: 1, paceSecPerKm: 340 }];

        const [marker] = buildKmMarkers(trace, splits);

        expect(marker.paceSecPerKm).toBe(340);
        expect(marker.avgHr).toBeNull();

    });

    it("no coloca ningún marcador si el recorrido no llega a 1km", () => {

        const trace = straightTrace(800);
        expect(buildKmMarkers(trace)).toEqual([]);

    });

});

describe("buildDirectionArrows", () => {

    it("coloca una flecha cada ~1000m, desfasada de las marcas de km", () => {

        const trace = straightTrace(2000);
        const arrows = buildDirectionArrows(trace);

        // 2 flechas esperadas: ~500m, ~1500m.
        expect(arrows).toHaveLength(2);

    });

    it("cada flecha trae dirA/dirB para poder calcular su ángulo real en RouteMap.js", () => {

        const trace = straightTrace(2000);
        const [arrow] = buildDirectionArrows(trace);

        expect(arrow.dirA).toHaveProperty("lat");
        expect(arrow.dirB).toHaveProperty("lat");
        expect(arrow.dirA).not.toEqual(arrow.dirB);

    });

    it("sin recorrido suficiente para ni una sola flecha, devuelve un array vacío", () => {

        const trace = straightTrace(200);
        expect(buildDirectionArrows(trace)).toEqual([]);

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

// Caso real reportado: un entreno de ida y vuelta que NO retrocede por el
// mismo camino de principio a fin -- va hacia el sur, da la vuelta, vuelve
// hacia el norte pasando otra vez muy cerca del punto de inicio (~6km) y
// CONTINÚA desde ahí por un camino distinto hasta la meta real (~8km). El
// marcador de km6 cae entonces, correctamente, casi encima del punto de
// inicio -- no es un bug de orden, es la consecuencia física normal de una
// ruta que se cruza consigo misma. Se verifica aquí que buildKmMarkers()
// numera siempre en el orden CRONOLÓGICO real de la traza (nunca reordena
// por cercanía geográfica) construyendo ese mismo patrón con coordenadas
// controladas.
describe("orden cronológico en recorridos que pasan cerca de sí mismos", () => {

    it("una ruta de ida y vuelta + tramo final por otro camino numera en orden temporal, no por proximidad geográfica", () => {

        const METERS_PER_DEGREE = (Math.PI / 180) * 6371000;
        const START = { lat: 37.60, lon: -1.73 };

        const trace = [];

        // 1) Hacia el sur, 3000m (aleja del inicio).
        for (let d = 0; d <= 3000; d += 20) {
            trace.push({ lat: START.lat - d / METERS_PER_DEGREE, lon: START.lon });
        }

        const turnaround = trace[trace.length - 1];

        // 2) De vuelta hacia el norte, otros 3000m -- MISMO camino que 1),
        // así que al llegar aquí (km real ~6) se está otra vez justo donde
        // empezó el entreno.
        for (let d = 20; d <= 3000; d += 20) {
            trace.push({ lat: turnaround.lat + d / METERS_PER_DEGREE, lon: START.lon });
        }

        // 3) Desde el punto de inicio, tramo final de 2000m por un camino
        // DISTINTO (hacia el este) hasta la meta real.
        const backAtStart = trace[trace.length - 1];
        for (let d = 20; d <= 2000; d += 20) {
            trace.push({ lat: backAtStart.lat, lon: backAtStart.lon + d / METERS_PER_DEGREE });
        }

        const markers = buildKmMarkers(trace);
        expect(markers.map(m => m.km)).toEqual([1, 2, 3, 4, 5, 6, 7]);

        const km6 = markers.find(m => m.km === 6);
        const km3 = markers.find(m => m.km === 3);
        const km7 = markers.find(m => m.km === 7);

        // km6 (vuelta pasando de nuevo por el inicio) cae físicamente junto
        // al punto de partida -- a menos de 50m, muchísimo más cerca que del
        // punto de giro (km3) o del tramo final (km7), que están en
        // direcciones opuestas.
        const distTo = (a, b) => Math.hypot((a.lat - b.lat) * METERS_PER_DEGREE, (a.lon - b.lon) * METERS_PER_DEGREE);

        expect(distTo(km6, START)).toBeLessThan(50);
        expect(distTo(km6, START)).toBeLessThan(distTo(km3, START));
        expect(distTo(km6, START)).toBeLessThan(distTo(km7, START));

        // Pese a estar geográficamente pegado al inicio, km6 NO es el
        // primero cronológicamente -- km3 (el punto más lejano, el giro) y
        // km7 (ya en el tramo final, hacia el este) deben seguir en su
        // propio orden numérico real.
        expect(km3.lon).toBeCloseTo(START.lon, 5); // el giro está al sur, misma longitud
        expect(km7.lon).toBeGreaterThan(START.lon); // el tramo final se desvía hacia el este

    });

});
