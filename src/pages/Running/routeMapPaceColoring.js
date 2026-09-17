// Coloreado del mapa por ritmo + marcas de km (Paso 2 del mapa GPS) --
// función pura (recibe routeTrace/splits/avgPaceRef ya resueltos, no toca
// workoutStore.js) para poder testear sin DOM ni Leaflet de por medio, mismo
// criterio que referenceRouteGeometry.js/referenceRouteEfficiency.js.
//
// No hace falta que routeTrace guarde distancia/ritmo por punto -- se
// recalcula la distancia acumulada aquí mismo, sumando haversine entre los
// propios puntos ya re-muestreados cada ~20m (geoTrace.js). El resultado es
// prácticamente idéntico a si se hubiera guardado en el import, así que no
// hace falta tocar gpx.js/tcx.js/geoTrace.js ni migrar nada: esto funciona
// igual con entrenos importados antes de que existiera este archivo.
import { haversineMeters } from "../../importers/geoTrace.js";

// Paleta propia del mapa, no la misma que .pace-chart-bar (RunningDetailView.css)
// -- el verde de ese gráfico (--color-success, #2ED573) se confunde con la
// vegetación de los tiles de terreno (Stadia/Stamen); este menta/teal se
// separa mejor del fondo mantenido dentro de la misma familia "verde =
// más rápido" (especificación de cierre del Paso 2).
export const ROUTE_COLOR_NORMAL = "#2EA8FF"; // = --color-primary
export const ROUTE_COLOR_FAST = "#1FE6B3";
export const ROUTE_COLOR_SLOW = "#FFB020"; // = --color-warning
export const ROUTE_COLOR_REST = "#7C8B9A"; // = --color-text-muted, opaco -- el
// 45% que usa .pace-chart-bar.is-rest es para una barra de fondo, sobre una
// línea de mapa quedaría casi invisible.

// Un km necesita ser al menos esto de rápido/lento que la media del propio
// entreno para que el mapa lo destaque -- la mitad de PACE_WINDOW_SEC
// (RunningDetailView.js) para no pintar de un color distinto cada km por
// simple variación normal de carrera.
const PACE_BAND_THRESHOLD_SEC = 20;

const KM_METERS = 1000;

// Distancia acumulada (metros) en cada punto de routeTrace -- distances[0]
// siempre 0.
export function cumulativeDistancesMeters(routeTrace) {

    const distances = [0];

    for (let i = 1; i < routeTrace.length; i++) {

        const prev = routeTrace[i - 1], curr = routeTrace[i];
        distances.push(distances[i - 1] + haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon));

    }

    return distances;

}

// Recuperación (Intervalos) siempre gris, nunca "lento" -- mismo criterio ya
// documentado en RunningDetailView.js: un tramo de descanso "más lento" no
// dice nada real sobre el esfuerzo.
function paceColorFor(split, avgPaceRef) {

    if (split.segmentType === "rest") return ROUTE_COLOR_REST;
    if (split.paceSecPerKm == null || avgPaceRef == null) return ROUTE_COLOR_NORMAL;

    if (split.paceSecPerKm <= avgPaceRef - PACE_BAND_THRESHOLD_SEC) return ROUTE_COLOR_FAST;
    if (split.paceSecPerKm >= avgPaceRef + PACE_BAND_THRESHOLD_SEC) return ROUTE_COLOR_SLOW;

    return ROUTE_COLOR_NORMAL;

}

// Límite de distancia acumulada (metros) de cada split, en su mismo orden --
// splits[i] cubre (limits[i-1], limits[i]] metros desde el inicio real.
function splitDistanceLimits(splits) {

    let cum = 0;
    return splits.map(s => (cum += (s.distanceKm ?? 0) * 1000));

}

function splitIndexForDistance(distanceM, limits) {

    for (let i = 0; i < limits.length; i++) {
        if (distanceM <= limits[i] + 0.001) return i;
    }

    // Más allá del último split "real" (el remanente que chartSplits() ya
    // descarta del gráfico, ver RunningDetailView.js) -- hereda el color del
    // último split real en vez de quedar sin colorear.
    return limits.length - 1;

}

// Agrupa puntos consecutivos de routeTrace por el color de su split -- cada
// vez que el color cambia entre dos puntos se corta el segmento ahí,
// repitiendo el punto de frontera en ambos lados para que no quede un hueco
// visual entre dos colores distintos.
export function buildPaceColorSegments(routeTrace, splits, avgPaceRef) {

    if (!splits.length) {
        return [{ latlngs: routeTrace.map(p => [p.lat, p.lon]), color: ROUTE_COLOR_NORMAL }];
    }

    const distances = cumulativeDistancesMeters(routeTrace);
    const limits = splitDistanceLimits(splits);
    const colorBySplit = splits.map(s => paceColorFor(s, avgPaceRef));

    const segments = [];
    let currentColor = null;
    let currentPoints = [];

    routeTrace.forEach((point, i) => {

        const splitIndex = splitIndexForDistance(distances[i], limits);
        const color = colorBySplit[splitIndex] ?? ROUTE_COLOR_NORMAL;

        if (color !== currentColor) {

            if (currentPoints.length >= 2) segments.push({ latlngs: currentPoints, color: currentColor });

            currentPoints = currentPoints.length ? [currentPoints[currentPoints.length - 1]] : [];
            currentColor = color;

        }

        currentPoints.push([point.lat, point.lon]);

    });

    if (currentPoints.length >= 2) segments.push({ latlngs: currentPoints, color: currentColor });

    return segments;

}

// Un marcador por cada km completo (1, 2, 3...) -- nunca por el tramo final
// parcial. Interpola entre los dos puntos de routeTrace que rodean esa
// distancia exacta (mismo criterio que buildRouteTrace en geoTrace.js),
// en vez de "saltar" al punto de muestreo más cercano (~20m de error).
export function buildKmMarkers(routeTrace) {

    const distances = cumulativeDistancesMeters(routeTrace);
    const total = distances[distances.length - 1];
    const markers = [];

    for (let km = 1; km * KM_METERS <= total; km++) {

        const target = km * KM_METERS;
        let i = distances.findIndex(d => d >= target);
        if (i <= 0) i = 1;

        const prevDist = distances[i - 1], currDist = distances[i];
        const ratio = currDist > prevDist ? (target - prevDist) / (currDist - prevDist) : 0;
        const prev = routeTrace[i - 1], curr = routeTrace[i];

        markers.push({
            km,
            lat: prev.lat + (curr.lat - prev.lat) * ratio,
            lon: prev.lon + (curr.lon - prev.lon) * ratio
        });

    }

    return markers;

}
