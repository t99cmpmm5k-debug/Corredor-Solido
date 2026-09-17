// Coloreado del mapa por ritmo + marcas de km (Paso 2 del mapa GPS) --
// función pura (recibe routeTrace/splits ya resueltos, no toca
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
// separa mejor del fondo, dentro de la misma familia "verde = más rápido"
// (especificación de cierre del Paso 2). Mismo orden semántico que ya usa
// .pace-chart-bar (verde=rápido, naranja=lento) -- deliberadamente NO el de
// apps de referencia tipo Strava (azul=lento, rojo=rápido), para no
// contradecir al propio gráfico de esta misma pantalla.
export const ROUTE_COLOR_NORMAL = "#2EA8FF"; // = --color-primary
export const ROUTE_COLOR_FAST = "#1FE6B3";
export const ROUTE_COLOR_SLOW = "#FFB020"; // = --color-warning
export const ROUTE_COLOR_REST = "#7C8B9A"; // = --color-text-muted, opaco -- el
// 45% que usa .pace-chart-bar.is-rest es para una barra de fondo, sobre una
// línea de mapa quedaría casi invisible.

// Por debajo de esto, la diferencia entre el km más rápido y el más lento
// del propio entreno es ruido/variación normal de carrera, no algo real que
// destacar -- sin este suelo, un entreno muy uniforme (todos los km a 2-3s
// de diferencia) se pintaría igual de "extremo" (verde/naranja a tope) que
// uno con variación real, exagerando una diferencia insignificante.
const MIN_PACE_RANGE_SEC = 20;

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

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixColor(hexA, hexB, ratio) {

    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const r = Math.round(a.r + (b.r - a.r) * ratio);
    const g = Math.round(a.g + (b.g - a.g) * ratio);
    const bl = Math.round(a.b + (b.b - a.b) * ratio);

    return `rgb(${r}, ${g}, ${bl})`;

}

// Rango real de ritmo de ESTE entreno (excluyendo Recuperación, que no
// compite por ser "el más rápido/lento" -- mismo criterio que averagePace()
// en RunningDetailView.js: un tramo de descanso no dice nada del esfuerzo).
function paceRange(splits) {

    const values = splits
        .filter(s => s.segmentType !== "rest" && s.paceSecPerKm != null)
        .map(s => s.paceSecPerKm);

    if (!values.length) return null;

    return { fastest: Math.min(...values), slowest: Math.max(...values) };

}

