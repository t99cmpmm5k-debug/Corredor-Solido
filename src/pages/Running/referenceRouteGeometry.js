// Detección automática de recorridos parecidos (Running / Recorridos de
// referencia) -- función pura (recibe workouts/ids/claves ya resueltos, no
// importa workoutStore.js ni referenceRouteStore.js aquí) para poder
// testear sin IndexedDB de por medio, mismo criterio que
// referenceRouteEfficiency.js.
//
// Método elegido tras investigar Fréchet discreta (librerías `frechet` y
// `curve-matcher`, ambas sin publicar desde hace años, y curve-matcher
// además normaliza escala/rotación con Procrustes -- pensado para
// reconocer FORMAS parecidas en cualquier sitio, justo lo contrario de lo
// que hace falta aquí): en su lugar, cobertura de proximidad bidireccional
// sobre la traza re-muestreada (ver geoTrace.js). Fréchet discreta es una
// métrica de PEOR CASO -- un solo tramo donde las rutas se separan (un
// atajo, una vuelta que un día no se dio) dispara el valor aunque el resto
// coincida, y con trazas de miles de puntos sin re-muestrear antes es
// además una DP demasiado cara para el navegador. La cobertura de
// proximidad solo penaliza la porción concreta que diverge.
import { haversineMeters } from "../../importers/geoTrace.js";

// Radio del "corredor" alrededor de cada punto de la otra traza -- cubre
// error GPS típico bajo cielo cubierto/urbano sin llegar a confundir calles
// paralelas de una manzana. PENDIENTE DE VERIFICAR: punto de partida sin
// datos reales todavía (no hay dos GPX de una repetición real del mismo
// recorrido) -- se revisa y ajusta en cuanto exista, mismo criterio que
// FC_SIMILAR_THRESHOLD_PPM (ver referenceRouteEfficiency.js).
export const ROUTE_MATCH_TOLERANCE_METERS = 40;

// Cobertura bidireccional mínima para considerar "mismo recorrido" -- se
// usa min(A cubierta por B, B cubierta por A), no la media, para que una
// tirada larga no "contenga" una corta y las marque como el mismo
// recorrido solo porque la corta queda 100% cubierta dentro de la larga.
// PENDIENTE DE VERIFICAR, mismo motivo que el umbral de arriba.
export const ROUTE_SIMILARITY_THRESHOLD = 0.85;

// Prefiltro barato antes de comparar geometría punto a punto -- evita un
// escaneo con coste de trazado completo (cientos de puntos por lado) sobre
// pares que son obviamente de sitios distintos. Dos grabaciones del mismo
// recorrido real empiezan prácticamente en el mismo sitio (mismo portal,
// mismo parking) y recorren una distancia total parecida.
export const ROUTE_CANDIDATE_START_RADIUS_METERS = 500;
export const ROUTE_CANDIDATE_DISTANCE_RATIO_TOLERANCE = 0.3;

function nearestDistanceMeters(point, trace) {

    let min = Infinity;

    for (const p of trace) {
        const d = haversineMeters(point.lat, point.lon, p.lat, p.lon);
        if (d < min) min = d;
    }

    return min;

}

function coverageOf(traceA, traceB, toleranceMeters) {

    if (!traceA.length) return 0;

    const covered = traceA.filter(p => nearestDistanceMeters(p, traceB) <= toleranceMeters).length;
    return covered / traceA.length;

}

export function computeRouteCoverage(traceA, traceB, toleranceMeters = ROUTE_MATCH_TOLERANCE_METERS) {

    const aCoveredByB = coverageOf(traceA, traceB, toleranceMeters);
    const bCoveredByA = coverageOf(traceB, traceA, toleranceMeters);

    return { aCoveredByB, bCoveredByA, similarity: Math.min(aCoveredByB, bCoveredByA) };

}

export function areRoutesSimilar(traceA, traceB) {

    if (!traceA?.length || !traceB?.length) return false;
    return computeRouteCoverage(traceA, traceB).similarity >= ROUTE_SIMILARITY_THRESHOLD;

}

// Prefiltro por punto de inicio + distancia total, usando datos que cada
// workout ya trae (startLat/startLon/distanceKm) sin tocar routeTrace --
// barato de sobra para descartar la inmensa mayoría de pares antes de la
// comparación de geometría completa.
export function isPlausibleCandidatePair(workoutA, workoutB) {

    if (workoutA.startLat == null || workoutA.startLon == null) return false;
    if (workoutB.startLat == null || workoutB.startLon == null) return false;
    if (workoutA.distanceKm == null || workoutB.distanceKm == null) return false;
    if (!workoutA.distanceKm || !workoutB.distanceKm) return false;

    const startDistance = haversineMeters(workoutA.startLat, workoutA.startLon, workoutB.startLat, workoutB.startLon);
    if (startDistance > ROUTE_CANDIDATE_START_RADIUS_METERS) return false;

    const ratio = workoutA.distanceKm / workoutB.distanceKm;
    return Math.abs(ratio - 1) <= ROUTE_CANDIDATE_DISTANCE_RATIO_TOLERANCE;

}

