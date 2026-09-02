import { describe, it, expect } from "vitest";
import {
    computeRouteCoverage,
    areRoutesSimilar,
    isPlausibleCandidatePair,
    findRouteSuggestions,
    ROUTE_MATCH_TOLERANCE_METERS,
    ROUTE_SIMILARITY_THRESHOLD
} from "./referenceRouteGeometry.js";

// Trazas sintéticas hechas a mano (una recta de puntos separados ~11m en
// latitud, mismo orden de magnitud que ROUTE_TRACE_STEP_METERS de
// geoTrace.js) -- NO son una repetición real del mismo recorrido, solo una
// aproximación geométrica para poder testear la función sin depender de
// IndexedDB/archivos reales. El caso "mismo recorrido -> sí debe agrupar"
// queda PENDIENTE de verificar con un GPX real repetido (ver memoria del
// proyecto) -- estos tests NO sustituyen esa verificación, solo comprueban
// que la lógica de cobertura hace lo que se espera sobre datos de juguete.
function straightTrace(startLat, startLon, count, stepDeg, lonJitterDeg = 0) {

    return Array.from({ length: count }, (_, i) => ({
        lat: startLat + i * stepDeg,
        lon: startLon + (i % 2 === 0 ? lonJitterDeg : -lonJitterDeg)
    }));

}

describe("computeRouteCoverage / areRoutesSimilar", () => {

    it("dos trazas idénticas tienen cobertura 100% en ambos sentidos", () => {

        const trace = straightTrace(37.5800, -1.7300, 50, 0.0001);

        const coverage = computeRouteCoverage(trace, trace);
        expect(coverage.aCoveredByB).toBe(1);
        expect(coverage.bCoveredByA).toBe(1);
        expect(areRoutesSimilar(trace, trace)).toBe(true);

    });

    // PENDIENTE DE VERIFICAR CON GPX REAL (ver referenceRouteGeometry.js y
    // la memoria del proyecto): esto es una réplica sintética con ruido de
    // ~5-8m añadido a cada punto -- simula el tipo de variación GPS que se
    // espera entre dos pasadas reales por el mismo sitio, pero NO es una
    // confirmación real de que el umbral elegido funcione con datos reales.
    it("dos trazas del mismo recorrido con pequeño ruido GPS (~5-8m) siguen siendo similares", () => {

        const base = straightTrace(37.5800, -1.7300, 60, 0.0001);
        const noisy = base.map((p, i) => ({
            lat: p.lat + (i % 3 === 0 ? 0.00005 : -0.00003),
            lon: p.lon + (i % 4 === 0 ? 0.00004 : -0.00002)
        }));

        expect(areRoutesSimilar(base, noisy)).toBe(true);

    });

    it("dos trazas de recorridos claramente distintos (paralelas, separadas ~200m) NO son similares", () => {

        const routeA = straightTrace(37.5800, -1.7300, 50, 0.0001);
        // ~0.0018° de longitud a esta latitud son unos 160m -- muy por
        // encima de ROUTE_MATCH_TOLERANCE_METERS.
        const routeB = straightTrace(37.5800, -1.7100, 50, 0.0001);

        expect(areRoutesSimilar(routeA, routeB)).toBe(false);

    });

    it("una traza corta 100% contenida en una larga NO pasa el umbral (min(), no media)", () => {

        const longRoute = straightTrace(37.5800, -1.7300, 200, 0.0001);
        const shortRoute = longRoute.slice(0, 20);

        const coverage = computeRouteCoverage(shortRoute, longRoute);
        expect(coverage.aCoveredByB).toBe(1);
        expect(coverage.bCoveredByA).toBeLessThan(ROUTE_SIMILARITY_THRESHOLD);
        expect(areRoutesSimilar(shortRoute, longRoute)).toBe(false);

    });

    it("respeta el umbral de tolerancia -- justo dentro y justo fuera de ROUTE_MATCH_TOLERANCE_METERS", () => {

        const a = [{ lat: 37.5800, lon: -1.7300 }];

        // ~0.0001° de longitud a esta latitud son ~8.8m -- dentro del
        // radio por defecto (40m).
        const insideTolerance = [{ lat: 37.5800, lon: -1.7301 }];
        expect(computeRouteCoverage(a, insideTolerance).similarity).toBe(1);

        // ~0.0009° ≈ 80m -- fuera del radio por defecto.
        const outsideTolerance = [{ lat: 37.5800, lon: -1.7309 }];
        expect(computeRouteCoverage(a, outsideTolerance).similarity).toBe(0);

    });

});

