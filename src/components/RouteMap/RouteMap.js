import "./RouteMap.css";

// Mismo azul que --color-primary (variables.css) -- Leaflet no puede leer
// variables CSS del documento en sus opciones de estilo (color/weight son
// valores de Canvas/SVG, no propiedades CSS del elemento), así que se
// repite el valor literal aquí.
const ROUTE_LINE_COLOR = "#2EA8FF";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

// Único criterio de "este entreno tiene GPS real" en toda la app -- mismo
// umbral (>=2 puntos) que ya usa referenceRouteGeometry.js para agrupar
// Recorridos de referencia. Entrenos manuales y de OCR de Garmin nunca
// traen routeTrace (ver gpx.js/tcx.js/geoTrace.js), así que caen aquí sin
// necesitar mirar workout.source.
export function hasRouteTrace(workout) {
    return Array.isArray(workout?.routeTrace) && workout.routeTrace.length >= 2;
}

export function RouteMapContainer(id = "route-map") {
    return `<div class="route-map" id="${id}"></div>`;
}

// Import dinámico (leaflet.js + su CSS) a propósito -- Vite trocea un
// import() en su propio chunk automáticamente, así que la librería no pesa
// nada en el bundle principal ni se descarga en pantallas sin mapa. Solo se
// llama cuando initRunningEvents.js encuentra un .route-map real en el DOM
// tras el render (ver ese archivo).
export async function mountRouteMap(container, routeTrace) {

    const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css")
    ]);

    const map = L.map(container, { attributionControl: true });

    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const latlngs = routeTrace.map(point => [point.lat, point.lon]);
    const line = L.polyline(latlngs, { color: ROUTE_LINE_COLOR, weight: 4, opacity: 0.9 }).addTo(map);

    map.fitBounds(line.getBounds(), { padding: [24, 24] });

    return map;

}

export function unmountRouteMap(map) {
    map?.remove();
}