// Sugerencias de agrupación: solo entre entrenos con traza real
// (GPX/TCX con GPS -- ver routeTrace en gpx.js/tcx.js; el OCR de Garmin
// nunca la trae y queda fuera aquí sin ningún caso especial) que HOY no
// estén ya agrupados en ningún recorrido de referencia (`groupedWorkoutIds`,
// resuelto por quien llame a partir de referenceRouteStore.js) y cuyo par
// no se haya descartado antes (`dismissedPairKeys`, de routeSuggestionStore.js).
//
// `excludedWorkoutIds` (opcional): entrenos sueltos que ya tienen una
// sugerencia "Añadir a recorrido existente" (findExistingRouteMatches) --
// no se proponen además como par nuevo, para no enseñar dos tarjetas
// contradictorias ("crea uno nuevo" y "únelo a X") para el mismo entreno.
export function findRouteSuggestions(workouts, groupedWorkoutIds, dismissedPairKeys, pairKeyFn, excludedWorkoutIds = new Set()) {

    const candidates = workouts.filter(w => w.routeTrace?.length >= 2 && !groupedWorkoutIds.has(w.id) && !excludedWorkoutIds.has(w.id));
    const suggestions = [];

    for (let i = 0; i < candidates.length; i++) {

        for (let j = i + 1; j < candidates.length; j++) {

            const workoutA = candidates[i], workoutB = candidates[j];

            if (dismissedPairKeys.has(pairKeyFn(workoutA.id, workoutB.id))) continue;
            if (!isPlausibleCandidatePair(workoutA, workoutB)) continue;
            if (!areRoutesSimilar(workoutA.routeTrace, workoutB.routeTrace)) continue;

            suggestions.push({ workoutA, workoutB });

        }

    }

    return suggestions;

}

// Clave de descarte de una sugerencia "entreno -> recorrido existente" --
// reutiliza la misma store de descartes por par (routeSuggestionStore.js)
// con el recorrido como segundo miembro del par; el prefijo evita cualquier
// choque con un id de entreno real.
export function existingRouteMatchPartnerId(routeId) {

    return `route:${routeId}`;

}

// Bug real (2026-09-23): findRouteSuggestions() solo compara entrenos
// sueltos ENTRE SÍ -- un entreno nuevo de un recorrido que ya existía como
// recorrido de referencia nunca podía detectarse, porque todos sus
// entrenos anteriores ya estaban agrupados y quedaban fuera de la
// comparación. Aquí se compara cada entreno suelto contra los entrenos ya
// asociados a cada recorrido existente, con exactamente los mismos filtros
// (isPlausibleCandidatePair + areRoutesSimilar) -- basta con que encaje con
// UNO de ellos. Si encaja con varios recorridos, se queda el de mayor
// similitud (un entreno solo puede pertenecer a uno).
export function findExistingRouteMatches(workouts, routes, dismissedPairKeys, pairKeyFn) {

    const byId = new Map(workouts.map(w => [w.id, w]));
    const groupedWorkoutIds = new Set(routes.flatMap(r => r.workoutIds));

    const routeMembers = routes.map(route => ({
        route,
        members: route.workoutIds.map(id => byId.get(id)).filter(w => w?.routeTrace?.length >= 2)
    })).filter(r => r.members.length);

    const matches = [];

    workouts
        .filter(w => w.routeTrace?.length >= 2 && !groupedWorkoutIds.has(w.id))
        .forEach(workout => {

            let best = null;

            routeMembers.forEach(({ route, members }) => {

                if (dismissedPairKeys.has(pairKeyFn(workout.id, existingRouteMatchPartnerId(route.id)))) return;

                members.forEach(member => {

                    if (!isPlausibleCandidatePair(workout, member)) return;

                    const { similarity } = computeRouteCoverage(workout.routeTrace, member.routeTrace);
                    if (similarity < ROUTE_SIMILARITY_THRESHOLD) return;

                    if (!best || similarity > best.similarity) best = { workout, route, matchedWorkout: member, similarity };

                });

            });

            if (best) matches.push(best);

        });

    return matches;

}