describe("isPlausibleCandidatePair", () => {

    function workout({ startLat = 37.58, startLon = -1.73, distanceKm = 10 } = {}) {
        return { startLat, startLon, distanceKm };
    }

    it("dos entrenos con inicio y distancia parecidos son candidatos plausibles", () => {
        expect(isPlausibleCandidatePair(workout(), workout({ distanceKm: 10.3 }))).toBe(true);
    });

    it("descarta el par si el punto de inicio está muy lejos", () => {
        expect(isPlausibleCandidatePair(workout(), workout({ startLat: 37.60 }))).toBe(false);
    });

    it("descarta el par si la distancia total es muy distinta", () => {
        expect(isPlausibleCandidatePair(workout(), workout({ distanceKm: 20 }))).toBe(false);
    });

    it("descarta el par si falta GPS o distancia en cualquiera de los dos", () => {
        expect(isPlausibleCandidatePair(workout({ startLat: null }), workout())).toBe(false);
        expect(isPlausibleCandidatePair(workout(), workout({ distanceKm: null }))).toBe(false);
    });

});

describe("findRouteSuggestions", () => {

    function workoutWithTrace(id, trace, overrides = {}) {
        return {
            id,
            startLat: trace[0].lat,
            startLon: trace[0].lon,
            distanceKm: 10,
            routeTrace: trace,
            ...overrides
        };
    }

    const pairKeyFn = (a, b) => [a, b].sort().join("::");

    it("sugiere un par de entrenos parecidos y ninguno ya agrupado", () => {

        const trace = straightTrace(37.5800, -1.7300, 60, 0.0001);
        const a = workoutWithTrace("w1", trace);
        const b = workoutWithTrace("w2", trace);

        const suggestions = findRouteSuggestions([a, b], new Set(), new Set(), pairKeyFn);

        expect(suggestions).toHaveLength(1);
        expect([suggestions[0].workoutA.id, suggestions[0].workoutB.id].sort()).toEqual(["w1", "w2"]);

    });

    it("no sugiere nada si uno de los dos ya está agrupado en un recorrido", () => {

        const trace = straightTrace(37.5800, -1.7300, 60, 0.0001);
        const a = workoutWithTrace("w1", trace);
        const b = workoutWithTrace("w2", trace);

        const suggestions = findRouteSuggestions([a, b], new Set(["w1"]), new Set(), pairKeyFn);

        expect(suggestions).toHaveLength(0);

    });

    it("no repite un par ya descartado por el usuario", () => {

        const trace = straightTrace(37.5800, -1.7300, 60, 0.0001);
        const a = workoutWithTrace("w1", trace);
        const b = workoutWithTrace("w2", trace);

        const dismissed = new Set([pairKeyFn("w1", "w2")]);
        const suggestions = findRouteSuggestions([a, b], new Set(), dismissed, pairKeyFn);

        expect(suggestions).toHaveLength(0);

    });

    it("no sugiere entrenos sin traza (OCR, o TCX/GPX sin GPS)", () => {

        const trace = straightTrace(37.5800, -1.7300, 60, 0.0001);
        const a = workoutWithTrace("w1", trace);
        const ocrWorkout = { id: "w2", startLat: null, startLon: null, distanceKm: 10, routeTrace: null };

        const suggestions = findRouteSuggestions([a, ocrWorkout], new Set(), new Set(), pairKeyFn);

        expect(suggestions).toHaveLength(0);

    });

    it("no sugiere recorridos distintos aunque ninguno esté agrupado ni descartado", () => {

        const routeA = straightTrace(37.5800, -1.7300, 50, 0.0001);
        const routeB = straightTrace(37.5800, -1.7100, 50, 0.0001);

        const a = workoutWithTrace("w1", routeA);
        const b = workoutWithTrace("w2", routeB);

        const suggestions = findRouteSuggestions([a, b], new Set(), new Set(), pairKeyFn);

        expect(suggestions).toHaveLength(0);

    });

});