// Degradado continuo anclado al km más rápido y más lento DE ESTE MISMO
// ENTRENO (no un umbral fijo sobre una media) -- verificado con datos
// reales que un umbral fijo (±20s sobre la media) podía dejar el mapa casi
// entero en el color neutro si la variación real era más sutil que eso,
// aunque hubiera un km claramente más rápido y otro claramente más lento
// dentro de ESE entreno concreto. Anclar a fastest/slowest reales garantiza
// que, si hay variación real, siempre se vea el espectro completo -- igual
// que hace la referencia visual de Garmin/Strava.
function paceColorFor(split, range) {

    if (split.segmentType === "rest") return ROUTE_COLOR_REST;
    if (split.paceSecPerKm == null || !range) return ROUTE_COLOR_NORMAL;

    const { fastest, slowest } = range;
    if (slowest - fastest < MIN_PACE_RANGE_SEC) return ROUTE_COLOR_NORMAL;

    // t: 0 = el km más rápido de este entreno, 1 = el más lento. Los
    // extremos exactos (el propio split más rápido/lento) devuelven la
    // constante literal, no un mixColor(..., 0)/mixColor(..., 1) -- da el
    // mismo color numérico, pero como string "rgb(r, g, b)" en vez del hex
    // original, lo que rompería una comparación estricta contra
    // ROUTE_COLOR_FAST/SLOW en cualquier código que la haga (ver tests).
    const t = (split.paceSecPerKm - fastest) / (slowest - fastest);

    if (t <= 0) return ROUTE_COLOR_FAST;
    if (t >= 1) return ROUTE_COLOR_SLOW;
    if (t === 0.5) return ROUTE_COLOR_NORMAL;

    return t < 0.5
        ? mixColor(ROUTE_COLOR_FAST, ROUTE_COLOR_NORMAL, t / 0.5)
        : mixColor(ROUTE_COLOR_NORMAL, ROUTE_COLOR_SLOW, (t - 0.5) / 0.5);

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
export function buildPaceColorSegments(routeTrace, splits) {

    if (!splits.length) {
        return [{ latlngs: routeTrace.map(p => [p.lat, p.lon]), color: ROUTE_COLOR_NORMAL }];
    }

    const range = paceRange(splits);
    const distances = cumulativeDistancesMeters(routeTrace);
    const limits = splitDistanceLimits(splits);
    const colorBySplit = splits.map(s => paceColorFor(s, range));

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
// distancia exacta (mismo criterio que buildRouteTrace en geoTrace.js), en
// vez de "saltar" al punto de muestreo más cercano (~20m de error). `dirA`/
// `dirB` son esos mismos dos puntos "en bruto" (sin interpolar) -- se
// exponen para que RouteMap.js pueda calcular la dirección local real del
// recorrido en ese punto (perpendicular a la línea, para desplazar marcas
// que quedan demasiado juntas EN PANTALLA, ver mountRouteMap).
//
// Numera SIEMPRE en el orden cronológico real de routeTrace (nunca por
// cercanía geográfica) -- en una ruta que pasa dos veces cerca del mismo
// sitio (ida y vuelta que retoma casi el punto de partida y continúa por
// otro camino hasta meta, caso real verificado), el marcador de un km
// avanzado puede caer físicamente junto al inicio sin que eso sea un error
// de orden: es la traza recorriéndose dos veces por el mismo sitio en
// momentos distintos. Ver el test "orden cronológico en recorridos que
// pasan cerca de sí mismos".
//
// `splits` (chartSplits(workout), ver RunningDetailView.js) es opcional --
// si se pasa, cada marcador se enriquece con el ritmo/FC real de SU propio
// km (splits[km-1], misma correspondencia 1:1 que ya asume el resto del
// pipeline: cada split cubre ~1km salvo el remanente final, que nunca
// genera marcador de km completo) para el popup al pulsar (RouteMap.js) --
// mismo dato que ya muestra el gráfico "Ritmo por kilómetro", nunca uno
// recalculado aparte.
// Interpola el punto de routeTrace que cae exactamente a targetMeters del
// inicio (mismo criterio que buildRouteTrace en geoTrace.js) -- compartida
// entre buildKmMarkers y buildDirectionArrows para no duplicar la misma
// búsqueda+interpolación dos veces. Devuelve también dirA/dirB (los dos
// puntos "en bruto" sin interpolar que rodean el target) para que
// RouteMap.js pueda calcular la dirección local real del recorrido ahí
// (perpendicular para desplazar marcas de km que quedan muy juntas en
// pantalla, o el ángulo de rotación de una flecha de sentido).
function interpolateAtDistance(routeTrace, distances, targetMeters) {

    let i = distances.findIndex(d => d >= targetMeters);
    // -1: el target supera (por el margen que aplique el llamador) a la
    // distancia real total -- cae pegado al último punto real, no al
    // principio de la traza.
    if (i === -1) i = distances.length - 1;
    if (i === 0) i = 1;

    const prevDist = distances[i - 1], currDist = distances[i];
    const ratio = currDist > prevDist ? (targetMeters - prevDist) / (currDist - prevDist) : 0;
    const prev = routeTrace[i - 1], curr = routeTrace[i];

    return {
        lat: prev.lat + (curr.lat - prev.lat) * ratio,
        lon: prev.lon + (curr.lon - prev.lon) * ratio,
        dirA: { lat: prev.lat, lon: prev.lon },
        dirB: { lat: curr.lat, lon: curr.lon }
    };

}

export function buildKmMarkers(routeTrace, splits = []) {

    const distances = cumulativeDistancesMeters(routeTrace);
    const total = distances[distances.length - 1];
    const markers = [];

    // +0.5m de margen: un recorrido cuya distancia real cae justo en (o
    // casi en) un múltiplo exacto de km puede quedar un pelo por debajo de
    // ese valor tras sumar el ruido de redondeo de la propia suma de
    // haversine (float) -- sin este margen, esa última marca real
    // desaparecía sola por una diferencia de fracciones de milímetro.
    for (let km = 1; km * KM_METERS <= total + 0.5; km++) {

        const split = splits[km - 1];

        markers.push({
            km,
            ...interpolateAtDistance(routeTrace, distances, km * KM_METERS),
            paceSecPerKm: split?.paceSecPerKm ?? null,
            avgHr: split?.avgHr ?? null
        });

    }

    return markers;

}

// Flechas de sentido a lo largo del trazado (especificación de cierre del
// Paso 2: "de vez en cuando, no en cada punto" -- también ayuda a confirmar
// visualmente el sentido real del recorrido). Una cada ARROW_STEP_METERS,
// desfasadas medio paso desde el inicio para que nunca coincidan
// exactamente con una marca de km (que cae en múltiplos de 1000m).
const ARROW_STEP_METERS = 500;

export function buildDirectionArrows(routeTrace) {

    const distances = cumulativeDistancesMeters(routeTrace);
    const total = distances[distances.length - 1];
    const arrows = [];

    for (let target = ARROW_STEP_METERS / 2; target < total; target += ARROW_STEP_METERS) {
        arrows.push(interpolateAtDistance(routeTrace, distances, target));
    }

    return arrows;

}
